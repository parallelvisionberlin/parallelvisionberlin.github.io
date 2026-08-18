/* The access gate is theatrical client-side UI; its public hash is not authorization. */
import { createClient, AnamEvent } from "https://esm.sh/@anam-ai/js-sdk@4.23.1?bundle";

// Paste the deployed Cloudflare Worker endpoint here (the only configuration point).
const ANAM_SESSION_TOKEN_ENDPOINT =
  "https://REPLACE-WITH-WORKER.workers.dev/session-token";
const ANAM_PERSONA_ID = "a5663da5-5f5c-4600-b545-cbb58bd4e155";
const DEVELOPMENT = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const byId = id => document.getElementById(id);
const ninaOverlay = byId("ninaOverlay");
const openNina = byId("openNina");
const openNinaArtist = byId("openNinaArtist");
const ninaAccess = byId("ninaAccess");
const ninaAccessForm = byId("ninaAccessForm");
const ninaAccessCode = byId("ninaAccessCode");
const ninaAccessError = byId("ninaAccessError");
const ninaAccessSubmit = byId("ninaAccessSubmit");
const ninaAccessCancel = byId("ninaAccessCancel");
const closeNina = byId("closeNina");
const startNina = byId("startNina");
const ninaVideo = byId("nina-anam-video");
const ninaStatus = byId("ninaStatus");
const ninaScrimTitle = byId("ninaScrimTitle");
const ninaScrimSubtitle = byId("ninaScrimSubtitle");
const ninaScrimMessage = byId("ninaScrimMessage");
const ninaScrimButton = byId("ninaScrimButton");
const ninaAccessHash = "d3ec7a14e4fefc8da57d4045a6ee28d28b328b78126c1e22bc0b541adf0f215c";
let ninaAccessSubmitting = false;
let ninaAccessVerifiedForCurrentOpen = false;
let ninaConnecting = false;
let ninaClient = null;
let ninaAttempt = 0;
let ninaTokenAbortController = null;
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const logDevelopmentError = (message, error) => { if (DEVELOPMENT) console.error(message, error); };

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
  const client = ninaClient;
  ninaClient = null;
  if (client) {
    try { await client.stopStreaming(); }
    catch (error) { logDevelopmentError("Unable to stop Nina cleanly.", error); }
  }
  ninaVideo.pause();
  ninaVideo.srcObject = null;
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
  const onConnected = () => { if (attempt === ninaAttempt && client === ninaClient) markNinaOnline(); };
  const onClosed = () => {
    if (attempt !== ninaAttempt || client !== ninaClient) return;
    ninaClient = null;
    ninaConnecting = false;
    if (ninaOverlay.classList.contains("is-open")) showNinaFailure("The connection ended. Try again when you're ready.");
  };
  if (AnamEvent?.CONNECTION_ESTABLISHED) client.addListener(AnamEvent.CONNECTION_ESTABLISHED, onConnected);
  if (AnamEvent?.VIDEO_PLAY_STARTED) client.addListener(AnamEvent.VIDEO_PLAY_STARTED, onConnected);
  if (AnamEvent?.CONNECTION_CLOSED) client.addListener(AnamEvent.CONNECTION_CLOSED, onClosed);
}

async function connectNina() {
  if (ninaConnecting || ninaClient || !ninaOverlay.classList.contains("is-open")) return;
  ninaConnecting = true; // Guards rapid duplicate CONNECT clicks.
  const attempt = ++ninaAttempt;
  showNinaConnecting();
  try {
    const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    permissionStream.getTracks().forEach(track => track.stop());
    if (attempt !== ninaAttempt || !ninaOverlay.classList.contains("is-open")) return;
    ninaTokenAbortController = new AbortController();
    const sessionToken = await requestSessionToken(ninaTokenAbortController.signal);
    ninaTokenAbortController = null;
    if (attempt !== ninaAttempt || !ninaOverlay.classList.contains("is-open")) return;
    const client = createClient(sessionToken);
    ninaClient = client;
    bindAnamLifecycle(client, attempt);
    await client.streamToVideoElement("nina-anam-video");
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
  openNina?.focus();
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
  ninaOverlay.classList.remove("is-open");
  ninaOverlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  ninaAccessVerifiedForCurrentOpen = false;
  await stopNinaSession();
  document.body.classList.remove("nina-connecting-mode", "nina-call-visible", "nina-conversation-live", "nina-scrim-visible", "nina-scrim-action");
}

openNina?.addEventListener("click", openNinaAccess);
openNinaArtist?.addEventListener("click", openNinaAccess);
ninaAccessForm.addEventListener("submit", verifyNinaAccess);
ninaAccess.addEventListener("click", event => event.stopPropagation());
ninaAccess.addEventListener("pointerdown", event => event.stopPropagation());
ninaAccessCancel.addEventListener("click", () => closeNinaAccess());
closeNina.addEventListener("click", closeNinaWindow);
startNina.addEventListener("click", connectNina);
ninaScrimButton.addEventListener("click", connectNina);
document.addEventListener("keydown", event => {
  if (event.key !== "Escape" || ninaAccessSubmitting) return;
  if (ninaAccess.classList.contains("is-open")) closeNinaAccess();
  else if (ninaOverlay.classList.contains("is-open")) closeNinaWindow();
});
window.addEventListener("pagehide", stopNinaSession);
window.addEventListener("beforeunload", stopNinaSession);
if (new URLSearchParams(window.location.search).get("nina") === "1") openNinaAccess();
void ANAM_PERSONA_ID;
