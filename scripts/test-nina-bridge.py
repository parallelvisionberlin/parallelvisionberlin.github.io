"""Browser regression tests. Identity, worker and Anam responses are mocked; no paid call is made."""
import asyncio, base64, json, mimetypes, pathlib, time, os
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE = 'https://parallelvisionlabel.com'
WORKER = 'https://parallel-vision-anam-token.parallelvision.workers.dev'
def token(sub='user_test_A', expiry=None):
    body=base64.urlsafe_b64encode(json.dumps({'sub':sub,'exp':expiry or int(time.time())+60}).encode()).decode().rstrip('=')
    return 'eyJhbGciOiJSUzI1NiJ9.'+body+'.TEST_SIGNATURE_NOT_VALID'
SDK='''export const AnamEvent={CONNECTION_ESTABLISHED:'connected',VIDEO_PLAY_STARTED:'video',CONNECTION_CLOSED:'closed',MESSAGE_HISTORY_UPDATED:'history'};
export function createClient(){const listeners={};window.sdkCreates=(window.sdkCreates||0)+1;
return {addListener(k,fn){listeners[k]=fn;},removeListener(){},async streamToVideoElement(){window.sdkStarts=(window.sdkStarts||0)+1;listeners.connected?.();listeners.video?.();},async stopStreaming(){window.sdkStops=(window.sdkStops||0)+1;},getSessionId(){return 'test';}};}'''
MEDIA='''window.micRequests=0;window.micStops=0;Object.defineProperty(navigator,'mediaDevices',{value:{async getUserMedia(){window.micRequests++;const track={kind:'audio',readyState:'live',enabled:true,stop(){this.readyState='ended';window.micStops++;}};return {getAudioTracks(){return [track];},getTracks(){return [track];}};},async enumerateDevices(){return [{kind:'audioinput',deviceId:'test-mic',label:'Test microphone'}];},addEventListener(){}}});'''
async def case(browser, name, account_status=200, account_error=False, balance=30, owner=False, reply=True, sub='user_test_A', call=False):
    context=await browser.new_context(viewport={'width':390,'height':720})
    page=await context.new_page(); messages=[]; requests=[]; errors=[]; tokens=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    async def native(raw):
        data=json.loads(raw);messages.append(data)
        if data['type']=='PV_NINA_TOKEN_REQUEST' and reply:
            value=token(sub);tokens.append(value)
            await page.evaluate('(d)=>window.__PV_NINA_TOKEN_REPLY__(d)',{**data,'token':value})
    await page.expose_function('nativeMessage',native)
    await page.add_init_script("window.ReactNativeWebView={postMessage:s=>window.nativeMessage(s)};"+MEDIA)
    async def route(r):
        u=r.request.url;requests.append((u,r.request.method,r.request.headers.get('authorization','')))
        if u.startswith(WORKER):
            if r.request.method == 'OPTIONS':
                await r.fulfill(status=204,headers={'Access-Control-Allow-Origin':SITE,'Access-Control-Allow-Headers':'authorization,content-type,accept','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS'});return
            assert r.request.headers.get('authorization','').startswith('Bearer '), f'Unauthenticated worker request {u}'
            if u.endswith('/api/account'):
                if account_error: await r.abort();return
                await r.fulfill(status=account_status,headers={'Access-Control-Allow-Origin':SITE},json={'displayName':'Test Account','role':'owner' if owner else 'user','preferences':{},'referral_code':''});return
            if u.endswith('/api/nina/credits'):
                await r.fulfill(headers={'Access-Control-Allow-Origin':SITE},json={'balance':balance,'remainingSeconds':balance*6,'ownerBypass':owner,'lifetimeDebited':0});return
            if u.endswith('/session-token'):
                await r.fulfill(headers={'Access-Control-Allow-Origin':SITE},json={'sessionToken':'MOCK_ANAM_TOKEN','conversationId':'test_conversation','usageSessionId':'test_usage','remainingSeconds':180,'settlementSeconds':30});return
            if '/api/nina/live/' in u:
                await r.fulfill(headers={'Access-Control-Allow-Origin':SITE},json={'status':'ended' if u.endswith('/end') else 'active','balance':30,'remainingSeconds':180,'settlementSeconds':30});return
            if '/api/nina/analytics/start' in u:await r.fulfill(headers={'Access-Control-Allow-Origin':SITE},json={'sessionId':'test_analytics'});return
            await r.fulfill(headers={'Access-Control-Allow-Origin':SITE},json={'ok':True});return
        if u.startswith('https://esm.sh/@anam-ai/'):
            await r.fulfill(body=SDK,content_type='application/javascript',headers={'Access-Control-Allow-Origin':'*'});return
        if 'clerk' in u.lower():
            errors.append('UNEXPECTED CLERK WEB REQUEST: '+u);await r.abort();return
        if u.startswith(SITE):
            path=u.split('?',1)[0][len(SITE):]
            f=ROOT/path.lstrip('/')
            if f.is_file():await r.fulfill(path=str(f),content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream');return
            await r.fulfill(status=404,body='not in test snapshot');return
        await r.abort()
    await page.route('**/*',route)
    await page.goto(SITE+'/nina-app.html?pv_app=1')
    try:
        if account_status==200 and not account_error and reply:
            await page.wait_for_function("document.getElementById('ninaStatus')?.textContent.trim() === 'NINA IS READY' || document.getElementById('startNina')?.textContent === 'GET SIGNAL CREDITS'",timeout=18000)
            assert await page.locator('#ninaOverlay').is_visible()
            assert not await page.locator('#ninaAccess').is_visible()
            assert await page.locator('#pv-app-boot').is_hidden()
            assert await page.evaluate('micRequests')==0, 'Mic requested before Talk'
            assert await page.locator('header.n-nav').count()==0, 'Homepage/navigation leaked into app'
            assert not await page.locator('#closeNina').is_visible()
            assert not await page.locator('#ninaFullscreen').is_visible()
            box=await page.locator('#startNina').bounding_box()
            assert box and box['width']>200 and box['y']>=0 and box['y']+box['height'] <=720, box
            assert not any('PV_NINA_SHOW_PROFILE'==m['type'] for m in messages)
            if owner: assert 'OWNER SIGNAL' in await page.locator('#ninaEligibilityStatus').inner_text()
            if balance==0 and not owner:assert await page.locator('#startNina').inner_text()=='GET SIGNAL CREDITS'
            if call:
                await page.locator('#startNina').click()
                await page.wait_for_function("document.getElementById('ninaStatus').textContent==='NINA ONLINE'")
                assert await page.evaluate('micRequests')==1
                assert await page.evaluate('sdkCreates')==1
                assert len([r for r in requests if r[0].endswith('/api/nina/live/activate') and r[1]=='POST'])==1
                await page.evaluate('window.__PV_NINA_CLOSE__()')
                assert await page.evaluate('micStops')==1
                assert len([r for r in requests if r[0].endswith('/api/nina/live/end') and r[1]=='POST'])==1
                assert len([r for r in requests if r[0].endswith('/memory/conversations/end') and r[1]=='POST'])==1
                assert any(m['type']=='PV_NINA_CLOSED' for m in messages)
            assert await context.cookies()==[], 'Credential persisted in cookies'
            store=await page.evaluate('JSON.stringify({...localStorage})')
            assert all(t not in store for t in tokens), 'Credential persisted in storage'
        else:
            await page.wait_for_function("!document.getElementById('pv-app-retry').hidden",timeout=28000)
            assert await page.locator('#pv-app-boot').is_visible()
            assert not await page.locator('#ninaOverlay').is_visible()
            assert not any(m['type']=='PV_NINA_SHOW_PROFILE' for m in messages), 'Error caused profile bounce'
            assert not any(r[0].endswith('/session-token') for r in requests)
        assert errors==[], errors
        print('PASS',name,flush=True)
    except Exception:
        print('FAIL',name,'errors=',errors,'messages=',messages,'requests=',[(u,m) for u,m,a in requests],flush=True)
        print('Visible message:',await page.locator('#pv-app-message').inner_text(),flush=True)
        await page.screenshot(path='/tmp/nina-browser-failure.png')
        raise
    finally:
        await context.close()
async def main():
    async with async_playwright() as p:
        engine=os.environ.get('BROWSER','chromium')
        b=await getattr(p,engine).launch(headless=True)
        await case(b,'signed-in app opens stage; zero web Clerk requests',call=True)
        await case(b,'zero balance cannot create a call',balance=0)
        await case(b,'owner access is from verified worker response',balance=0,owner=True)
        await case(b,'401 refreshes once then fails without profile loop',account_status=401)
        await case(b,'server 503 exposes retry instead of black screen',account_status=503)
        await case(b,'network failure fails closed without profile loop',account_error=True)
        await case(b,'missing native bridge reply times out visibly',reply=False)
        await b.close()
asyncio.run(main())
