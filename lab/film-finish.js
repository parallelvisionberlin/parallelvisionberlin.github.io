// Photochemical finishing is a separate local imaging step; no second AI generation.
// Version 1 remains readable for previously saved Hong Kong Nights results.
export const FILM_FINISH_VERSION=2;
export const FILM_FINISH_RENDER_REVISION=7;
// Keep Film Finish available for deliberate use, but OFF on new Hong Kong jobs.
export const HONG_KONG_FILM_FINISH=Object.freeze({version:2,grain:0,haze:0,halation:0,film:0});
export const FILM_FINISH_OFF=Object.freeze({version:2,grain:0,haze:0,halation:0,film:0});
const valid=n=>Number.isInteger(n)&&n>=0&&n<=100;
export function filmFinishSettings(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Choose supported film finish settings.');
  if(value.version===1){
    if(!valid(value.grain)||!valid(value.glow))throw Error('Grain and Glow must be between 0 and 100.');
    return {version:2,grain:value.grain,haze:Math.round(value.glow*.55),halation:Math.round(value.glow*.35),film:0};
  }
  if(value.version!==FILM_FINISH_VERSION||['grain','haze','halation','film'].some(key=>!valid(value[key])))
    throw Error('Grain, Haze, Halation and Film must be between 0 and 100.');
  return {version:2,grain:value.grain,haze:value.haze,halation:value.halation,film:value.film};
}
export function hasFilmFinish(value){
  const f=filmFinishSettings(value);return !!(f.grain||f.haze||f.halation||f.film);
}
export function createFilmFinishControls(container,{onChange=()=>{},compact=false}={}){
  const fields=new Map();
  const title=document.createElement('strong');title.textContent='35mm Film Finish';
  const help=document.createElement('button');
  help.type='button';help.className='film-finish-help';help.textContent='i';
  help.setAttribute('aria-label','About 35mm film finish');
  const detailId=(container.id||'composer-film-finish')+'-explanation';
  help.setAttribute('aria-controls',detailId);help.setAttribute('aria-expanded','false');
  title.append(help);
  const note=document.createElement('p');note.className='film-finish-summary';
  note.textContent='Photochemical texture, atmospheric light and analog color.';
  const explanation=document.createElement('p');explanation.className='film-finish-explanation';
  explanation.id=detailId;explanation.hidden=true;
  explanation.textContent='Grain: irregular pushed-negative texture. Haze: practical light scattering through humid air. Halation: light-source bloom without body outlines. Film: 35mm print contrast, warm highlights, cool shadows and soft rolloff. At high strengths the finish becomes more expressive. No extra AI generation.';
  help.onclick=()=>{
    explanation.hidden=!explanation.hidden;
    help.setAttribute('aria-expanded',String(!explanation.hidden));
  };
  container.classList.add('film-finish');
  if(compact)container.classList.add('film-finish-compact');
  container.append(title,note,explanation);
  const sync=(input,output)=>{output.textContent=input.value+'%';input.style.setProperty('--moods-progress',input.value+'%');};
  for(const [key,label,description] of [
    ['grain','Grain','Organic pushed 35mm negative texture'],
    ['haze','Haze','Humid optical diffusion from actual light sources'],
    ['halation','Halation','Light-source bloom without glowing silhouettes'],
    ['film','Film','35mm print curve, warm highlights and cool shadows']
  ]){
    const row=document.createElement('label'),caption=document.createElement('span');
    caption.textContent=label;row.title=description;
    const output=document.createElement('output'),input=document.createElement('input');
    input.type='range';input.min='0';input.max='100';input.step='1';
    input.setAttribute('aria-label',label+' intensity');input.title=description;
    row.append(caption,output,input);container.append(row);fields.set(key,{input,output});
    input.oninput=()=>{sync(input,output);onChange();};
  }
  const api={
    get:()=>filmFinishSettings({version:2,...Object.fromEntries([...fields].map(([key,{input}])=>[key,Number(input.value)]))}),
    set(value=HONG_KONG_FILM_FINISH){const settings=filmFinishSettings(value);for(const [key,{input,output}] of fields){input.value=String(settings[key]);sync(input,output);}},
    lock(value){for(const {input} of fields.values())input.disabled=value;}
  };
  api.set();return api;
}
