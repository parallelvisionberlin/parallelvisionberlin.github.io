import test from 'node:test';
import assert from 'node:assert/strict';
import {LEGACY_CLERK, PVLAB_STUDIO_CLERK, clerkInstanceForHostname} from '../lab/clerk-instance.js';
import {
  LEGACY_ISSUER, STUDIO_ISSUER, BROWSER_ORIGINS, LEGACY_ORIGINS, STUDIO_ORIGINS, originsForClerkSession
} from '../lab-worker/clerk-issuer-policy.mjs';

test('Only the dedicated PV LAB hostname selects the independent Clerk instance', () => {
  for (const host of ['pvlab.studio', 'www.pvlab.studio', 'pvlab-studio.pages.dev', 'PVLAB.STUDIO']) {
    assert.equal(clerkInstanceForHostname(host), PVLAB_STUDIO_CLERK);
  }
  for (const host of ['parallelvisionlabel.com', 'www.parallelvisionlabel.com', 'preview.example.com', 'evil.pvlab.studio', '', null]) {
    assert.equal(clerkInstanceForHostname(host), LEGACY_CLERK);
  }
  assert.equal(PVLAB_STUDIO_CLERK.frontendApi, STUDIO_ISSUER);
  assert.notEqual(PVLAB_STUDIO_CLERK.publishableKey, LEGACY_CLERK.publishableKey);
  assert.ok(PVLAB_STUDIO_CLERK.publishableKey.startsWith('pk_live_'));
  assert.equal(Buffer.from(PVLAB_STUDIO_CLERK.publishableKey.slice(8), 'base64url').toString(), 'clerk.pvlab.studio$');
});

test('The live old Clerk site stays available, while new Clerk authentication is disabled unless one pilot is explicitly enabled', () => {
  assert.equal(originsForClerkSession(LEGACY_ISSUER, 'user_Existing', {}), LEGACY_ORIGINS);
  assert.equal(originsForClerkSession(STUDIO_ISSUER, 'user_New', {}), null);
  assert.equal(originsForClerkSession(STUDIO_ISSUER, 'user_New', {LAB_STUDIO_AUTH_ENABLED:'false'}), null);
  const env={LAB_STUDIO_AUTH_ENABLED:'true'};
  assert.equal(originsForClerkSession(STUDIO_ISSUER, 'user_New', env), STUDIO_ORIGINS);
  assert.equal(originsForClerkSession('https://clerk.evil.example', 'user_New', env), null);
  assert.ok(BROWSER_ORIGINS.has('https://pvlab.studio'));
  assert.ok(!BROWSER_ORIGINS.has('https://pvlab-studio.pages.dev'));
  assert.ok(!BROWSER_ORIGINS.has('https://evil.pvlab.studio'));
  assert.ok(!LEGACY_ORIGINS.has('https://pvlab.studio'));
});
