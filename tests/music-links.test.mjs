import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {musicAdminRoute,musicPublicRoute,pruneMusicEvents,validateRelease} from '../lab-worker/music-links.mjs';
import {validateLinks,slugify,metaDetails,MUSIC_PIXEL,newId,SERVICES} from '../links/shared.mjs';
const NOW=Date.parse('2026-10-30T12:00:00Z'),BASE='https://parallel-vision-lab.parallelvision.workers.dev/api/music';
const fixtureRelease=(change={})=>({id:crypto.randomUUID(),title:'Test Release',artist:'Artist',slug:'test-release',catalogue:'PV999',description:'A new single.',artworkUrl:'https://parallelvisionlabel.com/cover.jpg',audioUrl:'',releaseDate:'2026-11-06',links:[{service:'spotify',url:'https://open.spotify.com/track/example'}],pixelId:'',status:'draft',...change});
function fixture(t){
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  const migration=readFileSync(new URL('../lab-worker/migrations/0045-music-links.sql',import.meta.url),'utf8');db.exec('PRAGMA foreign_keys=ON');db.exec(migration);db.exec(readFileSync(new URL('../lab-worker/migrations/0046-music-link-designs.sql',import.meta.url),'utf8'));db.exec(readFileSync(new URL('../lab-worker/migrations/0047-music-link-click-event.sql',import.meta.url),'utf8'));
  const binding={prepare(sql){return {bind(...values){const query=()=>db.prepare(sql);return {
    async first(){return query().get(...values)||null;},async all(){return {results:query().all(...values)};},async run(){return {meta:{changes:query().run(...values).changes}};}
  };}};},async batch(items){db.exec('BEGIN');try{const results=[];for(const item of items)results.push(await item.run());db.exec('COMMIT');return results;}catch(error){db.exec('ROLLBACK');throw error;}}};
  const objects=new Map();
  const env={LAB_DB:binding,LAB_SECRET:'test-only-music-link-key-'.repeat(4),OWNER_DB:{prepare(){return {bind(owner){return {async first(){return owner==='owner'?{id:owner}:null;}};}};}},LAB_MEDIA:{
    async put(key,body,options){objects.set(key,{body,options});},async get(key,{range}={}){const o=objects.get(key);return o?{body:o.body.slice(range?.offset||0,range?range.offset+range.length:undefined)}:null;},async delete(key){objects.delete(key);}
  }};
  const admin=(path,{method='GET',data,owner='owner',headers,body,clock=()=>NOW}={})=>musicAdminRoute(new Request(BASE+'/admin'+path,{method,headers:headers||{'Content-Type':'application/json'},body:method==='GET'?undefined:data?JSON.stringify(data):body}),env,owner,{clock});
  const pub=(path,{method='GET',data,origin='https://parallelvisionlabel.com',ua='Mozilla/5.0',headers={},clock=()=>NOW}={})=>musicPublicRoute(new Request(BASE+'/public'+path,{method,headers:{'Origin':origin,'Content-Type':'text/plain;charset=UTF-8','User-Agent':ua,...headers},body:data?JSON.stringify(data):undefined}),env,{clock});
  return {db,env,migration,objects,admin,pub};
}
test('idempotent migration seeds only a verified real release and the music pixel',async t=>{
  const f=fixture(t);f.db.exec(f.migration);assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM music_releases').get().n,2);
  const result=await (await f.pub('/releases/stay-low')).json();assert.equal(result.release.artist,'Alejandro Molinari feat. Nina FOK');assert.equal(result.release.links.length,1);
  assert.equal(result.release.links[0].url,'https://soundcloud.com/parallelvisionlabel/stay-low');assert.equal(result.tracking.pixelId,MUSIC_PIXEL);
  const dash=await (await f.admin('/dashboard')).json();assert.deepEqual(dash.summary,{views:0,clicks:0,published:1});
});
test('event migration replaces legacy settings once, preserving pixel and preventing stale saves',async t=>{
  const f=fixture(t),migration=readFileSync(new URL('../lab-worker/migrations/0047-music-link-click-event.sql',import.meta.url),'utf8');
  f.db.exec("UPDATE music_link_settings SET pixel_id='987654321098765',click_event='Hypeddit Smart Link Click',revision=8 WHERE id=1");
  f.db.exec(migration);f.db.exec(migration);
  const config=(await(await f.pub('/releases/stay-low')).json()).tracking;
  assert.deepEqual(config,{pixelId:'987654321098765',clickEvent:'MusicLinkClick'});
  const settings=(await(await f.admin('/settings')).json()).settings;assert.equal(settings.revision,9);
  await assert.rejects(()=>f.admin('/settings',{method:'POST',data:{...settings,revision:8}}),e=>e.status===409);
  await assert.rejects(()=>f.admin('/settings',{method:'POST',data:{...settings,clickEvent:'Hypeddit Smart Link Click'}}),e=>e.status===400);
});
test('every admin route rejects customer, missing and forged owners before DB mutation',async t=>{
  const f=fixture(t);for(const owner of ['',null,'customer','forged'])for(const path of ['/dashboard','/settings','/media','/releases'])await assert.rejects(()=>f.admin(path,{owner,method:path==='/dashboard'?'GET':'POST',data:fixtureRelease()}),e=>e.status===403);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM music_releases').get().n,2);assert.equal(f.objects.size,0);
});
test('draft create, publish, edit and archive preserve public visibility and stable links',async t=>{
  const f=fixture(t),input=fixtureRelease();let response=await f.admin('/releases',{method:'POST',data:input});assert.equal(response.status,201);
  let saved=(await response.json()).release;assert.equal(saved.revision,1);
  await assert.rejects(()=>f.pub('/releases/'+input.slug),e=>e.status===404);
  saved=(await(await f.admin('/releases/'+saved.id,{method:'POST',data:{...saved,status:'published'}})).json()).release;
  assert.equal(saved.revision,2);assert.equal((await(await f.pub('/releases/'+saved.slug)).json()).release.id,saved.id);
  await assert.rejects(()=>f.admin('/releases/'+saved.id,{method:'POST',data:{...saved,slug:'changed-advert-link'}}),e=>e.status===409);
  const stale={...saved};saved=(await(await f.admin('/releases/'+saved.id,{method:'POST',data:{...saved,title:'Updated title'}})).json()).release;
  await assert.rejects(()=>f.admin('/releases/'+saved.id,{method:'POST',data:{...stale,title:'Old tab overwrite'}}),e=>e.status===409);
  assert.equal((await(await f.pub('/releases/'+saved.slug)).json()).release.title,'Updated title');
  await f.admin('/releases/'+saved.id,{method:'POST',data:{...saved,status:'archived'}});
  await assert.rejects(()=>f.pub('/releases/'+saved.slug),e=>e.status===404);
  assert.equal((await(await f.admin('/dashboard')).json()).releases.find(x=>x.id===saved.id).status,'archived');
});
test('duplicates and create retries cannot create additional records',async t=>{
  const f=fixture(t),input=fixtureRelease();await f.admin('/releases',{method:'POST',data:input});
  await assert.rejects(()=>f.admin('/releases',{method:'POST',data:{...input,id:crypto.randomUUID()}}),e=>e.status===409);
  await assert.rejects(()=>f.admin('/releases',{method:'POST',data:{...input,slug:'another-slug'}}),e=>e.status===409);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM music_releases').get().n,3);
});
test('validates dates, publishing requirements, safe media URLs and platform identity',()=>{
  assert.deepEqual(SERVICES.map(s=>s.id),['spotify','soundcloud','youtube']);
  assert.equal(slugify('Tanzen im Kréis!'),'tanzen-im-kreis');
  for(const change of [{releaseDate:'2026-02-30'},{slug:'../private'},{title:''},{title:'bad\nname'},{pixelId:'<script>'},{status:'published',artworkUrl:''},{status:'published',links:[]},{audioUrl:'javascript:alert(1)'},{artworkUrl:'https://user:pass@example.com/x'}])assert.throws(()=>validateRelease(fixtureRelease(change)));
  for(const links of [[{service:'spotify',url:'https://evil.example/open.spotify.com'}],[{service:'spotify',url:'https://open.spotify.com.evil.example/track/x'}],[{service:'bandcamp',url:'https://evilbandcamp.com/track/x'}],[{service:'spotify',url:'https://open.spotify.com/track/x'},{service:'spotify',url:'https://open.spotify.com/track/y'}]])assert.throws(()=>validateLinks(links));
  assert.throws(()=>validateLinks([{service:'bandcamp',url:'https://parallelvision.bandcamp.com/track/x'}]));assert.equal(validateLinks([{service:'youtube',url:'https://youtu.be/valid-video'}]).length,1);
  assert.equal(validateRelease(fixtureRelease({status:'published'})).links.length,1);
});
test('tracking settings use revisions and a per-release override wins',async t=>{
  const f=fixture(t),original=(await(await f.admin('/settings')).json()).settings;
  assert.equal(original.clickEvent,'MusicLinkClick');
  await f.admin('/settings',{method:'POST',data:{pixelId:'123456789012345',clickEvent:'MusicLinkClick',revision:original.revision}});
  await assert.rejects(()=>f.admin('/settings',{method:'POST',data:{pixelId:MUSIC_PIXEL,clickEvent:'MusicLinkClick',revision:original.revision}}),e=>e.status===409);
  assert.equal((await(await f.pub('/releases/stay-low')).json()).tracking.pixelId,'123456789012345');
  await f.admin('/releases',{method:'POST',data:fixtureRelease({status:'published',pixelId:'987654321098765'})});
  assert.equal((await(await f.pub('/releases/test-release')).json()).tracking.pixelId,'987654321098765');
});
test('event retries are deduplicated atomically and reports are real date-filtered counts',async t=>{
  const f=fixture(t),release=(await(await f.pub('/releases/stay-low')).json()).release;
  const event={id:crypto.randomUUID(),releaseId:release.id,event:'view',service:'',source:'meta',campaign:'sube-berlin'};
  await f.pub('/events',{method:'POST',data:event});await f.pub('/events',{method:'POST',data:event});
  await f.pub('/events',{method:'POST',data:{...event,id:crypto.randomUUID(),event:'click',service:'soundcloud'}});
  await f.pub('/events',{method:'POST',data:{...event,id:crypto.randomUUID(),campaign:'older'},clock:()=>NOW-9*86400000});
  const report=await(await f.admin('/dashboard?days=7')).json();assert.deepEqual(report.summary,{views:1,clicks:1,published:1});
  assert.equal(report.platforms[0].service,'soundcloud');assert.equal(report.sources[0].views,1);assert.equal(report.campaigns[0].campaign,'sube-berlin');
  assert.equal((await(await f.admin('/dashboard?days=30')).json()).summary.views,2);
  assert.equal((await(await f.admin('/dashboard?days=0')).json()).summary.clicks,1);
  await assert.rejects(()=>f.admin('/dashboard?days=-1'),e=>e.status===400);
  await pruneMusicEvents(f.env,{clock:()=>NOW+4*86400000});assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM music_link_receipts').get().n,0);
  assert.equal(f.db.prepare('SELECT SUM(count) AS n FROM music_link_daily').get().n,3);
});
test('rejects invalid sources, personal campaign payloads, hidden releases and unconfigured buttons',async t=>{
  const f=fixture(t),release=(await(await f.pub('/releases/stay-low')).json()).release;
  const data={id:crypto.randomUUID(),releaseId:release.id,event:'view',service:'',source:'direct',campaign:''};
  for(const change of [{source:'https://private.example/token'},{campaign:'user@example.com'},{id:'not-a-uuid'},{service:'spotify'},{event:'purchase'},{campaign:'x'.repeat(65)}])await assert.rejects(()=>f.pub('/events',{method:'POST',data:{...data,...change}}),e=>e.status===400);
  await assert.rejects(()=>f.pub('/events',{method:'POST',data:{...data,event:'click',service:'spotify'}}),e=>e.status===400);
  await assert.rejects(()=>f.pub('/events',{method:'POST',data,origin:'https://attacker.example'}),e=>e.status===403);
  const draft=fixtureRelease();await f.admin('/releases',{method:'POST',data:draft});
  await assert.rejects(()=>f.pub('/events',{method:'POST',data:{...data,releaseId:draft.id}}),e=>e.status===404);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM music_link_receipts').get().n,0);
});
test('bots do not inflate totals and the network limit bounds accepted events without storing IPs',async t=>{
  const f=fixture(t),release=(await(await f.pub('/releases/stay-low')).json()).release;
  const data={releaseId:release.id,event:'view',service:'',source:'direct',campaign:''};
  await f.pub('/events',{method:'POST',data:{...data,id:crypto.randomUUID()},ua:'Googlebot/2.1'});
  for(let i=0;i<125;i++)await f.pub('/events',{method:'POST',data:{...data,id:crypto.randomUUID()},headers:{'cf-connecting-ip':'192.0.2.10'}});
  assert.equal(f.db.prepare('SELECT SUM(count) AS n FROM music_link_daily').get().n,120);
  assert.equal(JSON.stringify(f.db.prepare('SELECT * FROM music_link_limits').all()).includes('192.0.2.10'),false);
});
test('upload URLs expose only the music namespace, validate formats and support audio byte ranges',async t=>{
  const f=fixture(t),content=new Uint8Array(30);content.set(new TextEncoder().encode('ID3'));content[15]=42;
  const uploaded=await(await f.admin('/media',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:content})).json();
  assert.equal(uploaded.mime,'audio/mpeg');assert.equal([...f.objects.keys()][0],'music-links/'+uploaded.id);
  const full=await f.pub('/media/'+uploaded.id);assert.equal(full.headers.get('Content-Type'),'audio/mpeg');assert.equal((await full.arrayBuffer()).byteLength,30);
  const range=await f.pub('/media/'+uploaded.id,{headers:{Range:'bytes=10-19'}});assert.equal(range.status,206);assert.equal(range.headers.get('Content-Range'),'bytes 10-19/30');assert.equal((await range.arrayBuffer()).byteLength,10);
  assert.equal((await f.pub('/media/'+uploaded.id,{headers:{Range:'bytes=100-200'}})).status,416);
  assert.equal((await f.pub('/media/'+uploaded.id,{method:'HEAD'})).body,null);
  await assert.rejects(()=>f.pub('/media/'+crypto.randomUUID()),e=>e.status===404);
  await assert.rejects(()=>f.admin('/media',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:new TextEncoder().encode('<svg onload=alert(1)>bad</svg>')}),e=>e.status===415);
});
test('oversized JSON cannot reach a write and unsupported actions fail closed',async t=>{
  const f=fixture(t);await assert.rejects(()=>f.admin('/releases',{method:'POST',data:{payload:'x'.repeat(21000)}}),e=>e.status===413);
  await assert.rejects(()=>f.admin('/releases',{method:'DELETE'}),e=>e.status===405);
  await assert.rejects(()=>f.pub('/releases/stay-low',{method:'POST'}),e=>e.status===404);
});
test('Meta compatibility parameters retain artist, track and the Spotify service filter',()=>{
  const details=metaDetails({id:'release',title:'Stay Low',artist:'Alejandro Molinari'},'spotify');
  assert.equal(details.artist,'Alejandro Molinari');assert.equal(details.track,'Stay Low');assert.equal(details.music_service,'spotify');
});
async function publicBrowser({consent=null}={}){
  const elements=new Map(),scripts=[],sent=[],stored=new Map(consent?[['pv-music-meta-consent-v1',consent]]:[]),calls=[];let click;
  function element(){return {hidden:true,content:'',href:'',className:'',dataset:{},listeners:{},children:[],append(...items){this.children.push(...items);},replaceChildren(){this.children=[];},addEventListener(name,fn){this.listeners[name]=fn;}};}
  const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
  const buttons=['denied','granted'].map(choice=>{const e=element();e.dataset.consent=choice;return e;});
  const doc={getElementById:get,querySelector:s=>get(s),querySelectorAll:()=>buttons,createElement:()=>element(),head:{append(script){scripts.push(script);}},referrer:''};
  const release={id:crypto.randomUUID(),slug:'test',title:'Single',artist:'Artist',links:[{service:'spotify',url:'https://open.spotify.com/track/x'}],url:'https://parallelvisionlabel.com/listen/?release=test'};
  const win={};
  const context={API:'https://api.example',SLUG:/^[a-z]+$/,metaDetails,newId,renderRelease(root,r,{onClick}){click=onClick;},document:doc,window:win,location:{search:'?release=test&utm_source=meta&utm_campaign=test',hostname:'parallelvisionlabel.com'},localStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)},navigator:{sendBeacon(url,data){sent.push({url,data});return true;}},crypto,URL,URLSearchParams,AbortSignal,Blob,Date,fetch:async()=>new Response(JSON.stringify({release,tracking:{pixelId:MUSIC_PIXEL,clickEvent:'MusicLinkClick'}})),Response,Error};
  let source=readFileSync(new URL('../listen/listen.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
  await vm.runInNewContext('(async()=>{'+source+'})()',context);
  return {elements,scripts,sent,stored,buttons,click,get,win,calls};
}
test('public listener starts Pixel without a prompt and does not invent a saved consent choice',async()=>{
  const browser=await publicBrowser();assert.equal(browser.scripts.length,1);assert.equal(browser.sent.length,1);
  assert.equal(browser.get('meta-consent').hidden,true);assert.equal(browser.stored.size,0);
  assert.equal(browser.win.fbq.queue.filter(a=>a[0]==='consent').length,0);
  assert.equal(browser.win.fbq.queue.filter(a=>a[0]==='init').length,1);
  assert.equal(browser.win.fbq.queue.filter(a=>a[0]==='trackSingle').length,2);
  browser.click('spotify');const events=browser.win.fbq.queue.filter(a=>a[0]==='trackSingleCustom');
  assert.equal(events.length,1);assert.equal(events[0][2],'MusicLinkClick');assert.equal(events[0][3].music_service,'spotify');
});
test('manual tracking settings revoke future Meta clicks and can re-enable without duplicate init',async()=>{
  const browser=await publicBrowser();
  browser.get('privacy-choices').listeners.click();assert.equal(browser.get('meta-consent').hidden,false);
  browser.buttons[0].listeners.click();browser.click('spotify');
  assert.equal(browser.get('meta-consent').hidden,true);assert.equal(browser.stored.get('pv-music-meta-consent-v1'),'denied');
  assert.equal(browser.win.fbq.queue.at(-1)[1],'revoke');assert.equal(browser.win.fbq.queue.filter(a=>a[0]==='trackSingleCustom').length,0);
  browser.buttons[1].listeners.click();browser.click('spotify');
  assert.equal(browser.stored.get('pv-music-meta-consent-v1'),'granted');assert.equal(browser.scripts.length,1);
  assert.equal(browser.win.fbq.queue.filter(a=>a[0]==='init').length,1);assert.equal(browser.win.fbq.queue.filter(a=>a[0]==='trackSingleCustom').length,1);
});
test('persisted decline stays declined and public content is still usable',async()=>{
  const browser=await publicBrowser({consent:'denied'});assert.equal(browser.scripts.length,0);assert.equal(browser.get('meta-consent').hidden,true);
  browser.click('spotify');assert.equal(browser.sent.length,2);
});

test('background choice survives create, public reads, dashboard and legacy saves without stale-tab overwrites',async t=>{
  const f=fixture(t);f.db.exec(readFileSync(new URL('../lab-worker/migrations/0046-music-link-designs.sql',import.meta.url),'utf8'));
  assert.equal((await(await f.pub('/releases/stay-low')).json()).release.background,'blur');
  let saved=(await(await f.admin('/releases',{method:'POST',data:fixtureRelease({status:'published'})})).json()).release;
  assert.equal(saved.background,'blur');assert.equal((await(await f.pub('/releases/'+saved.slug)).json()).release.background,'blur');
  saved=(await(await f.admin('/releases/'+saved.id,{method:'POST',data:{...saved,background:'artwork'}})).json()).release;
  assert.equal((await(await f.pub('/releases/'+saved.slug)).json()).release.background,'artwork');
  const stale={...saved};saved=(await(await f.admin('/releases/'+saved.id,{method:'POST',data:{...saved,background:'black'}})).json()).release;
  await assert.rejects(()=>f.admin('/releases/'+saved.id,{method:'POST',data:{...stale,background:'artwork'}}),e=>e.status===409);
  assert.equal((await(await f.pub('/releases/'+saved.slug)).json()).release.background,'black');
  const legacy={...saved};delete legacy.background;
  saved=(await(await f.admin('/releases/'+saved.id,{method:'POST',data:legacy})).json()).release;
  assert.equal(saved.background,'black');assert.equal((await(await f.admin('/dashboard')).json()).releases.find(r=>r.id===saved.id).background,'black');
  for(const background of ['evil',null,{},'url(https://evil.example)'])await assert.rejects(()=>f.admin('/releases/'+saved.id,{method:'POST',data:{...saved,background}}),e=>e.status===400);
});
test('design and release changes roll back together on a failed release write',async t=>{
  const f=fixture(t),saved=(await(await f.admin('/releases',{method:'POST',data:fixtureRelease({background:'blur'})})).json()).release;
  f.db.exec("CREATE TRIGGER reject_test_update BEFORE UPDATE ON music_releases BEGIN SELECT RAISE(ABORT,'test write failure'); END;");
  await assert.rejects(()=>f.admin('/releases/'+saved.id,{method:'POST',data:{...saved,background:'black',title:'Failed edit'}}),/test write failure/);
  assert.equal(f.db.prepare('SELECT background FROM music_link_designs WHERE release_id=?').get(saved.id).background,'blur');
  assert.equal(f.db.prepare('SELECT title FROM music_releases WHERE id=?').get(saved.id).title,'Test Release');
});
