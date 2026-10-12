// Optional post-generation polish; new Hong Kong Nights generations default to the original image.
export const FILM_FINISH_VERSION=1;
export const HONG_KONG_FILM_FINISH=Object.freeze({version:1,grain:0,glow:0});
export function filmFinishSettings(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==FILM_FINISH_VERSION)
    throw Error('Choose supported film finish settings.');
  for(const key of ['grain','glow'])if(!Number.isInteger(value[key])||value[key]<0||value[key]>100)
    throw Error('Grain and Glow must be between 0 and 100.');
  return {version:FILM_FINISH_VERSION,grain:value.grain,glow:value.glow};
}

export function createFilmFinishControls(container,{onChange=()=>{},compact=false}={}){
  const fields=new Map();
  const title=document.createElement('strong');title.textContent='Film finish';
  const note=document.createElement('p');note.textContent='Fine grain and whole-image light diffusion. No extra AI generation.';
  container.classList.add('film-finish');container.append(title,note);
  if(compact){
    container.classList.add('film-finish-compact');
    const help=document.createElement('button');help.type='button';help.className='film-finish-help';
    help.textContent='i';help.setAttribute('aria-label','About film finish');
    help.setAttribute('aria-describedby','mood-film-finish-note');
    note.id='mood-film-finish-note';note.setAttribute('role','tooltip');
    title.append(help);
  }
  const sync=(input,output)=>{output.textContent=input.value+'%';input.style.setProperty('--moods-progress',input.value+'%');};
  for(const [key,label] of [['grain','Grain'],['glow',compact?'Bloom':'Glow']]){
    const row=document.createElement('label'),caption=document.createElement('span');
    caption.textContent=label;
    const output=document.createElement('output'),input=document.createElement('input');
    input.type='range';input.min='0';input.max='100';input.step='1';input.setAttribute('aria-label','Film '+label.toLowerCase());
    row.append(caption,output,input);container.append(row);fields.set(key,{input,output});
    input.oninput=()=>{sync(input,output);onChange();};
  }
  const api={
    get:()=>filmFinishSettings({version:1,...Object.fromEntries([...fields].map(([key,{input}])=>[key,Number(input.value)]))}),
    set(value=HONG_KONG_FILM_FINISH){const settings=filmFinishSettings(value);for(const [key,{input,output}] of fields){input.value=String(settings[key]);sync(input,output);}},
    lock(value){for(const {input} of fields.values())input.disabled=value;}
  };
  api.set();return api;
}
