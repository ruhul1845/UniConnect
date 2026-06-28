export const PRIMARY_EMAIL_DOMAIN = '@cs.du.ac.bd';
export const TEST_EMAIL_DOMAIN = '@du.ac.bd';

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isCseEmail(email) {
  return normalizeEmail(email).endsWith(PRIMARY_EMAIL_DOMAIN);
}

export function isTestEmail(email) {
  const normalized = normalizeEmail(email);
  return normalized.endsWith(TEST_EMAIL_DOMAIN) && !normalized.endsWith(PRIMARY_EMAIL_DOMAIN);
}

export function isAllowedUniversityEmail(email) {
  return isCseEmail(email) || isTestEmail(email);
}

export function needsEmailVerification(profile, session) {
  const email = profile?.university_email || session?.user?.email;
  return isCseEmail(email) && profile?.email_verified !== true;
}
