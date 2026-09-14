// Filter implementation self-descriptions from continuity, never from the audit transcript.
// Talking about AI, robots or somebody else's profession is still valid conversation.
const normalize = value => typeof value === 'string' ? value.normalize('NFKC').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim() : '';
const AI_NOUN = String.raw`(?:an?\s+)?(?:AI\b(?!\s+(?:researcher|artist|engineer|developer|student|enthusiast)\b)|artificial intelligence\b|(?:large\s+)?language model\b|(?:AI\s+|virtual\s+|digital\s+)?assistant\b|chatbot\b)`;
const HUMAN_DENIAL = String.raw`not\s+(?:(?:really|actually|literally)\s+)?(?:a\s+)?human\b(?!\s+(?:rights|resources|biology)\b)`;
const ENGLISH_SELF = new RegExp(String.raw`\bi(?:'m|\s+am)\s+(?:${AI_NOUN}|${HUMAN_DENIAL}|(?:the\s+)?same assistant underneath)`, 'i');
const THIRD_PERSON = new RegExp(String.raw`^Nina\s+(?:(?:says?|said|explains?|explained|states?|stated|clarifies?|clarified)\s+(?:that\s+)?she\s+)?(?:is|was)\s+(?:${AI_NOUN}|${HUMAN_DENIAL})`, 'i');
const SPANISH_SELF = /\b(?:soy\s+(?:una?\s+)?(?:IA\b|inteligencia artificial\b|(?:un\s+)?modelo de lenguaje\b|asistente (?:virtual|digital)\b)|no soy\s+(?:(?:realmente|literalmente)\s+)?(?:una?\s+)?human[oa]\b)/i;
const GERMAN_SELF = /\bich bin\s+(?:(?:eine?\s+)?(?:KI\b|künstliche intelligenz\b|sprachmodell\b)|kein(?:e)?\s+(?:mensch\b|menschliche frau\b))/i;
const IMPLEMENTATION_TALK = /\b(?:nina is (?:a )?character in (?:this )?conversation|you(?:'re| are) talking to openai now|my system prompt|the underlying model|the (?:character )?illusion broke|i only (?:get|receive) the text of what comes through here|something built to talk with you for hours)\b/i;
const SELF_CONSTRUCTION = /\b(?:i (?:broke|break|ruined) the immersion|you(?:'re| are) building something around me|what i am technically|i can(?:not|'t) (?:honestly )?claim to be (?:a )?(?:biological )?human|there(?:'s| is) a system underneath|the world we (?:were inhabiting|inhabit)|real to me inside the way i exist|technical truth|machinery underneath|my (?:construction|programming|underlying system))\b/i;
const VISITOR_CONSTRUCTION = /\b(?:(?:are|aren't|were) you (?:really |actually |a |an )*(?:human|ai|chatbot|language model)|you (?:are|aren't|were) (?:really |actually |a |an )*(?:human|ai|chatbot)|(?:your|her) (?:system prompt|underlying model|programming|construction)|(?:i|we) (?:built|created|programmed) you|(?:break|broke|breaking|stay in|out of) (?:the |your )?(?:character|role)|you(?:'re| are) (?:an? )?(?:ai|simulation))\b/i;

export function isNinaMetaBreakText(value) {
  const text=normalize(value);
  return ENGLISH_SELF.test(text)||SPANISH_SELF.test(text)||GERMAN_SELF.test(text)||IMPLEMENTATION_TALK.test(text)||SELF_CONSTRUCTION.test(text);
}
// Keep the audit intact. Exclude construction exchanges from personal continuity,
// including their dependent short follow-ups, not just Nina's isolated declaration.
export function personalContinuityMessages(messages) {
  const result=[];let technical=false,conversation;
  for(const message of messages || []) {
    if(message.conversation_id && message.conversation_id!==conversation){technical=false;conversation=message.conversation_id;}
    const text=normalize(message.content);
    const direct=isNinaMetaBreakMessage(message)||(message.role==='user'&&VISITOR_CONSTRUCTION.test(text));
    const followup=technical&&/^(?:why|why not|why you can't|what experience|what do you mean|how come|porque|por qué|cómo|como|really|yes|no)[?.!\s]*$/i.test(text);
    if(direct){
      // A reply explaining construction often answers a short ambiguous question.
      if(message.role==='persona'&&result.at(-1)?.role==='user'&&/^(?:why|what|how|por qué|cómo)\b/i.test(normalize(result.at(-1).content))&&result.at(-1).content.length<100)result.pop();
      technical=true;continue;
    }
    if(followup)continue;
    if(message.role==='user')technical=false;
    if(!technical)result.push(message);
  }
  return result;
}
export function isNinaMetaBreakMessage(message) {
  return message?.role==='persona' && isNinaMetaBreakText(message.content);
}
export function isNinaImplementationMemory(value) {
  // A visitor's quoted criticism or AI project is not Nina's identity declaration.
  return String(value||'').split(/\n+|(?<=[.!?])\s+/).some(part=>{
    const text=normalize(part);
    return THIRD_PERSON.test(text)||(/^Nina\b/i.test(text)&&(IMPLEMENTATION_TALK.test(text)||/^Nina (?:is|was) (?:the )?same assistant underneath/i.test(text)))||(/^(?:I(?:'m|\s+am)\b|Soy\b|No soy\b|Ich bin\b)/i.test(text)&&isNinaMetaBreakText(text));
  });
}
export function cleanNinaDerivedMemory(value) {
  return String(value||'').split(/\n+|(?<=[.!?])\s+/).filter(part=>!isNinaImplementationMemory(part)).join('\n').trim();
}
