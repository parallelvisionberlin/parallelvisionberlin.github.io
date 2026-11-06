// Read-only operational snapshots + the same source-controlled memory used by assistants.
const stateLabels={planned:'Planned',in_progress:'In progress',needs_verification:'Needs verification',deployed:'Deployed'};
const text=(tag,value,className)=>{const node=document.createElement(tag);node.textContent=String(value??'');if(className)node.className=className;return node;};
const date=value=>value?new Date(value).toLocaleString('en-GB',/^\d{4}-\d{2}-\d{2}$/.test(String(value))?{dateStyle:'medium'}:{dateStyle:'medium',timeStyle:'short'}):'Not recorded';
const count=value=>Number.isSafeInteger(value)&&value>=0?value.toLocaleString('en-GB'):'Unavailable';
function safeLink(label,url){
  try{if(typeof url==='string'&&/^(lab|lab-worker|\.github)\/[A-Za-z0-9_./#?=-]+$/.test(url)&&!url.split('/').includes('..'))url='https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/blob/main/'+url;const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.username||parsed.password||!['github.com','pvlab.studio','parallel-vision-lab.parallelvision.workers.dev'].includes(parsed.hostname))return text('span',label);
    const link=text('a',label);link.href=parsed.href;link.target='_blank';link.rel='noopener noreferrer';return link;
  }catch{return text('span',label);}
}
function definition(parent,label,value){const group=text('div','');group.append(text('dt',label),text('dd',value||'Not recorded'));parent.append(group);}
export function createOwnerOperationsUI({call,ownerReady,revision,openActivity,loadWorkRecords}={}){
  const $=id=>document.getElementById(id);
  let serial=0,recordSerial=0,lastSnapshotAt=0,snapshot=null,health=null,records=null,recordsPending=null,pending=null,filter='all';
  const recordLoader=loadWorkRecords||(async()=>{const response=await fetch('./owner-work-records.json?v=20261106-clear2',{cache:'no-cache',credentials:'omit'});if(!response.ok)throw Error('Work memory unavailable');return response.json();});
  function renderHome(){
    const root=$('owner-home-attention-items');if(!root)return;root.replaceChildren();
    let updates=0;
    const add=(label,href)=>{const link=text('a',label);link.href=href;root.append(link);updates++;};
    if(!snapshot)root.append(text('p',ownerReady()?'Notifications are unavailable. Refresh to retry.':'Available after owner verification.','owner-small'));
    else{
      const jobs=snapshot.jobs,settlements=snapshot.settlements;
      const unresolved=jobs?.available?jobs.counts.uncertain+jobs.counts.stale:null;
      if(unresolved===null)add('Job status unavailable','#owner-system');
      else if(unresolved)add(count(unresolved)+' jobs need a status check','#owner-system');
      if(jobs?.available&&jobs.counts.failed)add(count(jobs.counts.failed)+' failed jobs in the last '+snapshot.window.days+' days','#owner-system');
      if(settlements?.available&&settlements.pending)add(count(settlements.pending)+' costs awaiting confirmation','#owner-system');
      if(records){const work=records.records.filter(r=>r.status==='needs_verification');if(work.length)add(count(work.length)+(work.length===1?' update needs verification':' updates need verification'),'#owner-work-section');}
      if(!updates)root.append(text('p','No pending status checks.','owner-small'));
      root.append(text('small','Checked '+date(snapshot.asOf)+'. Failed jobs may already have been refunded.'));
    }
    const badge=$('owner-notifications-count');if(badge){badge.textContent=updates?String(updates):'';badge.hidden=!updates;}
  }
  function itemList(root,items,{settlement=false}={}){
    if(!items?.length)return;
    const list=text('ul','','owner-ops-list');
    for(const item of items){
      const li=text('li',''),copy=text('div','');
      copy.append(text('strong',settlement?'Billing confirmation':item.reason==='stale'?'No update for 30+ minutes':item.reason==='uncertain'?'Provider result uncertain':'Failed job'));
      copy.append(text('small',(item.jobId||'Job')+' · '+(settlement?'Next check '+date(item.nextCheckAt):date(item.updatedAt))));li.append(copy);
      if(item.customerId){const button=text('button','View customer');button.type='button';button.addEventListener('click',()=>openActivity({id:item.customerId}));li.append(button);}
      else li.append(text('small','Owner job / no customer link'));
      list.append(li);
    }
    root.append(list);
  }
  function renderSnapshot(){
    const root=$('owner-operations-content');if(!root)return;root.replaceChildren();
    const h=text('section','','owner-ops-health');h.append(text('h3',health?.ok?'Worker responding':'Worker health unavailable'));
    h.append(text('p',health?.ok?'Version '+String(health.version||'not supplied')+' · operations '+String(health.operations||'not identified'):'The public health read could not be confirmed.'));
    h.append(text('small','Health verifies a response, not bindings, migrations, scheduled runs or the complete release.'));root.append(h);
    if(!snapshot){root.append(text('p','Operational data unavailable. This is not a zero-error result.','owner-small'));renderHome();return;}
    const metrics=text('dl','','owner-ops-metrics');
    for(const [label,value] of [['Failed · last '+snapshot.window.days+' days',snapshot.jobs?.counts?.failed],['Uncertain · retained',snapshot.jobs?.counts?.uncertain],['No update for 30+ min',snapshot.jobs?.counts?.stale],['Costs awaiting confirmation',snapshot.settlements?.pending]])definition(metrics,label,count(value));
    root.append(metrics,text('p','Read '+date(snapshot.asOf)+' · up to '+snapshot.limits.itemsPerSource+' items per source. Counts can exceed the list.','owner-small'));
    const jobs=text('section','','owner-ops-group');jobs.append(text('h3','Work to inspect'));
    if(!snapshot.jobs?.available)jobs.append(text('p','Job source unavailable.','owner-small'));
    else if(!snapshot.jobs.items.length)jobs.append(text('p','No matching retained jobs in this snapshot.','owner-small'));
    else itemList(jobs,snapshot.jobs.items);
    root.append(jobs);
    const billing=text('section','','owner-ops-group');billing.append(text('h3','Billing confirmations'));
    if(!snapshot.settlements?.available)billing.append(text('p','Settlement source unavailable.','owner-small'));
    else{billing.append(text('p',count(snapshot.settlements.due)+' due for a scheduled check. No retry or charge is triggered here.','owner-small'));itemList(billing,snapshot.settlements.items,{settlement:true});}
    root.append(billing);
    const limits=document.createElement('details');limits.className='owner-check-detail';limits.append(text('summary','Scope and limits'));
    const ul=text('ul','');for(const value of snapshot.limitations||[])ul.append(text('li',value));limits.append(ul);root.append(limits);renderHome();
  }
  function renderRecords(){
    const root=$('owner-work-records');if(!root||!records)return;root.replaceChildren();
    const matching=records.records.filter(record=>filter==='all'||record.status===filter);
    for(const record of matching){
      const detail=document.createElement('details');detail.className='owner-work-record';detail.dataset.workId=record.id;
      const summary=document.createElement('summary'),heading=text('span','','owner-work-heading');heading.append(text('strong',record.title),text('small',record.summary));summary.append(heading,text('span',stateLabels[record.status]||record.status,'owner-work-state'));detail.append(summary);
      const body=text('div','','owner-work-body'),fields=text('dl','','owner-work-fields');
      definition(fields,'Next action',record.nextAction);definition(fields,'Updated',date(record.updatedAt));
      definition(fields,'Baseline main',record.baselineSha);definition(fields,'Reviewed source',record.reviewedSha);
      definition(fields,'Branch',record.branch);definition(fields,'Files',(record.files||[]).join(', '));body.append(fields);
      if(record.deployment){body.append(text('h4','Publication'),text('p',[record.deployment.state,record.deployment.environment,record.deployment.sourceSha,record.deployment.observedAt?date(record.deployment.observedAt):''].filter(Boolean).join(' · ')));
        for(const limit of record.deployment.limitations||[])body.append(text('p',limit,'owner-small'));}
      if(record.tests?.length){body.append(text('h4','Documented checks'));const list=text('ul','');for(const test of record.tests)list.append(text('li',test.label+' · '+test.result+' · '+test.scope));body.append(list);}
      if(record.evidence?.length){body.append(text('h4','Evidence and its limits'));const list=text('ul','');for(const proof of record.evidence){const li=text('li',proof.kind+' · '+proof.summary+' · '+proof.scope+(proof.observedAt?' · '+date(proof.observedAt):''));for(const limit of proof.limitations||[])li.append(text('small',limit));if(proof.source)li.append(safeLink('Source',proof.source));list.append(li);}body.append(list);}
      for(const [label,values] of [['Blockers',record.blockers],['Context for the next task',record.doNotRepeat]])if(values?.length){const disclosure=document.createElement('details');disclosure.append(text('summary',label));const list=text('ul','');for(const value of values)list.append(text('li',value));disclosure.append(list);body.append(disclosure);}
      const links=text('div','','owner-check-links');for(const link of record.links||[])links.append(safeLink(link.label,link.url));body.append(links);detail.append(body);root.append(detail);
    }
    if(!matching.length)root.append(text('p','No records in this state.','owner-small'));
    const handoffs=$('owner-work-handoffs');if(handoffs){handoffs.replaceChildren();for(const handoff of records.handoffs||[]){const row=text('p','');row.append(safeLink(handoff.title,'https://github.com/parallelvisionberlin/parallelvisionberlin.github.io/blob/main/'+handoff.path),text('small',handoff.scope));handoffs.append(row);}}
    $('owner-work-status').textContent='Source-controlled work memory · '+date(records.updatedAt)+'. Publication and signed-in verification are recorded separately.';renderHome();
  }
  async function loadRecords(){
    if(!ownerReady()||records)return records;
    if(recordsPending)return recordsPending;
    const current=revision(),id=++recordSerial;
    recordsPending=(async()=>{try{const data=await recordLoader();if(current!==revision()||id!==recordSerial||!ownerReady())return;
      if(data.schemaVersion!==1||!Array.isArray(data.records))throw Error('Invalid work memory');records=data;renderRecords();return records;
    }catch{if(current===revision()&&id===recordSerial)$('owner-work-status').textContent='Work memory unavailable. Existing documentation remains accessible below.';}
    finally{if(id===recordSerial)recordsPending=null;}})();return recordsPending;
  }
  async function refresh({force=false}={}){
    if(!ownerReady())return;
    void loadRecords();
    if(pending)return pending;
    if(!force&&lastSnapshotAt&&Date.now()-lastSnapshotAt<60000)return;
    const current=revision(),id=++serial,button=$('owner-operations-refresh');button.disabled=true;$('owner-operations-status').textContent='Reading the current system snapshot…';
    pending=(async()=>{try{
      const values=await Promise.allSettled([call('/api/admin/operations?days=7'),call('/health')]);
      if(current!==revision()||id!==serial||!ownerReady())return;
      snapshot=values[0].status==='fulfilled'&&values[0].value?.version==='owner-operations-v1'?values[0].value:null;
      health=values[1].status==='fulfilled'?values[1].value:null;
      lastSnapshotAt=Date.now();renderSnapshot();
      $('owner-operations-status').textContent=snapshot?'Read-only snapshot · '+date(snapshot.asOf):'Operational endpoint unavailable. Backend publication or access needs verification.';
    }catch{if(current===revision()&&id===serial)$('owner-operations-status').textContent='System snapshot unavailable.';}
    finally{if(id===serial){button.disabled=false;pending=null;}}})();return pending;
  }
  function clear(){serial++;recordSerial++;snapshot=null;health=null;records=null;pending=null;recordsPending=null;lastSnapshotAt=0;
    if($('owner-operations-status'))$('owner-operations-status').textContent='Available after owner verification.';if($('owner-work-status'))$('owner-work-status').textContent='Available after owner verification.';$('owner-operations-content')?.replaceChildren();$('owner-work-records')?.replaceChildren();$('owner-work-handoffs')?.replaceChildren();$('owner-home-attention-items')?.replaceChildren();if($('owner-notifications-count'))$('owner-notifications-count').hidden=true;if($('owner-operations-refresh'))$('owner-operations-refresh').disabled=false;
  }
  $('owner-notifications-refresh')?.addEventListener('click',()=>void refresh({force:true}));
  $('owner-operations-refresh')?.addEventListener('click',()=>void refresh({force:true}));
  for(const button of document.querySelectorAll('[data-owner-work-state]'))button.addEventListener('click',()=>{filter=button.dataset.ownerWorkState;for(const b of document.querySelectorAll('[data-owner-work-state]'))b.setAttribute('aria-pressed',String(b===button));renderRecords();});
  return {refresh,loadRecords,clear};
}
