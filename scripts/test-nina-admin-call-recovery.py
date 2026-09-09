"""Offline browser regression checks. Only synthetic fixtures, no production access."""
import json
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
CALL_A = "11111111-1111-4111-8111-111111111111"
CALL_B = "22222222-2222-4222-8222-222222222222"
START = "2026-09-09T09:30:00.000Z"
END = "2026-09-09T09:33:00.000Z"


def session(id_, name, role="public"):
    return dict(id=id_, displayName=name, email=name.lower().replace(" ", "-") + "@example.invalid",
                userIdentifier="U-" + id_[:10], authenticated=True, actorType=role, returning=False,
                startedAt=START, lastSeenAt=END, endedAt=END, connectedSeconds=180,
                rawStatus="ended", status="ENDED · CONVERSATION RECORDED", userMessages=2, personaMessages=2)


SESSIONS = [session(CALL_A, "Example Visitor"), session(CALL_B, "Example Owner", "owner")]
METRICS = dict(unique_users=2, sessions=2, currently_active=0, total_seconds=360, average_seconds=180,
               longest_seconds=180, new_users=2, returning_users=0)
DASHBOARD = dict(generatedAt=END, activeWindowSeconds=90, ranges=dict(today=METRICS, days7=METRICS, days30=METRICS),
                 funnel={key: dict(available=True, value=0) for key in ["pageViews", "talkToNinaSessions", "accountSignups", "checkoutStarts", "purchases"]},
                 cost=dict(totalMinutes=6, pricePerMinute=None, estimatedAnamCost=None), sessions=SESSIONS)


def detail(id_):
    s = next(item for item in SESSIONS if item["id"] == id_)
    return dict(session=s, conversation=dict(id="conversation-" + id_, startedAt=START, endedAt=END),
                userMessages=2, ninaMessages=2, qualificationAvailable=True, qualified=False,
                live=dict(id="live-" + id_, status="ended", creditsAtStart=30, creditsDebited=5),
                creditAccount=dict(balance=25), purchases=[], userHistory=[], warnings=[],
                detailAvailability=dict(live=True, credits=True, creditEvents=True, purchases=True, history=True, qualification=True),
                transcript=[dict(role="nina", content="Hello from " + s["displayName"], createdAt=START),
                            dict(role="user", content="Tell me about Berlin.", createdAt=START),
                            dict(role="nina", content="A synthetic test reply.", createdAt=END),
                            dict(role="user", content="<img src=x onerror=alert(1)>", createdAt=END)])


BOOT = r"""({mode, dashboard, details, callA}) => {
  window.__internal_ClerkUICtor = function(){};
  window.Clerk = class {
    constructor(){this.isSignedIn=true;this.session={id:'test-owner-session',getToken:async()=> 'fake-owner-token'};window.testClerk=this;}
    async load(){} addListener(fn){this.listener=fn;} openSignIn(){}
    async signOut(){this.isSignedIn=false;this.session=null;}
  };
  window.testMode = mode;
  window.testRequests = [];
  window.testHeld = [];
  window.releaseHeld = () => window.testHeld.shift()?.();
  window.fetch = async (url, options={}) => {
    const parsed = new URL(url);
    const response = (data, status=200) => new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json'}});
    if(parsed.pathname === '/api/signal-credits/admin') return response({grants:[],vouchers:[]});
    if(parsed.pathname !== '/api/nina/analytics/dashboard') throw Error('Unexpected network request');
    const id = parsed.searchParams.get('session');
    if(!id) return response(dashboard);
    window.testRequests.push(id);
    if(window.testMode === 'hold' && id === callA) return new Promise((resolve,reject)=> {
      window.testHeld.push(()=>resolve(response(details[id])));
      options.signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});
    });
    if(window.testMode === 'error' && id === callA) return response({error:'Call details unavailable'},503);
    const data = structuredClone(details[id]);
    if(window.testMode === 'partial') {
      data.warnings=[{section:'purchases',code:'read_failed'},{section:'qualification',code:'schema_unavailable'}];
      data.detailAvailability.purchases=false;
      data.qualificationAvailable=false;
      data.qualified=null;
    }
    return response(data);
  };
}"""


def run_checks(browser, width):
    context = browser.new_context(viewport={"width": width, "height": 950})
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    html = (ROOT / "nina-admin/index.html").read_text()
    html = re.sub(r'<script\b[^>]*>.*?</script>', '', html, flags=re.S | re.I)
    html = re.sub(r'<link\b[^>]*>', '', html, flags=re.I)
    js = (ROOT / "js/nina-admin.js").read_text().split("\n", 1)[1]
    js = "const Clerk = window.Clerk;\n" + js

    def fresh(mode="normal"):
        page.goto("about:blank")
        page.set_content(html)
        page.add_style_tag(content=(ROOT / "css/nina-admin.css").read_text())
        page.evaluate(BOOT, dict(mode=mode, dashboard=DASHBOARD, details={id_: detail(id_) for id_ in [CALL_A, CALL_B]}, callA=CALL_A))
        page.add_script_tag(type="module", content=js)
        expect(page.locator("#adminDashboard")).to_be_visible()

    def set_mode(mode):
        page.evaluate("mode => window.testMode = mode", mode)

    def count(id_):
        return page.evaluate("id => window.testRequests.filter(item=>item===id).length", id_)

    def toggle(id_):
        return page.locator("#call-toggle-" + id_)

    def panel(id_):
        return page.locator("#call-panel-" + id_)

    fresh()
    toggle(CALL_A).click()
    expect(panel(CALL_A)).to_contain_text("Hello from Example Visitor")
    assert count(CALL_A) == 1, "one detail request per open"
    assert panel(CALL_A).locator("img").count() == 0, "transcripts must be text, not HTML"
    expect(toggle(CALL_A)).to_have_attribute("aria-expanded", "true")
    toggle(CALL_A).click()
    expect(panel(CALL_A)).to_have_count(0)
    expect(toggle(CALL_A)).to_have_attribute("aria-expanded", "false")
    toggle(CALL_A).click()
    expect(panel(CALL_A)).to_contain_text("Hello from Example Visitor")
    assert count(CALL_A) == 1, "reuse a fresh successful result"
    panel(CALL_A).locator(".admin-call-name-toggle").click()
    expect(panel(CALL_A)).to_have_count(0)
    toggle(CALL_A).focus()
    page.keyboard.press("Enter")
    expect(panel(CALL_A)).to_contain_text("Tell me about Berlin.")
    toggle(CALL_A).focus()
    page.keyboard.press("Space")
    expect(panel(CALL_A)).to_have_count(0)
    toggle(CALL_A).click()
    toggle(CALL_B).click()
    expect(panel(CALL_A)).to_have_count(0)
    expect(panel(CALL_B)).to_contain_text("Hello from Example Owner")
    expect(panel(CALL_B)).to_contain_text("Unmetered")
    panel(CALL_B).get_by_role("button", name="Close", exact=True).click()
    expect(panel(CALL_B)).to_have_count(0)

    fresh("error")
    toggle(CALL_A).click()
    expect(panel(CALL_A)).to_contain_text("This does not mean the transcript is missing.")
    assert count(CALL_A) == 1
    set_mode("normal")
    panel(CALL_A).get_by_role("button", name="Retry call").click()
    expect(panel(CALL_A)).to_contain_text("Hello from Example Visitor")
    assert count(CALL_A) == 2, "failed responses must not be cached"

    fresh("partial")
    toggle(CALL_A).click()
    expect(panel(CALL_A)).to_contain_text("Hello from Example Visitor")
    expect(panel(CALL_A)).to_contain_text("Some details are unavailable")
    expect(panel(CALL_A).locator(".admin-call-stats")).to_contain_text("Unavailable")
    assert "None recorded" not in panel(CALL_A).locator(".admin-call-stats").inner_text()
    set_mode("normal")
    panel(CALL_A).get_by_role("button", name="Retry details").click()
    expect(panel(CALL_A).locator(".admin-call-notice")).to_have_count(0)

    fresh("hold")
    toggle(CALL_A).click()
    expect(panel(CALL_A)).to_contain_text("Loading call")
    assert page.evaluate("window.testHeld.length") == 1
    toggle(CALL_A).click()
    page.evaluate("window.releaseHeld()")
    page.wait_for_timeout(50)
    expect(panel(CALL_A)).to_have_count(0)

    fresh("hold")
    toggle(CALL_A).click()
    toggle(CALL_B).click()
    expect(panel(CALL_B)).to_contain_text("Hello from Example Owner")
    assert page.evaluate("window.testHeld.length") == 1
    page.evaluate("window.releaseHeld()")
    page.wait_for_timeout(50)
    expect(panel(CALL_A)).to_have_count(0)
    assert "Hello from Example Visitor" not in panel(CALL_B).inner_text()

    fresh()
    toggle(CALL_A).click()
    expect(panel(CALL_A)).to_contain_text("Hello from Example Visitor")
    screenshot_dir = os.environ.get("NINA_TEST_SCREENSHOTS")
    if screenshot_dir:
        Path(screenshot_dir).mkdir(parents=True, exist_ok=True)
        panel(CALL_A).screenshot(path=str(Path(screenshot_dir) / f"call-recovery-{width}.png"))
    page.locator("#adminSignOut").click()
    expect(page.locator("#adminDashboard")).to_be_hidden()
    expect(page.locator("#adminSessions")).to_be_empty()
    assert not errors, errors
    print(f"PASS {width}px: name/header toggle, Enter/Space, one request, retry, partial data, race safety, XSS and sign-out")
    context.close()


if __name__ == "__main__":
    with sync_playwright() as p:
        options = {"headless": True}
        executable = os.environ.get("CHROMIUM_PATH")
        if executable:
            options["executable_path"] = executable
        browser = p.chromium.launch(**options)
        try:
            for width in (1280, 390):
                run_checks(browser, width)
        finally:
            browser.close()
