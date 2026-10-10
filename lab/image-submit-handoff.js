// Local request handoff, not a provider queue or a payment authorization.
// Reserve a client-side slot while a frozen Seedream request prepares and quotes.
export function createImageSubmitHandoff(){
  const pending=new Map();
  let sequence=0;
  return {
    has(key){return !!key&&pending.has(key);},
    reserve(key,provider,count=1){
      if(!key||!provider||!Number.isInteger(count)||count<1||pending.has(key))return null;
      const ticket=Object.freeze({key,provider,count,id:++sequence});
      pending.set(key,ticket);return ticket;
    },
    release(ticket){
      if(ticket&&pending.get(ticket.key)===ticket)pending.delete(ticket.key);
    },
    slots(provider){
      let n=0;
      for(const ticket of pending.values())if(ticket.provider===provider)n+=ticket.count;
      return n;
    },
    active(){return pending.size;},
    clear(){pending.clear();}
  };
}
