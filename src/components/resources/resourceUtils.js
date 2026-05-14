import { supabase } from '../../supabaseClient';

export const resourceTypes = [
  ['Slide', 'Slides'], ['Book', 'Books'], ['MidTerm', 'Mid-Term Papers'],
  ['Final', 'Final Papers'], ['Lab', 'Lab Sheets'], ['Project', 'Projects'],
];

export const emptyUpload = {
  title: '', resource_type: 'Slide', course_code: '', batch: '',
  semester: '', year: '', author: '', edition: '', lecture_no: '',
  github_link: '', description: '', file: null,
};

/**
 * Normalize resource data from database
 */
export function normalizeResource(row = {}) {
  return {
    ...row,
    title: row.title || row.file_name || row.name || `${row.course_code || 'Course'} ${row.resource_type || 'Resource'}`,
    resource_type: row.resource_type || row.type || 'Resource',
    course_code: row.course_code || row.course || '',
    batch: row.batch || row.batch_year || row.batch_id || '',
    semester: row.semester || '',
    year: row.year || '',
    file_url: row.file_url || row.url || row.public_url || row.github_link || '',
    description: row.description || row.metadata?.description || '',
    author: row.author || row.metadata?.author || '',
  };
}

/**
 * Fetch all resources from database
 */
export async function fetchAllResources() {
  try {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(normalizeResource);
  } catch (err) {
    console.error('Error fetching resources:', err.message);
    return [];
  }
}

/**
 * Fetch resources by filter criteria
 */
export async function fetchResourcesFiltered(filters = {}) {
  try {
    let query = supabase.from('resources').select('*');

    if (filters.resource_type) {
      query = query.eq('resource_type', filters.resource_type);
    }
    if (filters.course_code) {
      query = query.ilike('course_code', `%${filters.course_code}%`);
    }
    if (filters.batch) {
      query = query.eq('batch', filters.batch);
    }
    if (filters.semester) {
      query = query.eq('semester', filters.semester);
    }
    if (filters.year) {
      query = query.eq('year', filters.year);
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,course_code.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(normalizeResource);
  } catch (err) {
    console.error('Error fetching filtered resources:', err.message);
    return [];
  }
}

/**
 * Get unique values for a field from all resources
 */
export async function getUniqueFieldValues(field) {
  try {
    const { data, error } = await supabase
      .from('resources')
      .select(field);
    if (error) throw error;
    const unique = [...new Set(data
      .map(row => row[field])
      .filter(Boolean)
      .map(val => String(val)))].sort();
    return unique;
  } catch (err) {
    console.error(`Error fetching unique ${field} values:`, err.message);
    return [];
  }
}

/**
 * Upload file to Supabase storage
 */
export async function uploadResourceFile(file, userId) {
  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${userId || 'unknown'}/${Date.now()}_${safeName}`;
    const buckets = ['resources', 'resource-files', 'academic-resources'];

    for (const bucket of buckets) {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

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
    }
    throw new Error('All upload attempts failed');
  } catch (err) {
    console.error('File upload error:', err.message);
    throw err;
  }
}

/**
 * Insert resource record to database
 */
export async function insertResource(payload) {
  try {
    const { data, error } = await supabase
      .from('resources')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return normalizeResource(data);
  } catch (err) {
    console.error('Error inserting resource:', err.message);
    throw err;
  }
}

export async function safeInsert(table, payloads) {
  let lastError = null;
  for (const payload of payloads) {
    const { data, error } = await supabase.from(table).insert([payload]).select().single();
    if (!error) return { data, error: null };
    lastError = error;
  }
  return { data: null, error: lastError };
}

export async function getCurrentUserAndProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null, crAssignment: null };
  let profile = null;
  try { const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(); profile = data || null; } catch (_) { }
  let crAssignment = null;
  try { const { data } = await supabase.from('cr_assignments').select('*').eq('user_id', user.id).is('revoked_at', null).maybeSingle(); crAssignment = data || null; } catch (_) { }
  return { user, profile, crAssignment };
}

export function getRoleFlags(user, profile, crAssignment) {
  const role = String(profile?.role || user?.user_metadata?.role || '').toLowerCase();
  const isAdmin = role === 'admin' || profile?.is_admin === true || user?.user_metadata?.role === 'admin';
  const isCR = role === 'cr' || role === 'class representative' || profile?.is_cr === true || Boolean(crAssignment);
  return { isAdmin, isCR, canUpload: isAdmin || isCR };
}
