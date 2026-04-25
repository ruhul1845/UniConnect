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

const BATCHES = ['All Batches', '28', '29', '30', '31'];
const YEARS = ['All Years', '2026', '2025', '2024', '2023', '2022', '2021'];
const SEMESTERS = [
  '1-1',
  '1-2',
  '2-1',
  '2-2',
  '3-1',
  '3-2',
  '4-1',
  '4-2',
];

export default function ResourcesPage() {
  const [resources, setResources] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [isCR, setIsCR] = useState(false);

  const [activeType, setActiveType] = useState('Slide');
  const [search, setSearch] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [year, setYear] = useState('All Years');
  const [batch, setBatch] = useState('All Batches');

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    resource_type: 'Slide',
    course_code: '',
    batch: '',
    semester: '',
    year: '',
    author: '',
    edition: '',
    lecture_no: '',
    github_link: '',
    file: null,
  });

  useEffect(() => {
    fetchCurrentProfileAndCR();
    fetchResources();
  }, []);

  const fetchCurrentProfileAndCR = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      setCurrentProfile(profile);

      const userEmail = profile?.university_email;

      if (!userEmail) {
        setIsCR(false);
        return;
      }

      const { data: crRow, error: crError } = await supabase
        .from('cr')
        .select('*')
        .ilike('university_email', userEmail)
        .maybeSingle();

      if (crError) throw crError;

      setIsCR(!!crRow);
    } catch (error) {
      console.error('CR check error:', error.message);
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
    } catch (error) {
      console.error('Resources fetch error:', error.message);
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const canUploadResource =
    isCR ||
    currentProfile?.role?.toLowerCase() === 'admin' ||
    currentProfile?.is_admin === true;

  const filteredResources = useMemo(() => {
    return resources.filter((item) => {
      const itemType = normalizeResourceType(item.resource_type || item.type);

      const matchesType = itemType === activeType;

      const searchableText = [
        item.title,
        item.file_name,
        item.course_code,
        item.batch,
        item.semester,
        item.year,
        item.author,
        item.edition,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = search.trim()
        ? searchableText.includes(search.trim().toLowerCase())
        : true;

      const matchesCourse = courseCode.trim()
        ? String(item.course_code || '').toLowerCase().includes(courseCode.trim().toLowerCase())
        : true;

      const matchesYear = year === 'All Years'
        ? true
        : String(item.year || '') === year;

      const matchesBatch = batch === 'All Batches'
        ? true
        : String(item.batch || '') === batch;

      return matchesType && matchesSearch && matchesCourse && matchesYear && matchesBatch;
    });
  }, [resources, activeType, search, courseCode, year, batch]);

  const handleUploadChange = (field, value) => {
    setUploadForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetUploadForm = () => {
    setUploadForm({
      title: '',
      resource_type: 'Slide',
      course_code: '',
      batch: '',
      semester: '',
      year: '',
      author: '',
      edition: '',
      lecture_no: '',
      github_link: '',
      file: null,
    });
  };

  const validateUpload = () => {
    if (!uploadForm.title.trim()) {
      alert('Please enter resource title');
      return false;
    }

    if (!uploadForm.resource_type) {
      alert('Please select resource type');
      return false;
    }

    if (uploadForm.resource_type === 'Project') {
      if (!uploadForm.github_link.trim()) {
        alert('Please enter GitHub/project link');
        return false;
      }

      return true;
    }

    if (!uploadForm.course_code.trim()) {
      alert('Please enter course code');
      return false;
    }

    if (!uploadForm.batch.trim()) {
      alert('Please enter batch');
      return false;
    }

    if (!uploadForm.semester.trim()) {
      alert('Please select semester');
      return false;
    }

    if (['MidTerm', 'Final'].includes(uploadForm.resource_type) && !uploadForm.year.trim()) {
      alert('Year is required for Mid-Term and Final papers');
      return false;
    }

    if (uploadForm.resource_type === 'Book') {
      if (!uploadForm.author.trim()) {
        alert('Author is required for books');
        return false;
      }
    }

    if (!uploadForm.file) {
      alert('Please select a PDF file');
      return false;
    }

    const isPdf =
      uploadForm.file.type === 'application/pdf' ||
      uploadForm.file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      alert('Only PDF files are allowed');
      return false;
    }

    const maxSize = 25 * 1024 * 1024;

    if (uploadForm.file.size > maxSize) {
      alert('File size must be less than 25 MB');
      return false;
    }

    return true;
  };

  const uploadFileToStorage = async (file) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${user?.id || 'unknown'}/${Date.now()}_${safeName}`;

    const buckets = ['resources', 'resource-files', 'academic-resources'];

    let lastError = null;

    for (const bucket of buckets) {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        return {
          bucket,
          filePath,
          fileUrl: publicUrlData.publicUrl,
        };
      }

      lastError = uploadError;
    }

    throw lastError || new Error('File upload failed');
  };

  const submitUpload = async (e) => {
    e.preventDefault();

    if (!canUploadResource) {
      alert('Only assigned CR or Admin can upload resources');
      return;
    }

    if (!validateUpload()) return;

    setUploading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let uploadedFile = null;

      if (uploadForm.file) {
        uploadedFile = await uploadFileToStorage(uploadForm.file);
      }

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
        const fallbackPayload = {
          title: payload.title,
          resource_type: payload.resource_type,
          course_code: payload.course_code,
          batch: payload.batch,
          semester: payload.semester,
          year: payload.year,
          file_url: payload.file_url,
          file_name: payload.file_name,
          uploaded_by: payload.uploaded_by,
          created_at: payload.created_at,
        };

        const retry = await supabase.from('resources').insert([fallbackPayload]);
        error = retry.error;
      }

      if (error) throw error;

      alert('Resource uploaded successfully');
      resetUploadForm();
      setShowUploadModal(false);
      fetchResources();
    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const previewResource = (item) => {
    const url = item.file_url || item.url || item.github_link;

    if (!url) {
      alert('No preview link found');
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const downloadResource = (item) => {
    const url = item.file_url || item.url || item.github_link;

    if (!url) {
      alert('No download link found');
      return;
    }

    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.download = item.file_name || item.title || 'resource';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-[#18004d]">
      <section className="relative overflow-hidden bg-[#18004d] px-6 py-20 text-white">
        <div className="absolute inset-0 bg-gradient-to-r from-[#061A40] via-[#123C69] to-[#1E88E5]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.25),transparent_35%)]" />

        <div className="relative mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.3em] text-yellow-300">
              Academic Archive
            </p>

            <h1 className="mt-4 text-5xl font-black text-white md:text-6xl">
              Academic Resources
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
              Batch, semester and course-wise archive for slides, books, mid-term papers,
              final papers, lab sheets and project showcases.
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

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-10 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
          <h2 className="mb-5 text-lg font-black text-[#18004d]">
            Archive Navigation
          </h2>

          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
              Batch
            </p>

            <div className="space-y-2">
              {BATCHES.map((item) => (
                <button
                  key={item}
                  onClick={() => setBatch(item)}
                  className={`w-full rounded-2xl px-4 py-3 text-left font-bold transition ${batch === item
                    ? 'bg-[#18004d] text-white'
                    : 'bg-blue-50 text-[#18004d] hover:bg-yellow-100'
                    }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-7">
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
              Semester
            </p>

            <div className="space-y-2">
              {SEMESTERS.slice(0, 4).map((item) => (
                <button
                  key={item}
                  className="w-full rounded-2xl bg-blue-50 px-4 py-3 text-left font-bold text-[#18004d] transition hover:bg-yellow-100"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section>
          <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-2 block text-xs font-black uppercase text-[#18004d]">
                  Search
                </label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search resources"
                  className="w-full rounded-2xl border border-blue-100 px-4 py-3 outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase text-[#18004d]">
                  Course Code
                </label>
                <input
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  placeholder="CSE-311"
                  className="w-full rounded-2xl border border-blue-100 px-4 py-3 outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase text-[#18004d]">
                  Year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full rounded-2xl border border-blue-100 px-4 py-3 outline-none focus:border-yellow-400"
                >
                  {YEARS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase text-[#18004d]">
                  Batch
                </label>
                <select
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  className="w-full rounded-2xl border border-blue-100 px-4 py-3 outline-none focus:border-yellow-400"
                >
                  {BATCHES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

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

          <div className="mt-6">
            {loading ? (
              <div className="rounded-3xl border border-blue-100 bg-white p-10 text-center font-bold text-[#18004d]">
                Loading resources...
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="rounded-3xl border border-blue-100 bg-white p-10 text-center">
                <h3 className="text-xl font-black text-[#18004d]">
                  No resources found
                </h3>
                <p className="mt-2 text-slate-500">
                  Try changing filters or upload resources if you are assigned as CR.
                </p>
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
        </section>
      </main>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-500">
                  CR Upload
                </p>
                <h2 className="mt-2 text-2xl font-black text-[#18004d]">
                  Upload Academic Resource
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Uploaded files will publish directly to the resource archive.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowUploadModal(false);
                  resetUploadForm();
                }}
                className="rounded-full bg-red-50 px-4 py-2 font-black text-red-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitUpload} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Title">
                  <input
                    value={uploadForm.title}
                    onChange={(e) => handleUploadChange('title', e.target.value)}
                    placeholder="Lecture 05 - Database Normalization"
                    className="input-ui"
                  />
                </FormField>

                <FormField label="Resource Type">
                  <select
                    value={uploadForm.resource_type}
                    onChange={(e) => handleUploadChange('resource_type', e.target.value)}
                    className="input-ui"
                  >
                    {RESOURCE_TYPES.map((type) => (
                      <option key={type.key} value={type.key}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Course Code">
                  <input
                    value={uploadForm.course_code}
                    onChange={(e) => handleUploadChange('course_code', e.target.value)}
                    placeholder="CSE-311"
                    className="input-ui"
                  />
                </FormField>

                <FormField label="Batch">
                  <input
                    value={uploadForm.batch}
                    onChange={(e) => handleUploadChange('batch', e.target.value)}
                    placeholder="2022"
                    className="input-ui"
                  />
                </FormField>

                <FormField label="Semester">
                  <select
                    value={uploadForm.semester}
                    onChange={(e) => handleUploadChange('semester', e.target.value)}
                    className="input-ui"
                  >
                    <option value="">Select semester</option>
                    {SEMESTERS.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Year">
                  <input
                    value={uploadForm.year}
                    onChange={(e) => handleUploadChange('year', e.target.value)}
                    placeholder="2024"
                    className="input-ui"
                  />
                </FormField>

                {uploadForm.resource_type === 'Book' && (
                  <>
                    <FormField label="Author">
                      <input
                        value={uploadForm.author}
                        onChange={(e) => handleUploadChange('author', e.target.value)}
                        placeholder="Author name"
                        className="input-ui"
                      />
                    </FormField>

                    <FormField label="Edition">
                      <input
                        value={uploadForm.edition}
                        onChange={(e) => handleUploadChange('edition', e.target.value)}
                        placeholder="4th Edition"
                        className="input-ui"
                      />
                    </FormField>
                  </>
                )}

                {uploadForm.resource_type === 'Slide' && (
                  <FormField label="Lecture No">
                    <input
                      value={uploadForm.lecture_no}
                      onChange={(e) => handleUploadChange('lecture_no', e.target.value)}
                      placeholder="05"
                      className="input-ui"
                    />
                  </FormField>
                )}

                {uploadForm.resource_type === 'Project' && (
                  <FormField label="GitHub / Project Link">
                    <input
                      value={uploadForm.github_link}
                      onChange={(e) => handleUploadChange('github_link', e.target.value)}
                      placeholder="https://github.com/..."
                      className="input-ui"
                    />
                  </FormField>
                )}

                {uploadForm.resource_type !== 'Project' && (
                  <FormField label="PDF File">
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(e) => handleUploadChange('file', e.target.files?.[0] || null)}
                      className="input-ui file:mr-4 file:rounded-full file:border-0 file:bg-yellow-400 file:px-4 file:py-2 file:font-bold file:text-[#18004d]"
                    />
                  </FormField>
                )}
              </div>

              <div className="rounded-2xl bg-blue-50 p-4 text-sm text-slate-600">
                <strong className="text-[#18004d]">Note:</strong> Only assigned CR/Admin users can upload.
                Matching uses <code>profiles.university_email</code> and <code>cr.university_email</code>.
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }}
                  className="rounded-full border border-blue-100 px-6 py-3 font-black text-[#18004d]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={uploading}
                  className="rounded-full bg-yellow-400 px-6 py-3 font-black text-[#18004d] hover:bg-yellow-300 disabled:opacity-60"
                >
                  {uploading ? 'Uploading...' : 'Upload Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .input-ui {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid #dbeafe;
          padding: 0.75rem 1rem;
          outline: none;
          background: white;
        }

        .input-ui:focus {
          border-color: #facc15;
          box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.18);
        }
      `}</style>
    </div>
  );
}

function ResourceCard({ item, onPreview, onDownload }) {
  const type = normalizeResourceType(item.resource_type || item.type);
  const label = RESOURCE_TYPES.find((resource) => resource.key === type)?.label || type;

  return (
    <article className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <span className="rounded-full bg-yellow-100 px-4 py-2 text-xs font-black text-[#18004d]">
          {label}
        </span>

        {item.year && (
          <span className="rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
            {item.year}
          </span>
        )}
      </div>

      <h3 className="text-xl font-black text-[#18004d]">
        {item.title || item.file_name || 'Untitled Resource'}
      </h3>

      <p className="mt-3 text-sm font-semibold text-slate-500">
        {item.course_code || 'No course code'}
        {item.batch ? ` • Batch ${item.batch}` : ''}
        {item.semester ? ` • ${item.semester}` : ''}
      </p>

      {item.author && (
        <p className="mt-2 text-sm text-slate-500">
          Author: {item.author}
          {item.edition ? ` • ${item.edition}` : ''}
        </p>
      )}

      {item.lecture_no && (
        <p className="mt-2 text-sm text-slate-500">
          Lecture No: {item.lecture_no}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={onDownload}
          className="rounded-full bg-[#18004d] px-5 py-3 text-sm font-black text-white hover:bg-[#2a0b68]"
        >
          Download
        </button>

        <button
          onClick={onPreview}
          className="rounded-full border border-blue-100 px-5 py-3 text-sm font-black text-[#18004d] hover:bg-blue-50"
        >
          Preview
        </button>
      </div>
    </article>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-wide text-[#18004d]">
        {label}
      </label>
      {children}
    </div>
  );
}

function normalizeResourceType(type) {
  if (!type) return 'Slide';

  const value = String(type).toLowerCase().replace(/[\s_-]/g, '');

  if (value.includes('slide') || value.includes('lecture')) return 'Slide';
  if (value.includes('book') || value.includes('reference')) return 'Book';
  if (value.includes('mid')) return 'MidTerm';
  if (value.includes('final')) return 'Final';
  if (value.includes('lab')) return 'Lab';
  if (value.includes('project')) return 'Project';

  return type;
}