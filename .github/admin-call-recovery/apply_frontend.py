from pathlib import Path
root=Path(__file__).resolve().parents[2]
p=root/'js/nina-admin.js';s=p.read_text()
s=s.replace('const sessionDetailCache = new Map();\nlet expandedSessionId = null;', '''const sessionDetailCache = new Map();
const sessionDetailRequests = new Map();
const SESSION_DETAIL_CACHE_MS = 30000;
let detailAuthGeneration = 0;
let detailAuthSession = null;
let expandedSessionId = null;''',1)
start=s.index('async function fetchSessionDetail(')
end=s.index('\nfunction detailStat(',start)
s=s[:start]+'''function clearSessionDetails() {
  detailAuthGeneration += 1;
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
''' + s[end:]
old='''  const heading = document.createElement("h3"); heading.textContent = detail.session.displayName || detail.session.email || "Nina visitor";'''
new='''  const heading = document.createElement("h3");
  const nameToggle = document.createElement("button");
  nameToggle.type = "button"; nameToggle.className = "admin-call-name-toggle";
  nameToggle.textContent = detail.session.displayName || detail.session.email || "Nina visitor";
  nameToggle.setAttribute("aria-label", `Close call details for ${nameToggle.textContent}`);
  nameToggle.setAttribute("aria-expanded", "true");
  nameToggle.setAttribute("aria-controls", container.id);
  nameToggle.addEventListener("click", event => { event.stopPropagation(); closeSessionDetail(); });
  heading.append(nameToggle);'''
assert old in s;s=s.replace(old,new,1)
s=s.replace('close.addEventListener("click", event => { event.stopPropagation(); expandedSessionId = null; renderSessionPage(); });','close.addEventListener("click", event => { event.stopPropagation(); closeSessionDetail(); });',1)
start=s.index('  const stats = document.createElement("div"); stats.className="admin-call-stats";')
end=s.index('\n  const transcriptTitle = ',start)
s=s[:start]+'''  const stats = document.createElement("div"); stats.className="admin-call-stats";
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
''' + s[end:]
s=s.replace('empty.textContent="No stored speech for this call.";', 'empty.textContent=hasTranscriptLink ? "No messages are stored in the linked conversation." : "A transcript could not be confidently linked to this call. This is not evidence that the person stayed silent.";',1)
start=s.index('async function toggleSessionDetail(')
end=s.index('\nfunction renderSessions(',start)
s=s[:start]+'''function toggleSessionDetail(session) {
  expandedSessionId = expandedSessionId === session.id ? null : session.id;
  renderSessionPage();
  focusCallToggle(session.id);
}
''' + s[end:]
s=s.replace('''    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute("aria-expanded", expandedSessionId === session.id ? "true" : "false");''','''    row.dataset.expanded = expandedSessionId === session.id ? "true" : "false";''',1)
old='''      const line = document.createElement(index === 0 ? "strong" : "span");
      line.textContent = value;
      identity.append(line);'''
new='''      const line = document.createElement(index === 0 ? "button" : "span");
      line.textContent = value;
      if (index === 0) {
        line.type = "button"; line.className = "admin-session-name-toggle";
        line.id = `call-toggle-${session.id}`;
        line.setAttribute("aria-expanded", expandedSessionId === session.id ? "true" : "false");
        line.setAttribute("aria-controls", `call-panel-${session.id}`);
        line.setAttribute("aria-label", `${expandedSessionId === session.id ? "Close" : "Open"} call details for ${value}`);
        line.addEventListener("click", event => { event.stopPropagation(); toggleSessionDetail(session); });
      }
      identity.append(line);'''
assert old in s;s=s.replace(old,new,1)
s=s.replace('''    row.addEventListener("click", () => void toggleSessionDetail(session, row));
    row.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void toggleSessionDetail(session, row); } });''','''    row.addEventListener("click", event => {
      if (event.target.closest("button, a, input, select, textarea")) return;
      toggleSessionDetail(session);
    });''',1)
s=s.replace('''      const panel=document.createElement("div"); panel.className="admin-call-panel"; panel.textContent="Loading call…";''','''      const panel=document.createElement("div"); panel.className="admin-call-panel"; panel.id=`call-panel-${session.id}`; panel.textContent="Loading call…";
      panel.setAttribute("role", "region"); panel.setAttribute("aria-label", "Call details");''',1)
old='''      queueMicrotask(async () => {
        if (expandedSessionId !== session.id) return;
        try { renderSessionInspector(panel, await fetchSessionDetail(session.id)); }
        catch (error) { panel.textContent = error.message || "Call detail unavailable."; }
      });'''
new='''      queueMicrotask(() => {
        if (expandedSessionId === session.id && panel.isConnected) void loadSessionInspector(panel, session);
      });'''
assert old in s;s=s.replace(old,new,1)
s=s.replace('''function renderSessions(sessions) {
  recentSessions = sessions;''','''function renderSessions(sessions) {
  for (const session of sessions) {
    const old = recentSessions.find(item => item.id === session.id);
    if (old && ["rawStatus", "connectedSeconds", "userMessages", "personaMessages", "lastSeenAt"].some(key => old[key] !== session[key])) {
      sessionDetailCache.delete(session.id);
    }
  }
  recentSessions = sessions;''',1)
s=s.replace('''async function syncAuth() {
  clearInterval(refreshTimer);''','''async function syncAuth() {
  clearInterval(refreshTimer);
  const authSession = clerk?.isSignedIn ? clerk?.session?.id || "signed-in" : null;
  if (authSession !== detailAuthSession) { clearSessionDetails(); detailAuthSession = authSession; }''',1)
s=s.replace('''  } catch (error) {
    elements.dashboard.hidden = true;''','''  } catch (error) {
    if (error?.status === 401 || error?.status === 403) clearSessionDetails();
    elements.dashboard.hidden = true;''',1)
p.write_text(s)
p=root/'css/nina-admin.css';s=p.read_text()
s += '''
/* Call names are real, keyboard-accessible disclosure controls. */
.admin-session-name-toggle,.admin-call-name-toggle{display:block;max-width:100%;margin:0;padding:0;border:0;border-radius:0;background:none;color:inherit;text-align:left;cursor:pointer;font:inherit;letter-spacing:inherit;text-transform:none}
.admin-session-name-toggle{color:#eee;font:500 15px/1.4 Inter,sans-serif;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.admin-call-name-toggle{overflow-wrap:anywhere}
.admin-session-name-toggle:hover,.admin-call-name-toggle:hover{text-decoration:underline;text-decoration-color:#666;text-underline-offset:5px}
.admin-session-name-toggle:focus-visible,.admin-call-name-toggle:focus-visible{outline:1px solid #aaa;outline-offset:5px}
.admin-session-row[data-expanded="true"]{background:#0a0a0c}
.admin-session-row[data-expanded="true"] td{border-bottom-color:#3a3a3a}
.admin-call-notice{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:14px 0;border-bottom:1px solid #292929}
.admin-call-notice p{margin:0;max-width:760px;color:#b5b5b1;font:14px/1.55 Inter,sans-serif}
.admin-call-notice button{flex-shrink:0}
@media(max-width:600px){.admin-call-notice{flex-direction:column;gap:12px}}
'''
p.write_text(s)
p=root/'nina-admin/index.html';s=p.read_text().replace('20260909-call-inspector','20260909-call-recovery1');p.write_text(s)
