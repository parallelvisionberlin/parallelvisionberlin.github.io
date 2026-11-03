const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const clean=(v,max,required=false)=>{if(typeof v!=='string'||v.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v)||required&&!v.trim())fail(400,'Check your experiment details.');return v.trim();};
const view=r=>({id:r.id,releaseId:r.release_id,hypothesis:r.hypothesis,change:r.change_note,result:r.result_note,status:r.status,context:JSON.parse(r.context),revision:r.revision,createdAt:r.created_at,updatedAt:r.updated_at});
export async function experimentRoute({env,scope,path,method,time,readBody,ownsRelease,uuid}){
 const db=env.LAB_DB;
 if(path==='/experiments'&&method==='GET')return json({experiments:(await db.prepare('SELECT * FROM music_experiments WHERE account_id=? ORDER BY updated_at DESC LIMIT 500').bind(scope).all()).results.map(view)});
 const id=path.slice('/experiments/'.length),create=path==='/experiments';
 if(method!=='POST'||!create&&!uuid.test(id))fail(405,'Unsupported experiment action.');
 const data=await readBody(),releaseId=data.releaseId||'';
 if(releaseId&&(!uuid.test(releaseId)||!await ownsRelease(releaseId)))fail(404,'Smart link not found.');
 const hypothesis=clean(data.hypothesis,200,true),change=clean(data.change||'',2000),result=clean(data.result||'',2000);
 if(!['idea','testing','concluded'].includes(data.status))fail(400,'Choose an experiment status.');
 const c=data.context||{},context={};
 for(const key of ['start','end','source','campaign','mode'])if(c[key]!==undefined)context[key]=clean(c[key],100);
 for(const key of ['views','clicks'])if(c[key]!==undefined){if(!Number.isSafeInteger(c[key])||c[key]<0)fail(400,'Invalid experiment snapshot.');context[key]=c[key];}
 const values=[releaseId,hypothesis,change,result,data.status,JSON.stringify(context),time];
 if(create){if(!uuid.test(data.id||''))fail(400,'Reload the experiment form.');
  const count=await db.prepare('SELECT COUNT(*) AS n FROM music_experiments WHERE account_id=?').bind(scope).first();if(count.n>=500)fail(409,'Export your log before adding more entries. The limit is 500.');
  const exists=await db.prepare('SELECT id FROM music_experiments WHERE id=?').bind(data.id).first();if(exists)fail(409,'Entry already saved. Reload the log.');
  await db.prepare('INSERT INTO music_experiments(id,account_id,release_id,hypothesis,change_note,result_note,status,context,updated_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(data.id,scope,...values,time).run();
  return json({experiment:view(await db.prepare('SELECT * FROM music_experiments WHERE id=? AND account_id=?').bind(data.id,scope).first())});
 }
 if(!Number.isSafeInteger(data.revision)||data.revision<1)fail(400,'Reload this experiment.');
 const changed=await db.prepare('UPDATE music_experiments SET release_id=?,hypothesis=?,change_note=?,result_note=?,status=?,context=?,updated_at=?,revision=revision+1 WHERE id=? AND account_id=? AND revision=?').bind(...values,id,scope,data.revision).run();
 if(!changed.meta.changes)fail(409,'Entry changed or is unavailable. Reload the log before saving.');
 return json({experiment:view(await db.prepare('SELECT * FROM music_experiments WHERE id=? AND account_id=?').bind(id,scope).first())});
}
