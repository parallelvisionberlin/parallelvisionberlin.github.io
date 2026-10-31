import {takeModelPhoto} from './editorial-model-handoff.js?v=20261031-model-upload1';
import {loadLabAccount} from './native-account.js?v=20261014-native-photo-picker1';
import {createSessionRequest} from './session-request.js?v=20261015-canonical-studio1';

const API='https://parallel-vision-lab.parallelvision.workers.dev';
const $=id=>document.getElementById(id);
const request=createSessionRequest({baseUrl:API,getSession:()=>clerk?.session});
const activeStates=new Set(['submitting','queued','running','saving']);
const mockupUrl='https://d2ol7oe51mr4n9.cloudfront.net/user_36QWljeNVgnwNMkZtgtVQjVUBoW/d6c51742-8079-4412-a063-25ed134cec95.png';
const directionSets={
 moods:[
 {id:'studio',name:'Studio Fashion',image:'./mood-previews/hd/fashion-editorial-20261011.jpg',prompt:'A restrained studio fashion editorial, sculptural tailoring, believable materials, precise photographic lighting.'},
 {id:'hongkong',name:'Hong Kong Nights',image:'./mood-references/hong-kong-nights/supervalu.jpg',prompt:'Moody nocturnal city atmosphere, wet natural reflections, deep shadows, restrained cinematic halation, no neon clichés.'},
 {id:'industrial',name:'Industrial',image:'./visuals/fashion-replace/hero-model-oct24.jpg',prompt:'Industrial concrete architecture, dark editorial contrast, real atmospheric depth, textured surfaces and cinematic photography.'},
 {id:'sumi',name:'Japanese Sumi-e',image:'./mood-previews/hd/japanese-sumi-e-20261011.jpg',prompt:'Minimal ink wash influence, Yohji Yamamoto-inspired draping, neutral washi texture, realism with generous negative space.'},
 {id:'dreamblur',name:'Dream Blur',image:'./mood-previews/dream-blur-cover-20261024.webp',prompt:'Soft natural lens diffusion and gentle halation with believable faces and tactile analogue detail.'},
 {id:'fisheye',name:'Fish Eye 2000',image:'./mood-references/fisheye-2000/01-analog-daylight.webp',prompt:'Optical fisheye lens, direct flash, grounded early-2000s street fashion styling, realistic skin and materials.'}
 ],
 location:[
 {id:'industrial-room',name:'Industrial interior',image:'./visuals/fashion-replace/hero-model-oct24.jpg',prompt:'Concrete loft interior, weathered structural surfaces and natural urban light.'},
 {id:'night-street',name:'Night street',image:'./mood-previews/hd/90s-cinema-clean-final-20261011.jpg',prompt:'Night street with practical ambient lighting, reflective asphalt and natural perspective.'},
 {id:'studio-wall',name:'Studio set',image:'./visuals/studio-tools/image-ivory-suit.webp',prompt:'Neutral fashion studio, architectural shadows, purposeful controlled lighting.'}
 ],
 material:[
 {id:'leather',name:'Black leather',image:'./visuals/fashion-replace/hero-model-oct24.jpg',prompt:'Tactile genuine leather, hand-stitched details, naturally creasing fabric.'},
 {id:'chrome',name:'Chrome & glass',image:'./visuals/studio-tools/video-liquid-dress.webp',prompt:'Physically plausible sculptural chrome and translucent glass integrated into real fashion.'},
 {id:'tailoring',name:'Tailoring',image:'./visuals/studio-tools/image-ivory-suit.webp',prompt:'Architectural tailoring, precise seams, weighty fabric draping.'}
 ]
};
directionSets.location=[
 {id:'studio-set',name:'Studio',image:'./visuals/studio-tools/image-ivory-suit.webp',prompt:'Fashion studio, controlled natural-light set, neutral architecture and believable shadows.'},
 {id:'brutalist',name:'Brutalist',image:'./visuals/fashion-replace/hero-model-oct24.jpg',prompt:'Monumental concrete architecture, real spatial depth, weathered surfaces and directional light.'},
 {id:'desert',name:'Desert',image:'https://d2ol7oe51mr4n9.cloudfront.net/user_36QWljeNVgnwNMkZtgtVQjVUBoW/6b5a3dd5-7d0e-46df-bd99-a1dbeb9c010a.png',prompt:'Natural desert terrain, sculptural architectural intervention, warm dust and photographic sunlight.'},
 {id:'industrial-interior',name:'Interior',image:'./visuals/character-casting/ivory-cast03.webp',prompt:'Industrial interior with plausible structural concrete, quiet shadows and real atmospheric scale.'},
 {id:'abstract-space',name:'Abstract',image:'./visuals/studio-tools/video-liquid-dress.webp',prompt:'Minimal abstract installation of tangible sculptural materials in a grounded photographic environment.'},
 {id:'urban',name:'Urban',image:'./mood-previews/hd/90s-cinema-clean-final-20261011.jpg',prompt:'Contemporary urban environment with natural perspective, lived-in details and credible architectural light.'}
];
let clerk=null,profile=null,sessionKey='',epoch=0,step=0,directionTab='location',selectedDirections={location:null,moods:null,material:null};
let chosenCount=4,chosenRatio='3:4',castMode='auto',castComposition='mixed',quote=null,quoteBusy=false,quoteError=false,quoteTimer=null,quoteExpiryTimer=null,submitting=false,uncertain=false,pollTimeout=null;
let files={model:[],outfit:[],location:[]},savedRefs={model:[],outfit:[],location:[]},uploaded=new Map(),results=[],targetCount=4,activeJobs=[],revision=0,progressBatchStart=0,progressBatchSize=4;
const objectUrls=new Map(),sampleFiles=new Map();
const nameFor = (file)=>file?.name?.slice(0,120)||'Reference';
function effectiveCastMode(){
 const count=files.model.length+savedRefs.model.length;
 if(count<2)return 'one';
 if(castMode!=='auto')return castMode;
 const examples=Array.from(sampleFiles.entries()).filter(([b,f])=>b.dataset.sampleKind==='model'&&files.model.includes(f)).length;
 return examples>1?'cast':'one';
}
function renderCastingControls(){
 const count=files.model.length+savedRefs.model.length;
 const region=$('editorial-casting-controls'),composition=$('editorial-cast-composition');
 if(!region||!composition)return;
 region.hidden=count<2;
 const mode=effectiveCastMode();
 $('editorial-cast-mode').value=mode;
 composition.hidden=mode!=='cast'||count<2;
 $('editorial-cast-composition-select').value=castComposition;
}
const status=(text='',error=false)=>{$('editorial-status').textContent=text;$('editorial-status').classList.toggle('error',error)};
function preview(file){if(!objectUrls.has(file))objectUrls.set(file,URL.createObjectURL(file));return objectUrls.get(file);}
function pruneFile(file){const url=objectUrls.get(file);if(url){URL.revokeObjectURL(url);objectUrls.delete(file)} uploaded.delete(file);}
function wipeResults(){for(const r of results)if(r.url)URL.revokeObjectURL(r.url);results=[];activeJobs=[];progressBatchStart=0;progressBatchSize=4;renderResults();}
function resetAll(){invalidateQuote();clearTimeout(pollTimeout);submitting=false;uncertain=false;wipeResults();
 for(const collection of Object.values(files))collection.forEach(pruneFile);files={model:[],outfit:[],location:[]};sampleFiles.clear();for(const ref of Object.values(savedRefs).flat())if(ref.url)URL.revokeObjectURL(ref.url);savedRefs={model:[],outfit:[],location:[]};
 for(const id of ['styling-direction','location-direction','editorial-prompt'])$(id).value='';
 $('identity-guide').value='80';$('garment-guide').value='70';$('mood-guide').value='60';
 chosenCount=4;chosenRatio='3:4';castMode='auto';castComposition='mixed';selectedDirections={location:null,moods:null,material:null};directionTab='location';for(const id of ['editorial-time','editorial-atmosphere','editorial-palette'])$(id).selectedIndex=0;
 for(const input of ['model-files','outfit-files','location-files'])$(input).value='';
 renderFiles();renderDirections();updateOptions();refreshSliderLabels();go(0);status('');
}
function go(next){step=next;const panels=['model','style','mood','generate','progress','results'];
 for(let i=0;i<panels.length;i++)$('panel-'+panels[i]).hidden=i!==Math.max(0,next-1);
 $('editorial-hero').hidden=next!==0;$('editorial-flow').hidden=next===0;
 document.body.classList.toggle('editorial-is-generating',next===5);
 const navigation=$('stage-navigation'),stage=$('panel-'+panels[Math.max(0,next-1)])?.querySelector('.stage-visual');
 if(stage)stage.append(navigation);else document.querySelector('.flow-main').prepend(navigation);
 $('step-footer').hidden=next>=5||next<=0;
 $('progress-title').textContent=next>=1&&next<=4?'STEP '+next+' / 4':next===5?'GENERATING':next===6?'YOUR EDITORIAL':'GET STARTED';
 $('step-indicator').style.width=Math.min(100,Math.max(25,(next>=5?4:next)*25))+'%';
 for(const item of document.querySelectorAll('[data-flow-step]')){
  const index=Number(item.dataset.flowStep),current=next>=5?4:next;
  item.classList.toggle('is-current',index===current);
  item.classList.toggle('is-complete',index<current);
  if(index===current)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');
 }
 $('step-next').hidden=next===4;
 $('step-next').textContent=({1:'Continue to styling',2:'Continue to location',3:'Continue to review'}[next]||'Next');
 invalidateQuote();updateGenerationMotion();
 if(next===4)updateSeriesSummary();
 if(next===0){window.scrollTo({top:0,left:0,behavior:'instant'});document.getElementById('editorial-hero').scrollIntoView({block:'start',behavior:'instant'});}else{document.getElementById('editorial-flow').scrollIntoView({block:'start',behavior:'instant'});}
}
function updateOptions(){for(const b of $('count-options').querySelectorAll('button'))b.classList.toggle('is-selected',Number(b.dataset.count)===chosenCount);
 for(const b of $('ratio-options').querySelectorAll('button'))b.classList.toggle('is-selected',b.dataset.ratio===chosenRatio);}
function refreshSliderLabels(){for(const [input,id] of [['identity-guide','identity-value'],['garment-guide','garment-value'],['mood-guide','mood-value']])$(id).value=$(input).value+'%'}
function renderFiles(){
 for(const [kind,id] of [['model','model-thumbs'],['outfit','outfit-thumbs'],['location','location-thumbs']]){
  const box=$(id);box.replaceChildren();
  for(const file of files[kind]){const item=document.createElement('div');item.className='thumb';
    const img=document.createElement('img');img.src=preview(file);img.alt=nameFor(file);item.append(img);
    const remove=document.createElement('button');remove.type='button';remove.setAttribute('aria-label','Remove '+nameFor(file));remove.textContent='×';remove.addEventListener('click',()=>{if(submitting)return;files[kind]=files[kind].filter(f=>f!==file);pruneFile(file);invalidateQuote();renderFiles();});item.append(remove);box.append(item);}
  for(const ref of savedRefs[kind]){const item=document.createElement('div');item.className='thumb saved-thumb';const img=document.createElement('img');img.alt=ref.name;img.src=ref.url||'./visuals/studio-tools/image-ivory-suit.webp';item.append(img);const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Remove saved '+ref.name);remove.addEventListener('click',()=>{if(submitting)return;savedRefs[kind]=savedRefs[kind].filter(r=>r!==ref);if(ref.url)URL.revokeObjectURL(ref.url);invalidateQuote();renderFiles()});item.append(remove);const badge=document.createElement('small');badge.className='saved-badge';badge.textContent='ELEMENT';item.append(badge);box.append(item);}
 }
 renderCastingControls();
 updateSeriesSummary();
 refreshSampleStates();
}
function addFiles(kind,list){if(submitting)return;
 const incoming=Array.from(list||[]);const limit={model:4,outfit:3,location:2}[kind];
 const accept=incoming.filter(file=>['image/jpeg','image/png','image/webp'].includes(file.type)&&file.size<=20*1024*1024&&file.size>0);
 if(accept.length!==incoming.length){status('Use JPG, PNG or WebP photographs under 20 MB each.',true)}
 const used=Object.values(files).reduce((n,part)=>n+part.length,0)+Object.values(savedRefs).reduce((n,part)=>n+part.length,0);
 const allowed=Math.min(Math.max(0,limit-files[kind].length-savedRefs[kind].length),Math.max(0,10-used));
 files[kind].push(...accept.slice(0,allowed));
 if(accept.length>allowed)status('Reference limit reached. Keep up to 4 model, 3 garment and 2 location images.',true);
 invalidateQuote();renderFiles();
}
function updateSeriesSummary(){
 const model=$('review-model-text');if(!model)return;
 const source=kind=>files[kind][0]?preview(files[kind][0]):savedRefs[kind][0]?.url||null;
 function showImage(id,url){
  const el=$(id);if(!el)return;el.replaceChildren();
  if(url){const img=document.createElement('img');img.src=url;img.alt='';el.append(img)}
  else{const span=document.createElement('span');span.textContent='+';el.append(span)}
 }
 const count=kind=>files[kind].length+savedRefs[kind].length;
 showImage('review-model-thumb',source('model'));
 model.textContent=count('model')?(effectiveCastMode()==='cast'?count('model')+' distinct models':count('model')+' model photograph'+(count('model')===1?'':'s')):'No model selected';
 showImage('review-outfit-thumb',source('outfit'));
 $('review-outfit-text').textContent=count('outfit')?count('outfit')+' wardrobe reference'+(count('outfit')===1?'':'s'):$('styling-direction').value.trim()?'Described wardrobe':'No wardrobe selected';
 const picks=Object.entries(selectedDirections).map(([k,id])=>directionSets[k].find(d=>d.id===id)).filter(Boolean);
 showImage('review-location-thumb',source('location')||picks[0]?.image||null);
 $('review-location-text').textContent=picks.length?picks.map(d=>d.name).join(' / '):count('location')?count('location')+' uploaded location reference'+(count('location')===1?'':'s'):$('location-direction').value.trim()?'Custom location direction':'Unspecified / natural';
}
function refreshSampleStates(){
 for(const button of document.querySelectorAll('[data-sample-kind]')){
  const file=sampleFiles.get(button),active=Boolean(file&&files[button.dataset.sampleKind]?.includes(file));
  button.classList.toggle('is-selected',active);button.setAttribute('aria-pressed',String(active));
 }
}
async function toggleSample(button){
 if(submitting||button.disabled)return;
 const kind=button.dataset.sampleKind,existing=sampleFiles.get(button);
 if(existing&&files[kind]?.includes(existing)){
  files[kind]=files[kind].filter(f=>f!==existing);pruneFile(existing);
  invalidateQuote();renderFiles();status('Reference removed.');return;
 }
 const limit={model:4,outfit:3}[kind],num=files[kind].length+savedRefs[kind].length;
 if(num>=limit){status('You can use up to '+limit+' '+(kind==='model'?'model':'wardrobe')+' references.',true);return}
 button.disabled=true;
 try{
  const response=await fetch(new URL(button.dataset.sampleSrc,location.href),{credentials:'same-origin'});
  if(!response.ok)throw Error('Reference photograph is unavailable.');
  const blob=await response.blob();
  const type=['image/jpeg','image/png','image/webp'].includes(blob.type)?blob.type:(button.dataset.sampleSrc.endsWith('.jpg')?'image/jpeg':'image/webp');
  const file=new File([blob],kind+'-reference-'+Date.now()+'.'+(type==='image/jpeg'?'jpg':type==='image/png'?'png':'webp'),{type});
  const before=files[kind].length;addFiles(kind,[file]);
  if(files[kind].includes(file)&&files[kind].length>before){sampleFiles.set(button,file);renderCastingControls();updateSeriesSummary();status('Added to '+(kind==='model'?'model':'wardrobe')+' references.');}
 }catch(err){status(err.message,true)}
 finally{button.disabled=false;refreshSampleStates()}
}
function renderDirections(){
 const container=$('direction-cards');container.replaceChildren();
 const list=directionSets[directionTab],active=selectedDirections[directionTab];
 for(const dir of list){
  const selected=dir.id===active,card=document.createElement('button');
  card.type='button';card.className='direction-card'+(selected?' is-selected':'');
  card.setAttribute('aria-pressed',String(selected));
  const img=document.createElement('img');img.src=dir.image;img.alt='';img.loading='lazy';
  const name=document.createElement('span');name.textContent=dir.name;
  card.append(img,name);
  card.addEventListener('click',()=>{selectedDirections[directionTab]=selected&&directionTab!=='location'?null:dir.id;invalidateQuote();renderDirections()});
  container.append(card);
 }
 for(const tab of document.querySelectorAll('[data-direction-tab]')){
  const selected=tab.dataset.directionTab===directionTab;
  tab.classList.toggle('is-selected',selected);tab.classList.toggle('has-choice',Boolean(selectedDirections[tab.dataset.directionTab]));
  tab.setAttribute('aria-selected',String(selected));
 }
 const names=Object.entries(selectedDirections).map(([kind,id])=>directionSets[kind].find(d=>d.id===id)?.name).filter(Boolean);
 $('direction-summary').textContent=names.length?'Selected: '+names.join(' / '):'Choose an environment and optionally a mood or material.';
 updateSeriesSummary();
}
function validateStep(){if(step===1&&files.model.length+savedRefs.model.length<1){status('Add at least one photograph of your model.',true);$('model-drop').focus();return false;}
 if(step===2&&!files.outfit.length&&!savedRefs.outfit.length&&!$('styling-direction').value.trim()){status('Add a garment image or describe your styling.',true);$('styling-direction').focus();return false;}
 return true;}
async function api(path,{method='GET',body,headers={}}={}){
 const version=epoch;const init={method,headers:{...headers}};
 if(body!==undefined){if(body instanceof Blob)init.body=body;else{init.headers['Content-Type']='application/json';init.body=JSON.stringify(body)}}
 const res=await request(path,init);const data=await res.json().catch(()=>({}));
 if(version!==epoch)throw Error('Your account changed. Sign in again.');
 if(!res.ok)throw Error(data.error||'PV LAB returned HTTP '+res.status);
 return data;
}
async function fetchBlob(path){const version=epoch;const response=await request(path);if(!response.ok)throw Error('Could not load the saved image.');const blob=await response.blob();if(version!==epoch)throw Error('Account changed');return blob;}
function getSettings(){
 const moodText=Object.entries(selectedDirections).map(([kind,id])=>directionSets[kind].find(d=>d.id===id)?.prompt||'').filter(Boolean).join(' ');
 const lighting={natural:'Natural daylight with plausible exposure.',golden:'Golden hour, long shadows and warm natural light.',overcast:'Overcast daylight, diffuse shadows.',blue:'Blue hour, believable mixed twilight.',night:'Night, physically plausible practical illumination.'}[$('editorial-time').value]||'';
 const atmosphere={cinematic:'Cinematic contrast without artificial oversharpening.',analogue:'Analogue photographic texture, subtle organic grain.',soft:'Soft diffused contrast and restrained halation.',contrast:'Strong directional contrast, preserved shadow detail.'}[$('editorial-atmosphere').value]||'';
 const palette={natural:'Natural desaturated tonal palette.',mono:'Monochrome photographic palette.',warm:'Warm earthy color relationships.',cool:'Cool mineral color relationships.'}[$('editorial-palette').value]||'';
 const identity=Number($('identity-guide').value),emphasis=Number($('garment-guide').value),mood=Number($('mood-guide').value);
 const parts=[
  'PV LAB Full Editorial series. Photorealistic high-fashion campaign photography, grounded natural skin texture, convincing fabric and plausible anatomy. Cohesive visual direction across the series, realistic lighting, non-plastic skin and restrained retouching.',
  'Preserve the recognizable facial identity from identity reference photographs as faithfully as the model can; use them for facial features, not the original pose or background. Identity importance '+identity+' percent as creative guidance.',
  'Translate garment references onto the selected person or cast without copying the original reference wearer. Prioritize believable cloth fit and material detail. Garment importance '+emphasis+' percent as creative guidance.',
  'Editorial art direction: '+moodText+' '+lighting+' '+atmosphere+' '+palette+' Mood importance '+mood+' percent as creative guidance.',
  $('styling-direction').value.trim(),$('location-direction').value.trim(),$('editorial-prompt').value.trim(),
  'Frame one standalone photograph with a considered editorial pose. Maintain the same selected identity or cast, palette, materials and location language across the series; vary framing and body posture naturally between distinct images.'
 ];
 const prompt=parts.filter(Boolean).join('\n');
 if(prompt.length>($('editorial-model').value==='seedreamlite'?2250:3850))throw Error('The editorial direction is too long for distinct shot briefs. Shorten your custom text.');
 return {type:'image',engine:$('editorial-model').value,processing:'normal',mode:'image',referenceMode:'references',
  prompt,resolution:$('editorial-resolution').value,aspectRatio:chosenRatio,outputFormat:'png',referenceRoles:[],exactPrompt:false};
}
const editorialShots=[
 'Wide environmental establishing photograph: reveal the location and architectural scale, with the model clearly visible and natural negative space.',
 'Full-length silhouette: show the whole garment, material behavior and precise tailoring, with a grounded fashion pose.',
 'Mid-shot editorial composition: expressive body language, interaction with the setting and distinctive off-center framing.',
 'Close portrait and couture craft: natural facial expression, credible skin detail, seams and garment texture.',
 'Fashion in motion: a natural walking or turning moment, physically realistic fabric movement and perspective.',
 'Seated or leaning fashion composition: grounded contact with the architecture and asymmetric framing.',
 'Material study: deliberate close framing of folds, texture and construction, with recognizable human context.',
 'Environmental perspective: new camera elevation and architectural geometry without repeating an earlier composition.',
 'Three-quarter full-body angle: show another side of the fashion silhouette with believable fit.',
 'Profile portrait: natural expression, dramatic but physically plausible light and strong background geometry.',
 'Low-angle fashion photograph: architectural scale without distorting bodies or clothing.',
 'Closing campaign hero: a memorable composition unifying the wardrobe, visual world and atmosphere.'
];
// One immutable shot direction and reference subset per quote, not four
// provider calls sharing the same prompt.
function editorialShotPlan(index,total,references,base){
 const identities=references.filter(r=>r.role==='identity'),other=references.filter(r=>r.role!=='identity');
 const cast=effectiveCastMode()==='cast'&&identities.length>1;
 let selected=identities;
 if(cast){
  const first=index%identities.length;
  const paired=castComposition==='together'||(castComposition==='mixed'&&index%4===2);
  selected=paired?[identities[first],identities[(first+1)%identities.length]]:[identities[first]];
 }
 const personInstruction=cast?(selected.length>1
  ?'Exactly two distinct adult models appear together. Preserve each individual facial identity from its corresponding selected reference. Never blend or swap identities.'
  :'Exactly one adult model appears. Preserve the selected facial identity. No second figure or blended facial features.')
  :'Exactly one adult model appears. All identity photographs are reference views of that same person, not separate people.';
 const shotReferences=[...selected,...other];
 const prompt=base.prompt+'\nCAMPAIGN SHOT '+(index+1)+' OF '+total+': '+editorialShots[index%editorialShots.length]+' '+personInstruction+' Keep the same creative world, wardrobe, location, palette, lighting and photographic treatment across this series. One photograph only, never a collage or contact sheet.';
 if(prompt.length>(base.engine==='seedreamlite'?3000:5000))throw Error('The combined shot brief exceeds the selected model prompt limit. Shorten the creative text.');
 return {references:shotReferences,settings:{...base,prompt,referenceRoles:shotReferences.map(({file,role})=>({role,name:nameFor(file),note:''}))}};
}
async function signIn(){if(!clerk)clerk=await loadLabAccount();const href=location.href;clerk.openSignIn({forceRedirectUrl:href,signInForceRedirectUrl:href,signUpForceRedirectUrl:href})}
async function sync(){
 const prev=sessionKey;const next=clerk?.session?.id||'';
 if(prev&&prev!==next){epoch++;uploaded.clear();quote=null;uncertain=false;submitting=false;wipeResults();resetAll();}
 sessionKey=next;
 if(!clerk?.isSignedIn||!next){profile=null;$('editorial-signin').hidden=false;$('editorial-balance').textContent='';return;}
 try{profile=await api('/api/session');$('editorial-signin').hidden=true;if(step===4)invalidateQuote();const credits=profile?.credits?.balance??profile?.balanceCredits??profile?.wallet?.balance;if(Number.isSafeInteger(credits))$('editorial-balance').textContent=credits.toLocaleString()+' credits';}catch(error){profile=null;status('Your account could not be checked: '+error.message,true);}
}
async function uploadReferences(){
 const selected=[...files.model.map(file=>({file,role:'identity'})),...files.outfit.map(file=>({file,role:'outfit'})),...files.location.map(file=>({file,role:'room'}))];
 const ids=[];
 for(const item of selected){
  let id=uploaded.get(item.file);
  if(!id){const response=await api('/api/uploads',{method:'POST',body:item.file,headers:{'Content-Type':item.file.type,'X-Filename':encodeURIComponent(item.file.name)}});
   if(!response?.id)throw Error('PV LAB did not confirm the uploaded photograph.');id=response.id;uploaded.set(item.file,id);}
  ids.push({id,role:item.role,file:item.file});
 }
 for(const [kind,role] of [['model','identity'],['outfit','outfit'],['location','room']])for(const ref of savedRefs[kind])ids.push({id:ref.id,role,file:{name:ref.name}});
 return ids;
}

const elementTypes={model:'characters',outfit:'outfits',location:'locations'};
async function openSaved(kind){
 if(!profile){await signIn();return}
 const dlg=$('saved-elements-dialog'),container=$('saved-elements-list');container.replaceChildren();dlg.showModal();
 const loading=document.createElement('p');loading.textContent='Loading private '+elementTypes[kind]+'…';container.append(loading);
 try{
  const response=await api('/api/packs'),packs=(response.packs||[]).filter(pack=>typeof pack.name==='string'&&pack.name.startsWith('PVSCENE1|'+elementTypes[kind]+'|')&&Array.isArray(pack.refs)&&pack.refs.length);
  container.replaceChildren();if(!packs.length){container.textContent='No saved '+elementTypes[kind]+' yet. Add a photograph instead, or create an Element in Image Studio.';return}
  for(const pack of packs){
   const row=document.createElement('button');row.type='button';row.className='saved-element-option';
   const name=document.createElement('strong');name.textContent=pack.name.split('|').slice(2).join('|');
   const detail=document.createElement('small');detail.textContent=pack.refs.length+' saved view'+(pack.refs.length===1?'':'s');
   row.append(name,detail);container.append(row);
   row.addEventListener('click',async()=>{
    const max={model:4,outfit:3,location:2}[kind];
    const existing=files[kind].length+savedRefs[kind].length;
    const used=Object.values(files).reduce((n,part)=>n+part.length,0)+Object.values(savedRefs).reduce((n,part)=>n+part.length,0);
    const allowed=Math.min(max-existing,10-used,2);
    if(allowed<=0){status('This category already has its maximum reference images.',true);dlg.close();return}
    const refs=pack.refs.filter(r=>typeof r.id==='string'&&r.id&&!Object.values(savedRefs).flat().some(e=>e.id===r.id)).slice(0,allowed);
    for(const r of refs){
     const record={id:r.id,name:r.name||name.textContent,role:kind,url:null};savedRefs[kind].push(record);
     void fetchBlob('/api/assets/'+encodeURIComponent(r.id)+'/thumbnail').then(blob=>{if(!savedRefs[kind].includes(record))return;record.url=URL.createObjectURL(blob);renderFiles()}).catch(()=>{});
    }
    invalidateQuote();renderFiles();dlg.close();status(refs.length?'Added '+refs.length+' saved reference image'+(refs.length===1?'':'s')+'.':'No new views were available.');
   });
  }
 }catch(error){container.textContent=error.message;}
}

function validQuote(q){return q&&typeof q.id==='string'&&q.id&&Number.isSafeInteger(q.creditCost)&&q.creditCost>0&&Number(q.expiresAt)>Date.now()&&q.settings?.type==='image';}
function syncGenerateAction(){
 const ready=quote&&quote.revision===revision&&quote.quotes.every(validQuote);
 $('editorial-generate').disabled=Boolean(submitting||uncertain||(profile&&!ready&&!quoteError));
 $('editorial-generate').setAttribute('aria-busy',String(quoteBusy));
 $('editorial-cost').textContent=ready?quote.quotes.reduce((sum,q)=>sum+q.creditCost,0).toLocaleString()+' credits':!profile?'Sign in to see credit cost':quoteError?'Credit cost unavailable. Click Generate to try again.':'Checking credits…';
 const remaining=Math.max(0,chosenCount-results.length);
 $('editorial-batch-note').textContent=remaining>4?'Next 4 of '+remaining+' images. Generate each set separately.':'';
}
function invalidateQuote(){
 revision++;quote=null;quoteError=false;clearTimeout(quoteTimer);clearTimeout(quoteExpiryTimer);
 syncGenerateAction();
 if(step===4&&profile&&!submitting&&!uncertain)quoteTimer=setTimeout(()=>void prepareBatch(),250);
}
async function prepareBatch(){
 if(quoteBusy||submitting||uncertain||step!==4||!profile)return;
 if(!files.model.length&&!savedRefs.model.length){status('Add a model photograph or select a saved Character.',true);go(1);return}
 const remain=Math.max(0,chosenCount-results.length);
 if(!remain){go(6);return}
 const revisionId=revision;quoteBusy=true;quoteError=false;syncGenerateAction();
 try{
  const settings=getSettings();const references=await uploadReferences();if(revisionId!==revision)return;
  const plans=Array.from({length:Math.min(4,remain)},(_,i)=>editorialShotPlan(results.length+i,chosenCount,references,settings));
  // Preflight is non-billable. No paid job is submitted until the user presses Generate.
  const quotes=await Promise.all(plans.map(async plan=>{
   const response=await api('/api/quotes',{method:'POST',body:{sourceId:null,lastSourceId:null,referenceSourceIds:plan.references.map(r=>r.id),settings:plan.settings,count:1}});
   if(Array.isArray(response.quotes)&&response.quotes.length!==1)throw Error('Expected one quote per campaign photograph.');
   return Array.isArray(response.quotes)?response.quotes[0]:response;
  }));
  if(revisionId!==revision)return;
  if(quotes.length!==plans.length||quotes.some((q,i)=>!validQuote(q)||q.settings.engine!==plans[i].settings.engine||q.settings.resolution!==plans[i].settings.resolution||q.settings.aspectRatio!==plans[i].settings.aspectRatio||q.settings.prompt!==plans[i].settings.prompt))throw Error('The server did not return a complete, matching credit quote.');
  quote={quotes,remaining:remain,settings,revision:revisionId};
  quoteExpiryTimer=setTimeout(invalidateQuote,Math.max(0,Math.min(...quotes.map(q=>Number(q.expiresAt)))-Date.now()));
  status('');
 }catch(error){if(revisionId===revision){quote=null;quoteError=true;status(error.message,true)}}
 finally{
  quoteBusy=false;syncGenerateAction();
  if(revisionId!==revision&&step===4&&profile&&!submitting&&!uncertain){clearTimeout(quoteTimer);quoteTimer=setTimeout(()=>void prepareBatch(),250)}
 }
}
async function generateEditorial(){
 if(submitting||quoteBusy||uncertain)return;
 if(!profile){await signIn();return}
 if(!quote||quote.revision!==revision||!quote.quotes.every(validQuote)){
  invalidateQuote();clearTimeout(quoteTimer);await prepareBatch();return;
 }
 await submitBatch();
}
const generationVideo=$('editorial-generation-film');
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
function updateGenerationMotion(){
 const play=step===5&&!document.hidden&&!reducedMotion.matches&&!navigator.connection?.saveData;
 if(!play){generationVideo.pause();return}
 if(!generationVideo.src){generationVideo.src=generationVideo.dataset.src;generationVideo.load()}
 generationVideo.play()?.catch(()=>{});
}
document.addEventListener('visibilitychange',updateGenerationMotion);
reducedMotion.addEventListener('change',updateGenerationMotion);
function updateGenerationProgress(phase='working'){
 const ready=Math.max(0,Math.min(progressBatchSize,results.length-progressBatchStart));
 $('generation-progress').textContent=phase==='submitting'?'Preparing your photographs':ready===progressBatchSize?'Your photographs are ready':ready===0?'Creating your photographs':ready+' of '+progressBatchSize+' photographs ready';
}
function renderResults(){
 const holder=$('editorial-results'),strip=$('progress-results');holder.replaceChildren();
 for(const [index,result] of results.entries()){
  const box=document.createElement('div');box.className='result-card'+(result.selected?' is-selected':'');
  const img=document.createElement('img');img.alt='Editorial image '+(index+1);img.src=result.url;img.loading='lazy';box.append(img);
  const toggle=document.createElement('button');toggle.type='button';toggle.textContent=result.selected?'✓':'○';toggle.setAttribute('aria-label',(result.selected?'Deselect':'Select')+' editorial image '+(index+1));toggle.addEventListener('click',()=>{result.selected=!result.selected;renderResults()});box.append(toggle);
  const info=document.createElement('div');info.className='result-caption';info.textContent='Editorial '+String(index+1).padStart(2,'0');box.append(info);holder.append(box);
  // The generation contact sheet shows only photographs from the active batch.
 }
 const batch=results.slice(progressBatchStart,progressBatchStart+progressBatchSize);
 for(let index=0;index<progressBatchSize;index++){
  const result=batch[index],jobId=result?.jobId||'pending';
  if(strip.children[index]?.dataset.jobId===jobId)continue;
  const frame=document.createElement('div');frame.dataset.jobId=jobId;
  frame.className='generation-frame'+(result?' is-ready':'');
  frame.setAttribute('aria-label',result?'Photograph '+(index+1)+' ready':'Photograph '+(index+1)+' pending');
  if(result){const photo=document.createElement('img');photo.src=result.url;photo.alt='';photo.loading='lazy';frame.append(photo)}
  else{const pending=document.createElement('span');pending.className='generation-frame-number';pending.textContent=String(index+1).padStart(2,'0');frame.append(pending)}
  const label=document.createElement('small');label.textContent=String(index+1).padStart(2,'0');frame.append(label);
  if(strip.children[index])strip.children[index].replaceWith(frame);else strip.append(frame);
 }
 while(strip.children.length>progressBatchSize)strip.lastElementChild.remove();
 strip.setAttribute('aria-label',batch.length+' of '+progressBatchSize+' editorial photographs ready');
 if(step===5)updateGenerationProgress();
 $('result-summary').textContent=results.length+' of '+chosenCount+' editorial images created. '+(results.length<chosenCount?'You can generate another set of four after reviewing its credit cost.':'Series complete.');
 $('create-variations').textContent=results.length<chosenCount?'Generate next '+Math.min(4,chosenCount-results.length)+' images':'Generate variations';
}
async function showJob(job){
 if(job.status==='completed'&&job.outputId){
   const blob=await fetchBlob('/api/assets/'+encodeURIComponent(job.outputId));
   if(!blob.type.startsWith('image/'))throw Error('The completed output was not an image.');
   if(!results.some(r=>r.jobId===job.id)){results.push({jobId:job.id,blob,url:URL.createObjectURL(blob),selected:true});renderResults();}
 }else if(job.status==='failed'||job.status==='resolved')throw Error(job.error||'An image generation failed. Review your History for refunded credits.');
 else if(job.status==='uncertain'){uncertain=true;throw Error('One job needs account review. Check Image Studio History before making any more requests.');}
}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
async function pollJob(id,version){
 let tries=0;
 while(version===epoch){
  const {job}=await api('/api/jobs/'+encodeURIComponent(id));if(!job||job.id!==id)throw Error('Job record is unavailable. Check Image Studio History.');
  if(job.status==='completed'||job.status==='failed'||job.status==='resolved'||job.status==='uncertain'){await showJob(job);return}
  if(!activeStates.has(job.status))throw Error('Generation state '+job.status+' needs review in History.');
  if(++tries>120)throw Error('The job is still processing. Open History to check the result; do not submit it again.');
  await sleep(4000);
 }
}
async function submitBatch(){
 if(submitting||uncertain||!quote)return;
 const frozen=quote;quote=null;
 if(frozen.revision!==revision||frozen.quotes.some(q=>!validQuote(q))){invalidateQuote();status('The credit cost is refreshing. Check it before generating.',true);return}
 if(!profile){status('Sign in again to confirm the charge.',true);return}
 submitting=true;clearTimeout(quoteExpiryTimer);progressBatchStart=results.length;progressBatchSize=frozen.quotes.length;go(5);renderResults();updateGenerationProgress('submitting');const version=epoch;
 try{
  const started=[];
  // Submit the four distinct bound quotes promptly before any one image
  // finishes, so the remaining quotes do not expire while the first runs.
  for(const [index,q] of frozen.quotes.entries()){
   updateGenerationProgress('submitting');
   $('batch-status').textContent='Submitting '+(index+1)+' of '+frozen.quotes.length+' confirmed images.';
   let response;
   // Never retry a paid submission. On uncertainty, stop and send the user to History.
   try{response=await api('/api/jobs',{method:'POST',body:{quoteId:q.id,confirm:true}})}
   catch(error){uncertain=true;throw Error('Submission was not confirmed: '+error.message+' Check Image Studio History. Do not submit again until its status is clear.');}
   if(!response.job?.id){uncertain=true;throw Error('No job receipt. Check Image Studio History before continuing.');}
   activeJobs.push(response.job.id);started.push(response.job.id);
  }
  $('batch-status').textContent='All '+started.length+' jobs submitted. Each photograph will appear below as it finishes.';
  updateGenerationProgress();
  // Poll accepted IDs only. No paid submission can be repeated by polling.
  await Promise.all(started.map(id=>pollJob(id,version)));
  activeJobs=[];
  go(6);status('Editorial images are saved to your PV LAB account.');
 }catch(error){
  // A request may have reached the provider even when polling or network I/O fails.
  // Freeze further payments until the user checks the authoritative job History.
  if(activeJobs.length)uncertain=true;
  status(error.message,true);$('batch-status').textContent=error.message;renderResults();
  if(results.length){go(6);status(error.message,true)}
 }finally{submitting=false;generationVideo.pause();syncGenerateAction()}
}
function pushZipPart(parts,values){parts.push(new Uint8Array(values))}
function crc32(bytes){let c=0xffffffff;for(const byte of bytes){c^=byte;for(let i=0;i<8;i++)c=(c>>>1)^(0xedb88320&-(c&1))}return(c^0xffffffff)>>>0}
function le16(n){return[n&255,(n>>>8)&255]}function le32(n){return[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]}
async function makeZip(selected){
 const encoder=new TextEncoder(),parts=[],central=[];let offset=0;
 for(const [index,item] of selected.entries()){
  const bytes=new Uint8Array(await item.blob.arrayBuffer()),name=encoder.encode('PVLAB-EDITORIAL-'+String(index+1).padStart(2,'0')+(item.blob.type==='image/jpeg'?'.jpg':item.blob.type==='image/webp'?'.webp':'.png')),crc=crc32(bytes);
  const local=new Uint8Array([...le32(0x04034b50),...le16(20),...le16(0),...le16(0),...le16(0),...le16(0),...le32(crc),...le32(bytes.length),...le32(bytes.length),...le16(name.length),...le16(0)]);
  parts.push(local,name,bytes);
  central.push(new Uint8Array([...le32(0x02014b50),...le16(20),...le16(20),...le16(0),...le16(0),...le16(0),...le16(0),...le32(crc),...le32(bytes.length),...le32(bytes.length),...le16(name.length),...le16(0),...le16(0),...le16(0),...le16(0),...le32(0),...le32(offset)]),name);
  offset+=local.length+name.length+bytes.length;
 }
 const centralSize=central.reduce((n,v)=>n+v.length,0);parts.push(...central,new Uint8Array([...le32(0x06054b50),...le16(0),...le16(0),...le16(selected.length),...le16(selected.length),...le32(centralSize),...le32(offset),...le16(0)]));
 return new Blob(parts,{type:'application/zip'});
}
async function downloadSelected(){
 const selected=results.filter(r=>r.selected);if(!selected.length){status('Select one or more results first.',true);return}
 const blob=await makeZip(selected),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='PVLAB-Full-Editorial-'+new Date().toISOString().slice(0,10)+'.zip';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
const mobileMenu=$('editorial-mobile-menu'),siteHeader=document.querySelector('.editorial-header');
function closeMobileMenu(){siteHeader.classList.remove('menu-open');mobileMenu.setAttribute('aria-expanded','false');mobileMenu.setAttribute('aria-label','Open site navigation')}
mobileMenu.addEventListener('click',()=>{const expanded=siteHeader.classList.toggle('menu-open');mobileMenu.setAttribute('aria-expanded',String(expanded));mobileMenu.setAttribute('aria-label',expanded?'Close site navigation':'Open site navigation')});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMobileMenu()});
siteHeader.querySelector('nav').addEventListener('click',event=>{if(event.target.closest('a'))closeMobileMenu()});
document.addEventListener('click',event=>{if(!siteHeader.contains(event.target))closeMobileMenu()});
$('editorial-start').addEventListener('click',()=>{go(1);status('')});
$('step-back').addEventListener('click',()=>{if(!submitting){go(Math.max(0,step-1));status('')}});
$('editorial-top-back').addEventListener('click',()=>{if(!submitting){go(Math.max(0,step-1));status('')}});
$('step-next').addEventListener('click',()=>{if(submitting)return;if(step===4)return;if(validateStep()){go(step+1);status('')}});
$('editorial-generate').addEventListener('click',()=>void generateEditorial().catch(error=>status(error.message,true)));
$('editorial-reset').addEventListener('click',()=>{if(submitting){status('A paid generation is running. Open History before starting another.',true);return}resetAll()});
for(const b of document.querySelectorAll('[data-sample-kind]'))b.addEventListener('click',()=>void toggleSample(b));
for(const b of document.querySelectorAll('[data-source-view]'))b.addEventListener('click',()=>{
 $('panel-model').dataset.modelMode=b.dataset.sourceView;
 for(const t of document.querySelectorAll('[data-source-view]')){const active=t===b;t.classList.toggle('is-selected',active);t.setAttribute('aria-pressed',String(active))}
 if(b.dataset.sourceView==='upload')$('model-drop').scrollIntoView({block:'nearest',behavior:'smooth'});
});
for(const b of document.querySelectorAll('[data-style-view]'))b.addEventListener('click',()=>{
 $('panel-style').dataset.styleMode=b.dataset.styleView;
 for(const t of document.querySelectorAll('[data-style-view]')){const active=t===b;t.classList.toggle('is-selected',active);t.setAttribute('aria-pressed',String(active))}
 if(b.dataset.styleView==='upload')$('add-outfits').focus();
 if(b.dataset.styleView==='describe')$('styling-direction').focus();
});
for(const b of document.querySelectorAll('[data-edit-step]'))b.addEventListener('click',()=>{if(!submitting)go(Number(b.dataset.editStep))});
$('model-drop').addEventListener('click',()=>$('model-files').click());
$('model-drop').addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();$('model-files').click()}});
$('model-drop').addEventListener('dragover',event=>event.preventDefault());
$('model-drop').addEventListener('drop',event=>{event.preventDefault();addFiles('model',event.dataTransfer.files)});
$('add-outfits').addEventListener('click',()=>$('outfit-files').click());
$('saved-character').addEventListener('click',()=>void openSaved('model'));
$('saved-outfit').addEventListener('click',()=>void openSaved('outfit'));
$('saved-location').addEventListener('click',()=>void openSaved('location'));
$('saved-elements-close').addEventListener('click',()=>$('saved-elements-dialog').close());
$('add-location').addEventListener('click',()=>$('location-files').click());
for(const [kind,id] of [['model','model-files'],['outfit','outfit-files'],['location','location-files']])$(id).addEventListener('change',event=>{addFiles(kind,event.target.files);event.target.value=''});
for(const id of ['styling-direction','location-direction','editorial-prompt','editorial-model','editorial-resolution'])$(id).addEventListener('input',()=>{invalidateQuote();updateSeriesSummary()});
for(const id of ['identity-guide','garment-guide','mood-guide'])$(id).addEventListener('input',()=>{invalidateQuote();refreshSliderLabels()});
$('editorial-cast-mode').addEventListener('change',event=>{castMode=event.target.value;invalidateQuote();renderCastingControls();updateSeriesSummary()});
$('editorial-cast-composition-select').addEventListener('change',event=>{castComposition=event.target.value;invalidateQuote()});
$('count-options').addEventListener('click',event=>{const b=event.target.closest('[data-count]');if(!b)return;chosenCount=Number(b.dataset.count);invalidateQuote();updateOptions()});
$('ratio-options').addEventListener('click',event=>{const b=event.target.closest('[data-ratio]');if(!b)return;chosenRatio=b.dataset.ratio;invalidateQuote();updateOptions()});
for(const tab of document.querySelectorAll('[data-direction-tab]'))tab.addEventListener('click',()=>{directionTab=tab.dataset.directionTab;renderDirections()});
for(const id of ['editorial-time','editorial-atmosphere','editorial-palette'])$(id).addEventListener('change',()=>{invalidateQuote();updateSeriesSummary()});
$('download-selected').addEventListener('click',()=>void downloadSelected().catch(e=>status(e.message,true)));
$('create-variations').addEventListener('click',()=>{if(submitting||uncertain)return;if(results.length>=chosenCount&&chosenCount<12){chosenCount+=4;updateOptions()}go(4);status('Review the next set of four and its real credit price before generating.')});
$('edit-selection').addEventListener('click',()=>{location.assign('./studio.html?tool=retouch');});
$('progress-history').addEventListener('click',()=>location.assign('./studio.html?tool=image'));
$('editorial-signin').addEventListener('click',()=>void signIn().catch(e=>status(e.message,true)));
window.addEventListener('pagehide',()=>{for(const url of objectUrls.values())URL.revokeObjectURL(url);for(const r of results)if(r.url)URL.revokeObjectURL(r.url)});
renderDirections();renderFiles();updateOptions();refreshSliderLabels();updateSeriesSummary();go(0);
const entryUrl=new URL(location.href),modelPhoto=entryUrl.searchParams.get('modelPhoto');
if(modelPhoto){
 entryUrl.searchParams.delete('modelPhoto');history.replaceState(history.state,'',entryUrl.href);
 try{
  const file=await takeModelPhoto(modelPhoto);addFiles('model',[file]);
  $('panel-model').dataset.modelMode='upload';
  for(const tab of document.querySelectorAll('[data-source-view]')){
   const active=tab.dataset.sourceView==='upload';tab.classList.toggle('is-selected',active);tab.setAttribute('aria-pressed',String(active));
  }
  go(1);status('Model photograph loaded.');
 }catch(error){go(1);status(error.message,true)}
}
try{clerk=await loadLabAccount();await sync();clerk.addListener(()=>void sync())}catch(error){status('The account service is temporarily unavailable. You can still build your concept. '+error.message,true)}
