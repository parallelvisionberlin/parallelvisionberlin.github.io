// Retrieval policy only: this module never changes, expires, or deletes stored facts.
// Callers must scope rows to the authenticated visitor and apply memory controls first.
const DAY = 24 * 60 * 60 * 1000;
const CATEGORY_PRIORITY = {
  identity: 120,
  preference: 115,
  project: 105,
  user_fact: 90,
  nina_autobiography: 85,
  shared_memory: 85,
  inside_joke: 80,
  fantasy_roleplay: 75
};
const RELATIONSHIP_FACT = /\b(?:has (?:a |an )?(?:girlfriend|boyfriend|partner|wife|husband|daughter|son|sister|brother)|(?:girlfriend|boyfriend|partner|wife|husband|mother|father|sister|brother)(?:'s name)? is|married to)\b/i;
const TRIVIAL_FACT = /\b(?:greeted each other|exchanged greetings|said hello|was talking to Nina|asked Nina to recall (?:their|the) first conversation)\b/i;
// Deliberately narrow: an unknown user_fact remains useful. A stable preference,
// project, or allergy must not be demoted just because its text mentions sleep/health.
const TEMPORARY_FACT = /\b(?:is smoking (?:a |an )?(?:joint|cigarette)|(?:is |was |has been )?(?:having trouble sleeping|unable to sleep)|(?:is|was) (?:awake|tired|sick|ill|feeling unwell)|(?:throat|tooth|teeth) (?:is |are |was |were |feels? )?(?:better|sore|hurting)|(?:has|had|reported) (?:a |an )?(?:throat|tooth|teeth) (?:issue|pain|infection)|(?:is|was) taking antibiotics|(?:it(?:'s| is)|and it is) (?:a little after |about |almost |around )?(?:midnight|[0-9]{1,2}(?::[0-9]{2})?\s*[ap]\.?m\.?)|(?:right now|at the moment|during the .+ conversation))\b/i;
const SEARCH_STOP_WORDS = new Set((
  'alejandro nina visitor user persona assistant message conversation messages content role created at ' +
  'the and for with from that this these those has have had was were are been being ' +
  'but not you your yours she her hers him his they their them our ours its said say ' +
  'what when where which who why how can could would should will want wants just ' +
  'about into there then than some any remember recalled recall please really'
).split(/\s+/));

function searchTerms(value) {
  return new Set((String(value || '').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [])
    .filter(term => !SEARCH_STOP_WORDS.has(term)));
}

function timestamp(row) {
  const parsed = Date.parse(row.updated_at || row.created_at || '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function priority(row, now, queryTerms) {
  const content = row.content;
  const recorded = timestamp(row);
  const age = recorded ? Math.max(0, now - recorded) / DAY : Infinity;
  let score = CATEGORY_PRIORITY[row.category] ?? 70;
  if (row.category === 'user_fact') {
    if (TRIVIAL_FACT.test(content)) score = 0;
    else if (TEMPORARY_FACT.test(content)) score = age <= 2 ? 55 : age <= 7 ? 35 : 10;
    else if (RELATIONSHIP_FACT.test(content)) score = 110;
  }
  // Recency only breaks close priorities. It cannot push old temporary states
  // above a lasting preference or silently age a durable fact out of retrieval.
  score += age <= 1 ? 6 : age <= 7 ? 4 : age <= 30 ? 2 : 0;
  if (queryTerms.size) {
    const words = searchTerms(content);
    let matches = 0;
    for (const word of words) if (queryTerms.has(word)) matches++;
    if (matches) score += 160 + Math.min(matches, 8) * 20;
  }
  return score;
}

export function rankMemoryCandidates(rows, { now = Date.now(), query = '' } = {}) {
  const clock = typeof now === 'number' ? now : Date.parse(now);
  const queryTerms = searchTerms(query);
  return (Array.isArray(rows) ? rows : [])
    .filter(row => row && typeof row.content === 'string' && row.content.trim())
    .map(row => ({ row, score: priority(row, Number.isFinite(clock) ? clock : Date.now(), queryTerms) }))
    .sort((a, b) => b.score - a.score || timestamp(b.row) - timestamp(a.row)
      || String(a.row.memory_id || '').localeCompare(String(b.row.memory_id || ''))
      || a.row.content.localeCompare(b.row.content))
    .map(({ row }) => row);
}

function packRanked(rows, { characterBudget, prefix, suffix = '', separator = '\n', format }) {
  const budget = Number.isFinite(characterBudget) ? Math.max(0, Math.floor(characterBudget)) : 0;
  const items = [];
  const rendered = [];
  let used = prefix.length + suffix.length;
  for (const row of rows) {
    const text = format(row);
    const cost = text.length + (items.length ? separator.length : 0);
    // An oversized row must not prevent other complete facts from fitting.
    if (used + cost > budget) continue;
    items.push(row);
    rendered.push(text);
    used += cost;
  }
  return {
    items,
    text: items.length ? `${prefix}${rendered.join(separator)}${suffix}` : '',
    used: items.length ? used : 0,
    count: items.length,
    candidateCount: rows.length,
    omittedCount: rows.length - items.length
  };
}

export function selectPinnedMemories(rows, { characterBudget = 5000, header = 'PINNED MEMORIES', ...ranking } = {}) {
  return packRanked(rankMemoryCandidates(rows, ranking), {
    characterBudget,
    prefix: `${header}\n`,
    format: item => `[${item.category}${item.updated_at ? `; recorded ${item.updated_at}` : ''}] ${item.content}`
  });
}

export function selectPinnedMemoriesForExtraction(rows, { messages = [], characterBudget = 10000, ...ranking } = {}) {
  const query = ranking.query ?? messages.map(message => message.content || '').join('\n');
  return packRanked(rankMemoryCandidates(rows, { ...ranking, query }), {
    characterBudget,
    prefix: '[', suffix: ']', separator: ',',
    format: item => JSON.stringify({ memory_id: item.memory_id, category: item.category, content: item.content })
  });
}
