import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('lab/zencreator-alternative/index.html');
test('ZenCreator comparison has independent canonical, factual citation and truthful prepaid offer',()=>{
  assert.match(html,/<title>ZenCreator Alternative for AI Images/);
  assert.match(html,/href="https:\/\/pvlab\.studio\/zencreator-alternative\/"/);
  assert.match(html,/One-time credits and monthly plans/);
  assert.doesNotMatch(html,/200 (free|welcome) credits|free at sign-up/i);
  assert.match(html,/New signups do not currently receive free generation credits/);
  assert.match(html,/ZenCreator's published pricing and credit documentation/);
  assert.match(html,/not affiliated with ZenCreator/);
  assert.doesNotMatch(html,/<meta[^>]+noindex/i);
  assert.doesNotMatch(html,/\bguaranteed uncensored\b|\b100% unfiltered\b/i);
});
test('All editorial images and local navigation point to actual PV LAB assets',()=>{
 const paths=[...html.matchAll(/(?:src|srcset)="(\/(?:visuals|mood-previews)\/[^"?]+)"/g)].map(x=>x[1]);
 assert.ok(paths.length>=4,'hero + studio visual assets present');
 for(const p of paths)assert.ok(fs.existsSync(path.join(root,'lab',p.slice(1))),p+' exists in the PV LAB website');
 assert.match(html,/href="\/studio\?tool=image/);
 assert.match(html,/href="\/studio\?tool=video/);
 assert.match(html,/href="\/moods"/);
 assert.doesNotMatch(html,/↗|🔝|➡️/);
});
test('PV LAB domain exposes crawl discovery while homepage keeps editorial navigation',()=>{
 const map=read('lab/sitemap.xml'),robots=read('lab/robots.txt'),redirects=read('lab/_redirects');
 assert.match(map,/https:\/\/pvlab\.studio\/zencreator-alternative\//);
 assert.match(robots,/Sitemap: https:\/\/pvlab\.studio\/sitemap\.xml/);
 assert.match(redirects,/\/zencreator-alternative \/zencreator-alternative\/ 301/);
 assert.match(read('lab/index.html'),/href="https:\/\/pvlab\.studio\/zencreator-alternative\/"/);
});
