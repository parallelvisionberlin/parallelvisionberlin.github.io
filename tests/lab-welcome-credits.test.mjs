import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {WELCOME_CREDITS,ensureCustomer,creditsForUsd} from '../lab-worker/customer-billing.mjs';

function fixture(t) {
  const db=new DatabaseSync(':memory:');
  t.after(()=>db.close());
  for(const path of ['../lab-worker/schema.sql','../lab-worker/migrations/0006-customers-billing.sql'])
    db.exec(readFileSync(new URL(path,import.meta.url),'utf8'));
  const prepare=sql=>({bind(...params){
    const stmt=db.prepare(sql);
    return {
      async first(){return stmt.get(...params)||null;},
      async run(){return {meta:{changes:stmt.run(...params).changes}};},
      async all(){return {results:stmt.all(...params)};}
    };
  }});
  // One local SQLite connection needs transaction serialization; production
  // Cloudflare D1 serializes its own atomic batch transactions.
  let pending=Promise.resolve();
  const env={LAB_DB:{
    prepare,
    batch(statements) {
      const transaction=pending.then(async()=>{
        const output=[];db.exec('BEGIN IMMEDIATE');
        try{
          for(const statement of statements)output.push(await statement.run());
          db.exec('COMMIT');return output;
        }catch(error){db.exec('ROLLBACK');throw error;}
      });
      pending=transaction.catch(()=>{});
      return transaction;
    }
  },LAB_WELCOME_CREDITS_ENABLED:'false',LAB_WELCOME_CREDITS_ACTIVATED_AT:'0'};
  const count=(subject)=>db.prepare('SELECT COUNT(*) AS n FROM lab_credit_entries WHERE customer_id=? AND reference LIKE ?').get(subject,'welcome:120:v1:%').n;
  const balance=(subject)=>db.prepare('SELECT balance_credits AS n FROM lab_customers WHERE id=?').get(subject)?.n??null;
  return {db,env,count,balance};
}
const subject='user_WelcomeTester1';

test('welcome balance is off by default and cannot be enabled by the bonus flag alone',async t=>{
  const f=fixture(t);
  await ensureCustomer(f.env,subject);
  assert.equal(f.balance(subject),0);
  assert.equal(f.count(subject),0);
  f.env.LAB_WELCOME_CREDITS_ENABLED='true';
  for(const bad of ['0','',undefined,'yesterday','9999999999999']){
    f.env.LAB_WELCOME_CREDITS_ACTIVATED_AT=bad;
    await ensureCustomer(f.env,'user_BadFlag');
    assert.equal(f.balance('user_BadFlag'),0);
  }
  assert.equal(WELCOME_CREDITS,120);
});

test('only accounts created from activation time receive 120 credits, once',async t=>{
  const f=fixture(t);
  await ensureCustomer(f.env,'user_AlreadyHere');
  f.db.prepare('UPDATE lab_customers SET created_at=? WHERE id=?').run(Date.now()-5000,'user_AlreadyHere');
  f.env.LAB_WELCOME_CREDITS_ENABLED='true';
  f.env.LAB_WELCOME_CREDITS_ACTIVATED_AT=String(Date.now()-1000);
  await ensureCustomer(f.env,'user_AlreadyHere');
  assert.equal(f.balance('user_AlreadyHere'),0);
  await ensureCustomer(f.env,subject);
  assert.equal(f.balance(subject),120);
  await ensureCustomer(f.env,subject);
  assert.equal(f.balance(subject),120);
  assert.equal(f.count(subject),1);
  const entry=f.db.prepare('SELECT kind,delta_credits FROM lab_credit_entries WHERE customer_id=?').get(subject);
  assert.equal(entry.kind,'adjustment');
  assert.equal(entry.delta_credits,120);
});

test('repeated and simultaneous authenticated requests do not mint duplicate welcome credits',async t=>{
  const f=fixture(t);
  f.env.LAB_WELCOME_CREDITS_ENABLED='true';
  f.env.LAB_WELCOME_CREDITS_ACTIVATED_AT=String(Date.now()-1000);
  await Promise.all(Array.from({length:12},()=>ensureCustomer(f.env,subject)));
  assert.equal(f.balance(subject),120);
  assert.equal(f.count(subject),1);
  await ensureCustomer(f.env,'user_Second');
  assert.equal(f.balance('user_Second'),120);
  assert.equal(f.count('user_Second'),1);
});

test('welcome credits use the ordinary wallet for any priced job and cannot overdraw it',async t=>{
  const f=fixture(t);
  f.env.LAB_WELCOME_CREDITS_ENABLED='true';
  f.env.LAB_WELCOME_CREDITS_ACTIVATED_AT=String(Date.now()-1000);
  await ensureCustomer(f.env,subject);
  assert.equal(creditsForUsd(.25),115);
  f.db.prepare("INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,'{}','queued',250000,1,1)")
      .run('welcome-motion-job',subject);
  assert.equal(f.balance(subject),5);
  assert.throws(()=>f.db.prepare("INSERT INTO jobs(id,owner_id,params,state,estimate_microusd,created_at,updated_at) VALUES(?,?,'{}','queued',250000,2,2)")
      .run('unaffordable-job',subject),/Insufficient PV Lab credits/);
  assert.equal(f.balance(subject),5);
  f.db.prepare("UPDATE jobs SET state='failed' WHERE id='welcome-motion-job'").run();
  assert.equal(f.balance(subject),120);
  await ensureCustomer(f.env,subject);
  assert.equal(f.balance(subject),120);
  assert.equal(f.count(subject),1);
});

test('welcome credit entries remain separate from verified paid credits and referrals',async t=>{
  const f=fixture(t);
  f.env.LAB_WELCOME_CREDITS_ENABLED='true';
  f.env.LAB_WELCOME_CREDITS_ACTIVATED_AT=String(Date.now()-1000);
  await ensureCustomer(f.env,subject);
  f.db.prepare("INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES(?,?,1000,'purchase',?,?)")
      .run('paid',subject,'checkout:cs_paid',Date.now());
  await ensureCustomer(f.env,subject);
  assert.equal(f.balance(subject),1120);
  assert.equal(f.count(subject),1);
});