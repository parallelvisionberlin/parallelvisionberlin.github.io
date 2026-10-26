import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

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
