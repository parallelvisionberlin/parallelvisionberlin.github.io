import { Clerk } from "https://esm.sh/@clerk/clerk-js@6?bundle";

const DEVELOPMENT = location.protocol === "http:";
const API_ORIGIN = DEVELOPMENT ? `http://${location.hostname}:8787` : "https://parallel-vision-anam-token.parallelvision.workers.dev";
const CLERK = DEVELOPMENT
  ? { key: "pk_test_Y2xpbWJpbmctd29tYmF0LTI3MTcuY2xlcmsuYWNjb3VudHMuZGV2JA", domain: "climbing-wombat-2717.clerk.accounts.dev" }
  : { key: "pk_live_Y2xlcmsucGFyYWxsZWx2aXNpb25sYWJlbC5jb20k", domain: "clerk.parallelvisionlabel.com" };
const $ = id => document.getElementById(id);
const elements = {
  status: $("adminStatus"), signIn: $("adminSignIn"), signOut: $("adminSignOut"), dashboard: $("adminDashboard"),
  today: $("todayMetrics"), week: $("weekMetrics"), month: $("monthMetrics"), funnel: $("adminFunnel"),
  cost: $("adminCost"), sessions: $("adminSessions"), generated: $("adminGenerated"),
  giftSearchForm: $("giftSearchForm"), giftUser: $("giftUser"), giftUserResult: $("giftUserResult"), giftUserIdentity: $("giftUserIdentity"), giftUserBalance: $("giftUserBalance"),
  giftGrantForm: $("giftGrantForm"), giftAmount: $("giftAmount"), giftNote: $("giftNote"), giftStatus: $("giftStatus"), voucherForm: $("voucherForm"), voucherCode: $("voucherCode"),
  voucherCredits: $("voucherCredits"), voucherLimit: $("voucherLimit"), voucherExpiration: $("voucherExpiration"), voucherActive: $("voucherActive"), voucherStatus: $("voucherStatus"),
  grants: $("adminGrants"), vouchers: $("adminVouchers")
};
let clerk;
let refreshTimer;
let selectedGiftUser = null;
const SESSION_PAGE_SIZE = 30;
let recentSessions = [];
let sessionPage = 0;

async function loadClerkUI() {
  if (window.__internal_ClerkUICtor) return window.__internal_ClerkUICtor;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://${CLERK.domain}/npm/@clerk/ui@1/dist/ui.browser.js`;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return window.__internal_ClerkUICtor;
}

const number = value => new Intl.NumberFormat("en").format(Math.max(0, Number(value) || 0));
const duration = seconds => {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
};
const dateTime = value => value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

function metric(container, label, value) {
  const item = document.createElement("div");
  item.className = "admin-metric";
  const name = document.createElement("span");
  const amount = document.createElement("strong");
  name.textContent = label;
  amount.textContent = value;
  item.append(name, amount);
  container.append(item);
}

function renderRange(container, data, includeActive = false) {
  container.replaceChildren();
  metric(container, "Unique Nina users", number(data.unique_users));
  metric(container, "Sessions", number(data.sessions));
  if (includeActive) metric(container, "Currently active", number(data.currently_active));
  metric(container, "Total connected time", duration(data.total_seconds));
  metric(container, "Average duration", duration(data.average_seconds));
  metric(container, "Longest session", duration(data.longest_seconds));
  if (!includeActive) {
    metric(container, "New users", number(data.new_users));
    metric(container, "Returning users", number(data.returning_users));
  }
}

function renderFunnel(funnel) {
  elements.funnel.replaceChildren();
  for (const [label, item] of [
    ["PageViews", funnel.pageViews], ["TalkToNina sessions", funnel.talkToNinaSessions],
    ["Account signups", funnel.accountSignups], ["Checkout starts", funnel.checkoutStarts], ["Purchases", funnel.purchases]
  ]) {
    const cell = document.createElement("div");
    const name = document.createElement("span");
    const value = document.createElement("strong");
    name.textContent = label;
    value.textContent = item.available ? number(item.value) : "N/A";
    cell.append(name, value);
    elements.funnel.append(cell);
  }
}

function renderCost(cost) {
  elements.cost.replaceChildren();
  const values = [
    ["Connected time", duration((Number(cost.totalMinutes) || 0) * 60)],
    ["Configured price / minute", cost.pricePerMinute === null ? "Not configured" : `€${Number(cost.pricePerMinute).toFixed(4)}`],
    ["Estimated Anam cost", cost.estimatedAnamCost === null ? "Not configured" : `€${Number(cost.estimatedAnamCost).toFixed(2)}`]
  ];
  for (const [label, value] of values) {
    const cell = document.createElement("div");
    const name = document.createElement("span");
    const amount = document.createElement("strong");
    name.textContent = label;
    amount.textContent = value;
    cell.append(name, amount);
    elements.cost.append(cell);
  }
}

function renderSessions(sessions) {
  recentSessions = sessions;
  renderSessionPage();
}

function renderSessionPage() {
  const pages = Math.max(1, Math.ceil(recentSessions.length / SESSION_PAGE_SIZE));
  sessionPage = Math.min(sessionPage, pages - 1);
  const start = sessionPage * SESSION_PAGE_SIZE;
  const visible = recentSessions.slice(start, start + SESSION_PAGE_SIZE);
  elements.sessions.replaceChildren();
  for (const session of visible) {
    const row = document.createElement("tr");
    const identity = document.createElement("td");
    identity.className = "admin-session-user";
    const details = session.authenticated
      ? [session.displayName, session.email].filter(Boolean)
      : ["Anonymous visitor"];
    for (const [index, value] of [...details, session.userIdentifier].entries()) {
      const line = document.createElement(index === 0 ? "strong" : "span");
      line.textContent = value;
      identity.append(line);
    }
    row.append(identity);
    const values = [session.returning ? "Returning" : "New", session.authenticated ? session.actorType : "Guest", dateTime(session.startedAt), duration(session.connectedSeconds), session.status];
    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    elements.sessions.append(row);
  }
  if (!visible.length) tableMessage(elements.sessions, 6, "No sessions yet.");
  const range = recentSessions.length ? `${start + 1}–${start + visible.length}` : "0";
  const total = recentSessions.length === 100 ? "100 most recent sessions" : `${recentSessions.length} recent sessions`;
  document.querySelectorAll('[data-session-page-status]').forEach(label => {
    label.textContent = `Page ${sessionPage + 1} of ${pages} · ${range} / ${total}`;
  });
  document.querySelectorAll('[data-session-page="previous"]').forEach(button => { button.disabled = sessionPage === 0; });
  document.querySelectorAll('[data-session-page="next"]').forEach(button => { button.disabled = sessionPage >= pages - 1; });
}

document.querySelectorAll('[data-session-page]').forEach(button => button.addEventListener('click', () => {
  sessionPage += button.dataset.sessionPage === 'next' ? 1 : -1;
  sessionPage = Math.max(0, sessionPage);
  renderSessionPage();
  document.getElementById('sessionsTitle').closest('section').scrollIntoView({ block: 'start' });
}));

async function fetchDashboard() {
  const token = await clerk?.session?.getToken?.();
  if (!token) throw Object.assign(new Error("Sign in required"), { status: 401 });
  const response = await fetch(`${API_ORIGIN}/api/nina/analytics/dashboard`, {
    cache: "no-store", headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || "Analytics unavailable"), { status: response.status });
  return data;
}

async function creditApi(path = "", options = {}) {
  const token = await clerk?.session?.getToken?.();
  if (!token) throw Object.assign(new Error("Sign in required"), { status: 401 });
  const response = await fetch(`${API_ORIGIN}${path}`, { cache: "no-store", ...options, headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json", "Content-Type": "application/json", ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || "Request failed"), { status: response.status, code: data.code });
  return data;
}

function tableMessage(container, columns, message) {
  const row = document.createElement("tr"), cell = document.createElement("td");
  cell.colSpan = columns; cell.textContent = message; row.append(cell); container.append(row);
}

function renderCreditAdmin(data) {
  elements.grants.replaceChildren();
  for (const grant of data.grants || []) {
    const row = document.createElement("tr");
    for (const value of [grant.userEmail || grant.userId, `+${number(grant.amount)}`, `${number(grant.previousBalance)} → ${number(grant.resultingBalance)}`, grant.grantedByUserId, grant.note || "—", dateTime(grant.grantedAt)]) { const cell = document.createElement("td"); cell.textContent = value; row.append(cell); }
    elements.grants.append(row);
  }
  if (!elements.grants.children.length) tableMessage(elements.grants, 6, "No manual grants yet.");
  elements.vouchers.replaceChildren();
  for (const voucher of data.vouchers || []) {
    const expired = voucher.expiresAt && Date.parse(voucher.expiresAt) <= Date.now();
    const status = !voucher.active ? "INACTIVE" : expired ? "EXPIRED" : voucher.redemptionCount >= voucher.maximumRedemptions ? "LIMIT REACHED" : "ACTIVE";
    const row = document.createElement("tr");
    for (const value of [voucher.code, number(voucher.creditAmount), `${number(voucher.redemptionCount)} / ${number(voucher.maximumRedemptions)}`, dateTime(voucher.expiresAt), status]) { const cell = document.createElement("td"); cell.textContent = value; row.append(cell); }
    row.firstElementChild.append(document.createElement("br"), voucherCopyButton("Copy code", voucher.code));
    elements.vouchers.append(row);
  }
  if (!elements.vouchers.children.length) tableMessage(elements.vouchers, 5, "No vouchers yet.");
}

async function loadCreditAdmin() { renderCreditAdmin(await creditApi("/api/signal-credits/admin")); }

async function loadDashboard() {
  try {
    const data = await fetchDashboard();
    elements.status.textContent = "Owner access verified.";
    elements.dashboard.hidden = false;
    elements.signOut.hidden = false;
    renderRange(elements.today, data.ranges.today, true);
    renderRange(elements.week, data.ranges.days7);
    renderRange(elements.month, data.ranges.days30);
    renderFunnel(data.funnel);
    renderCost(data.cost);
    renderSessions(data.sessions || []);
    await loadCreditAdmin();
    elements.generated.textContent = `Generated ${dateTime(data.generatedAt)} / Active window ${data.activeWindowSeconds} seconds`;
  } catch (error) {
    elements.dashboard.hidden = true;
    elements.signOut.hidden = !clerk?.isSignedIn;
    elements.signIn.hidden = Boolean(clerk?.isSignedIn);
    elements.status.textContent = error?.status === 403 ? "Owner access required." : clerk?.isSignedIn ? "Analytics temporarily unavailable." : "Sign in with the owner account.";
  }
}

async function syncAuth() {
  clearInterval(refreshTimer);
  elements.signIn.hidden = Boolean(clerk?.isSignedIn);
  await loadDashboard();
  if (clerk?.isSignedIn && !elements.dashboard.hidden) refreshTimer = setInterval(() => void loadDashboard(), 30000);
}

elements.signIn.addEventListener("click", () => clerk?.openSignIn());
elements.signOut.addEventListener("click", async () => { await clerk?.signOut(); await syncAuth(); });
elements.giftSearchForm.addEventListener("submit", async event => {
  event.preventDefault(); elements.giftStatus.textContent = "Searching…"; elements.giftUserResult.hidden = true; selectedGiftUser = null;
  try { const data = await creditApi(`/api/signal-credits/admin?user=${encodeURIComponent(elements.giftUser.value)}`); selectedGiftUser = data.user; elements.giftUserIdentity.textContent = data.user.email || data.user.id; elements.giftUserBalance.textContent = `${number(data.user.balance)} credits`; elements.giftUserResult.hidden = false; elements.giftStatus.textContent = "User found."; }
  catch (error) { elements.giftStatus.textContent = error.message; }
});
elements.giftGrantForm.addEventListener("submit", async event => {
  event.preventDefault(); if (!selectedGiftUser || elements.giftGrantForm.dataset.pending) return;
  elements.giftGrantForm.dataset.pending = "true";
  const submit = elements.giftGrantForm.querySelector('[type="submit"]'); if (submit) submit.disabled = true;
  elements.giftStatus.textContent = "Granting credits…";
  try { const data = await creditApi("/api/signal-credits/grant", { method: "POST", body: JSON.stringify({ userId: selectedGiftUser.id, amount: Number(elements.giftAmount.value), note: elements.giftNote.value }) }); selectedGiftUser.balance = data.balance; elements.giftUserBalance.textContent = `${number(data.balance)} credits`; elements.giftAmount.value = ""; elements.giftNote.value = ""; const statuses = {sent:"Email sent.",not_configured:"Email not sent: connect Zoho first.",failed:"Email failed. Credits were added; do not grant again.",unknown:"Email delivery unconfirmed. Credits were added; do not grant again.",missing_email:"Recipient has no valid email.",sending:"Email processing."}; elements.giftStatus.textContent = `Granted ${number(data.grant.amount)} credits. ${statuses[data.email?.status] || "Email status unavailable."}`; try { await loadCreditAdmin(); } catch {} }
  catch (error) { elements.giftStatus.textContent = error.message; }
  finally { delete elements.giftGrantForm.dataset.pending; if (submit) submit.disabled = false; }
});
function voucherCopyButton(label, value) {
  const button = document.createElement("button");
  button.type = "button"; button.className = "admin-button"; button.textContent = label;
  button.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(value); button.textContent = "Copied"; }
    catch { button.textContent = "Select and copy the code below"; const field = document.createElement("textarea"); field.value = value; field.readOnly = true; button.after(field); field.focus(); field.select(); }
  });
  return button;
}
elements.voucherForm.addEventListener("submit", async event => {
  event.preventDefault();
  const submit = elements.voucherForm.querySelector('[type="submit"]');
  submit.disabled = true;
  elements.voucherStatus.textContent = "Creating voucher…";
  try {
    const result = await creditApi("/api/signal-credits/admin", { method: "POST", body: JSON.stringify({ code: elements.voucherCode.value, creditAmount: Number(elements.voucherCredits.value), maximumRedemptions: Number(elements.voucherLimit.value), expiresAt: elements.voucherExpiration.value ? new Date(elements.voucherExpiration.value).toISOString() : null, active: elements.voucherActive.checked }) });
    const voucher = result.voucher;
    elements.voucherStatus.textContent = "Voucher created.";
    const panel = document.getElementById("voucherCreatedResult") || document.createElement("div");
    panel.id = "voucherCreatedResult"; panel.replaceChildren();
    const code = document.createElement("p"); code.textContent = voucher.code; code.style.cssText = "font-size:24px;letter-spacing:.08em;user-select:all";
    const info = document.createElement("p"); info.textContent = voucher.credits + " Signal Credits · " + (voucher.credits / 10) + " min · " + voucher.limit + " redemptions";
    panel.append(code, info, voucherCopyButton("Copy code", voucher.code), voucherCopyButton("Copy message", "A little time in Berlin 2063, for you.\n\n" + voucher.credits + " Signal Credits for a conversation with Nina.\nYour code: " + voucher.code + "\n\nSign in and redeem it here:\nhttps://parallelvisionlabel.com/account.html#redeemForm"));
    elements.voucherStatus.after(panel);
    elements.voucherForm.reset(); elements.voucherLimit.value = "1"; elements.voucherActive.checked = true;
    try { await loadCreditAdmin(); } catch { elements.voucherStatus.textContent = "Voucher created. The list could not refresh; your code is shown below."; }
  } catch (error) { elements.voucherStatus.textContent = error.message; }
  finally { submit.disabled = false; }
});

try {
  const ClerkUI = await loadClerkUI();
  clerk = new Clerk(CLERK.key);
  await clerk.load({ ui: { ClerkUI } });
  clerk.addListener?.(() => void syncAuth());
  await syncAuth();
} catch {
  elements.status.textContent = "Owner authentication is temporarily unavailable.";
}
