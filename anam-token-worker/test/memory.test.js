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

test("persona inventions and fantasy cannot become factual memory", () => {
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

test("owner token comparison rejects missing and altered values", () => {
  const token = "a".repeat(48);
  assert.equal(constantTimeEqual(token, token), true);
  assert.equal(constantTimeEqual(token, `${"a".repeat(47)}b`), false);
  assert.equal(constantTimeEqual("", token), false);
});

test("one-time enrollment binds the visitor and future access requires a signed credential plus D1 owner row", async () => {
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
  assert.equal(await enrollOwner(env, visitorId, `Bearer ${env.NINA_OWNER_ENROLLMENT_TOKEN}`), null);
  assert.equal((await authorizeOwner(env, visitorId, `Bearer ${enrollment.credential}`)).visitor_id, visitorId);
  assert.equal(await authorizeOwner(env, "visitor-someone-else", `Bearer ${enrollment.credential}`), null);
  assert.equal(await authorizeOwner(env, visitorId, `Bearer ${env.NINA_OWNER_ENROLLMENT_TOKEN}`), null);
  owner = null;
  assert.equal(await authorizeOwner(env, visitorId, `Bearer ${enrollment.credential}`), null);
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
