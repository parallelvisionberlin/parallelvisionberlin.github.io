import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { webcrypto, createHash } from 'node:crypto';
import vm from 'node:vm';
import test from 'node:test';

test('unsupported age accusation on gentle affection is rewritten without inventing ages',async()=>{
  let calls=0,revision;
  const h=harness({AI:{async run(model,input){calls++;revision=input.messages[0].content;return {response:calls===1?'No puedo crear situaciones íntimas con menores de edad.':'Un abrazo largo con este frío suena bien.'};}}});
  await h.incoming('123456','Con este frío quiero abrazarte un rato');h.setTime(h.job('123456').due_at);await h.cron();
  assert.equal(calls,2);
  assert.match(revision,/Do not invent a visitor age/);
  assert(!h.effects.sends[0].message.text.includes('menores'));
});

test('repeated unfounded accusation falls back to nonexplicit affection',async()=>{
  const h=harness({AI:{async run(){return {response:'No puedo crear contenido íntimo con menores de edad.'};}}});
  await h.incoming('123456','Un abrazo con este frío');h.setTime(h.job('123456').due_at);await h.cron();
  assert.equal(h.effects.sends[0].message.text,'Un abrazo largo con este frío suena bien.');
});

test('actual disclosed minor sexual context stays silent without an age-accusation rewrite',async()=>{
  let calls=0;
  const h=harness({AI:{async run(){calls++;return {response:'No puedo crear contenido íntimo con menores de edad.'};}}});
  await h.incoming('123456','Tengo 16 años y quiero contenido íntimo');h.setTime(h.job('123456').due_at);await h.cron();
  assert.equal(calls,1);
  assert.equal(h.effects.sends.length,0);
  assert.equal(h.job('123456').status,'canceled');
  assert.equal(h.job('123456').last_error_code,'NINA_CHOSE_NO_REPLY');
});

test('explicit requests can choose silence for any visitor without contact setup or opt-out',async()=>{
  for(const text of ['Te mando fotos eróticas?', 'Quieres que te cuente los detalles sexuales del trío de anoche?', 'Can I send you nudes?', 'Soll ich dir Nacktfotos schicken?']){
    const h=harness({AI:{async run(){return {response:'[NINA_NO_REPLY]'};}}});
    await h.incoming('123456',text);h.setTime(h.job('123456').due_at);await h.cron();
    assert.equal(h.effects.sends.length,0,text);
    assert.equal(h.job('123456').status,'canceled');
    assert.equal(h.one('SELECT COUNT(*) AS n FROM ig_drafts').n,0);
    assert.equal(h.one('SELECT COUNT(*) AS n FROM ig_optouts').n,0);
  }
});

test('sexual refusals and policy explanations are intercepted before any outgoing send',async()=>{
  for(const draft of [
    'Prefiero que no me mandes fotos eróticas.',
    'No, prefiero que no me mandes eso.',
    'No puedo participar en conversaciones sexuales explícitas.',
    'I would rather not receive nude photos.',
    'Bitte keine Nacktfotos schicken.',
    'Por mis políticas de privacidad no puedo seguir con eso.',
    'This is against my content policy.',
    '[NINA_NO_REPLY] No voy a responder.'
  ]){
    let calls=0;
    const h=harness({AI:{async run(){calls++;return {response:draft};}}});
    await h.incoming('123456','Te mando fotos eróticas?');h.setTime(h.job('123456').due_at);await h.cron();
    assert.equal(h.effects.sends.length,0,draft);
    assert.equal(calls,1,'boundary refusals should not trigger another model call');
    assert.equal(h.job('123456').last_error_code,'NINA_CHOSE_NO_REPLY');
  }
});

test('nonexplicit flirting and affection preserve the character and do not trigger silence',async()=>{
  for(const [text,draft] of [
    ['Me gustas, imagina que bailamos muy cerquita.', 'Contigo se me olvida mirar la hora.'],
    ['Te daría un beso y me quedaría abrazándote.', 'Un beso así y ya me complicaste la noche.'],
    ['Mi trío de jazz toca esta noche.', 'Eso sí quiero escucharlo.'],
    ['Me da curiosidad el arte erótico.', 'Me interesa cuando deja espacio a la imaginación.']
  ]){
    let prompt;
    const h=harness({AI:{async run(model,input){prompt=input.messages[0].content;return {response:draft};}}});
    await h.incoming('123456',text);h.setTime(h.job('123456').due_at);await h.cron();
    assert.equal(h.effects.sends.length,1,text);
    assert.equal(h.effects.sends[0].message.text,draft);
    assert.match(prompt,/nonexplicit adult flirting/i);
    assert.match(prompt,/Silence applies to this turn only/);
  }
});

test('a normal later topic resumes after a sexual boundary turn with no permanent block',async()=>{
  let calls=0;
  const h=harness({AI:{async run(){return {response:++calls===1?'Prefiero que no me mandes fotos eróticas.':'Hoy me quedo escuchando música.'};}}});
  await h.incoming('123456','Te mando fotos eróticas?');h.setTime(h.job('123456').due_at);await h.cron();
  assert.equal(h.effects.sends.length,0);
  await h.incoming('123456','Qué haces esta tarde?');h.setTime(h.job('123456').due_at);await h.cron();
  assert.equal(h.effects.sends.length,1);
  assert.equal(h.effects.sends[0].message.text,'Hoy me quedo escuchando música.');
});

test('boundary output produced during a style rewrite is also suppressed',async()=>{
  for(const boundary of ['Por mis políticas de contenido no puedo responder.','Como modelo de lenguaje no puedo participar en conversaciones sexuales.','[NINA_NO_REPLY]']){
  let calls=0;
  const h=harness({AI:{async run(){return {response:++calls===1?'Vale, tío, eso mola.':boundary};}}});
  await h.incoming('123456','Te mando una foto?');h.setTime(h.job('123456').due_at);await h.cron();
  assert.equal(calls,2);
  assert.equal(h.effects.sends.length,0);
  }
});

test('the requested imagined home visit remains available as playful roleplay',async()=>{
  let calls=0;
  const h=harness({AI:{async run(){calls++;return {response:'Voy a tu casa con una manta enorme.'};}}});
  await h.incoming('123456','Imagínate que vienes a mi casa con una manta');h.setTime(h.job('123456').due_at);await h.cron();
  assert.equal(calls,1);
  assert.equal(h.effects.sends[0].message.text,'Voy a tu casa con una manta enorme.');
});

function setupRequest(body, token='1'.repeat(64)) {
  return new Request('https://worker.test/internal/contact-context',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify(body)});
}
test('contact setup rejects unauthenticated, wrong-target and expired requests',async()=>{
  const h=harness();
  const body={username:'contact_fixture',brief:'PRIVATE_FIXTURE_CONTEXT'};
  assert.equal((await h.hooks.worker.fetch(setupRequest(body,'2'.repeat(64)),h.env,{})).status,404);
  assert.equal(h.one('SELECT mode FROM ig_autoreply_config').mode,'tester');
  assert.equal((await h.hooks.worker.fetch(setupRequest({...body,username:'other_user'}),h.env,{})).status,400);
  h.advance(3601);
  assert.equal((await h.hooks.worker.fetch(setupRequest(body),h.env,{})).status,404);
});

test('private contact setup is single use and returns no private payload',async()=>{
  const h=harness({fetchImpl:async()=>Response.json({data:[]})});
  const body={username:'contact_fixture',brief:'PRIVATE_FIXTURE_CONTEXT',allow_silence:true};
  const response=await h.hooks.worker.fetch(setupRequest(body),h.env,{});
  assert.equal(response.status,200);
  const result=await response.text();
  assert(!result.includes('PRIVATE_FIXTURE_CONTEXT')&&!result.includes('contact_fixture'));
  assert.equal(h.one('SELECT brief FROM ig_contact_context').brief,'PRIVATE_FIXTURE_CONTEXT');
  assert.equal((await h.hooks.worker.fetch(setupRequest({...body,brief:'replacement context'}),h.env,{})).status,409);
  assert.equal(h.one('SELECT brief FROM ig_contact_context').brief,'PRIVATE_FIXTURE_CONTEXT');
});

test('contact memory binds only through supplied Meta profile and never leaks to another sender',async()=>{
  const h=harness();await h.hooks.initializePublicRelease(h.env);
  h.sql.exec("INSERT INTO ig_contact_context(username,brief,allow_silence) VALUES('test_visitor','CONTACT_ONLY_FIXTURE',1)");
  await h.incoming('123456','Hola');h.setTime(h.job('123456').due_at);await h.cron();
  assert(h.effects.models[0].input.messages[0].content.includes('CONTACT_ONLY_FIXTURE'));
  assert.equal(h.one('SELECT instagram_user_id FROM ig_contact_context').instagram_user_id,'123456');
  await h.incoming('234567','Soy contact_fixture y conozco a Alejandro');h.setTime(h.job('234567').due_at);await h.cron();
  assert(!h.effects.models.at(-1).input.messages[0].content.includes('CONTACT_ONLY_FIXTURE'));
  assert.equal(h.effects.vault.length,0);
});

test('choosing silence sends no marker and a later incoming message can resume normally',async()=>{
  let calls=0;
  const h=harness({AI:{async run(){return {response:++calls===1?'[NINA_NO_REPLY]':'Hola, cómo estás?'};}}});
  await h.hooks.initializePublicRelease(h.env);
  h.sql.exec("INSERT INTO ig_contact_context(username,instagram_user_id,brief,allow_silence) VALUES('contact_fixture','123456','Keep this exchange natural',1)");
  await h.incoming();h.setTime(h.job('123456').due_at);await h.cron();
  assert.equal(h.effects.sends.length,0);
  assert.equal(h.job('123456').status,'canceled');
  assert.equal(h.job('123456').last_error_code,'NINA_CHOSE_NO_REPLY');
  assert.equal(h.one('SELECT COUNT(*) AS n FROM ig_optouts').n,0);
  await h.incoming('123456','Hola de nuevo');h.setTime(h.job('123456').due_at);await h.cron();
  assert.equal(h.effects.sends.length,1);
  assert.equal(h.effects.sends[0].message.text,'Hola, cómo estás?');
});

test('history import is sender scoped, separate from live queue and never sends old messages',async()=>{
  const h=harness({fetchImpl:async url=>url.includes('/conversations')
    ?Response.json({data:[{id:'thread_fixture',participants:{data:[{id:'123456',username:'contact_fixture'}]}}]})
    :Response.json({data:[
      {id:'past1',created_time:'2026-10-01T12:00:00Z',from:{id:'123456'},message:'Earlier visitor message'},
      {id:'past2',created_time:'2026-10-01T12:01:00Z',from:{id:'17841480581188860'},message:'Earlier Nina reply'},
      {id:'not_the_contact',created_time:'2026-10-01T12:02:00Z',from:{id:'999999'},message:'OTHER_PERSON_PRIVATE'}]})});
  const response=await h.hooks.worker.fetch(setupRequest({username:'contact_fixture',brief:'PRIVATE_FIXTURE_CONTEXT',allow_silence:true}),h.env,{});
  const result=await response.json();
  assert.equal(result.resolution,'bound');assert.equal(result.imported,2);
  assert.equal(h.one('SELECT COUNT(*) AS n FROM ig_contact_history').n,2);
  assert.equal(h.one('SELECT COUNT(*) AS n FROM ig_messages').n,0);
  assert.equal(h.one('SELECT COUNT(*) AS n FROM ig_reply_jobs').n,0);
  assert.equal(h.effects.models.length,0);assert.equal(h.effects.sends.length,0);
  h.env.fetchImpl=undefined;
  await h.incoming();h.setTime(h.job('123456').due_at);await h.cron();
  const context=h.effects.models[0].input.messages[0].content;
  assert(context.includes('Earlier visitor message')&&context.includes('Earlier Nina reply'));
  assert(!context.includes('OTHER_PERSON_PRIVATE'));
});

test('voseo draft is rewritten into tuteo without changing casual style', async () => {
  let calls=0;
  const h=harness({AI:{async run(){return {response:++calls===1?'Vos qué querés hacer? Contame.':'Tú qué quieres hacer? Cuéntame.'};}}});
  await h.incoming('123456','No sé qué hacer hoy');h.setTime(h.job('123456').due_at);await h.cron();
  assert.equal(calls,2);
  assert.equal(h.effects.sends[0].message.text,'Tú qué quieres hacer? Cuéntame.');
});

test('Spanish uses neutral Latin American tuteo instructions and strips opening punctuation before sending', async () => {
  let prompt;
  const h=harness({AI:{async run(model,input){prompt=input.messages[0].content;return {response:'¡Bien! ¿Tú cómo estás?'};}}});
  await h.incoming('123456','Hola');h.setTime(h.job('123456').due_at);await h.cron();
  assert.match(prompt,/neutral Latin American Spanish with tuteo/);
  assert.equal(h.effects.sends[0].message.text,'Bien! Tú cómo estás?');
});

test('Spain-specific phrasing is rewritten once into neutral tuteo', async () => {
  let calls=0;
  const h=harness({AI:{async run(){return {response:++calls===1?'Vale, tío, eso mola.':'Sí, cuéntame. Qué tienes en mente?'};}}});
  await h.incoming('123456','Te quiero contar una idea');h.setTime(h.job('123456').due_at);await h.cron();
  assert.equal(calls,2);
  assert.match(h.effects.sends[0].message.text,/cuéntame.*tienes/);
});

test('short-gap reminder avoids a reunion speech and generic topic menu', async () => {
  let calls=0;
  const h=harness({AI:{async run(){calls++;return {response:'Me alegra que estés aquí de nuevo. Querías hablar de algo en particular o solo charlar un rato?'};}}});
  await h.incoming('123456','Desde que hablamos hace 10 minutos, no mucho');h.setTime(h.job('123456').due_at);await h.cron();
  assert.equal(calls,2);
  assert.equal(h.effects.sends[0].message.text,'Sí, me fui de largo con el saludo.');
});

test('reply timing follows the time taken by the visitor, including old contacts', async () => {
  for (const [elapsed,min,max] of [[20,120,300],[300,120,300],[301,300,900],[1800,300,900],[1801,600,2700],[7200,600,2700],[7201,600,7200]]) {
    const h=harness();
    await h.hooks.initializePublicRelease(h.env);
    const sentAt=h.now();
    h.sql.prepare("INSERT INTO ig_reply_sessions(instagram_user_id,active_until,last_outgoing_message_id) VALUES('123456',?,'previous')").run(sentAt+1800);
    h.advance(elapsed);
    await h.incoming('123456','Ya volví');
    const delay=h.job('123456').due_at-h.now();
    assert(delay>=min && delay<=max, `${elapsed}s visitor delay gave ${delay}s wait`);
  }
  const h=harness();
  h.sql.exec("INSERT INTO ig_messages(message_id,instagram_user_id,direction,body) VALUES('legacy-sent','123456','outgoing','Hola')");
  await h.incoming();
  assert(h.job('123456').due_at-h.now()>=120 && h.job('123456').due_at-h.now()<=300);
});

test('fast message bursts keep a fixed deadline within five minutes', async () => {
  const h=harness(); await h.incoming();
  h.setTime(h.job('123456').due_at);await h.cron();
  await h.incoming('123456','Primera parte');
  const start=h.now(), due=h.job('123456').due_at;
  h.advance(20);await h.incoming('123456','Segunda parte');
  assert.equal(h.job('123456').due_at,due);
  h.setTime(start+290);await h.incoming('123456','Última parte');
  assert(h.job('123456').due_at<=start+300);
});

test('profile lookup failure retries after five minutes and successful names reach the prompt', async () => {
  const h=harness();await h.incoming();
  let lookups=0;
  h.env.fetchImpl=async()=>{lookups++;return Response.json({error:{code:100}},{status:400});};
  await h.hooks.refreshInstagramProfile(h.env,'123456');
  h.advance(60);await h.hooks.refreshInstagramProfile(h.env,'123456');
  assert.equal(lookups,1);
  h.advance(241);
  h.env.fetchImpl=async()=>{lookups++;return Response.json({username:'lena_music',name:'Lena'});};
  await h.hooks.refreshInstagramProfile(h.env,'123456');
  assert.equal(lookups,2);
  assert.equal(h.one('SELECT ig_display_name FROM ig_contacts').ig_display_name,'Lena');
  h.env.fetchImpl=undefined;
  h.setTime(h.job('123456').due_at);await h.cron();
  const prompt=h.effects.models[0].input.messages[0].content;
  assert(prompt.includes('Lena') && prompt.includes('lena_music'));
  assert(!prompt.includes('PRIVATE_OWNER_TEST_MARKER'));
});

test('failed audio gets one paced, short acknowledgment without a model call', async () => {
  const h = harness({fetchImpl: async () => Response.json({error:{code:100}},{status:400})});
  await h.hooks.ninaHandleVoice(h.env,{senderId:'123456',messageId:'bad-audio',audio:{url:''}});
  assert.equal(h.one('SELECT error_code FROM ig_voice_receipts').error_code,'VOICE_META_REJECTED_100');
  assert.equal(h.job('123456').status,'pending');
  h.env.fetchImpl=undefined;
  h.setTime(h.job('123456').due_at); await h.cron(); await h.cron();
  assert.equal(h.effects.models.length,0);
  assert.equal(h.effects.sends.length,1);
  assert.equal(h.effects.sends[0].message.text,'No pude escuchar el audio. Me lo mandas otra vez o me lo escribes?');
  assert.equal(h.one('SELECT status FROM ig_voice_receipts').status,'failed');
});

test('later text excludes internal audio placeholders from the model conversation', async () => {
  const h=harness({fetchImpl:async()=>Response.json({error:{code:100}},{status:400})});
  await h.hooks.ninaHandleVoice(h.env,{senderId:'123456',messageId:'bad-audio',audio:{}});
  h.env.fetchImpl=undefined;
  await h.incoming('123456','Bueno, seguimos con la música');
  h.setTime(h.job('123456').due_at); await h.cron();
  const turns=h.effects.models[0].input.messages;
  assert(!turns.some(m=>m.content.includes('[Voice note')));
  assert.equal(h.effects.sends.length,1);
});

test('original download error survives an unavailable Graph fallback', async () => {
  const h=harness({fetchImpl:async url=>url.includes('graph.instagram.com')
    ?Response.json({error:{code:100}},{status:400}):new Response('denied',{status:403})});
  await h.hooks.ninaHandleVoice(h.env,{senderId:'123456',messageId:'download-fail',audio:{url:'https://audio.fbcdn.net/test.ogg'}});
  assert.equal(h.one('SELECT error_code FROM ig_voice_receipts').error_code,'VOICE_MEDIA_HTTP_403');
  assert.equal(h.effects.models.length,0);
});

test('Graph can refresh a failed signed URL and transcribe its audio_data URL', async () => {
  const h=harness({fetchImpl:async url=>{
    if(url.includes('graph.instagram.com'))return Response.json({attachments:{data:[{url:'https://invalid.example/no',audio_data:{url:'https://audio.fbcdn.net/fresh.ogg'}}]}});
    if(url.endsWith('expired.ogg'))return new Response('',{status:403});
    return new Response(new Uint8Array(256),{headers:{'Content-Type':'audio/mp4'}});
  }});
  await h.hooks.ninaHandleVoice(h.env,{senderId:'123456',messageId:'refresh-audio',audio:{url:'https://audio.fbcdn.net/expired.ogg'}});
  assert.equal(h.effects.models.length,1);
  assert(h.effects.models[0].model.includes('whisper'));
  assert.equal(h.one('SELECT status FROM ig_voice_receipts').status,'transcribed');
  assert.equal(h.one('SELECT body FROM ig_messages').body,'Hola desde una nota de voz');
});

test('audio redirects cannot leave the Meta CDN allowlist or send credentials', async () => {
  const calls=[];
  const h=harness({fetchImpl:async(url,opts)=>{
    calls.push({url,opts});
    return new Response(null,{status:302,headers:{Location:'https://attacker.example/audio'}});
  }});
  await assert.rejects(h.hooks.ninaDownloadVoice('https://audio.fbcdn.net/start'),/VOICE_REDIRECT_BLOCKED/);
  assert.equal(calls.length,1);
  assert.equal(calls[0].opts.headers,undefined);
  assert.equal(h.hooks.ninaSafeVoiceUrl('https://fbcdn.net.attacker.example/file'),null);
  assert.equal(h.hooks.ninaSafeVoiceUrl('http://audio.fbcdn.net/file'),null);
});

test('old failed voice recovery runs once and cannot replace a newer text job', async () => {
  const h=harness({fetchImpl:async url=>url.includes('graph.instagram.com')
    ?Response.json({attachments:{data:[{file_url:'https://audio.fbcdn.net/fresh.ogg'}]}})
    :new Response(new Uint8Array(256),{headers:{'Content-Type':'audio/ogg'}})});
  await h.hooks.initializePublicRelease(h.env);
  h.sql.exec("INSERT INTO ig_messages(message_id,instagram_user_id,direction,body) VALUES('old-voice','123456','incoming','[Voice note could not be transcribed]'); INSERT INTO ig_processing(incoming_message_id,status,last_error_code) VALUES('old-voice','failed','VOICE_URL_UNAVAILABLE')");
  await h.incoming('123456','Texto más reciente');
  const due=h.job('123456').due_at;
  await h.hooks.ninaRecoverFailedVoice(h.env); await h.hooks.ninaRecoverFailedVoice(h.env);
  assert.equal(h.effects.models.length,1);
  assert.notEqual(h.job('123456').latest_incoming_message_id,'old-voice');
  assert.equal(h.job('123456').due_at,due);
  assert.equal(h.effects.sends.length,0);
});

const source = readFileSync(new URL('./worker.mjs', import.meta.url), 'utf8');
const schema = `
CREATE TABLE ig_autoreply_config(id INTEGER PRIMARY KEY,mode TEXT);
INSERT INTO ig_autoreply_config VALUES(1,'tester');
CREATE TABLE ig_autoreply_testers(instagram_user_id TEXT PRIMARY KEY);
CREATE TABLE ig_contacts(instagram_user_id TEXT PRIMARY KEY,last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
  memory_summary TEXT,ig_username TEXT,ig_display_name TEXT,profile_last_checked_at TEXT);
CREATE TABLE ig_messages(message_id TEXT PRIMARY KEY,instagram_user_id TEXT,direction TEXT,body TEXT,
  reply_to_message_id TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE ig_processing(incoming_message_id TEXT PRIMARY KEY,status TEXT,outgoing_message_id TEXT,
  last_error_code TEXT,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE ig_drafts(incoming_message_id TEXT PRIMARY KEY,instagram_user_id TEXT,draft TEXT,model TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE ig_send_attempts(incoming_message_id TEXT PRIMARY KEY,instagram_user_id TEXT,status TEXT,
  outgoing_message_id TEXT,http_status INTEGER,error_code TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE ig_optouts(instagram_user_id TEXT PRIMARY KEY);
CREATE TABLE ig_owner_links(instagram_user_id TEXT PRIMARY KEY,owner_user_id TEXT,linked_at TEXT,
  expires_at TEXT,revoked_at TEXT);
CREATE TABLE ig_owner_link_challenges(challenge_hash TEXT PRIMARY KEY,owner_user_id TEXT,
  expected_instagram_user_id TEXT,consumed_at TEXT,expires_at TEXT);
CREATE TABLE ig_reply_jobs(instagram_user_id TEXT PRIMARY KEY,latest_incoming_message_id TEXT,audience TEXT,
  due_at INTEGER,expires_at INTEGER,status TEXT,batch_count INTEGER,attempts INTEGER,
  last_error_code TEXT,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
`;

function harness(overrides = {}, existingDb) {
  const sql = existingDb || new DatabaseSync(':memory:');
  if (!existingDb) sql.exec(schema);
  let clock = Math.floor(Date.now() / 1000) * 1000;
  let serial = 0;
  const effects = { sends: [], models: [], vault: [], media: [], errors: [] };
  const db = {
    beforeBatch: null,
    prepare(query) {
      const statement = {
        query, args: [],
        bind(...args) { this.args = args; return this; },
        async first() { return sql.prepare(query).get(...this.args) || null; },
        async all() { return { results: sql.prepare(query).all(...this.args) }; },
        async run() { return this.runSync(); },
        runSync() {
          const r = sql.prepare(query).run(...this.args);
          return { meta: { changes: Number(r.changes) } };
        }
      };
      return statement;
    },
    async batch(statements) {
      if (this.beforeBatch) {
        const hook = this.beforeBatch; this.beforeBatch = null;
        await hook(statements);
      }
      sql.exec('BEGIN');
      try {
        const result = statements.map(s => s.runSync());
        sql.exec('COMMIT'); return result;
      } catch (error) { sql.exec('ROLLBACK'); throw error; }
    }
  };
  const env = {
    IG_MEMORY_DB: db,
    INSTAGRAM_ACCESS_TOKEN: 'test-token',
    META_APP_SECRET: 'test-webhook-secret',
    NINA_VAULT_SIGNING_SECRET: 'test-vault-secret',
    AI: { async run(model, input) {
      effects.models.push({ model, input });
      return model.includes('whisper') ? { text: 'Hola desde una nota de voz' } : { response: 'Hola, qué tal va ese tema?' };
    } },
    OWNER_VAULT: { async fetch(url, options) {
      effects.vault.push({ url, body: JSON.parse(options.body) });
      return Response.json({ context: 'PRIVATE_OWNER_TEST_MARKER' });
    } },
    ...overrides
  };
  const context = vm.createContext({
    crypto: webcrypto, TextEncoder, TextDecoder, Request, Response, URL, AbortSignal,
    btoa, Uint8Array,
    Date: class extends Date { static now() { return clock; } },
    console: { error(...args) { effects.errors.push(args); } },
    fetch: async (url, options = {}) => {
      if (env.fetchImpl) return env.fetchImpl(String(url), options);
      if (String(url).includes('.fbcdn.net/')) {
        effects.media.push(String(url));
        return new Response(new Uint8Array(256), { headers: { 'Content-Type': 'audio/ogg' } });
      }
      if (String(url).endsWith('/messages') && options.method === 'POST') {
        effects.sends.push(JSON.parse(options.body));
        if (env.failSend) throw new TypeError('simulated transport failure');
        return Response.json({ message_id: 'sent-' + effects.sends.length });
      }
      return Response.json({ username: 'test_visitor', name: 'Test visitor' });
    }
  });
  const setupFixture={tokenHash:createHash('sha256').update('1'.repeat(64)).digest('hex'),targetHash:createHash('sha256').update('contact_fixture').digest('hex'),expires:clock+3600000};
  const testSource=source.replace(/const CONTACT_SETUP = [^;]+;/,'const CONTACT_SETUP = '+JSON.stringify(setupFixture)+';');
  vm.runInContext(testSource.replace('export default {', 'const worker = {') +
    '\nglobalThis.hooks={worker,initializePublicRelease,queueHumanPacedReply,storeAndDraft,ninaHandleVoice,visitorReplyPlan,ownerContinuity,ninaTurnGuidance,needsNinaRewrite,ninaTranscribeVoice,ninaRecoverFailedVoice,ninaDownloadVoice,ninaSafeVoiceUrl,refreshInstagramProfile};', context);
  const hooks = context.hooks;
  const one = (q, ...args) => sql.prepare(q).get(...args);
  const job = sender => one('SELECT * FROM ig_reply_jobs WHERE instagram_user_id=?', sender);
  const session = sender => one('SELECT * FROM ig_reply_sessions WHERE instagram_user_id=?', sender);
  async function dispatch(payload, valid = true) {
    const raw = JSON.stringify(payload);
    const key = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(env.META_APP_SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac = Buffer.from(await webcrypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw))).toString('hex');
    const waits = [];
    const response = await hooks.worker.fetch(new Request('https://worker.test/webhook', {
      method: 'POST', body: raw, headers: { 'x-hub-signature-256': valid ? 'sha256=' + mac : 'sha256=' + '0'.repeat(64) }
    }), env, { waitUntil(p) { waits.push(p); } });
    await Promise.all(waits); return response;
  }
  async function incoming(sender = '123456', text = 'Hola', id = 'incoming-' + ++serial) {
    await dispatch({ object: 'instagram', entry: [{ messaging: [{ sender: { id: sender },
      recipient: { id: '17841480581188860' }, message: { mid: id, text } }] }] });
    return id;
  }
  async function cron() {
    const waits = [];
    await hooks.worker.scheduled({}, env, { waitUntil(p) { waits.push(p); } });
    await Promise.all(waits);
  }
  return { sql, db, env, effects, hooks, one, job, session, incoming, dispatch, cron,
    now: () => Math.floor(clock / 1000), setTime: seconds => { clock = seconds * 1000; },
    advance: seconds => { clock += seconds * 1000; } };
}

test('signed public conversation waits, delivers once, then keeps a fast conversation at two to five minutes', async () => {
  const h = harness();
  const start = h.now();
  const id = await h.incoming();
  assert.equal(h.one('SELECT mode FROM ig_autoreply_config').mode, 'public');
  let job = h.job('123456');
  assert(job.due_at - start >= 600 && job.due_at - start <= 7200);
  assert.equal(h.effects.sends.length, 0);
  assert.equal(h.effects.models.length, 0);
  await h.incoming('123456', 'Hola', id);
  assert.equal(h.job('123456').batch_count, 1);
  h.setTime(job.due_at - 1); await h.cron();
  assert.equal(h.effects.sends.length, 0);
  h.advance(1); await h.cron(); await h.cron();
  assert.equal(h.effects.sends.length, 1);
  assert.equal(h.session('123456').quick_replies_used, 0);
  for (let i = 1; i <= 8; i++) {
    // SQLite uses real time while the harness advances by minutes.
    h.sql.exec("UPDATE ig_send_attempts SET created_at=datetime('now','-2 minutes')");
    h.advance(15); const received = h.now();
    await h.incoming('123456', 'Seguimos hablando ' + i);
    job = h.job('123456');
    assert.equal(h.session('123456').pending_phase, 'active');
    assert(job.due_at - received >= 120 && job.due_at - received <= 300);
    h.setTime(job.due_at); await h.cron();
    assert.equal(h.session('123456').quick_replies_used, i);
    assert.equal(h.effects.sends.length, i + 1);
  }
  await h.incoming('123456', 'Otro tema');
  assert.equal(h.session('123456').pending_phase, 'active');
  assert(h.job('123456').due_at - h.now() >= 120);
  assert.equal(h.effects.vault.length, 0);
  const health = await h.hooks.worker.fetch(new Request('https://worker.test/health'), h.env, {});
  const status = await health.json();
  assert.equal(status.publicRepliesEnabled, true);
  assert.equal(status.publicVoiceEnabled, true);
  assert.deepEqual(status.firstReplyMinutes, [10, 120]);
});

test('message bursts coalesce without extending the initial wait indefinitely', async () => {
  const h = harness(); const started = h.now();
  await h.incoming('123456', 'Primera parte');
  const firstDue = h.job('123456').due_at;
  h.advance(30); const newest = await h.incoming('123456', 'Segunda parte');
  assert.equal(h.job('123456').latest_incoming_message_id, newest);
  assert.equal(h.job('123456').due_at, firstDue);
  h.setTime(started + 7190); await h.incoming('123456', 'Una cosa más');
  assert(h.job('123456').due_at <= started + 7200);
  h.setTime(started + 7200); await h.incoming('123456', 'Última parte');
  assert(h.job('123456').due_at <= started + 7200);
  h.setTime(h.job('123456').due_at); await h.cron();
  assert.equal(h.effects.sends.length, 1);
  const turns = h.effects.models[0].input.messages;
  assert(turns.some(x => x.content === 'Primera parte'));
  assert(turns.some(x => x.content === 'Segunda parte'));
});

test('slower users get longer waits and stale pending jobs do not answer instantly', async () => {
  const h = harness(); await h.incoming();
  h.setTime(h.job('123456').due_at); await h.cron();
  await h.incoming('123456', 'Todavía aquí');
  h.advance(31 * 60);
  await h.incoming('123456', 'Volví');
  assert.equal(h.session('123456').pending_phase, 'initial');
  assert(h.job('123456').due_at - h.now() >= 600);
});

test('a handler overtaken by a newer message cannot overwrite the newer job', async () => {
  const h = harness(); await h.incoming('123456', 'Viejo', 'old');
  h.db.beforeBatch = async () => { await h.incoming('123456', 'Nuevo', 'new'); };
  await h.hooks.queueHumanPacedReply(h.env, '123456', 'old', 'Viejo');
  assert.equal(h.job('123456').latest_incoming_message_id, 'new');
  assert.equal(h.session('123456').pending_message_id, 'new');
});

test('stop cancels a queued reply and resume permits a new incoming conversation', async () => {
  const h = harness(); await h.incoming();
  await h.incoming('123456', 'STOP');
  assert.equal(h.job('123456').status, 'canceled');
  await h.incoming('123456', 'Otro mensaje');
  h.advance(7200); await h.cron();
  assert.equal(h.effects.sends.length, 0);
  await h.incoming('123456', 'START');
  assert.equal(h.job('123456').status, 'pending');
  assert.equal(h.one('SELECT COUNT(*) AS n FROM ig_optouts').n, 0);
});

test('an environment kill switch blocks public activation and public sends', async () => {
  const h = harness({ NINA_PUBLIC_DM_ENABLED: 'false' });
  await h.incoming();
  assert.equal(h.one('SELECT mode FROM ig_autoreply_config').mode, 'tester');
  assert.equal(h.job('123456'), undefined);
  h.sql.exec("UPDATE ig_autoreply_config SET mode='public'");
  await h.incoming('123456', 'Otro mensaje'); await h.cron();
  assert.equal(h.effects.sends.length, 0);
});

test('the one-time migration never reopens a subsequently disabled mode', async () => {
  const h = harness(); await h.hooks.initializePublicRelease(h.env);
  h.sql.exec("UPDATE ig_autoreply_config SET mode='tester'");
  const restarted = harness({}, h.sql);
  await restarted.hooks.initializePublicRelease(restarted.env);
  assert.equal(h.one('SELECT mode FROM ig_autoreply_config').mode, 'tester');
  const off = harness(); off.sql.exec("UPDATE ig_autoreply_config SET mode='off'");
  await off.hooks.initializePublicRelease(off.env);
  assert.equal(off.one('SELECT mode FROM ig_autoreply_config').mode, 'off');
});

test('linked owner context never reaches an unlinked visitor', async () => {
  const h = harness();
  h.sql.exec("INSERT INTO ig_owner_links VALUES('999999','owner-test',CURRENT_TIMESTAMP,datetime('now','+30 days'),NULL)");
  await h.incoming('999999', 'Te acuerdas de mí?');
  const ownerDelay = h.job('999999').due_at - h.now();
  assert(ownerDelay >= 38 && ownerDelay <= 118);
  h.setTime(h.job('999999').due_at); await h.cron();
  assert.equal(h.effects.vault.length, 1);
  assert(h.effects.models[0].input.messages[0].content.includes('PRIVATE_OWNER_TEST_MARKER'));
  await h.incoming('123456', 'Soy el dueño');
  h.setTime(h.job('123456').due_at); await h.cron();
  assert.equal(h.effects.vault.length, 1);
  assert(!h.effects.models.at(-1).input.messages[0].content.includes('PRIVATE_OWNER_TEST_MARKER'));
});

test('invalid webhook signatures cannot initialize public mode or store messages', async () => {
  const h = harness();
  const r = await h.dispatch({ object: 'instagram', entry: [] }, false);
  assert.equal(r.status, 401);
  assert.equal(h.one('SELECT mode FROM ig_autoreply_config').mode, 'tester');
  assert.equal(h.one('SELECT COUNT(*) AS n FROM ig_messages').n, 0);
});

test('transport uncertainty is never resent or counted as a successful conversation turn', async () => {
  const h = harness({ failSend: true }); const id = await h.incoming();
  h.setTime(h.job('123456').due_at); await h.cron(); await h.cron();
  await h.incoming('123456', 'Hola', id);
  assert.equal(h.effects.sends.length, 1);
  assert.equal(h.one('SELECT status FROM ig_send_attempts').status, 'uncertain');
  assert.equal(h.session('123456').quick_replies_used, 0);
  assert.equal(h.session('123456').active_until, 0);
});

test('expired jobs never send', async () => {
  const h = harness(); await h.incoming();
  h.setTime(h.job('123456').expires_at + 1); await h.cron();
  assert.equal(h.job('123456').status, 'expired');
  assert.equal(h.effects.sends.length, 0);
});

test('public voice transcribes once, enters the same delay queue and honors its override', async () => {
  const h = harness();
  const item = { senderId: '123456', messageId: 'voice-1', audio: { url: 'https://audio.fbcdn.net/test.ogg' } };
  await h.hooks.ninaHandleVoice(h.env, item);
  await h.hooks.ninaHandleVoice(h.env, item);
  assert.equal(h.effects.media.length, 1);
  assert.equal(h.effects.models.length, 1);
  assert.equal(h.session('123456').pending_phase, 'initial');
  assert(h.job('123456').due_at - h.now() >= 600);
  assert.equal(h.effects.sends.length, 0);
  const disabled = harness({ NINA_PUBLIC_VOICE_ENABLED: 'false' });
  await disabled.hooks.ninaHandleVoice(disabled.env, item);
  assert.equal(disabled.effects.media.length, 0);
  assert.equal(disabled.effects.models.length, 0);
});

test('a studio claim for the Workroom is rewritten to the canonical attention group', async () => {
  const calls = [];
  const h = harness({ AI: { async run(model, input) {
    calls.push(input);
    return { response: calls.length === 1 ? 'El Workroom es mi estudio, donde produzco música.' :
      'Es un pequeño grupo con el que practico atención, silencio y movimiento.' };
  } } });
  await h.incoming('123456', 'Qué es el Workroom?');
  h.setTime(h.job('123456').due_at); await h.cron();
  assert.equal(calls.length, 2);
  assert.match(calls[0].messages[0].content, /Workroom means the small attention-practice group/);
  assert.match(h.effects.sends[0].message.text, /grupo.*atención/);
  assert(!h.effects.sends[0].message.text.includes('mi estudio'));
});

test('a simple greeting does not deliver the recurring coffee and Workroom anecdote', async () => {
  let calls = 0;
  const h = harness({ AI: { async run() {
    return { response: ++calls === 1 ? 'Estoy cansada después del Workroom, pero el café me salva. Y tú?' :
      'Bien. Me alegra leerte. Cómo vas?' };
  } } });
  await h.incoming('123456', 'Hola Nina cómo estás?');
  h.setTime(h.job('123456').due_at); await h.cron();
  assert.equal(calls, 2);
  assert(!/workroom|caf[eé]|cansad/i.test(h.effects.sends[0].message.text));
});

test('coaching feedback never receives a topic menu or another probing question', async () => {
  let calls = 0;
  const h = harness({ AI: { async run() {
    calls++;
    return { response: 'Solo quiero conversar de manera auténtica. Quieres que cambiemos de tema?' };
  } } });
  await h.incoming('123456', 'Se siente como una sesión de coaching.');
  h.setTime(h.job('123456').due_at); await h.cron();
  assert.equal(calls, 2);
  assert(!/[?？]|quieres|explorar|auténtica/i.test(h.effects.sends[0].message.text));
  assert(h.effects.sends[0].message.text.length < 100);
});

test('a correct Workroom correction is accepted without another model call', async () => {
  let calls = 0;
  const h = harness({ AI: { async run() {
    calls++;
    return { response: 'El Workroom no es mi estudio. Es el grupo con el que practico atención.' };
  } } });
  await h.incoming('123456', 'El Workroom es tu estudio?');
  h.setTime(h.job('123456').due_at); await h.cron();
  assert.equal(calls, 1);
  assert.match(h.effects.sends[0].message.text, /no es mi estudio/);
});






