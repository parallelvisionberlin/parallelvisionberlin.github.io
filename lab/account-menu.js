// Shared presentation only. Authentication and balances come from the existing session API.
export function accountIdentity(user) {
  const email=user?.primaryEmailAddress?.emailAddress||'';
  const name=user?.fullName||[user?.firstName,user?.lastName].filter(Boolean).join(' ')||user?.username||email.split('@')[0]||'Your account';
  const parts=name.trim().split(/\s+/);
  const initials=(parts.length>1?parts[0][0]+parts.at(-1)[0]:parts[0].slice(0,2)).toUpperCase();
  let image='';
  try { const url=new URL(user?.imageUrl);if(user?.hasImage&&url.protocol==='https:'&&!url.username&&!url.password)image=url.href; } catch {}
  return {name,email,initials,image};
}
export function referralsAvailable(profile) {
  return !!(profile?.customer&&profile.billingReady&&profile.generationReady&&!profile.pilot&&!profile.accountClosed&&!profile.billingReview);
}
export function createAccountMenu(root) {
  if(!root)return {update(){},updateBalance(){}};
  const summary=root.querySelector('summary'),avatar=root.querySelector('[data-account-avatar]');
  let currentProfile=null;
  function close(restore=false){root.open=false;if(restore)summary.focus();}
  document.addEventListener('pointerdown',event=>{if(root.open&&!root.contains(event.target))close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&root.open)close(true);});
  root.addEventListener('click',event=>{if(event.target.closest('a,button'))close();});
  root.addEventListener('toggle',()=>summary.setAttribute('aria-expanded',String(root.open)));
  function updateBalance(value){
    if(!currentProfile?.customer)return;
    root.querySelector('[data-account-balance]').textContent=Number.isSafeInteger(value)?value.toLocaleString()+' credits':'Balance unavailable';
  }
  function update({signed=false,user=null,profile=null}={}){
    currentProfile=profile;root.hidden=!signed;
    if(!signed){close();avatar.replaceChildren();delete avatar.dataset.identity;root.querySelector('[data-account-name]').textContent='';root.querySelector('[data-account-balance]').textContent='';return;}
    const identity=accountIdentity(user);
    root.querySelector('[data-account-name]').textContent=identity.name;
    summary.setAttribute('aria-label','Account: '+identity.name);
    summary.title='My account';
    if(avatar.dataset.identity!==identity.initials+identity.image){
      avatar.dataset.identity=identity.initials+identity.image;avatar.textContent=identity.initials;
      if(identity.image){const img=document.createElement('img');img.alt='';img.src=identity.image;img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.remove());avatar.append(img);}
    }
    root.querySelector('[data-account-balance]').textContent=profile?(profile.customer?'':'Owner workspace'):'Account unavailable';
    updateBalance(profile?.balanceCredits);
    root.querySelector('[data-account-referrals]').hidden=!referralsAvailable(profile);
    const connection=root.querySelector('[data-account-connection]');if(connection)connection.hidden=!profile||!!profile.customer;
  }
  return {update,updateBalance};
}
