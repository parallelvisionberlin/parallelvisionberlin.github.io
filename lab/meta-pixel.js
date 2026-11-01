// PV LAB's own Meta dataset. Not Nina's Pixel. Never load Meta until opt-in.
export const PV_LAB_PIXEL_ID = '1087722353874433';
const CHOICE_KEY = 'pv-lab-meta-consent-v1';
let choice = '';
try { choice = localStorage.getItem(CHOICE_KEY) || ''; } catch {}
let initialized = false;
let dialog = null;

export function metaConsentGranted() { return choice === 'granted'; }
export function trackLabEvent(name, details = {}) {
  if (!metaConsentGranted() || !initialized || typeof window.fbq !== 'function') return false;
  if (typeof name !== 'string' || !/^(?:PageView|ViewContent|CompleteRegistration|InitiateCheckout)$/.test(name)) return false;
  window.fbq('track', name, details);
  return true;
}
export function trackLabRegistration(subject, createdAt) {
  if (!metaConsentGranted() || typeof subject !== 'string' || !/^user_[a-zA-Z0-9]+$/.test(subject)) return false;
  if (!Number.isSafeInteger(createdAt) || createdAt > Date.now() + 30000 || Date.now() - createdAt > 10 * 60000) return false;
  const key = 'pv-lab-registered-' + subject;
  try { if (localStorage.getItem(key) === 'sent') return false; } catch {}
  if (!trackLabEvent('CompleteRegistration', {content_name:'PV LAB account'})) return false;
  try { localStorage.setItem(key, 'sent'); } catch {}
  return true;
}
function bootPixel() {
  if (!metaConsentGranted() || initialized) return;
  initialized = true;
  if (!window.fbq) {
    (function(f,b,e,v,n,t,s){
      n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
      t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s);
    })(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  }
  window.fbq('consent','grant');
  window.fbq('init',PV_LAB_PIXEL_ID);
  window.fbq('track','PageView');
}
function applyChoice(next) {
  if (next !== 'granted' && next !== 'denied') return;
  const previous = choice;
  choice = next;
  try { localStorage.setItem(CHOICE_KEY, next); } catch {}
  if (next === 'granted') {
    if (initialized && previous !== 'granted' && typeof window.fbq === 'function') {
      window.fbq('consent','grant');
      window.fbq('track','PageView');
    } else bootPixel();
  }
  else if (initialized && typeof window.fbq === 'function') window.fbq('consent','revoke');
  dialog?.remove();
  dialog = null;
}
function showChoices() {
  if (dialog) return;
  dialog = document.createElement('section');
  dialog.id = 'pv-lab-meta-consent';
  dialog.setAttribute('aria-label','Optional advertising measurement');
  dialog.setAttribute('role','region');
  const standalone = /^(?:www\.)?pvlab\.studio$/.test(location.hostname.toLowerCase()) || location.hostname.toLowerCase() === 'pvlab-studio.pages.dev';
  const privacyPath = standalone ? '/privacy/' : '/lab/privacy/';
  dialog.innerHTML = '<p>PV LAB uses optional Meta analytics to understand visits and purchases. You can decline and still use the studio. <a href="' + privacyPath + '">Privacy</a></p><div><button type="button" data-choice="denied">Decline</button><button type="button" data-choice="granted">Allow analytics</button></div>';
  dialog.style.cssText='position:fixed;bottom:16px;left:16px;z-index:2147483000;box-sizing:border-box;max-width:min(430px,calc(100vw - 32px));padding:16px 18px;background:#212225;color:#f0f0ec;border:1px solid #55585b;border-radius:13px;box-shadow:0 8px 32px #0008;font:13px/1.5 Arial,sans-serif';
  dialog.querySelector('p').style.cssText='margin:0 0 12px';
  dialog.querySelector('a').style.cssText='color:#f0f0ec;text-decoration:underline';
  dialog.querySelector('div').style.cssText='display:flex;flex-wrap:wrap;gap:8px';
  for (const button of dialog.querySelectorAll('button')) {
    button.style.cssText='border:1px solid #777b7d;border-radius:7px;padding:8px 12px;cursor:pointer;font:600 12px Arial,sans-serif;background:#36393d;color:#fff';
    if (button.dataset.choice === 'granted') button.style.cssText+=';background:#f0f0ec;color:#171819';
    button.addEventListener('click', () => applyChoice(button.dataset.choice));
  }
  // Consent choices are shown only when the visitor explicitly opens Privacy choices.
  // Never inject a consent panel into the Mood editor or over its controls.
  document.body.append(dialog);
}
export function isLabMarketingLanding(pathname, hostname) {
  const host = String(hostname || '').toLowerCase();
  const standalone = host === 'pvlab.studio' || host === 'www.pvlab.studio' || host === 'pvlab-studio.pages.dev';
  return /^\/lab\/(?:index\.html)?$/.test(pathname) || (standalone && /^\/(?:index\.html)?$/.test(pathname));
}
export function isLabCampaignLanding(pathname,hostname,search='') {
  const host=String(hostname||'').toLowerCase();
  const standalone=host==='pvlab.studio'||host==='www.pvlab.studio'||host==='pvlab-studio.pages.dev';
  if(!standalone||!/^\/moods\/?$/.test(String(pathname||'')))return false;
  const params=new URLSearchParams(search);
  return params.get('mood')==='berlin-rave'&&params.get('campaign')==='berlin-rave';
}
function init() {
  if (choice === 'granted') bootPixel();
  // No automatic consent banner on marketing pages, campaigns or the Studio.
  // Privacy choices below is the persistent, visitor-initiated opt-in/out control.
  // A lasting preference control permits changing consent later, including withdrawing it.
  const anchor = document.querySelector('.pv-lab-footer__group[aria-label="Legal"]') || document.querySelector('footer nav') || document.querySelector('footer');
  const preferences = document.createElement('button');
  preferences.type = 'button';
  preferences.textContent = 'Privacy choices';
  preferences.setAttribute('aria-label','Change PV LAB analytics consent');
  preferences.style.cssText=anchor?.classList?.contains('pv-lab-footer__group') ? 'border:0;background:transparent;color:#b7b3ac;font:400 13px/1.3 "DM Sans",Arial,sans-serif;cursor:pointer;text-align:left;padding:0' : 'border:0;background:transparent;color:inherit;font:inherit;font-size:11px;cursor:pointer;text-decoration:underline;padding:5px';
  preferences.addEventListener('click', () => {
    if (dialog) return;
    showChoices();
  });
  if (anchor) anchor.append(preferences);
  else {
    preferences.style.cssText += ';position:fixed;right:10px;bottom:5px;z-index:2147482000;background:#202126;color:#efefef;border-radius:4px;opacity:.7';
    document.body.append(preferences);
  }
}
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
}
