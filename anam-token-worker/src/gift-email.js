export function giftEmail(amount) {
 if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Invalid amount");
 const n = amount.toLocaleString("en-US");
 return {
 subject: "A gift for you from Parallel Vision",
 content: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0c0c0c;color:#eeeae3;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${n} Signal Credits have been added to your account. Your next conversation with Nina awaits.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0c0c0c"><tr><td align="center" style="padding:36px 20px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:520px">
<tr><td style="padding:0 0 26px;border-bottom:1px solid #343434;font-size:13px;line-height:20px;letter-spacing:3px;color:#eeeae3">PARALLEL VISION</td></tr>
<tr><td style="padding:32px 0 12px;font-size:11px;line-height:18px;letter-spacing:2px;color:#aaa69f">NINA FOK &nbsp;/&nbsp; BERLIN 2063</td></tr>
<tr><td><h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:36px;line-height:1.18;font-weight:400;color:#eeeae3">A little more time<br>with Nina.</h1></td></tr>
<tr><td style="padding:28px 0 22px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-left:1px solid #8b8377;padding:0 0 0 18px">
<p style="margin:0;font-size:30px;line-height:38px;font-weight:400;color:#eeeae3">${n}</p>
<p style="margin:3px 0 0;font-size:11px;line-height:18px;letter-spacing:2px;color:#bbb5ac">SIGNAL CREDITS</p>
</td></tr></table>
</td></tr>
<tr><td style="font-size:16px;line-height:26px;color:#c6c1b9">
<p style="margin:0 0 12px">A gift from us, ready in your account.</p>
<p style="margin:0">Sign in with this email address whenever you&rsquo;re ready to talk.</p>
</td></tr>
<tr><td style="padding:28px 0 34px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#eeeae3" style="border:1px solid #eeeae3;text-align:center"><a href="https://parallelvisionlabel.com/nina-project.html" style="display:inline-block;padding:16px 28px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;letter-spacing:1px;font-weight:bold;color:#111111;text-decoration:none">TALK TO NINA</a></td></tr></table>
</td></tr>
<tr><td style="padding:20px 0 0;border-top:1px solid #343434;font-size:12px;line-height:20px;color:#aaa69f">A credit gift confirmation from Parallel Vision.<br><a href="https://parallelvisionlabel.com" style="color:#aaa69f;text-decoration:none">parallelvisionlabel.com</a></td></tr>
</table></td></tr></table>
</body></html>`
 };
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
