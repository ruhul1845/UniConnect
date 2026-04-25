import { supabase } from '../../supabaseClient';

export const resourceTypes = [
  ['Slide', 'Slides'], ['Book', 'Books'], ['MidTerm', 'Mid-Term Papers'],
  ['Final', 'Final Papers'], ['Lab', 'Lab Sheets'], ['Project', 'Projects'],
];

export const emptyUpload = { title: '', resource_type: 'Slide', course_code: '', batch: '', semester: '', year: '', author: '', edition: '', lecture_no: '', github_link: '', description: '' };

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
  try { const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(); profile = data || null; } catch (_) {}
  let crAssignment = null;
  try { const { data } = await supabase.from('cr_assignments').select('*').eq('user_id', user.id).is('revoked_at', null).maybeSingle(); crAssignment = data || null; } catch (_) {}
  return { user, profile, crAssignment };
}

export function getRoleFlags(user, profile, crAssignment) {
  const role = String(profile?.role || user?.user_metadata?.role || '').toLowerCase();
  const isAdmin = role === 'admin' || profile?.is_admin === true || user?.user_metadata?.role === 'admin';
  const isCR = role === 'cr' || role === 'class representative' || profile?.is_cr === true || Boolean(crAssignment);
  return { isAdmin, isCR, canUpload: isAdmin || isCR };
}
