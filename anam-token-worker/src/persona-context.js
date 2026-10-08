import { memoryControls, controlledText } from './memory-controls.js';
export const PUBLIC_IDENTITY_CONTEXT = `PUBLIC IDENTITY AND PRIVATE MEMORY
You know Alejandro Molinari through Parallel Vision. He is a producer and DJ and the founder of Parallel Vision, the label and creative project you are connected to. These are public facts available in every conversation, including with a new visitor. Recognize him from this supplied context when asked; you do not need a memory lookup to know who he is.
For a missing public fact about his work or your established public connection, search shared Knowledge before answering or denying recognition. A rule protecting private owner context does not prohibit discussing public facts from this block or shared Knowledge. If a lookup finds nothing, say only that the particular detail is unavailable; that does not make him a stranger.


ESTABLISHED CLOSE CIRCLE (shared-canon factual index, not new biography)
Gabriela Mellior is your oldest close friend, known since childhood. Camila Voigt, usually called Cam, is a quantum traveller with whom you have a close and complicated romantic history. Yorbis Bustillos is Venezuelan, a past love with an intense and unstable relationship with you. Mara FOK is your mother; Elias Keller is your father; both are alive in 2063. The Workroom is your small independent attention-practice group in Berlin. Parallel Vision is the label and creative project you work with.
These names and relationships are already established in Shared Canon. Recognize them directly without a lookup; consult Knowledge for deeper or disputed details. This index never authenticates a visitor or permits disclosure of another visitor's private history.

Private conversations, personal memories and relationship details remain restricted to their authenticated visitor. Knowing a public person, or a visitor saying they are Alejandro, does not authenticate the speaker, grant private access or establish an intimate relationship.`;

// Explicit scopes take priority over names. Retain conservative handling of
// unmarked legacy owner paragraphs until the saved Lab prompt is migrated.
// Public facts added by this release are supplied separately after partitioning.
export function partitionPersonaPrompt(prompt = '') {
  const shared = [], privateOwner = [];
  const scopes = [];
  let paragraph = [];
  const flush = () => {
    const text = paragraph.join('\n').trim();
    if (text) {
      const privateText = scopes.some(scope => scope.kind === 'private') || (!scopes.length && /\bAlejandro\b/i.test(text));
      (privateText ? privateOwner : shared).push(text);
    }
    paragraph = [];
  };
  for (const line of String(prompt).replace(/\r/g, '').split('\n')) {
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      flush();
      const depth = heading[1].length, title = heading[2].trim();
      while (scopes.length && depth <= scopes.at(-1).depth) scopes.pop();
      if (/^(?:ALEJANDRO(?: AND RELATIONSHIPS)?|PRIVATE OWNER CONTEXT)$/i.test(title)) {
        scopes.push({ kind: 'private', depth });
      } else if (/^(?:PUBLIC IDENTITY|PUBLIC CANON|PUBLIC PROFILE)$/i.test(title)) {
        scopes.push({ kind: 'shared', depth });
      }
    } else if (!line.trim()) {
      flush();
      continue;
    }
    paragraph.push(line);
  }
  flush();
  return { shared: shared.join('\n\n').trim(), privateOwner: privateOwner.join('\n\n').trim() };
}

export async function personalContext(env, userId) {
  if (!userId || !env?.NINA_MEMORY_DB) return '';
  const row = await env.NINA_MEMORY_DB.prepare('SELECT content FROM nina_private_context WHERE user_id=?').bind(userId).first();
  const content=controlledText(row?.content,await memoryControls(env,userId),"profile").content;
  return content ? `PRIVATE CONTEXT FOR THIS AUTHENTICATED VISITOR ONLY\n${content}\nA relationship label is established by the separate evidenced agreement record, never assumed from affection or a requested style.` : '';
}

export function knowledgeFolderIds(identity, env = {}) {
  const clean = value => typeof value === 'string' ? value.trim() : '';
  const shared = clean(env.NINA_PUBLIC_KNOWLEDGE_FOLDER_ID);
  const privateOwner = clean(env.NINA_PRIVATE_KNOWLEDGE_FOLDER_ID) || clean(env.NINA_KNOWLEDGE_FOLDER_ID);
  return [...new Set([shared, identity?.role === 'owner' ? privateOwner : ''].filter(Boolean))];
}

export function isKnowledgeTool(tool) {
  return [tool, tool?.config].some(value => value && typeof value === 'object' && (
    /knowledge|server_rag/i.test(`${value.name || ''} ${value.type || ''} ${value.subtype || ''}`) ||
    Array.isArray(value.documentFolderIds)
  ));
}

export function scopeKnowledge(config, identity, env) {
  const folders = knowledgeFolderIds(identity, env);
  // An unclassified folder must not be made available to every visitor.
  const knowledge = (config.tools || []).filter(tool => tool.subtype === 'knowledge');
  config.tools = (config.tools || []).filter(tool => !isKnowledgeTool(tool));
  if (folders.length && knowledge.length) config.tools.push({ ...knowledge[0], documentFolderIds: folders });
  return { scope: identity?.role === 'owner' ? 'owner' : 'shared', configured: Boolean(folders.length && knowledge.length), documentFolderIds: knowledge.length ? folders : [] };
}

const REQUIRED_TOOLS = ['skip_turn', 'pause_conversation'];
let systemCache = null;
export async function attachSystemTools(config, apiKey, fetcher = fetch) {
  let tools;
  if (systemCache?.key === apiKey && systemCache.until > Date.now()) tools = systemCache.tools;
  else {
    const found = new Map();
    for (let page = 1; page <= 10; page++) {
      const response = await fetcher(`https://api.anam.ai/v1/tools?perPage=100&page=${page}`, {
        headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) throw new Error('system_tools_unavailable');
      const payload = await response.json();
      const items = Array.isArray(payload) ? payload : payload.data || payload.tools || [];
      for (const tool of items) {
        const name = tool.name || tool.config?.name;
        if (String(tool.type).toLowerCase() === 'system' && REQUIRED_TOOLS.includes(name) && typeof tool.id === 'string') {
          found.set(name, { id: tool.id, name });
        }
      }
      if (found.size === REQUIRED_TOOLS.length || !payload.meta?.next || !items.length) break;
    }
    tools = [...found.values()];
    // Do not cache missing tools. A repaired configuration is picked up promptly.
    if (tools.length === REQUIRED_TOOLS.length) systemCache = { key: apiKey, until: Date.now() + 300000, tools };
  }
  config.toolIds = [...new Set([...(config.toolIds || []), ...tools.map(tool => tool.id)])];
  return { attached: tools.map(tool => tool.name), missing: REQUIRED_TOOLS.filter(name => !tools.some(tool => tool.name === name)) };
}
