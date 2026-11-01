// PV LAB's own Meta dataset. Not Nina's Pixel. Never load Meta until opt-in.
export const PV_LAB_PIXEL_ID = '1087722353874433';
const CHOICE_KEY = 'pv-lab-meta-consent-v1';
let choice = '';
try { choice = localStorage.getItem(CHOICE_KEY) || ''; } catch {}
let initialized = false;
let dialog = null;
let pendingRegistration = null;

export function metaConsentGranted() { return choice === 'granted'; }
// Browser identifiers are forwarded to Stripe only after an explicit choice.
export function metaPixelIdentifiers() {
  if (!metaConsentGranted() || typeof document === 'undefined') return {};
  const cookies = Object.fromEntries(document.cookie.split(';').map(part=>{
    const at=part.indexOf('=');return at<0?['','']:[part.slice(0,at).trim(),part.slice(at+1).trim()];
  }));
  const fbp=cookies._fbp||'',fbc=cookies._fbc||'';
  return {
    ...(/^fb\.1\.\d{10,16}\.\d{1,30}$/.test(fbp)?{fbp}:{}),
    ...(/^fb\.1\.\d{10,16}\.[A-Za-z0-9._-]{5,256}$/.test(fbc)?{fbc}:{})
  };
}
export function trackLabEvent(name, details = {}) {
  if (!metaConsentGranted() || !initialized || typeof window.fbq !== 'function') return false;
  if (typeof name !== 'string' || !/^(?:PageView|ViewContent|CompleteRegistration|InitiateCheckout)$/.test(name)) return false;
  window.fbq('track', name, details);
  return true;
}
export function trackLabRegistration(subject, createdAt) {
  if (typeof subject !== 'string' || !/^user_[a-zA-Z0-9]+$/.test(subject)) return false;
  if (!Number.isSafeInteger(createdAt) || createdAt > Date.now() + 30000 || Date.now() - createdAt > 10 * 60000) return false;
  if (!metaConsentGranted()) { pendingRegistration={subject,createdAt}; return false; }
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
  if (next === 'granted' && pendingRegistration) {
    const registration=pendingRegistration;pendingRegistration=null;
    trackLabRegistration(registration.subject,registration.createdAt);
  }
  if (next === 'denied') pendingRegistration=null;
  dialog?.remove();
  dialog = null;
}
function showChoices() {
  if (dialog) return;
  dialog = document.createElement('section');
  dialog.id = 'pv-lab-meta-consent';
  dialog.setAttribute('aria-label','Cookies');
  dialog.setAttribute('role','region');
  const standalone = /^(?:www\\.)?pvlab\\.studio$/.test(location.hostname.toLowerCase()) || location.hostname.toLowerCase() === 'pvlab-studio.pages.dev';
  const privacyPath = standalone ? '/privacy/' : '/lab/privacy/';
  dialog.innerHTML = '<strong>Cookies</strong><p>Optional cookies help us measure ads. <a href="' + privacyPath + '">Privacy</a></p><div class="pv-cookie-actions"><button type="button" data-choice="denied">Reject</button><button type="button" data-settings aria-expanded="false">Settings</button><button type="button" data-choice="granted">Accept</button></div><p class="pv-cookie-details" hidden>Required storage keeps accounts working. With your permission, Meta Pixel measures visits, registrations and checkout starts. Verified purchases may be measured through Meta Conversions API. Rejecting does not limit PV LAB.</p>';
  dialog.style.cssText='position:fixed;bottom:16px;left:16px;z-index:2147483000;box-sizing:border-box;max-width:min(370px,calc(100vw - 32px));padding:13px 15px;background:#17191c;color:#f0f0ec;border:1px solid #494e53;border-radius:11px;box-shadow:0 12px 35px #0007;font:12px/1.4 "DM Sans",Arial,sans-serif';
  dialog.querySelector('strong').style.cssText='display:block;font-size:13px;font-weight:600;margin:0 0 5px';
  dialog.querySelectorAll('p').forEach(el=>el.style.cssText='margin:0 0 9px;font-size:11px;line-height:1.45');
  dialog.querySelector('a').style.cssText='color:inherit;text-decoration:underline';
  dialog.querySelector('.pv-cookie-actions').style.cssText='display:flex;gap:6px;align-items:center;flex-wrap:wrap';
  for (const button of dialog.querySelectorAll('button')) {
    button.style.cssText='border:1px solid #747981;border-radius:6px;padding:7px 10px;cursor:pointer;font:600 11px "DM Sans",Arial,sans-serif;background:#262a30;color:#fff';
    if (button.dataset.choice === 'granted') button.style.cssText+=';background:#f0f0ec;color:#171819;border-color:#f0f0ec';
    if (button.dataset.choice) button.addEventListener('click',()=>applyChoice(button.dataset.choice));
  }
  dialog.querySelector('[data-settings]').addEventListener('click',event=>{
    const details=dialog.querySelector('.pv-cookie-details');
    details.hidden=!details.hidden;
    event.currentTarget.setAttribute('aria-expanded',String(!details.hidden));
  });
  // A native modal is top-layer; a cookie choice on the page behind it is inaccessible.
  // The campaign uses a compact cookie strip in the empty header space, not in Generate.
  const moodDialog=isLabCampaignLanding(location.pathname,location.hostname,location.search)
    ? document.getElementById('mc-look-dialog') : null;
  if (moodDialog) {
    dialog.classList.add('pv-cookies-on-deck');
    moodDialog.append(dialog);
  } else document.body.append(dialog);
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
  // Ask once on marketing and paid campaign entry. Never auto-enable Meta.
  else if (!choice && (isLabMarketingLanding(location.pathname, location.hostname) || isLabCampaignLanding(location.pathname, location.hostname, location.search))) showChoices();
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
