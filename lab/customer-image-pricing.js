// A quote is only a preview, never permission to bill. The existing Worker
// verifies wallet balances and vendor quote IDs again during paid submission.
export function createCustomerImagePricing({snapshot,quote,changed,clock=Date.now,delay=850}){
  let timer=null,expiryTimer=null,sequence=0;
  let state={status:'idle',key:null};
  const clear=()=>{clearTimeout(timer);clearTimeout(expiryTimer);timer=null;expiryTimer=null;};
  const valid=s=>!!(s&&s.key&&state.key===s.key);
  function reset(){
    if(state.status==='idle')return;
    sequence++;clear();state={status:'idle',key:null};
  }
  function start(s,immediate=false){
    sequence++;clear();
    state={status:'checking',key:s.key};
    const token=sequence;
    timer=setTimeout(()=>{timer=null;void run(s,token);},immediate?0:delay);
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
    if(token===sequence)changed();
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
  return {sync,retry,consume,reset,current:()=>state};
}
