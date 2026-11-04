import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {ensureCustomer} from '../lab-worker/customer-billing.mjs';
import {migrationRoute} from '../lab-worker/clerk-migration.mjs';
import {STUDIO_ISSUER} from '../lab-worker/clerk-issuer-policy.mjs';
import {queueSignupWelcome,processSignupWelcomeEmails,signupWelcomeMessage}
  from '../lab-worker/signup-welcome-email.mjs';
import {requestAccountClosure} from '../lab-worker/customer-lifecycle.mjs';

const T=1792281600000;
const migrations=['schema.sql','migrations/0006-customers-billing.sql',
  'migrations/0011-customer-lifecycle.sql','migrations/0015-lab-promotional-credits.sql',
  'migrations/0017-clerk-domain-links.sql','migrations/0023-welcome-guard.sql',
  'migrations/0031-signup-welcome-email.sql'];

function fixture(t,{enabled='true',key='re_fake_private_unit_test_key'}={}){
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  for(const name of migrations)db.exec(readFileSync(new URL('../lab-worker/'+name,import.meta.url),'utf8'));
  const env={
    LAB_WELCOME_EMAIL_ENABLED:enabled,
    LAB_RESEND_API_KEY:key,
    LAB_WELCOME_CREDITS_ENABLED:'false',
    LAB_SECRET:'synthetic-PVLAB-no-real-signing-secret-abcdefghijklmnopqrstuvwxyz01234567',
    LAB_DB:{
      prepare(sql){return {bind(...args){return {
        first:async()=>db.prepare(sql).get(...args)||null,
        all:async()=>({results:db.prepare(sql).all(...args)}),
        run:async()=>({meta:{changes:db.prepare(sql).run(...args).changes}})
      };}};},
      async batch(statements){db.exec('BEGIN');try{
        const results=[];for(const s of statements)results.push(await s.run());
        db.exec('COMMIT');return results;
      }catch(e){db.exec('ROLLBACK');throw e;}}
    }
  };
  const row=id=>db.prepare('SELECT * FROM lab_signup_welcome_emails WHERE customer_id=?').get(id);
  const contact=(id,email,verified=true,now=T)=>{
    db.prepare('INSERT OR REPLACE INTO lab_customer_contacts(customer_id,email,verified_at,synced_at) VALUES(?,?,?,?)')
      .run(id,email,verified?now:null,now);
  };
  async function customer(suffix='Alpha'){
    const subject='user_'+suffix,id='user_PvLabV2'+suffix;
    db.prepare("INSERT INTO lab_clerk_identity_links(new_subject,canonical_id,kind,created_at) VALUES(?,?,'customer',?)").run(subject,id,T);
    await ensureCustomer(env,id);
    return {id,subject};
  }
  return {db,env,row,contact,customer};
}
const sendResponse=()=>Response.json({id:'49a3999c-0ce1-4ea6-ab68-afcd6dc2e794'});

test('approved editorial keeps original imagery, accessible actions and truthful transactional copy',()=>{
  const m=signupWelcomeMessage();
  assert.equal(m.from,'PV LAB <hello@pvlab.studio>');
  assert.equal(m.reply_to,'contact@parallelvisionlabel.com');
  assert.equal(m.subject,'Welcome to PV LAB. Create beyond one image.');
  const routes=['','moods','full-editorial.html','studio.html?tool=image','studio.html?tool=video','#create-your-character'];
  for(const route of routes){
    const url='https://pvlab.studio/'+route;
    assert.ok(m.html.includes('href="'+url+'"'),url);
    assert.ok(m.text.includes(url),url+' plain-text fallback');
  }
  assert.match(m.html,/<h1[^>]*>Create beyond<br>one image\.<\/h1>/);
  assert.match(m.html,/<a class="pv-button"[^>]*>Enter the studio<\/a>/);
  assert.match(m.html,/>Explore Moods<\/a>/);
  assert.match(m.html,/alt="PV LAB"/);
  assert.match(m.html,/@media only screen and \(max-width:600px\)/);
  assert.match(m.html,/bgcolor="#171b18"/,'Hero copy has a solid fallback when backgrounds are blocked');
  assert.match(m.html,/v:fill type="frame"/,'Outlook gets a background-image fallback');
  assert.match(m.html,/welcome-20261104-hero-mobile\.jpg/);
  assert.match(m.html,/welcome-20261104-hero-desktop\.jpg/);
  assert.match(m.text,/because you created a PV LAB account/);
  assert.doesNotMatch(m.html+m.text,/free (?:credits|image|trial)|welcome credits|200 credits|discount|one world/i);
  assert.doesNotMatch(m.html,/tracking-pixel|utm_source|&#8599;|↗|<script|welcome-hero-horizontal|welcome-detail-/i);
  const images=[...m.html.matchAll(/<img\b[^>]*>/g)].map(m=>m[0]);
  assert.equal(images.length,7);
  for(const image of images){
    assert.match(image,/alt="[^" ]+[^" ]*[^"]*"/,'Every image has meaningful alternative text');
    assert.match(image,/src="https:\/\/pvlab\.studio\/email\//,'Only first-party imagery');
    assert.doesNotMatch(image,/width="1"|height="1"/);
  }
  const urls=[...new Set(m.html.match(/https:\/\/pvlab\.studio\/email\/[a-zA-Z0-9.-]+/g))];
  assert.equal(urls.length,9,'All nine approved assets are referenced');
  for(const url of urls){
    const bytes=readFileSync(new URL('../lab/email/'+url.split('/').at(-1),import.meta.url));
    assert.ok(bytes.length>1000&&bytes.length<200000,'Compact high-quality original: '+url);
    assert.equal(bytes.subarray(0,url.endsWith('.png')?8:3).toString('hex'),url.endsWith('.png')?'89504e470d0a1a0a':'ffd8ff');
  }
});

test('registration queue is one-time, new studio customer only; never on sign-in or backfill',async t=>{
  const f=fixture(t,{enabled:'false'});
  const first=await f.customer('SignupDisabled');
  assert.equal(await queueSignupWelcome(f.env,first.id,{clock:()=>T}),false);
  assert.equal(f.row(first.id),undefined);
  f.env.LAB_WELCOME_EMAIL_ENABLED='true';
  const next=await f.customer('FreshOnly');
  assert.equal(await queueSignupWelcome(f.env,next.id,{clock:()=>T}),true);
  assert.equal(await queueSignupWelcome(f.env,next.id,{clock:()=>T}),false);
  assert.equal(f.row(first.id),undefined,'Turning on welcome mail does not message previous users');
  await ensureCustomer(f.env,next.id);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM lab_signup_welcome_emails').get().n,1);
  await ensureCustomer(f.env,'user_OlderLegacy');
  assert.equal(await queueSignupWelcome(f.env,'user_OlderLegacy',{clock:()=>T}),false);
});

test('actual new-account endpoint queues after user wallet creation without sending in the request',async t=>{
  const f=fixture(t);
  const identity={issuer:STUDIO_ISSUER,id:null,kind:null,subject:'user_EndpointNew'};
  const res=await migrationRoute(new Request('https://pvlab.studio/api/migration/new',{method:'POST'}),f.env,identity);
  assert.equal(res.status,201);
  const data=await res.json();assert.deepEqual(data,{linked:true,kind:'customer'});
  assert.equal(f.row('user_PvLabV2EndpointNew').state,'pending');
  const second=await migrationRoute(new Request('https://pvlab.studio/api/migration/new',{method:'POST'}),f.env,identity).catch(e=>e);
  assert.equal(second.status,409);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM lab_signup_welcome_emails').get().n,1);
});

test('one accepted provider email, deterministic idempotency key and verified recipient only',async t=>{
  const f=fixture(t),{id}=await f.customer('Verified');
  f.contact(id,'verified@example.com');
  await queueSignupWelcome(f.env,id,{clock:()=>T});
  const calls=[];
  const opts={clock:()=>T+10000,fetcher:async(url,init)=>{calls.push({url,init});return sendResponse();},
    syncEmail:async()=>{throw Error('Contact already verified.');}};
  const [one,two]=await Promise.all([
    processSignupWelcomeEmails(f.env,opts),
    processSignupWelcomeEmails(f.env,opts)
  ]);
  assert.equal(one.sent+two.sent,1);
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,'https://api.resend.com/emails');
  assert.equal(calls[0].init.headers['Idempotency-Key'],'pvlab-signup-welcome-v1:'+id);
  assert.equal(calls[0].init.headers.Authorization,'Bearer '+f.env.LAB_RESEND_API_KEY);
  assert.deepEqual(JSON.parse(calls[0].init.body).to,['verified@example.com']);
  assert.equal(f.row(id).state,'sent');
  assert.equal(f.row(id).provider_message_id,'49a3999c-0ce1-4ea6-ab68-afcd6dc2e794');
  assert.equal((await processSignupWelcomeEmails(f.env,opts)).sent,0);
  assert.equal(calls.length,1);
});

test('unverified accounts stay pending until Clerk verification is confirmed',async t=>{
  const f=fixture(t),{id}=await f.customer('Waiting');
  f.contact(id,'waiting@example.org',false,T);
  await queueSignupWelcome(f.env,id,{clock:()=>T});
  const calls=[];
  const fetcher=async()=>{calls.push(1);return sendResponse();};
  const initial=await processSignupWelcomeEmails(f.env,{clock:()=>T+5000,fetcher,syncEmail:async()=>false});
  assert.equal(initial.sent,0);assert.equal(f.row(id).state,'pending');assert.equal(calls.length,0);
  f.contact(id,'waiting@example.org',true,T+10000);
  const verified=await processSignupWelcomeEmails(f.env,{clock:()=>T+12000,fetcher});
  assert.equal(verified.sent,1);assert.equal(calls.length,1);
});

test('closed accounts, disposable addresses and expired requests cannot send',async t=>{
  const f=fixture(t);
  const closed=await f.customer('ClosedBefore');
  f.contact(closed.id,'closed@example.com');
  await queueSignupWelcome(f.env,closed.id,{clock:()=>T});
  await requestAccountClosure(f.env,closed.id,'DELETE MY PV LAB ACCOUNT');
  const abuse=await f.customer('Disposable');
  f.contact(abuse.id,'alias@yournike.com');
  await queueSignupWelcome(f.env,abuse.id,{clock:()=>T});
  const old=await f.customer('Expired');
  f.contact(old.id,'old@example.com');
  await queueSignupWelcome(f.env,old.id,{clock:()=>T-73*60*60*1000});
  let sent=0;
  await processSignupWelcomeEmails(f.env,{clock:()=>T+10000,fetcher:async()=>{sent++;return sendResponse();}});
  assert.equal(sent,0);
  assert.equal(f.row(closed.id).state,'pending');
  assert.equal(f.row(abuse.id).state,'skipped');
  assert.equal(f.row(old.id).state,'skipped');
});

test('provider or network uncertainty stops automatic retries and prevents doubles',async t=>{
  const f=fixture(t),{id}=await f.customer('Ambiguous');
  f.contact(id,'ambiguous@example.org');
  await queueSignupWelcome(f.env,id,{clock:()=>T});
  let calls=0;
  const fetcher=async()=>{calls++;throw Error('Provider timeout after possible acceptance');};
  await processSignupWelcomeEmails(f.env,{clock:()=>T+1000,fetcher});
  assert.equal(f.row(id).state,'uncertain');
  await processSignupWelcomeEmails(f.env,{clock:()=>T+3600000,fetcher});
  assert.equal(calls,1);
});

test('explicit 429 is retried with the same provider idempotency key after cooldown',async t=>{
  const f=fixture(t),{id}=await f.customer('RateLimit');
  f.contact(id,'limit@example.org');
  await queueSignupWelcome(f.env,id,{clock:()=>T});
  const keys=[];let tries=0;
  const fetcher=async(url,init)=>{tries++;keys.push(init.headers['Idempotency-Key']);return tries===1?
    new Response('{}',{status:429}):sendResponse();};
  await processSignupWelcomeEmails(f.env,{clock:()=>T+1000,fetcher});
  assert.equal(f.row(id).state,'pending');assert.equal(tries,1);
  await processSignupWelcomeEmails(f.env,{clock:()=>T+120000,fetcher});
  assert.equal(tries,1,'15-minute retry cooldown');
  await processSignupWelcomeEmails(f.env,{clock:()=>T+16*60000,fetcher});
  assert.equal(tries,2);
  assert.equal(f.row(id).state,'sent');
  assert.deepEqual(keys,['pvlab-signup-welcome-v1:'+id,'pvlab-signup-welcome-v1:'+id]);
});

test('missing Resend secret or flag never sends, while preserving a valid pending request',async t=>{
  const f=fixture(t,{key:''}),{id}=await f.customer('MissingKey');
  f.contact(id,'valid@example.org');
  await queueSignupWelcome(f.env,id,{clock:()=>T});
  let sends=0;
  const r=await processSignupWelcomeEmails(f.env,{clock:()=>T+1000,fetcher:async()=>{sends++;return sendResponse();}});
  assert.equal(r.status,'disabled_or_unconfigured');assert.equal(sends,0);
  assert.equal(f.row(id).state,'pending');
  f.env.LAB_RESEND_API_KEY='re_configured_test_only';
  f.env.LAB_WELCOME_EMAIL_ENABLED='false';
  assert.equal((await processSignupWelcomeEmails(f.env,{clock:()=>T+1500})).sent,0);
});
