import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {creditsForJobUsd} from '../lab-worker/job-pricing.mjs';
import {NANO21_MODEL} from '../lab-worker/nano-banana-21.mjs';

const source={type:'image',provider:'spicy',engine:'seedream',mode:'image',resolution:'1k'};
test('SpicyAPI image generation shows exact five-credit retail steps; other product prices remain fixed',()=>{
  assert.equal(creditsForJobUsd(.05,source),25); // previous variable quote displayed 23
  assert.equal(creditsForJobUsd(.018,source),10);
  assert.equal(creditsForJobUsd(.22,source),105);
  assert.equal(creditsForJobUsd(0,source),10);
  assert.equal(creditsForJobUsd(.05,{...source,mode:'upscale'}),23);
  assert.equal(creditsForJobUsd(.05,{type:'image',mode:'image',provider:'gemini'}),23);
  assert.equal(creditsForJobUsd(.05,{type:'video',provider:'spicy',engine:'standard'}),23);
  assert.equal(creditsForJobUsd(.0336,{type:'image',provider:'gemini',engine:'gemini21',
    model:NANO21_MODEL,processing:'normal',resolution:'1k'}),8);
});
test('live customer credit wallet trigger charges exactly the quoted image step, not the old 23 credits',t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());
 for(const file of ['schema.sql','migrations/0006-customers-billing.sql',
   'migrations/0020-wan-seedance-budget-pricing.sql','migrations/0021-spicy-image-credit-steps.sql'])
   db.exec(readFileSync(new URL('../lab-worker/'+file,import.meta.url),'utf8'));
 const now=Date.now(),user='user_SpicySteps';
 db.prepare('INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,?,?)').run(user,user,now,now);
 db.prepare("INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES('fund',?,2000,'purchase','billing:price',?)").run(user,now);
 const insert=db.prepare("INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,?,'submitting',?,?,?)");
 const charge=id=>-db.prepare("SELECT delta_credits AS amount FROM lab_credit_entries WHERE reference='job:'||?").get(id)?.amount;
 let idx=0;
 const pay=(settings,micros,expected)=>{
   const id='price-test-'+(++idx);
   insert.run(id,user,JSON.stringify(settings),micros,now,now);
   assert.equal(charge(id),expected);
   return id;
 };
 pay(source,50000,25);
 pay(source,18000,10);
 pay(source,220000,105);
 pay({...source,mode:'upscale'},50000,23);
 pay({...source,provider:'gemini'},50000,23);
 pay({type:'video',provider:'spicy',engine:'other',mode:'start'},50000,23);
 pay({type:'image',provider:'gemini',engine:'gemini21',model:NANO21_MODEL,processing:'normal',resolution:'1k'},33600,8);
 const owner='owner_NoCustomer',id='owner-job';
 insert.run(id,owner,JSON.stringify(source),50000,now,now);
 assert.equal(db.prepare("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE reference='job:'||?").get(id).n,0);
 assert.equal(db.prepare('SELECT balance_credits AS balance FROM lab_customers WHERE id=?').get(user).balance,
   2000-(25+10+105+23+23+23+8));
});
test('UI uses the same verified retail quote for owner and public, never hides pricing behind a different debit',()=>{
 const client=readFileSync(new URL('../lab/app-mood-generation.js',import.meta.url),'utf8');
 const explore=readFileSync(new URL('../lab/explore-moods.js',import.meta.url),'utf8');
 const mobile=readFileSync(new URL('../lab/app-moods.js',import.meta.url),'utf8');
 assert.match(client,/const imageCredits=pricedBoundQuotes\(quote,1,'SpicyAPI'\)\.credits/);
 assert.match(client,/const label=imageCredits\+' credits'/);
 assert.match(client,/imageCredits>session\.balanceCredits/);
 assert.match(client,/error\.code='INSUFFICIENT_CREDITS'/);
 assert.doesNotMatch(client,/session\.customer\?pricedBoundQuotes/);
 assert.doesNotMatch(explore,/Checking price/);
 assert.doesNotMatch(mobile,/Checking price/);
 // The Explore button is immediately clickable and reads only Generate.
 // Its actual credit cost is still the same server-bound retail quote,
 // displayed separately in the small footer note.
 assert.match(explore,/creditNote\.textContent=ready\.label\+' per image'/);
 assert.match(explore,/generate\.textContent='Generate'/);
 assert.doesNotMatch(explore,/Generate · /);
 assert.match(mobile,/Generate · /);
});
