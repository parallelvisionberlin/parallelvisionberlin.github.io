// One-time, least-surprise PV LAB domain cutover, run only from main after the
// production Worker deploy completes. Never changes Parallel Vision's zone.
const account='a40ce1725295563a7b7db9fc3160480a';
const name='pvlab.studio',project='pvlab-studio';
const token=process.env.CLOUDFLARE_API_TOKEN;
if(!token||token.length<15)throw Error('Cloudflare API token unavailable. Use Pages custom domain UI.');
const base='https://api.cloudflare.com/client/v4';
async function api(path,{method='GET',data}={}){
  const response=await fetch(base+path,{
    method,headers:{Authorization:'Bearer '+token,...(data?{'Content-Type':'application/json'}:{})},
    ...(data?{body:JSON.stringify(data)}:{})
  });
  const json=await response.json().catch(()=>null);
  if(!response.ok||!json?.success){
    const codes=(json?.errors||[]).map(e=>e.code).join(',');
    throw Error('Cloudflare '+method+' '+path+' failed (HTTP '+response.status+', codes '+codes+'). Check API-token Pages/DNS permissions.');
  }
  return json.result;
}
// Preflight confirms the exact Pages project and zone are in the same account.
const page=await api('/accounts/'+account+'/pages/projects/'+project);
if(page.name!==project)throw Error('Wrong Cloudflare Pages project. No DNS changed.');
const zones=await api('/zones?name='+encodeURIComponent(name)+'&per_page=20');
const zone=zones.find(z=>z.name===name&&z.account?.id===account);
if(!zone||zone.status!=='active')throw Error('PV LAB Cloudflare DNS zone is not active or belongs to another account. No DNS changed.');
const records=await api('/zones/'+zone.id+'/dns_records?name='+encodeURIComponent(name)+'&per_page=100');
const root=records.filter(r=>r.name===name);
const parking=root.filter(r=>r.type==='A'&&['207.207.210.229','207.207.210.107'].includes(r.content));
const other=root.filter(r=>!parking.includes(r) && !(r.type==='CNAME'&&r.content===project+'.pages.dev'));
if(other.length)throw Error('Unexpected apex DNS records present. No DNS changed; inspect pvlab.studio manually.');
const paths='/accounts/'+account+'/pages/projects/'+project+'/domains';
let domains=await api(paths);
const existing=domains.find(d=>d.name===name);
if(existing?.status==='active'){
  console.log('pvlab.studio is already an active Pages custom domain.');process.exit(0);
}
// Remove ONLY the two Porkbun parking addresses observed and confirmed earlier.
// Leave Clerk authentication, email, any MX/TXT and other domain zones untouched.
for(const record of parking){
  await api('/zones/'+zone.id+'/dns_records/'+record.id,{method:'DELETE'});
  console.log('Removed one obsolete Porkbun parking A record from pvlab.studio.');
}
const apex=records.find(r=>r.name===name&&r.type==='CNAME'&&r.content===project+'.pages.dev');
if(!apex){
  await api('/zones/'+zone.id+'/dns_records',{method:'POST',
    data:{name,type:'CNAME',content:project+'.pages.dev',proxied:true,ttl:1,
      comment:'PV LAB independent Cloudflare Pages site'}});
  console.log('Created proxied PV LAB apex CNAME.');
}
if(!existing){
  await api(paths,{method:'POST',data:{name}});
  console.log('Attached pvlab.studio to Cloudflare Pages project pvlab-studio.');
}else{
  await api(paths+'/'+name,{method:'PATCH'});
  console.log('Retried existing Pages custom-domain validation.');
}
const domain=(await api(paths)).find(d=>d.name===name);
if(!domain)throw Error('Pages custom domain did not appear after attachment.');
console.log('PV LAB Pages domain status:',domain.status);
if(domain.status==='error'||domain.status==='blocked')
  throw Error('Cloudflare reports an error during Pages domain validation.');
console.log('Custom domain submitted successfully. Active TLS/DNS status may take time to complete.');
