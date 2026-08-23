/* The access gate is theatrical client-side UI; its public hash is not authorization. */
import { createClient, AnamEvent } from "https://esm.sh/@anam-ai/js-sdk@4.23.1?bundle";

// Paste the deployed Cloudflare Worker endpoint here (the only configuration point).
const ANAM_SESSION_TOKEN_ENDPOINT =
  "https://parallel-vision-anam-token.parallelvision.workers.dev/session-token";
const ANAM_PERSONA_ID = "a5663da5-5f5c-4600-b545-cbb58bd4e155";
const DEVELOPMENT = ["localhost", "127.0.0.1"].includes(window.location.hostname);
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
const ninaAccessHash = "d3ec7a14e4fefc8da57d4045a6ee28d28b328b78126c1e22bc0b541adf0f215c";
const NINA_PREFERRED_MICROPHONE_KEY = "ninaPreferredMicrophoneId";
const NINA_MEMORY_KEY = "nina_fok_alejandro_memory_v1";
const NINA_MEMORY_LIMIT = 500;
const NINA_MEMORY_CONTEXT_CHAR_LIMIT = 12000;
const NINA_MEMORY_CONTEXT_MESSAGE_LIMIT = 40;
const NINA_MEMORY_PROMPT = `You are speaking with Alejandro again.

The following messages come from your previous conversations together. Remember them naturally and continue the relationship with awareness of what was said.

Do not recite this history.
Do not mention saved memory, local storage, transcripts or injected context.
Do not greet Alejandro as a stranger.
Respond to this history only when it becomes relevant.

PREVIOUS CONVERSATION:`;
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
let ninaMemoryInjectionAttempt = 0;
let ninaMemoryLoadedForSession = false;
let ninaMemoryListenerCleanup = null;
let ninaSessionMessageKeys = new Set();
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

function isStoredMemoryMessage(message) {
  return message &&
    (message.role === "ALEJANDRO" || message.role === "NINA") &&
    typeof message.content === "string" &&
    Boolean(message.content.trim()) &&
    typeof message.timestamp === "string" &&
    typeof message.sessionId === "string" &&
    Boolean(message.sessionId);
}

function readNinaMemory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(NINA_MEMORY_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredMemoryMessage).slice(-NINA_MEMORY_LIMIT);
  } catch {
    return [];
  }
}

function writeNinaMemory(messages) {
  try {
    localStorage.setItem(NINA_MEMORY_KEY, JSON.stringify(messages.slice(-NINA_MEMORY_LIMIT)));
    return true;
  } catch {
    return false;
  }
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
    : `${message.sessionId}::${message.role === "ALEJANDRO" ? "user" : "persona"}::${message.content}`));
  let changed = false;
  history.forEach(message => {
    const content = typeof message?.content === "string" ? message.content.trim() : "";
    const role = message?.role === "user" ? "ALEJANDRO" : message?.role === "persona" ? "NINA" : "";
    if (!role || !content || message?.interrupted) return;
    const key = memoryMessageKey({ ...message, content }, sessionId);
    if (knownKeys.has(key) || ninaSessionMessageKeys.has(key)) return;
    knownKeys.add(key);
    ninaSessionMessageKeys.add(key);
    archive.push({
      role,
      content,
      timestamp: new Date().toISOString(),
      sessionId,
      ...(typeof message.id === "string" && message.id.trim() ? { messageId: message.id.trim() } : {})
    });
    changed = true;
  });
  if (changed && !writeNinaMemory(archive)) setNinaMemoryIndicator("unavailable");
}

function selectNinaMemoryContext(archive) {
  const selected = [];
  let characterCount = NINA_MEMORY_PROMPT.length;
  for (let index = archive.length - 1; index >= 0 && selected.length < NINA_MEMORY_CONTEXT_MESSAGE_LIMIT; index -= 1) {
    const message = archive[index];
    const line = `${message.role}: ${message.content}`;
    const addedCharacters = line.length + 2;
    if (characterCount + addedCharacters > NINA_MEMORY_CONTEXT_CHAR_LIMIT) continue;
    selected.push(line);
    characterCount += addedCharacters;
  }
  return selected.reverse();
}

function injectNinaMemory(client, attempt) {
  if (attempt !== ninaAttempt || client !== ninaClient || ninaMemoryInjectionAttempt === attempt) return;
  const selected = selectNinaMemoryContext(readNinaMemory());
  if (!selected.length) {
    ninaMemoryInjectionAttempt = attempt;
    setNinaMemoryIndicator("empty");
    return;
  }
  try {
    client.addContext(`${NINA_MEMORY_PROMPT}\n\n${selected.join("\n")}`);
    ninaMemoryInjectionAttempt = attempt;
    ninaMemoryLoadedForSession = true;
    setNinaMemoryIndicator("loaded");
  } catch (error) {
    logDevelopmentError("Unable to restore Nina memory context.", error);
    setNinaMemoryIndicator("unavailable");
  }
}

function forgetNinaMemory() {
  if (!window.confirm("Forget Nina's complete conversation memory on this browser?")) return;
  try {
    localStorage.removeItem(NINA_MEMORY_KEY);
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
  ninaMemoryInjectionAttempt = 0;
  ninaMemoryLoadedForSession = false;
  ninaSessionMessageKeys = new Set();
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

async function requestSessionToken(signal) {
  if (ANAM_SESSION_TOKEN_ENDPOINT.includes("REPLACE-WITH-WORKER")) throw new Error("Anam token endpoint is not configured.");
  const response = await fetch(ANAM_SESSION_TOKEN_ENDPOINT, { method: "POST", signal });
  if (!response.ok) throw new Error(`Token endpoint returned ${response.status}.`);
  const data = await response.json();
  if (typeof data.sessionToken !== "string" || !data.sessionToken) throw new Error("Token endpoint did not return a session token.");
  return data.sessionToken;
}

function bindAnamLifecycle(client, attempt) {
  ninaMemoryListenerCleanup?.();
  const onConnectionEstablished = () => {
    if (attempt !== ninaAttempt || client !== ninaClient) return;
    injectNinaMemory(client, attempt);
    markNinaOnline();
  };
  const onVideoPlayStarted = () => {
    if (attempt !== ninaAttempt || client !== ninaClient) return;
    injectNinaMemory(client, attempt);
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
    ninaTokenAbortController = new AbortController();
    const sessionToken = await requestSessionToken(ninaTokenAbortController.signal);
    ninaTokenAbortController = null;
    if (attempt !== ninaAttempt || !ninaOverlay.classList.contains("is-open")) return;
    const client = createClient(sessionToken);
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

function openNinaAccess() {
  ninaScrollPosition = window.scrollY;
  ninaAccessVerifiedForCurrentOpen = false;
  ninaOverlay.classList.remove("is-open");
  ninaOverlay.setAttribute("aria-hidden", "true");
  ninaAccess.classList.add("is-open");
  ninaAccess.setAttribute("aria-hidden", "false");
  ninaAccessError.textContent = "";
  ninaAccessCode.value = "";
  document.body.style.overflow = "hidden";
  setTimeout(() => ninaAccessCode.focus({ preventScroll: true }), 50);
}

function closeNinaAccess(keepVerification = false) {
  if (!keepVerification) ninaAccessVerifiedForCurrentOpen = false;
  ninaAccess.classList.remove("is-open");
  ninaAccess.setAttribute("aria-hidden", "true");
  ninaAccessError.textContent = "";
  ninaAccessCode.value = "";
  document.body.style.overflow = "";
  window.scrollTo(0, ninaScrollPosition);
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
    closeNinaAccess(true);
    ninaOverlay.classList.add("is-open");
    ninaOverlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    showNinaReady();
    setupNinaMicrophones();
  } catch (error) {
    logDevelopmentError("Nina access verification unavailable.", error);
    ninaAccessError.textContent = "RESONANCE MISMATCH / ACCESS DENIED";
  } finally {
    ninaAccessSubmitting = false;
    ninaAccessSubmit.disabled = false;
    ninaAccessCancel.disabled = false;
    ninaAccessSubmit.textContent = "OPEN THE SIGNAL";
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

new Set([openNina, openNinaArtist, ...ninaOpenTriggers].filter(Boolean)).forEach(trigger => {
  trigger.addEventListener("click", event => {
    lastNinaTrigger = event.currentTarget;
    openNinaAccess();
  });
});
ninaAccessForm.addEventListener("submit", verifyNinaAccess);
ninaAccess.addEventListener("click", event => event.stopPropagation());
ninaAccess.addEventListener("pointerdown", event => event.stopPropagation());
ninaAccessCancel.addEventListener("click", () => closeNinaAccess());
closeNina.addEventListener("click", closeNinaWindow);
ninaFullscreen.addEventListener("click", toggleNinaFullscreen);
ninaForgetMemory.addEventListener("click", forgetNinaMemory);
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
if (new URLSearchParams(window.location.search).get("nina") === "1") openNinaAccess();
resetNinaMemoryIndicator();
void ANAM_PERSONA_ID;
