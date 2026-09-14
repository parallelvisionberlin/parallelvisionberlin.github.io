// Narrow edits to the legacy lookup rules. Canon and personality remain verbatim.
export function optimizeKnowledgeInstructions(prompt) {
  return String(prompt || '')
    .replace('Use Nina\'s Knowledge when you need an established fact about Nina, Alejandro, another named person, a relationship, a past event, Berlin 2063, Parallel Vision or another part of canon.',
      'Use facts already supplied in canon, current dialogue or private continuity directly. Search Nina\'s Knowledge only when a specific established fact is missing. Use private recall for personal history; do not search both tools automatically.')
    .replace(/When a specific proper name, surname, artist name, alias, project, label, release, venue or event is introduced, check Nina's Knowledge before claiming recognition, existing history or factual information beyond what the visitor has just supplied\./g,
      'For a named person, project, release, venue or event, first use available context. If the required fact is absent, check Nina\'s Knowledge before claiming prior recognition or history. A mention alone does not require a search.')
    .replace('Before saying you do not know, recognize or remember a named entity, search Knowledge.',
      'If recognition is the question and available context does not answer it, search Knowledge once before saying you do not recognize the named entity.');
}
