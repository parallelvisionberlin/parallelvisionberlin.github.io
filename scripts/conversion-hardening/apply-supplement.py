from pathlib import Path


def replace_once(path, old, new):
    target = Path(path)
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one match in {path}, found {count}")
    target.write_text(text.replace(old, new, 1))


replace_once(
    "anam-token-worker/src/stripe.js",
    '  const purchaseId = normalizedRequestId(requestId) || crypto.randomUUID();',
    '''  const suppliedRequestId = typeof requestId === "string" ? requestId.trim() : "";\n  const normalizedId = normalizedRequestId(suppliedRequestId);\n  if (suppliedRequestId && !normalizedId) {\n    throw new StripePurchaseError("invalid_checkout_request", "Invalid checkout request", 400);\n  }\n  const purchaseId = normalizedId || crypto.randomUUID();'''
)

replace_once(
    "anam-token-worker/src/stripe.js",
    '''    if (purchase.stripe_checkout_session_id && purchase.status === "open") {\n      const existingSession = await stripe.checkout.sessions.retrieve(purchase.stripe_checkout_session_id);\n      if (existingSession?.url) {\n        return { requestId: purchaseId, sessionId: existingSession.id, status: purchase.status, url: existingSession.url };\n      }\n    }''',
    '''    if (purchase.stripe_checkout_session_id && purchase.status === "open") {\n      const existingSession = await stripe.checkout.sessions.retrieve(purchase.stripe_checkout_session_id);\n      if (existingSession?.payment_status === "paid") {\n        return { requestId: purchaseId, sessionId: existingSession.id, status: "paid", url: "" };\n      }\n      if (existingSession?.status === "expired") {\n        await markSessionStatus(env, existingSession, "expired");\n        throw new StripePurchaseError("checkout_expired", "Checkout Session expired. Start a new checkout.", 409);\n      }\n      if (existingSession?.url) {\n        return { requestId: purchaseId, sessionId: existingSession.id, status: purchase.status, url: existingSession.url };\n      }\n    }'''
)

replace_once(
    "anam-token-worker/test/stripe.test.js",
    'test("60-credit starter pack creates a validated €3.50 Checkout purchase", async () => {',
    '''test("malformed checkout request IDs are rejected instead of losing retry idempotency", async () => {\n  await assert.rejects(\n    () => createSignalCreditCheckout(configuredEnv(paymentDb()), { user: { id: "u" }, clerkUserId: "c" }, "signal_60", "https://parallelvisionlabel.com", mockStripe(), "not-a-uuid"),\n    error => error instanceof StripePurchaseError && error.code === "invalid_checkout_request"\n  );\n});\n\ntest("60-credit starter pack creates a validated €3.50 Checkout purchase", async () => {'''
)

replace_once(
    "js/nina-access.js",
    'const SIGNAL_CREDIT_PACK_IDS = new Set(["signal_60", "signal_150", "signal_300", "signal_600"]);',
    'const SIGNAL_CREDIT_PACK_IDS = new Set(["signal_60", "signal_150", "signal_300", "signal_600", "signal_1200"]);'
)

pack_600 = '        <button class="nina-credits-pack" type="button" data-pack-id="signal_600"><span class="nina-credits-pack-copy"><span class="nina-credits-pack-time">60 MIN</span><span class="nina-credits-pack-title">600 Signal Credits</span><span class="nina-credits-pack-description">For returning conversations.</span></span><strong>€27.99</strong></button>'
pack_1200 = '        <button class="nina-credits-pack" type="button" data-pack-id="signal_1200"><span class="nina-credits-pack-copy"><span class="nina-credits-pack-time">120 MIN</span><span class="nina-credits-pack-title">1200 Signal Credits</span><span class="nina-credits-pack-description">For long return visits.</span></span><strong>€54.99</strong></button>'
replace_once("js/nina-access.js", pack_600, f"{pack_600}\n{pack_1200}")

replace_once(
    "scripts/test-nina-web-browser.py",
    "  page.evaluate('testOpen()');page.wait_for_timeout(200)\n",
    "  page.evaluate('testOpen()');page.wait_for_timeout(200)\n  assert page.locator('[data-pack-id=\"signal_1200\"]').count()==1\n"
)
