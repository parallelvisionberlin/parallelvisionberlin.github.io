// Public Clerk connection settings only. Never put a Clerk secret key in the browser.
export const LEGACY_CLERK = Object.freeze({
  frontendApi: 'https://clerk.parallelvisionlabel.com',
  publishableKey: 'pk_live_Y2xlcmsucGFyYWxsZWx2aXNpb25sYWJlbC5jb20k'
});
export const PVLAB_STUDIO_CLERK = Object.freeze({
  frontendApi: 'https://clerk.pvlab.studio',
  publishableKey: 'pk_live_Y2xlcmsucHZsYWIuc3R1ZGlvJA'
});
const STUDIO_HOSTS = new Set(['pvlab.studio', 'www.pvlab.studio', 'pvlab-studio.pages.dev']);
export function clerkInstanceForHostname(hostname) {
  return STUDIO_HOSTS.has(String(hostname || '').toLowerCase()) ? PVLAB_STUDIO_CLERK : LEGACY_CLERK;
}
