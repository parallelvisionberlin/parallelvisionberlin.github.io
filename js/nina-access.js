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
const ninaAccessForm = byId("ninaAccessForm");
const ninaAccessCode = byId("ninaAccessCode");
const ninaAccessError = byId("ninaAccessError");
const ninaAccessSubmit = byId("ninaAccessSubmit");
const ninaAccessCancel = byId("ninaAccessCancel");
const ninaWindow = document.querySelector(".nina-window");
const ninaFullscreen = byId("ninaFullscreen");
const closeNina = byId("closeNina");
const startNina = byId("startNina");
const ninaVideo = byId("nina-anam-video");
const ninaStatus = byId("ninaStatus");
const ninaScrimTitle = byId("ninaScrimTitle");
const ninaScrimSubtitle = byId("ninaScrimSubtitle");
const ninaScrimMessage = byId("ninaScrimMessage");
const ninaScrimButton = byId("ninaScrimButton");
const ninaMicrophoneSelect = byId("ninaMicrophoneSelect");
const ninaMicrophoneStatus = byId("ninaMicrophoneStatus");
const ninaMemoryIndicator = byId("ninaMemoryIndicator");
const ninaForgetMemory = byId("ninaForgetMemory");
const ninaSignIn = byId("ninaSignIn");
const ninaAccountShell = byId("ninaAccountShell");
const ninaAccountToggle = byId("ninaAccountToggle");
const ninaAccountPanel = byId("ninaAccountPanel");
const ninaAccountName = byId("ninaAccountName");
const ninaAccountSignOut = byId("ninaAccountSignOut");
const ninaAccessHash = "d3ec7a14e4fefc8da57d4045a6ee28d28b328b78126c1e22bc0b541adf0f215c";
const NINA_PREFERRED_MICROPHONE_KEY = "ninaPreferredMicrophoneId";
const NINA_VISITOR_ID_KEY = "nina_fok_visitor_id_v1";
const NINA_USER_PROFILE_KEY = "nina_fok_user_profile_v1";
const NINA_OWNER_CREDENTIAL_KEY = "nina_fok_owner_credential_v2";
const NINA_LEGACY_OWNER_TOKEN_KEY = "nina_fok_owner_token_v1";
const NINA_MEMORY_KEY_PREFIX = "nina_fok_memory_v2:";
const NINA_LEGACY_MEMORY_KEY = "nina_fok_alejandro_memory_v1";
const NINA_MEMORY_LIMIT = 20;
const NINA_VISITOR_ID_PATTERN = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|visitor-[a-z0-9-]+)$/i;
let ninaAccessSubmitting = false;
let ninaAccessVerifiedForCurrentOpen = false;
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
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const logDevelopmentError = (message, error) => { if (DEVELOPMENT) console.error(message, error); };
const nativeFullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
const ninaIsFullscreen = () => nativeFullscreenElement() === ninaWindow || ninaWindow.classList.contains("is-fallback-fullscreen");

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
  if (ninaAccountShell) ninaAccountShell.hidden = !signedIn;
  const userLabel = clerk?.user?.fullName || clerk?.user?.firstName || clerk?.user?.primaryEmailAddress?.emailAddress || "Connected account";
  if (ninaAccountName) ninaAccountName.textContent = userLabel;
  if (!signedIn) closeNinaAccountPanel();
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
    const ClerkUI = await loadNinaClerkUI();
    const clerk = ninaClerk || new Clerk(CLERK_CONFIGURATION.publishableKey);
    await clerk.load({ ui: { ClerkUI } });
    ninaClerk = clerk;
    clerk.addListener?.(() => updateNinaAccountControls(clerk));
    updateNinaAccountControls(clerk);
    return clerk;
  })().catch(error => {
    logDevelopmentError("Clerk authentication unavailable.", error);
    ninaAuthInitialization = null;
    if (ninaSignIn) {
      ninaSignIn.hidden = false;
      ninaSignIn.disabled = false;
    }
    if (ninaAccountShell) ninaAccountShell.hidden = true;
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
  if (attempt !== ninaAttempt || client !== ninaClient || !Array.isArray(history)) return;
  const sessionId = client.getActiveSessionId?.();
  if (!sessionId) return;
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
  document.body.classList.toggle("nina-scrim-action", Boolean(buttonText));
}

function showNinaReady() {
  document.body.classList.remove("nina-connecting-mode", "nina-call-visible", "nina-conversation-live", "nina-scrim-visible", "nina-scrim-action");
  setNinaScrim("NINA IS READY", "", "Enter when you're ready.", "CONNECT");
  ninaStatus.textContent = "NINA IS READY";
  startNina.disabled = false;
  startNina.textContent = "CONNECT";
  resetNinaMemoryIndicator();
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
  return savedExists ? preferredId : (ninaMicrophoneSelect.value || "");
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
}

function showNinaFailure(message = "Please check microphone access and try again.") {
  document.body.classList.remove("nina-connecting-mode", "nina-conversation-live");
  document.body.classList.add("nina-scrim-visible", "nina-scrim-action");
  setNinaScrim("CONNECTION FAILED", "", message, "TRY AGAIN");
  ninaStatus.textContent = "CONNECTION FAILED";
  startNina.disabled = false;
  startNina.textContent = "TRY AGAIN";
}

function markNinaOnline() {
  if (!ninaOverlay.classList.contains("is-open")) return;
  ninaConnecting = false;
  ninaStatus.textContent = "NINA ONLINE";
  document.body.classList.add("nina-call-visible", "nina-conversation-live");
  document.body.classList.remove("nina-connecting-mode", "nina-scrim-visible", "nina-scrim-action");
}

async function stopNinaSession() {
  ninaAttempt += 1;
  ninaConnecting = false;
  ninaTokenAbortController?.abort();
  ninaTokenAbortController = null;
  ninaMemoryListenerCleanup?.();
  ninaMemoryListenerCleanup = null;
  ninaMemoryLoadedForSession = false;
  ninaSessionMessageKeys = new Set();
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
  if (!response.ok) throw new Error(`Token endpoint returned ${response.status}.`);
  const data = await response.json();
  if (typeof data.sessionToken !== "string" || !data.sessionToken) throw new Error("Token endpoint did not return a session token.");
  return { sessionToken: data.sessionToken, conversationId: typeof data.conversationId === "string" ? data.conversationId : "" };
}

function bindAnamLifecycle(client, attempt) {
  ninaMemoryListenerCleanup?.();
  const onConnectionEstablished = () => {
    if (attempt !== ninaAttempt || client !== ninaClient) return;
    markNinaOnline();
  };
  const onVideoPlayStarted = () => {
    if (attempt !== ninaAttempt || client !== ninaClient) return;
    markNinaOnline();
  };
  const onHistoryUpdated = history => storeCompletedNinaMessages(history, client, attempt);
  const onClosed = () => {
    if (attempt !== ninaAttempt || client !== ninaClient) return;
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
  ninaConnecting = true; // Guards rapid duplicate CONNECT clicks.
  const attempt = ++ninaAttempt;
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
    const client = createClient(session.sessionToken);
    ninaClient = client;
    bindAnamLifecycle(client, attempt);
    await client.streamToVideoElement("nina-anam-video", ninaMicrophoneStream);
    if (attempt !== ninaAttempt || client !== ninaClient || !ninaOverlay.classList.contains("is-open")) {
      await client.stopStreaming();
      return;
    }
    markNinaOnline();
  } catch (error) {
    if (attempt !== ninaAttempt || error?.name === "AbortError") return;
    logDevelopmentError("Nina connection failed.", error);
    await stopNinaSession();
    if (ninaOverlay.classList.contains("is-open")) showNinaFailure();
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

function toggleNinaAccountPanel() {
  if (!ninaAccountPanel || !ninaAccountToggle) return;
  const willOpen = ninaAccountPanel.hidden;
  ninaAccountPanel.hidden = !willOpen;
  ninaAccountToggle.setAttribute("aria-expanded", String(willOpen));
  if (willOpen) ninaAccountSignOut?.focus({ preventScroll: true });
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
  showNinaReady();
  setupNinaMicrophones();
}

function openNinaAccess() {
  ninaScrollPosition = window.scrollY;
  ninaAccessVerifiedForCurrentOpen = false;
  closeNinaAccountPanel();
  ninaOverlay.classList.remove("is-open");
  ninaOverlay.setAttribute("aria-hidden", "true");
  ninaAccess.classList.add("is-open");
  ninaAccess.setAttribute("aria-hidden", "false");
  ninaAccessError.textContent = "";
  ninaAccessCode.value = "";
  lockNinaAccessScroll();
  setTimeout(() => ninaAccessCode.focus({ preventScroll: true }), 50);
}

function closeNinaAccess(keepVerification = false) {
  if (!keepVerification) ninaAccessVerifiedForCurrentOpen = false;
  ninaAccess.classList.remove("is-open");
  ninaAccess.setAttribute("aria-hidden", "true");
  ninaAccessError.textContent = "";
  ninaAccessCode.value = "";
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
    ninaAccessSubmit.textContent = "OPEN SIGNAL";
  }
}

async function closeNinaWindow() {
  await exitNinaFullscreen();
  ninaOverlay.classList.remove("is-open");
  ninaOverlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  window.scrollTo(0, ninaScrollPosition);
  ninaAccessVerifiedForCurrentOpen = false;
  await stopNinaSession();
  document.body.classList.remove("nina-connecting-mode", "nina-call-visible", "nina-conversation-live", "nina-scrim-visible", "nina-scrim-action");
  (lastNinaTrigger || openNina)?.focus({ preventScroll: true });
}

async function routeNinaTrigger(trigger) {
  lastNinaTrigger = trigger || openNina;
  const clerk = await initializeNinaAuth();
  if (clerk?.isSignedIn && clerk?.session) openNinaExperience();
  else openNinaAccess();
}

new Set([openNina, openNinaArtist, ...ninaOpenTriggers].filter(Boolean)).forEach(trigger => {
  trigger.addEventListener("click", event => void routeNinaTrigger(event.currentTarget));
});
ninaAccessForm.addEventListener("submit", verifyNinaAccess);
ninaAccess.addEventListener("click", event => event.stopPropagation());
ninaAccess.addEventListener("pointerdown", event => event.stopPropagation());
ninaAccessCancel.addEventListener("click", () => closeNinaAccess());
closeNina.addEventListener("click", closeNinaWindow);
ninaFullscreen.addEventListener("click", toggleNinaFullscreen);
ninaForgetMemory.addEventListener("click", forgetNinaMemory);
ninaSignIn?.addEventListener("click", async () => {
  const clerk = await initializeNinaAuth();
  if (!clerk) return;
  await clerk.openSignIn();
  updateNinaAccountControls(clerk);
  if (clerk.isSignedIn && clerk.session && ninaAccess.classList.contains("is-open")) openNinaExperience();
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
document.addEventListener("fullscreenchange", syncNinaFullscreen);
document.addEventListener("webkitfullscreenchange", syncNinaFullscreen);
startNina.addEventListener("click", connectNina);
ninaScrimButton.addEventListener("click", connectNina);
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
  }
});
navigator.mediaDevices?.addEventListener?.("devicechange", refreshNinaMicrophones);
document.addEventListener("keydown", event => {
  if (event.key !== "Escape" || ninaAccessSubmitting) return;
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
if (new URLSearchParams(window.location.search).get("nina") === "1") void routeNinaTrigger(openNina);
migrateLegacyNinaMemory();
removeLegacyNinaOwnerToken();
resetNinaMemoryIndicator();
void initializeNinaAuth();
void ANAM_PERSONA_ID;
