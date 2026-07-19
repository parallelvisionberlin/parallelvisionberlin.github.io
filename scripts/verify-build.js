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

if (!index.includes("styleNativeNinaConnectButton")) {
  throw new Error("The native Tavus CONNECT hover treatment is missing.");
}

const inlineScripts = [...index.matchAll(/<script>([\s\S]*?)<\/script>/g)];

for (const [, source] of inlineScripts) {
  new Function(source);
}

console.log("Static site build verified.");
