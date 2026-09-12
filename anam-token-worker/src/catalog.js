export const CATALOG_URL='https://parallelvisionlabel.com/index.html';
let cache=null;
const clean=value=>String(value||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
const normalize=value=>clean(value).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase();
function link(value){try{const url=new URL(value,CATALOG_URL);return url.protocol==='https:'?url.href:null;}catch{return null;}}
export function parseCatalog(html) {
  const entries=[];
  const cards=html.matchAll(/<(article|a)\b([^>]*\bclass=["'][^"']*\brelease-card\b[^"']*["'][^>]*)>([\s\S]*?)<\/\1>/gi);
  for(const card of cards) {
    const field=name=>[...card[3].matchAll(new RegExp(`<span\\b[^>]*class=["'][^"']*\\b${name}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/span>`,'gi'))].map(m=>clean(m[1]));
    const title=field('release-title')[0];if(!title)continue;
    const meta=field('release-meta');
    const href=(card[2].match(/\bhref=["']([^"']+)/i)||card[3].match(/<a\b[^>]*href=["']([^"']+)/i))?.[1];
    entries.push({title,artist:meta[0]||'',details:meta.slice(1).join(' / '),status:field('release-status')[0]||'',url:href?link(href):null});
  }
  return entries;
}
export async function lookupCatalog(query='',fetcher=fetch) {
  if(typeof query!=='string'||query.length>160)throw new Error('Use a short catalog search.');
  let stale=false;
  if(!cache||Date.now()-cache.time>300000) {
    try {
      const response=await fetcher(CATALOG_URL,{signal:AbortSignal.timeout(8000)});
      if(!response.ok)throw new Error('Catalog unavailable');
      const html=await response.text();if(html.length>2000000)throw new Error('Catalog unavailable');
      const entries=parseCatalog(html);if(!entries.length)throw new Error('Catalog unavailable');
      cache={entries,time:Date.now()};
    } catch {if(!cache||Date.now()-cache.time>86400000)throw new Error('Catalog temporarily unavailable');stale=true;}
  }
  const terms=normalize(query).split(/\s+/).filter(Boolean);
  const results=cache.entries.map(entry=>({entry,score:terms.filter(term=>normalize(Object.values(entry).filter(Boolean).join(' ')).includes(term)).length}))
    .filter(row=>!terms.length||row.score>0).sort((a,b)=>b.score-a.score).slice(0,8).map(row=>row.entry);
  return {results,source:CATALOG_URL,fetchedAt:new Date(cache.time).toISOString(),stale,
    interpretation:'Published catalog metadata only. Missing metadata is unknown. A link does not mean Nina listened to the audio.'};
}
