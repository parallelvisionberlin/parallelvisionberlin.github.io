const COLLECTIONS = ['summary_items', 'pinned_memories', 'open_threads', 'resolved_threads'];
const DECISIONS = new Set(['NEW', 'UPDATE_EXISTING', 'DUPLICATE', 'REJECT']);
const SAFE_REASONS = new Set([
  'invalid_shape', 'missing_evidence', 'validation_failed', 'unknown_target',
  'unsupported_operation', 'output_limit'
]);

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const counts = () => ({ candidates: 0, accepted: 0, intentionallyRejected: 0, invalid: 0 });

export function completeExtractionShape(value) {
  return object(value) && COLLECTIONS.every(key => Array.isArray(value[key]));
}

function candidateShapeReason(collection, candidate) {
  if (!object(candidate)) return 'invalid_shape';
  if (!Array.isArray(candidate.evidence_message_ids) || !candidate.evidence_message_ids.length
    || !candidate.evidence_message_ids.every(nonempty)) return 'missing_evidence';
  if (collection === 'resolved_threads') return nonempty(candidate.thread_id) ? null : 'invalid_shape';
  if (!nonempty(candidate.content)) return 'invalid_shape';
  // Storage keeps at most 500 characters. Retry instead of silently truncating a fact.
  if (candidate.content.length > 500) return 'output_limit';
  if (collection !== 'pinned_memories') return null;
  if (!nonempty(candidate.category)) return 'invalid_shape';
  // Older reviewed recovery payloads omit NEW; preserve that supported input.
  const decision = candidate.decision ?? 'NEW';
  if (!DECISIONS.has(decision)) return 'unsupported_operation';
  if (decision === 'UPDATE_EXISTING' && !nonempty(candidate.existing_memory_id)) return 'unknown_target';
  return null;
}

/**
 * Account for every model candidate before any writes or cursor advancement.
 * inspectCandidate(collection, candidate, index) validates actual evidence and
 * semantics against the current visitor's input. It returns { accepted: true }
 * or { accepted: false, reason: <fixed code> }. DUPLICATE / UPDATE_EXISTING also
 * require existingTargetVerified: true after checking that visitor's records.
 * REJECT is a deliberate omission only if its source and shape are verified.
 *
 * Aggregate filtered counts cannot establish completeness: deterministic facts,
 * valid siblings, or a valid item in another collection can hide rejected output.
 * No candidate text, identifiers, callback error, or provider output is returned.
 */
export function assessExtractionIntegrity(extracted, { inspectCandidate } = {}) {
  const diagnostics = {
    ...counts(),
    byCollection: Object.fromEntries(COLLECTIONS.map(key => [key, counts()])),
    reasons: {}
  };
  const reject = (collection, reason) => {
    const safeReason = SAFE_REASONS.has(reason) ? reason : 'validation_failed';
    diagnostics.invalid++;
    if (collection) diagnostics.byCollection[collection].invalid++;
    diagnostics.reasons[safeReason] = (diagnostics.reasons[safeReason] || 0) + 1;
  };
  if (!completeExtractionShape(extracted)) {
    reject(null, 'invalid_shape');
    return { valid: false, empty: false, reason: 'invalid_extraction', diagnostics };
  }
  for (const collection of COLLECTIONS) {
    extracted[collection].forEach((candidate, index) => {
      diagnostics.candidates++;
      diagnostics.byCollection[collection].candidates++;
      const shapeReason = candidateShapeReason(collection, candidate);
      if (shapeReason) {
        reject(collection, shapeReason);
        return;
      }
      let inspection;
      try {
        inspection = inspectCandidate?.(collection, candidate, index);
      } catch {
        reject(collection, 'validation_failed');
        return;
      }
      if (inspection?.accepted !== true) {
        reject(collection, inspection?.reason);
        return;
      }
      const decision = collection === 'pinned_memories' ? candidate.decision : null;
      if ((decision === 'DUPLICATE' || decision === 'UPDATE_EXISTING')
        && inspection.existingTargetVerified !== true) {
        reject(collection, 'unknown_target');
        return;
      }
      const field = decision === 'REJECT' ? 'intentionallyRejected' : 'accepted';
      diagnostics[field]++;
      diagnostics.byCollection[collection][field]++;
    });
  }
  const valid = diagnostics.invalid === 0;
  return { valid, empty: diagnostics.candidates === 0, reason: valid ? null : 'invalid_extraction', diagnostics };
}

const safeCount = value => typeof value === 'number' && Number.isFinite(value)
  ? Math.min(100000, Math.max(0, Math.trunc(value))) : 0;

// A single repair attempt can use these instructions with the original input.
// Only fixed codes and numeric counts are copied; never echo rejected model text.
export function makeExtractionRepairInstructions(diagnostics = {}) {
  const rejected = COLLECTIONS.map(key => `${key}: ${safeCount(diagnostics?.byCollection?.[key]?.invalid)}`).join(', ');
  const reasons = [...SAFE_REASONS]
    .filter(key => safeCount(diagnostics?.reasons?.[key]) > 0)
    .map(key => `${key}: ${safeCount(diagnostics.reasons[key])}`).join(', ') || 'validation_failed';
  return `The previous extraction failed validation and no memory changes from it were saved. Recreate the extraction from the original supplied messages and current records.
Invalid candidate counts: ${rejected}.
Validation reason counts: ${reasons}.
Return one complete JSON object with all four arrays. Keep each content field below 200 characters and cite at most two real source message IDs from the supplied messages.
Name the correct subject explicitly in every fact. Correct unattributed fragments, missing evidence, unsupported categories and invalid target references instead of repeating them.
UPDATE_EXISTING requires an existing_memory_id belonging to a supplied record. DUPLICATE must refer to a genuinely matching existing record; include that existing_memory_id. Use NEW when there is no matching stored record.
Only resolve supplied active thread IDs. Use only supplied summary reference IDs when replacing earlier summary facts.
Intentionally omit greetings, unsupported claims and content excluded by the memory instructions. An explicit REJECT still needs a valid category, content and actual source IDs.
Preserve supported useful facts and corrections. Return all-empty arrays only when there is genuinely nothing worth remembering, updating or resolving.`;
}
