"""Mocked recovery tests. No real account, microphone capture, Anam call or credit use."""
import asyncio, base64, json, mimetypes, os, pathlib, time
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
SITE='https://parallelvisionlabel.com'
WORKER='https://parallel-vision-anam-token.parallelvision.workers.dev'
def token():
    body=base64.urlsafe_b64encode(json.dumps({'sub':'user_recovery_test','exp':int(time.time())+120}).encode()).decode().rstrip('=')
    return 'eyJhbGciOiJSUzI1NiJ9.'+body+'.TEST_SIGNATURE_NOT_VALID'
MEDIA='''window.micCalls=[];window.micStops=0;
const capture=async constraints=>{window.micCalls.push(constraints);
 if(window.micFailure)throw Object.assign(new Error('do-not-expose-secret@example.com'),{name:'NotAllowedError'});
 const track={readyState:'live',enabled:true,kind:'audio',stop(){this.readyState='ended';window.micStops++;}};
 return {getAudioTracks(){return [track];},getTracks(){return [track];}};};
window.originalCapture=capture;
Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:capture,
getSupportedConstraints(){return {echoCancellation:true,noiseSuppression:true,autoGainControl:true,voiceIsolation:true,sampleRate:true};},
async enumerateDevices(){return [{kind:'audioinput',deviceId:'fixture',label:'Mock microphone'}];},addEventListener(){}}});'''
SDK='''export const AnamEvent={CONNECTION_ESTABLISHED:'connected',VIDEO_PLAY_STARTED:'video',CONNECTION_CLOSED:'closed',MESSAGE_HISTORY_UPDATED:'history'};
export function createClient(){const listeners={};return {
 addListener(k,fn){listeners[k]=fn;},removeListener(){},getSessionId(){return 'fixture';},
 async streamToVideoElement(){if(window.sdkFailure)throw Object.assign(new Error('secret=do-not-expose'),{name:'Error'});listeners.connected?.();listeners.video?.();},
 async stopStreaming(){} };}'''
async def scenario(browser,mode):
    context=await browser.new_context(viewport={'width':390,'height':650})
    page=await context.new_page();messages=[];errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    async def native(raw):
        message=json.loads(raw);messages.append(message)
        if message['type']=='PV_NINA_TOKEN_REQUEST':
            await page.evaluate('(d)=>window.__PV_NINA_TOKEN_REPLY__(d)',{**message,'token':token()})
    await page.expose_function('nativeMessage',native)
    await page.add_init_script('window.ReactNativeWebView={postMessage:s=>window.nativeMessage(s)};'+MEDIA+
        f'window.micFailure={str(mode=="microphone").lower()};window.sdkFailure={str(mode=="avatar").lower()};')
    async def route(r):
        u=r.request.url
        if u.startswith(WORKER):
            h={'Access-Control-Allow-Origin':SITE,'Access-Control-Allow-Headers':'authorization,content-type,accept','Access-Control-Allow-Methods':'GET,POST,OPTIONS'}
            if r.request.method=='OPTIONS':await r.fulfill(status=204,headers=h);return
            assert r.request.headers.get('authorization','').startswith('Bearer ')
            if u.endswith('/api/account'):data={'displayName':'Fixture','role':'owner','preferences':{}}
            elif u.endswith('/api/nina/credits'):data={'balance':0,'ownerBypass':True,'lifetimeDebited':0}
            elif u.endswith('/session-token'):
                if mode=='session':
                    await r.fulfill(status=503,headers=h,json={'code':'session_unavailable','error':'sensitive upstream message'});return
                data={'sessionToken':'MOCK','conversationId':'fixture','usageSessionId':'fixture','remainingSeconds':180,'settlementSeconds':30}
            elif '/api/nina/live/' in u:data={'status':'ended' if u.endswith('/end') else 'active','remainingSeconds':180,'settlementSeconds':30,'balance':30}
            else:data={'ok':True}
            await r.fulfill(headers=h,json=data);return
        if u.startswith('https://esm.sh/@anam-ai/'):
            await r.fulfill(body=SDK,content_type='application/javascript',headers={'Access-Control-Allow-Origin':'*'});return
        if 'clerk' in u.lower():errors.append('Unexpected web Clerk request');await r.abort();return
        if u.startswith(SITE):
            path=ROOT/u[len(SITE):].split('?',1)[0].lstrip('/')
            if path.is_file():await r.fulfill(path=str(path),content_type=mimetypes.guess_type(str(path))[0] or 'application/octet-stream');return
            await r.fulfill(status=404,body='fixture missing');return
        await r.abort()
    await page.route('**/*',route)
    await page.goto(SITE+'/nina-app.html')
    await page.wait_for_function("document.getElementById('ninaStatus')?.textContent==='NINA IS READY'")
    assert await page.evaluate('navigator.mediaDevices.getUserMedia === window.originalCapture'), 'capture was replaced'
    assert await page.locator('#pv-call-revision').inner_text()=='RECOVERY 01'
    assert await page.evaluate('window.micCalls.length')==0
    await page.locator('#startNina').click()
    if mode=='success':
        await page.wait_for_function("document.getElementById('ninaStatus').textContent==='NINA ONLINE'")
        assert await page.evaluate('window.micCalls')==[{'audio':True,'video':False}]
        await page.evaluate('window.__PV_NINA_CLOSE__()')
        assert await page.evaluate('window.micStops')==1
    elif mode=='scrim':
        await page.wait_for_function("document.getElementById('ninaStatus').textContent==='NINA ONLINE'")
        await page.evaluate("async()=>{const e=await import('./js/nina-access.js?v=recovery01');await e.stopNinaSession();e.showNinaFailure('Fixture failure');}")
        assert await page.locator('.nina-intro').is_hidden()
        assert await page.locator('#ninaScrimMessage').is_visible()
        button=page.locator('#ninaScrimButton');box=await button.bounding_box()
        assert box and box['height']>=48 and box['y']>=0 and box['y']+box['height']<=650
        hit=await button.evaluate('(e)=>{let r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}')
        assert hit,'Retry is covered by the portrait'
        await button.click()
        await page.wait_for_function("document.getElementById('ninaStatus').textContent==='NINA ONLINE'")
    else:
        await page.wait_for_function("!document.getElementById('pv-app-retry').hidden")
        text=await page.locator('#pv-app-message').inner_text()
        expected={'microphone':'MICROPHONE / NotAllowedError','session':'CONNECTION SERVICE / Error / session_unavailable / HTTP 503','avatar':'AVATAR STREAM / Error'}[mode]
        assert expected in text,text
        assert 'do-not-expose' not in text and 'sensitive' not in text
        assert await page.locator('#pv-app-message').is_visible()
        assert not any(m['type']=='PV_NINA_SHOW_PROFILE' for m in messages)
        await page.locator('#pv-app-retry').click()
        assert any(m['type']=='PV_NINA_RETRY' for m in messages)
    assert not errors,errors
    print('PASS',mode,flush=True)
    await context.close()
async def main():
    async with async_playwright() as p:
        engine=os.environ.get('BROWSER','chromium')
        browser=await getattr(p,engine).launch(headless=True)
        for mode in ['success','microphone','session','avatar','scrim']:await scenario(browser,mode)
        await browser.close()
asyncio.run(main())
