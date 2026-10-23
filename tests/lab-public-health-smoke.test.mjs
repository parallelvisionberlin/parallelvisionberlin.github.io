import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,mkdtempSync,existsSync,unlinkSync,rmdirSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

// Execute the actual read-only workflow gate with synthetic health replies.
// The source VERSION must be accepted; failures must still stop the job.
const workflow=readFileSync('.github/workflows/pv-lab-fashion-smoke.yml','utf8');
const command=workflow.match(/^\s+node -e "([^"\n]+)"/m)?.[1];
assert.ok(command,'The public smoke retains its Worker-health gate');
const gate=command.replace(/\\\\/g,'\\');
const version=readFileSync('lab-worker/worker.mjs','utf8').match(/export const VERSION = '([^']+)'/)?.[1];
assert.ok(version,'Worker exports its actual build identifier');
function result(reply){
  try{
    runInNewContext(gate,{
      require:path=>{assert.equal(path,'/tmp/pv-lab-health.json');return reply;},
      console:{log(){},error(){}},process:{exit:code=>{throw {exitCode:code};}}
    });
    return 0;
  }catch(error){
    if(Number.isInteger(error?.exitCode))return error.exitCode;
    throw error;
  }
}
test('Fashion smoke accepts current and legacy build versions but rejects unhealthy or malformed replies',()=>{
  assert.equal(result({ok:true,version}),0,'Actual source VERSION is a valid deployed build format');
  assert.equal(result({ok:true,version:'pv-lab-2026-10-23.1'}),0,'Retain the prior dot-delimited format');
  for(const reply of [
    {ok:false,version},{version},{ok:true},{ok:true,version:null},
    {ok:true,version:'another-worker-2026-10-23-build'},
    {ok:true,version:'pv-lab-2026-10-23'},
    {ok:true,version:'pv-lab-2026-10-23.'},
    {ok:true,version:version+' INVALID'}
  ])assert.equal(result(reply),1,'Invalid health must fail: '+JSON.stringify(reply));
});

test('Fashion smoke follows the canonical HTML redirect before checking the published template',async()=>{
  const step=workflow.slice(workflow.indexOf('- name: Verify published Fashion template'));
  const curl=step.match(/curl\s[\s\S]*?-o \/tmp\/pv-fashion\.html/)?.[0];
  assert.ok(curl,'Retain the real published-template HTTP check');
  const args=curl.replace(/\\\r?\n\s*/g,' ').match(/"[^"]*"|'[^']*'|\S+/g).slice(1).map(value=>value.replace(/^(['"])(.*)\1$/,'$2'));
  const requests=[];
  const server=createServer((req,res)=>{
    requests.push(req.url);
    if(req.url.startsWith('/fashion.html')){res.writeHead(308,{Location:'/fashion'}).end();return;}
    res.writeHead(200,{'Content-Type':'text/html'}).end('<form id="fashion-form"></form><link rel="stylesheet" href="fashion.css?v=fixture">');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const directory=mkdtempSync(join(tmpdir(),'pv-fashion-smoke-')),output=join(directory,'fashion.html');
  try{
    const urlIndex=args.findIndex(value=>value.startsWith('https://pvlab.studio/fashion.html'));
    assert.ok(urlIndex>=0,'The smoke checks the canonical Studio domain');
    args[urlIndex]='http://127.0.0.1:'+server.address().port+'/fashion.html?pv-check=public-contract-1';
    args[args.indexOf('-o')+1]=output;
    const code=await new Promise((resolve,reject)=>{
      const child=spawn(process.platform==='win32'?'curl.exe':'curl',args,{stdio:['ignore','ignore','pipe']});
      child.on('error',reject);child.on('close',resolve);
    });
    assert.equal(code,0,'The real curl command must read the redirected template');
    const html=readFileSync(output,'utf8');
    assert.ok(html.includes('id="fashion-form"')&&/fashion\.css\?v=/.test(html),'Apply the same published-template markers after following the redirect');
    assert.equal(requests.length,2);assert.equal(requests[1],'/fashion');
  }finally{
    await new Promise(resolve=>server.close(resolve));
    if(existsSync(output))unlinkSync(output);rmdirSync(directory);
  }
});
