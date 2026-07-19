const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");

const requiredFiles = [
  "index.html"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error(`Missing required build file: ${file}`);
  }
}

if (index.includes("<tavus-embed")) {
  throw new Error("Tavus must not be initialized in the initial page source.");
}

if (index.includes('src="https://unpkg.com/@tavus/embed"')) {
  throw new Error("The Tavus library must be loaded only after access is granted.");
}

if (index.includes("/api/verify-nina-access")) {
  throw new Error("The static gate must not call a serverless endpoint.");
}

if (fs.existsSync(path.join(root, "api/verify-nina-access.js"))) {
  throw new Error("The unused serverless endpoint must be removed.");
}

if (!index.includes('crypto.subtle.digest("SHA-256", encodedCode)')) {
  throw new Error("The access gate must use browser SHA-256 verification.");
}

if (index.includes("sessionStorage")) {
  throw new Error("The access portal must not trust stored authorization.");
}

if (!index.includes("let ninaAccessVerifiedForCurrentOpen = false")) {
  throw new Error("The access gate must use per-opening in-memory authorization.");
}

if (!index.includes("let ninaTavusInitialized = false")) {
  throw new Error("The Tavus initializer must have a strict one-time guard.");
}

if (!index.includes("initializeNinaTavusAfterAccess")) {
  throw new Error("The post-access Tavus initializer is missing.");
}

if (!index.includes("pointer-events: auto !important")) {
  throw new Error("The Tavus embed must accept pointer events after access.");
}

if (!index.includes("pointer-events: none !important")) {
  throw new Error("The visual CONNECT scrim must pass pointer events through.");
}

if (
  index.includes("ninaScrimButton.addEventListener")
) {
  throw new Error("Custom CONNECT controls must not intercept native Tavus clicks.");
}

if (!index.includes("enableNinaTransmission")) {
  throw new Error("The pre-Tavus permission gate is missing.");
}

if (!index.includes("navigator.mediaDevices.getUserMedia")) {
  throw new Error("Camera and microphone permission must precede Tavus initialization.");
}

if (!index.includes('window.addEventListener("pagehide", endAndRemoveNinaTavus)')) {
  throw new Error("The Tavus page lifecycle cleanup is missing.");
}

const mockActivation = `(
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1"
  ) &&
  new URLSearchParams(location.search).get("nina_mock") === "1"`;

if (!index.includes(mockActivation)) {
  throw new Error("Mock mode must require both an approved local hostname and nina_mock=1.");
}

if (/location\.hostname\s*===\s*["'](?:parallelvisionlabel\.com|[^"']*github\.io)/.test(index)) {
  throw new Error("A production hostname must never be allowed to activate Nina mock mode.");
}

const mockInitializerStart = index.indexOf("async function initializeNinaMockAfterPermission");
const mockInitializerEnd = index.indexOf("function cleanupNinaMock", mockInitializerStart);
const mockInitializer = index.slice(mockInitializerStart, mockInitializerEnd);

if (mockInitializerStart < 0 || mockInitializerEnd < 0) {
  throw new Error("The local Nina mock initializer is missing.");
}

if (/loadNinaEmbedLibrary|initializeNinaTavusAfterAccess|createElement\(["']tavus-embed/.test(mockInitializer)) {
  throw new Error("Nina mock mode must contain no Tavus initialization path.");
}

if (!index.includes(": await initializeNinaTavusAfterAccess(expectedGeneration)")) {
  throw new Error("Production Tavus initialization must remain available outside mock mode.");
}

for (const assertion of [
  "TAVUS NETWORK REQUESTS:",
  "TAVUS ELEMENTS:",
  "TAVUS SCRIPTS:",
  "assertNinaMockIsolation()"
]) {
  if (!index.includes(assertion)) {
    throw new Error(`Mock isolation check is missing: ${assertion}`);
  }
}

if (!index.includes("styleNativeNinaConnectButton")) {
  throw new Error("The native Tavus CONNECT hover treatment is missing.");
}

if (!index.includes('class="nina-private-call"')) {
  throw new Error("The Nina private-call overlay is missing.");
}

if (!index.includes(".nina-private-call,\n.nina-private-call * {\n  pointer-events: none;")) {
  throw new Error("Every part of the Nina private-call overlay must pass clicks through.");
}

if (index.includes("ninaPrivateCallButton.addEventListener")) {
  throw new Error("The visual private-call CONNECT button must not handle clicks.");
}

if (!index.includes("alignNinaPrivateButton(nativeButton)")) {
  throw new Error("The visual CONNECT button must align to the native Tavus button.");
}

if (!index.includes('nativeButton.addEventListener("click"')) {
  throw new Error("The native Tavus button must retain ownership of the start click.");
}

if (!index.includes("hideNinaPrivateCall();")) {
  throw new Error("The private-call overlay must be removed when the conversation starts.");
}

if (index.includes("tavus.start(")) {
  throw new Error("The site must never start Tavus manually.");
}

const inlineScripts = [...index.matchAll(/<script>([\s\S]*?)<\/script>/g)];

for (const [, source] of inlineScripts) {
  new Function(source);
}

console.log("Static site build verified.");
