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
const sessionDetailCache = new Map();
const sessionDetailRequests = new Map();
const SESSION_DETAIL_CACHE_MS = 30000;
let detailAuthGeneration = 0;
let detailAuthSession = null;
let expandedSessionId = null;
const transcriptDownloads = new Set();

async function downloadTranscript(params, button, status) {
  if (button.disabled) return;
  const generation = detailAuthGeneration;
  const controller = new AbortController();
  transcriptDownloads.add(controller);
  const timeout = setTimeout(() => controller.abort(), 45000);
  button.disabled = true;
  status.textContent = "Preparing download…";
  try {
    const token = await clerk?.session?.getToken?.();
    if (!token) throw new Error("Sign in with the owner account.");
    if (generation !== detailAuthGeneration) return;
    const response = await fetch(`${API_ORIGIN}/api/nina/analytics/transcript.txt?${params}`, {
      cache: "no-store", signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, Accept: "text/plain" }
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Download unavailable. Please retry.");
    }
    if (!response.headers.get("Content-Type")?.startsWith("text/plain")) throw new Error("Transcript service needs an update.");
    const blob = await response.blob();
    if (generation !== detailAuthGeneration) return;
    const filename = response.headers.get("Content-Disposition")?.match(/filename="([a-zA-Z0-9_.-]+)"/)?.[1] || "nina-transcript.txt";
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    status.textContent = `Download ready: ${response.headers.get("X-Transcript-Conversations")} conversations, ${response.headers.get("X-Transcript-Messages")} messages.`;
  } catch (error) {
    if (generation === detailAuthGeneration) status.textContent = error.name === "AbortError" ? "Download timed out. Try a shorter date range." : error.message;
  } finally { clearTimeout(timeout); transcriptDownloads.delete(controller); button.disabled = false; }
}

function berlinDate(value = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function syncTranscriptDates() {
  const custom = $("transcriptPeriod").value === "custom";
  $("transcriptDates").hidden = !custom;
  $("transcriptFrom").required = custom; $("transcriptTo").required = custom;
}

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
const ADMIN_TIME_ZONE = "Europe/Berlin";
const dateTime = value => value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: ADMIN_TIME_ZONE }).format(new Date(value)) : "—";
const timeOnly = value => value ? new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", timeZone: ADMIN_TIME_ZONE }).format(new Date(value)) : "—";

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
    ["Account signups", funnel.accountSignups], ["Billing started", funnel.billingStarts],
    ["Failed before billing", funnel.preActivationFailures], ["Signal exhausted", funnel.exhaustedSignals],
    ["Checkout created", funnel.checkoutStarts], ["Checkout failed", funnel.checkoutFailures], ["Purchases", funnel.purchases]
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


function clearSessionDetails() {
  detailAuthGeneration += 1;
  for (const controller of transcriptDownloads) controller.abort();
  transcriptDownloads.clear();
  $("transcriptExportStatus").textContent = "";
  for (const request of sessionDetailRequests.values()) request.controller.abort();
  sessionDetailRequests.clear();
  sessionDetailCache.clear();
  expandedSessionId = null;
  recentSessions = [];
  elements.sessions.replaceChildren();
}

async function fetchSessionDetail(sessionId) {
  const cached = sessionDetailCache.get(sessionId);
  if (cached && Date.now() - cached.at < SESSION_DETAIL_CACHE_MS) return cached.data;
  if (sessionDetailRequests.has(sessionId)) return sessionDetailRequests.get(sessionId).promise;
  const generation = detailAuthGeneration;
  const controller = new AbortController();
  const request = { controller, promise: null };
  request.promise = (async () => {
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const token = await clerk?.session?.getToken?.();
      if (!token) throw Object.assign(new Error("Sign in required"), { status: 401 });
      const response = await fetch(`${API_ORIGIN}/api/nina/analytics/dashboard?session=${encodeURIComponent(sessionId)}`, {
        cache: "no-store", signal: controller.signal,
        headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw Object.assign(new Error("Call detail unavailable"), { status: response.status });
      if (data.session?.id !== sessionId || !Array.isArray(data.transcript)) {
        throw Object.assign(new Error("The call-detail service needs the latest Worker deployment."), { code: "worker_update_required" });
      }
      if (generation === detailAuthGeneration) sessionDetailCache.set(sessionId, { data, at: Date.now() });
      return data;
    } finally {
      clearTimeout(timeout);
      if (sessionDetailRequests.get(sessionId) === request) sessionDetailRequests.delete(sessionId);
    }
  })();
  sessionDetailRequests.set(sessionId, request);
  return request.promise;
}

function focusCallToggle(sessionId) {
  document.getElementById(`call-toggle-${sessionId}`)?.focus({ preventScroll: true });
}

function closeSessionDetail() {
  const previous = expandedSessionId;
  expandedSessionId = null;
  renderSessionPage();
  if (previous) focusCallToggle(previous);
}

function renderCallError(panel, session, error) {
  panel.replaceChildren();
  const message = document.createElement("p");
  message.className = "admin-call-empty";
  message.setAttribute("role", "status");
  message.textContent = error?.status === 401 || error?.status === 403
    ? "Your owner session could not be verified. Sign in again."
    : error?.code === "worker_update_required" ? error.message
    : "The call could not be loaded. This does not mean the transcript is missing.";
  const retry = document.createElement("button");
  retry.type = "button"; retry.className = "admin-button"; retry.textContent = "Retry call";
  retry.addEventListener("click", event => {
    event.stopPropagation(); sessionDetailCache.delete(session.id);
    void loadSessionInspector(panel, session);
  });
  panel.append(message, retry);
}

async function loadSessionInspector(panel, session) {
  panel.textContent = "Loading call…";
  panel.setAttribute("aria-busy", "true");
  const generation = detailAuthGeneration;
  try {
    const detail = await fetchSessionDetail(session.id);
    if (generation !== detailAuthGeneration || expandedSessionId !== session.id || !panel.isConnected) return;
    renderSessionInspector(panel, detail);
  } catch (error) {
    if (generation !== detailAuthGeneration || expandedSessionId !== session.id || !panel.isConnected) return;
    renderCallError(panel, session, error);
  } finally {
    panel.removeAttribute("aria-busy");
  }
}

function detailStat(label, value) {
  const item = document.createElement("div");
  const name = document.createElement("span"), amount = document.createElement("strong");
  name.textContent = label; amount.textContent = value; item.append(name, amount); return item;
}

function renderSessionInspector(container, detail) {
  container.replaceChildren();
  const hero = document.createElement("div"); hero.className = "admin-call-hero";
  const title = document.createElement("div");
  const eyebrow = document.createElement("p"); eyebrow.textContent = "CALL DETAIL · BERLIN TIME";
  const heading = document.createElement("h3");
  const nameToggle = document.createElement("button");
  nameToggle.type = "button"; nameToggle.className = "admin-call-name-toggle";
  nameToggle.textContent = detail.session.displayName || detail.session.email || "Nina visitor";
  nameToggle.setAttribute("aria-label", `Close call details for ${nameToggle.textContent}`);
  nameToggle.setAttribute("aria-expanded", "true");
  nameToggle.setAttribute("aria-controls", container.id);
  nameToggle.addEventListener("click", event => { event.stopPropagation(); closeSessionDetail(); });
  heading.append(nameToggle);
  const subtitle = document.createElement("p");
  subtitle.textContent = `${dateTime(detail.session.startedAt)} · ${duration(detail.session.connectedSeconds)} · ${String(detail.session.rawStatus || "").toUpperCase()}`;
  title.append(eyebrow, heading, subtitle);
  const close = document.createElement("button"); close.type="button"; close.className="admin-call-close"; close.textContent="Close";
  close.addEventListener("click", event => { event.stopPropagation(); closeSessionDetail(); });
  hero.append(title, close); container.append(hero);

  const stats = document.createElement("div"); stats.className="admin-call-stats";
  const purchase = detail.purchases?.find(item => item.status === "paid") || detail.purchases?.[0];
  const available = detail.detailAvailability || {};
  const owner = detail.session.actorType === "owner";
  const hasTranscriptLink = Boolean(detail.conversation);
  stats.append(
    detailStat("Conversation", hasTranscriptLink ? `${detail.userMessages} user / ${detail.ninaMessages} Nina messages` : "Not linked"),
    detailStat("Qualified event", owner ? "Not applicable" : detail.qualificationAvailable ? (detail.qualified ? "Recorded" : "Not recorded") : "Unavailable"),
    detailStat("Credits used", owner ? "Unmetered" : available.live === false ? "Unavailable" : detail.live ? String(detail.live.creditsDebited) : "Not linked"),
    detailStat("Balance now", owner ? "Unmetered" : available.credits === false ? "Unavailable" : detail.creditAccount ? String(detail.creditAccount.balance) : "Not recorded"),
    detailStat("Nearby checkout", available.purchases === false ? "Unavailable" : purchase ? String(purchase.status).toUpperCase() : "None recorded")
  );
  container.append(stats);
  if (Array.isArray(detail.warnings) && detail.warnings.length) {
    const notice = document.createElement("div"); notice.className = "admin-call-notice";
    const message = document.createElement("p");
    const labels = { live: "billing session", credits: "credit balance", creditEvents: "credit ledger", purchases: "checkout activity", history: "visit history", qualification: "qualified event" };
    const sections = [...new Set(detail.warnings.map(item => labels[item.section]).filter(Boolean))];
    message.textContent = `Some details are unavailable: ${sections.join(", ") || "account metadata"}. The saved transcript is shown independently.`;
    const retry = document.createElement("button"); retry.type = "button"; retry.className = "admin-call-close"; retry.textContent = "Retry details";
    retry.addEventListener("click", event => { event.stopPropagation(); sessionDetailCache.delete(detail.session.id); void loadSessionInspector(container, detail.session); });
    notice.append(message, retry); container.append(notice);
  }
  if (detail.purchases?.length) {
    const note = document.createElement("p"); note.className = "admin-note";
    note.textContent = "Checkout activity belongs to this account near the call. It is not proof that this call caused a purchase.";
    container.append(note);
  }

  const transcriptTitle = document.createElement("p"); transcriptTitle.className="admin-call-label"; transcriptTitle.textContent="Conversation"; container.append(transcriptTitle);
  const downloadStatus = document.createElement("p"); downloadStatus.className = "admin-export-status"; downloadStatus.setAttribute("role", "status");
  if (detail.conversation?.id) {
    const download = document.createElement("button"); download.type = "button"; download.className = "admin-button"; download.textContent = "Download TXT";
    download.addEventListener("click", event => { event.stopPropagation(); void downloadTranscript(new URLSearchParams({ conversation: detail.conversation.id }), download, downloadStatus); });
    container.append(download, downloadStatus);
  } else if (detail.session.userId) {
    const choose = document.createElement("button"); choose.type = "button"; choose.className = "admin-button"; choose.textContent = "Export this account by date";
    choose.addEventListener("click", event => {
      event.stopPropagation(); $("transcriptUser").value = detail.session.userId;
      $("transcriptPeriod").value = "custom";
      $("transcriptFrom").value = $("transcriptTo").value = berlinDate(detail.session.startedAt);
      syncTranscriptDates(); $("transcriptExport").scrollIntoView({ block: "start" }); $("transcriptUser").focus({ preventScroll: true });
    });
    container.append(choose);
  }
  const transcript = document.createElement("div"); transcript.className="admin-transcript";
  if (!detail.transcript.length) {
    const empty=document.createElement("p"); empty.className="admin-call-empty"; empty.textContent=hasTranscriptLink ? "No messages are stored in the linked conversation." : "A transcript could not be confidently linked to this call. This is not evidence that the person stayed silent."; transcript.append(empty);
  } else for (const message of detail.transcript) {
    const turn=document.createElement("div"); turn.className="admin-turn is-" + message.role;
    const meta=document.createElement("div");
    const who=document.createElement("strong"); who.textContent=message.role === "user" ? "USER" : "NINA";
    const when=document.createElement("span"); when.textContent=timeOnly(message.createdAt);
    meta.append(who,when);
    const body=document.createElement("p"); body.textContent=message.content;
    turn.append(meta,body); transcript.append(turn);
  }
  container.append(transcript);

  if (detail.userHistory?.length > 1) {
    const historyTitle=document.createElement("p"); historyTitle.className="admin-call-label"; historyTitle.textContent="Recent visits"; container.append(historyTitle);
    const history=document.createElement("div"); history.className="admin-call-history";
    for(const visit of detail.userHistory){
      const item=document.createElement("div"); item.textContent=dateTime(visit.startedAt) + " · " + duration(visit.connectedSeconds) + " · " + String(visit.status).toUpperCase() + (visit.id === detail.session.id ? " · THIS CALL" : ""); history.append(item);
    }
    container.append(history);
  }
}

function toggleSessionDetail(session) {
  expandedSessionId = expandedSessionId === session.id ? null : session.id;
  renderSessionPage();
  focusCallToggle(session.id);
}

function renderSessions(sessions) {
  for (const session of sessions) {
    const old = recentSessions.find(item => item.id === session.id);
    if (old && ["rawStatus", "connectedSeconds", "userMessages", "personaMessages", "lastSeenAt"].some(key => old[key] !== session[key])) {
      sessionDetailCache.delete(session.id);
    }
  }
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
    row.className = "admin-session-row";
    row.dataset.expanded = expandedSessionId === session.id ? "true" : "false";
    const identity = document.createElement("td");
    identity.className = "admin-session-user";
    const details = session.authenticated
      ? [session.displayName, session.email].filter(Boolean)
      : ["Anonymous visitor"];
    for (const [index, value] of [...details, session.userIdentifier].entries()) {
      const line = document.createElement(index === 0 ? "button" : "span");
      line.textContent = value;
      if (index === 0) {
        line.type = "button"; line.className = "admin-session-name-toggle";
        line.id = `call-toggle-${session.id}`;
        line.setAttribute("aria-expanded", expandedSessionId === session.id ? "true" : "false");
        line.setAttribute("aria-controls", `call-panel-${session.id}`);
        line.setAttribute("aria-label", `${expandedSessionId === session.id ? "Close" : "Open"} call details for ${value}`);
        line.addEventListener("click", event => { event.stopPropagation(); toggleSessionDetail(session); });
      }
      identity.append(line);
    }
    row.append(identity);
    const values = [session.returning ? "Returning" : "New", session.authenticated ? session.actorType : "Guest", dateTime(session.startedAt), duration(session.connectedSeconds), session.status];
    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    row.addEventListener("click", event => {
      if (event.target.closest("button, a, input, select, textarea")) return;
      toggleSessionDetail(session);
    });
    elements.sessions.append(row);
    if (expandedSessionId === session.id) {
      const detailRow = document.createElement("tr"); detailRow.className="admin-session-detail-row"; detailRow.dataset.detailFor=session.id;
      const cell=document.createElement("td"); cell.colSpan=6;
      const panel=document.createElement("div"); panel.className="admin-call-panel"; panel.id=`call-panel-${session.id}`; panel.textContent="Loading call…";
      panel.setAttribute("role", "region"); panel.setAttribute("aria-label", "Call details");
      cell.append(panel); detailRow.append(cell); elements.sessions.append(detailRow);
      queueMicrotask(() => {
        if (expandedSessionId === session.id && panel.isConnected) void loadSessionInspector(panel, session);
      });
    }
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
    elements.generated.textContent = `Generated ${dateTime(data.generatedAt)} · Today resets at 00:00 Europe/Berlin · Active window ${data.activeWindowSeconds} seconds`;
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) clearSessionDetails();
    elements.dashboard.hidden = true;
    elements.signOut.hidden = !clerk?.isSignedIn;
    elements.signIn.hidden = Boolean(clerk?.isSignedIn);
    elements.status.textContent = error?.status === 403 ? "Owner access required." : clerk?.isSignedIn ? "Analytics temporarily unavailable." : "Sign in with the owner account.";
  }
}

async function syncAuth() {
  clearInterval(refreshTimer);
  const authSession = clerk?.isSignedIn ? clerk?.session?.id || "signed-in" : null;
  if (authSession !== detailAuthSession) { clearSessionDetails(); detailAuthSession = authSession; }
  elements.signIn.hidden = Boolean(clerk?.isSignedIn);
  await loadDashboard();
  if (clerk?.isSignedIn && !elements.dashboard.hidden) refreshTimer = setInterval(() => void loadDashboard(), 30000);
}

elements.signIn.addEventListener("click", () => clerk?.openSignIn());
$("transcriptFrom").value = $("transcriptTo").value = berlinDate();
$("transcriptPeriod").addEventListener("change", syncTranscriptDates);
$("transcriptExportForm").addEventListener("submit", event => {
  event.preventDefault();
  const params = new URLSearchParams({ period: $("transcriptPeriod").value });
  if ($("transcriptUser").value.trim()) params.set("user", $("transcriptUser").value.trim());
  if (params.get("period") === "custom") { params.set("from", $("transcriptFrom").value); params.set("to", $("transcriptTo").value); }
  void downloadTranscript(params, event.currentTarget.querySelector('[type="submit"]'), $("transcriptExportStatus"));
});
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
