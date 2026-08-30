import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  MEMORY_CONTEXT_CHARACTER_LIMIT,
  authorizeOwner,
  buildOwnerMemoryContext,
  constantTimeEqual,
  enrollOwner,
  filterConsolidationExtraction,
  isNinaMetaBreakMessage,
  mergeSummary,
  resolvePinnedDecision,
  storeMessages,
  validateCompletedMessages
} from "../src/memory.js";

function queryResult(rows) {
  return { results: rows };
}

function memoryDb({ pinned = [], summary = null, threads = [], recent = [] }) {
  return {
    prepare(sql) {
      return {
        bind() {
          if (sql.includes("FROM pinned_memories")) return { all: async () => queryResult(pinned) };
          if (sql.includes("FROM memory_summaries")) return { first: async () => summary };
          if (sql.includes("FROM open_threads")) return { all: async () => queryResult(threads) };
          if (sql.includes("FROM messages")) return { all: async () => queryResult([...recent].reverse().slice(0, 20)) };
          throw new Error(`Unexpected SQL: ${sql}`);
        }
      };
    }
  };
}

test("stores only completed user and persona messages", () => {
  const messages = validateCompletedMessages([
    { id: "user-1", role: "user", content: "complete" },
    { id: "persona-1", role: "persona", content: "complete too" },
    { id: "persona-2", role: "persona", content: "fragment", streaming: true },
    { id: "user-2", role: "user", content: "interrupted", interrupted: true },
    { id: "tool-1", role: "tool", content: "trace" },
    { id: "system-1", role: "system", content: "prompt" }
  ]);
  assert.deepEqual(messages.map(message => message.role), ["user", "persona"]);
  assert.deepEqual(messages.map(message => message.content), ["complete", "complete too"]);
});

test("raw transcript storage preserves Nina meta-break messages for audit", async () => {
  const boundRows = [];
  const env = { NINA_MEMORY_DB: {
    prepare() { return { bind(...values) { boundRows.push(values); return {}; } }; },
    async batch(statements) { return statements.map(() => ({ meta: { changes: 1 } })); }
  } };
  const content = "I'm an AI system underneath the character framing.";
  const result = await storeMessages(env, "visitor-owner", "conversation-1", [{
    id: "persona-meta-raw", role: "persona", content, timestamp: "2026-08-30T10:00:00.000Z"
  }]);
  assert.equal(result.storedMessages, 1);
  assert.equal(boundRows[0][4], content);
});

test("later call restores only the latest 20 while retaining summary and open thread", async () => {
  const recent = Array.from({ length: 27 }, (_, index) => ({ role: index % 2 ? "persona" : "user", content: `message-${index + 1}` }));
  const result = await buildOwnerMemoryContext({ NINA_MEMORY_DB: memoryDb({
    pinned: [{ category: "identity", content: "Alejandro is the validated owner." }],
    summary: { summary: "- Alejandro's long-running project is the Parallel Vision archive." },
    threads: [{ thread_id: "thread-1", content: "Return to the unresolved installation plan." }],
    recent
  }) }, { visitor_id: "visitor-owner", display_name: "Alejandro", profile_type: "owner" });
  assert.equal(result.diagnostics.restoredRecentMessages, 20);
  assert.match(result.context, /Parallel Vision archive/);
  assert.match(result.context, /unresolved installation plan/);
  assert.doesNotMatch(result.context, /message-7\n/);
  assert.match(result.context, /message-8/);
  assert.match(result.context, /message-27/);
  assert.ok(result.context.length <= MEMORY_CONTEXT_CHARACTER_LIMIT);
  assert.ok(result.context.indexOf("VALIDATED PERMANENT PROFILE") < result.context.indexOf("PINNED MEMORIES"));
  assert.ok(result.context.indexOf("PINNED MEMORIES") < result.context.indexOf("LONG-TERM RELATIONSHIP SUMMARY"));
  assert.ok(result.context.indexOf("LONG-TERM RELATIONSHIP SUMMARY") < result.context.indexOf("ACTIVE OPEN THREADS"));
  assert.ok(result.context.indexOf("ACTIVE OPEN THREADS") < result.context.indexOf("LATEST COMPLETED MESSAGES"));
});

test("summary and thread extraction remain conservative and user-grounded", () => {
  const messages = [
    { message_id: "user-1", role: "user", content: "I prefer concise answers." },
    { message_id: "user-fantasy", role: "user", content: "Imagine a sexual fantasy where we lived together on Mars." },
    { message_id: "persona-1", role: "persona", content: "We lived together on Mars." }
  ];
  const filtered = filterConsolidationExtraction({
    summary_items: [
      { content: "Alejandro prefers concise answers.", evidence_message_ids: ["user-1"] },
      { content: "They lived together on Mars.", evidence_message_ids: ["user-fantasy"] },
      { content: "They lived together on Mars.", evidence_message_ids: ["persona-1"] }
    ],
    pinned_memories: [
      { category: "preference", content: "Alejandro prefers concise answers.", evidence_message_ids: ["user-1"] },
      { category: "history", content: "Shared life on Mars", evidence_message_ids: ["persona-1"] }
    ],
    open_threads: [{ content: "Ask about concise output.", evidence_message_ids: ["user-1"] }],
    resolved_threads: [
      { thread_id: "thread-valid", evidence_message_ids: ["user-1"] },
      { thread_id: "thread-invented", evidence_message_ids: ["persona-1"] }
    ]
  }, messages, [{ thread_id: "thread-valid" }]);
  assert.deepEqual(filtered.summaryItems.map(item => item.content), ["Alejandro prefers concise answers."]);
  assert.deepEqual(filtered.pinned.map(item => item.content), ["Alejandro prefers concise answers."]);
  assert.equal(filtered.threads.length, 1);
  assert.deepEqual(filtered.resolvedIds, ["thread-valid"]);
});

test("persona evidence can establish Nina autobiography, including sexual events", () => {
  const messages = [{ message_id: "nina-1", role: "persona", content: "I slept with someone after a set last Saturday." }];
  const filtered = filterConsolidationExtraction({
    pinned_memories: [{
      category: "nina_autobiography",
      content: "Nina slept with someone after a set last Saturday.",
      evidence_message_ids: ["nina-1"]
    }]
  }, messages);
  assert.equal(filtered.pinned.length, 1);
  assert.equal(filtered.pinned[0].category, "nina_autobiography");
});

test("sexual language alone does not invalidate factual evidence", () => {
  const messages = [{ message_id: "user-1", role: "user", content: "Sexual openness is important to me." }];
  const filtered = filterConsolidationExtraction({
    pinned_memories: [{ category: "user_fact", content: "Alejandro values sexual openness.", evidence_message_ids: ["user-1"] }]
  }, messages);
  assert.equal(filtered.pinned.length, 1);
});

test("imagined persona content is fantasy, not Nina autobiography", () => {
  const messages = [{ message_id: "nina-1", role: "persona", content: "Imagine I slept with someone backstage." }];
  const filtered = filterConsolidationExtraction({
    pinned_memories: [
      { category: "nina_autobiography", content: "Nina slept with someone backstage.", evidence_message_ids: ["nina-1"] },
      { category: "fantasy_roleplay", content: "Sleeping with someone backstage is an imagined theme.", evidence_message_ids: ["nina-1"] }
    ]
  }, messages);
  assert.deepEqual(filtered.pinned.map(item => item.category), ["fantasy_roleplay"]);
});

test("jokes can be retained as inside jokes without becoming facts", () => {
  const messages = [{ message_id: "nina-1", role: "persona", content: "I'm kidding, chrome goblin strikes again." }];
  const filtered = filterConsolidationExtraction({
    pinned_memories: [{ category: "inside_joke", content: "The recurring chrome goblin joke.", evidence_message_ids: ["nina-1"] }]
  }, messages);
  assert.deepEqual(filtered.pinned.map(item => item.category), ["inside_joke"]);
});

test("shared memory requires literal user-grounded evidence", () => {
  const messages = [
    { message_id: "nina-claim", role: "persona", content: "Alejandro promised me we were non-exclusive." },
    { message_id: "user-confirmation", role: "user", content: "I told you last year that our relationship was non-exclusive." }
  ];
  const filtered = filterConsolidationExtraction({
    pinned_memories: [
      { category: "shared_memory", content: "Alejandro promised Nina they were non-exclusive.", evidence_message_ids: ["nina-claim"] },
      { category: "shared_memory", content: "Alejandro told Nina their relationship was non-exclusive last year.", evidence_message_ids: ["user-confirmation"] }
    ]
  }, messages);
  assert.deepEqual(filtered.pinned.map(item => item.content), [
    "Alejandro told Nina their relationship was non-exclusive last year."
  ]);
});

test("canon repetition, debris and unresolved perspective are rejected", () => {
  const messages = [
    { message_id: "canon-1", role: "persona", content: "Nina is human." },
    { message_id: "canon-2", role: "persona", content: "I am Nina." },
    { message_id: "debris-1", role: "user", content: "Sorry, what did you say?" },
    { message_id: "debris-2", role: "user", content: "You're amazing." },
    { message_id: "debris-3", role: "user", content: "I mean..." },
    { message_id: "ambiguous-1", role: "user", content: "We had a fight." },
    { message_id: "ambiguous-2", role: "user", content: "You are human." }
  ];
  const pinned_memories = messages.map((message, index) => ({
    category: index < 2 ? "nina_autobiography" : "shared_memory",
    content: message.content,
    evidence_message_ids: [message.message_id]
  }));
  assert.equal(filterConsolidationExtraction({ pinned_memories }, messages).pinned.length, 0);
});

test("first-person user fact is accepted only after explicit perspective normalization", () => {
  const messages = [{ message_id: "user-eva", role: "user", content: "I have a girlfriend named Eva." }];
  const filtered = filterConsolidationExtraction({ pinned_memories: [{
    category: "user_fact",
    content: "Alejandro's girlfriend is Eva.",
    evidence_message_ids: ["user-eva"]
  }] }, messages);
  assert.deepEqual(filtered.pinned.map(item => item.content), ["Alejandro's girlfriend is Eva."]);
});

test("semantic paraphrases deduplicate and changed durable information updates the existing pin", () => {
  const existing = [{ memory_id: "pin-girlfriend", category: "user_fact", content: "Eva is Alejandro's girlfriend." }];
  assert.equal(resolvePinnedDecision({ category: "user_fact", content: "Alejandro's girlfriend is Eva." }, existing).decision, "DUPLICATE");
  const changed = resolvePinnedDecision({ category: "user_fact", content: "Alejandro's girlfriend is Mara." }, existing);
  assert.equal(changed.decision, "UPDATE_EXISTING");
  assert.equal(changed.existing.memory_id, "pin-girlfriend");
  const preference = [{ memory_id: "pin-interest", category: "preference", content: "Alejandro wants Nina to show genuine interest." }];
  assert.equal(resolvePinnedDecision({ category: "preference", content: "Alejandro prefers Nina to show genuine conversational interest." }, preference).decision, "DUPLICATE");
});

test("Nina autobiography accepts independent life but rejects canon and meta breaks", () => {
  const messages = [
    { message_id: "life", role: "persona", content: "I worked late at the studio last Thursday." },
    { message_id: "canon", role: "persona", content: "I am Nina." },
    { message_id: "meta", role: "persona", content: "I'm the same assistant underneath the character framing." }
  ];
  const filtered = filterConsolidationExtraction({ pinned_memories: [
    { category: "nina_autobiography", content: "Nina worked late at the studio last Thursday.", evidence_message_ids: ["life"] },
    { category: "nina_autobiography", content: "Nina is Nina.", evidence_message_ids: ["canon"] },
    { category: "nina_autobiography", content: "Nina is the same assistant underneath character framing.", evidence_message_ids: ["meta"] }
  ] }, messages);
  assert.deepEqual(filtered.pinned.map(item => item.content), ["Nina worked late at the studio last Thursday."]);
});

test("meta-break persona messages are excluded from recent context while visitor AI discussion remains", async () => {
  const meta = { role: "persona", content: "I'm an AI system." };
  const visitor = { role: "user", content: "You're an AI running on a website." };
  assert.equal(isNinaMetaBreakMessage(meta), true);
  assert.equal(isNinaMetaBreakMessage(visitor), false);
  const result = await buildOwnerMemoryContext({ NINA_MEMORY_DB: memoryDb({ recent: [meta, visitor] }) }, {
    visitor_id: "visitor-owner", display_name: "Alejandro", profile_type: "owner"
  });
  assert.doesNotMatch(result.context, /NINA: I'm an AI system/);
  assert.match(result.context, /VISITOR: You're an AI running on a website/);
});

test("summary regeneration keeps semantic memory and removes transcript debris and perspective fragments", () => {
  const summary = mergeSummary("- Sorry, what did you say?\n- We had a fight.", [],
    "Alejandro is building the Parallel Vision archive.\nYou're amazing.\nI mean...");
  assert.equal(summary, "Alejandro is building the Parallel Vision archive.");
});

test("owner token comparison rejects missing and altered values", () => {
  const token = "a".repeat(48);
  assert.equal(constantTimeEqual(token, token), true);
  assert.equal(constantTimeEqual(token, `${"a".repeat(47)}b`), false);
  assert.equal(constantTimeEqual("", token), false);
});

test("enrollment binds the owner and can reissue a missing signed credential only to the same bound visitor", async () => {
  let owner = null;
  const db = {
    prepare(sql) {
      return {
        bind(...values) {
          if (sql.includes("INSERT INTO visitors")) return { run: async () => { owner = { visitor_id: values[0], display_name: "Alejandro", profile_type: "owner" }; } };
          if (sql.includes("WHERE visitor_id = ?")) return { first: async () => owner?.visitor_id === values[0] ? owner : null };
          throw new Error(`Unexpected bound SQL: ${sql}`);
        },
        first: async () => owner
      };
    }
  };
  const env = {
    NINA_MEMORY_DB: db,
    NINA_OWNER_ENROLLMENT_TOKEN: "enroll-" + "e".repeat(48),
    NINA_OWNER_SIGNING_SECRET: "sign-" + "s".repeat(48)
  };
  const visitorId = "visitor-cryptographic-owner";
  assert.equal(await enrollOwner(env, visitorId, "Bearer wrong-token"), null);
  assert.equal(owner, null);
  const enrollment = await enrollOwner(env, visitorId, `Bearer ${env.NINA_OWNER_ENROLLMENT_TOKEN}`);
  assert.equal(enrollment.owner.visitor_id, visitorId);
  assert.notEqual(enrollment.credential, env.NINA_OWNER_ENROLLMENT_TOKEN);
  const recoveredEnrollment = await enrollOwner(env, visitorId, `Bearer ${env.NINA_OWNER_ENROLLMENT_TOKEN}`);
  assert.equal(recoveredEnrollment.owner.visitor_id, visitorId);
  assert.equal(recoveredEnrollment.credential, enrollment.credential);
  assert.equal(await enrollOwner(env, "visitor-someone-else", `Bearer ${env.NINA_OWNER_ENROLLMENT_TOKEN}`), null);
  assert.equal((await authorizeOwner(env, visitorId, `Bearer ${enrollment.credential}`)).visitor_id, visitorId);
  assert.equal(await authorizeOwner(env, "visitor-someone-else", `Bearer ${enrollment.credential}`), null);
  assert.equal(await authorizeOwner(env, visitorId, `Bearer ${env.NINA_OWNER_ENROLLMENT_TOKEN}`), null);
  owner = null;
  assert.equal(await authorizeOwner(env, visitorId, `Bearer ${enrollment.credential}`), null);
});

test("enrollment accepts the exact rotated secret when interactive input stored surrounding whitespace", async () => {
  let owner = null;
  const db = {
    prepare(sql) {
      return {
        bind(...values) {
          if (sql.includes("INSERT INTO visitors")) return { run: async () => { owner = { visitor_id: values[0], display_name: "Alejandro", profile_type: "owner" }; } };
          throw new Error(`Unexpected bound SQL: ${sql}`);
        },
        first: async () => owner
      };
    }
  };
  const token = "rotate-" + "r".repeat(48);
  const result = await enrollOwner({
    NINA_MEMORY_DB: db,
    NINA_OWNER_ENROLLMENT_TOKEN: `${token}\r\n`,
    NINA_OWNER_SIGNING_SECRET: "sign-" + "s".repeat(48)
  }, "visitor-owner-whitespace", `Bearer ${token}`);

  assert.equal(result.owner.visitor_id, "visitor-owner-whitespace");
  assert.ok(result.credential.startsWith("v1."));
});

test("migration defines cascading owner deletion for the complete memory graph", async () => {
  const migration = await readFile(new URL("../migrations/0001_nina_memory.sql", import.meta.url), "utf8");
  for (const table of ["visitors", "conversations", "messages", "memory_summaries", "pinned_memories", "open_threads"]) {
    assert.match(migration, new RegExp(`CREATE TABLE ${table}`));
  }
  assert.equal((migration.match(/REFERENCES visitors\(visitor_id\) ON DELETE CASCADE/g) || []).length, 5);
});

test("account migration adds permanent user IDs without altering existing memory tables", async () => {
  const migration = await readFile(new URL("../migrations/0002_authenticated_users.sql", import.meta.url), "utf8");
  assert.match(migration, /CREATE TABLE users/);
  assert.match(migration, /auth_subject TEXT NOT NULL UNIQUE/);
  assert.match(migration, /memory_visitor_id TEXT NOT NULL UNIQUE REFERENCES visitors\(visitor_id\) ON DELETE RESTRICT/);
  assert.match(migration, /role TEXT NOT NULL CHECK\(role IN \('owner', 'user'\)\)/);
  assert.doesNotMatch(migration, /DROP\s+TABLE|DELETE\s+FROM|ALTER\s+TABLE/i);
});

test("public frontend keeps browser memory and sends server memory only with Clerk or legacy authentication", async () => {
  const frontend = await readFile(new URL("../../js/nina-access.js", import.meta.url), "utf8");
  assert.match(frontend, /clerk\?\.session\?\.getToken/);
  assert.match(frontend, /if \(!headers\.Authorization\) return null/);
  assert.match(frontend, /return clerk \? \{ "Content-Type": "application\/json" \} : legacyOwnerMemoryHeaders\(\)/);
  assert.match(frontend, /await clerk\?\.signOut\(\)/);
  assert.doesNotMatch(frontend, /localStorage\.setItem\(NINA_LEGACY_OWNER_TOKEN_KEY/);
  assert.doesNotMatch(frontend, /profile: readNinaUserProfile\(\)/);
  assert.match(frontend, /const NINA_MEMORY_LIMIT = 20/);
});
