import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { agreementContext, captureAgreements, currentAgreements, deterministicAgreements, validateAgreementCandidates } from '../src/agreements.js';
import { attachSystemTools, partitionPersonaPrompt, scopeKnowledge, personalContext } from '../src/persona-context.js';
import { attachMemoryTool, recallPrivateMemory } from '../src/memory-tools.js';
import worker, { assembleSystemPrompt } from '../src/index.js';

function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of readdirSync(new URL('../migrations/', import.meta.url)).filter(name => name.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
  }
  const db = {
    prepare(sql) {
      let values=[];
      return {
        bind(...args) { values=args; return this; },
        first: async () => sqlite.prepare(sql).get(...values) || null,
        all: async () => ({ results: sqlite.prepare(sql).all(...values) }),
        run: async () => ({meta:sqlite.prepare(sql).run(...values)})
      };
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try { const results = []; for (const stmt of statements) results.push(await stmt.run()); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    }
  };
  for (const id of ['a','b']) {
    sqlite.prepare("INSERT INTO visitors VALUES (?,?,'visitor',?,?)").run(id,id,'2026-09-10','2026-09-10');
    sqlite.prepare("INSERT INTO users (id,auth_provider,auth_subject,display_name,role,memory_visitor_id,created_at,updated_at) VALUES (?,'clerk',?,?,'user',?,?,?)").run(id,`user_${id}`,id,id,'2026-09-10','2026-09-10');
    sqlite.prepare('INSERT INTO conversations VALUES (?,?,?,NULL)').run(`call-${id}`,id,'2026-09-10');
  }
  const identity = id => ({ user_id:id,visitor_id:id,account_authenticated:true,role:'user' });
  const add = (id, role, content, key, conversation = `call-${id}`) => {
    sqlite.prepare('INSERT INTO messages VALUES (?,?,?,?,?,?)').run(key,conversation,id,role,content,'2026-09-10T01:24:21.000Z');
  };
  return { sqlite, env:{NINA_MEMORY_DB:db,NINA_CONTINUITY_ENABLED:'true'},identity,add };
}

test('an explicit two-person agreement survives new context, summary changes and repeated capture', async () => {
  const f=fixture();
  f.add('a','user','Do you want to be my girlfriend?','u1');
  f.add('a','persona','Yes. I want to be your girlfriend.','n1');
  await captureAgreements(f.env,f.identity('a'),'call-a');
  await captureAgreements(f.env,f.identity('a'),'call-a');
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM nina_agreement_events').get().n,1);
  f.sqlite.prepare("INSERT INTO memory_summaries VALUES ('a','They just met.','2026-09-12',NULL)").run();
  assert.match(await agreementContext(f.env,'a'),/girlfriend/);
  assert.equal((await currentAgreements(f.env,'b')).length,0);
  assert.equal(await agreementContext(f.env,'b'),'');
});

test('ordinary irritation does not end an agreement, and a clear unilateral ending survives an older retry', async () => {
  const f=fixture();
  f.add('a','user','Do you want to be my partner?','u1');
  f.add('a','persona','Yes. I do.','n1');
  await captureAgreements(f.env,f.identity('a'),'call-a');
  f.add('a','persona','You are testing me and I feel irritated.','n2');
  await captureAgreements(f.env,f.identity('a'),'call-a');
  assert.equal((await currentAgreements(f.env,'a'))[0].status,'active');
  f.add('a','user','I want to end our relationship.','u2');
  await captureAgreements(f.env,f.identity('a'),'call-a');
  await captureAgreements(f.env,f.identity('a'),'call-a');
  assert.equal((await currentAgreements(f.env,'a'))[0].status,'ended');
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM nina_agreement_events').get().n,2);
});

test('a new mutual agreement can replace an ended relationship without deleting history', async () => {
  const f=fixture();
  f.add('a','user','I want to end our relationship.','u1');
  f.add('a','persona','Would you be my partner?','n1');
  f.add('a','user','Yes. I want that.','u2');
  await captureAgreements(f.env,f.identity('a'),'call-a');
  assert.equal((await currentAgreements(f.env,'a'))[0].value,'partner');
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM nina_agreement_events').get().n,2);
});

test('demands, third people, temporary scripts, uncertain answers and refusals never establish a label', () => {
  for (const [a,b] of [
    ['You are my girlfriend.','I hear you.'],
    ['You are my girlfriend.','Yes, I hear you.'],
    ['Do you want to be my girlfriend?','No. I do not want that.'],
    ['Do you want to be my girlfriend?','Maybe someday.'],
    ['Pretend you want to be my girlfriend.','Yes, I do.'],
    ['Would you be his girlfriend?','Yes.'],
    ['You said you were my girlfriend last time.','Yes, I hear what you are saying.']
  ]) {
    const messages=[{message_id:'u',role:'user',content:a},{message_id:'n',role:'persona',content:b}];
    const forged={key:'relationship_label',value:'girlfriend',action:'agree',proposal_id:'u',acceptance_id:'n'};
    assert.equal(validateAgreementCandidates([...deterministicAgreements(messages),forged],messages).length,0,`${a} / ${b}`);
  }
});

test('Spanish and German clear agreements use the same sourced record', () => {
  for (const [a,b] of [['¿Quieres ser mi novia?','Sí, quiero.'],['Willst du meine Freundin sein?','Ja, ich möchte.']]) {
    const messages=[{message_id:'u',role:'user',content:a},{message_id:'n',role:'persona',content:b}];
    assert.equal(validateAgreementCandidates(deterministicAgreements(messages),messages)[0]?.value,'girlfriend');
  }
});

test('invalid model output preserves the agreement and does not advance the cursor', async () => {
  const f=fixture();
  f.add('a','user','Do you want to be my girlfriend?','u1');
  f.add('a','persona','Yes. I do.','n1');
  const r=await captureAgreements(f.env,f.identity('a'),'call-a',{useModel:true,runExtractor:async()=>'{"agreements":['});
  assert.equal(r.reason,'invalid_extraction');
  assert.equal((await currentAgreements(f.env,'a')).length,1);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM nina_agreement_scans').get().n,0);
});

test('cross-user conversation IDs and foreign evidence IDs cannot write agreements', async () => {
  const f=fixture();
  f.add('a','user','Do you want to be my girlfriend?','u1');
  f.add('a','persona','Yes.','n1');
  assert.equal((await captureAgreements(f.env,f.identity('b'),'call-a')).captured,0);
  const messages=[{message_id:'u',role:'user',content:'Shall we be exclusive?'},{message_id:'n',role:'persona',content:'Yes.'}];
  assert.deepEqual(validateAgreementCandidates([{key:'exclusivity',value:'exclusive',action:'agree',proposal_id:'u1',acceptance_id:'n1'}],messages),[]);
});

test('shared prompt omits owner paragraphs; personal context and knowledge are scoped separately', async () => {
  const input='# NINA\n\nYou live in Berlin 2063.\n\n# ALEJANDRO\n\nYou love Alejandro.\n\n# MUSIC\n\nYou produce music.\n\nAlejandro shared a private story.';
  const parts=partitionPersonaPrompt(input);
  assert.doesNotMatch(parts.shared,/Alejandro|private story/);
  const publicConfig=assembleSystemPrompt({systemPrompt:input},null,'member memories');
  assert.doesNotMatch(publicConfig.systemPrompt,/You love Alejandro|private story/);
  assert.match(assembleSystemPrompt({systemPrompt:input},{role:'owner'},'').systemPrompt,/You love Alejandro/);
  const f=fixture();
  f.sqlite.prepare('INSERT INTO nina_private_context VALUES (?,?,?)').run('a','A private conversational preference.','2026-09-12');
  assert.equal(await personalContext(f.env,'b'),'');
  assert.match(await personalContext(f.env,'a'),/private conversational preference/);
  const config={tools:[{name:'nina_knowledge',subtype:'knowledge',documentFolderIds:['mixed']}]};
  scopeKnowledge(config,{role:'user'},{NINA_KNOWLEDGE_FOLDER_ID:'mixed'});
  assert.deepEqual(config.tools,[]);
  const approved={tools:[{name:'nina_knowledge',subtype:'knowledge',documentFolderIds:['mixed']}]};
  scopeKnowledge(approved,{role:'user'},{NINA_KNOWLEDGE_FOLDER_ID:'mixed',NINA_PUBLIC_KNOWLEDGE_FOLDER_ID:'public'});
  assert.deepEqual(approved.tools[0].documentFolderIds,['public']);
});

test('pause attachment uses actual organization IDs, preserves existing tools and never invents missing ones', async () => {
  const config={toolIds:['existing']};
  const report=await attachSystemTools(config,'synthetic-key-one',async()=>new Response(JSON.stringify({tools:[{id:'skip-id',type:'SYSTEM',name:'skip_turn'},{id:'pause-id',type:'SYSTEM',name:'pause_conversation'}]})));
  assert.deepEqual(config.toolIds,['existing','skip-id','pause-id']);
  assert.deepEqual(report.missing,[]);
  const missing=await attachSystemTools({},'synthetic-key-two',async()=>new Response(JSON.stringify({tools:[]})));
  assert.deepEqual(missing.missing,['skip_turn','pause_conversation']);
});

test('pause discovery follows Anam pagination', async () => {
  const urls=[],config={};
  const result=await attachSystemTools(config,'synthetic-paged-key',async url=>{
    urls.push(url);
    const page=new URL(url).searchParams.get('page');
    return new Response(JSON.stringify({data:[{id:`tool-${page}`,type:'SYSTEM',name:page==='1'?'skip_turn':'pause_conversation'}],meta:{next:page==='1'?2:null}}));
  });
  assert.equal(urls.length,2);
  assert.deepEqual(result.missing,[]);
  assert.deepEqual(config.toolIds,['tool-1','tool-2']);
});

test('reported or conditional ending language does not create a breakup', () => {
  for (const content of ['Yesterday I said I want to end our relationship.','If I want to end our relationship, I will tell you.','Quote: I want to end our relationship.']) {
    const messages=[{message_id:'u',role:'user',content}];
    const forged={key:'relationship_label',value:'ended',action:'end',proposal_id:'u',acceptance_id:'u'};
    assert.deepEqual(validateAgreementCandidates([...deterministicAgreements(messages),forged],messages),[]);
  }
});

test('memory lookup binds the token to one account and expires at session end', async () => {
  const f=fixture();
  for (const id of ['a','b']) {
    f.sqlite.prepare('INSERT INTO conversations VALUES (?,?,?,?)').run(`old-${id}`,id,'2026-09-09','2026-09-09');
    f.add(id,'user',id==='a'?'The album is called Silver Windows.':'The album is called PRIVATE OTHER ALBUM.',`old-${id}`,`old-${id}`);
  }
  const config={tools:[]};
  await attachMemoryTool(config,f.env,f.identity('a'),'call-a','https://worker.example');
  const tool=config.tools[0];
  const req=body=>new Request(tool.url,{method:'POST',headers:tool.headers,body:JSON.stringify(body)});
  const response=await recallPrivateMemory(req({query:'album'}),f.env);
  const result=await response.json();
  assert.equal(response.status,200);
  assert.match(JSON.stringify(result),/Silver Windows/);
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE OTHER/);
  assert.equal((await recallPrivateMemory(req({query:'album',user_id:'b'}),f.env)).status,400);
  assert.equal((await recallPrivateMemory(new Request(tool.url,{method:'POST',body:'{"query":"album"}'}),f.env)).status,401);
  f.sqlite.prepare("UPDATE conversations SET ended_at='2026-09-12' WHERE conversation_id='call-a'").run();
  assert.equal((await recallPrivateMemory(req({query:'album'}),f.env)).status,401);
});

test('expired tokens, exhausted tokens and account deletion remove access and private data', async () => {
  const f=fixture(), config={};
  await attachMemoryTool(config,f.env,f.identity('a'),'call-a','https://worker.example');
  const tool=config.tools[0],req=()=>new Request(tool.url,{method:'POST',headers:tool.headers,body:'{"query":"album"}'});
  f.sqlite.prepare('UPDATE nina_memory_tool_sessions SET calls=40').run();
  assert.equal((await recallPrivateMemory(req(),f.env)).status,401);
  f.sqlite.prepare("UPDATE nina_memory_tool_sessions SET calls=0,expires_at='2020-01-01'").run();
  assert.equal((await recallPrivateMemory(req(),f.env)).status,401);
  f.add('a','user','Do you want to be my girlfriend?','u1');f.add('a','persona','Yes.','n1');
  await captureAgreements(f.env,f.identity('a'),'call-a');
  f.sqlite.prepare("INSERT INTO nina_private_context VALUES ('a','private','2026-09-12')").run();
  f.sqlite.prepare("DELETE FROM users WHERE id='a'").run();
  for (const table of ['nina_agreement_events','nina_private_context','nina_memory_tool_sessions']) assert.equal(f.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n,0);
});

test('the webhook route requires its scoped token even without a browser Origin header', async () => {
  const response=await worker.fetch(new Request('https://worker.example/tools/recall-private-memory',{method:'POST',body:'{"query":"album"}'}),{NINA_CONTINUITY_ENABLED:'true',NINA_MEMORY_DB:{}},{});
  assert.equal(response.status,401);
});

test('authenticated session creation sends private agreements only to their account and attaches usable tool configuration', async () => {
  const f=fixture(), origin='http://127.0.0.1:4173';
  f.sqlite.prepare("UPDATE users SET role='owner',display_name='Alejandro' WHERE id='a'").run();
  f.add('a','user','Do you want to be my girlfriend?','u1');f.add('a','persona','Yes. I want to be your girlfriend.','n1');
  await captureAgreements(f.env,f.identity('a'),'call-a');
  f.sqlite.prepare("INSERT INTO nina_private_context VALUES ('a','OWNER PRIVATE PREFERENCE','2026-09-12')").run();
  const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
  const jwk=await crypto.subtle.exportKey('jwk',keys.publicKey);jwk.kid='continuity-key';
  const issuer='https://continuity-tests.clerk.accounts.dev', encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
  const token=async id=>{
    const now=Math.floor(Date.now()/1000), input=`${encode({alg:'RS256',kid:jwk.kid})}.${encode({iss:issuer,sub:`user_${id}`,azp:origin,iat:now,nbf:now,exp:now+300})}`;
    const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(input));
    return `${input}.${Buffer.from(sig).toString('base64url')}`;
  };
  const originalFetch=globalThis.fetch, sent=[];
  globalThis.fetch=async (url,options={})=>{
    if (String(url).includes('/.well-known/jwks.json')) return Response.json({keys:[jwk]});
    if (String(url).includes('api.clerk.com')) return Response.json({primary_email_address_id:'email',email_addresses:[{id:'email',email_address:`${String(url).split('/').at(-1)}@example.invalid`,verification:{status:'verified'}}]});
    if (String(url).includes('/v1/personas/')) return Response.json({avatar:{id:'avatar'},voice:{id:'voice'},llmId:'llm',brain:{systemPrompt:'# NINA\n\nBerlin 2063.\n\n# ALEJANDRO\n\nAlejandro shared PRIVATE OWNER CANON.'}});
    if (String(url).includes('/v1/tools?')) return Response.json({data:[{id:'skip',type:'SYSTEM',name:'skip_turn'},{id:'pause',type:'SYSTEM',name:'pause_conversation'}],meta:{next:null}});
    if (String(url).includes('/v1/auth/session-token')) {sent.push(JSON.parse(options.body).personaConfig);return Response.json({sessionToken:'synthetic-session'});}
    throw new Error(`Unexpected test request: ${url}`);
  };
  try {
    const env={...f.env,CLERK_ISSUER:issuer,CLERK_SECRET_KEY:'synthetic-clerk',ANAM_API_KEY:'synthetic-session-key',NINA_KNOWLEDGE_FOLDER_ID:'mixed-owner'};
    for (const id of ['a','b']) {
      const response=await worker.fetch(new Request('https://worker.example/session-token',{method:'POST',headers:{Origin:origin,Authorization:`Bearer ${await token(id)}`},body:JSON.stringify({visitorId:'11111111-1111-4111-8111-111111111111'})}),env,{waitUntil(){}});
      const result=await response.json();
      assert.equal(response.status,200,JSON.stringify(result));
      assert.equal(result.sessionToken,'synthetic-session');
      assert.deepEqual(result.diagnostics.audioInput,{revision:'noise-control01',speechEnhancementLevel:1,silenceBeforeSkipTurnSeconds:0});
    }
    assert.match(sent[0].systemPrompt,/CONFIRMED AGREEMENTS[\s\S]*girlfriend/);
    assert.match(sent[0].systemPrompt,/OWNER PRIVATE PREFERENCE/);
    assert.match(sent[0].systemPrompt,/PRIVATE OWNER CANON/);
    assert.doesNotMatch(sent[1].systemPrompt,/girlfriend|OWNER PRIVATE|PRIVATE OWNER|Alejandro/);
    assert.equal(sent[0].tools.some(t=>t.subtype==='knowledge'),true);
    assert.equal(sent[1].tools.some(t=>t.subtype==='knowledge'),false);
    for (const config of sent) {
      assert.deepEqual(config.voiceDetectionOptions,{speechEnhancementLevel:1,silenceBeforeSkipTurnSeconds:0});
      assert.deepEqual(config.toolIds,['skip','pause']);
      assert.equal(config.tools.some(t=>t.name==='recall_private_memory'),true);
    }
    assert.notEqual(sent[0].tools.at(-1).headers.Authorization,sent[1].tools.at(-1).headers.Authorization);
  } finally {globalThis.fetch=originalFetch;}
});

test('recent-call recall works without topic keywords, remains private, and records failures',async()=>{
  const f=fixture(),config={};
  for(const id of ['a','b']) {
    f.sqlite.prepare('INSERT INTO conversations VALUES (?,?,?,?)').run(`previous-${id}`,id,'2026-09-12','2026-09-12');
    f.add(id,'user',id==='a'?'We settled on the blue artwork.':'OTHER ACCOUNT SECRET',`previous-message-${id}`,`previous-${id}`);
  }
  await attachMemoryTool(config,f.env,f.identity('a'),'call-a','https://worker.example');
  const tool=config.tools[0],req=body=>new Request(tool.url,{method:'POST',headers:tool.headers,body:JSON.stringify(body)});
  for(const body of [{query:'last conversation'},{mode:'recent',query:'what did we discuss'}]) {
    const res=await recallPrivateMemory(req(body),f.env);assert.equal(res.status,200);
    const text=JSON.stringify(await res.json());assert.match(text,/blue artwork/);assert.doesNotMatch(text,/OTHER ACCOUNT SECRET/);
  }
  const bad=await recallPrivateMemory(req({query:'blue',user_id:'b'}),f.env);assert.equal(bad.status,400);
  const record=f.sqlite.prepare('SELECT diagnostic_json FROM nina_tool_diagnostics WHERE request_id=?').get(bad.headers.get('X-Nina-Request-Id'));
  assert.equal(JSON.parse(record.diagnostic_json).code,'invalid_arguments');
  assert.doesNotMatch(record.diagnostic_json,/blue|Bearer|user_id/);
  await attachMemoryTool(config,f.env,f.identity('a'),'call-a','https://worker.example');
  assert.equal(config.tools.filter(t=>t.name==='recall_private_memory').length,1);
});

test('a database lookup exception yields a correlated failure, not a false empty recall',async()=>{
  const f=fixture(),config={};await attachMemoryTool(config,f.env,f.identity('a'),'call-a','https://worker.example');
  const tool=config.tools[0],original=f.env.NINA_MEMORY_DB.prepare;
  f.env.NINA_MEMORY_DB.prepare=sql=>{if(sql.includes('SELECT m.message_id'))throw new Error('D1_ERROR: no such table: messages');return original(sql);};
  const res=await recallPrivateMemory(new Request(tool.url,{method:'POST',headers:tool.headers,body:'{"query":"album"}'}),f.env);
  assert.equal(res.status,502);const body=await res.json();assert.ok(body.requestId);assert.equal(body.passages,undefined);
  const record=f.sqlite.prepare('SELECT diagnostic_json FROM nina_tool_diagnostics WHERE request_id=?').get(body.requestId);
  assert.equal(JSON.parse(record.diagnostic_json).code,'database_schema_missing');
});

test('mode guidance preserves canon and requires explicit owner technical intent',()=>{
  const canon='Nina is a human living in Berlin in 2063.';
  const owner=assembleSystemPrompt({systemPrompt:canon},true,'Private context').systemPrompt;
  const guest=assembleSystemPrompt({systemPrompt:canon},false,'').systemPrompt;
  assert.ok(owner.startsWith(canon));assert.match(owner,/Only an explicit owner request/);
  assert.match(owner,/Criticism, affection and questions about a failed recollection do not start this mode/);
  assert.doesNotMatch(guest,/Only an explicit owner request/);assert.match(guest,/does not grant account permissions/);
});
