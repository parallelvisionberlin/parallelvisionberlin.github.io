import {loadLabAccount} from './native-account.js?v=2';
import {createSessionRequest} from './session-request.js?v=20260927-auth1';
import {prepareMoodPrompt} from './moods.js?app=5&raveNight=4&syntheticBudget=1';
import {normalizeReferenceLabel} from './reference-guidance.js?v=20261010-reference-flow2';
import {imageDimensions,seedreamWorkingCopy,providerWorkingCopy,PROVIDER_IMAGE_LIMIT} from './image-tools.js?v=20261011-reference-prewarm1';
import {pricedBoundQuotes} from './image-credit-preview.js?v=20261010-customer-credits1';

// Reuse the authenticated Worker, original uploads, Mood recipes and bound quotes.
// Browsing is public. Neither preparing a price nor selecting a photo submits a job.
export function createAppMoodGeneration(){
  let account=null,loading=null,revision=0;
  const request=createSessionRequest({baseUrl:'https://parallel-vision-lab.parallelvision.workers.dev',getSession:()=>account?.session});
  async function identity(){
    if(account)return account;
    if(!loading)loading=loadLabAccount().then(value=>{account=value;return value;}).finally(()=>{loading=null;});
    return loading;
  }
  async function api(path,{body,blob=false,...options}={}){
    const headers={...options.headers};
    if(body!==undefined&&!(body instanceof Blob)){headers['Content-Type']='application/json';body=JSON.stringify(body);}
    const response=await request(path,{...options,headers,body,cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(path==='/api/jobs'?150000:65000)});
    if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.error||'Request failed. Please try again.');}
    return blob?response.blob():response.json();
  }
  const upload=file=>api('/api/uploads',{method:'POST',headers:{'Content-Type':file.type,'X-Filename':encodeURIComponent(file.name||'source.png')},body:file});
  return {
    cancel(){revision++;},
    async onAccountChange(listener){return (await identity()).addListener(listener);},
    async signIn(){const user=await identity();if(!user.isSignedIn)user.openSignIn();return user.isSignedIn;},
    async prepare(file,mood,direction){
      const stamp=++revision,user=await identity();
      if(!user.isSignedIn){const error=Error('Sign in to generate. Your photograph stays here.');error.code='SIGN_IN';throw error;}
      const sessionId=user.session.id;
      const check=()=>{if(stamp!==revision||!account?.isSignedIn||account.session?.id!==sessionId)throw Error('The photograph or session changed. Please try again.');};
      const session=await api('/api/session');check();
      if(session.customer&&!session.generationReady)throw Error('Image generation is not available for this account yet.');
      if(!session.config?.enabled)throw Error('Image generation is currently unavailable.');
      if(!file&&!direction.trim())throw Error('Add a photograph or describe what you want to create.');
      const dimensions=file?await imageDimensions(file):null;check();
      if(dimensions&&(Math.min(dimensions.width,dimensions.height)<240||Math.max(dimensions.width,dimensions.height)>8000||Math.max(dimensions.width/dimensions.height,dimensions.height/dimensions.width)>8))throw Error('Choose a photograph between 240 and 8,000 pixels per side.');
      const recipe=prepareMoodPrompt(direction,mood.id,mood.defaultIntensity||70,{engine:'seedream',referenceCount:file?1:0,referenceMode:'base'});
      if(recipe.error)throw Error(recipe.error);
      const original=file?await upload(file):null;check();
      let transfer=original?.id;
      let copy=file;
      if(dimensions&&dimensions.width*dimensions.height>36000000){copy=await seedreamWorkingCopy(copy);check();}
      if(copy&&copy.size>PROVIDER_IMAGE_LIMIT){copy=await providerWorkingCopy(copy);check();}
      if(copy&&copy!==file){transfer=(await upload(copy)).id;check();}
      const settings={type:'image',engine:'seedream',processing:'normal',referenceMode:'base',mode:'image',prompt:recipe.prompt,...recipe.metadata,resolution:'1k',aspectRatio:file?'auto':'16:9',outputFormat:'png',referenceRoles:file?[normalizeReferenceLabel({name:file.name,role:'base'})]:[]};
      const quote=await api('/api/quotes',{method:'POST',body:{sourceId:null,lastSourceId:null,referenceSourceIds:original?[original.id]:[],transferSourceIds:transfer?[transfer]:[],settings}});check();
      if(!quote?.id||quote.settings?.engine!=='seedream'||quote.settings?.moodId!==mood.id||!Number.isFinite(quote.expiresAt)||quote.expiresAt<=Date.now()||!Number.isFinite(quote.maxUsd))throw Error('Could not verify the generation price. Try again.');
      const label=session.customer?pricedBoundQuotes(quote,1,'SpicyAPI').credits+' credits':'$'+quote.maxUsd.toFixed(2)+' max';
      let submitted=false;
      return {label,expiresAt:quote.expiresAt,handoff(){check();if(submitted)throw Error('This request was already sent. Check Image.');if(Date.now()>=quote.expiresAt)throw Error('Price expired. Check the price again.');return {userId:user.user.id,quote,sourceId:original?.id||null};},async submit(){check();if(submitted)throw Error('This request was already sent. Check Gallery.');if(Date.now()>=quote.expiresAt)throw Error('Price expired. Check the price again.');submitted=true;return api('/api/jobs',{method:'POST',body:{quoteId:quote.id,confirm:true}});}};
    }
  };
}
