// A quote is only a preview, never permission to bill. The existing Worker
// verifies wallet balances and vendor quote IDs again during paid submission.
export function createCustomerImagePricing({snapshot,quote,changed,clock=Date.now,delay=850}){
  let timer=null,expiryTimer=null,inflight=null,sequence=0;
  let state={status:'idle',key:null};
  const clear=()=>{clearTimeout(timer);clearTimeout(expiryTimer);timer=null;expiryTimer=null;};
  const valid=s=>!!(s&&s.key&&state.key===s.key);
  function reset(){
    if(state.status==='idle')return;
    sequence++;clear();inflight=null;state={status:'idle',key:null};
  }
  function start(s,immediate=false){
    sequence++;clear();inflight=null;
    state={status:'checking',key:s.key};
    const token=sequence;
    timer=setTimeout(()=>{timer=null;inflight=run(s,token);},immediate?0:delay);
  }
  async function run(s,token){
    const check=()=>{
      if(token!==sequence||!valid(s)||snapshot()?.key!==s.key)
        throw new Error('The image settings changed before this quote completed.');
    };
    try{
      check();
      const priced=await quote(s,check);
      check();
      if(!Number.isSafeInteger(priced?.credits)||priced.credits<1||
         !Number.isFinite(priced.expiresAt)||priced.expiresAt<=clock()+18000)
        throw new Error('Pricing is not available for these settings. Nothing was charged.');
      state={status:'ready',key:s.key,...priced};
      expiryTimer=setTimeout(()=>{
        if(token===sequence&&state.key===s.key){
          const updated=snapshot();
          if(updated?.key===s.key){start(updated,true);changed();}
        }
      },Math.max(1000,priced.expiresAt-clock()-19000));
    }catch(error){
      if(token!==sequence||!valid(s))return;
      state={status:'error',key:s.key,message:error?.message||'Price lookup failed. Nothing was charged.'};
    }
    if(token===sequence){inflight=null;changed();}
  }
  // User-initiated Generate must never wait for the preview debounce. Reuse
  // its in-flight quote, or start it immediately, without a second vendor call.
  async function readyForClick(key){
    const selected=snapshot();
    if(!selected?.key||selected.key!==key)
      throw new Error('The image settings changed before the price could be confirmed. Nothing was charged.');
    sync(true);
    if(state.status==='ready')return state;
    if(state.status==='error')start(selected,true);
    if(timer){clearTimeout(timer);timer=null;inflight=run(selected,sequence);}
    if(!inflight)throw new Error('Could not start the image price check. Nothing was charged.');
    await inflight;
    const current=snapshot();
    if(current?.key!==key||state.key!==key)
      throw new Error('The image settings changed during price checking. Nothing was charged.');
    if(state.status!=='ready')throw new Error(state.message||'The live price could not be confirmed. Nothing was charged.');
    return state;
  }
  function prime(){
    const selected=snapshot();
    if(!selected?.key)return;
    sync(true);
    if(state.key===selected.key&&state.status==='checking'&&timer){
      clearTimeout(timer);timer=null;inflight=run(selected,sequence);
    }
  }
  function sync(enabled){
    if(!enabled){reset();return {status:'unavailable'};}
    const s=snapshot();
    if(!s?.key){reset();return {status:'unavailable'};}
    if(s.key!==state.key)start(s);
    else if(state.status==='ready'&&state.expiresAt<=clock()+18000)start(s,true);
    return state;
  }
  function retry(){
    const s=snapshot();
    if(!s?.key)return;
    start(s,true);changed();
  }
  function consume(key){
    const result=state.status==='ready'&&state.key===key&&state.expiresAt>clock()+15000?state:null;
    reset();
    return result;
  }
  return {sync,prime,readyForClick,retry,consume,reset,current:()=>state};
}
