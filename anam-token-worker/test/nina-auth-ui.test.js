import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const files = async () => Promise.all([
  readFile(new URL("../../index.html", import.meta.url), "utf8"),
  readFile(new URL("../../nina-project.html", import.meta.url), "utf8"),
  readFile(new URL("../../css/nina-access.css", import.meta.url), "utf8"),
  readFile(new URL("../../js/nina-access.js", import.meta.url), "utf8")
]);

test("shared Nina auth modal uses the compact conversation-focused copy and controls", async () => {
  const [home, project, css] = await files();
  for (const page of [home, project]) {
    assert.match(page, /id="ninaAccessTitle">TALK TO NINA</);
    assert.match(page, /Create an account or sign in to talk to Nina\./);
    assert.match(page, /Your account keeps your conversations and Signal Credits connected\./);
    assert.match(page, /CONTINUE WITH GOOGLE/);
    assert.match(page, /CONTINUE WITH EMAIL/);
    assert.match(page, /id="ninaPrivateAccessToggle"/);
    assert.match(page, /id="ninaAccessCancel"/);
  }
  assert.match(css, /\.nina-access \{[\s\S]*?background: rgba\(0, 0, 0, \.6\)/);
  assert.match(css, /\.nina-access-panel \{[\s\S]*?background: rgba\(3, 3, 4, \.86\)/);
  assert.match(css, /\.nina-access-account:first-child/);
  assert.match(css, /@media \(max-width: 560px\)[\s\S]*?\.nina-access-close \{[^}]*width: 44px; height: 44px/);
  assert.match(css, /@media \(max-width: 560px\)[\s\S]*?\.nina-access-account \{[^}]*min-height: 46px/);
});

test("Meta funnel events are interaction-bound, privacy-safe and duplicate-protected", async () => {
  const [home, project, , frontend] = await files();
  assert.match(frontend, /typeof window\.fbq !== "function"/);
  assert.match(frontend, /const ninaFunnelEvents = new Set\(\)/);
  assert.match(frontend, /ninaFunnelEvents\.has\(key\)/);
  assert.match(frontend, /const eventId = crypto\.randomUUID\(\)/);
  assert.match(frontend, /window\.fbq\("trackCustom", name, parameters \|\| \{\}, \{ eventID: eventId \}\)/);
  assert.match(frontend, /document\.cookie\.split\(";"\)/);
  assert.match(frontend, /fbp: readNinaMetaCookie\("_fbp"\) \|\| readNinaMetaCookie\("fbp"\)/);
  assert.match(frontend, /fbc: readNinaMetaCookie\("_fbc"\)/);
  assert.match(frontend, /const ninaMetaTestFromUrl = new URLSearchParams\(window\.location\.search\)\.get\("meta_test"\) === "TEST14543"/);
  assert.match(frontend, /sessionStorage\.setItem\(NINA_META_TEST_KEY, "TEST14543"\)/);
  assert.match(frontend, /sessionStorage\.getItem\(NINA_META_TEST_KEY\) === "TEST14543"/);
  assert.match(frontend, /if \(ninaMetaTestEnabled\(\)\) payload\.testEventCode = "TEST14543"/);
  assert.equal(frontend.match(/testEventCode/g)?.length, 1);
  assert.match(frontend, /body: JSON\.stringify\(payload\)/);
  assert.match(frontend, /void sendNinaMetaServerEvent\(name, eventId\)/);
  assert.match(frontend, /trigger\.addEventListener\("click", event => \{\s*trackNinaFunnelEvent\("TalkToNinaClicked"\)/);
  const openAccess = frontend.slice(frontend.indexOf("function openNinaAccess()"), frontend.indexOf("function closeNinaAccess"));
  assert.match(openAccess, /classList\.add\("is-open"\)[\s\S]*?trackNinaFunnelEvent\("NinaAuthModalOpened"\)/);
  assert.match(frontend, /markNinaAuthStarted\("google"\)[\s\S]*?authenticateWithRedirect/);
  assert.match(frontend, /showInlineEmailSignIn[\s\S]*?markNinaAuthStarted\("email"\)/);
  for (const privateField of ["emailAddress", "displayName", "clerkUserId", "SignalCreditBalance", "conversationContent"]) {
    assert.doesNotMatch(frontend.slice(frontend.indexOf("function trackNinaFunnelEvent"), frontend.indexOf("function storeNinaAuthReturn")), new RegExp(privateField));
  }
  assert.doesNotMatch(home, /TalkToNinaClicked|NinaAuthModalOpened|NinaSignupStarted/);
  assert.doesNotMatch(project, /TalkToNinaClicked|NinaAuthModalOpened|NinaSignupStarted/);
});

test("TalkToNina remains online-only and auth completion uses exact Clerk success states", async () => {
  const [, , , frontend] = await files();
  const online = frontend.slice(frontend.indexOf("function markNinaOnline()"), frontend.indexOf("function clearNinaUsageTimer()"));
  assert.match(online, /trackNinaFunnelEvent\("TalkToNina"\)/);
  const beforeOnline = frontend.slice(0, frontend.indexOf("function markNinaOnline()"));
  assert.doesNotMatch(beforeOnline, /trackNinaFunnelEvent\("TalkToNina"\)/);
  assert.match(frontend, /attempt\?\.status !== "complete" \|\| !attempt\.createdSessionId/);
  assert.match(frontend, /await clerk\.setActive\([\s\S]*?trackNinaAuthCompleted\(\)/);
  assert.match(frontend, /handleRedirectCallback\([\s\S]*?clerk\.isSignedIn && clerk\.session\) trackNinaAuthCompleted\(\)/);
  assert.match(frontend, /sessionStorage\.getItem\(NINA_AUTH_FUNNEL_KEY\)/);
});
