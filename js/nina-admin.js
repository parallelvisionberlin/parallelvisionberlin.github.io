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
  cost: $("adminCost"), sessions: $("adminSessions"), generated: $("adminGenerated")
};
let clerk;
let refreshTimer;

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
  metric(container, "Total connected minutes", number((Number(data.total_seconds) || 0) / 60));
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
    ["Connected minutes", number(cost.totalMinutes)],
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
  elements.sessions.replaceChildren();
  for (const session of sessions) {
    const row = document.createElement("tr");
    const values = [session.userIdentifier, session.returning ? "Returning" : "New", session.authenticated ? session.actorType : "Guest", dateTime(session.startedAt), duration(session.connectedSeconds), session.status];
    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    elements.sessions.append(row);
  }
}

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

try {
  const ClerkUI = await loadClerkUI();
  clerk = new Clerk(CLERK.key);
  await clerk.load({ ui: { ClerkUI } });
  clerk.addListener?.(() => void syncAuth());
  await syncAuth();
} catch {
  elements.status.textContent = "Owner authentication is temporarily unavailable.";
}
