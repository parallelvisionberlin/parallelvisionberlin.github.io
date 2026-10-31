// Local request handoff, not a provider queue or a payment authorization.
// Reserve a client-side slot while a frozen Seedream request prepares and quotes.
export const IMAGE_SUBMIT_COOLDOWN_MS=2000;
export function createImageSubmitHandoff({clock=Date.now}={}){
  const pending=new Map(),cooldowns=new Map();
  let sequence=0;
  const cooling=key=>!!key&&(cooldowns.get(key)||0)>clock();
  return {
    // A repeated click is accidental only during the short cooldown. The
    // reservation itself survives until acknowledgement so slots stay honest.
    has(key){return cooling(key);},
    reserve(key,provider,count=1){
      if(!key||!provider||!Number.isInteger(count)||count<1||cooling(key))return null;
      for(const [draft,until] of cooldowns)if(until<=clock())cooldowns.delete(draft);
      const ticket=Object.freeze({key,provider,count,id:++sequence});
      pending.set(ticket.id,ticket);
      cooldowns.set(key,clock()+IMAGE_SUBMIT_COOLDOWN_MS);return ticket;
    },
    release(ticket){
      if(ticket&&pending.get(ticket.id)===ticket)pending.delete(ticket.id);
    },
    slots(provider){
      let n=0;
      for(const ticket of pending.values())if(ticket.provider===provider)n+=ticket.count;
      return n;
    },
    active(){return pending.size;},
    clear(){pending.clear();cooldowns.clear();}
  };
}
