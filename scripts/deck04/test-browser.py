import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
CSS=Path('css/nina-deck04.css').read_text()
JS=Path('js/nina-deck04.js').read_text().replace('export function installNinaDeck','function installNinaDeck')
async def run():
 results=[]
 async with async_playwright() as p:
  for name in ['chromium','webkit']:
   browser=await getattr(p,name).launch()
   for width,height in [(390,740),(320,520),(430,800)]:
    page=await browser.new_page(viewport={'width':width,'height':height})
    page.set_default_timeout(7000)
    # Like the production pre-call intro, the start control sits above the video.
    html='<html><head><style>html,body{margin:0;height:100%;background:#030404}#ninaOverlay,.nina-stage{position:absolute;inset:0}#startNina{position:relative;z-index:5;font-size:16px}'+CSS+'</style></head><body><div id="ninaOverlay"><div class="nina-stage"><video id="nina-anam-video"></video><button id="startNina">Start</button></div></div></body></html>'
    await page.route('**/*',lambda r:r.fulfill(status=200,content_type='text/html',body=html) if '/nina-app.html' in r.request.url else r.fulfill(status=200,body=''))
    await page.goto('https://parallelvisionlabel.com/nina-app.html?pv_deck=04')
    await page.evaluate('''() => {window.captureCalls=0;window.stopCalls=0;window.audioCalls=0;window.sample=.08;window.track={readyState:'live',enabled:true,muted:false,stop(){window.stopCalls++}};window.stream={getAudioTracks(){return [window.track]}};navigator.mediaDevices.getUserMedia=()=>{window.captureCalls++;throw Error('Unexpected capture')};window.AudioContext=class{constructor(){window.audioCalls++;this.state='running'}createMediaStreamSource(){return {connect(){},disconnect(){}}}createAnalyser(){return {fftSize:256,getFloatTimeDomainData(a){a.fill(window.sample)},disconnect(){}}}close(){return Promise.resolve()}};}''')
    await page.add_script_tag(content=JS+'\nwindow.deck=installNinaDeck({getStream:()=>window.stream});')
    assert await page.evaluate('captureCalls')==0
    assert await page.locator('.pv-deck-controls').is_hidden()
    await page.locator('#startNina').click()
    await page.evaluate("document.body.classList.add('nina-call-visible')")
    await page.wait_for_timeout(500)
    assert await page.locator('.pv-deck-mic-label').inner_text()=='MIC ON'
    assert await page.locator('.pv-deck-level i').nth(3).evaluate('(e)=>parseInt(e.style.height)')>2
    await page.evaluate('window.sample=0')
    await page.wait_for_timeout(150)
    assert await page.locator('.pv-deck-level i').nth(3).evaluate('(e)=>parseInt(e.style.height)')==2
    await page.locator('.pv-deck-mic').click()
    assert await page.evaluate('track.enabled')==False
    assert await page.locator('.pv-deck-mic').get_attribute('aria-pressed')=='true'
    await page.locator('.pv-deck-mic').click()
    assert await page.evaluate('track.enabled')==True
    box=await page.locator('.pv-deck-mic').bounding_box();assert box['y']>=0 and box['y']+box['height']<=height
    await page.evaluate('deck.dispose()')
    assert await page.evaluate('captureCalls+stopCalls')==0
    assert await page.locator('.pv-deck-controls').count()==0
    await page.evaluate('''() => {window.AudioContext=class{constructor(){throw Error('Meter unavailable')}};window.deck=installNinaDeck({getStream:()=>stream})}''')
    await page.locator('#startNina').click()
    await page.wait_for_timeout(400)
    await page.locator('.pv-deck-mic').click()
    assert await page.evaluate('track.enabled')==False
    await page.locator('.pv-deck-mic').click()
    assert await page.evaluate('track.enabled')==True
    assert await page.evaluate('captureCalls+stopCalls')==0
    await page.evaluate("track.readyState='ended'")
    await page.wait_for_timeout(400);assert await page.locator('.pv-deck-mic').is_disabled()
    await page.evaluate("document.body.classList.add('nina-scrim-visible')")
    await page.wait_for_timeout(400);assert await page.locator('.pv-deck-controls').is_hidden()
    await page.evaluate('deck.dispose()')
    # The old app URL does not opt into this presentation or microphone control.
    await page.evaluate("history.replaceState(null,'','/nina-app.html?pv_app=1');delete document.body.dataset.pvDeck;window.deck=installNinaDeck({getStream:()=>stream})")
    assert await page.locator('.pv-deck-controls').count()==0
    assert await page.evaluate('captureCalls+stopCalls')==0
    results.append({'engine':name,'viewport':[width,height],'checks':['off-before-call','mute','unmute','accessible-state','real-level-input','silent-level-flat','fits-screen','no-capture','no-stop','meter-failure-safe','ended-input-disabled','error-ui-clear','cleanup','old-app-not-opted-in']})
    print('PASS',name,width,height,flush=True)
    await page.close()
   await browser.close()
 print(json.dumps(results,indent=2));Path('DECK04_BROWSER_RESULTS.json').write_text(json.dumps(results,indent=2))
asyncio.run(run())
