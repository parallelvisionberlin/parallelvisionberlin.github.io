// Photochemical finishing is a separate local imaging step; no second AI generation.
// Version 1 remains readable for previously saved Hong Kong Nights results.
export const FILM_FINISH_VERSION=2;
export const HONG_KONG_FILM_FINISH=Object.freeze({version:2,grain:36,haze:42,halation:22,film:65});
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
  const title=document.createElement('strong');title.textContent='35mm film finish';
  const note=document.createElement('p');
  note.textContent='Grain: pushed negative texture. Haze: existing lights through humid air. Halation: source-bound glow, no body outlines. Film: 35mm print contrast, warmer highlights, cooler shadows and gentle rolloff. No new AI generation.';
  container.classList.add('film-finish');container.append(title,note);
  if(compact){
    container.classList.add('film-finish-compact');
    const help=document.createElement('button');help.type='button';help.className='film-finish-help';
    help.textContent='i';help.setAttribute('aria-label','About 35mm finishing');
    help.setAttribute('aria-describedby','mood-film-finish-note');
    note.id='mood-film-finish-note';note.setAttribute('role','tooltip');title.append(help);
  }
  const sync=(input,output)=>{output.textContent=input.value+'%';input.style.setProperty('--moods-progress',input.value+'%');};
  for(const [key,label,help] of [
    ['grain','Grain','Luminance-aware organic 35mm grain'],
    ['haze','Haze','Soft atmospheric diffusion around visible light sources'],
    ['halation','Halation','Restrained light-source glow, not a silhouette'],
    ['film','Film','35mm print tone curve, highlight rolloff and color crossover']
  ]){
    const row=document.createElement('label'),caption=document.createElement('span');
    caption.textContent=label;row.title=help;
    const output=document.createElement('output'),input=document.createElement('input');
    input.type='range';input.min='0';input.max='100';input.step='1';
    input.setAttribute('aria-label',label+' intensity');input.title=help;
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
