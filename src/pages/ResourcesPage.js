import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';

const RESOURCE_TYPES = [
  { key: 'Slide', label: 'Slides' },
  { key: 'Book', label: 'Books' },
  { key: 'MidTerm', label: 'Mid-Term Papers' },
  { key: 'Final', label: 'Final Papers' },
  { key: 'Lab', label: 'Lab Sheets' },
  { key: 'Project', label: 'Projects' },
];

export default function ResourcesPage() {
  const [resources, setResources] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [isCR, setIsCR] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // ── filters ──────────────────────────────────────────────────────────────
  const [activeType, setActiveType] = useState('Slide');
  const [search, setSearch] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [year, setYear] = useState('All Years');
  const [batch, setBatch] = useState('All Batches');
  const [semester, setSemester] = useState('All Semesters');

  const resetFilters = () => {
    setSearch('');
    setCourseCode('');
    setYear('All Years');
    setBatch('All Batches');
    setSemester('All Semesters');
  };

  // ── upload form ───────────────────────────────────────────────────────────
  const [uploadForm, setUploadForm] = useState({
    title: '', resource_type: 'Slide', course_code: '', batch: '',
    semester: '', year: '', author: '', edition: '', lecture_no: '',
    github_link: '', file: null,
  });

  useEffect(() => {
    fetchCurrentProfileAndCR();
    fetchResources();

    // Subscribe to real-time updates on resources table
    const subscription = supabase
      .channel('resources-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'resources' },
        (payload) => {
          console.log('Resource update received:', payload);
          fetchResources(); // Refresh resources when any change happens
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchCurrentProfileAndCR = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error: profileError } = await supabase
        .from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (profileError) throw profileError;
      setCurrentProfile(profile);

      const userEmail = profile?.university_email;
      if (!userEmail) { setIsCR(false); return; }

      const { data: crRow, error: crError } = await supabase
        .from('cr').select('*').ilike('university_email', userEmail).maybeSingle();
      if (crError) throw crError;
      setIsCR(!!crRow);
    } catch (err) {
      console.error('CR check error:', err.message);
      setIsCR(false);
    }
  };

  const fetchResources = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setResources(data || []);
    } catch (err) {
      console.error('Resources fetch error:', err.message);
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  // Get unique values for filters from database
  const getUniqueValues = (field) => {
    if (!resources.length) return [];
    const unique = [...new Set(resources.map(r => String(r[field] || '')).filter(Boolean))];
    return unique.sort();
  };

  // Default options for when no data exists
  const DEFAULT_SEMESTERS = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'];
  const DEFAULT_BATCHES = ['28', '29', '30', '31'];
  const DEFAULT_YEARS = ['2024', '2025', '2026'];

  // Dynamic filter options - show defaults if no data yet
  const availableBatches = ['All Batches', ...new Set([...getUniqueValues('batch'), ...DEFAULT_BATCHES])];
  const availableYears = ['All Years', ...new Set([...getUniqueValues('year'), ...DEFAULT_YEARS])];
  const availableSemesters = ['All Semesters', ...new Set([...getUniqueValues('semester'), ...DEFAULT_SEMESTERS])];

  const canUploadResource =
    isCR ||
    currentProfile?.role?.toLowerCase() === 'admin' ||
    currentProfile?.is_admin === true;

  // ── filtering ─────────────────────────────────────────────────────────────
  const filteredResources = useMemo(() => {
    return resources.filter((item) => {
      const itemType = normalizeResourceType(item.resource_type || item.type);
      if (itemType !== activeType) return false;

      const searchableText = [
        item.title, item.file_name, item.course_code,
        item.batch, item.semester, item.year, item.author, item.edition,
      ].filter(Boolean).join(' ').toLowerCase();

      if (search.trim() && !searchableText.includes(search.trim().toLowerCase())) return false;
      if (courseCode.trim() && !String(item.course_code || '').toLowerCase().includes(courseCode.trim().toLowerCase())) return false;
      if (year !== 'All Years' && String(item.year || '') !== year) return false;
      if (batch !== 'All Batches' && String(item.batch || '') !== batch) return false;
      if (semester !== 'All Semesters' && String(item.semester || '') !== semester) return false;

      return true;
    });
  }, [resources, activeType, search, courseCode, year, batch, semester]);

  // ── upload helpers ────────────────────────────────────────────────────────
  const handleUploadChange = (field, value) =>
    setUploadForm((prev) => ({ ...prev, [field]: value }));

  const resetUploadForm = () => setUploadForm({
    title: '', resource_type: 'Slide', course_code: '', batch: '',
    semester: '', year: '', author: '', edition: '', lecture_no: '',
    github_link: '', file: null,
  });

  const validateUpload = () => {
    if (!uploadForm.title.trim()) { alert('Please enter resource title'); return false; }
    if (!uploadForm.resource_type) { alert('Please select resource type'); return false; }
    if (uploadForm.resource_type === 'Project') {
      if (!uploadForm.github_link.trim()) { alert('Please enter GitHub/project link'); return false; }
      return true;
    }
    if (!uploadForm.course_code.trim()) { alert('Please enter course code'); return false; }
    if (!uploadForm.batch.trim()) { alert('Please enter batch'); return false; }
    if (!uploadForm.semester.trim()) { alert('Please select semester'); return false; }
    if (['MidTerm', 'Final'].includes(uploadForm.resource_type) && !uploadForm.year.trim()) {
      alert('Year is required for Mid-Term and Final papers'); return false;
    }
    if (uploadForm.resource_type === 'Book' && !uploadForm.author.trim()) {
      alert('Author is required for books'); return false;
    }
    if (!uploadForm.file) { alert('Please select a PDF file'); return false; }
    const isPdf = uploadForm.file.type === 'application/pdf' || uploadForm.file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) { alert('Only PDF files are allowed'); return false; }
    if (uploadForm.file.size > 25 * 1024 * 1024) { alert('File size must be less than 25 MB'); return false; }
    return true;
  };

  const uploadFileToStorage = async (file) => {
    const { data: { user } } = await supabase.auth.getUser();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${user?.id || 'unknown'}/${Date.now()}_${safeName}`;
    const buckets = ['resources', 'resource-files', 'academic-resources'];
    let lastError = null;

    for (const bucket of buckets) {
      const { error: uploadError } = await supabase.storage
        .from(bucket).upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return { bucket, filePath, fileUrl: publicUrlData.publicUrl };
      }
      lastError = uploadError;
    }
    throw lastError || new Error('File upload failed');
  };

  const submitUpload = async (e) => {
    e.preventDefault();
    if (!canUploadResource) { alert('Only assigned CR or Admin can upload resources'); return; }
    if (!validateUpload()) return;
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      let uploadedFile = null;
      if (uploadForm.file) uploadedFile = await uploadFileToStorage(uploadForm.file);

      const payload = {
        title: uploadForm.title.trim(),
        resource_type: uploadForm.resource_type,
        course_code: uploadForm.course_code.trim() || null,
        batch: uploadForm.batch.trim() || currentProfile?.batch || null,
        semester: uploadForm.semester || null,
        year: uploadForm.year || null,
        author: uploadForm.author.trim() || null,
        edition: uploadForm.edition.trim() || null,
        lecture_no: uploadForm.lecture_no.trim() || null,
        github_link: uploadForm.github_link.trim() || null,
        file_url: uploadedFile?.fileUrl || null,
        file_path: uploadedFile?.filePath || null,
        bucket: uploadedFile?.bucket || null,
        file_name: uploadForm.file?.name || null,
        uploaded_by: user?.id || null,
        uploader_id: user?.id || null,
        uploader_email: currentProfile?.university_email || null,
        status: 'published',
        approved: true,
        created_at: new Date().toISOString(),
      };

      let { error } = await supabase.from('resources').insert([payload]);
      if (error) {
        const { error: retryErr } = await supabase.from('resources').insert([{
          title: payload.title, resource_type: payload.resource_type,
          course_code: payload.course_code, batch: payload.batch,
          semester: payload.semester, year: payload.year,
          file_url: payload.file_url, file_name: payload.file_name,
          uploaded_by: payload.uploaded_by, created_at: payload.created_at,
        }]);
        error = retryErr;
      }
      if (error) throw error;

      alert('Resource uploaded successfully');
      resetUploadForm();
      setShowUploadModal(false);
      fetchResources();
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const previewResource = (item) => {
    const url = item.file_url || item.url || item.github_link;
    if (!url) { alert('No preview link found'); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const downloadResource = (item) => {
    const url = item.file_url || item.url || item.github_link;
    if (!url) { alert('No download link found'); return; }
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.download = item.file_name || item.title || 'resource';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  // ── shared input style ────────────────────────────────────────────────────
  const inp = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#18004d] outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100';
  const lbl = 'mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400';

  return (
    <div className="min-h-screen bg-slate-50 text-[#18004d]">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[#18004d] px-6 py-20 text-white">
        <div className="absolute inset-0 bg-gradient-to-r from-[#061A40] via-[#123C69] to-[#1E88E5]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.25),transparent_35%)]" />
        <div className="relative mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.3em] text-yellow-300">Academic Archive</p>
            <h1 className="mt-4 text-5xl font-black text-white md:text-6xl">Academic Resources</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
              Batch, semester and course-wise archive for slides, books, mid-term papers, final papers, lab sheets and project showcases.
            </p>
            {currentProfile?.university_email && (
              <p className="mt-4 text-sm font-semibold text-blue-100">
                Logged in as: {currentProfile.university_email}
                {isCR && <span className="ml-2 rounded-full bg-yellow-300 px-3 py-1 text-[#18004d]">CR</span>}
              </p>
            )}
          </div>
          {canUploadResource && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="rounded-full bg-yellow-400 px-7 py-4 font-black text-[#18004d] shadow-xl transition hover:-translate-y-0.5 hover:bg-yellow-300"
            >
              Upload Resource
            </button>
          )}
        </div>
      </section>

      {/* ── Main ── */}
      <main className="mx-auto max-w-7xl px-6 py-10">

        {/* ── Filter Bar ── */}
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">

          {/* Row 1 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className={lbl}>Search</label>
              <input className={inp} placeholder="Search resources..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div>
              <label className={lbl}>Course Code</label>
              <input className={inp} placeholder="CSE-311" value={courseCode} onChange={(e) => setCourseCode(e.target.value)} />
            </div>

            <div>
              <label className={lbl}>Year</label>
              <select className={inp} value={year} onChange={(e) => setYear(e.target.value)}>
                {availableYears.map((y) => <option key={y}>{y}</option>)}
              </select>
            </div>

            <div>
              <label className={lbl}>Batch</label>
              <select className={inp} value={batch} onChange={(e) => setBatch(e.target.value)}>
                {availableBatches.map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2 */}
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div className="w-52">
              <label className={lbl}>Semester</label>
              <select className={inp} value={semester} onChange={(e) => setSemester(e.target.value)}>
                {availableSemesters.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Reset Filters
            </button>

            <span className="ml-auto rounded-full bg-yellow-100 px-5 py-2.5 text-sm font-black text-[#18004d] ring-1 ring-yellow-300">
              Showing {filteredResources.length} of {resources.length} items
            </span>
          </div>
        </div>

        {/* ── Type Tabs ── */}
        <div className="mt-6 flex flex-wrap gap-3">
          {RESOURCE_TYPES.map((type) => (
            <button
              key={type.key}
              onClick={() => setActiveType(type.key)}
              className={`rounded-full border px-5 py-3 font-black transition ${activeType === type.key
                ? 'border-yellow-400 bg-yellow-100 text-[#18004d]'
                : 'border-blue-100 bg-white text-[#18004d] hover:bg-blue-50'
                }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* ── Resource Grid ── */}
        <div className="mt-6">
          {loading ? (
            <div className="rounded-3xl border border-blue-100 bg-white p-10 text-center font-bold text-[#18004d]">
              Loading resources...
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="rounded-3xl border border-blue-100 bg-white p-10 text-center">
              <h3 className="text-xl font-black text-[#18004d]">No resources found</h3>
              <p className="mt-2 text-slate-500">Try changing filters or upload resources if you are assigned as CR.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {filteredResources.map((item) => (
                <ResourceCard
                  key={item.id || `${item.title}-${item.created_at}`}
                  item={item}
                  onPreview={() => previewResource(item)}
                  onDownload={() => downloadResource(item)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Upload Modal ── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-500">CR Upload</p>
                <h2 className="mt-2 text-2xl font-black text-[#18004d]">Upload Academic Resource</h2>
                <p className="mt-1 text-sm text-slate-500">Uploaded files will publish directly to the resource archive.</p>
              </div>
              <button
                onClick={() => { setShowUploadModal(false); resetUploadForm(); }}
                className="rounded-full bg-red-50 px-4 py-2 font-black text-red-600"
              >✕</button>
            </div>

            <form onSubmit={submitUpload} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Title">
                  <input value={uploadForm.title} onChange={(e) => handleUploadChange('title', e.target.value)} placeholder="Lecture 05 - Database Normalization" className="input-ui" />
                </FormField>
                <FormField label="Resource Type">
                  <select value={uploadForm.resource_type} onChange={(e) => handleUploadChange('resource_type', e.target.value)} className="input-ui">
                    {RESOURCE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                </FormField>
                <FormField label="Course Code">
                  <input value={uploadForm.course_code} onChange={(e) => handleUploadChange('course_code', e.target.value)} placeholder="CSE-311" className="input-ui" />
                </FormField>
                <FormField label="Batch">
                  <input value={uploadForm.batch} onChange={(e) => handleUploadChange('batch', e.target.value)} placeholder="2022" className="input-ui" />
                </FormField>
                <FormField label="Semester">
                  <select value={uploadForm.semester} onChange={(e) => handleUploadChange('semester', e.target.value)} className="input-ui">
                    <option value="">Select semester</option>
                    {availableSemesters.filter(s => s !== 'All Semesters').map((s) => <option key={s}>{s}</option>)}
                  </select>
                </FormField>
                <FormField label="Year">
                  <input value={uploadForm.year} onChange={(e) => handleUploadChange('year', e.target.value)} placeholder="2024" className="input-ui" />
                </FormField>
                {uploadForm.resource_type === 'Book' && (
                  <>
                    <FormField label="Author">
                      <input value={uploadForm.author} onChange={(e) => handleUploadChange('author', e.target.value)} placeholder="Author name" className="input-ui" />
                    </FormField>
                    <FormField label="Edition">
                      <input value={uploadForm.edition} onChange={(e) => handleUploadChange('edition', e.target.value)} placeholder="4th Edition" className="input-ui" />
                    </FormField>
                  </>
                )}
                {uploadForm.resource_type === 'Slide' && (
                  <FormField label="Lecture No">
                    <input value={uploadForm.lecture_no} onChange={(e) => handleUploadChange('lecture_no', e.target.value)} placeholder="05" className="input-ui" />
                  </FormField>
                )}
                {uploadForm.resource_type === 'Project' && (
                  <FormField label="GitHub / Project Link">
                    <input value={uploadForm.github_link} onChange={(e) => handleUploadChange('github_link', e.target.value)} placeholder="https://github.com/..." className="input-ui" />
                  </FormField>
                )}
                {uploadForm.resource_type !== 'Project' && (
                  <FormField label="PDF File">
                    <input type="file" accept="application/pdf,.pdf" onChange={(e) => handleUploadChange('file', e.target.files?.[0] || null)} className="input-ui file:mr-4 file:rounded-full file:border-0 file:bg-yellow-400 file:px-4 file:py-2 file:font-bold file:text-[#18004d]" />
                  </FormField>
                )}
              </div>

              <div className="rounded-2xl bg-blue-50 p-4 text-sm text-slate-600">
                <strong className="text-[#18004d]">Note:</strong> Only assigned CR/Admin users can upload. Matching uses <code>profiles.university_email</code> and <code>cr.university_email</code>.
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowUploadModal(false); resetUploadForm(); }} className="rounded-full border border-blue-100 px-6 py-3 font-black text-[#18004d]">Cancel</button>
                <button type="submit" disabled={uploading} className="rounded-full bg-yellow-400 px-6 py-3 font-black text-[#18004d] hover:bg-yellow-300 disabled:opacity-60">
                  {uploading ? 'Uploading...' : 'Upload Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .input-ui {
          width: 100%; border-radius: 0.75rem; border: 1px solid #e2e8f0;
          padding: 0.625rem 1rem; outline: none; background: white; font-size: 0.875rem;
        }
        .input-ui:focus { border-color: #facc15; box-shadow: 0 0 0 3px rgba(250,204,21,0.18); }
      `}</style>
    </div>
  );
}

function ResourceCard({ item, onPreview, onDownload }) {
  const type = normalizeResourceType(item.resource_type || item.type);
  const label = RESOURCE_TYPES.find((r) => r.key === type)?.label || type;

  return (
    <article className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <span className="rounded-full bg-yellow-100 px-4 py-2 text-xs font-black text-[#18004d]">{label}</span>
        {item.year && <span className="rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">{item.year}</span>}
      </div>
      <h3 className="text-xl font-black text-[#18004d]">{item.title || item.file_name || 'Untitled Resource'}</h3>
      <p className="mt-3 text-sm font-semibold text-slate-500">
        {item.course_code || 'No course code'}
        {item.batch ? ` • Batch ${item.batch}` : ''}
        {item.semester ? ` • ${item.semester}` : ''}
      </p>
      {item.author && <p className="mt-2 text-sm text-slate-500">Author: {item.author}{item.edition ? ` • ${item.edition}` : ''}</p>}
      {item.lecture_no && <p className="mt-2 text-sm text-slate-500">Lecture No: {item.lecture_no}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={onDownload} className="rounded-full bg-[#18004d] px-5 py-3 text-sm font-black text-white hover:bg-[#2a0b68]">Download</button>
        <button onClick={onPreview} className="rounded-full border border-blue-100 px-5 py-3 text-sm font-black text-[#18004d] hover:bg-blue-50">Preview</button>
      </div>
    </article>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-wide text-[#18004d]">{label}</label>
      {children}
    </div>
  );
}

function normalizeResourceType(type) {
  if (!type) return 'Slide';
  const v = String(type).toLowerCase().replace(/[\s_-]/g, '');
  if (v.includes('slide') || v.includes('lecture')) return 'Slide';
  if (v.includes('book') || v.includes('reference')) return 'Book';
  if (v.includes('mid')) return 'MidTerm';
  if (v.includes('final')) return 'Final';
  if (v.includes('lab')) return 'Lab';
  if (v.includes('project')) return 'Project';
  return type;
}