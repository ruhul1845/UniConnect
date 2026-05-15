import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import ResourceCard from '../components/resources/ResourceCard';
import ResourceFilters from '../components/resources/ResourceFilters';
import ResourceTabs from '../components/resources/ResourceTabs';
import ResourceUploadModal from '../components/resources/ResourceUploadModal';
import { DEFAULT_FILTERS, DEFAULT_UPLOAD_FORM } from '../components/resources/resourceConstants';
import {
  buildFilterOptions,
  buildResourcePayload,
  filterResources,
  uploadResourceFile,
  validateResourceUpload,
} from '../components/resources/resourceHelpers';







export default function ResourcesPage() {
  const [resources, setResources] = useState([]);
  const [profile, setProfile] = useState(null);
  const [isCR, setIsCR] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeType, setActiveType] = useState('Slide');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [uploadForm, setUploadForm] = useState(DEFAULT_UPLOAD_FORM);

  useEffect(() => {
    loadInitialData();

    const subscription = supabase
      .channel('resources-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, fetchResources)
      .subscribe();

    return () => subscription.unsubscribe();
    // loadInitialData/fetchResources are stable enough for this mount-only setup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filterOptions = useMemo(() => buildFilterOptions(resources), [resources]);
  const filteredResources = useMemo(
    () => filterResources(resources, activeType, filters),
    [resources, activeType, filters]
  );

  const role = String(profile?.role || '').toLowerCase();
  const canUploadResource = isCR || role === 'admin' || profile?.is_admin === true || profile?.is_cr === true;

  async function loadInitialData() {
    await Promise.all([fetchCurrentProfileAndRole(), fetchResources()]);
  }

  async function fetchCurrentProfileAndRole() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (profileError) throw profileError;

      setProfile(currentProfile);
      await checkCRStatus(currentProfile);
    } catch (err) {
      console.error('Profile/CR check error:', err.message);
      setIsCR(false);
    }
  }

  async function checkCRStatus(currentProfile) {
    if (currentProfile?.is_cr === true || String(currentProfile?.role || '').toLowerCase() === 'cr') {
      setIsCR(true);
      return;
    }

    const email = currentProfile?.university_email;
    if (!email) {
      setIsCR(false);
      return;
    }

    const { data, error } = await supabase
      .from('cr')
      .select('id')
      .ilike('university_email', email)
      .maybeSingle();
    if (error) throw error;
    setIsCR(Boolean(data));
  }

  async function fetchResources() {
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
  }

  function updateUploadForm(field, value) {
    setUploadForm((current) => ({ ...current, [field]: value }));
  }

  function closeUploadModal() {
    setShowUploadModal(false);
    setUploadForm(DEFAULT_UPLOAD_FORM);
  }

  async function submitUpload(event) {
    event.preventDefault();
    if (!canUploadResource) return alert('Only assigned CR or Admin can upload resources');

    const validationError = validateResourceUpload(uploadForm);
    if (validationError) return alert(validationError);

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uploadedFile = uploadForm.file ? await uploadResourceFile(supabase, uploadForm.file, user?.id) : null;
      const payload = buildResourcePayload({ form: uploadForm, uploadedFile, user, profile });
      const { error } = await supabase.from('resources').insert([payload]);
      if (error) throw error;

      alert('Resource uploaded successfully');
      closeUploadModal();
      fetchResources();
    } catch (err) {
      console.error('Upload error:', err.message);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }

  function previewResource(item) {
    const url = item.file_url || item.github_link;
    if (!url) return alert('No preview available');
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function downloadResource(item) {
    const url = item.file_url || item.github_link;
    if (!url) return alert('No file/link available');
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.download = item.file_name || item.title || 'resource';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <main className="mx-auto w-full">
        <section className=" bg-gradient-to-r from-[#061A40] via-[#123C69] to-[#1E88E5] p-8 text-white shadow-2xl shadow-blue-950/20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-300">Academic Resources</p>
              <h1 className="mt-3 text-4xl font-black md:text-5xl">Find slides, books, papers, labs and projects</h1>
              <p className="mt-4 max-w-2xl text-sm font-medium text-blue-100">
                Filter by course, year, batch or semester.
              </p>
            </div>
            {canUploadResource && (
              <button onClick={() => setShowUploadModal(true)} className="rounded-full bg-yellow-400 px-7 py-4 font-black text-[#18004d] shadow-lg hover:bg-yellow-300">
                Upload Resource
              </button>
            )}
          </div>
        </section>

        <ResourceFilters filters={filters} setFilters={setFilters} options={filterOptions} resultCount={filteredResources.length} totalCount={resources.length} />
        <ResourceTabs activeType={activeType} setActiveType={setActiveType} />

        <section className="mt-6">
          {loading ? (
            <EmptyState title="Loading resources..." />
          ) : filteredResources.length === 0 ? (
            <EmptyState title="No resources found" subtitle="Try changing filters or upload resources if you are assigned as CR." />
          ) : (
            <div className="grid grid-cols-1 gap-7 md:grid-cols-2 max-w-7xl mx-auto ">
              {filteredResources.map((item) => (
                <ResourceCard key={item.id || `${item.title}-${item.created_at}`} item={item} onPreview={() => previewResource(item)} onDownload={() => downloadResource(item)} />
              ))}
            </div>
          )}
        </section>
      </main>

      {showUploadModal && (
        <ResourceUploadModal
          form={uploadForm}
          options={filterOptions}
          uploading={uploading}
          onChange={updateUploadForm}
          onClose={closeUploadModal}
          onSubmit={submitUpload}
        />
      )}
    </div>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div className="rounded-3xl border border-blue-100 bg-white p-10 text-center">
      <h3 className="text-xl font-black text-[#18004d]">{title}</h3>
      {subtitle && <p className="mt-2 text-slate-500">{subtitle}</p>}
    </div>
  );
}
