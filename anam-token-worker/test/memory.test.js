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
      { category: "preference", content: "Concise answers", evidence_message_ids: ["user-1"] },
      { category: "history", content: "Shared life on Mars", evidence_message_ids: ["persona-1"] }
    ],
    open_threads: [{ content: "Ask about concise output.", evidence_message_ids: ["user-1"] }],
    resolved_threads: [
      { thread_id: "thread-valid", evidence_message_ids: ["user-1"] },
      { thread_id: "thread-invented", evidence_message_ids: ["persona-1"] }
    ]
  }, messages, [{ thread_id: "thread-valid" }]);
  assert.deepEqual(filtered.summaryItems.map(item => item.content), ["Alejandro prefers concise answers."]);
  assert.deepEqual(filtered.pinned.map(item => item.content), ["Concise answers"]);
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
      { category: "shared_memory", content: "Alejandro established that the relationship was non-exclusive last year.", evidence_message_ids: ["user-confirmation"] }
    ]
  }, messages);
  assert.deepEqual(filtered.pinned.map(item => item.content), [
    "Alejandro established that the relationship was non-exclusive last year."
  ]);
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

test("public frontend remains browser-only without the owner credential", async () => {
  const frontend = await readFile(new URL("../../js/nina-access.js", import.meta.url), "utf8");
  assert.match(frontend, /return Boolean\(readNinaOwnerCredential\(\)\)/);
  assert.match(frontend, /if \(!canUseServerMemory\(\)\) return Promise\.resolve\(null\)/);
  assert.doesNotMatch(frontend, /localStorage\.setItem\(NINA_LEGACY_OWNER_TOKEN_KEY/);
  assert.doesNotMatch(frontend, /profile: readNinaUserProfile\(\)/);
  assert.match(frontend, /const NINA_MEMORY_LIMIT = 20/);
});
