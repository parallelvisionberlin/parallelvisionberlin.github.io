// PV LAB owner dashboard: auth state changes are not the same as identity changes.
// Clerk emits updates for token renewal, focus, and user object changes. Those
// must NEVER unmount the private dashboard or close an active review dialog.
export function createOwnerAuthGuard({getClerk,onIdentityChange}){
  if(typeof getClerk!=='function'||typeof onIdentityChange!=='function')
    throw new TypeError('Owner auth guard requires a Clerk getter and an identity-change handler.');
  let lastIdentity=null;
  return function syncOwnerIdentity(){
    const clerk=getClerk();
    // The signed-out transition must still clear the private dashboard.
    const signed=clerk?.isSignedIn===true;
    let nextIdentity='signed-out';
    if(signed){
      const userId=clerk.user?.id,sessionId=clerk.session?.id;
      // During silent token renewal these may be temporarily unavailable.
      // Do not mistake that for a different user or unmount the workspace.
      if(typeof userId!=='string'||!userId||
         typeof sessionId!=='string'||!sessionId)return false;
      nextIdentity='signed-in:'+userId+':'+sessionId;
    }
    if(nextIdentity===lastIdentity)return false;
    lastIdentity=nextIdentity;
    onIdentityChange();
    return true;
  };
}
