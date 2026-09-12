// Workers AI can return text, structured JSON, or a chat-completion envelope.
export function modelJson(output) {
  if(output?.choices?.[0]?.finish_reason==='length')return null;
  const value=output?.response ?? output?.choices?.[0]?.message?.content ?? output;
  if(value&&typeof value==='object'&&!Array.isArray(value))return value;
  if(typeof value!=='string')return null;
  const text=value.trim().replace(/^```(?:json)?\s*|\s*```$/g,'');
  const start=text.indexOf('{'),end=text.lastIndexOf('}');
  if(start<0||end<=start)return null;
  try{const parsed=JSON.parse(text.slice(start,end+1));return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:null;}catch{return null;}
}
