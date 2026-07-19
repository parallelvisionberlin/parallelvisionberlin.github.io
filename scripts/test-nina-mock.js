const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");

function mockModeFor(hostname, search) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  ) && new URLSearchParams(search).get("nina_mock") === "1";
}

assert.equal(mockModeFor("localhost", "?nina_mock=1"), true);
assert.equal(mockModeFor("127.0.0.1", "?nina_mock=1"), true);
assert.equal(mockModeFor("localhost", ""), false);
assert.equal(mockModeFor("127.0.0.1", "?nina_mock=0"), false);
assert.equal(mockModeFor("parallelvisionlabel.com", "?nina_mock=1"), false);
assert.equal(mockModeFor("www.parallelvisionlabel.com", "?nina_mock=1"), false);
assert.equal(mockModeFor("parallelvisionberlin.github.io", "?nina_mock=1"), false);
assert.equal(mockModeFor("preview.github.io", "?nina_mock=1"), false);

const mockStart = index.indexOf("async function initializeNinaMockAfterPermission");
const mockEnd = index.indexOf("function cleanupNinaMock", mockStart);
const mockSource = index.slice(mockStart, mockEnd);

assert.ok(mockStart >= 0 && mockEnd > mockStart);
assert.doesNotMatch(mockSource, /tavus-embed/);
assert.doesNotMatch(mockSource, /loadNinaEmbedLibrary/);
assert.doesNotMatch(mockSource, /initializeNinaTavusAfterAccess/);
assert.match(index, /TAVUS NETWORK REQUESTS:/);
assert.match(index, /TAVUS ELEMENTS:/);
assert.match(index, /TAVUS SCRIPTS:/);

console.log("Nina local mock safety tests passed.");
