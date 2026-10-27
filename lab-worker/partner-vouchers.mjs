import {partnerWorkspace,resolveApprovedPartner,partnerConfiguration} from './partner-dashboard.mjs';
import {requireOwner,voucherLink} from './promotions.mjs';
import {referralRoute} from './referrals.mjs';

const one=(env,sql,...args)=>env.LAB_DB.prepare(sql).bind(...args).first();
const all=async(env,sql,...args)=>(await env.LAB_DB.prepare(sql).bind(...args).all()).results||[];
const run=(env,sql,...args)=>env.LAB_DB.prepare(sql).bind(...args).run();
const fail=(status,message)=>{const error=new Error(message);error.status=status;throw error;};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store'}});
async function body(request){
  if(!request.headers.get('content-type')?.startsWith('application/json'))fail(415,'Send JSON.');
  const raw=await request.text();if(raw.length>2048)fail(413,'Request is too large.');
  try{const value=JSON.parse(raw);if(value&&typeof value==='object'&&!Array.isArray(value))return value;}catch{}
  fail(400,'Invalid request.');
}
async function allowance(env,workspace){
  const ISSUER='partner:'+workspace.slug;
  const budget=await one(env,'SELECT credit_limit AS total FROM lab_partner_budgets WHERE workspace=?',workspace.slug);
  const totals=await one(env,`SELECT COALESCE(SUM(credits*redeemed_count),0) AS redeemed,
    COALESCE(SUM(CASE WHEN active=1 AND (expires_at IS NULL OR expires_at>?)
      THEN credits*(max_redemptions-redeemed_count) ELSE 0 END),0) AS reserved
    FROM lab_vouchers WHERE created_by=?`,Date.now(),ISSUER);
  const total=Number(budget?.total||0),redeemed=Number(totals.redeemed),reserved=Number(totals.reserved);
  return {total,redeemed,reserved,available:Math.max(0,total-redeemed-reserved),maxPerInvitation:500};
}
async function referralCode(env,request,subject){
  return (await (await referralRoute(new Request(new URL('/api/customer/referrals',request.url),{headers:request.headers}),env,subject)).json()).code;
}
function invite(env,request,row,code){
  const url=new URL(voucherLink(env,row.code,request.headers.get('Origin')||''));
  url.searchParams.set('ref',code);
  return {...row,url:url.href};
}
export async function partnerVoucherRoute(request,env,actor,{ownerView=false}={}){
  const path=new URL(request.url).pathname;
  const slug=ownerView?path.match(/^\/api\/admin\/partners\/([^/]+)/)?.[1]:null;
  if(ownerView&&!partnerConfiguration(slug))fail(404,'Unknown partner workspace.');
  const base=ownerView?'/api/admin/partners/'+slug:'/api/customer/partner';
  const action=path.slice(base.length);
  if(!['/vouchers','/vouchers/deactivate','/budget'].includes(action))fail(404,'Unknown partner endpoint.');
  if(!['GET','POST'].includes(request.method)||request.method==='GET'&&action!=='/vouchers')fail(405,'Method not allowed.');
  if(action==='/budget'&&!ownerView)fail(403,'Solo el owner puede asignar presupuesto.');
  let subject=actor,workspace;
  if(ownerView){
    await requireOwner(env,actor);
    const partner=await resolveApprovedPartner(env,slug);
    if(!partner)fail(409,'La cuenta de '+partnerConfiguration(slug).workspace.name+' debe iniciar sesión antes de activar sus invitaciones.');
    subject=partner.subject;workspace=partner.access;
  }else{
    workspace=await partnerWorkspace(env,subject,{verify:true});
    if(!workspace)fail(403,'Esta cuenta no tiene acceso a un panel de colaboración.');
  }
  const ISSUER='partner:'+workspace.slug;
  if(request.method==='GET'){
    const rows=await all(env,`SELECT code,credits,max_redemptions AS maxRedemptions,redeemed_count AS redemptionCount,
      active,expires_at AS expiresAt,note,created_at AS createdAt FROM lab_vouchers WHERE created_by=? ORDER BY created_at DESC,code LIMIT 60`,ISSUER);
    const code=await referralCode(env,request,subject);
    const vouchers=rows.map(row=>invite(env,request,row,code));
    const redemptions=await all(env,`SELECT r.voucher_code AS code,v.note,v.credits,r.redeemed_at AS redeemedAt,
      CASE WHEN x.customer_id IS NULL AND p.verified_at IS NOT NULL THEN p.email ELSE NULL END AS email,
      CASE WHEN x.customer_id IS NULL THEN 0 ELSE 1 END AS closed
      FROM lab_voucher_redemptions r JOIN lab_vouchers v ON v.code=r.voucher_code
      LEFT JOIN lab_customer_contacts p ON p.customer_id=r.customer_id
      LEFT JOIN lab_account_closures x ON x.customer_id=r.customer_id
      WHERE v.created_by=? ORDER BY r.redeemed_at DESC,r.voucher_code LIMIT 100`,ISSUER);
    return json({budget:await allowance(env,workspace),vouchers,redemptions,ownerView});
  }
  const data=await body(request);
  if(action==='/budget'){
    if(!Number.isSafeInteger(data.total)||data.total<0||data.total>1000000)fail(400,'El presupuesto debe ser un entero entre 0 y 1.000.000 créditos.');
    try{await run(env,`INSERT INTO lab_partner_budgets(workspace,partner_customer_id,credit_limit,updated_at,updated_by)
      VALUES(?,?,?,?,?) ON CONFLICT(workspace) DO UPDATE SET
      partner_customer_id=excluded.partner_customer_id,credit_limit=excluded.credit_limit,
      updated_at=excluded.updated_at,updated_by=excluded.updated_by`,workspace.slug,subject,data.total,Date.now(),actor);}
    catch(error){if(/already committed/i.test(error.message))fail(409,'El presupuesto debe cubrir los créditos reservados y canjeados.');throw error;}
    return json({budget:await allowance(env,workspace)});
  }
  if(action==='/vouchers/deactivate'){
    if(typeof data.code!=='string'||!/^VT[A-F0-9]{20}$/.test(data.code))fail(400,'Invitación no válida.');
    const result=await run(env,'UPDATE lab_vouchers SET active=0 WHERE code=? AND created_by=? AND active=1',data.code,ISSUER);
    if(!result.meta?.changes)fail(409,'Esta invitación ya está desactivada o no pertenece a '+workspace.name+'.');
    return json({deactivated:true,budget:await allowance(env,workspace)});
  }
  if(!Number.isSafeInteger(data.credits)||data.credits<1||data.credits>500)fail(400,'Elige entre 1 y 500 créditos por invitación.');
  if(!Number.isSafeInteger(data.days)||data.days<1||data.days>30)fail(400,'La invitación debe durar entre 1 y 30 días.');
  if(typeof data.note!=='string'||!data.note.trim()||data.note.trim().length>80)fail(400,'Añade un nombre de campaña de hasta 80 caracteres.');
  if(typeof data.requestId!=='string'||!/^[-a-f0-9]{36}$/i.test(data.requestId))fail(400,'Invalid invitation request.');
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ISSUER+':'+subject+':'+data.requestId));
  const code='VT'+Array.from(new Uint8Array(digest).slice(0,10),b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
  const note=data.note.trim(),createdAt=Date.now(),expiresAt=createdAt+data.days*86400000;
  const existing=()=>one(env,`SELECT code,credits,note,created_at AS createdAt,expires_at AS expiresAt,
    max_redemptions AS maxRedemptions,redeemed_count AS redemptionCount,active FROM lab_vouchers WHERE code=? AND created_by=?`,code,ISSUER);
  let row=await existing(),created=false;
  if(!row){
    try{await run(env,`INSERT INTO lab_vouchers(code,credits,max_redemptions,redeemed_count,active,expires_at,note,created_at,created_by)
      VALUES(?,?,1,0,1,?,?,?,?)`,code,data.credits,expiresAt,note,createdAt,ISSUER);created=true;}
    catch(error){
      if(/budget exceeded/i.test(error.message))fail(409,'No hay suficientes créditos disponibles. Pide al owner que amplíe el presupuesto.');
      if(!/unique constraint/i.test(error.message))throw error;
    }
    row=await existing();
  }
  if(!row)fail(503,'No pudimos crear la invitación. Inténtalo de nuevo.');
  if(row.credits!==data.credits||row.note!==note||row.expiresAt-row.createdAt!==data.days*86400000)
    fail(409,'Esta solicitud ya se usó con otros datos. Actualiza el formulario.');
  return json({voucher:invite(env,request,row,await referralCode(env,request,subject)),budget:await allowance(env,workspace)},created?201:200);
}
