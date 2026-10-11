// Private, authenticated My Moods boards. Images stay in the existing R2 archive.
// Boards are reusable prompt recipes, not trained style models or public galleries.
export const MOODBOARD_BUILTINS=new Set(['hong-kong-nights','90s-cinema','night-flash','fashion-editorial','80s-film','kodak-gold','soft-pastel-film','frutiger-aero','dreamcore','sumi-ink','hyper-pop']);
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function validateMoodboard(value,fail){
  if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'Invalid moodboard.');
  const name=typeof value.name==='string'?value.name.trim():'';
  const direction=typeof value.direction==='string'?value.direction.trim():'';
  const baseMoodId=value.baseMoodId==null||value.baseMoodId===''?null:value.baseMoodId;
  const intensity=Number(value.intensity??60);
  const imageIds=value.imageIds??[];
  if(!name||name.length>64||/[\x00-\x1f]/.test(name))fail(400,'Name the Mood in 64 characters or fewer.');
  if(direction.length>900||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(direction))fail(400,'Keep the style direction under 900 characters.');
  if(baseMoodId!==null&&!MOODBOARD_BUILTINS.has(baseMoodId))fail(400,'Choose a supported starting Mood.');
  if(!direction&&!baseMoodId)fail(400,'Describe the look, or choose a curated Mood as a starting point.');
  if(!Number.isInteger(intensity)||intensity<1||intensity>100)fail(400,'Mood intensity must be between 1 and 100.');
  if(!Array.isArray(imageIds)||imageIds.length>12||imageIds.some(id=>typeof id!=='string'||!UUID.test(id))||new Set(imageIds).size!==imageIds.length)
    fail(400,'Choose up to 12 different private images for the Mood.');
  const palette=value.palette??[],qualities=value.qualities??[];
  if(!Array.isArray(palette)||palette.length>5||palette.some(v=>typeof v!=='string'||!/^#[0-9a-f]{6}$/i.test(v)))
    fail(400,'Choose up to five valid Mood palette colors.');
  if(!Array.isArray(qualities)||qualities.length>5||qualities.some(v=>typeof v!=='string'||!v.trim()||v.length>30))
    fail(400,'Use up to five short Mood qualities.');
  return {name,direction,baseMoodId,intensity,imageIds,palette,qualities};
}
const view=(r,details)=>({id:r.id,name:r.name,direction:r.direction,baseMoodId:r.base_mood_id,intensity:r.intensity,imageIds:JSON.parse(r.image_ids),
  palette:details?.palette?JSON.parse(details.palette):[],qualities:details?.qualities?JSON.parse(details.qualities):[],
  createdAt:r.created_at,updatedAt:r.updated_at});
export async function moodBoardsRoute(request,env,owner,url,{body,first,rows,run,uid,fail,json,now}){
  const path=url.pathname,method=request.method;
  if(path==='/api/moodboards'&&method==='GET'){
    const list=await rows(env,'SELECT id,name,direction,base_mood_id,intensity,image_ids,created_at,updated_at FROM moodboards WHERE owner_id=? ORDER BY updated_at DESC',owner);
    const details=await rows(env,'SELECT id,palette,qualities FROM moodboard_style_data WHERE owner_id=?',owner);
    const byId=new Map(details.map(x=>[x.id,x]));
    return json({moodboards:list.map(board=>view(board,byId.get(board.id)))});
  }
  const parts=path.split('/').filter(Boolean),hasId=parts.length===3&&parts[0]==='api'&&parts[1]==='moodboards';
  if(path==='/api/moodboards'&&method==='POST'||hasId&&method==='POST'){
    // Verify board ownership BEFORE checking any submitted asset IDs.
    // Otherwise an unrelated user could learn about image availability.
    if(hasId){
      const boardId=uid(parts[2]),existing=await first(env,'SELECT id FROM moodboards WHERE id=? AND owner_id=?',boardId,owner);
      if(!existing)fail(404,'Moodboard not found.');
    }
    const input=validateMoodboard(await body(request),fail);
    for(const id of input.imageIds){
      const asset=await first(env,"SELECT id FROM assets WHERE id=? AND owner_id=? AND kind='source' AND mime IN ('image/jpeg','image/png','image/webp')",id,owner);
      if(!asset)fail(404,'One selected image is no longer in your private archive.');
    }
    const stamp=now(),images=JSON.stringify(input.imageIds);
    if(!hasId){
      const count=await first(env,'SELECT COUNT(*) AS n FROM moodboards WHERE owner_id=?',owner);
      if(Number(count?.n||0)>=30)fail(409,'My Moods supports up to 30 personal boards.');
      const id=crypto.randomUUID();
      await run(env,'INSERT INTO moodboards(id,owner_id,name,direction,base_mood_id,intensity,image_ids,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)',
        id,owner,input.name,input.direction,input.baseMoodId,input.intensity,images,stamp,stamp);
      await run(env,'INSERT INTO moodboard_style_data(id,owner_id,palette,qualities) VALUES(?,?,?,?)',
        id,owner,JSON.stringify(input.palette),JSON.stringify(input.qualities));
      return json({moodboard:{id,...input,createdAt:stamp,updatedAt:stamp}},201);
    }
    const id=uid(parts[2]),found=await first(env,'SELECT id FROM moodboards WHERE id=? AND owner_id=?',id,owner);
    if(!found)fail(404,'Moodboard not found.');
    await run(env,'UPDATE moodboards SET name=?,direction=?,base_mood_id=?,intensity=?,image_ids=?,updated_at=? WHERE id=? AND owner_id=?',
      input.name,input.direction,input.baseMoodId,input.intensity,images,stamp,id,owner);
    // Legacy mini-editor updates without palette fields keep earlier visual notes.
    if(input.palette.length||input.qualities.length){
      await run(env,'INSERT INTO moodboard_style_data(id,owner_id,palette,qualities) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET palette=excluded.palette,qualities=excluded.qualities WHERE owner_id=excluded.owner_id',
        id,owner,JSON.stringify(input.palette),JSON.stringify(input.qualities));
    }
    return json({moodboard:{id,...input,updatedAt:stamp}});
  }
  if(hasId&&method==='DELETE'){
    const id=uid(parts[2]),found=await first(env,'SELECT id FROM moodboards WHERE id=? AND owner_id=?',id,owner);
    if(!found)fail(404,'Moodboard not found.');
    await run(env,'DELETE FROM moodboard_style_data WHERE id=? AND owner_id=?',id,owner);
    await run(env,'DELETE FROM moodboards WHERE id=? AND owner_id=?',id,owner);
    // Deleting a board never deletes an image or generation history record.
    return json({ok:true});
  }
  fail(405,'Unsupported My Moods operation.');
}
