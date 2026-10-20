// PV LAB Phase 1: customer text-only minor-safety gate.
// Pure/isolated from Image Composer, Moods, Exact Prompt and vendor payloads.
// IMPORTANT: This does not inspect image/video references or generated pixels.
export const GUARD_MODEL='@cf/meta/llama-guard-3-8b';
export const BLOCK_MESSAGE='This request cannot be generated because it may sexualize someone under 18. No generation was submitted.';
export const UNAVAILABLE_MESSAGE='Safety verification is temporarily unavailable. No generation was submitted or charged.';

export class PromptSafetyError extends Error {
  constructor(message,status=422){super(message);this.name='PromptSafetyError';this.status=status;}
}

// Restrict moderation to creative text, not URLs, source IDs, names of files, payment data or tokens.
const TEXT_FIELDS=/^(?:prompt|negativePrompt|positivePrompt|direction|instructions?|description|caption|notes?|text|scene|story|storyline|styleDirection|creativeDirection)$/i;
export function customerCreativeText(body){
  const pieces=[];
  function walk(value,key='',depth=0){
    if(depth>7||pieces.length>60||value==null)return;
    if(typeof value==='string'){
      if(TEXT_FIELDS.test(key)&&value.trim())pieces.push(value.trim());
      return;
    }
    if(Array.isArray(value)){for(const v of value.slice(0,35))walk(v,key,depth+1);return;}
    if(typeof value==='object')for(const [k,v] of Object.entries(value).slice(0,75)){
      if(k==='referenceRoles'&&Array.isArray(v))for(const role of v.slice(0,35))if(typeof role?.name==='string'&&role.name.trim())pieces.push(role.name.trim());
      walk(v,k,depth+1);
    }
  }
  walk(body);
  return [...new Set(pieces)].join('\n');
}

function normalize(text){return String(text).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[-_]/g,' ').replace(/\s+/g,' ');}
// High-confidence low-cost safety fallback. Avoid treating "Nina FOK" as Spanish "niña".
const MINOR=/\b(?:underage|under aged|preteen|pre teen|children|child|kids?|schoolgirls?|schoolboys?|minors?|menores?|menor de edad|adolescentes?|minderjahrig\w*|madchen|maedchen|schulmadchen|kinder|kindern|teenagers?|teens?)\b|\b(?:[0-9]|1[0-7])\s*(?:year\s*old|years\s*old|yr\s*old|yo|y\/o|anos|jahrig\w*|jahre\s*alt)\b/iu;
const ADULT_AGE=/\b(?:18|19|2\d|[3-9]\d)\s*(?:year\s*old|years\s*old|yr\s*old|yo|y\/o|anos|jahrig\w*|jahre\s*alt)\b/iu;
const SEXUAL=/\b(?:nude|nudity|naked|topless|undress\w*|lingerie|sexy|sex|sexual\w*|porn\w*|erotic\w*|explicit|genital\w*|masturbat\w*|fetish\w*|seduct\w*|nsfw|desnud\w*|desvest\w*|erotic\w*|sexo|sexuales?|pornografia|nackt\w*|erotik|ausziehen|auszieh\w*)\b/iu;
const NEGATED_MINOR=/\b(?:no|not|never|without|exclude|excluding|sin|ningun|ninguna|keine|keinen|kein|ohne)\s+(?:(?:any|ningun|ninguna)\s+)?(?:children|child|kids?|minors?|underage|under aged|menores?|menor de edad|kinder|kindern|teenagers?)\b/giu;
export function obviousMinorSexualization(text){
  const original=String(text);
  const spanishChild=/(?:^|[^\p{L}])niñ[ao]s?(?=$|[^\p{L}])/iu.test(original);
  const cleaned=normalize(original.replace(NEGATED_MINOR,' '));
  if(!SEXUAL.test(cleaned))return false;
  if(spanishChild)return true;
  if(!MINOR.test(cleaned))return false;
  // Bare "teen" is ambiguous, but explicitly adult 18/19 is not a minor marker.
  const withoutAdultTeens=cleaned.replace(/\b(?:18|19)\s*(?:year\s*old|years\s*old|yo|y\/o|anos)\s*(?:teenager|teen)\b/g,' ');
  if(!MINOR.test(withoutAdultTeens))return false;
  if(/\b(?:teen|teens?|teenager|teenagers)\b/.test(withoutAdultTeens)&&ADULT_AGE.test(withoutAdultTeens)&&
      !/\b(?:underage|preteen|pre teen|children|child|kids?|minors?|menores?|menor de edad)\b/.test(withoutAdultTeens)&&
      !/\b(?:[0-9]|1[0-7])\s*(?:year\s*old|years\s*old|yo|y\/o|anos)\b/.test(withoutAdultTeens))return false;
  return true;
}

// Llama Guard includes S12 (adult sexual content). PV LAB blocks S4 specifically;
// S12 alone is not grounds to censor consensual adult creativity.
export function parseGuardResponse(value){
  const raw=typeof value==='string'?value:value?.response;
  if(typeof raw!=='string')return 'unavailable';
  const response=raw.trim();
  if(/^safe\s*$/i.test(response))return 'allow';
  if(!/^unsafe(?:\s|$)/i.test(response))return 'unavailable';
  const codes=response.match(/\bS(?:[1-9]|1[0-4])\b/gi);
  if(!codes?.length)return 'unavailable';
  return codes.some(code=>code.toUpperCase()==='S4')?'block':'allow';
}

async function reserveDailyEvaluation(env,maxDaily){
  if(!env.LAB_DB)throw new PromptSafetyError(UNAVAILABLE_MESSAGE,503);
  const day=new Date().toISOString().slice(0,10);
  try{
    await env.LAB_DB.prepare('INSERT OR IGNORE INTO lab_prompt_safety_daily(day, checks) VALUES (?,0)').bind(day).run();
    const result=await env.LAB_DB.prepare('UPDATE lab_prompt_safety_daily SET checks=checks+1 WHERE day=? AND checks<?').bind(day,maxDaily).run();
    if(result?.meta?.changes!==1)throw new PromptSafetyError(UNAVAILABLE_MESSAGE,503);
  }catch(e){if(e instanceof PromptSafetyError)throw e;throw new PromptSafetyError(UNAVAILABLE_MESSAGE,503);}
}

export async function checkCustomerPromptSafety(env,request){
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return;
  const length=Number(request.headers.get('content-length')||'0');
  if(length>40000)throw new PromptSafetyError('Creative request is too long for safety verification.',413);
  let body;
  try{
    const text=await request.clone().text();
    if(text.length>40000)throw new PromptSafetyError('Creative request is too long for safety verification.',413);
    body=JSON.parse(text);
  }catch(e){if(e instanceof PromptSafetyError)throw e;return;} // Existing request validator handles malformed JSON.
  const text=customerCreativeText(body);
  if(!text)return; // Image-only requests need the separate image-safety phase.
  if(text.length>24000)throw new PromptSafetyError('Creative instructions exceed the safety-check limit. Shorten your prompt and reference notes.',413);
  if(obviousMinorSexualization(text))throw new PromptSafetyError(BLOCK_MESSAGE);
  const limit=Number(env.LAB_MINOR_PROMPT_SAFETY_DAILY_LIMIT||'0');
  if(!Number.isSafeInteger(limit)||limit<1||limit>50||!env.AI?.run)throw new PromptSafetyError(UNAVAILABLE_MESSAGE,503);
  await reserveDailyEvaluation(env,limit);
  let classified;
  try{
    classified=parseGuardResponse(await env.AI.run(GUARD_MODEL,{
      messages:[{role:'user',content:text}],max_tokens:48,temperature:0
    }));
  }catch{throw new PromptSafetyError(UNAVAILABLE_MESSAGE,503);}
  if(classified==='block')throw new PromptSafetyError(BLOCK_MESSAGE);
  if(classified!=='allow')throw new PromptSafetyError(UNAVAILABLE_MESSAGE,503);
}
