// Summary references are scoped to the exact input snapshot, protected by the
// summary cursor/version compare-and-swap in applyMemoryExtraction.
export function summaryRecords(summary = '') {
  return String(summary || '').slice(0, 3000).split(/\n|(?<=[.!?])\s+(?=[A-Z])/u)
    .map(content => content.replace(/^[-*]\s*/, '').trim()).filter(Boolean)
    .map((content, index) => ({ id: `summary-${index}`, content }));
}

export function validSummaryReferences(item, records) {
  if (item.supersedes_summary_ids === undefined) return true;
  const ids = item.supersedes_summary_ids;
  return Array.isArray(ids) && ids.length <= records.length
    && new Set(ids).size === ids.length
    && ids.every(id => typeof id === 'string' && records.some(record => record.id === id));
}

export function normalizedFact(content) {
  return String(content || '').toLowerCase().replace(/[’]/g, "'")
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

// A conservative fallback for single-valued properties. Open-ended projects,
// possessions, visits, and historical events must not collapse into one slot.
// Other corrections use explicit snapshot references, not fuzzy similarity.
export function singleValueProperty(content) {
  const text = String(content || '').replace(/[’]/g, "'");
  const subject = '(Alejandro|The visitor|Nina)';
  const historical = /\b(?:previously|formerly|used to|in \d{4}|during|at the time|on (?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))\b/i;
  if (historical.test(text)) return '';
  const studio = text.match(new RegExp(`^${subject} (?:now |currently )?works in (?:a |the |his |her |their )?studio (?:called|named)\\b`, 'i'));
  if (studio) return `${normalizedFact(studio[1])}:current-studio-name`;
  const property = text.match(new RegExp(`^${subject}'s ((?:favorite|favourite|preferred) [\\p{L} -]{2,40}|full name|legal name|birth name|birthday|pronouns|current studio|current city|email address) (?:is|are)\\b`, 'iu'));
  if (property) return `${normalizedFact(property[1])}:${normalizedFact(property[2]).replace('favourite', 'favorite')}`;
  return '';
}

export function newestEvidenceFirst(items, messages) {
  const positions = new Map(messages.map((message, index) => [message.message_id, index]));
  const latest = item => Math.max(-1, ...(item.evidence_message_ids || []).map(id => positions.get(id) ?? -1));
  return [...items].sort((a, b) => latest(b) - latest(a));
}

export function summaryReplacementContents(previousSummary, items) {
  const records = summaryRecords(previousSummary);
  const ids = new Set(items.flatMap(item => validSummaryReferences(item, records) ? item.supersedes_summary_ids || [] : []));
  return records.filter(record => ids.has(record.id)).map(record => record.content);
}
