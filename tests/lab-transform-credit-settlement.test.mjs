import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
const read=p=>readFileSync(new URL('../lab-worker/'+p,import.meta.url),'utf8');
function setup(t){
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());
 db.exec(read('schema.sql'));
 for(const name of ['0006-customers-billing','0028-generation-finance-ledger','0041-provider-settlement','0062-transform-seedance-credit-parity','0063-transform-final-cost-credit-release'])db.exec(read('migrations/'+name+'.sql'));
 const user='user_TransformPrice';
 db.prepare('INSERT INTO lab_customers(id,clerk_subject,created_at,updated_at) VALUES(?,?,?,?)').run(user,user,100,100);
 db.prepare("INSERT INTO lab_credit_entries(id,customer_id,delta_credits,kind,reference,created_at) VALUES(?,?,?,?,?,?)").run('initial',user,10000,'purchase','initial-funds',100);
 const query=(sql,...args)=>db.prepare(sql).get(...args);
 const run=(sql,...args)=>db.prepare(sql).run(...args);
 const balance=()=>query('SELECT balance_credits AS amount FROM lab_customers WHERE id=?',user).amount;
 const entries=()=>db.prepare("SELECT delta_credits,kind,reference FROM lab_credit_entries WHERE customer_id=? ORDER BY rowid").all(user);
 const settings=(overrides={})=>({type:'video',provider:'spicy',engine:'seedance',mode:'transform',transformType:'replace-character',model:'bytedance/seedance-2.5/video-edit',resolution:'720p',...overrides});
 const job=(id,overrides={})=>run('INSERT INTO jobs(id,owner_id,params,state,provider_id,estimate_microusd,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)',id,user,JSON.stringify(settings(overrides)),'queued','provider_'+id,13680000,110,110);
 return {db,user,run,query,balance,entries,job};
}
test('Completed 12s 720p edit returns only confirmed surplus; original debit stays immutable',t=>{
 const f=setup(t);f.job('edit12');
 assert.equal(f.balance(),7811); // ceil(13.68 USD * 160) = 2,189 reserved credits
 f.run("UPDATE jobs SET state='completed',updated_at=200 WHERE id='edit12'");
 assert.equal(f.balance(),7811);
 f.run("UPDATE jobs SET settled_cost=5.472 WHERE id='edit12'");
 assert.equal(f.balance(),9124); // remaining charge 876, release 1313
 assert.deepEqual(f.entries().filter(x=>x.kind==='adjustment').map(x=>x.delta_credits),[1313]);
 f.run("UPDATE jobs SET settled_cost=5.472 WHERE id='edit12'");
 f.run("UPDATE jobs SET state='completed',updated_at=300 WHERE id='edit12'");
 assert.equal(f.balance(),9124);
 assert.equal(f.query("SELECT COUNT(*) AS n FROM lab_credit_entries WHERE reference='settled:transform:job:edit12'").n,1);
});
test('Final price known before completion releases only after successful archiving',t=>{
 const f=setup(t);f.job('early');
 f.run("UPDATE jobs SET settled_cost=5.472 WHERE id='early'");
 assert.equal(f.balance(),7811);
 f.run("UPDATE jobs SET state='completed' WHERE id='early'");
 assert.equal(f.balance(),9124);
});
test('Confirmed settlement after media/job deletion still restores surplus once',t=>{
 const f=setup(t);f.job('deleted');
 f.run("UPDATE jobs SET state='completed' WHERE id='deleted'");
 f.run("DELETE FROM jobs WHERE id='deleted'");
 assert.equal(f.query("SELECT last_state FROM lab_generation_finance WHERE job_id='deleted'").last_state,'completed');
 f.run("UPDATE lab_generation_finance SET settled_cost_usd=5.472 WHERE job_id='deleted'");
 assert.equal(f.balance(),9124);
 f.run("UPDATE lab_generation_finance SET settled_cost_usd=5.472 WHERE job_id='deleted'");
 assert.equal(f.balance(),9124);
});
test('Failed and refunded jobs never receive a second settlement credit',t=>{
 const f=setup(t);f.job('failed');
 f.run("UPDATE jobs SET state='failed' WHERE id='failed'");
 assert.equal(f.balance(),10000);
 f.run("UPDATE jobs SET settled_cost=0.25 WHERE id='failed'");
 assert.equal(f.balance(),10000);
 f.run("UPDATE jobs SET state='completed' WHERE id='failed'");
 assert.equal(f.balance(),10000);
});
test('Unknown cost, over-maximum cost, and unrelated models fail closed',t=>{
 const f=setup(t);f.job('over');f.run("UPDATE jobs SET state='completed',settled_cost=20 WHERE id='over'");
 assert.equal(f.balance(),7811);
 f.job('other',{model:'bytedance/seedance-2.5/reference-to-video',mode:'reference'});
 f.run("UPDATE jobs SET state='completed',settled_cost=1 WHERE id='other'");
 assert.equal(f.balance(),5622);
 assert.equal(f.entries().filter(x=>x.kind==='adjustment').length,0);
});
test('Migration may be re-applied without double credits or duplicate job metadata',t=>{
 const f=setup(t);f.db.exec(read('migrations/0063-transform-final-cost-credit-release.sql'));
 f.job('replay');f.run("UPDATE jobs SET state='completed',settled_cost=5.472 WHERE id='replay'");
 assert.equal(f.balance(),9124);
 f.db.exec(read('migrations/0063-transform-final-cost-credit-release.sql'));
 assert.equal(f.balance(),9124);
});
