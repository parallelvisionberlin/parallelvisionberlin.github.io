import {ensureGalleryDimensions} from './gallery-dimensions.mjs';
// Account-scoped organization. Membership never copies or alters media files.
export async function ensureLibrary(env){
  await env.LAB_DB.batch([
    env.LAB_DB.prepare('CREATE TABLE IF NOT EXISTS library_folders (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, name TEXT NOT NULL, created_at INTEGER NOT NULL)'),
    env.LAB_DB.prepare('CREATE TABLE IF NOT EXISTS library_members (owner_id TEXT NOT NULL, folder_id TEXT NOT NULL, job_id TEXT NOT NULL, PRIMARY KEY(owner_id,folder_id,job_id))'),
    env.LAB_DB.prepare('CREATE TABLE IF NOT EXISTS library_favorites (owner_id TEXT NOT NULL, job_id TEXT NOT NULL, PRIMARY KEY(owner_id,job_id))')
  ]);
}
export async function libraryRoute(request,env,owner,url,{body,uid,fail,rows,first,run}){
  await ensureLibrary(env);
  const path=url.pathname,method=request.method;
  if(path==='/api/library'&&method==='GET')return {folders:await rows(env,'SELECT f.id,f.name,COUNT(j.id) AS count FROM library_folders f LEFT JOIN library_members m ON m.folder_id=f.id AND m.owner_id=f.owner_id LEFT JOIN jobs j ON j.id=m.job_id AND j.owner_id=f.owner_id WHERE f.owner_id=? GROUP BY f.id ORDER BY f.created_at,f.id',owner)};
  if(path==='/api/library/folders'&&method==='POST'){
    const data=await body(request),name=String(data.name||'').trim();
    if(!name||name.length>80)fail(400,'Choose a folder name of 1–80 characters.');
    if((await first(env,'SELECT COUNT(*) AS n FROM library_folders WHERE owner_id=?',owner)).n>=200)fail(409,'Folder limit reached.');
    const id=crypto.randomUUID();await run(env,'INSERT INTO library_folders VALUES(?,?,?,?)',id,owner,name,Date.now());return {folder:{id,name,count:0}};
  }
  if((path==='/api/library/members'||path==='/api/library/archive')&&method==='POST'){
    const data=await body(request),ids=Array.isArray(data.ids)?[...new Set(data.ids.map(uid))]:[];
    if(!ids.length||ids.length>100)fail(400,'Select 1–100 items.');
    for(const id of ids)if(!await first(env,'SELECT id FROM jobs WHERE owner_id=? AND id=?',owner,id))fail(404,'Selected item not found.');
    if(path==='/api/library/archive'){
      // Insert-if-absent is atomic, including concurrent first-time Archive actions.
      await run(env,'INSERT INTO library_folders(id,owner_id,name,created_at) SELECT ?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM library_folders WHERE owner_id=? AND name=?)',crypto.randomUUID(),owner,'Archive',Date.now(),owner,'Archive');
      data.folderId=(await first(env,'SELECT id FROM library_folders WHERE owner_id=? AND name=? ORDER BY created_at,id LIMIT 1',owner,'Archive')).id;
      delete data.favorite;delete data.remove;
    }
    let sql;
    if(typeof data.favorite==='boolean')sql=data.favorite?'INSERT OR IGNORE INTO library_favorites(owner_id,job_id) VALUES(?,?)':'DELETE FROM library_favorites WHERE owner_id=? AND job_id=?';
    else{
      const folderId=uid(data.folderId);
      if(!await first(env,'SELECT id FROM library_folders WHERE owner_id=? AND id=?',owner,folderId))fail(404,'Folder not found.');
      sql=data.remove===true?'DELETE FROM library_members WHERE owner_id=? AND folder_id=? AND job_id=?':'INSERT OR IGNORE INTO library_members(owner_id,folder_id,job_id) VALUES(?,?,?)';
      await env.LAB_DB.batch(ids.map(id=>env.LAB_DB.prepare(sql).bind(owner,folderId,id)));return {ok:true};
    }
    await env.LAB_DB.batch(ids.map(id=>env.LAB_DB.prepare(sql).bind(owner,id)));return {ok:true};
  }
  fail(404,'Library action not found.');
}
export async function libraryJobs(env,owner,url,{rows,uid,fail,jobView}){
  await ensureLibrary(env);
  const before=Number(url.searchParams.get('before')||Date.now()+1),afterId=url.searchParams.get('afterId')||'~';
  if(!Number.isSafeInteger(before)||before<0||afterId.length>40)fail(400,'Invalid history cursor.');
  const clauses=['j.owner_id=?','(j.created_at<? OR (j.created_at=? AND j.id<?))'],args=[owner,before,before,afterId];
  const folder=url.searchParams.get('folder'),kind=url.searchParams.get('kind');
  if(folder){clauses.push('EXISTS(SELECT 1 FROM library_members m WHERE m.owner_id=j.owner_id AND m.job_id=j.id AND m.folder_id=?)');args.push(uid(folder));}
  // Image/Video grids request unfiled work. Assets retains the complete library.
  if(url.searchParams.get('unfiled')==='1'&&!folder&&url.searchParams.get('favorite')!=='1')clauses.push('NOT EXISTS(SELECT 1 FROM library_members m WHERE m.owner_id=j.owner_id AND m.job_id=j.id)');
  if(url.searchParams.get('favorite')==='1')clauses.push('EXISTS(SELECT 1 FROM library_favorites f WHERE f.owner_id=j.owner_id AND f.job_id=j.id)');
  if(['image','video'].includes(kind)){clauses.push("json_extract(j.params,'$.type')=?");args.push(kind);}
  const list=await rows(env,`SELECT j.*,EXISTS(SELECT 1 FROM library_favorites f WHERE f.owner_id=j.owner_id AND f.job_id=j.id) AS favorite FROM jobs j WHERE ${clauses.join(' AND ')} ORDER BY j.created_at DESC,j.id DESC LIMIT 21`,...args);
  const more=list.length>20;if(more)list.pop();const last=list.at(-1);
  // Resolve stored output geometry before returning any cards. Cache it once per asset.
  for(let i=0;i<list.length;i+=4)await Promise.all(list.slice(i,i+4).map(j=>ensureGalleryDimensions(env,j)));
  return {jobs:list.map(j=>({...jobView(j),favorite:!!j.favorite})),next:more?{before:last.created_at,afterId:last.id}:null};
}
