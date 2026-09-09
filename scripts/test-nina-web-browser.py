# Offline Chromium regression tests. All auth/media/payment endpoints are mocked.
# Requires Python playwright and Chromium; no real customer data or payments.
import re,json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
out=Path(__import__('os').environ.get('NINA_TEST_ARTIFACTS','/tmp/nina-web-tests'));out.mkdir(parents=True,exist_ok=True)
html=(root/'index.html').read_text();html=re.sub(r'<script\b[^>]*>[\s\S]*?</script>','',html,flags=re.I)
html=re.sub(r'<(link|img|source|iframe)\b[^>]*>','',html,flags=re.I)
html=html.replace('</head>','<style>'+(root/'css/nina-access.css').read_text()+'</style></head>')
helper=(root/'js/nina-web-flow.js').read_text().replace('export function','function')
source=(root/'js/nina-access.js').read_text()
source=re.sub(r'^import .*?;\s*','',source,flags=re.M)
source=source.replace('const { Clerk } = await import("https://esm.sh/@clerk/clerk-js@6?bundle");','const Clerk = class { constructor(){return window.testClerk} };')
source=source.replace('export async function','async function');source=re.sub(r'^export \{.*?\};','',source,flags=re.M)
source=source.replace('window.location','testLocation');source=re.sub(r'(?<![\w.])location\.', 'testLocation.',source)
trialmodule=(root/'js/nina-trial-promotion.js').read_text()

# Keep actual trial promotion code, with local environment substitutions.
trialmodule=trialmodule.replace('export function','function').replace('export const','const')
trialmodule=trialmodule.replace('window.location','testLocation');trialmodule=re.sub(r'(?<![\w.])location\.', 'testLocation.',trialmodule)
setup=r'''
crypto.randomUUID=()=> '44444444-4444-4444-8444-444444444444';
const testLocation=new URL('https://parallelvisionlabel.com/index.html');
testLocation.assign=url=>{window.assigned=url}; testLocation.replace=url=>{window.replaced=url};
const makeStorage=()=>{const data=new Map();return {getItem(k){return data.get(k)??null},setItem(k,v){data.set(k,String(v))},removeItem(k){data.delete(k)}}};
Object.defineProperty(window,'localStorage',{value:makeStorage(),configurable:true});Object.defineProperty(window,'sessionStorage',{value:makeStorage(),configurable:true});
window.history.replaceState=()=>{};window.__internal_ClerkUICtor=function(){};window.requests=[];window.events=[];window.fbq=(...args)=>events.push(args);
window.mockMedia={getAudioTracks(){return [{readyState:'live',stop(){}}]},getTracks(){return this.getAudioTracks()}};
Object.defineProperty(navigator,'mediaDevices',{value:{async getUserMedia(){return mockMedia},async enumerateDevices(){return [{kind:'audioinput',deviceId:'default',label:'Microphone'}]},addEventListener(){}}});
HTMLMediaElement.prototype.play=async function(){if(window.failPlay)throw new Error('blocked')}; HTMLMediaElement.prototype.pause=function(){};
Object.defineProperty(HTMLMediaElement.prototype,'srcObject',{set(v){this._src=v},get(){return this._src}});
window.testClerk={isSignedIn:true,user:{id:'normal-user',fullName:'Test',reload:async()=>testClerk.user},session:{getToken:async()=>'token'},async load(){},addListener(fn){this.listener=fn},closeSignIn(){},closeSignUp(){},client:{signIn:{authenticateWithRedirect:async()=>{},create:async()=>({})}},async openSignUp(){this.openedSignup=true},async openSignIn(){}};
const AnamEvent={CONNECTION_ESTABLISHED:'connected',VIDEO_PLAY_STARTED:'playing',CONNECTION_CLOSED:'closed',MESSAGE_HISTORY_UPDATED:'history'};
function createClient(){const c={handlers:{},addListener(k,f){(this.handlers[k]??=[]).push(f)},removeListener(k,f){this.handlers[k]=(this.handlers[k]||[]).filter(x=>x!==f)},getActiveSessionId(){return 'sdk1'},emit(k,arg){for(const f of this.handlers[k]||[])f(arg)},async streamToVideoElement(){this.emit('connected');this.emit('playing')},async stopStreaming(){}};window.testClient=c;return c}
window.fetch=async(url,options={})=>{requests.push({url:String(url),body:options.body});let data={};
 if(String(url).includes('/session-token'))data={sessionToken:'t',conversationId:'22222222-2222-4222-8222-222222222222',usageSessionId:'33333333-3333-4333-8333-333333333333',balance:30,remainingSeconds:180,settlementSeconds:30,trialActivationPending:true};
 else if(String(url).includes('/credits/checkout'))return new Response(JSON.stringify({error:'Synthetic provider failure'}),{status:502});
 else if(String(url).includes('/credits/history'))data={transactions:window.paymentVerified?[{source:'stripe_checkout',type:'credit',createdAt:new Date().toISOString()}]:[]};
 else if(String(url).includes('/credits'))data={balance:window.paymentVerified?90:30,remainingSeconds:180,ownerBypass:false};
 else if(String(url).includes('/live/ready'))data={trialActivationPending:true};
 else if(String(url).includes('/live/activate'))data={remainingSeconds:180,settlementSeconds:30,status:'active'};
 else if(String(url).includes('/live/end'))data={remainingSeconds:180,balance:30,status:'ended'};
 else if(String(url).includes('/analytics/start'))data={sessionId:'test-analytics'};
 return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
};
'''
# Make lexical helpers testable without touching production exports.
end='''window.testState=()=>({action:ninaScrimAction,pending:ninaCreditsPurchasePending,web:NINA_WEB_FLOW,disabled:ninaScrimButton.disabled});window.testOpen=openNinaExperience; window.testEnd=showSignalEnded; window.testConnect=connectNina;window.testAuthResume=resumeNinaWebAuth;window.testPurchaseReturn=handleSignalCreditReturn;window.testLocation=testLocation;window.testStoreAuth=storeNinaAuthReturn;window.testPurchase=()=>{testLocation.search='?ninaCredits=success'; sessionStorage.setItem('nina_signal_credit_checkout_v1',JSON.stringify({balance:30,startedAt:new Date().toISOString()}));};'''
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=__import__('os').environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 for width,height in [(390,844),(1280,900)]:
  page=browser.new_page(viewport={'width':width,'height':height});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='domcontentloaded');page.evaluate(setup+'\n'+trialmodule+'\n'+helper+'\n'+source+'\n'+end)
  page.evaluate('testOpen()');page.wait_for_timeout(200)
  page.evaluate('testConnect()');page.wait_for_selector('.nina-web-audio-check:not([hidden])')
  assert page.evaluate("requests.filter(x=>x.url.includes('/live/activate')).length")==0
  page.evaluate("testClient.emit('history',[{id:'greet',role:'persona',content:'Hi'},{id:'u1',role:'user',content:'Hello'}])")
  page.wait_for_timeout(100);assert page.evaluate("requests.filter(x=>x.url.includes('/live/activate')).length")==0
  page.wait_for_timeout(1200);page.screenshot(path=str(out/f'nina-sound-check-{width}.png'))
  page.evaluate('window.failPlay=true');page.locator('[data-nina-heard]').click(force=True);page.wait_for_timeout(100)
  assert page.evaluate("requests.filter(x=>x.url.includes('/live/activate')).length")==0
  page.evaluate('window.failPlay=false');page.locator('[data-nina-heard]').click(force=True);page.wait_for_timeout(150)
  assert page.evaluate("requests.filter(x=>x.url.includes('/live/activate')).length")==1
  page.locator('[data-nina-audio-help]').click(force=True);page.wait_for_selector('#ninaScrimButton:has-text("TRY AGAIN")')
  assert page.evaluate("requests.some(x=>x.url.includes('/live/end'))")
  assert page.locator('.nina-web-audio-check').count()==0
  page.evaluate('testEnd()');page.wait_for_timeout(450)
  page.screenshot(path=str(out/f'nina-continuation-{width}.png'))
  assert '6 MIN' in page.locator('#ninaScrimButton').inner_text()
  page.locator('#ninaScrimButton').click();page.wait_for_timeout(200)
  checkout=page.evaluate("requests.filter(x=>x.url.includes('/credits/checkout')).at(-1)")
  assert checkout and json.loads(checkout['body'])['packId']=='signal_60'
  assert page.locator('.nina-credits-purchase-status').text_content()=='Checkout unavailable. Please try again.'
  # Pure auth resume uses the real production listener and stored return intent.
  page.evaluate("testLocation.search=''; document.getElementById('ninaOverlay').classList.remove('is-open');testStoreAuth('signal');testClerk.listener()")
  page.wait_for_timeout(150);assert page.locator('#ninaOverlay').evaluate("el=>el.classList.contains('is-open')")
  assert page.evaluate("sessionStorage.getItem('nina_auth_return_v1')") is None
  page.evaluate("window.paymentVerified=false;testPurchase();testPurchaseReturn()")
  page.wait_for_timeout(5900)
  assert page.locator('#ninaCreditsPurchaseTitle').text_content()=='Payment Not Yet Confirmed'
  assert not page.locator('[data-return-nina]').is_visible()
  page.evaluate("window.paymentVerified=true;testPurchase();testPurchaseReturn()")
  page.wait_for_timeout(300)
  assert page.locator('#ninaCreditsPurchaseTitle').text_content()=='Signal Credits Added'
  assert page.locator('[data-return-nina]').is_visible()
  page.locator('[data-return-nina]').click();page.wait_for_timeout(200)
  assert page.locator('#ninaOverlay').evaluate("el=>el.classList.contains('is-open')")
  assert page.locator('.nina-credits-purchase').is_hidden()
  assert not errors,errors
  results.append({'width':width,'checks':['no billing before output confirmation','rejected play does not bill','activation once after confirmation and speech','audio help stops and cleans up','continuation requests 6-minute checkout','provider failure shown in modal','same-page signup resumes Nina','unverified checkout never claims paid','verified added credits show Return to Nina'],'passed':True})
  page.close()
 browser.close()
print(json.dumps(results,indent=2));(out/'results.json').write_text(json.dumps(results,indent=2))
