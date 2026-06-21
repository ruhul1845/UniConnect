export const ROLES = Object.freeze({
  STUDENT: 'student',
  CR: 'cr',
  ADMIN: 'admin',
});

export function normalizeRole(profile) {
  if (profile?.is_admin === true || String(profile?.role || '').toLowerCase() === ROLES.ADMIN) {
    return ROLES.ADMIN;
  }
  if (profile?.is_cr === true || String(profile?.role || '').toLowerCase() === ROLES.CR) {
    return ROLES.CR;
  }
  return ROLES.STUDENT;
}

export function hasRole(profile, allowedRoles) {
  return allowedRoles.includes(normalizeRole(profile));
}
