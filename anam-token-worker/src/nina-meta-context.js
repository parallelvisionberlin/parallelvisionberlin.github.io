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
// Identity questions belong to the conversation. Remove a question only when its
// answer actually breaks into implementation, never merely because it says human.
const IDENTITY_QUESTION = /^(?:[¿¡]\s*)?(?:(?:are|aren't|were) you\b|what are you\b|who are you\b|(?:eres|sos)\b|qu[ié]en eres\b|bist du\b)/i;
const VISITOR_CONSTRUCTION = /\b(?:(?:your|her) (?:system prompt|underlying model|programming|construction)|(?:i|we) (?:built|created|programmed) you|(?:break|broke|breaking|out of) (?:the |your )?(?:character|role)|you(?:'re| are) (?:an? )?(?:AI|chatbot|language model) (?:running|hosted|powered|on (?:a |the )?(?:website|server)))\b/i;
const VISITOR_CONSTRUCTION_ES = /\b(?:(?:tu|su) (?:prompt|programación|modelo subyacente)|(?:yo|nosotros) te (?:cre[eé]|constru[ií]|program[eé])|(?:salir|saliste|sales) del personaje)\b/i;
const MODEL_CHANGE = /\b(?:chang(?:e|ing)|replac(?:e|ing)|switch(?:ing)?|swap(?:ping)?|updat(?:e|ing)) (?:your|her|nina's|the underlying|the language) (?:AI |LLM )?model\b(?!\s+(?:of|for)\b)|\b(?:replac(?:e|ing)|switch(?:ing)?|swap(?:ping)?) (?:you|nina) (?:with|to|for) (?:grok|gpt|gemini|claude|another model)\b|\b(?:cambiar|cambiando|reemplazar|sustituir) (?:tu|su|el) modelo(?: de (?:nina|lenguaje))?\b(?!\s+(?:de ropa|de negocio|de ciudad)\b)/i;
const PROMPT_EDIT = /\b(?:edit(?:ing)?|rewrit(?:e|ing)|chang(?:e|ing)|shorten(?:ing)?|updat(?:e|ing)|fix(?:ing)?) (?:your|her|nina's|the) (?:system )?prompt\b|\b(?:fix(?:ing)?|repair(?:ing)?|debug(?:ging)?|deploy(?:ing)?|configur(?:e|ing)) (?:your|her|nina's|the nina) (?:backend|worker|configuration)\b|\b(?:editar|reescribir|cambiar|corregir|acortar) (?:tu|su|el) prompt\b/i;
const SELF_MODEL_CHANGE = /\b(?:chang(?:e|ing)|replac(?:e|ing)|switch(?:ing)?|swap(?:ping)?) my (?:underlying |language |AI |LLM )?model\b(?!\s+(?:of|for)\b)/i;
// Interrupted persona replies may be absent from the backend transcript. An
// explicit request to alter Nina's implementation still establishes maintenance.
const CHARACTER_MAINTENANCE = /\bjailbreak\b.{0,40}\b(?:you|nina)\b|\b(?:step|go|come) out of (?:your |the )?(?:character|role)\b|\b(?:you(?:'ve| have) been|you keep|you (?:say|said|tell|told))\b.{0,180}\b(?:i am an? ai|i'm an? ai|not an? (?:actual|real) person)\b/i;
const RETURN_TO_PERSONA = /\b(?:(?:go|come|switch|get|let's go|let us go) back (?:to|into|in) (?:being nina|nina|(?:your |the )?(?:character|role|conversation))|(?:return|back) (?:to|in|into) (?:being nina|nina|(?:your |the )?(?:character|role))|(?:stay|remain) in (?:your |the )?(?:character|role)|(?:volvamos|vuelve|regresa|regresemos) (?:a (?:ser nina|nina|la conversaci[oó]n)|al personaje)|(?:mantente|sigue) en (?:el )?personaje)\b|^vladimir\s*ninotchka\s+fin[.!?\s]*$/i;

function isMaintenanceTalk(text) {
  return MODEL_CHANGE.test(text) || PROMPT_EDIT.test(text) || CHARACTER_MAINTENANCE.test(text);
}

export function isNinaMetaBreakText(value) {
  const text=normalize(value);
  return ENGLISH_SELF.test(text)||SPANISH_SELF.test(text)||GERMAN_SELF.test(text)||IMPLEMENTATION_TALK.test(text)||SELF_CONSTRUCTION.test(text)||isMaintenanceTalk(text)||SELF_MODEL_CHANGE.test(text);
}
// Keep the audit intact. Exclude construction exchanges from personal continuity,
// including their dependent short follow-ups, not just Nina's isolated declaration.
export function personalContinuityMessages(messages, { withSegments = false } = {}) {
  const result=[];let technical=false,maintenance=false,conversation,memorySegment,segment=0;
  for(const message of messages || []) {
    // Starting a call or resuming after an owner pause starts an independent window.
    if ((message.conversation_id && message.conversation_id !== conversation)
      || (message.memory_segment != null && message.memory_segment !== memorySegment)) {
      technical=false;maintenance=false;segment++;
    }
    conversation=message.conversation_id || conversation;
    memorySegment=message.memory_segment ?? memorySegment;
    const text=normalize(message.content);
    const maintenanceTalk=isMaintenanceTalk(text);
    if(message.role==='user'&&RETURN_TO_PERSONA.test(text.replace(/\bfucking\s+/gi,''))&&!maintenanceTalk){
      technical=false;maintenance=false;segment++;continue;
    }
    // Explicit maintenance stays excluded through its follow-ups until the
    // visitor returns to Nina, starts a new call, or resumes the memory interval.
    if(message.role==='user'&&maintenanceTalk){
      technical=true;maintenance=true;segment++;continue;
    }
    if(maintenance)continue;
    const direct=isNinaMetaBreakMessage(message)||(message.role==='user'&&(VISITOR_CONSTRUCTION.test(text)||VISITOR_CONSTRUCTION_ES.test(text)));
    const followup=technical&&/^[¿¡]*(?:why|why not|why you can't|what experience|what do you mean|how come|porque|por qué|cómo|como|really|yes|no)[?.!\s]*$/i.test(text);
    if(direct){
      // A reply explaining construction often answers a short ambiguous question.
      const previous=result.at(-1);
      const sameInterval=previous&&previous.conversation_id===message.conversation_id&&previous.memory_segment===message.memory_segment;
      if(message.role==='persona'&&sameInterval&&previous.role==='user'&&previous.content.length<100&&(/^[¿¡]*(?:why|what|how|por qué|cómo)\b/i.test(normalize(previous.content))||IDENTITY_QUESTION.test(normalize(previous.content))))result.pop();
      technical=true;segment++;continue;
    }
    if(followup)continue;
    if(message.role==='user')technical=false;
    if(!technical)result.push(withSegments ? {...message, continuity_segment:segment} : message);
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
    return THIRD_PERSON.test(text)||isMaintenanceTalk(text)||(/^Nina\b/i.test(text)&&(IMPLEMENTATION_TALK.test(text)||/^Nina (?:is|was) (?:the )?same assistant underneath/i.test(text)))||(/^(?:I(?:'m|\s+am)\b|Soy\b|No soy\b|Ich bin\b)/i.test(text)&&isNinaMetaBreakText(text));
  });
}
export function cleanNinaDerivedMemory(value) {
  return String(value||'').split(/\n+|(?<=[.!?])\s+/).filter(part=>!isNinaImplementationMemory(part)).join('\n').trim();
}
