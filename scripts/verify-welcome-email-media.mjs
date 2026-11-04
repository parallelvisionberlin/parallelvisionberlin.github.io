// Read-only release gate: verify exactly the first-party bytes referenced by the email.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {signupWelcomeMessage} from '../lab-worker/signup-welcome-email.mjs';
const {html,text}=signupWelcomeMessage();
const urls=[...new Set(html.match(/https:\/\/pvlab\.studio\/email\/[a-zA-Z0-9.-]+/g))];
const hash=b=>createHash('sha256').update(b).digest('hex');
await Promise.all(urls.map(async url=>{
  const expected=await readFile(new URL('../lab/email/'+url.split('/').at(-1),import.meta.url));
  const response=await fetch(url,{signal:AbortSignal.timeout(30000),cache:'no-store'});
  if(!response.ok)throw Error(url+' HTTP '+response.status);
  const type=url.endsWith('.png')?'image/png':'image/jpeg';
  if(!response.headers.get('content-type')?.startsWith(type))throw Error(url+' wrong MIME type');
  const actual=Buffer.from(await response.arrayBuffer());
  if(hash(actual)!==hash(expected))throw Error(url+' does not match reviewed source');
  console.log('VERIFIED',url,actual.length,hash(actual));
}));
if(process.argv.includes('--links')){
  const links=[...new Set([...html.matchAll(/href="(https:\/\/pvlab\.studio\/[^" ]*)"/g)].map(m=>m[1]))];
  for(const url of links){
    if(!text.includes(url))throw Error('Missing plain-text link '+url);
    const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
    if(!response.ok||new URL(response.url).origin!=='https://pvlab.studio')throw Error('Broken or external redirect: '+url);
    const body=await response.text();
    if(!response.headers.get('content-type')?.includes('text/html')||!/<html/i.test(body))throw Error('Invalid destination '+url);
    console.log('LINK VERIFIED',url,response.status,response.url);
  }
}
