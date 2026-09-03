/* The access gate is theatrical client-side UI; its public hash is not authorization. */
import { createClient, AnamEvent } from "https://esm.sh/@anam-ai/js-sdk@4.23.1?bundle";
import { Clerk } from "https://esm.sh/@clerk/clerk-js@6?bundle";

const DEVELOPMENT = window.location.protocol === "http:";
const ANAM_SESSION_TOKEN_ENDPOINT = DEVELOPMENT
  ? `http://${window.location.hostname}:8787/session-token`
  : "https://parallel-vision-anam-token.parallelvision.workers.dev/session-token";
const ANAM_PERSONA_ID = "a5663da5-5f5c-4600-b545-cbb58bd4e155";
const CLERK_CONFIGURATION = DEVELOPMENT
  ? {
      publishableKey: "pk_test_Y2xpbWJpbmctd29tYmF0LTI3MTcuY2xlcmsuYWNjb3VudHMuZGV2JA",
      frontendDomain: "climbing-wombat-2717.clerk.accounts.dev"
    }
  : {
      publishableKey: "pk_live_Y2xlcmsucGFyYWxsZWx2aXNpb25sYWJlbC5jb20k",
      frontendDomain: "clerk.parallelvisionlabel.com"
    };
const byId = id => document.getElementById(id);
const ninaOverlay = byId("ninaOverlay");
const openNina = byId("openNina");
const openNinaArtist = byId("openNinaArtist");
const ninaOpenTriggers = Array.from(document.querySelectorAll("[data-nina-open]"));
const ninaAccess = byId("ninaAccess");
const ninaAccessPanel = ninaAccess?.querySelector(".nina-access-panel");
const ninaAccessForm = byId("ninaAccessForm");
const ninaAccessCode = byId("ninaAccessCode");
const ninaAccessError = byId("ninaAccessError");
const ninaAccessSubmit = byId("ninaAccessSubmit");
const ninaAccessCancel = byId("ninaAccessCancel");
const ninaPrivateAccessToggle = byId("ninaPrivateAccessToggle");
const ninaWindow = document.querySelector(".nina-window");
const ninaFullscreen = byId("ninaFullscreen");
const closeNina = byId("closeNina");
const startNina = byId("startNina");
const ninaVideo = byId("nina-anam-video");
const ninaStatus = byId("ninaStatus");
const ninaScrim = document.querySelector(".nina-call-scrim");
const ninaScrimTitle = byId("ninaScrimTitle");
const ninaScrimSubtitle = byId("ninaScrimSubtitle");
const ninaScrimMessage = byId("ninaScrimMessage");
const ninaScrimButton = byId("ninaScrimButton");
const ninaTimeWarning = byId("ninaTimeWarning");
const ninaPostSignalActions = byId("ninaPostSignalActions");
const ninaPostSignalReturn = byId("ninaPostSignalReturn");
const ninaMicrophone = byId("ninaMicrophone");
const ninaMicrophoneToggle = byId("ninaMicrophoneToggle");
const ninaMicrophonePicker = byId("ninaMicrophonePicker");
const ninaMicrophoneName = byId("ninaMicrophoneName");
const ninaMicrophoneSelect = byId("ninaMicrophoneSelect");
const ninaMicrophoneStatus = byId("ninaMicrophoneStatus");
const ninaEligibilityStatus = byId("ninaEligibilityStatus");
const ninaReferralEntry = byId("ninaReferralEntry");
const ninaReferralPanel = byId("ninaReferralPanel");
const ninaReferralClose = byId("ninaReferralClose");
const ninaReferralCode = byId("ninaReferralCode");
const ninaReferralCopy = byId("ninaReferralCopy");
const ninaReferralStatus = byId("ninaReferralStatus");
const ninaMemoryIndicator = byId("ninaMemoryIndicator");
const ninaForgetMemory = byId("ninaForgetMemory");
const ninaSignIn = byId("ninaSignIn");
const ninaSignInEmail = byId("ninaSignInEmail");
const ninaAccessAuthActions = ninaAccess?.querySelector(".nina-access-auth-actions");
const ninaEmailSignInForm = byId("ninaEmailSignInForm");
const ninaEmailSignInBack = byId("ninaEmailSignInBack");
const ninaEmailAddress = byId("ninaEmailAddress");
const ninaEmailPassword = byId("ninaEmailPassword");
const ninaEmailSignInError = byId("ninaEmailSignInError");
const ninaEmailSignInSubmit = byId("ninaEmailSignInSubmit");
const ninaEmailCreateAccount = byId("ninaEmailCreateAccount");
const ninaEmailForgotPassword = byId("ninaEmailForgotPassword");
const ninaAccountShell = byId("ninaAccountShell");
const ninaAccountToggle = byId("ninaAccountToggle");
const ninaAccountPanel = byId("ninaAccountPanel");
const ninaAccountLoggedOut = byId("ninaAccountLoggedOut");
const ninaAccountLoggedIn = byId("ninaAccountLoggedIn");
const ninaAccountSignIn = byId("ninaAccountSignIn");
const ninaAccountSignUp = byId("ninaAccountSignUp");
const ninaAccountBuyCredits = byId("ninaAccountBuyCredits");
const ninaAccountCreditsInfoTrigger = byId("ninaAccountCreditsInfoTrigger");
const ninaAccountCreditsInfo = byId("ninaAccountCreditsInfo");
const ninaAccountCreditsInfoClose = byId("ninaAccountCreditsInfoClose");
const ninaAccountName = byId("ninaAccountName");
const ninaAccountAnalytics = byId("ninaAccountAnalytics");
const ninaSignalCredits = byId("ninaSignalCredits");
const ninaLiveTime = byId("ninaLiveTime");
const ninaAccountSignOut = byId("ninaAccountSignOut");
const SIGNAL_CREDIT_PACK_IDS = new Set(["signal_60", "signal_150", "signal_300", "signal_600"]);
const NINA_CREDIT_CHECKOUT_STATE_KEY = "nina_signal_credit_checkout_v1";
const NINA_CREDIT_SNAPSHOT_KEY = "nina_signal_credit_snapshot_v1";
const NINA_CREDIT_SNAPSHOT_TTL_MS = 10 * 60 * 1000;
const NINA_ANALYTICS_HEARTBEAT_MS = 30000;
const ninaAccessHash = "d3ec7a14e4fefc8da57d4045a6ee28d28b328b78126c1e22bc0b541adf0f215c";
const NINA_PREFERRED_MICROPHONE_KEY = "ninaPreferredMicrophoneId";
const NINA_VISITOR_ID_KEY = "nina_fok_visitor_id_v1";
const NINA_USER_PROFILE_KEY = "nina_fok_user_profile_v1";
const NINA_OWNER_CREDENTIAL_KEY = "nina_fok_owner_credential_v2";
const NINA_LEGACY_OWNER_TOKEN_KEY = "nina_fok_owner_token_v1";
const NINA_MEMORY_KEY_PREFIX = "nina_fok_memory_v2:";
const NINA_LEGACY_MEMORY_KEY = "nina_fok_alejandro_memory_v1";
const NINA_REFERRAL_CODE_KEY = "pv_nina_referral_code_v1";
const NINA_AUTH_RETURN_KEY = "nina_auth_return_v1";
const NINA_AUTH_FUNNEL_KEY = "nina_auth_funnel_v1";
const NINA_REFERRAL_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;
const NINA_MEMORY_LIMIT = 20;
const NINA_SIGNUP_TRIAL_GRACE_MS = 60000;
const NINA_VISITOR_ID_PATTERN = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|visitor-[a-z0-9-]+)$/i;
let ninaAccessSubmitting = false;
let ninaAccessVerifiedForCurrentOpen = false;
let ninaPrivateAccessVerified = false;
let ninaConnecting = false;
let ninaClient = null;
let ninaAttempt = 0;
let ninaTokenAbortController = null;
let ninaMicrophoneStream = null;
let ninaMicrophoneSetupPromise = null;
let lastNinaTrigger = null;
let ninaScrollPosition = 0;
let ninaMemoryLoadedForSession = false;
let ninaMemoryListenerCleanup = null;
let ninaSessionMessageKeys = new Set();
let ninaServerConversationId = "";
let ninaMemorySyncPromise = Promise.resolve();
let ninaAuthInitialization = null;
let ninaClerk = null;
let ninaClerkUILoading = null;
let ninaCreditsUserId = "";
let ninaCreditsRequest = 0;
let ninaCreditsBalance = null;
let ninaCreditsLoadPromise = null;
let ninaCreditsLoadUserId = "";
let ninaOwnerBypass = false;
let ninaCreditsPurchasePending = false;
let ninaCreditsPurchaseTrigger = null;
let ninaCreditsPurchaseModal = null;
let ninaCreditsPurchaseTitle = null;
let ninaCreditsPurchaseLead = null;
let ninaCreditsPurchaseStatus = null;
let ninaCreditsPackList = null;
let ninaCreditsPackButtons = [];
let ninaCreditsPurchaseClose = null;
let ninaUsageSessionId = "";
let ninaUsageActive = false;
let ninaUsageEnding = false;
let ninaUsageTimer = null;
let ninaTrialGraceTimer = null;
let ninaTrialGraceReadyPromise = null;
let ninaTrialActivationPending = false;
let ninaUsageWarningTimer = null;
let ninaUsageWarningShown = false;
let ninaUsageRemainingSeconds = null;
let ninaUsageSettlementSeconds = null;
let ninaScrimAction = "connect";
let ninaUsageActivationPromise = null;
let ninaUsageSettlementFailures = 0;
let ninaReferralAttributionPromise = null;
let ninaReferralLink = "";
let ninaReferralCodeValue = "";
let ninaPrimaryAction = "connect";
let ninaTalkToNinaTracked = false;
let ninaAnalyticsEntryId = "";
let ninaAnalyticsSessionId = "";
let ninaAnalyticsStartPromise = null;
let ninaAnalyticsHeartbeatTimer = null;
let ninaAnalyticsHeaders = null;
const ninaFunnelEvents = new Set();

function readNinaMetaCookie(name) {
  const prefix = `${name}=`;
  const cookie = document.cookie.split(";").map(value => value.trimStart()).find(value => value.startsWith(prefix));
  return cookie ? cookie.slice(prefix.length) : "";
}

async function sendNinaMetaServerEvent(eventName, eventId) {
  try {
    const headers = { "Content-Type": "application/json" };
    const token = await ninaClerk?.session?.getToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;
    const payload = {
      eventName,
      eventId,
      eventSourceUrl: window.location.href,
      fbp: readNinaMetaCookie("_fbp") || readNinaMetaCookie("fbp"),
      fbc: readNinaMetaCookie("_fbc")
    };
    if (new URLSearchParams(window.location.search).get("meta_test") === "TEST14543") payload.testEventCode = "TEST14543";
    await fetch(`${ANAM_SESSION_TOKEN_ENDPOINT.replace(/\/session-token$/, "")}/api/nina/meta-event`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      keepalive: true
    });
  } catch (error) { logDevelopmentError(`Meta CAPI ${eventName} unavailable.`, error); }
}

function trackNinaFunnelEvent(name, parameters) {
  const key = parameters?.method ? `${name}:${parameters.method}` : name;
  if (ninaFunnelEvents.has(key) || typeof window.fbq !== "function") return false;
  try {
    const eventId = crypto.randomUUID();
    window.fbq("trackCustom", name, parameters || {}, { eventID: eventId });
    ninaFunnelEvents.add(key);
    void sendNinaMetaServerEvent(name, eventId);
    if (DEVELOPMENT) console.info(`[Meta Pixel] ${name} fired`, parameters || "");
    return true;
  } catch (error) {
    logDevelopmentError(`Meta Pixel ${name} unavailable.`, error);
    return false;
  }
}

function markNinaAuthStarted(method) {
  try { sessionStorage.setItem(NINA_AUTH_FUNNEL_KEY, method); } catch { /* Funnel persistence is optional. */ }
  trackNinaFunnelEvent("NinaSignupStarted", { method });
}

function trackNinaAuthCompleted() {
  let started = false;
  try {
    started = Boolean(sessionStorage.getItem(NINA_AUTH_FUNNEL_KEY));
    sessionStorage.removeItem(NINA_AUTH_FUNNEL_KEY);
  } catch { /* Completion still depends on this page's tracked flow. */ }
  if (started || ninaFunnelEvents.has("NinaSignupStarted:google") || ninaFunnelEvents.has("NinaSignupStarted:email")) {
    trackNinaFunnelEvent("NinaAuthCompleted");
  }
}

function storeNinaAuthReturn(action = "") {
  const url = new URL(window.location.href);
  sessionStorage.setItem(NINA_AUTH_RETURN_KEY, JSON.stringify({ path: `${url.pathname}${url.search}${url.hash}`, action }));
}

function readNinaAuthReturn() {
  const stored = sessionStorage.getItem(NINA_AUTH_RETURN_KEY);
  if (stored === "signal") return { path: "", action: "signal" };
  try {
    const value = JSON.parse(stored || "null");
    const url = new URL(value?.path || "", window.location.origin);
    if (url.origin !== window.location.origin || !value?.path?.startsWith("/")) return null;
    return { path: `${url.pathname}${url.search}${url.hash}`, action: value.action === "signal" ? "signal" : "" };
  } catch { return null; }
}

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const logDevelopmentError = (message, error) => { if (DEVELOPMENT) console.error(message, error); };
const nativeFullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
const ninaIsFullscreen = () => nativeFullscreenElement() === ninaWindow || ninaWindow.classList.contains("is-fallback-fullscreen");
const formatLiveTime = seconds => {
  const safe = Math.max(0, Number.isSafeInteger(seconds) ? seconds : 0);
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return remainder ? `${minutes} min ${remainder} sec` : `${minutes} min`;
};

function clearSignalCreditSnapshot() {
  try { localStorage.removeItem(NINA_CREDIT_SNAPSHOT_KEY); } catch { /* Display cache is optional. */ }
}

function readSignalCreditSnapshot(userId) {
  try {
    const snapshot = JSON.parse(localStorage.getItem(NINA_CREDIT_SNAPSHOT_KEY) || "null");
    const valid = snapshot?.userId === userId &&
      Number.isSafeInteger(snapshot.balance) && snapshot.balance >= 0 &&
      Number.isSafeInteger(snapshot.remainingSeconds) && snapshot.remainingSeconds >= 0 &&
      Number.isSafeInteger(snapshot.timestamp) &&
      Date.now() >= snapshot.timestamp && Date.now() - snapshot.timestamp <= NINA_CREDIT_SNAPSHOT_TTL_MS;
    if (valid) return snapshot;
    if (snapshot) clearSignalCreditSnapshot();
  } catch { clearSignalCreditSnapshot(); }
  return null;
}

function writeSignalCreditSnapshot(userId, balance, remainingSeconds) {
  if (!userId || !Number.isSafeInteger(balance) || balance < 0 ||
      !Number.isSafeInteger(remainingSeconds) || remainingSeconds < 0) return;
  try {
    localStorage.setItem(NINA_CREDIT_SNAPSHOT_KEY, JSON.stringify({ userId, balance, remainingSeconds, timestamp: Date.now() }));
  } catch { /* Display cache is optional. */ }
}

function renderSignalCreditDisplay(balance, remainingSeconds) {
  if (ninaSignalCredits) {
    ninaSignalCredits.textContent = `${balance.toLocaleString()} credits`;
    ninaSignalCredits.removeAttribute("data-state");
  }
  if (ninaLiveTime) ninaLiveTime.textContent = formatLiveTime(remainingSeconds);
}

function normalizedReferralCode(value) {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  return NINA_REFERRAL_CODE_PATTERN.test(code) ? code : "";
}

function captureReferralCode() {
  try {
    if (normalizedReferralCode(localStorage.getItem(NINA_REFERRAL_CODE_KEY))) return;
    const code = normalizedReferralCode(new URLSearchParams(location.search).get("ref"));
    if (code) localStorage.setItem(NINA_REFERRAL_CODE_KEY, code);
  } catch { /* Referral capture is optional when browser storage is unavailable. */ }
}

async function submitCapturedReferral(clerk, account, token) {
  if (ninaReferralAttributionPromise || !clerk?.isSignedIn || !token) return ninaReferralAttributionPromise;
  let code = "";
  try { code = normalizedReferralCode(localStorage.getItem(NINA_REFERRAL_CODE_KEY)); } catch { return null; }
  if (!code) return null;
  if (code === normalizedReferralCode(account?.referral_code)) {
    localStorage.removeItem(NINA_REFERRAL_CODE_KEY);
    return null;
  }
  ninaReferralAttributionPromise = (async () => {
    const response = await fetch(`${ANAM_SESSION_TOKEN_ENDPOINT.replace(/\/session-token$/, "")}/api/account/referral`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ referralCode: code })
    });
    if (response.ok || [400, 404, 409].includes(response.status)) localStorage.removeItem(NINA_REFERRAL_CODE_KEY);
  })().catch(error => logDevelopmentError("Referral attribution unavailable.", error)).finally(() => { ninaReferralAttributionPromise = null; });
  return ninaReferralAttributionPromise;
}

captureReferralCode();

function syncAccountLanguage(language = document.documentElement.lang) {
  const german = language === "de";
  const explanation = ninaAccountLoggedOut?.querySelector(".nina-account-explanation");
  if (explanation) explanation.textContent = german ? "Melde dich an, um Erinnerungen zu speichern, Signal Credits zu verwalten und deine Geschichte mit Nina fortzusetzen." : "Sign in to save memory, manage Signal Credits and continue your history with Nina.";
  if (ninaAccountSignIn) ninaAccountSignIn.textContent = german ? "Anmelden" : "Sign in";
  if (ninaAccountSignUp) ninaAccountSignUp.textContent = german ? "Konto erstellen" : "Create account";
  const labels = german ? ["Profil", "Freund einladen", "Zahlungen", "Erinnerung", "Newsletter"] : ["Profile", "Refer a Friend", "Billing", "Memory", "Newsletter"];
  ninaAccountPanel?.querySelectorAll(".nina-account-menu a").forEach((link, index) => { link.textContent = labels[index] || link.textContent; });
  syncNinaAccountCreditActions(ninaCreditsBalance, language);
  if (ninaAccountSignOut) ninaAccountSignOut.textContent = german ? "Abmelden" : "Sign out";
  const creditLabels = ninaAccountPanel?.querySelectorAll(".nina-account-credits span");
  if (creditLabels?.[1]) creditLabels[1].textContent = german ? "Live Nina Zeit" : "Live Nina Time";
  const about = ninaCreditsPurchaseModal?.querySelector(".nina-credits-about-copy");
  if (about) about.innerHTML = german
    ? "<p>Signal Credits halten Live Nina am Laufen.</p><p>Jedes neue verifizierte Konto beginnt mit 3 kostenlosen Minuten.</p><p>Danach kannst du jederzeit mehr Live-Zeit hinzufügen, wenn du das Signal erneut öffnen möchtest.</p><p>Live Nina nutzt Echtzeit-Sprach-, Sprachmodell- und visuelle Systeme, solange die Verbindung aktiv ist.</p><p>Verfügbare Pakete beginnen bei 6 Minuten für €3.50.</p><p>Wenn das Signal endet, bleibt deine Geschichte mit Nina erhalten.</p>"
    : "<p>Signal Credits keep Live Nina running.</p><p>Every new verified account begins with 3 minutes free.</p><p>After that, you can add more live time whenever you want to open the signal again.</p><p>Live Nina uses real-time voice, language and visual systems while the connection is active.</p><p>Available packs start at 6 minutes for €3.50.</p><p>When the signal ends, your history with Nina remains.</p>";
}

function syncNinaFullscreen() {
  const isFullscreen = ninaIsFullscreen();
  ninaFullscreen.classList.toggle("is-exit", isFullscreen);
  ninaFullscreen.setAttribute("aria-label", isFullscreen ? "Exit fullscreen" : "Enter fullscreen");
  ninaFullscreen.setAttribute("aria-pressed", String(isFullscreen));
  document.body.classList.toggle("nina-fullscreen-active", ninaWindow.classList.contains("is-fallback-fullscreen"));
}

async function exitNinaFullscreen() {
  ninaWindow.classList.remove("is-fallback-fullscreen");
  try {
    if (nativeFullscreenElement()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) await Promise.resolve(exit.call(document));
    }
  } catch (error) {
    logDevelopmentError("Unable to exit Nina fullscreen cleanly.", error);
  }
  syncNinaFullscreen();
}

async function toggleNinaFullscreen() {
  if (ninaIsFullscreen()) {
    await exitNinaFullscreen();
    return;
  }
  const request = ninaWindow.requestFullscreen || ninaWindow.webkitRequestFullscreen;
  if (request) {
    try {
      await Promise.resolve(request.call(ninaWindow));
      if (nativeFullscreenElement() === ninaWindow) {
        syncNinaFullscreen();
        return;
      }
    } catch (error) {
      logDevelopmentError("Native Nina fullscreen unavailable; using viewport fallback.", error);
    }
  }
  ninaWindow.classList.add("is-fallback-fullscreen");
  syncNinaFullscreen();
}

function createAnonymousVisitorId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `visitor-${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(2)).join("-")}`;
}

function getNinaVisitorId() {
  try {
    const stored = localStorage.getItem(NINA_VISITOR_ID_KEY);
    if (stored && stored.length <= 128 && NINA_VISITOR_ID_PATTERN.test(stored)) return stored;
    const visitorId = createAnonymousVisitorId();
    localStorage.setItem(NINA_VISITOR_ID_KEY, visitorId);
    return visitorId;
  } catch {
    return createAnonymousVisitorId();
  }
}

const ninaVisitorId = getNinaVisitorId();
const ninaMemoryKey = `${NINA_MEMORY_KEY_PREFIX}${ninaVisitorId}`;

function validateNinaUserProfile(profile) {
  if (!profile || typeof profile !== "object") return null;
  const displayName = typeof profile.displayName === "string" ? profile.displayName.trim() : "";
  const profileType = profile.profileType === "owner" || profile.profileType === "visitor" ? profile.profileType : "";
  if (!displayName || displayName.length > 50 || !profileType) return null;
  return { displayName, profileType };
}

function readNinaUserProfile() {
  try {
    return validateNinaUserProfile(JSON.parse(localStorage.getItem(NINA_USER_PROFILE_KEY) || "null"));
  } catch {
    return null;
  }
}

window.enrollNinaAlejandro = async enrollmentToken => {
  if (typeof enrollmentToken !== "string" || enrollmentToken.trim().length < 32 || enrollmentToken.trim().length > 256) {
    throw new Error("A valid one-time owner enrollment token is required.");
  }
  const response = await fetch(`${ANAM_SESSION_TOKEN_ENDPOINT.replace(/\/session-token$/, "")}/owner/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${enrollmentToken.trim()}` },
    body: JSON.stringify({ visitorId: ninaVisitorId })
  });
  if (!response.ok) throw new Error("Owner enrollment was denied.");
  const data = await response.json();
  if (typeof data.ownerCredential !== "string" || data.ownerCredential.length < 32) {
    throw new Error("Owner enrollment returned an invalid credential.");
  }
  const profile = { displayName: "Alejandro", profileType: "owner" };
  localStorage.setItem(NINA_USER_PROFILE_KEY, JSON.stringify(profile));
  localStorage.setItem(NINA_OWNER_CREDENTIAL_KEY, data.ownerCredential);
  localStorage.removeItem(NINA_LEGACY_OWNER_TOKEN_KEY);
  return profile;
};

window.clearNinaUserProfile = () => {
  localStorage.removeItem(NINA_USER_PROFILE_KEY);
  localStorage.removeItem(NINA_OWNER_CREDENTIAL_KEY);
  localStorage.removeItem(NINA_LEGACY_OWNER_TOKEN_KEY);
};

function readNinaOwnerCredential() {
  try {
    const credential = localStorage.getItem(NINA_OWNER_CREDENTIAL_KEY) || "";
    return credential.length >= 32 && credential.length <= 512 ? credential : "";
  } catch { return ""; }
}

function removeLegacyNinaOwnerToken() {
  try { localStorage.removeItem(NINA_LEGACY_OWNER_TOKEN_KEY); } catch { /* Legacy credential is never read. */ }
}

function legacyOwnerMemoryHeaders() {
  const credential = readNinaOwnerCredential();
  return credential ? { "Content-Type": "application/json", "Authorization": `Bearer ${credential}` } : { "Content-Type": "application/json" };
}

function updateNinaAccountControls(clerk = ninaClerk) {
  const signedIn = Boolean(clerk?.isSignedIn && clerk?.session);
  if (ninaSignIn) ninaSignIn.hidden = signedIn;
  if (ninaSignIn) ninaSignIn.disabled = false;
  if (ninaSignInEmail) ninaSignInEmail.hidden = signedIn;
  if (ninaSignInEmail) ninaSignInEmail.disabled = false;
  if (ninaAccountShell) ninaAccountShell.hidden = false;
  if (ninaAccountLoggedOut) ninaAccountLoggedOut.hidden = signedIn;
  if (ninaAccountLoggedIn) ninaAccountLoggedIn.hidden = !signedIn;
  if (ninaAccountAnalytics) ninaAccountAnalytics.hidden = true;
  const userLabel = clerk?.user?.fullName || clerk?.user?.firstName || clerk?.user?.primaryEmailAddress?.emailAddress || "Connected account";
  if (ninaAccountName) ninaAccountName.textContent = userLabel;
  if (signedIn) {
    void loadAccountDisplayName(clerk, userLabel);
    void loadSignalCreditBalance(clerk);
  }
  else {
    ninaCreditsUserId = "";
    ninaCreditsRequest += 1;
    ninaCreditsBalance = null;
    ninaCreditsLoadPromise = null;
    ninaCreditsLoadUserId = "";
    ninaOwnerBypass = false;
    clearSignalCreditSnapshot();
    syncNinaAccountCreditActions(null);
    if (ninaSignalCredits) {
      ninaSignalCredits.textContent = "Loading…";
      ninaSignalCredits.removeAttribute("data-state");
    }
    if (ninaLiveTime) ninaLiveTime.textContent = "—";
    if (ninaAccountPanel && !ninaAccountPanel.hidden) ninaAccountSignIn?.focus({ preventScroll: true });
  }
}

function syncNinaAccountCreditActions(balance, language = document.documentElement.lang) {
  const canTransmit = Number.isSafeInteger(balance) && balance > 0;
  const german = language === "de";
  if (ninaAccountBuyCredits) {
    ninaAccountBuyCredits.textContent = canTransmit
      ? (german ? "Mit 2063 verbinden" : "Connect to 2063")
      : (german ? "Signal Credits kaufen" : "Buy Signal Credits");
    ninaAccountBuyCredits.dataset.action = canTransmit ? "transmit" : "credits";
  }
  if (ninaCreditsPurchaseTrigger) {
    ninaCreditsPurchaseTrigger.textContent = german ? "Signal Credits hinzufügen" : "Add Signal Credits";
    ninaCreditsPurchaseTrigger.hidden = !canTransmit;
  }
}

async function loadAccountDisplayName(clerk = ninaClerk, fallback = "Connected account") {
  if (!ninaAccountName || !clerk?.isSignedIn || !clerk?.session) return;
  try {
    const token = await clerk.session.getToken();
    const response = await fetch(`${ANAM_SESSION_TOKEN_ENDPOINT.replace(/\/session-token$/, "")}/api/account`, {
      cache: "no-store",
      headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      if (typeof data.displayName === "string" && data.displayName.trim()) ninaAccountName.textContent = data.displayName.trim();
      if (ninaAccountAnalytics) ninaAccountAnalytics.hidden = data.role !== "owner";
      ninaReferralCodeValue = normalizedReferralCode(data.referral_code);
      ninaReferralLink = typeof data.referral_link === "string" ? data.referral_link : "";
      await submitCapturedReferral(clerk, data, token);
    }
  } catch {
    ninaAccountName.textContent = fallback;
  }
}

function loadSignalCreditBalance(clerk = ninaClerk, force = false) {
  if (!ninaSignalCredits || !clerk?.isSignedIn || !clerk?.session) return Promise.resolve(null);
  const userId = clerk.user?.id || clerk.session.user?.id || "signed-in";
  if (ninaCreditsLoadPromise && ninaCreditsLoadUserId === userId) return ninaCreditsLoadPromise;
  if (!force && ninaCreditsUserId === userId && Number.isSafeInteger(ninaCreditsBalance)) return Promise.resolve(ninaCreditsBalance);
  const userChanged = Boolean(ninaCreditsUserId && ninaCreditsUserId !== userId);
  if (userChanged) {
    ninaCreditsBalance = null;
    ninaOwnerBypass = false;
    syncNinaAccountCreditActions(null);
    clearSignalCreditSnapshot();
  }
  ninaCreditsUserId = userId;
  const requestId = ++ninaCreditsRequest;
  const snapshot = readSignalCreditSnapshot(userId);
  if (snapshot) renderSignalCreditDisplay(snapshot.balance, snapshot.remainingSeconds);
  else {
    ninaSignalCredits.textContent = "Loading…";
    if (ninaLiveTime) ninaLiveTime.textContent = "Loading…";
    ninaSignalCredits.removeAttribute("data-state");
  }
  ninaCreditsLoadUserId = userId;
  ninaCreditsLoadPromise = (async () => {
    try {
      const token = await clerk.session.getToken();
      if (!token) throw new Error("Account token unavailable");
      const response = await fetch(`${ANAM_SESSION_TOKEN_ENDPOINT.replace(/\/session-token$/, "")}/api/nina/credits`, {
        headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
        cache: "no-store"
      });
      const data = await response.json();
      if (!response.ok) {
        const error = new Error(typeof data?.error === "string" ? data.error : "Signal Credit balance unavailable");
        error.code = data?.code;
        throw error;
      }
      if (!Number.isSafeInteger(data?.balance) || data.balance < 0) throw new Error("Invalid Signal Credit balance");
      if (requestId !== ninaCreditsRequest) return null;
      ninaCreditsBalance = data.balance;
      ninaOwnerBypass = data.ownerBypass === true;
      syncNinaAccountCreditActions(data.balance);
      renderSignalCreditDisplay(data.balance, data.remainingSeconds);
      writeSignalCreditSnapshot(userId, data.balance, data.remainingSeconds);
      return data.balance;
    } catch (error) {
      if (requestId !== ninaCreditsRequest) return null;
      ninaCreditsBalance = null;
      ninaOwnerBypass = false;
      syncNinaAccountCreditActions(null);
      const verificationRequired = error?.code === "email_verification_required";
      if (verificationRequired) {
        ninaSignalCredits.textContent = "Confirm email";
        if (ninaLiveTime) ninaLiveTime.textContent = "Verification required";
      } else {
        ninaSignalCredits.textContent = "Unavailable";
        if (ninaLiveTime) ninaLiveTime.textContent = "Unavailable";
      }
      ninaSignalCredits.dataset.state = verificationRequired ? "verification-required" : "unavailable";
      logDevelopmentError("Signal Credit balance unavailable.", error);
      return null;
    }
  })().finally(() => {
    if (ninaCreditsLoadUserId === userId) {
      ninaCreditsLoadPromise = null;
      ninaCreditsLoadUserId = "";
    }
  });
  return ninaCreditsLoadPromise;
}

function loadNinaClerkUI() {
  if (window.__internal_ClerkUICtor) return Promise.resolve(window.__internal_ClerkUICtor);
  if (!ninaClerkUILoading) ninaClerkUILoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://${CLERK_CONFIGURATION.frontendDomain}/npm/@clerk/ui@1/dist/ui.browser.js`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.addEventListener("load", () => window.__internal_ClerkUICtor
      ? resolve(window.__internal_ClerkUICtor)
      : reject(new Error("Clerk UI did not initialize")), { once: true });
    script.addEventListener("error", () => reject(new Error("Unable to load Clerk UI")), { once: true });
    document.head.appendChild(script);
  }).catch(error => {
    ninaClerkUILoading = null;
    throw error;
  });
  return ninaClerkUILoading;
}

async function initializeNinaAuth() {
  if (!ninaAuthInitialization) ninaAuthInitialization = (async () => {
    if (ninaSignIn) ninaSignIn.disabled = true;
    if (ninaSignInEmail) ninaSignInEmail.disabled = true;
    const ClerkUI = await loadNinaClerkUI();
    const clerk = ninaClerk || new Clerk(CLERK_CONFIGURATION.publishableKey);
    await clerk.load({ ui: { ClerkUI } });
    ninaClerk = clerk;
    clerk.addListener?.(() => updateNinaAccountControls(clerk));
    updateNinaAccountControls(clerk);
    const callbackUrl = new URL(window.location.href);
    if (callbackUrl.searchParams.get("nina_clerk_callback") === "1") {
      callbackUrl.searchParams.delete("nina_clerk_callback");
      await clerk.handleRedirectCallback({
        redirectUrl: callbackUrl.href,
        afterSignInUrl: callbackUrl.href,
        afterSignUpUrl: callbackUrl.href
      });
      if (clerk.isSignedIn && clerk.session) trackNinaAuthCompleted();
      return clerk;
    }
    return clerk;
  })().catch(error => {
    logDevelopmentError("Clerk authentication unavailable.", error);
    ninaAuthInitialization = null;
    if (ninaSignIn) {
      ninaSignIn.hidden = false;
      ninaSignIn.disabled = false;
    }
    if (ninaSignInEmail) {
      ninaSignInEmail.hidden = false;
      ninaSignInEmail.disabled = false;
    }
    if (ninaAccountShell) ninaAccountShell.hidden = false;
    if (ninaAccountLoggedOut) ninaAccountLoggedOut.hidden = false;
    if (ninaAccountLoggedIn) ninaAccountLoggedIn.hidden = true;
    return null;
  });
  return ninaAuthInitialization;
}

async function authenticationHeaders() {
  const clerk = await initializeNinaAuth();
  const token = await clerk?.session?.getToken?.();
  if (token) return { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
  return clerk ? { "Content-Type": "application/json" } : legacyOwnerMemoryHeaders();
}

function initializeSignalCreditPurchaseUI() {
  if (!ninaAccountPanel || !ninaAccountSignOut || ninaCreditsPurchaseModal) return;
  ninaCreditsPurchaseTrigger = document.createElement("button");
  ninaCreditsPurchaseTrigger.className = "nina-account-add-credits";
  ninaCreditsPurchaseTrigger.type = "button";
  ninaCreditsPurchaseTrigger.textContent = "Add Signal Credits";
  ninaCreditsPurchaseTrigger.hidden = true;
  ninaAccountBuyCredits.insertAdjacentElement("afterend", ninaCreditsPurchaseTrigger);

  const modal = document.createElement("div");
  modal.className = "nina-credits-purchase";
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <section class="nina-credits-purchase-panel" role="dialog" aria-modal="true" aria-labelledby="ninaCreditsPurchaseTitle" aria-describedby="ninaCreditsPurchaseLead">
      <button class="nina-credits-purchase-close" type="button" aria-label="Close Signal Credits panel">×</button>
      <p class="nina-credits-purchase-code">Parallel Vision / Account Signal</p>
      <h2 class="nina-credits-purchase-title" id="ninaCreditsPurchaseTitle">Signal Credits</h2>
      <p class="nina-credits-purchase-lead" id="ninaCreditsPurchaseLead" style="font-size:1.06em">Access Nina's live transmissions.</p>
      <div class="nina-credits-pack-list">
        <button class="nina-credits-pack" type="button" data-pack-id="signal_60"><span class="nina-credits-pack-copy"><span class="nina-credits-pack-time">6 MIN</span><span class="nina-credits-pack-title">60 Signal Credits</span><span class="nina-credits-pack-description">A short live signal with Nina.</span></span><strong>€3.50</strong></button>
        <button class="nina-credits-pack" type="button" data-pack-id="signal_150"><span class="nina-credits-pack-copy"><span class="nina-credits-pack-time">15 MIN</span><span class="nina-credits-pack-title">150 Signal Credits</span><span class="nina-credits-pack-description">More time to stay in the conversation.</span></span><strong>€9</strong></button>
        <button class="nina-credits-pack" type="button" data-pack-id="signal_300"><span class="nina-credits-pack-copy"><span class="nina-credits-pack-time">30 MIN</span><span class="nina-credits-pack-title">300 Signal Credits</span><span class="nina-credits-pack-description">For a longer uninterrupted signal.</span></span><strong>€17</strong></button>
        <button class="nina-credits-pack" type="button" data-pack-id="signal_600"><span class="nina-credits-pack-copy"><span class="nina-credits-pack-time">60 MIN</span><span class="nina-credits-pack-title">600 Signal Credits</span><span class="nina-credits-pack-description">For returning conversations.</span></span><strong>€30</strong></button>
      </div>
      <details class="nina-credits-about">
        <summary><span class="nina-credits-about-closed">About Signal Credits +</span><span class="nina-credits-about-open">About Signal Credits −</span></summary>
        <div class="nina-credits-about-copy" style="font-size:1.06em">
          <p>Signal Credits keep Live Nina running.</p>
          <p>Every new verified account begins with 3 minutes free.</p>
          <p>After that, you can add more live time whenever you want to open the signal again.</p>
          <p>Live Nina uses real-time voice, language and visual systems while the connection is active.</p>
          <p>Available packs start at 6 minutes for €3.50.</p>
          <p>When the signal ends, your history with Nina remains.</p>
        </div>
      </details>
      <p class="nina-credits-purchase-status" role="status" aria-live="polite"></p>
    </section>`;
  document.body.appendChild(modal);
  ninaCreditsPurchaseModal = modal;
  ninaCreditsPurchaseTitle = modal.querySelector(".nina-credits-purchase-title");
  ninaCreditsPurchaseLead = modal.querySelector(".nina-credits-purchase-lead");
  ninaCreditsPurchaseStatus = modal.querySelector(".nina-credits-purchase-status");
  ninaCreditsPackList = modal.querySelector(".nina-credits-pack-list");
  ninaCreditsPackButtons = Array.from(modal.querySelectorAll(".nina-credits-pack"));
  ninaCreditsPurchaseClose = modal.querySelector(".nina-credits-purchase-close");

  ninaCreditsPurchaseTrigger.addEventListener("click", openSignalCreditPurchase);
  ninaAccountBuyCredits.addEventListener("click", event => {
    if (Number.isSafeInteger(ninaCreditsBalance) && ninaCreditsBalance > 0) {
      closeNinaAccountPanel();
      void routeNinaTrigger(event.currentTarget);
    } else openSignalCreditPurchase();
  });
  syncAccountLanguage();
  ninaCreditsPurchaseClose.addEventListener("click", () => closeSignalCreditPurchase(true));
  modal.addEventListener("click", event => {
    if (event.target === modal) closeSignalCreditPurchase(true);
  });
  ninaCreditsPackButtons.forEach(button => button.addEventListener("click", () => startSignalCreditCheckout(button.dataset.packId)));
}

function setSignalCreditPurchaseView({ title, lead, status = "", packsVisible = true }) {
  if (!ninaCreditsPurchaseModal) return;
  ninaCreditsPurchaseTitle.textContent = title;
  ninaCreditsPurchaseLead.textContent = lead;
  ninaCreditsPurchaseStatus.textContent = status;
  ninaCreditsPackList.hidden = !packsVisible;
}

function openSignalCreditPurchase(view = null) {
  if (!ninaCreditsPurchaseModal) return;
  closeNinaAccountPanel();
  setSignalCreditPurchaseView(view || {
    title: "Signal Credits",
    lead: "Access Nina's live transmissions.",
    status: "",
    packsVisible: true
  });
  ninaCreditsPurchaseModal.hidden = false;
  ninaCreditsPurchaseModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("nina-credits-purchase-active");
  setTimeout(() => (view?.packsVisible === false ? ninaCreditsPurchaseClose : ninaCreditsPackButtons[0])?.focus({ preventScroll: true }), 0);
}

function closeSignalCreditPurchase(returnFocus = false) {
  if (!ninaCreditsPurchaseModal || ninaCreditsPurchasePending) return;
  ninaCreditsPurchaseModal.hidden = true;
  ninaCreditsPurchaseModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("nina-credits-purchase-active");
  if (returnFocus && ninaAccountShell && !ninaAccountShell.hidden) ninaAccountToggle?.focus({ preventScroll: true });
}

function setCheckoutPending(pending) {
  ninaCreditsPurchasePending = pending;
  ninaCreditsPackButtons.forEach(button => { button.disabled = pending; });
  if (ninaCreditsPurchaseClose) ninaCreditsPurchaseClose.disabled = pending;
}

function resetCheckoutAfterHistoryRestore(event) {
  const navigation = performance.getEntriesByType?.("navigation")?.[0];
  if (!event.persisted && navigation?.type !== "back_forward") return;
  setCheckoutPending(false);
  if (ninaCreditsPurchaseStatus?.textContent === "Preparing checkout...") {
    ninaCreditsPurchaseStatus.textContent = "";
  }
}

function rememberSignalCreditCheckout() {
  try {
    sessionStorage.setItem(NINA_CREDIT_CHECKOUT_STATE_KEY, JSON.stringify({
      balance: Number.isSafeInteger(ninaCreditsBalance) ? ninaCreditsBalance : null,
      startedAt: new Date().toISOString()
    }));
  } catch { /* Return polling still works without a stored baseline. */ }
}

function readSignalCreditCheckoutState() {
  try {
    const state = JSON.parse(sessionStorage.getItem(NINA_CREDIT_CHECKOUT_STATE_KEY) || "null");
    return state && typeof state === "object" ? state : {};
  } catch { return {}; }
}

function clearSignalCreditCheckoutState() {
  try { sessionStorage.removeItem(NINA_CREDIT_CHECKOUT_STATE_KEY); } catch { /* No persistent state to clear. */ }
}

async function startSignalCreditCheckout(packId) {
  if (ninaCreditsPurchasePending || !SIGNAL_CREDIT_PACK_IDS.has(packId)) return;
  setCheckoutPending(true);
  ninaCreditsPurchaseStatus.textContent = "Preparing checkout...";
  const checkoutEndpoint = `${ANAM_SESSION_TOKEN_ENDPOINT.replace(/\/session-token$/, "")}/api/nina/credits/checkout`;
  const endpointUrl = new URL(checkoutEndpoint);
  try {
    const clerk = await initializeNinaAuth();
    const token = await clerk?.session?.getToken?.();
    if (!clerk?.isSignedIn || !token) {
      console.warn("Signal Credit checkout has no authenticated session.", {
        status: 0,
        code: "auth_unavailable",
        message: "Clerk session token unavailable",
        endpointOrigin: endpointUrl.origin,
        endpointPath: endpointUrl.pathname
      });
      throw new Error("Account authentication unavailable");
    }
    const response = await fetch(checkoutEndpoint, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ packId })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const safeCode = typeof data?.code === "string" ? data.code.slice(0, 80) : "request_failed";
      const safeMessage = typeof data?.error === "string" ? data.error.slice(0, 160) : "Checkout request failed";
      console.warn("Signal Credit checkout rejected.", {
        status: response.status,
        code: safeCode,
        message: safeMessage,
        endpointOrigin: endpointUrl.origin,
        endpointPath: endpointUrl.pathname
      });
      throw new Error("Checkout request rejected");
    }
    let checkoutUrl = null;
    try { checkoutUrl = new URL(data?.url || ""); } catch { /* Invalid responses are handled below. */ }
    if (!checkoutUrl || checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== "checkout.stripe.com") {
      console.warn("Signal Credit checkout returned an invalid destination.", {
        status: response.status,
        code: "invalid_checkout_response",
        message: "Checkout URL missing or invalid",
        endpointOrigin: endpointUrl.origin,
        endpointPath: endpointUrl.pathname
      });
      throw new Error("Invalid checkout URL");
    }
    rememberSignalCreditCheckout();
    window.location.assign(checkoutUrl.href);
  } catch (error) {
    if (error instanceof TypeError) console.warn("Signal Credit checkout could not reach the endpoint.", {
      status: 0,
      code: "network_error",
      message: "Checkout endpoint unavailable",
      endpointOrigin: endpointUrl.origin,
      endpointPath: endpointUrl.pathname
    });
    logDevelopmentError("Signal Credit checkout unavailable.", error);
    ninaCreditsPurchaseStatus.textContent = "Checkout unavailable. Please try again.";
    setCheckoutPending(false);
  }
}

async function recentStripeCredit(token, startedAt) {
  if (!token || !Number.isFinite(startedAt)) return false;
  try {
    const response = await fetch(`${ANAM_SESSION_TOKEN_ENDPOINT.replace(/\/session-token$/, "")}/api/nina/credits/history?limit=10`, {
      headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
      cache: "no-store"
    });
    if (!response.ok) return false;
    const data = await response.json();
    return Array.isArray(data?.transactions) && data.transactions.some(transaction =>
      transaction?.type === "credit" && transaction?.source === "stripe_checkout" &&
      Date.parse(transaction.createdAt) >= startedAt - 120000
    );
  } catch { return false; }
}

function cleanSignalCreditReturnUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("ninaCredits");
  history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

async function handleSignalCreditReturn() {
  const returnState = new URLSearchParams(window.location.search).get("ninaCredits");
  if (returnState !== "success" && returnState !== "cancel") return;
  cleanSignalCreditReturnUrl();
  initializeSignalCreditPurchaseUI();
  if (returnState === "cancel") {
    clearSignalCreditCheckoutState();
    openSignalCreditPurchase({
      title: "Transmission Cancelled",
      lead: "No changes were made to your Signal Credits.",
      status: "",
      packsVisible: false
    });
    return;
  }

  openSignalCreditPurchase({
    title: "Payment Received",
    lead: "Synchronizing signal credits...",
    status: "",
    packsVisible: false
  });
  const checkoutState = readSignalCreditCheckoutState();
  const baseline = Number.isSafeInteger(checkoutState.balance) ? checkoutState.balance : null;
  const startedAt = Date.parse(checkoutState.startedAt || "");
  const clerk = await initializeNinaAuth();
  const token = await clerk?.session?.getToken?.();
  let confirmed = false;
  for (const wait of [0, 1000, 1800, 2800]) {
    if (wait) await delay(wait);
    const balance = await loadSignalCreditBalance(clerk, true);
    confirmed = (baseline !== null && Number.isSafeInteger(balance) && balance > baseline) || await recentStripeCredit(token, startedAt);
    if (confirmed) break;
  }
  clearSignalCreditCheckoutState();
  if (confirmed) {
    setSignalCreditPurchaseView({
      title: "Signal Credits Added",
      lead: Number.isSafeInteger(ninaCreditsBalance) ? `${ninaCreditsBalance.toLocaleString()} credits available.` : "Your balance has been updated.",
      status: "",
      packsVisible: false
    });
  } else {
    setSignalCreditPurchaseView({
      title: "Payment Received",
      lead: "Payment received. Credits are still synchronizing.",
      status: "",
      packsVisible: false
    });
  }
}

function clerkAccountDisplayName() {
  const name = ninaClerk?.user?.fullName || ninaClerk?.user?.firstName || "";
  return typeof name === "string" ? name.trim().slice(0, 80) : "";
}

async function canUseServerMemory() {
  const headers = await authenticationHeaders();
  return Boolean(headers.Authorization);
}

function queueOwnerMemoryRequest(path, body, method = "POST") {
  ninaMemorySyncPromise = ninaMemorySyncPromise.catch(() => null).then(async () => {
    const headers = await authenticationHeaders();
    if (!headers.Authorization) return null;
    const response = await fetch(`${ANAM_SESSION_TOKEN_ENDPOINT.replace(/\/session-token$/, "")}${path}`, {
      method,
      headers,
      body: JSON.stringify({ visitorId: ninaVisitorId, ...body }),
      keepalive: true
    });
    if (!response.ok) throw new Error("Owner memory request failed");
    return response.json();
  });
  return ninaMemorySyncPromise;
}

function isStoredMemoryMessage(message) {
  return message &&
    (message.role === "user" || message.role === "persona") &&
    typeof message.content === "string" &&
    Boolean(message.content.trim());
}

function readNinaMemory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ninaMemoryKey) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredMemoryMessage).slice(-NINA_MEMORY_LIMIT);
  } catch {
    return [];
  }
}

function writeNinaMemory(messages) {
  try {
    localStorage.setItem(ninaMemoryKey, JSON.stringify(messages.slice(-NINA_MEMORY_LIMIT)));
    return true;
  } catch {
    return false;
  }
}

function migrateLegacyNinaMemory() {
  try {
    if (localStorage.getItem(ninaMemoryKey)) return;
    const legacy = JSON.parse(localStorage.getItem(NINA_LEGACY_MEMORY_KEY) || "[]");
    if (!Array.isArray(legacy)) return;
    const migrated = legacy.map(message => ({
      ...message,
      role: message?.role === "ALEJANDRO" ? "user" : message?.role === "NINA" ? "persona" : message?.role,
      content: typeof message?.content === "string" ? message.content.trim() : ""
    })).filter(isStoredMemoryMessage).slice(-NINA_MEMORY_LIMIT);
    if (migrated.length) writeNinaMemory(migrated);
    localStorage.removeItem(NINA_LEGACY_MEMORY_KEY);
  } catch { /* Ignore malformed legacy memory. */ }
}

function setNinaMemoryIndicator(state) {
  const labels = {
    empty: "MEMORY / EMPTY",
    standby: "MEMORY / STANDBY",
    loaded: "MEMORY / LOADED",
    cleared: "MEMORY / CLEARED",
    unavailable: "MEMORY / UNAVAILABLE"
  };
  ninaMemoryIndicator.textContent = labels[state] || labels.standby;
  ninaMemoryIndicator.classList.toggle("is-loaded", state === "loaded");
}

function resetNinaMemoryIndicator() {
  ninaMemoryLoadedForSession = false;
  setNinaMemoryIndicator(readNinaMemory().length ? "standby" : "empty");
}

function memoryMessageKey(message, sessionId) {
  const id = typeof message.id === "string" ? message.id.trim() : "";
  if (id) return `${sessionId}::${id}`;
  return `${sessionId}::${message.role}::${message.content.trim()}`;
}

function storeCompletedNinaMessages(history, client, attempt) {
  if (attempt !== ninaAttempt || client !== ninaClient || !Array.isArray(history)) return [];
  const sessionId = client.getActiveSessionId?.();
  if (!sessionId) return [];
  const archive = readNinaMemory();
  const knownKeys = new Set(archive.map(message => message.messageId
    ? `${message.sessionId}::${message.messageId}`
    : `${message.sessionId}::${message.role}::${message.content}`));
  let changed = false;
  const completedMessages = [];
  history.forEach(message => {
    const content = typeof message?.content === "string" ? message.content.trim() : "";
    const role = message?.role === "user" || message?.role === "persona" ? message.role : "";
    if (!role || !content || message?.interrupted) return;
    const key = memoryMessageKey({ ...message, content }, sessionId);
    if (knownKeys.has(key) || ninaSessionMessageKeys.has(key)) return;
    knownKeys.add(key);
    ninaSessionMessageKeys.add(key);
    const completedMessage = {
      role,
      content,
      timestamp: new Date().toISOString(),
      sessionId,
      ...(typeof message.id === "string" && message.id.trim() ? { messageId: message.id.trim() } : {})
    };
    archive.push(completedMessage);
    completedMessages.push(completedMessage);
    changed = true;
  });
  if (changed && !writeNinaMemory(archive)) setNinaMemoryIndicator("unavailable");
  if (completedMessages.length && ninaServerConversationId) {
    void queueOwnerMemoryRequest("/memory/messages", {
      conversationId: ninaServerConversationId,
      messages: completedMessages
    }).catch(() => setNinaMemoryIndicator("unavailable"));
  }
  return completedMessages;
}

async function forgetNinaMemory() {
  if (!window.confirm("Forget Nina's complete conversation memory on this browser and, for the owner profile, on the server?")) return;
  try {
    if (await canUseServerMemory()) await queueOwnerMemoryRequest("/memory", {}, "DELETE");
    localStorage.removeItem(ninaMemoryKey);
    ninaMemoryLoadedForSession = false;
    setNinaMemoryIndicator("cleared");
  } catch {
    setNinaMemoryIndicator("unavailable");
  }
}

const readPreferredMicrophone = () => {
  try { return localStorage.getItem(NINA_PREFERRED_MICROPHONE_KEY) || ""; }
  catch { return ""; }
};
const savePreferredMicrophone = deviceId => {
  try {
    if (deviceId) localStorage.setItem(NINA_PREFERRED_MICROPHONE_KEY, deviceId);
    else localStorage.removeItem(NINA_PREFERRED_MICROPHONE_KEY);
  } catch { /* Selection still works for this visit when storage is unavailable. */ }
};

async function hashNinaAccessCode(code) {
  const encodedCode = new TextEncoder().encode(code);
  const digest = await crypto.subtle.digest("SHA-256", encodedCode);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function setNinaScrim(title, subtitle = "", message = "", buttonText = "") {
  ninaScrimTitle.textContent = title;
  ninaScrimSubtitle.textContent = subtitle;
  ninaScrimMessage.textContent = message;
  ninaScrimButton.textContent = buttonText;
  ninaScrimButton.tabIndex = buttonText ? 0 : -1;
  if (ninaPostSignalActions) ninaPostSignalActions.hidden = true;
  if (ninaPostSignalReturn) ninaPostSignalReturn.tabIndex = -1;
  document.body.classList.remove("nina-post-signal-visible");
  document.body.classList.toggle("nina-scrim-action", Boolean(buttonText));
}

function showNinaReady(balance = ninaCreditsBalance, statusOverride = "") {
  document.body.classList.remove("nina-connecting-mode", "nina-call-visible", "nina-conversation-live", "nina-scrim-visible", "nina-scrim-action");
  const creditStatus = statusOverride || (Number.isSafeInteger(balance)
    ? `${balance.toLocaleString()} CREDITS · ${formatLiveTime(balance * 6).toUpperCase()}`
    : "SIGNAL CREDIT BALANCE UNAVAILABLE");
  if (ninaEligibilityStatus) ninaEligibilityStatus.textContent = creditStatus;
  setNinaScrim("NINA IS READY", creditStatus, "Enter when you're ready.", "OPEN SIGNAL");
  ninaStatus.textContent = "NINA IS READY";
  startNina.disabled = false;
  startNina.textContent = "OPEN SIGNAL";
  ninaPrimaryAction = "connect";
  if (ninaReferralEntry) ninaReferralEntry.hidden = !ninaClerk?.isSignedIn;
  if (ninaMicrophone) ninaMicrophone.hidden = false;
  void setupNinaMicrophones();
  ninaScrimAction = "connect";
  resetNinaMemoryIndicator();
}

function showNinaEligibilityLoading() {
  document.body.classList.remove("nina-connecting-mode", "nina-call-visible", "nina-conversation-live");
  document.body.classList.add("nina-scrim-visible");
  setNinaScrim("NINA IS READY", "CHECKING SIGNAL CREDITS", "", "");
  if (ninaEligibilityStatus) ninaEligibilityStatus.textContent = "CHECKING SIGNAL CREDITS";
  ninaStatus.textContent = "CHECKING SIGNAL CREDITS";
  startNina.disabled = true;
  ninaPrimaryAction = "connect";
  if (ninaReferralEntry) ninaReferralEntry.hidden = true;
  if (ninaMicrophone) ninaMicrophone.hidden = true;
  collapseNinaMicrophonePicker();
}

function showNinaSignInRequired() {
  document.body.classList.remove("nina-connecting-mode", "nina-conversation-live");
  document.body.classList.add("nina-scrim-visible", "nina-scrim-action");
  setNinaScrim("SIGN IN TO OPEN THE SIGNAL", "", "Memory and Signal Credits are connected to your account.", "SIGN IN");
  if (ninaEligibilityStatus) ninaEligibilityStatus.textContent = "SIGN IN TO OPEN THE SIGNAL";
  ninaStatus.textContent = "SIGN IN REQUIRED";
  ninaScrimAction = "signin";
}

async function refreshNinaEligibility() {
  const clerk = await initializeNinaAuth();
  if (!clerk?.isSignedIn || !clerk?.session) {
    if (ninaPrivateAccessVerified) {
      showNinaReady(null, "PRIVATE ACCESS VERIFIED");
      return null;
    }
    showNinaSignInRequired();
    return null;
  }
  const balance = await loadSignalCreditBalance(clerk, true);
  if (ninaOwnerBypass) showNinaReady(null, "OWNER SIGNAL · UNMETERED");
  else if (balance === 0) showNoSignalCredits();
  else if (Number.isSafeInteger(balance) && balance > 0) showNinaReady(balance);
  else showNinaFailure("Unable to confirm your Signal Credit balance. Try again.");
  return balance;
}

function stopNinaMicrophone() {
  ninaMicrophoneStream?.getTracks().forEach(track => track.stop());
  ninaMicrophoneStream = null;
}

function microphoneConstraints(deviceId = "") {
  return {
    audio: deviceId ? { deviceId: { exact: deviceId } } : true,
    video: false
  };
}

async function listMicrophones() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter(device => device.kind === "audioinput");
}

function renderMicrophones(microphones, preferredId = "") {
  ninaMicrophoneSelect.replaceChildren();
  microphones.forEach((microphone, index) => {
    const option = document.createElement("option");
    option.value = microphone.deviceId;
    option.textContent = microphone.label || `Microphone ${index + 1}`;
    ninaMicrophoneSelect.appendChild(option);
  });
  const savedExists = microphones.some(microphone => microphone.deviceId === preferredId);
  if (savedExists) ninaMicrophoneSelect.value = preferredId;
  else {
    savePreferredMicrophone("");
    ninaMicrophoneSelect.selectedIndex = 0;
  }
  updateNinaMicrophoneName();
  return savedExists ? preferredId : (ninaMicrophoneSelect.value || "");
}

function updateNinaMicrophoneName() {
  if (!ninaMicrophoneName) return;
  ninaMicrophoneName.textContent = ninaMicrophoneSelect.selectedOptions[0]?.textContent?.trim() || "SYSTEM DEFAULT";
}

function collapseNinaMicrophonePicker() {
  if (!ninaMicrophonePicker || !ninaMicrophoneToggle) return;
  ninaMicrophonePicker.hidden = true;
  ninaMicrophoneToggle.setAttribute("aria-expanded", "false");
}

async function acquireNinaMicrophone(deviceId = "") {
  const stream = await navigator.mediaDevices.getUserMedia(microphoneConstraints(deviceId));
  stopNinaMicrophone();
  ninaMicrophoneStream = stream;
  return stream;
}

async function setupNinaMicrophones() {
  if (ninaMicrophoneSetupPromise) return ninaMicrophoneSetupPromise;
  ninaMicrophoneSetupPromise = (async () => {
    ninaMicrophoneSelect.disabled = true;
    ninaMicrophoneStatus.textContent = "";
    startNina.disabled = true;
    try {
      if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.enumerateDevices) {
        ninaMicrophoneSelect.replaceChildren(new Option("System default microphone", ""));
        updateNinaMicrophoneName();
        ninaMicrophoneStatus.textContent = "DEFAULT MICROPHONE";
        startNina.disabled = false;
        return;
      }
      const savedId = readPreferredMicrophone();
      try {
        await acquireNinaMicrophone(savedId);
      } catch (error) {
        if (!savedId) throw error;
        savePreferredMicrophone("");
        await acquireNinaMicrophone();
        ninaMicrophoneStatus.textContent = "SELECTED MICROPHONE UNAVAILABLE";
      }
      const microphones = await listMicrophones();
      if (!microphones.length) {
        stopNinaMicrophone();
        ninaMicrophoneSelect.replaceChildren(new Option("No microphone detected", ""));
        updateNinaMicrophoneName();
        ninaMicrophoneStatus.textContent = "NO MICROPHONE DETECTED";
        startNina.disabled = true;
        return;
      }
      renderMicrophones(microphones, savedId);
      startNina.disabled = false;
    } catch (error) {
      stopNinaMicrophone();
      logDevelopmentError("Microphone setup failed.", error);
      ninaMicrophoneSelect.replaceChildren(new Option("Microphone access required", ""));
      updateNinaMicrophoneName();
      ninaMicrophoneStatus.textContent = error?.name === "NotFoundError"
        ? "NO MICROPHONE DETECTED"
        : "MICROPHONE ACCESS REQUIRED";
      startNina.disabled = false;
    } finally {
      ninaMicrophoneSelect.disabled = false;
      ninaMicrophoneSetupPromise = null;
    }
  })();
  return ninaMicrophoneSetupPromise;
}

async function refreshNinaMicrophones() {
  if (!ninaOverlay.classList.contains("is-open") || !navigator.mediaDevices?.enumerateDevices) return;
  try {
    const selectedId = ninaMicrophoneSelect.value || readPreferredMicrophone();
    const microphones = await listMicrophones();
    if (!microphones.length) {
      stopNinaMicrophone();
      ninaMicrophoneSelect.replaceChildren(new Option("No microphone detected", ""));
      updateNinaMicrophoneName();
      ninaMicrophoneStatus.textContent = "NO MICROPHONE DETECTED";
      startNina.disabled = true;
      return;
    }
    const selectedStillExists = !selectedId || microphones.some(device => device.deviceId === selectedId);
    renderMicrophones(microphones, selectedId);
    if (!selectedStillExists) {
      savePreferredMicrophone("");
      ninaMicrophoneStatus.textContent = "SELECTED MICROPHONE UNAVAILABLE";
      if (ninaClient) {
        await stopNinaSession();
        showNinaFailure("The microphone disconnected. Try again to use the system default.");
        return;
      }
      await acquireNinaMicrophone();
    }
    startNina.disabled = false;
  } catch (error) {
    logDevelopmentError("Unable to refresh microphones.", error);
  }
}

function showNinaConnecting() {
  document.body.classList.add("nina-connecting-mode");
  document.body.classList.remove("nina-call-visible", "nina-scrim-visible", "nina-scrim-action");
  ninaStatus.textContent = "CONNECTING TO NINA";
  startNina.disabled = true;
  startNina.textContent = "CONNECTING TO NINA";
  ninaPrimaryAction = "connect";
}

function showNinaFailure(message = "Please check microphone access and try again.") {
  document.body.classList.remove("nina-connecting-mode", "nina-conversation-live");
  document.body.classList.add("nina-scrim-visible", "nina-scrim-action");
  setNinaScrim("CONNECTION FAILED", "", message, "TRY AGAIN");
  ninaStatus.textContent = "CONNECTION FAILED";
  startNina.disabled = false;
  startNina.textContent = "TRY AGAIN";
  ninaPrimaryAction = "connect";
  ninaScrimAction = "connect";
}

function showNinaCannotHear() {
  document.body.classList.remove("nina-connecting-mode", "nina-conversation-live", "nina-call-visible");
  document.body.classList.add("nina-scrim-visible", "nina-scrim-action");
  setNinaScrim("WE CAN'T HEAR YOU", "", "Check your microphone and try again.", "TRY AGAIN");
  ninaStatus.textContent = "MICROPHONE CHECK";
  startNina.disabled = false;
  startNina.textContent = "TRY AGAIN";
  ninaPrimaryAction = "connect";
  ninaScrimAction = "connect";
}

function showNoSignalCredits() {
  document.body.classList.remove("nina-connecting-mode", "nina-conversation-live");
  document.body.classList.remove("nina-scrim-visible", "nina-scrim-action");
  if (ninaEligibilityStatus) ninaEligibilityStatus.textContent = "0 CREDITS · 0 MIN";
  ninaStatus.textContent = "SIGNAL STANDBY";
  startNina.disabled = false;
  startNina.textContent = "GET SIGNAL CREDITS";
  ninaPrimaryAction = "credits";
  if (ninaReferralEntry) ninaReferralEntry.hidden = !ninaClerk?.isSignedIn;
  if (ninaMicrophone) ninaMicrophone.hidden = true;
  collapseNinaMicrophonePicker();
  ninaScrimAction = "credits";
}

async function openNinaReferralPanel() {
  if (!ninaReferralPanel) return;
  const clerk = ninaClerk || await initializeNinaAuth();
  if (!clerk?.isSignedIn) return;
  ninaReferralCode.textContent = "Loading…";
  ninaReferralCopy.disabled = true;
  ninaReferralStatus.textContent = "";
  ninaReferralPanel.hidden = false;
  ninaReferralClose.focus({ preventScroll: true });
  if (!ninaReferralCodeValue || !ninaReferralLink) await loadAccountDisplayName(clerk);
  ninaReferralCode.textContent = ninaReferralCodeValue || "Unavailable";
  ninaReferralCopy.disabled = !ninaReferralLink;
}

function closeNinaReferralPanel(returnFocus = false) {
  if (!ninaReferralPanel || ninaReferralPanel.hidden) return;
  ninaReferralPanel.hidden = true;
  if (returnFocus) ninaReferralEntry?.focus({ preventScroll: true });
}

async function copyNinaReferralLink() {
  if (!ninaReferralLink) return;
  try {
    await navigator.clipboard.writeText(ninaReferralLink);
    ninaReferralStatus.textContent = "INVITE LINK COPIED";
  } catch {
    ninaReferralStatus.textContent = "COPY UNAVAILABLE";
  }
}

function showSignalEnded() {
  document.body.classList.remove("nina-connecting-mode", "nina-conversation-live", "nina-call-visible");
  document.body.classList.add("nina-scrim-visible", "nina-scrim-action");
  setNinaScrim("THE SIGNAL ENDED", "", "Your history with Nina remains.", "CONTINUE THE SIGNAL");
  if (ninaPostSignalActions) ninaPostSignalActions.hidden = false;
  if (ninaPostSignalReturn) ninaPostSignalReturn.tabIndex = 0;
  document.body.classList.add("nina-post-signal-visible");
  ninaScrim?.setAttribute("aria-hidden", "false");
  ninaStatus.textContent = "SIGNAL ENDED";
  ninaScrimAction = "credits";
  requestAnimationFrame(() => ninaScrimButton.focus({ preventScroll: true }));
}

function markNinaOnline() {
  if (!ninaOverlay.classList.contains("is-open")) return;
  ninaConnecting = false;
  ninaStatus.textContent = "NINA ONLINE";
  document.body.classList.add("nina-call-visible", "nina-conversation-live");
  document.body.classList.remove("nina-connecting-mode", "nina-scrim-visible", "nina-scrim-action");
  ninaScrim?.setAttribute("aria-hidden", "true");
  if (!ninaTalkToNinaTracked && typeof window.fbq === "function") {
    ninaTalkToNinaTracked = true;
    trackNinaFunnelEvent("TalkToNina");
  }
  void startNinaAnalyticsSession();
}

function clearNinaAnalyticsHeartbeat() {
  if (ninaAnalyticsHeartbeatTimer) clearInterval(ninaAnalyticsHeartbeatTimer);
  ninaAnalyticsHeartbeatTimer = null;
}

function ninaAnalyticsRequest(path, body, keepalive = false) {
  return fetch(`${ANAM_SESSION_TOKEN_ENDPOINT.replace(/\/session-token$/, "")}${path}`, {
    method: "POST",
    headers: ninaAnalyticsHeaders || { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorId: ninaVisitorId, ...body }),
    keepalive
  });
}

async function startNinaAnalyticsSession() {
  if (!ninaAnalyticsEntryId || ninaAnalyticsSessionId) return ninaAnalyticsSessionId;
  if (ninaAnalyticsStartPromise) return ninaAnalyticsStartPromise;
  const entryId = ninaAnalyticsEntryId;
  ninaAnalyticsStartPromise = (async () => {
    try {
      ninaAnalyticsHeaders = await authenticationHeaders();
      const response = await ninaAnalyticsRequest("/api/nina/analytics/start", { clientEntryId: entryId });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || entryId !== ninaAnalyticsEntryId || typeof data.sessionId !== "string") return "";
      ninaAnalyticsSessionId = data.sessionId;
      clearNinaAnalyticsHeartbeat();
      ninaAnalyticsHeartbeatTimer = setInterval(() => {
        if (!ninaAnalyticsSessionId || entryId !== ninaAnalyticsEntryId) return;
        void ninaAnalyticsRequest("/api/nina/analytics/heartbeat", {
          sessionId: ninaAnalyticsSessionId, clientEntryId: entryId
        }).catch(error => logDevelopmentError("Nina analytics heartbeat unavailable.", error));
      }, NINA_ANALYTICS_HEARTBEAT_MS);
      return ninaAnalyticsSessionId;
    } catch (error) {
      logDevelopmentError("Nina analytics session unavailable.", error);
      return "";
    }
  })().finally(() => { if (entryId === ninaAnalyticsEntryId) ninaAnalyticsStartPromise = null; });
  return ninaAnalyticsStartPromise;
}

function endNinaAnalyticsSession(reason = "ended") {
  clearNinaAnalyticsHeartbeat();
  const sessionId = ninaAnalyticsSessionId;
  const clientEntryId = ninaAnalyticsEntryId;
  ninaAnalyticsSessionId = "";
  ninaAnalyticsEntryId = "";
  ninaAnalyticsStartPromise = null;
  if (!sessionId || !clientEntryId) return Promise.resolve(null);
  return ninaAnalyticsRequest("/api/nina/analytics/end", { sessionId, clientEntryId, reason }, true)
    .catch(error => logDevelopmentError("Nina analytics end unavailable.", error));
}

function clearNinaUsageTimer() {
  if (ninaUsageTimer) clearTimeout(ninaUsageTimer);
  ninaUsageTimer = null;
}

function clearNinaTrialGraceTimer() {
  if (ninaTrialGraceTimer) clearTimeout(ninaTrialGraceTimer);
  ninaTrialGraceTimer = null;
}

function beginNinaTrialGrace(attempt, client) {
  if (attempt !== ninaAttempt || client !== ninaClient || !ninaTrialActivationPending) return Promise.resolve(false);
  markNinaOnline();
  if (!ninaTrialGraceTimer) {
    ninaTrialGraceTimer = setTimeout(async () => {
      if (attempt !== ninaAttempt || client !== ninaClient || !ninaTrialActivationPending || ninaUsageActive) return;
      ninaTrialActivationPending = false;
      await stopNinaSession();
      if (ninaOverlay.classList.contains("is-open")) showNinaCannotHear();
    }, NINA_SIGNUP_TRIAL_GRACE_MS);
  }
  if (!ninaTrialGraceReadyPromise) {
    ninaTrialGraceReadyPromise = requestNinaUsage("ready").then(result => result.trialActivationPending === true).catch(async error => {
      logDevelopmentError("Unable to start signup-trial grace period.", error);
      if (attempt !== ninaAttempt || client !== ninaClient) return false;
      ninaTrialActivationPending = false;
      await stopNinaSession();
      if (ninaOverlay.classList.contains("is-open")) showNinaFailure("Live time verification is unavailable. Please try again.");
      return false;
    });
  }
  return ninaTrialGraceReadyPromise;
}

function clearNinaUsageWarning() {
  if (ninaUsageWarningTimer) clearTimeout(ninaUsageWarningTimer);
  ninaUsageWarningTimer = null;
  document.body.classList.remove("nina-time-warning-visible");
  ninaTimeWarning?.setAttribute("aria-hidden", "true");
}

function showNinaUsageWarning() {
  if (ninaUsageWarningShown || !ninaUsageActive || !ninaUsageSessionId || !ninaOverlay.classList.contains("is-open")) return;
  ninaUsageWarningShown = true;
  document.body.classList.add("nina-time-warning-visible");
  ninaTimeWarning?.setAttribute("aria-hidden", "false");
}

function scheduleNinaUsageWarning() {
  clearNinaUsageWarning();
  if (ninaUsageWarningShown || !ninaUsageActive || !ninaUsageSessionId || !Number.isSafeInteger(ninaUsageRemainingSeconds)) return;
  if (ninaUsageRemainingSeconds <= 30) {
    if (ninaUsageRemainingSeconds > 0) showNinaUsageWarning();
    return;
  }
  ninaUsageWarningTimer = setTimeout(showNinaUsageWarning, (ninaUsageRemainingSeconds - 30) * 1000);
}

async function requestNinaUsage(action, keepalive = false) {
  if (!ninaUsageSessionId) return { bypass: true, status: action === "end" ? "ended" : "active" };
  const response = await fetch(`${ANAM_SESSION_TOKEN_ENDPOINT.replace(/\/session-token$/, "")}/api/nina/live/${action}`, {
    method: "POST",
    headers: await authenticationHeaders(),
    body: JSON.stringify({ sessionId: ninaUsageSessionId }),
    keepalive
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(typeof data.error === "string" ? data.error : "Live Nina time unavailable");
    error.code = typeof data.code === "string" ? data.code : "usage_unavailable";
    throw error;
  }
  return data;
}

function scheduleNinaUsageSettlement() {
  clearNinaUsageTimer();
  if (!ninaUsageActive || !ninaUsageSessionId) return;
  if (!Number.isSafeInteger(ninaUsageSettlementSeconds) || ninaUsageSettlementSeconds < 1) return;
  scheduleNinaUsageWarning();
  const delaySeconds = Math.max(1, Math.min(ninaUsageSettlementSeconds, Number.isSafeInteger(ninaUsageRemainingSeconds) ? ninaUsageRemainingSeconds : ninaUsageSettlementSeconds));
  ninaUsageTimer = setTimeout(() => void settleNinaUsage(false), delaySeconds * 1000);
}

async function activateNinaUsage(attempt, client) {
  if (attempt !== ninaAttempt || client !== ninaClient) return false;
  if (ninaTrialActivationPending) {
    const gracePending = await beginNinaTrialGrace(attempt, client);
    if (attempt !== ninaAttempt || client !== ninaClient) return false;
    if (!gracePending) ninaTrialActivationPending = false;
  }
  if (!ninaUsageSessionId) {
    markNinaOnline();
    return true;
  }
  if (ninaUsageActive) return true;
  if (!ninaUsageActivationPromise) {
    ninaUsageActivationPromise = requestNinaUsage("activate").then(result => {
      if (attempt !== ninaAttempt || client !== ninaClient) return false;
      ninaUsageActive = true;
      ninaTrialActivationPending = false;
      clearNinaTrialGraceTimer();
      ninaUsageSettlementFailures = 0;
      ninaUsageRemainingSeconds = Number.isSafeInteger(result.remainingSeconds) ? result.remainingSeconds : null;
      ninaUsageSettlementSeconds = Number.isSafeInteger(result.settlementSeconds) ? result.settlementSeconds : ninaUsageSettlementSeconds;
      markNinaOnline();
      scheduleNinaUsageSettlement();
      return true;
    }).finally(() => { ninaUsageActivationPromise = null; });
  }
  return ninaUsageActivationPromise;
}

async function settleNinaUsage(end = false, keepalive = false) {
  if (!ninaUsageSessionId || ninaUsageEnding) return null;
  if (end) ninaUsageEnding = true;
  clearNinaUsageTimer();
  clearNinaTrialGraceTimer();
  try {
    const result = await requestNinaUsage(end ? "end" : "settle", keepalive);
    ninaUsageSettlementFailures = 0;
    if (Number.isSafeInteger(result.balance)) {
      ninaCreditsBalance = result.balance;
      if (ninaSignalCredits) ninaSignalCredits.textContent = `${result.balance.toLocaleString()} credits`;
    }
    if (Number.isSafeInteger(result.remainingSeconds)) {
      ninaUsageRemainingSeconds = result.remainingSeconds;
      if (ninaLiveTime) ninaLiveTime.textContent = formatLiveTime(result.remainingSeconds);
    }
    writeSignalCreditSnapshot(ninaCreditsUserId, ninaCreditsBalance, ninaUsageRemainingSeconds);
    if (Number.isSafeInteger(result.settlementSeconds)) ninaUsageSettlementSeconds = result.settlementSeconds;
    if (result.status === "exhausted") {
      ninaUsageActive = false;
      ninaUsageSessionId = "";
      await stopNinaSession();
      showSignalEnded();
    } else if (!end) scheduleNinaUsageSettlement();
    return result;
  } catch (error) {
    logDevelopmentError("Live Nina settlement unavailable.", error);
    if (!end) {
      ninaUsageSettlementFailures += 1;
      if (ninaUsageSettlementFailures === 1) {
        ninaUsageTimer = setTimeout(() => void settleNinaUsage(false), 3000);
      } else {
        ninaUsageSessionId = "";
        ninaUsageActive = false;
        await stopNinaSession();
        if (ninaOverlay.classList.contains("is-open")) showNinaFailure("Live time verification ended. Reconnect when your account is available.");
      }
    }
    return null;
  } finally {
    if (end) ninaUsageEnding = false;
  }
}

async function stopNinaSession() {
  void endNinaAnalyticsSession("ended");
  ninaAttempt += 1;
  ninaConnecting = false;
  ninaTokenAbortController?.abort();
  ninaTokenAbortController = null;
  ninaMemoryListenerCleanup?.();
  ninaMemoryListenerCleanup = null;
  ninaMemoryLoadedForSession = false;
  ninaSessionMessageKeys = new Set();
  clearNinaUsageTimer();
  clearNinaUsageWarning();
  clearNinaTrialGraceTimer();
  if (ninaUsageSessionId) await settleNinaUsage(true, true);
  ninaUsageSessionId = "";
  ninaUsageActive = false;
  ninaTrialActivationPending = false;
  ninaTrialGraceReadyPromise = null;
  ninaUsageRemainingSeconds = null;
  ninaUsageSettlementSeconds = null;
  ninaUsageActivationPromise = null;
  ninaUsageSettlementFailures = 0;
  const serverConversationId = ninaServerConversationId;
  ninaServerConversationId = "";
  if (serverConversationId) {
    void queueOwnerMemoryRequest("/memory/conversations/end", { conversationId: serverConversationId }).catch(() => {});
  }
  const client = ninaClient;
  ninaClient = null;
  if (client) {
    try { await client.stopStreaming(); }
    catch (error) { logDevelopmentError("Unable to stop Nina cleanly.", error); }
  }
  ninaVideo.pause();
  ninaVideo.srcObject = null;
  stopNinaMicrophone();
}

async function requestSessionToken(signal, history) {
  if (ANAM_SESSION_TOKEN_ENDPOINT.includes("REPLACE-WITH-WORKER")) throw new Error("Anam token endpoint is not configured.");
  const response = await fetch(ANAM_SESSION_TOKEN_ENDPOINT, {
    method: "POST",
    headers: await authenticationHeaders(),
    body: JSON.stringify({
      visitorId: ninaVisitorId,
      accountDisplayName: clerkAccountDisplayName(),
      recentMessages: history
    }),
    signal
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(typeof data.error === "string" ? data.error : `Token endpoint returned ${response.status}.`);
    error.code = typeof data.code === "string" ? data.code : "session_unavailable";
    throw error;
  }
  if (typeof data.sessionToken !== "string" || !data.sessionToken) throw new Error("Token endpoint did not return a session token.");
  return {
    sessionToken: data.sessionToken,
    conversationId: typeof data.conversationId === "string" ? data.conversationId : "",
    usageSessionId: typeof data.usageSessionId === "string" ? data.usageSessionId : "",
    creditBypass: data.creditBypass === true,
    balance: Number.isSafeInteger(data.balance) ? data.balance : null,
    remainingSeconds: Number.isSafeInteger(data.remainingSeconds) ? data.remainingSeconds : null,
    settlementSeconds: Number.isSafeInteger(data.settlementSeconds) ? data.settlementSeconds : null,
    trialActivationPending: data.trialActivationPending === true
  };
}

function bindAnamLifecycle(client, attempt) {
  ninaMemoryListenerCleanup?.();
  const onConnectionEstablished = () => {
    if (attempt !== ninaAttempt || client !== ninaClient) return;
    if (ninaTrialActivationPending) {
      beginNinaTrialGrace(attempt, client);
      return;
    }
    void activateNinaUsage(attempt, client).catch(async error => {
      logDevelopmentError("Unable to activate Live Nina time.", error);
      await stopNinaSession();
      if (ninaOverlay.classList.contains("is-open")) {
        if (error?.code === "insufficient_credits") showNoSignalCredits();
        else showNinaFailure("Live time verification is unavailable. Please try again.");
      }
    });
  };
  const onVideoPlayStarted = () => {
    if (attempt !== ninaAttempt || client !== ninaClient) return;
    if (ninaTrialActivationPending) {
      beginNinaTrialGrace(attempt, client);
      return;
    }
    void activateNinaUsage(attempt, client).catch(() => {});
  };
  const onHistoryUpdated = history => {
    const completedMessages = storeCompletedNinaMessages(history, client, attempt);
    if (!ninaTrialActivationPending || !completedMessages.some(message => message.role === "user")) return;
    void activateNinaUsage(attempt, client).catch(async error => {
      logDevelopmentError("Unable to activate Live Nina time after user speech.", error);
      await stopNinaSession();
      if (ninaOverlay.classList.contains("is-open")) {
        if (error?.code === "trial_grace_expired") showNinaCannotHear();
        else showNinaFailure("Live time verification is unavailable. Please try again.");
      }
    });
  };
  const onClosed = () => {
    if (attempt !== ninaAttempt || client !== ninaClient) return;
    void endNinaAnalyticsSession("disconnected");
    void settleNinaUsage(true, true);
    ninaClient = null;
    ninaConnecting = false;
    if (ninaOverlay.classList.contains("is-open")) showNinaFailure("The connection ended. Try again when you're ready.");
  };
  if (AnamEvent?.CONNECTION_ESTABLISHED) client.addListener(AnamEvent.CONNECTION_ESTABLISHED, onConnectionEstablished);
  if (AnamEvent?.VIDEO_PLAY_STARTED) client.addListener(AnamEvent.VIDEO_PLAY_STARTED, onVideoPlayStarted);
  if (AnamEvent?.CONNECTION_CLOSED) client.addListener(AnamEvent.CONNECTION_CLOSED, onClosed);
  if (AnamEvent?.MESSAGE_HISTORY_UPDATED) client.addListener(AnamEvent.MESSAGE_HISTORY_UPDATED, onHistoryUpdated);
  ninaMemoryListenerCleanup = () => {
    if (AnamEvent?.MESSAGE_HISTORY_UPDATED) client.removeListener(AnamEvent.MESSAGE_HISTORY_UPDATED, onHistoryUpdated);
  };
}

async function connectNina() {
  if (ninaConnecting || ninaClient || !ninaOverlay.classList.contains("is-open")) return;
  ninaConnecting = true; // Guards duplicate eligibility and connection requests.
  const clerk = await initializeNinaAuth();
  const signedIn = Boolean(clerk?.isSignedIn && clerk?.session);
  if (!signedIn && !ninaPrivateAccessVerified) {
    ninaConnecting = false;
    showNinaSignInRequired();
    return;
  }
  if (signedIn) {
    const balance = await loadSignalCreditBalance(clerk, true);
    if (ninaSignalCredits?.dataset.state === "verification-required") {
      ninaConnecting = false;
      showNinaFailure("Confirm your email to open the signal.");
      return;
    }
    if (!ninaOwnerBypass && balance === 0) {
      ninaConnecting = false;
      showNoSignalCredits();
      return;
    }
    if (!ninaOwnerBypass && (!Number.isSafeInteger(balance) || balance < 0)) {
      ninaConnecting = false;
      showNinaFailure("Unable to confirm your Signal Credit balance. Try again.");
      return;
    }
  }
  const attempt = ++ninaAttempt;
  ninaTalkToNinaTracked = false;
  ninaAnalyticsEntryId = crypto.randomUUID();
  ninaAnalyticsSessionId = "";
  ninaAnalyticsHeaders = null;
  showNinaConnecting();
  try {
    if (!ninaMicrophoneStream?.getAudioTracks().some(track => track.readyState === "live")) {
      await acquireNinaMicrophone(ninaMicrophoneSelect.value);
    }
    if (attempt !== ninaAttempt || !ninaOverlay.classList.contains("is-open")) return;
    const restoredHistory = readNinaMemory();
    ninaMemoryLoadedForSession = restoredHistory.length > 0;
    setNinaMemoryIndicator(ninaMemoryLoadedForSession ? "loaded" : "empty");
    ninaTokenAbortController = new AbortController();
    const session = await requestSessionToken(ninaTokenAbortController.signal, restoredHistory);
    ninaTokenAbortController = null;
    if (attempt !== ninaAttempt || !ninaOverlay.classList.contains("is-open")) return;
    ninaServerConversationId = session.conversationId;
    ninaUsageSessionId = session.usageSessionId;
    ninaTrialActivationPending = session.trialActivationPending;
    ninaUsageWarningShown = false;
    ninaUsageRemainingSeconds = session.remainingSeconds;
    ninaUsageSettlementSeconds = session.settlementSeconds;
    const client = createClient(session.sessionToken);
    ninaClient = client;
    bindAnamLifecycle(client, attempt);
    await client.streamToVideoElement("nina-anam-video", ninaMicrophoneStream);
    if (attempt !== ninaAttempt || client !== ninaClient || !ninaOverlay.classList.contains("is-open")) {
      await client.stopStreaming();
      return;
    }
    if (ninaTrialActivationPending) beginNinaTrialGrace(attempt, client);
    else await activateNinaUsage(attempt, client);
  } catch (error) {
    if (attempt !== ninaAttempt || error?.name === "AbortError") return;
    logDevelopmentError("Nina connection failed.", error);
    await stopNinaSession();
    if (ninaOverlay.classList.contains("is-open")) {
      if (error?.code === "insufficient_credits") showNoSignalCredits();
      else if (error?.code === "email_verification_required") showNinaFailure("Confirm your email to open the signal.");
      else if (error?.code === "sign_in_required") {
        showNinaFailure("Sign in to open a paid Live Nina transmission.");
      } else showNinaFailure();
    }
  } finally {
    if (attempt === ninaAttempt) ninaConnecting = false;
  }
}

function closeNinaAccountPanel(returnFocus = false) {
  if (!ninaAccountPanel || !ninaAccountToggle) return;
  ninaAccountPanel.hidden = true;
  ninaAccountToggle.setAttribute("aria-expanded", "false");
  if (returnFocus) ninaAccountToggle.focus({ preventScroll: true });
}

function openNinaCreditsInfo() {
  if (!ninaAccountCreditsInfo) return;
  closeNinaAccountPanel();
  ninaAccountCreditsInfo.hidden = false;
  ninaAccountCreditsInfoClose?.focus({ preventScroll: true });
}

function closeNinaCreditsInfo(returnFocus = false) {
  if (!ninaAccountCreditsInfo || ninaAccountCreditsInfo.hidden) return;
  ninaAccountCreditsInfo.hidden = true;
  if (returnFocus) ninaAccountToggle?.focus({ preventScroll: true });
}

function toggleNinaAccountPanel() {
  if (!ninaAccountPanel || !ninaAccountToggle) return;
  const willOpen = ninaAccountPanel.hidden;
  ninaAccountPanel.hidden = !willOpen;
  ninaAccountToggle.setAttribute("aria-expanded", String(willOpen));
  if (willOpen) {
    if (ninaClerk?.isSignedIn) void loadSignalCreditBalance(ninaClerk, true);
    (ninaClerk?.isSignedIn ? ninaAccountPanel.querySelector(".nina-account-menu a") : ninaAccountSignIn)?.focus?.({ preventScroll: true });
  }
}

function lockNinaAccessScroll() {
  ninaScrollPosition = window.scrollY;
  document.body.style.top = `-${ninaScrollPosition}px`;
  document.body.classList.add("nina-access-active");
}

function unlockNinaAccessScroll() {
  document.body.classList.remove("nina-access-active");
  document.body.style.top = "";
  window.scrollTo(0, ninaScrollPosition);
}

function openNinaExperience() {
  if (!ninaAccessVerifiedForCurrentOpen) ninaScrollPosition = window.scrollY;
  ninaAccessVerifiedForCurrentOpen = true;
  if (ninaAccess.classList.contains("is-open")) closeNinaAccess(true);
  ninaOverlay.classList.add("is-open");
  ninaOverlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  showNinaEligibilityLoading();
  void refreshNinaEligibility();
}

function openNinaAccess() {
  ninaScrollPosition = window.scrollY;
  ninaAccessVerifiedForCurrentOpen = false;
  ninaPrivateAccessVerified = false;
  closeNinaAccountPanel();
  ninaOverlay.classList.remove("is-open");
  ninaOverlay.setAttribute("aria-hidden", "true");
  ninaAccess.classList.add("is-open");
  ninaAccess.setAttribute("aria-hidden", "false");
  trackNinaFunnelEvent("NinaAuthModalOpened");
  ninaAccessError.textContent = "";
  ninaAccessCode.value = "";
  ninaAccessForm.hidden = true;
  ninaAccessForm.setAttribute("aria-hidden", "true");
  ninaPrivateAccessToggle.setAttribute("aria-expanded", "false");
  resetInlineEmailSignIn();
  lockNinaAccessScroll();
  setTimeout(() => ninaSignIn?.focus({ preventScroll: true }), 50);
}

function closeNinaAccess(keepVerification = false) {
  if (!keepVerification) {
    ninaAccessVerifiedForCurrentOpen = false;
    ninaPrivateAccessVerified = false;
  }
  ninaAccess.classList.remove("is-open");
  ninaAccess.setAttribute("aria-hidden", "true");
  ninaAccessError.textContent = "";
  ninaAccessCode.value = "";
  ninaAccessForm.hidden = true;
  ninaAccessForm.setAttribute("aria-hidden", "true");
  ninaPrivateAccessToggle.setAttribute("aria-expanded", "false");
  resetInlineEmailSignIn();
  unlockNinaAccessScroll();
  (lastNinaTrigger || openNina)?.focus({ preventScroll: true });
}

async function verifyNinaAccess(event) {
  event.preventDefault();
  if (ninaAccessSubmitting) return;
  ninaAccessSubmitting = true;
  ninaAccessSubmit.disabled = true;
  ninaAccessCancel.disabled = true;
  ninaAccessSubmit.textContent = "VERIFYING RESONANCE...";
  ninaAccessError.textContent = "";
  try {
    if (await hashNinaAccessCode(ninaAccessCode.value) !== ninaAccessHash) {
      ninaAccessError.textContent = "RESONANCE MISMATCH / ACCESS DENIED";
      ninaAccessCode.select();
      return;
    }
    ninaAccessVerifiedForCurrentOpen = true;
    ninaPrivateAccessVerified = true;
    ninaAccessError.textContent = "IDENTITY VERIFIED";
    await delay(500);
    ninaAccessError.textContent = "OPENING CHANNEL...";
    await delay(650);
    openNinaExperience();
  } catch (error) {
    logDevelopmentError("Nina access verification unavailable.", error);
    ninaAccessError.textContent = "RESONANCE MISMATCH / ACCESS DENIED";
  } finally {
    ninaAccessSubmitting = false;
    ninaAccessSubmit.disabled = false;
    ninaAccessCancel.disabled = false;
    ninaAccessSubmit.textContent = "USE ACCESS CODE";
  }
}

async function closeNinaWindow() {
  await exitNinaFullscreen();
  ninaOverlay.classList.remove("is-open");
  ninaOverlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  window.scrollTo(0, ninaScrollPosition);
  ninaAccessVerifiedForCurrentOpen = false;
  ninaPrivateAccessVerified = false;
  await stopNinaSession();
  document.body.classList.remove("nina-connecting-mode", "nina-call-visible", "nina-conversation-live", "nina-scrim-visible", "nina-scrim-action", "nina-post-signal-visible", "nina-time-warning-visible");
  ninaScrim?.setAttribute("aria-hidden", "true");
  (lastNinaTrigger || openNina)?.focus({ preventScroll: true });
}

async function routeNinaTrigger(trigger) {
  lastNinaTrigger = trigger || openNina;
  const clerk = await initializeNinaAuth();
  if (clerk?.isSignedIn && clerk?.session) openNinaExperience();
  else openNinaAccess();
}

new Set([openNina, openNinaArtist, ...ninaOpenTriggers].filter(Boolean)).forEach(trigger => {
  trigger.addEventListener("click", event => {
    trackNinaFunnelEvent("TalkToNinaClicked");
    void routeNinaTrigger(event.currentTarget);
  });
});

function resetInlineEmailSignIn() {
  if (!ninaEmailSignInForm) return;
  ninaEmailSignInForm.hidden = true;
  ninaEmailSignInForm.setAttribute("aria-hidden", "true");
  if (ninaAccessAuthActions) ninaAccessAuthActions.hidden = false;
  ninaSignInEmail?.setAttribute("aria-expanded", "false");
  ninaEmailSignInError.textContent = "";
  ninaEmailPassword.value = "";
  ninaEmailSignInSubmit.disabled = false;
  ninaEmailSignInSubmit.textContent = "SIGN IN";
}

async function completeNinaClerkSignIn(clerk, attempt) {
  if (attempt?.status !== "complete" || !attempt.createdSessionId) return false;
  await clerk.setActive({ session: attempt.createdSessionId });
  trackNinaAuthCompleted();
  updateNinaAccountControls(clerk);
  if (ninaAccess.classList.contains("is-open")) openNinaExperience();
  else if (ninaOverlay.classList.contains("is-open")) void refreshNinaEligibility();
  return true;
}

async function startNinaGoogleSignIn() {
  const clerk = await initializeNinaAuth();
  if (!clerk) return;
  const callbackUrl = new URL(window.location.href);
  callbackUrl.searchParams.set("nina_clerk_callback", "1");
  storeNinaAuthReturn("signal");
  markNinaAuthStarted("google");
  await clerk.client.signIn.authenticateWithRedirect({
    strategy: "oauth_google",
    redirectUrl: callbackUrl.href,
    redirectUrlComplete: callbackUrl.href
  });
}

function showInlineEmailSignIn(event) {
  event?.preventDefault();
  if (!ninaEmailSignInForm) return;
  ninaSignInEmail?.setAttribute("aria-expanded", "true");
  if (ninaAccessAuthActions) ninaAccessAuthActions.hidden = true;
  ninaEmailSignInForm.removeAttribute("hidden");
  ninaEmailSignInForm.setAttribute("aria-hidden", "false");
  markNinaAuthStarted("email");
  requestAnimationFrame(() => {
    ninaEmailAddress?.focus({ preventScroll: true });
  });
}

function leaveInlineEmailSignIn() {
  resetInlineEmailSignIn();
  requestAnimationFrame(() => ninaSignInEmail?.focus({ preventScroll: true }));
}

async function submitInlineEmailSignIn(event) {
  event.preventDefault();
  const clerk = await initializeNinaAuth();
  if (!clerk) return;
  ninaEmailSignInSubmit.disabled = true;
  ninaEmailSignInSubmit.textContent = "SIGNING IN...";
  ninaEmailSignInError.textContent = "";
  try {
    const attempt = await clerk.client.signIn.create({
      identifier: ninaEmailAddress.value.trim(),
      password: ninaEmailPassword.value
    });
    if (await completeNinaClerkSignIn(clerk, attempt)) return;
    ninaEmailSignInError.textContent = "ADDITIONAL VERIFICATION IS REQUIRED.";
  } catch (error) {
    logDevelopmentError("Clerk email sign-in failed.", error);
    ninaEmailSignInError.textContent = "SIGN-IN DETAILS COULD NOT BE VERIFIED.";
  } finally {
    ninaEmailSignInSubmit.disabled = false;
    ninaEmailSignInSubmit.textContent = "SIGN IN";
  }
}

function togglePrivateNinaAccess() {
  const willOpen = ninaAccessForm.hidden;
  ninaAccessForm.hidden = !willOpen;
  ninaAccessForm.setAttribute("aria-hidden", String(!willOpen));
  ninaPrivateAccessToggle.setAttribute("aria-expanded", String(willOpen));
  if (willOpen) ninaAccessCode.focus({ preventScroll: true });
  else ninaPrivateAccessToggle.focus({ preventScroll: true });
}

ninaAccessForm.addEventListener("submit", verifyNinaAccess);
ninaAccess.addEventListener("click", event => { if (event.target === ninaAccess) closeNinaAccess(); });
ninaAccessPanel?.addEventListener("click", event => event.stopPropagation());
ninaAccessPanel?.addEventListener("pointerdown", event => event.stopPropagation());
ninaAccessCancel.addEventListener("click", () => closeNinaAccess());
ninaPrivateAccessToggle.addEventListener("click", togglePrivateNinaAccess);
closeNina.addEventListener("click", closeNinaWindow);
ninaFullscreen.addEventListener("click", toggleNinaFullscreen);
ninaForgetMemory.addEventListener("click", forgetNinaMemory);
ninaSignIn?.addEventListener("click", () => void startNinaGoogleSignIn());
ninaSignInEmail?.addEventListener("click", showInlineEmailSignIn);
ninaEmailSignInBack?.addEventListener("click", leaveInlineEmailSignIn);
ninaEmailSignInForm?.addEventListener("submit", submitInlineEmailSignIn);
ninaEmailCreateAccount?.addEventListener("click", async () => {
  const clerk = await initializeNinaAuth();
  if (clerk) {
    storeNinaAuthReturn();
    await clerk.openSignUp({ initialValues: { emailAddress: ninaEmailAddress.value.trim() } });
  }
});
ninaEmailForgotPassword?.addEventListener("click", async () => {
  const clerk = await initializeNinaAuth();
  if (clerk) {
    storeNinaAuthReturn();
    await clerk.openSignIn({ initialValues: { emailAddress: ninaEmailAddress.value.trim() } });
  }
});
async function openNinaAccountAuth(mode) {
  const clerk = await initializeNinaAuth();
  if (!clerk) return;
  storeNinaAuthReturn();
  if (mode === "signup") {
    clerk.closeSignIn?.();
    await clerk.openSignUp();
    return;
  }
  clerk.closeSignUp?.();
  await clerk.openSignIn();
}

ninaAccountSignIn?.addEventListener("click", () => void openNinaAccountAuth("signin"));
ninaAccountSignUp?.addEventListener("click", () => void openNinaAccountAuth("signup"));
ninaAccountCreditsInfoTrigger?.addEventListener("click", openNinaCreditsInfo);
ninaAccountCreditsInfoClose?.addEventListener("click", () => closeNinaCreditsInfo(true));
ninaAccountCreditsInfo?.addEventListener("click", event => {
  if (event.target === ninaAccountCreditsInfo) closeNinaCreditsInfo(true);
});
ninaAccountToggle?.addEventListener("click", event => {
  event.stopPropagation();
  toggleNinaAccountPanel();
});
ninaAccountPanel?.addEventListener("click", event => event.stopPropagation());
ninaAccountSignOut?.addEventListener("click", async () => {
  ninaAccountSignOut.disabled = true;
  try {
    const clerk = await initializeNinaAuth();
    await clerk?.signOut();
    updateNinaAccountControls();
  } finally {
    ninaAccountSignOut.disabled = false;
  }
});
document.addEventListener("click", () => closeNinaAccountPanel());
window.addEventListener("scroll", () => {
  if (window.innerWidth <= 560 && ninaAccountPanel && !ninaAccountPanel.hidden) closeNinaAccountPanel();
}, { passive: true });
window.addEventListener("pv-language-change", event => syncAccountLanguage(event.detail?.language));
document.addEventListener("fullscreenchange", syncNinaFullscreen);
document.addEventListener("webkitfullscreenchange", syncNinaFullscreen);
startNina.addEventListener("click", () => {
  if (ninaPrimaryAction === "credits") openSignalCreditPurchase();
  else connectNina();
});
ninaReferralEntry?.addEventListener("click", () => void openNinaReferralPanel());
ninaReferralClose?.addEventListener("click", () => closeNinaReferralPanel(true));
ninaReferralCopy?.addEventListener("click", () => void copyNinaReferralLink());
ninaMicrophoneToggle?.addEventListener("click", () => {
  const willOpen = ninaMicrophonePicker.hidden;
  ninaMicrophonePicker.hidden = !willOpen;
  ninaMicrophoneToggle.setAttribute("aria-expanded", String(willOpen));
  if (willOpen) ninaMicrophoneSelect.focus({ preventScroll: true });
});
ninaReferralPanel?.addEventListener("click", event => {
  if (event.target === ninaReferralPanel) closeNinaReferralPanel(true);
});
ninaScrimButton.addEventListener("click", () => {
  if (ninaScrimAction === "credits") openSignalCreditPurchase();
  else if (ninaScrimAction === "signin") void openNinaAccountSignIn();
  else connectNina();
});
ninaPostSignalReturn?.addEventListener("click", () => void closeNinaWindow());
ninaMicrophoneSelect.addEventListener("change", async () => {
  const selectedId = ninaMicrophoneSelect.value;
  savePreferredMicrophone(selectedId);
  ninaMicrophoneSelect.disabled = true;
  ninaMicrophoneStatus.textContent = "";
  try {
    await acquireNinaMicrophone(selectedId);
  } catch (error) {
    logDevelopmentError("Selected microphone unavailable.", error);
    savePreferredMicrophone("");
    ninaMicrophoneStatus.textContent = "SELECTED MICROPHONE UNAVAILABLE";
    await refreshNinaMicrophones();
  } finally {
    ninaMicrophoneSelect.disabled = false;
    updateNinaMicrophoneName();
    collapseNinaMicrophonePicker();
  }
});
navigator.mediaDevices?.addEventListener?.("devicechange", refreshNinaMicrophones);
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if (ninaReferralPanel && !ninaReferralPanel.hidden) {
    closeNinaReferralPanel(true);
    return;
  }
  if (ninaAccountCreditsInfo && !ninaAccountCreditsInfo.hidden) {
    closeNinaCreditsInfo(true);
    return;
  }
  if (ninaCreditsPurchaseModal && !ninaCreditsPurchaseModal.hidden) {
    closeSignalCreditPurchase(true);
    return;
  }
  if (ninaAccessSubmitting) return;
  if (ninaAccountPanel && !ninaAccountPanel.hidden) {
    closeNinaAccountPanel(true);
    return;
  }
  if (ninaIsFullscreen()) {
    event.preventDefault();
    exitNinaFullscreen();
    return;
  }
  if (ninaAccess.classList.contains("is-open")) closeNinaAccess();
  else if (ninaOverlay.classList.contains("is-open")) closeNinaWindow();
});
window.addEventListener("pagehide", stopNinaSession);
window.addEventListener("beforeunload", stopNinaSession);
window.addEventListener("pageshow", resetCheckoutAfterHistoryRestore);
if (new URLSearchParams(window.location.search).get("nina") === "1") void routeNinaTrigger(openNina);
migrateLegacyNinaMemory();
removeLegacyNinaOwnerToken();
resetNinaMemoryIndicator();
initializeSignalCreditPurchaseUI();
syncAccountLanguage();
void handleSignalCreditReturn();
void initializeNinaAuth().then(clerk => {
  const authReturn = clerk?.isSignedIn ? readNinaAuthReturn() : null;
  if (authReturn?.path) {
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentPath !== authReturn.path) {
      window.location.replace(authReturn.path);
      return;
    }
  }
  if (authReturn) {
    sessionStorage.removeItem(NINA_AUTH_RETURN_KEY);
    if (authReturn.action === "signal") {
      openNinaExperience();
      return;
    }
  }
  if (clerk?.isSignedIn && new URLSearchParams(window.location.search).get("credits") === "1") openSignalCreditPurchase();
});
void ANAM_PERSONA_ID;
