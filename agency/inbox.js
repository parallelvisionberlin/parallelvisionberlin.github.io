import {loadLabAccount} from '../lab/native-account.js?v=20261012-unified-header1&studioAuth=20261015-1';
import {createSessionRequest} from '../lab/session-request.js?v=20260927-auth1&studioAuth=20261015-1';
const $=id=>document.getElementById(id);
let clerk=null,identity='',serial=0,offset=0,busy=false;
const request=createSessionRequest({baseUrl:'https://parallel-vision-lab.parallelvision.workers.dev',getSession:()=>clerk?.session});
function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=String(text);if(className)node.className=className;return node;}
async function call(path,options={}){const response=await request(path,options);const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'The inbox could not be loaded.');return data;}
function clear(){serial++;$('inbox-content').hidden=true;$('inbox-records').replaceChildren();$('inbox-metrics').replaceChildren();}
function record(row){
  const item=el('details',undefined,'enquiry'),summary=el('summary'),left=el('span'),right=el('span');
  left.append(el('strong',row.name+(row.company?' / '+row.company:'')),el('small',row.email));
  right.append(el('small',new Date(row.created_at).toLocaleString()),el('small',row.status+' / '+row.direction));summary.append(left,right);item.append(summary);
  item.append(el('p','Budget: '+(row.budget||'To discuss')+' · Source: '+row.source+' · Email notification: '+row.mail_state,'enquiry-meta'),el('p',row.message,'enquiry-message'));
  const actions=el('div',undefined,'enquiry-actions'),reply=el('a','Reply by email ↗','reply');
  reply.href='mailto:'+encodeURIComponent(row.email)+'?subject='+encodeURIComponent('Re: '+row.direction+' / Parallel Vision Agency');actions.append(reply);
  for(const [label,state] of [['Mark read','read'],['Archive','archived']]){
    const button=el('button',label);button.type='button';button.disabled=row.status===state;
    button.addEventListener('click',async()=>{button.disabled=true;try{await call('/api/admin/agency/enquiries/'+encodeURIComponent(row.id),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:state})});await load();}catch(error){$('inbox-status').textContent=error.message;button.disabled=false;}});actions.append(button);
  }
  const remove=el('button','Delete','delete');remove.type='button';remove.addEventListener('click',async()=>{
    if(!confirm('Permanently delete this enquiry from the studio inbox?'))return;remove.disabled=true;
    try{await call('/api/admin/agency/enquiries/'+encodeURIComponent(row.id),{method:'DELETE'});await load();}catch(error){$('inbox-status').textContent=error.message;remove.disabled=false;}
  });actions.append(remove);item.append(actions,el('p','Reference: '+row.id,'enquiry-meta'));return item;
}
async function load(){
  const current=++serial;busy=true;$('inbox-refresh').disabled=true;$('inbox-status').textContent='Loading private enquiries…';
  try{
    const data=await call('/api/admin/agency/enquiries?offset='+offset);if(current!==serial)return;
    const events=Object.fromEntries(data.events.map(row=>[row.event,Number(row.count)||0]));
    $('inbox-metrics').replaceChildren();
    for(const [label,value] of [['Page views / 30 days',events.page_view||0],['Form starts / 30 days',events.form_start||0],['Briefs received / 30 days',events.enquiry_received||0],['Unread briefs',Number(data.totals.unread)||0]]){
      const metric=el('div',undefined,'metric');metric.append(el('strong',value),el('span',label));$('inbox-metrics').append(metric);
    }
    $('inbox-records').replaceChildren(...data.records.map(record));
    if(!data.records.length)$('inbox-records').append(el('p','No enquiries on this page yet.'));
    $('inbox-mail-note').textContent=data.notificationConfigured?'Email notifications also go to contact@parallelvisionlabel.com. A saved brief remains here even when notification delivery fails.':'Email notification is not configured. All accepted briefs are saved here.';
    $('inbox-prev').disabled=offset===0;$('inbox-next').disabled=!data.hasMore;
    $('inbox-page').textContent=Number(data.totals.total)?(offset+1)+'–'+(offset+data.records.length)+' of '+data.totals.total:'0 enquiries';
    $('inbox-content').hidden=false;$('inbox-status').textContent='Owner access verified. Refreshed '+new Date().toLocaleTimeString()+'.';
  }catch(error){if(current!==serial)return;clear();busy=false;$('inbox-refresh').disabled=false;$('inbox-status').textContent=error.message+' Reload this page to retry.';}
  finally{if(current===serial){busy=false;$('inbox-refresh').disabled=false;}}
}
$('inbox-refresh').addEventListener('click',()=>{if(!busy)void load();});
$('inbox-prev').addEventListener('click',()=>{if(!busy){offset=Math.max(0,offset-25);void load();}});
$('inbox-next').addEventListener('click',()=>{if(!busy){offset+=25;void load();}});
$('inbox-signin').addEventListener('click',()=>clerk?.openSignIn());
try{
  clerk=await loadLabAccount();
  const changed=()=>{const next=clerk.session?.id||'';if(next===identity&&identity)return;identity=next;clear();offset=0;busy=false;
    $('inbox-signin').hidden=!!next;if(next)void load();else $('inbox-status').textContent='Sign in with the Parallel Vision owner account.';};
  clerk.addListener(changed);changed();
}catch{clear();$('inbox-status').textContent='Sign-in could not load. Reload to try again.';}
