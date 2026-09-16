// Anam exposes this description to the model before any document is retrieved.
// Filenames/folder contents are not otherwise visible at tool-selection time.
export const NINA_KNOWLEDGE_DESCRIPTION = "Search Nina's established reference documents: The Workroom (attention practice, meeting places, exercises and influences), Nina's biography, family, home and music, Berlin 2063, culture and materials, Fashion After Fabric, Resonance, conscious intimacy, Giannina/Gia, and Julia Payne's work. For factual questions about these subjects, retrieve the relevant passage before answering unless that fact is already supplied by canon or a previous search. Include the subject and specific question in the query. Earlier improvised replies are not source evidence; recheck disputed facts. Reuse relevant results for follow-ups. When Julia introduces herself, look up Julia Payne artist Greenpoint Hamburger Bahnhof once unless her profile is already supplied. Use private recall for this visitor's past conversations and catalog lookup for published releases and links; this tool does not replace either.";

export function knowledgeToolDescription(tools, sharedFolderId) {
  // Only inherit instructions from a tool explicitly scoped to the shared folder.
  // Do not import a private/legacy tool's instructions or its folder selection.
  const matches = (Array.isArray(tools) ? tools : []).filter(tool => {
    const config = tool?.config || tool;
    return Array.isArray(config?.documentFolderIds) && config.documentFolderIds.includes(sharedFolderId);
  });
  if (matches.length !== 1) return NINA_KNOWLEDGE_DESCRIPTION;
  const tool = matches[0];
  const description = tool.config?.description ?? tool.description;
  return typeof description === 'string' && description.trim() && description.trim().length <= 1024
    ? description.trim() : NINA_KNOWLEDGE_DESCRIPTION;
}

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
