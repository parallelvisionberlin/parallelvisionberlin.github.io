import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const code=readFileSync(new URL('../lab/traffic.js',import.meta.url),'utf8');
function runPage({referrer='',path='/lab/',search='',navType='navigate',dnt='0',gpc=false,hidden=false,webdriver=false}={}){
  const events=[],handlers={};
  const document={
    referrer,visibilityState:hidden?'hidden':'visible',
    addEventListener(name,handler){handlers[name]=handler;}
  };
  const navigator={doNotTrack:dnt,globalPrivacyControl:gpc,webdriver};
  const fetch=(url,options)=>{events.push({url,options,body:JSON.parse(options.body)});return Promise.resolve({status:204});};
  vm.runInNewContext(code,{
    document,navigator,performance:{getEntriesByType:()=>[{type:navType}]},
    location:{pathname:path,search},fetch,URL,URLSearchParams
  });
  return {events,document,handlers};
}
test('public PV LAB pages load a single anonymous script and owner page never tracks',()=>{
  const pages=['index.html','studio.html','moods.html','mood-creator.html','fashion.html','account.html'];
  for(const page of pages){
    const html=readFileSync(new URL('../lab/'+page,import.meta.url),'utf8');
    assert.equal((html.match(/src="\.\/traffic\.js\?/g)||[]).length,1,page+' should record once');
  }
  const owner=readFileSync(new URL('../lab/owner.html',import.meta.url),'utf8');
  assert.ok(!owner.includes('src="./traffic.js'),'Owner dashboard must never record visitor events');
  assert.ok(!code.includes('localStorage')&&!code.includes('sessionStorage')&&!code.includes('document.cookie'),'No persistent IDs');
});
test('Reddit referrer and UTM links are attributed without sending referrer URLs',()=>{
  const reddit=runPage({referrer:'https://www.reddit.com/r/SideProject/comments/xyz?tracking=secret'});
  assert.deepEqual({...reddit.events[0].body},{page:'home',source:'reddit',entry:true});
  assert.equal(reddit.events[0].options.credentials,'omit');
  assert.equal(reddit.events[0].options.referrerPolicy,'no-referrer');
  assert.ok(!reddit.events[0].options.body.includes('secret'));
  const utm=runPage({search:'?utm_source=reddit&utm_medium=organic&utm_campaign=launch',path:'/lab/moods.html'});
  assert.equal(utm.events[0].body.source,'reddit');
  assert.equal(utm.events[0].body.page,'moods');
  assert.ok(!utm.events[0].options.body.includes('campaign'));
  const internal=runPage({referrer:'https://parallelvisionlabel.com/lab/',path:'/lab/studio.html'});
  assert.deepEqual({...internal.events[0].body},{page:'studio',source:'internal',entry:false});
  const reloaded=runPage({navType:'reload'});
  assert.equal(reloaded.events[0].body.entry,false);
  const transferred=runPage({referrer:'https://parallelvisionlabel.com/index.html'});
  assert.equal(transferred.events[0].body.source,'parallel-vision');
});
test('visitor privacy preferences and invisible prerendered pages are respected',()=>{
  assert.equal(runPage({dnt:'1'}).events.length,0);
  assert.equal(runPage({gpc:true}).events.length,0);
  assert.equal(runPage({webdriver:true}).events.length,0);
  const hidden=runPage({hidden:true});
  assert.equal(hidden.events.length,0);
  hidden.document.visibilityState='visible';
  hidden.handlers.visibilitychange();
  hidden.handlers.visibilitychange();
  assert.equal(hidden.events.length,1,'One event when page becomes visible');
});
