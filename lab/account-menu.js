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
  // All menu surfaces share these links. Only a verified owner session reveals the dashboard.
  const panel=root.querySelector('.pv-account-panel'),settings=panel?.querySelector('a[href$="#settings"]');
  // Match the approved landing menu's first action on every signed-in page.
  if(!panel.querySelector(':scope > a[href="./account.html"]')){
    const accountLink=document.createElement('a');
    accountLink.href='./account.html';accountLink.textContent='My account';
    const firstAction=panel.querySelector(':scope > a, :scope > button');
    if(firstAction)firstAction.before(accountLink);else panel.append(accountLink);
  }
  const voucherLink=document.createElement('a'),adminLink=document.createElement('a'),agencyLink=document.createElement('a');
  voucherLink.href='./account.html#voucher';voucherLink.textContent='Redeem voucher';voucherLink.dataset.accountVouchers='';voucherLink.hidden=true;
  adminLink.href='./owner.html';adminLink.textContent='Owner dashboard';adminLink.dataset.accountAdmin='';adminLink.hidden=true;
  agencyLink.href='https://parallelvisionlabel.com/agency/';agencyLink.textContent='Agency preview ↗';agencyLink.dataset.accountAgency='';agencyLink.hidden=true;
  const partnerLink=document.createElement('a');
  partnerLink.href='./vitolas-studio.html';partnerLink.textContent='Vitolas Studio';partnerLink.dataset.accountPartner='';partnerLink.hidden=true;
  // Keep the established wordmark. Add an authenticated identity row and quiet navigation icons.
  if(settings){settings.before(voucherLink);settings.after(adminLink);adminLink.after(agencyLink);}else if(panel)panel.append(voucherLink,adminLink,agencyLink);
  adminLink.before(partnerLink);
  const identityRow=document.createElement('div');
  identityRow.className='pv-account-identity';
  identityRow.hidden=true;
  const identityAvatar=document.createElement('span');
  identityAvatar.className='pv-account-identity-avatar';
  identityAvatar.setAttribute('aria-hidden','true');
  const identityCopy=document.createElement('span');
  identityCopy.className='pv-account-identity-copy';
  const identityName=document.createElement('strong'),identityRole=document.createElement('small');
  identityCopy.append(identityName,identityRole);
  identityRow.append(identityAvatar,identityCopy);
  panel.querySelector('.pv-account-details')?.after(identityRow);

  // Trusted static SVG paths; existing links, click handlers and permission gates remain unchanged.
  const iconPaths={
    account:'<circle cx="12" cy="8" r="4"/><path d="M4 20v-2a8 8 0 0 1 16 0v2"/>',
    wallet:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18m-13 5h5"/>',
    moods:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    invite:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m4-12v8m-4-4h8"/>',
    voucher:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 5v14"/>',
    owner:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 16v-4m5 4V7m5 9v-6"/>',
    agency:'<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18m-13 5h8m-8 3h5"/>',
    settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2.5"/><circle cx="15" cy="17" r="2.5"/>',
    connection:'<path d="M8 3v5m8-5v5M5 8h14v3a7 7 0 0 1-14 0zm7 10v3"/>',
    signout:'<path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5m4-4 4-4-4-4m-8 4h12"/>'
  };
  for(const item of panel.querySelectorAll(':scope > a, :scope > button')){
    const href=item.getAttribute('href')||'';
    const kind=item.hasAttribute('data-account-signout')?'signout':
      item.hasAttribute('data-account-agency')?'agency':
      item.hasAttribute('data-account-admin')||item.hasAttribute('data-account-partner')?'owner':
      item.hasAttribute('data-account-vouchers')?'voucher':
      item.hasAttribute('data-account-referrals')?'invite':
      item.hasAttribute('data-account-connection')?'connection':
      href.includes('#settings')?'settings':
      href.includes('#balance')||href.includes('#billing')||href==='#pricing'?'wallet':
      href.includes('mood-creator')?'moods':'account';
    const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
    icon.classList.add('pv-account-menu-icon');
    icon.setAttribute('viewBox','0 0 24 24');
    icon.setAttribute('aria-hidden','true');
    icon.setAttribute('focusable','false');
    icon.setAttribute('fill','none');
    icon.innerHTML=iconPaths[kind];
    if(kind==='signout')item.append(icon);else item.prepend(icon);
  }
  let currentProfile=null;
  function close(restore=false){root.open=false;if(restore)summary.focus();}
  document.addEventListener('pointerdown',event=>{if(root.open&&!root.contains(event.target))close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&root.open)close(true);});
  root.addEventListener('click',event=>{if(event.target.closest('a,button'))close();});
  // Position with the avatar, then align the panel to the viewport's right edge.
  function positionPanel(){
    const anchor=summary.getBoundingClientRect();
    const gap=window.matchMedia('(max-width:900px)').matches?14:24;
    const top=Math.max(8,Math.min(Math.round(anchor.bottom+gap),window.innerHeight-90));
    panel.style.setProperty('--pv-account-menu-top',top+'px');
    // Studio reserves a stable scrollbar gutter. Measure the actual visible
    // edge so the dropdown has the same 24px/14px gap on every page.
    const edge=window.matchMedia('(max-width:480px)').matches?14:24;
    panel.style.right=edge+'px';
    if(root.open){
      const visibleGap=window.innerWidth-panel.getBoundingClientRect().right;
      if(Math.abs(visibleGap-edge)>.5)
        panel.style.right=Math.round(2*edge-visibleGap)+'px';
    }
  }
  summary.addEventListener('pointerdown',positionPanel);
  root.addEventListener('toggle',()=>{
    summary.setAttribute('aria-expanded',String(root.open));
    if(root.open)positionPanel();
  });
  window.addEventListener('resize',()=>{if(root.open)positionPanel();},{passive:true});
  document.addEventListener('scroll',()=>{if(root.open)positionPanel();},{capture:true,passive:true});
  function updateBalance(value){
    if(!currentProfile?.customer)return;
    root.querySelector('[data-account-balance]').textContent=currentProfile.accountClosed?'Account closed':Number.isSafeInteger(value)?value.toLocaleString()+' credits':'Balance unavailable';
  }
  function update({signed=false,user=null,profile=null}={}){
    currentProfile=profile;root.hidden=!signed;
    const partner={
      'vitolas-studio':{name:'Vitolas Studio',href:'./vitolas-studio.html'},
      'bellini-studio':{name:'Bellini Studios',href:'./bellini-studio.html'},
      'robin-studio':{name:'Robin / König Media',href:'./robin-studio.html'}
    }[profile?.partnerDashboard?.slug];
    partnerLink.hidden=!(signed&&profile?.customer&&!profile.accountClosed&&partner);
    partnerLink.href=partner?.href||'#';
    // Keep the existing icon while replacing only the workspace label.
    for(const node of [...partnerLink.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();
    partnerLink.append(document.createTextNode(partner?.name||''));
    if(!signed){close();voucherLink.hidden=true;adminLink.hidden=true;agencyLink.hidden=true;identityRow.hidden=true;identityAvatar.replaceChildren();delete identityAvatar.dataset.identity;avatar.replaceChildren();delete avatar.dataset.identity;root.querySelector('[data-account-name]').textContent='';root.querySelector('[data-account-balance]').textContent='';return;}
    const identity=accountIdentity(user);
    identityRow.hidden=false;
    identityName.textContent=identity.name;
    identityRole.textContent=profile?.owner===true?'Owner account':profile?.customer?'Creator account':'Your workspace';
    if(identityAvatar.dataset.identity!==identity.initials+identity.image){
      identityAvatar.dataset.identity=identity.initials+identity.image;
      identityAvatar.textContent=identity.initials;
      if(identity.image){
        const photo=document.createElement('img');
        photo.alt='';photo.src=identity.image;photo.referrerPolicy='no-referrer';
        photo.addEventListener('error',()=>photo.remove());
        identityAvatar.append(photo);
      }
    }
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
    voucherLink.hidden=!profile?.customer||!!profile?.accountClosed;
    adminLink.hidden=profile?.owner!==true;
    agencyLink.hidden=profile?.owner!==true;
    const connection=root.querySelector('[data-account-connection]');if(connection)connection.hidden=!profile||!!profile.customer;
  }
  return {update,updateBalance};
}
