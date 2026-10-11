// Browser origins remain allowlisted. Native Clerk session tokens can omit azp.
// A marker is a transport selector, NEVER authorization: authenticate() must also
// verify the JWT signature, issuer, subject, expiry and owner/customer access.
export function allowedLabParty(claims,request,origins){
  if(origins.has(claims.azp))return true;
  if(Object.hasOwn(claims,'azp'))return false;
  return request.headers.get('X-PV-Lab-Client')==='mobile-v1'&&
    origins.has(request.headers.get('Origin'))&&
    /^sess_[A-Za-z0-9]+$/.test(claims.sid||'')&&claims.sts!=='pending';
}
