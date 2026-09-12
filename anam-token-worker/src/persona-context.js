// The shared character and a person's private context have separate scopes.
export function partitionPersonaPrompt(prompt = '') {
  const shared = [], privateOwner = [];
  let ownerSection = false;
  for (const paragraph of String(prompt).replace(/\r/g, '').split(/\n\s*\n/)) {
    const heading = paragraph.match(/^#{1,6}\s+([^\n]+)/);
    if (heading) ownerSection = /^(?:ALEJANDRO(?: AND RELATIONSHIPS)?|PRIVATE OWNER CONTEXT)$/i.test(heading[1].trim());
    if (ownerSection || /\bAlejandro\b/i.test(paragraph)) privateOwner.push(paragraph);
    else shared.push(paragraph);
  }
  return { shared: shared.join('\n\n').trim(), privateOwner: privateOwner.join('\n\n').trim() };
}

export async function personalContext(env, userId) {
  if (!userId || !env?.NINA_MEMORY_DB) return '';
  const row = await env.NINA_MEMORY_DB.prepare('SELECT content FROM nina_private_context WHERE user_id=?').bind(userId).first();
  return row?.content ? `PRIVATE CONTEXT FOR THIS AUTHENTICATED VISITOR ONLY\n${row.content}\nA relationship label is established by the separate evidenced agreement record, never assumed from affection or a requested style.` : '';
}

export function scopeKnowledge(config, identity, env) {
  const folder = identity?.role === 'owner' ? env.NINA_KNOWLEDGE_FOLDER_ID : env.NINA_PUBLIC_KNOWLEDGE_FOLDER_ID;
  // An unclassified folder must not be made available to every visitor.
  const knowledge = (config.tools || []).filter(tool => tool.subtype === 'knowledge');
  config.tools = (config.tools || []).filter(tool => tool.subtype !== 'knowledge');
  if (folder && knowledge.length) config.tools.push({ ...knowledge[0], documentFolderIds: [folder] });
  return { scope: identity?.role === 'owner' ? 'owner' : 'shared', configured: Boolean(folder) };
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
