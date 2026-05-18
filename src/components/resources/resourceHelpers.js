import { DEFAULT_OPTIONS, RESOURCE_BUCKET } from './resourceConstants';

export function normalizeResourceType(type) {
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

export function uniqueOptions(resources, field, fallbackValues) {
  const values = resources.map((resource) => String(resource[field] || '')).filter(Boolean);
  return [...new Set([...values, ...fallbackValues])].sort();
}

export function buildFilterOptions(resources) {
  return {
    batches: ['All Batches', ...uniqueOptions(resources, 'batch', DEFAULT_OPTIONS.batches)],
    years: ['All Years', ...uniqueOptions(resources, 'year', DEFAULT_OPTIONS.years)],
    semesters: ['All Semesters', ...uniqueOptions(resources, 'semester', DEFAULT_OPTIONS.semesters)],
  };
}

export function filterResources(resources, activeType, filters) {
  return resources.filter((item) => {
    if (normalizeResourceType(item.resource_type || item.type) !== activeType) return false;

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

    if (filters.search.trim() && !searchableText.includes(filters.search.trim().toLowerCase())) return false;
    if (filters.courseCode.trim() && !String(item.course_code || '').toLowerCase().includes(filters.courseCode.trim().toLowerCase())) return false;
    if (filters.year !== 'All Years' && String(item.year || '') !== filters.year) return false;
    if (filters.batch !== 'All Batches' && String(item.batch || '') !== filters.batch) return false;
    if (filters.semester !== 'All Semesters' && String(item.semester || '') !== filters.semester) return false;

    return true;
  });
}

export function validateResourceUpload(form) {
  if (!form.title.trim()) return 'Please enter resource title';
  if (!form.resource_type) return 'Please select resource type';

  if (form.resource_type === 'Project') {
    return form.github_link.trim() ? null : 'Please enter GitHub/project link';
  }

  if (!form.course_code.trim()) return 'Please enter course code';
  if (!form.batch.trim()) return 'Please enter batch';
  if (!form.semester.trim()) return 'Please select semester';
  if (['MidTerm', 'Final'].includes(form.resource_type) && !form.year.trim()) return 'Year is required for Mid-Term and Final papers';
  if (form.resource_type === 'Book' && !form.author.trim()) return 'Author is required for books';
  if (!form.file) return 'Please select a PDF file';

  const isPdf = form.file.type === 'application/pdf' || form.file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) return 'Only PDF files are allowed';
  if (form.file.size > 25 * 1024 * 1024) return 'File size must be less than 25 MB';

  return null;
}

export async function uploadResourceFile(supabase, file, userId) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${userId || 'unknown'}/${Date.now()}_${safeName}`;
  const { error } = await supabase.storage
    .from(RESOURCE_BUCKET)
    .upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: 'application/pdf' });

  if (error) throw error;

  const { data } = supabase.storage.from(RESOURCE_BUCKET).getPublicUrl(filePath);
  return { bucket: RESOURCE_BUCKET, filePath, fileUrl: data.publicUrl };
}

export function buildResourcePayload({ form, uploadedFile, user, profile }) {
  return {
    title: form.title.trim(),
    resource_type: form.resource_type,
    course_code: form.course_code.trim() || null,
    batch: form.batch.trim() || profile?.batch || null,
    semester: form.semester || null,
    year: form.year || null,
    author: form.author.trim() || null,
    edition: form.edition.trim() || null,
    lecture_no: form.lecture_no.trim() || null,
    github_link: form.github_link.trim() || null,
    file_url: uploadedFile?.fileUrl || null,
    file_path: uploadedFile?.filePath || null,
    bucket: uploadedFile?.bucket || null,
    file_name: form.file?.name || null,
    file_size: form.file?.size || null,
    uploaded_by: user?.id || null,
    uploader_email: profile?.university_email || user?.email || null,
    status: 'published',
    approved: true,
  };
}
