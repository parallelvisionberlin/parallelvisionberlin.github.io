import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const lab=readFileSync(new URL('../lab/lab.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../lab/studio.html',import.meta.url),'utf8');

test('authenticated Studio uses a bounded private History wait and does not block on secondary resources',()=>{
  const start=lab.indexOf('async function sync(){'),end=lab.indexOf("\n$('studio-invite-friends')",start);
  assert.ok(start>=0&&end>start);
  const boot=lab.slice(start,end);
  const appReady=boot.indexOf("$('app').hidden=false");
  const history=boot.indexOf('const historyReady=loadHistory()',appReady);
  const wait=boot.indexOf('await Promise.race([historyReady,',history);
  const visible=boot.indexOf('finishLabBoot();',wait);
  assert.ok(appReady>=0&&history>appReady&&wait>history&&visible>wait,
    'await private History briefly but reveal the authenticated workspace if the fetch stalls');
  assert.match(boot,/new Promise\(resolve=>setTimeout\(resolve,5000\)\)/,
    'give first private History up to five seconds without indefinite loading');
  assert.match(boot,/if\(!historyResolved&&owner&&epoch===historyEpoch\)/,
    'an unresolved library displays loading UI rather than a false empty state');
  assert.match(boot,/Loading your saved work…/);
  assert.match(boot,/if\(historyResolved\)showWelcomeStart\(data\)/,
    'first-image onboarding cannot misidentify customers before saved History arrives');
  assert.match(boot,/void Promise\.all\(\[loadPacks\(\)\.catch/);
  assert.match(boot,/Loading your images…/);
  assert.match(boot,/const historyReady=loadHistory\(\)\.catch/);
  assert.match(boot,/historyResolved=true;\s*\$\('history'\)\.removeAttribute\('aria-busy'\)/);
  assert.match(boot,/document\.body\.classList\.contains\('lab-ready'\)\)showWelcomeStart\(data\)/);
  assert.match(boot,/loadPacks\(\)\.catch/);
  assert.match(boot,/soul\.load\(\)\.catch/);
  assert.match(boot,/loadSoulProIdentity\(\)\.catch/);
  assert.match(boot,/try\{await restoreStudioEntry\(\);\}catch/);
  assert.match(boot,/Studio setup could not finish/);
  assert.match(boot,/\$\('signin'\)\.hidden=stillSignedIn/);
  assert.match(boot,/\$\('auth-retry'\)\.hidden=!stillSignedIn/);
  assert.match(html,/canonicalStudio=20261015-1/);
  assert.match(html,/galleryPerf=1/);
});

test('image gallery allows at most four simultaneous thumbnail downloads',async()=>{
  const begin=lab.indexOf('const MAX_GALLERY_PREVIEW_READS=4;');
  const end=lab.indexOf('function historyPreviewFailed',begin);
  assert.ok(begin>=0&&end>begin);
  const code=lab.slice(begin,end);
  const pending=[],launched=[],unavailable=[],urls=new Set();
  class FakeObserver {
    constructor(callback){this.callback=callback;}
    unobserve(img){img.unobserved=true;}
    reveal(items){this.callback(items.map(target=>({isIntersecting:true,target})));}
  }
  const factory=new Function('requestBlob','makeUrl','urls','FakeObserver','launched','unavailable',`
    let owner=true,historyRevision=1;
    const assetThumbnailBlob=id=>{launched.push(id);return requestBlob(id)};
    const URL={createObjectURL:makeUrl};
    const cardUrls=urls;
    const historyPreviewFailed=img=>unavailable.push(img.dataset.asset);
    const IntersectionObserver=FakeObserver;
    ${code}
    return {observer,get count(){return galleryPreviewReads},get waiting(){return galleryPreviewQueue.length},invalidate(){historyRevision++;galleryPreviewQueue.length=0}};
  `);
  const rig=factory(id=>new Promise((resolve,reject)=>pending.push({id,resolve,reject})),b=>'blob:'+b.id,urls,FakeObserver,launched,unavailable);
  const cards=Array.from({length:12},(_,i)=>({dataset:{asset:'asset-'+i},isConnected:true,src:''}));
  rig.observer.reveal(cards);
  assert.equal(rig.count,4);
  assert.equal(rig.waiting,8);
  assert.equal(launched.length,4);
  const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
  pending[0].resolve({id:pending[0].id,type:'image/png',size:1024});
  await settle();
  assert.equal(cards[0].src,'blob:asset-0');
  assert.equal(rig.count,4);
  assert.equal(launched.length,5);
  pending[1].reject(Error('failed'));
  await settle();
  assert.deepEqual(unavailable,['asset-1']);
  assert.equal(launched.length,6);
  rig.invalidate();
  pending[2].resolve({id:pending[2].id,type:'image/png',size:1024});
  await settle();
  assert.equal(launched.length,6,'stale pages cannot start more downloads');
});

test('gallery preserves authenticated original bytes and never changes generation',()=>{
  assert.match(lab,/assetThumbnailBlob\(img\.dataset\.asset\)/);
  assert.match(lab,/const original=assetBlob\(job\.outputId\)/);
  assert.match(lab,/MAX_GALLERY_PREVIEW_READS=4/);
  assert.match(lab,/galleryPreviewQueue\.length=0;cardUrls/);
  assert.match(lab,/historyRevision\+\+;galleryPreviewQueue\.length=0;clearTimeout\(timer\)/);
});
