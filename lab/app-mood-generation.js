import {loadLabAccount} from './native-account.js?v=20261012-unified-header1&studioAuth=20261015-1';
import {createSessionRequest} from './session-request.js?v=20260927-auth1&studioAuth=20261015-1';
import {prepareMoodPrompt} from './moods.js?hkRealPhotos=20261018v2&filmOptics=2&app=5&raveNight=4&syntheticBudget=1&hongKongRefs=4&dreamcore=7&syntheticRefs=1&raveIdentity=1&filmRevision=4&hkContinuity=4&hkScene=5&hkCinematography=1&midnightFlashV2=1&moodLock=20261014-mood-consistency1&dreamBlur=20261015v1&filmCapture=20261016-preserve1&hkPhoto=20261018v1&hkVariants=20261018-real1&hkRestore=20261018v1&hkFidelity=20261018v2&hkAtmosphere=20261019v1&hkCanon=20261020v1&hkImage3=20261020v1&hkLight=20261021v10&fisheye=20261020v1';
import {createMoodReferenceLoader,moodReferencePlan} from './mood-references.js?hkRealPhotos=20261018v2&dreamBlurBudget=20261016v1&v=20261013-compact-map2&raveIdentity=1&filmRevision=4&hkContinuity=4&hkScene=5&hkCinematography=1&midnightFlashV2=1&refMode=20261014-contextual-reference1&moodLock=20261014-mood-consistency1&dreamBlur=20261015v1&internalReference=20261016v2&dreamBlurNotes=20261018v1&refOnlyDreamBlurFix=20261018v1&hkPhoto=20261018v1&hkVariants=20261018-real1&hkRestore=20261018v1&fisheye=20261020v1';
import {normalizeReferenceLabel} from './reference-guidance.js?dreamBlurBudget=20261016v1&v=20261013-compact-map2&dreamcore=7&syntheticRefs=1&raveIdentity=1&refMode=20261014-contextual-reference1&refOnlyDreamBlurFix=20261018v1&fisheye=20261020v1';
import {imageDimensions,seedreamWorkingCopy,providerWorkingCopy,PROVIDER_IMAGE_LIMIT} from './image-tools.js?v=20261011-reference-prewarm1';
import {pricedBoundQuotes,imageAutoRatio} from './image-credit-preview.js?v=20261010-customer-credits1&imageRatio=20261016-inherit1';

// Reuse the authenticated Worker, original uploads, Mood recipes and bound quotes.
// Browsing is public. Neither preparing a price nor selecting a photo submits a job.
export function createAppMoodGeneration(){
  let account=null,loading=null,revision=0,sourceSession=null,sourceUploads=new WeakMap();
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
  const moodReferences=createMoodReferenceLoader({upload});
  // An unchanged photograph is uploaded once per authenticated session, even
  // if its direction is edited several times before final confirmation.
  function uploadSourceOnce(file,sessionId){
    if(sourceSession!==sessionId){sourceSession=sessionId;sourceUploads=new WeakMap();}
    let pending=sourceUploads.get(file);
    if(!pending){
      pending=upload(file);
      sourceUploads.set(file,pending);
      pending.catch(()=>{if(sourceUploads.get(file)===pending)sourceUploads.delete(file);});
    }
    return pending;
  }
  return {
    // Read-only status and result routes. The quote's submit() remains the sole
    // paid action; polling and fetching assets never create another job.
    jobStatus(id){return api('/api/jobs/'+encodeURIComponent(id));},
    outputBlob(id){return api('/api/assets/'+encodeURIComponent(id),{blob:true});},
    previewBlob(id){return api('/api/jobs/'+encodeURIComponent(id)+'/preview',{blob:true});},
    cancel(){revision++;},
    async onAccountChange(listener){return (await identity()).addListener(listener);},
    async signIn(){const user=await identity();if(!user.isSignedIn)user.openSignIn();return user.isSignedIn;},
    async prepare(file,mood,direction,moodVariant='original'){
      const preparationStarted=performance.now();
      const stamp=++revision,user=await identity();
      if(!user.isSignedIn){const error=Error('Sign in to generate. Your photograph stays here.');error.code='SIGN_IN';throw error;}
      const sessionId=user.session.id;
      const check=()=>{if(stamp!==revision||!account?.isSignedIn||account.session?.id!==sessionId)throw Error('The photograph or session changed. Please try again.');};
      // Image metadata and authenticated session validation can happen together.
      const [session,dimensions]=await Promise.all([api('/api/session'),file?imageDimensions(file):Promise.resolve(null)]);check();
      if(session.customer&&!session.generationReady){
        // Respect production rollout, payment and account-review restrictions.
        // Surface the actual reason rather than suggesting a broken Mood/model.
        let code='GENERATION_UNAVAILABLE';
        let message='Image generation is not available for this account right now. No credits were spent.';
        if(session.accountClosed){
          code='ACCOUNT_CLOSED';message='This PV LAB account is closed. Image generation is unavailable.';
        }else if(session.billingReview){
          code='BILLING_REVIEW';message='Generation is paused while billing is under review. Contact support for help.';
        }else if(session.trialGenerationPaused&&session.billingReady){
          code='TRIAL_PAUSED';message='Complimentary generations are temporarily paused. Purchased credits can still be used. Your existing credits and saved work remain intact.';
        }else if(session.promotionReview){
          code='ACCOUNT_REVIEW';message='Free generation is unavailable for this account. Contact PV LAB support for an account review.';
        }
        const error=new Error(message);error.code=code;throw error;
      }
      if(!session.config?.enabled)throw Error('Image generation is currently unavailable.');
      if(!file&&!direction.trim())throw Error('Add a photograph or describe what you want to create.');
      check();
      if(dimensions&&(Math.min(dimensions.width,dimensions.height)<240||Math.max(dimensions.width,dimensions.height)>8000||Math.max(dimensions.width/dimensions.height,dimensions.height/dimensions.width)>8))throw Error('Choose a photograph between 240 and 8,000 pixels per side.');
      const recipe=prepareMoodPrompt(direction,mood.id,mood.defaultIntensity||70,{engine:'seedream',referenceCount:file?1:0,referenceMode:'base',moodVariant});
      if(recipe.error)throw Error(recipe.error);
      // Photobooth favors faster first results at 1K. Studio keeps its independent HD selector.
      const settings={type:'image',engine:'seedream',processing:'normal',referenceMode:'base',mode:'image',prompt:recipe.prompt,...recipe.metadata,resolution:'1k',aspectRatio:imageAutoRatio({values:['16:9','9:16','1:1','4:3','3:4','3:2','2:3','4:5','5:4','21:9'],reference:dimensions}),outputFormat:'png',referenceRoles:file?[normalizeReferenceLabel({name:file.name,role:'base'})]:[]};
      moodReferencePlan(settings); // Validate the complete prompt before any source or Style upload.
      // Prepare the person's Base photo and four Mood Style photos in parallel.
      // Quote is still requested only once all exact input IDs are validated.
      const prepareBase=async()=>{
        const original=file?await uploadSourceOnce(file,sessionId):null;check();
        let transfer=original?.id,copy=file;
        if(dimensions&&dimensions.width*dimensions.height>36000000){copy=await seedreamWorkingCopy(copy);check();}
        if(copy&&copy.size>PROVIDER_IMAGE_LIMIT){copy=await providerWorkingCopy(copy);check();}
        if(copy&&copy!==file){transfer=(await upload(copy)).id;check();}
        return {original,transfer};
      };
      const [{original,transfer},curated]=await Promise.all([
        prepareBase(),moodReferences.prepare(settings,{sessionKey:sessionId,check})
      ]);check();
      const styleIds=curated.references.map(ref=>ref.id);
      const quote=await api('/api/quotes',{method:'POST',body:{sourceId:null,lastSourceId:null,referenceSourceIds:[...(original?[original.id]:[]),...styleIds],transferSourceIds:[...(transfer?[transfer]:[]),...styleIds],settings:curated.settings}});check();
      if(!quote?.id||quote.settings?.engine!=='seedream'||quote.settings?.moodId!==mood.id||quote.settings?.moodVariant!==recipe.metadata.moodVariant||!Number.isFinite(quote.expiresAt)||quote.expiresAt<=Date.now()||!Number.isFinite(quote.maxUsd))throw Error('Could not verify the generation price. Try again.');
      // Owner and customer see the exact same server-bound retail credit cost.
      // Owner testing is not a wallet charge; the label previews customer pricing.
      const label=pricedBoundQuotes(quote,1,'SpicyAPI').credits+' credits';
      let submitted=false;
      const preparationMs=Math.round(performance.now()-preparationStarted);
      return {label,expiresAt:quote.expiresAt,handoff(){check();if(submitted)throw Error('This request was already sent. Check Image.');if(Date.now()>=quote.expiresAt)throw Error('Price expired. Check the price again.');return {userId:user.user.id,quote,sourceId:original?.id||null};},async submit(){
        check();if(submitted)throw Error('This request was already sent. Check Gallery.');
        if(Date.now()>=quote.expiresAt)throw Error('Price expired. Check the price again.');
        submitted=true;
        const submittedAt=performance.now();
        const response=await api('/api/jobs',{method:'POST',body:{quoteId:quote.id,confirm:true}});
        const jobId=response?.job?.id;
        // Metrics are non-billable and best effort; timing never delays the result.
        if(jobId)void api('/api/jobs/'+encodeURIComponent(jobId)+'/performance',{method:'POST',
          body:{clientPreparationMs:preparationMs,clientSubmitMs:Math.round(performance.now()-submittedAt)}
        }).catch(()=>{});
        return response;
      }};
    }
  };
}
