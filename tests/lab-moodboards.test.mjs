import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {moodBoardsRoute,validateMoodboard} from '../lab-worker/moodboards.mjs';
const id=n=>'30000000-0000-4000-8000-'+String(n).padStart(12,'0');
const fail=(code,message)=>{const e=new Error(message);e.status=code;throw e;};
const json=(x,status=200)=>Response.json(x,{status});
function harness(){
  const db=new DatabaseSync(':memory:');
  db.exec("CREATE TABLE lab_migrations(id TEXT PRIMARY KEY,applied_at INTEGER); CREATE TABLE assets(id TEXT PRIMARY KEY,owner_id TEXT,kind TEXT,mime TEXT);");
  db.exec("CREATE TABLE moodboards(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,name TEXT NOT NULL,direction TEXT NOT NULL,base_mood_id TEXT,intensity INTEGER NOT NULL,image_ids TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL); CREATE INDEX moodboards_owner ON moodboards(owner_id,updated_at DESC); CREATE TABLE moodboard_style_data(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,palette TEXT NOT NULL,qualities TEXT NOT NULL);");
  db.prepare('INSERT INTO assets VALUES(?,?,?,?)').run(id(1),'owner-A','source','image/png');
  db.prepare('INSERT INTO assets VALUES(?,?,?,?)').run(id(2),'owner-B','source','image/png');
  const d={
    first:async(_env,sql,...args)=>db.prepare(sql).get(...args)||null,
    rows:async(_env,sql,...args)=>db.prepare(sql).all(...args),
    run:async(_env,sql,...args)=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}}),
    uid:value=>{if(!/^[-a-f0-9]{36}$/i.test(value))fail(400,'Bad id');return value;},
    body:async request=>request.json(),
    json,fail,now:()=>Date.now()
  };
  const call=async(path,method='GET',body=null,owner='owner-A')=>{
    const request=new Request('https://example.test'+path,{method,body:body?JSON.stringify(body):undefined});
    return moodBoardsRoute(request,{},owner,new URL(request.url),d);
  };
  return {db,call};
}
const payload={name:'Liquid Memory',direction:'Soft pearly wet light on existing matter, physical mist.',baseMoodId:'dreamcore',intensity:75,imageIds:[id(1)]};
test('My Moods validates size, privacy and meaningful style intent',()=>{
  assert.deepEqual(validateMoodboard(payload,fail),{...payload,palette:[],qualities:[]});
  assert.throws(()=>validateMoodboard({...payload,name:''},fail),/Name the Mood/);
  assert.throws(()=>validateMoodboard({...payload,baseMoodId:'fake'},fail),/supported starting Mood/);
  assert.throws(()=>validateMoodboard({...payload,imageIds:[id(1),id(1)]},fail),/different private images/);
  assert.throws(()=>validateMoodboard({...payload,baseMoodId:null,direction:''},fail),/Describe the look/);
  assert.throws(()=>validateMoodboard({...payload,direction:'x'.repeat(901)},fail),/under 900/);
  assert.throws(()=>validateMoodboard({...payload,palette:['javascript:alert(1)']},fail),/palette colors/);
  assert.deepEqual(validateMoodboard({...payload,palette:['#c2d1a9'],qualities:['Pearlescent reflections']},fail).palette,['#c2d1a9']);
});
test('My Moods create, edit, collect images, list and delete stay account scoped',async()=>{
  const {call}=harness();
  const created=await call('/api/moodboards','POST',payload);
  assert.equal(created.status,201);
  const board=(await created.json()).moodboard;
  assert.equal(board.name,'Liquid Memory');
  assert.deepEqual(board.palette,[]);
  assert.deepEqual(board.imageIds,[id(1)]);
  const own=await (await call('/api/moodboards')).json();
  assert.equal(own.moodboards.length,1);
  assert.equal(own.moodboards[0].id,board.id);
  assert.equal((await (await call('/api/moodboards','GET',null,'owner-B')).json()).moodboards.length,0);
  await assert.rejects(()=>call('/api/moodboards','POST',{...payload,imageIds:[id(2)]}),/private archive/);
  await assert.rejects(()=>call('/api/moodboards/'+board.id,'POST',payload,'owner-B'),/not found/);
  const changed=await (await call('/api/moodboards/'+board.id,'POST',{...payload,name:'Opal Shore',intensity:100,imageIds:[],palette:['#ffffff','#123456'],qualities:['Wet film','Soft haze']})).json();
  assert.equal(changed.moodboard.name,'Opal Shore');
  assert.deepEqual(changed.moodboard.imageIds,[]);
  const reloaded=(await (await call('/api/moodboards')).json()).moodboards[0];
  assert.deepEqual(reloaded.palette,['#ffffff','#123456']);
  assert.deepEqual(reloaded.qualities,['Wet film','Soft haze']);
  await assert.rejects(()=>call('/api/moodboards/'+board.id,'DELETE',null,'owner-B'),/not found/);
  assert.equal((await call('/api/moodboards/'+board.id,'DELETE')).status,200);
  assert.equal((await (await call('/api/moodboards')).json()).moodboards.length,0);
});
