// Public link resolution returns only the existing referral destination.
export async function resolveBelliniLink(fetchImpl=fetch){
  const response=await fetchImpl('https://parallel-vision-lab.parallelvision.workers.dev/api/partners/bellini/link',{
    headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('La invitación no está disponible ahora.');
  const data=await response.json(),target=new URL(data.url);
  if(target.origin!=='https://pvlab.studio'||target.pathname!=='/'||target.username||target.password||
    !/^[A-HJ-NP-Z2-9]{8}$/.test(target.searchParams.get('ref')||''))throw Error('Invitación no válida.');
  target.search=new URLSearchParams({ref:target.searchParams.get('ref')}).toString();target.hash='';
  return target.href;
}
