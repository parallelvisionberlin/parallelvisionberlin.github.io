import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { buildTranscriptExport, transcriptWindow } from '../src/transcript-export.js';

const NOW = Date.parse('2026-09-09T23:45:00.000Z');
const OWNER = { id: 'owner', role: 'owner', memory_visitor_id: 'owner-memory' };
const ids = [1, 2, 3, 4, 5].map(i => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);

function fixture() {
  const db = new DatabaseSync(':memory:');
  for (const file of ['0001_nina_memory.sql', '0002_authenticated_users.sql']) db.exec(readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8'));
  for (const id of ['owner', 'other']) {
    db.prepare('INSERT INTO visitors VALUES (?, ?, ?, ?, ?)').run(id+'-memory', id, 'visitor', '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z');
    db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, 'clerk', 'user_'+id, id+'@example.invalid', id, id==='owner'?'owner':'user', id+'-memory', '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z');
  }
  for (const [i, count] of [12, 61, 24, 85, 46].entries()) {
    const at = new Date(NOW - (6-i)*300000).toISOString();
    db.prepare('INSERT INTO conversations VALUES (?, ?, ?, ?)').run(ids[i], OWNER.memory_visitor_id, at, at);
    for (let j=0; j<count; j++) db.prepare('INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?)').run(`m${i}-${j}`, ids[i], OWNER.memory_visitor_id, j%2?'user':'persona', `literal ${i}:${j}\n\ná [quietly] <script>not HTML</script>`, at);
  }
  db.prepare('INSERT INTO conversations VALUES (?, ?, ?, ?)').run('other-conversation', 'other-memory', new Date(NOW-1000).toISOString(), null);
  db.prepare('INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?)').run('private-other', 'other-conversation', 'other-memory', 'user', 'OTHER ACCOUNT TEXT', new Date(NOW-1000).toISOString());
  const queries = [];
  const env = { NINA_MEMORY_DB: { prepare(sql) {
    queries.push(sql);
    let values = [];
    return { bind(...args) { values=args; return this; }, async all() { return { results: db.prepare(sql).all(...values) }; }, async first() { return db.prepare(sql).get(...values) || null; } };
  } } };
  return { db, env, queries };
}

test('228 literal messages, five conversations, no dependency on analytics links and no other account', async () => {
  const { db, env, queries } = fixture();
  try {
    const result = await buildTranscriptExport(env, OWNER, new URLSearchParams({period:'last3h'}), NOW);
    assert.equal(result.messages, 228); assert.equal(result.conversations, 5);
    assert.equal((result.text.match(/^literal /gm)||[]).length, 228);
    assert.ok(result.text.includes('literal 4:45\n\ná [quietly] <script>not HTML</script>'));
    assert.ok(result.text.indexOf('literal 1:9\n') < result.text.indexOf('literal 1:10\n'));
    assert.ok(!result.text.includes('OTHER ACCOUNT TEXT'));
    assert.ok(queries.every(sql => /^\s*SELECT/.test(sql)));
  } finally { db.close(); }
});

test('single conversation, explicit account, empty record, missing account, no silent truncation', async () => {
  const { db, env } = fixture();
  try {
    const single = await buildTranscriptExport(env, OWNER, new URLSearchParams({conversation:ids[3]}), NOW);
    assert.equal(single.messages,85); assert.equal(single.conversations,1);
    const other = await buildTranscriptExport(env, OWNER, new URLSearchParams({user:'OTHER@example.invalid'}), NOW);
    assert.equal(other.messages,1); assert.ok(other.text.includes('OTHER ACCOUNT TEXT'));
    db.prepare('INSERT INTO conversations VALUES (?, ?, ?, ?)').run('empty', OWNER.memory_visitor_id, new Date(NOW-1000).toISOString(), null);
    assert.equal((await buildTranscriptExport(env, OWNER, new URLSearchParams(), NOW)).conversations,6);
    await assert.rejects(buildTranscriptExport(env, OWNER, new URLSearchParams({user:"' OR 1=1 --"}), NOW), {status:404});
    await assert.rejects(buildTranscriptExport(env, {...OWNER,role:'user'}, new URLSearchParams(), NOW), {status:403});
    await assert.rejects(buildTranscriptExport(env, OWNER, new URLSearchParams({conversation:'invalid'}), NOW), {status:400});
    await assert.rejects(buildTranscriptExport(env, {role:'owner'}, new URLSearchParams(), NOW), {status:404});
    const oversized = { NINA_MEMORY_DB: {prepare(){return {bind(){return this;},async all(){return {results:Array(10001).fill({})};}};}}};
    await assert.rejects(buildTranscriptExport(oversized, OWNER, new URLSearchParams(), NOW), {status:413});
  } finally { db.close(); }
});

test('Berlin dates, DST, end-exclusive range and invalid dates', () => {
  assert.equal(transcriptWindow(new URLSearchParams(),NOW).start,'2026-09-09T22:00:00.000Z');
  for (const [date,hours] of [['2026-03-29',23],['2026-10-25',25]]) {
    const {start,end} = transcriptWindow(new URLSearchParams({period:'custom',from:date,to:date}));
    assert.equal((Date.parse(end)-Date.parse(start))/3600000,hours);
  }
  for (const query of [{period:'custom',from:'2026-02-30',to:'2026-03-01'}, {period:'custom',from:'2026-09-11',to:'2026-09-10'}, {period:'custom',from:'2026-01-01',to:'2026-03-01'}, {period:'anything'}]) {
    assert.throws(()=>transcriptWindow(new URLSearchParams(query)),{status:400});
  }
});

test('range does not include messages outside its boundaries', async () => {
  const { db, env } = fixture();
  try {
    for (const [id,time] of [['before','2026-09-09T21:59:59.999Z'],['start','2026-09-09T22:00:00.000Z'],['end','2026-09-10T22:00:00.000Z']]) {
      db.prepare('INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?)').run(id,ids[0],OWNER.memory_visitor_id,'user','BOUNDARY-'+id,time);
    }
    const {text} = await buildTranscriptExport(env,OWNER,new URLSearchParams({period:'custom',from:'2026-09-10',to:'2026-09-10'}),NOW);
    assert.ok(text.includes('BOUNDARY-start')); assert.ok(!text.includes('BOUNDARY-before')); assert.ok(!text.includes('BOUNDARY-end'));
  } finally { db.close(); }
});

test('HTTP authorization, attachment and CORS, invalid origin, safe errors', async () => {
  const { default: worker } = await import('../src/index.js');
  const { db, env } = fixture();
  const origin = 'http://127.0.0.1:4173';
  const issuer = 'https://transcript-export.clerk.accounts.dev';
  const keys = await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
  const jwk = await crypto.subtle.exportKey('jwk',keys.publicKey); jwk.kid='transcript-test';
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  async function token(sub) {
    const now = Math.floor(Date.now()/1000);
    const body = `${encode({alg:'RS256',kid:jwk.kid})}.${encode({sub:'user_'+sub,iss:issuer,azp:origin,iat:now,exp:now+60})}`;
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(body));
    return body+'.'+Buffer.from(signature).toString('base64url');
  }
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({keys:[jwk]}));
  const request = (auth, from=origin, override=env) => worker.fetch(new Request('https://worker.example/api/nina/analytics/transcript.txt?conversation='+ids[0],{headers:{Origin:from,...(auth?{Authorization:'Bearer '+auth}:{})}}), {...override,CLERK_ISSUER:issuer},{});
  try {
    assert.equal((await request(null)).status,401);
    assert.equal((await request(await token('other'))).status,403);
    const auth=await token('owner');
    assert.equal((await request(auth,'https://untrusted.example')).status,403);
    const response=await request(auth);
    assert.equal(response.status,200); assert.equal(response.headers.get('X-Transcript-Messages'),'12');
    assert.equal(response.headers.get('Content-Type'),'text/plain; charset=utf-8');
    assert.match(response.headers.get('Content-Disposition'),/^attachment;/);
    assert.match(response.headers.get('Cache-Control'),/no-store/);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
    assert.ok((await response.text()).includes('literal 0:11'));
  } finally { globalThis.fetch=originalFetch; db.close(); }
});
