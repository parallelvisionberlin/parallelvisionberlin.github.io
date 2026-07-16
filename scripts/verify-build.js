const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");

const requiredFiles = [
  "index.html",
  "api/verify-nina-access.js"
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

const inlineScripts = [...index.matchAll(/<script>([\s\S]*?)<\/script>/g)];

for (const [, source] of inlineScripts) {
  new Function(source);
}

console.log("Static site build verified.");
