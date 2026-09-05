
export function giftEmail(amount) {
 if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Invalid amount");
 const n = amount.toLocaleString("en-US");
 return {subject:n+" Signal Credits, courtesy of Parallel Vision",
 content:`<html><body style="margin:0;background:#080808;color:#eee;font-family:Arial,sans-serif"><table role="presentation" width="100%" bgcolor="#080808" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 22px"><table role="presentation" width="100%" style="max-width:520px;color:#eee"><tr><td style="font-size:16px;letter-spacing:4px;padding-bottom:30px;border-bottom:1px solid #444">PARALLEL VISION</td></tr><tr><td style="padding-top:28px"><h1 style="font-size:28px;font-weight:400">A gift from Parallel Vision</h1><p style="font-size:18px;line-height:1.6">You’ve received <strong>${n} Signal Credits</strong>, courtesy of Parallel Vision.</p><p style="font-size:16px;line-height:1.6;color:#ccc">Your credits are already in your account. Sign in with this email address to use them.</p><p style="padding:20px 0"><a href="https://parallelvisionlabel.com/nina-project.html" style="display:inline-block;background:#eee;color:#080808;padding:18px 26px;text-decoration:none;font-size:16px;font-weight:bold">TALK TO NINA</a></p><p style="font-size:12px;color:#aaa">Nina FOK / Berlin 2063<br>This email confirms a gift to your Parallel Vision account.</p></td></tr></table></td></tr></table></body></html>`};
}
let token, expires=0, key="";
async function getToken(env){
 const next=env.ZOHO_CLIENT_ID+env.ZOHO_REFRESH_TOKEN;
 if(token && next===key && Date.now()<expires) return token;
 const r=await fetch("https://accounts.zoho.eu/oauth/v2/token",{method:"POST",signal:AbortSignal.timeout(8000),body:new URLSearchParams({grant_type:"refresh_token",client_id:env.ZOHO_CLIENT_ID,client_secret:env.ZOHO_CLIENT_SECRET,refresh_token:env.ZOHO_REFRESH_TOKEN})});
 const data=await r.json();
 if(!r.ok || !data.access_token) throw Error("Email authorization failed");
 key=next;token=data.access_token;expires=Date.now()+3000000;return token;
}
export async function sendGiftEmail(env, recipient, grant){
 if(!["ZOHO_CLIENT_ID","ZOHO_CLIENT_SECRET","ZOHO_REFRESH_TOKEN","ZOHO_ACCOUNT_ID","ZOHO_FROM_ADDRESS"].every(k=>env[k])) return {status:"not_configured"};
 if(!recipient.email || /[\r\n,;]/.test(recipient.email) || !recipient.email.includes("@")) return {status:"missing_email"};
 let submitted=false;
 try{
 const access=await getToken(env);
 const claim=await env.NINA_MEMORY_DB.prepare("INSERT OR IGNORE INTO credit_gift_emails (grant_id,status,updated_at) VALUES (?, 'sending', ?)").bind(grant.id,new Date().toISOString()).run();
 if(Number(claim.meta?.changes || 0)!==1){
 const row=await env.NINA_MEMORY_DB.prepare("SELECT status FROM credit_gift_emails WHERE grant_id = ?").bind(grant.id).first();
 return {status:row?.status || "unknown"};
 }
 submitted=true;
 const message=giftEmail(grant.amount);
 const r=await fetch("https://mail.zoho.eu/api/accounts/"+encodeURIComponent(env.ZOHO_ACCOUNT_ID)+"/messages",{method:"POST",signal:AbortSignal.timeout(8000),headers:{"Authorization":"Zoho-oauthtoken "+access,"Content-Type":"application/json"},body:JSON.stringify({fromAddress:env.ZOHO_FROM_ADDRESS,toAddress:recipient.email,...message,mailFormat:"html"})});
 const result=await r.json();
 const status=r.ok && Number(result.status?.code)===200 ? "sent":"failed";
 await env.NINA_MEMORY_DB.prepare("UPDATE credit_gift_emails SET status = ?, updated_at = ? WHERE grant_id = ?").bind(status,new Date().toISOString(),grant.id).run();
 return {status};
 }catch{
 if(submitted){try{await env.NINA_MEMORY_DB.prepare("UPDATE credit_gift_emails SET status = 'unknown', updated_at = ? WHERE grant_id = ?").bind(new Date().toISOString(),grant.id).run();}catch{}}
 return {status:submitted?"unknown":"failed"};
 }
}
