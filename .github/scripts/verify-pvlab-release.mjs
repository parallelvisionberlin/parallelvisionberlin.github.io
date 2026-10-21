// Read-only publication evidence. Never deploys, changes settings or starts login.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const repository='parallelvisionberlin/parallelvisionberlin.github.io';
export const productionUrl='https://pvlab.studio/studio';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

export async function verifyRelease({sha,asset,version,sourceBytes,request=fetch}){
  if(!/^[a-f0-9]{40}$/.test(sha||''))throw Error('Use the full reviewed deployment commit SHA.');
  if(!/^lab\/[a-zA-Z0-9_./-]+\.(css|js)$/.test(asset||'')||asset.split('/').includes('..'))
    throw Error('Use a CSS or JS repository path under lab/.');
  if(!version)throw Error('Supply the expected asset v query value.');
  if(!sourceBytes?.length)throw Error('Reviewed source bytes are required.');
  async function get(url,github=false){
    const headers=github?{Accept:'application/vnd.github+json'}:{};
    if(github&&process.env.GITHUB_TOKEN)headers.Authorization='Bearer '+process.env.GITHUB_TOKEN;
    const response=await request(url,{headers,cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error((github?'GitHub evidence':'Production evidence')+' unavailable: HTTP '+response.status);
    return response;
  }
  const checks=[];
  for(let page=1;page<=10;page++){
    const result=await (await get(`https://api.github.com/repos/${repository}/commits/${sha}/check-runs?per_page=100&page=${page}`,true)).json();
    checks.push(...(result.check_runs||[]));
    if((result.check_runs||[]).length<100)break;
  }
  const cloudflare=checks.filter(check=>{
    if(check.name!=='Cloudflare Pages'||check.head_sha!==sha||check.app?.slug!=='cloudflare-workers-and-pages')return false;
    try{
      const url=new URL(check.details_url);
      return url.origin==='https://dash.cloudflare.com'&&(url.searchParams.get('to')||url.pathname).includes('/pages/view/pvlab-studio/');
    }catch{return false;}
  }).sort((a,b)=>b.id-a.id)[0];
  const evidence={commit:sha,productionUrl,asset,version,signedInBehavior:'not verified by this command'};
  if(!cloudflare)return {...evidence,state:'CLOUDFLARE_UNKNOWN'};
  evidence.cloudflare={id:cloudflare.id,status:cloudflare.status,conclusion:cloudflare.conclusion};
  if(cloudflare.status!=='completed')return {...evidence,state:'CLOUDFLARE_PENDING'};
  if(cloudflare.conclusion!=='success')return {...evidence,state:'CLOUDFLARE_FAILED'};
  const html=await (await get(productionUrl)).text();
  const references=[...html.matchAll(/<(?:link|script)\b[^>]*\b(?:href|src)=["']([^"']+)["']/gi)]
    .map(match=>new URL(match[1].replaceAll('&amp;','&'),productionUrl));
  const deployed=references.find(url=>url.origin===new URL(productionUrl).origin&&
    url.pathname==='/'+asset.slice(4)&&url.searchParams.get('v')===version);
  if(!deployed)return {...evidence,state:'LIVE_VERSION_MISMATCH'};
  const bytes=Buffer.from(await (await get(deployed.href)).arrayBuffer());
  if(hash(bytes)!==hash(sourceBytes))return {...evidence,state:'LIVE_BYTES_MISMATCH'};
  return {...evidence,state:'LIVE_VERIFIED',sha256:hash(bytes)};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const args=process.argv.slice(2),options={};
    for(let i=0;i<args.length;i+=2){
      if(!['--sha','--asset','--version'].includes(args[i])||!args[i+1])throw Error('Usage: --sha FULL_SHA --asset lab/FILE.css --version EXPECTED_V');
      options[args[i].slice(2)]=args[i+1];
    }
    if(!/^[a-f0-9]{40}$/.test(options.sha||''))throw Error('Use the full reviewed deployment commit SHA.');
    options.sourceBytes=execFileSync('git',['show',options.sha+':'+options.asset],{stdio:['ignore','pipe','pipe']});
    const result=await verifyRelease(options);
    console.log(JSON.stringify(result,null,2));
    process.exitCode=result.state==='LIVE_VERIFIED'?0:2;
  }catch(error){
    console.error(JSON.stringify({state:'EVIDENCE_UNAVAILABLE',reason:error.message}));
    process.exitCode=1;
  }
}
