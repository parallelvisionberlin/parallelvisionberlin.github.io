// The two independently configured Clerk applications do NOT share user IDs.
// New-instance sessions are pilot-only until explicit migration of existing
// owner/customer identities, credit ledgers and billing associations is ready.
export const LEGACY_ISSUER = 'https://clerk.parallelvisionlabel.com';
export const STUDIO_ISSUER = 'https://clerk.pvlab.studio';
export const LEGACY_ORIGINS = new Set([
  'https://parallelvisionlabel.com', 'https://www.parallelvisionlabel.com'
]);
export const STUDIO_ORIGINS = new Set([
  'https://pvlab.studio', 'https://www.pvlab.studio'
]);
export const BROWSER_ORIGINS = new Set([...LEGACY_ORIGINS, ...STUDIO_ORIGINS]);

export function originsForClerkSession(issuer, subject, env) {
  if (issuer === LEGACY_ISSUER) return LEGACY_ORIGINS;
  if (issuer !== STUDIO_ISSUER || env?.LAB_NEW_CLERK_PILOT_ENABLED !== 'true') return null;
  // One new test account only. Do not allow the whole new Clerk user base yet.
  const pilot = env.LAB_NEW_CLERK_PILOT_SUBJECT;
  if (typeof pilot !== 'string' || !/^user_[A-Za-z0-9]+$/.test(pilot) || pilot !== subject) return null;
  return STUDIO_ORIGINS;
}
