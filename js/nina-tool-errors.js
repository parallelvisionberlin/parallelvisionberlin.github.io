// Tool failures may embed request URLs or credentials. Keep a bounded redacted explanation.
export function sanitizeToolError(value) {
  if(typeof value!=='string')return '';
  return value
    .replace(/https?:\/\/[^\s"'<>]+/gi,'[url]')
    .replace(/Bearer\s+[^\s,;"']+/gi,'Bearer [redacted]')
    .replace(/(?:sk|pk)_(?:live|test)_[A-Za-z0-9]+/g,'[redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,'[redacted]')
    .replace(/\b[a-f0-9]{64}\b/gi,'[redacted]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]')
    .replace(/\{[\s\S]*$/,'[payload omitted]')
    .replace(/[\r\n\t]+/g,' ').slice(0,180);
}
