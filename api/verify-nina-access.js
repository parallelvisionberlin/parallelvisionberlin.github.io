const crypto = require("node:crypto");

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const attemptsByIp = new Map();

function getClientIp(request) {
  const forwardedFor = request.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0].trim();
  }

  return request.socket?.remoteAddress || "unknown";
}

function getRateLimit(ip, now) {
  const current = attemptsByIp.get(ip);

  if (!current || now >= current.resetAt) {
    const fresh = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    attemptsByIp.set(ip, fresh);
    return fresh;
  }

  return current;
}

function secureEqual(submittedCode, expectedCode) {
  const submittedDigest = crypto
    .createHash("sha256")
    .update(submittedCode)
    .digest();
  const expectedDigest = crypto
    .createHash("sha256")
    .update(expectedCode)
    .digest();

  return crypto.timingSafeEqual(submittedDigest, expectedDigest);
}

module.exports = function verifyNinaAccess(request, response) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const expectedCode = process.env.NINA_ACCESS_CODE;

  if (!expectedCode) {
    console.error("NINA_ACCESS_CODE is not configured.");
    return response.status(503).json({ error: "Signal unavailable." });
  }

  const now = Date.now();
  const clientIp = getClientIp(request);
  const rateLimit = getRateLimit(clientIp, now);

  if (rateLimit.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((rateLimit.resetAt - now) / 1000)
    );

    response.setHeader("Retry-After", String(retryAfterSeconds));
    return response.status(429).json({ error: "Too many attempts. Try again later." });
  }

  const code = typeof request.body?.code === "string"
    ? request.body.code
    : "";

  if (!code || !secureEqual(code, expectedCode)) {
    rateLimit.count += 1;
    return response.status(401).json({ error: "Access code rejected." });
  }

  attemptsByIp.delete(clientIp);
  return response.status(200).json({ authorized: true });
};
