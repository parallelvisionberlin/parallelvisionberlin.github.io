import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('each sitemap entry has static main content, its own canonical and no noindex',()=>{
  const urls=[...read('lab/sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
  assert.ok(urls.includes('https://pvlab.studio/moods'));
  for(const url of urls){
    const u=new URL(url);
    assert.equal(u.origin,'https://pvlab.studio');
    const file=u.pathname==='/'?'index.html':u.pathname.endsWith('/')?u.pathname.slice(1)+'index.html':u.pathname.slice(1)+'.html';
    const html=read('lab/'+file);
    assert.ok(html.includes('rel="canonical" href="'+url+'"'),url);
    assert.match(html,/<main\b/);
    assert.match(html,/<h1\b/);
    assert.doesNotMatch(html,/<meta[^>]+name="robots"[^>]+noindex/i);
    assert.doesNotMatch(u.pathname,/studio|account|owner|sandbox|vitolas/);
  }
});

test('private account shells stay noindexed and absent from the sitemap',()=>{
  const map=read('lab/sitemap.xml');
  for(const name of ['studio','account','owner','billing-sandbox','mood-creator','vitolas-studio']){
    assert.match(read('lab/'+name+'.html'),/<meta[^>]+name="robots"[^>]+noindex/i);
    assert.ok(!map.includes('/'+name));
  }
});

test('Moods aliases redirect without JS and unknown paths have a Pages 404 document',()=>{
  const redirects=read('lab/_redirects');
  for(const name of ['explore-moods','explore-moods.html','explore-moods-new','explore-moods-new.html','lab/moods','lab/moods.html'])
    assert.ok(redirects.split('\n').includes('/'+name+' /moods 301'));
  for(const name of ['moods','explore-moods','explore-moods-new'])
    assert.ok(read('lab/'+name+'.html').includes('href="https://pvlab.studio/moods"'));
  const missing=read('lab/404.html');
  assert.match(missing,/noindex,follow/);
  assert.match(missing,/<h1>Page not found\./);
  for(const href of ['/', '/moods', '/studio'])assert.ok(missing.includes('href="'+href+'"'));
});

test('Cloudflare exception is verified search only, read only, public paths only, with security logging',()=>{
  const rule=JSON.parse(read('.github/cloudflare/pvlab-verified-search-public.json'));
  assert.equal(rule.action,'skip');
  assert.deepEqual(rule.action_parameters,{phases:['http_request_sbfm']});
  assert.equal(rule.logging.enabled,true);
  assert.match(rule.expression,/cf\.client\.bot/);
  assert.match(rule.expression,/cf\.verified_bot_category eq "Search Engine Crawler"/);
  assert.match(rule.expression,/http\.host eq "pvlab\.studio"/);
  assert.match(rule.expression,/http\.request\.method in \{"GET" "HEAD"\}/);
  assert.doesNotMatch(rule.expression,/user_agent|starts_with|contains|\/api\/|\/studio|\/account|\/owner/);
  const paths=rule.expression.split('http.request.uri.path in ')[1];
  for(const m of paths.matchAll(/"([^"]+)"/g)){
    const p=m[1];
    assert.ok(['/', '/index.html','/moods','/moods.html','/zencreator-alternative/','/zencreator-alternative/index.html','/robots.txt','/sitemap.xml'].includes(p));
  }
});
