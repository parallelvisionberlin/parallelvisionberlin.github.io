import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyRelease} from '../.github/scripts/verify-pvlab-release.mjs';

const sha='a'.repeat(40),sourceBytes=Buffer.from('h1{font-weight:500}');
const cloudflare={id:1,name:'Cloudflare Pages',head_sha:sha,app:{slug:'cloudflare-workers-and-pages'},
  details_url:'https://dash.cloudflare.com/?to=/account/pages/view/pvlab-studio/deployment',status:'completed',conclusion:'success'};
function probe({checks=[cloudflare],version='medium1',bytes=sourceBytes}={}){
  let productionRequests=0;
  const request=async url=>{
    if(url.includes('api.github.com'))return Response.json({check_runs:checks});
    productionRequests++;
    return new Response(url.endsWith('/studio')?`<link href="./title.css?v=${version}" rel="stylesheet">`:bytes);
  };
  return {run:()=>verifyRelease({sha,asset:'lab/title.css',version:'medium1',sourceBytes,request}),requests:()=>productionRequests};
}
test('a successful GitHub Pages check cannot authorize a Cloudflare live claim',async()=>{
  const p=probe({checks:[{...cloudflare,name:'pages build and deployment',app:{slug:'github-actions'}}]});
  assert.equal((await p.run()).state,'CLOUDFLARE_UNKNOWN');
  assert.equal(p.requests(),0);
});
test('pending Cloudflare and a check for another commit stay unverified',async()=>{
  assert.equal((await probe({checks:[{...cloudflare,status:'in_progress',conclusion:null}]}).run()).state,'CLOUDFLARE_PENDING');
  assert.equal((await probe({checks:[{...cloudflare,head_sha:'b'.repeat(40)}]}).run()).state,'CLOUDFLARE_UNKNOWN');
  assert.equal((await probe({checks:[{...cloudflare,conclusion:'failure'}]}).run()).state,'CLOUDFLARE_FAILED');
});
test('successful deployment with stale HTML or stale asset bytes stays unverified',async()=>{
  assert.equal((await probe({version:'old1'}).run()).state,'LIVE_VERSION_MISMATCH');
  assert.equal((await probe({bytes:Buffer.from('h1{font-weight:400}')}).run()).state,'LIVE_BYTES_MISMATCH');
});
test('only matching Cloudflare, document version and reviewed bytes verify publication',async()=>{
  const result=await probe().run();
  assert.equal(result.state,'LIVE_VERIFIED');
  assert.equal(result.signedInBehavior,'not verified by this command');
});
test('unavailable evidence fails without claiming live',async()=>{
  await assert.rejects(verifyRelease({sha,asset:'lab/title.css',version:'medium1',sourceBytes,request:async()=>new Response('',{status:403})}),/evidence unavailable: HTTP 403/);
});
