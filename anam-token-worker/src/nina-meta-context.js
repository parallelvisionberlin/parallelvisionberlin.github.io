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

export function isNinaMetaBreakText(value) {
  const text=normalize(value);
  return ENGLISH_SELF.test(text)||SPANISH_SELF.test(text)||GERMAN_SELF.test(text)||IMPLEMENTATION_TALK.test(text);
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
