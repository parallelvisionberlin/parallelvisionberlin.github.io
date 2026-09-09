import { verifyClerkSessionToken } from '../../anam-token-worker/src/auth.js';
import { readDb } from './data.js';
export const SCOPE = 'nina.audit.read';
export const SITE = 'https://parallelvisionlabel.com';
export const AUDIT = 'https://parallel-vision-nina-audit.parallelvision.workers.dev';
const CLIENT_HOSTS = new Set(['chatgpt.com','chat.openai.com','platform.openai.com']);
export function approvedCallback(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && CLIENT_HOSTS.has(u.hostname) && (!u.port || u.port === '443'); }
  catch { return false; }
}
export function response(body, status = 200, origin = '') {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
  if (origin === SITE) {
    headers['Access-Control-Allow-Origin'] = SITE;
    headers['Vary'] = 'Origin';
    headers['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
  }
  return new Response(body === null ? null : JSON.stringify(body), { status, headers });
}
export async function boundedJson(request, maxBytes = 16384) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new Error('json_required');
  if (Number(request.headers.get('content-length') || 0) > maxBytes) throw new Error('body_too_large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('json_required');
  const chunks = []; let length = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    length += value.byteLength;
    if (length > maxBytes) { await reader.cancel(); throw new Error('body_too_large'); }
    chunks.push(value);
  }
  const joined = new Uint8Array(length); let at = 0;
  for (const chunk of chunks) { joined.set(chunk, at); at += chunk.length; }
  const parsed = JSON.parse(new TextDecoder().decode(joined));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('object_required');
  return parsed;
}
export async function ownerFromClerk(env, request) {
  if (request.headers.get('Origin') !== SITE) return null;
  const match = /^Bearer ([^\s]+)$/.exec(request.headers.get('Authorization') || '');
  if (!match) return null;
  let claims;
  try { claims = await verifyClerkSessionToken(env, match[1], SITE); } catch { return null; }
  if (!claims) return null;
  const owner = await readDb(env).prepare("SELECT id,auth_subject,role FROM users WHERE auth_provider='clerk' AND auth_subject=? AND role='owner' LIMIT 1").bind(claims.sub).first();
  return owner || null;
}
export async function validGrantOwner(env, props) {
  if (env.AUDIT_ENABLED !== 'true' || props?.scope !== SCOPE || typeof props?.userId !== 'string' || typeof props?.subject !== 'string') return false;
  const owner = await readDb(env).prepare("SELECT id FROM users WHERE id=? AND auth_subject=? AND auth_provider='clerk' AND role='owner' LIMIT 1").bind(props.userId,props.subject).first();
  return Boolean(owner);
}
function nonce() { return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join(''); }
async function pending(env, id) {
  if (typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id)) throw new Error('invalid_request');
  const record = await env.OAUTH_KV.get('nina:pending:' + id, 'json');
  if (!record || record.expiresAt < Date.now()) throw new Error('request_expired');
  const auth = await env.OAUTH_PROVIDER.parseAuthRequest(new Request(record.url));
  if (!approvedCallback(auth.redirectUri)) throw new Error('invalid_callback');
  return auth;
}
export async function handleConsent(request, env) {
  const url = new URL(request.url), origin = request.headers.get('Origin') || '';
  if (url.pathname === '/health') return response({ service: 'Nina read-only audit connector', enabled: env.AUDIT_ENABLED === 'true', revision: 'nina-read-20260909' });
  if (url.pathname.startsWith('/connect/') && request.method === 'OPTIONS') return origin === SITE ? response(null,204,origin) : response({ error:'Forbidden' },403);
  if (env.AUDIT_ENABLED !== 'true') return response({ error:'Connector disabled' },503,origin);
  if (url.pathname === '/authorize' && request.method === 'GET') {
    try {
      const auth = await env.OAUTH_PROVIDER.parseAuthRequest(request);
      if (!approvedCallback(auth.redirectUri) || url.searchParams.get('code_challenge_method') !== 'S256'
        || !/^[A-Za-z0-9_-]{43}$/.test(url.searchParams.get('code_challenge') || '')
        || auth.scope.some(s=>s !== SCOPE)) return response({ error:'Only a PKCE-protected ChatGPT read connection is allowed.' },400);
      const id = nonce();
      await env.OAUTH_KV.put('nina:pending:' + id, JSON.stringify({ url: request.url, expiresAt: Date.now() + 600000 }), { expirationTtl:600 });
      return new Response(null,{ status:302, headers:{ Location:`${SITE}/nina-audit-connect/#${id}`, 'Cache-Control':'no-store','Referrer-Policy':'no-referrer' } });
    } catch { return response({ error:'Invalid or expired connection request.' },400); }
  }
  if (!url.pathname.startsWith('/connect/') || request.method !== 'POST') return response({ error:'Not found' },404,origin);
  const owner = await ownerFromClerk(env,request);
  if (!owner) return response({ error:'Only the signed-in Nina owner may authorize this connection.' },403,origin);
  let input;
  try { input = await boundedJson(request); } catch { return response({ error:'Invalid request.' },400,origin); }
  try {
    if (url.pathname === '/connect/grants') {
      const result = await env.OAUTH_PROVIDER.listUserGrants(owner.id,{limit:100});
      return response({ grants:result.items.map(g=>({id:g.id,scope:g.scope,createdAt:g.createdAt})), cursor:result.cursor || null },200,origin);
    }
    if (url.pathname === '/connect/revoke') {
      if (typeof input.grantId !== 'string' || !/^[a-zA-Z0-9_-]{1,200}$/.test(input.grantId)) throw new Error('invalid_grant');
      await env.OAUTH_PROVIDER.revokeGrant(input.grantId,owner.id);
      return response({ revoked:true },200,origin);
    }
    const auth = await pending(env,input.request);
    if (url.pathname === '/connect/inspect') {
      const client = await env.OAUTH_PROVIDER.lookupClient(auth.clientId);
      return response({ clientName:client?.clientName || 'ChatGPT', callback: new URL(auth.redirectUri).origin, scope:SCOPE },200,origin);
    }
    if (url.pathname !== '/connect/approve' || input.consent !== true) return response({ error:'Explicit approval is required.' },400,origin);
    const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({ request:auth, userId:owner.id,
      metadata:{ clientName:'Nina read-only analysis connection' }, scope:[SCOPE],
      props:{ userId:owner.id, subject:owner.auth_subject, scope:SCOPE }
    });
    await env.OAUTH_KV.delete('nina:pending:' + input.request);
    return response({ redirectTo },200,origin);
  } catch { return response({ error:'Connection request expired or could not be completed. Start the connection again.' },400,origin); }
}
