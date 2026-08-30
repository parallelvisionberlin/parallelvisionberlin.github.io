import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DEFAULT_RELATIONSHIP_STATE, RELATIONSHIP_LEVELS, buildRelationshipContext, deleteRelationshipState,
  evaluateCompletedRelationship, getOrCreateRelationshipState, normalizeRelationshipUpdate, relationshipEvidenceQualifies,
  relationshipEvaluationDiagnostic
} from "../src/relationship.js";
import { scheduleCompletedMemoryConsolidation, scheduleCompletedRelationshipEvaluation } from "../src/index.js";

function relationshipDb(messages = []) {
  const rows = new Map();
  const messageQueries = [];
  return {
    rows, messageQueries,
    prepare(sql) {
      return { bind(...values) {
        if (sql.includes("SELECT m.role, m.content FROM messages")) return { all: async () => {
          messageQueries.push(values);
          return { results: messages };
        } };
        if (sql.includes("INSERT OR IGNORE")) return { run: async () => {
          if (!rows.has(values[0])) rows.set(values[0], { state_json: values[1], relationship_summary: values[2], created_at: values[3], updated_at: values[4], last_evaluated_at: null });
        } };
        if (sql.includes("SELECT state_json")) return { first: async () => rows.get(values[0]) || null };
        if (sql.includes("SET last_evaluated_at")) return { run: async () => {
          const row = rows.get(values[1]);
          if (row) row.last_evaluated_at = values[0];
        } };
        if (sql.includes("SET state_json")) return { run: async () => {
          const row = rows.get(values[4]);
          if (row) Object.assign(row, { state_json: values[0], relationship_summary: values[1], updated_at: values[2], last_evaluated_at: values[3] });
        } };
        if (sql.includes("DELETE FROM")) return { run: async () => { rows.delete(values[0]); } };
        throw new Error(`Unexpected SQL: ${sql}`);
      } };
    }
  };
}

test("relationship state is neutral, stable and isolated per authenticated user", async () => {
  const db = relationshipDb();
  const env = { NINA_MEMORY_DB: db };
  const first = await getOrCreateRelationshipState(env, "user-a");
  const repeated = await getOrCreateRelationshipState(env, "user-a");
  const other = await getOrCreateRelationshipState(env, "user-b");
  assert.deepEqual(JSON.parse(first.state_json), DEFAULT_RELATIONSHIP_STATE);
  assert.equal(repeated.created_at, first.created_at);
  assert.notEqual(db.rows.get("user-a"), db.rows.get("user-b"));
  assert.equal(other.relationship_summary, first.relationship_summary);
});

test("ordinary changes are clamped to one category and unsupported dimensions are ignored", () => {
  const update = normalizeRelationshipUpdate(DEFAULT_RELATIONSHIP_STATE, {
    changed: true,
    changes: { trust: "high", affection: "developing", devotion: "high" },
    summary: "Nina noticed a meaningful but early moment of trust. She remains measured."
  });
  assert.equal(update.state.trust, "moderate");
  assert.equal(update.state.affection, "developing");
  assert.equal(update.state.devotion, undefined);
  assert.deepEqual(RELATIONSHIP_LEVELS, ["very_low", "low", "developing", "moderate", "established", "high"]);
});

test("no-change output and malformed summaries cannot mutate state", () => {
  assert.equal(normalizeRelationshipUpdate(DEFAULT_RELATIONSHIP_STATE, { changed: false, changes: { trust: "high" }, summary: "No." }), null);
  assert.equal(normalizeRelationshipUpdate(DEFAULT_RELATIONSHIP_STATE, { changed: true, changes: { trust: "high" }, summary: "" }), null);
});

test("evidence gate rejects trivial, romantic demand, single flirt and roleplay", () => {
  const nina = { role: "persona", content: "I hear you." };
  assert.equal(relationshipEvidenceQualifies([{ role: "user", content: "Hello again" }, nina]), false);
  assert.equal(relationshipEvidenceQualifies([{ role: "user", content: "Love me and be my girlfriend" }, nina]), false);
  assert.equal(relationshipEvidenceQualifies([{ role: "user", content: "You look sexy tonight" }, nina]), false);
  assert.equal(relationshipEvidenceQualifies([{ role: "user", content: "Imagine we roleplay that I trust you with a secret" }, nina]), false);
});

test("evidence gate accepts repeated disclosure and a clear negative boundary", () => {
  const nina = { role: "persona", content: "Thank you for saying that." };
  assert.equal(relationshipEvidenceQualifies([
    { role: "user", content: "I feel exposed saying this." }, nina,
    { role: "user", content: "I need to tell you something personal." }
  ]), true);
  assert.equal(relationshipEvidenceQualifies([{ role: "user", content: "Stop. You crossed my boundary and I feel uncomfortable." }, nina]), true);
});

test("repeated genuine evidence can progress affection, intimacy and desire only gradually", () => {
  let state = { ...DEFAULT_RELATIONSHIP_STATE };
  for (const summary of ["A reciprocal bond is beginning to form.", "Familiar affection has developed through genuine exchanges."]) {
    const update = normalizeRelationshipUpdate(state, {
      changed: true, changes: { affection: "high", intimacy: "high", desire: "high" }, summary
    });
    state = update.state;
  }
  assert.equal(state.affection, "moderate");
  assert.equal(state.intimacy, "developing");
  assert.equal(state.desire, "developing");
});

test("explicit sexual posture cannot jump from neutral in one evaluation", () => {
  const update = normalizeRelationshipUpdate(DEFAULT_RELATIONSHIP_STATE, {
    changed: true, changes: { intimacy: "high", desire: "high", boundary_comfort: "high" },
    summary: "There is only tentative evidence and Nina remains restrained."
  });
  assert.equal(update.state.intimacy, "low");
  assert.equal(update.state.desire, "low");
  assert.equal(update.state.boundary_comfort, "moderate");
});

test("negative evidence can lower comfort and trust while increasing tension and distance", () => {
  const established = { ...DEFAULT_RELATIONSHIP_STATE, trust: "established", comfort: "established", tension: "low", distance: "low" };
  const update = normalizeRelationshipUpdate(established, {
    changed: true, changes: { trust: "very_low", comfort: "very_low", tension: "high", distance: "high" },
    summary: "Nina is guarded after a boundary was crossed. Tension remains unresolved."
  });
  assert.deepEqual(
    [update.state.trust, update.state.comfort, update.state.tension, update.state.distance],
    ["moderate", "moderate", "developing", "developing"]
  );
});

test("a repaired conflict can improve trust only one step", () => {
  const guarded = { ...DEFAULT_RELATIONSHIP_STATE, trust: "low", tension: "moderate", distance: "moderate" };
  const update = normalizeRelationshipUpdate(guarded, {
    changed: true, changes: { trust: "high", tension: "very_low", distance: "very_low" },
    summary: "A sincere repair has begun, though Nina remains appropriately cautious."
  });
  assert.deepEqual([update.state.trust, update.state.tension, update.state.distance], ["developing", "developing", "developing"]);
});

test("guest has no authenticated relationship context", async () => {
  assert.equal(await buildRelationshipContext({ NINA_MEMORY_DB: relationshipDb() }, ""), "");
});

test("time and message frequency alone do not qualify relationship evaluation", () => {
  const messages = Array.from({ length: 30 }, (_, index) => ({
    role: index % 2 ? "persona" : "user", content: index % 2 ? "Hello again." : "Another daily check-in."
  }));
  assert.equal(relationshipEvidenceQualifies(messages), false);
});

test("insufficient completed evidence remains unevaluated so later conversations can accumulate", async () => {
  const messages = [{ role: "user", content: "Hello again." }, { role: "persona", content: "Hello." }];
  const db = relationshipDb(messages);
  const before = await getOrCreateRelationshipState({ NINA_MEMORY_DB: db }, "owner-user-id");
  const initialState = before.state_json;
  const initialSummary = before.relationship_summary;
  const result = await evaluateCompletedRelationship({ NINA_MEMORY_DB: db, AI: {} }, "owner-user-id", "owner-memory-id", "conversation-1");
  assert.deepEqual(result, { evaluated: true, changed: false, reason: "insufficient_evidence" });
  assert.equal(db.rows.get("owner-user-id").last_evaluated_at, null);
  assert.equal(db.rows.get("owner-user-id").state_json, initialState);
  assert.equal(db.rows.get("owner-user-id").relationship_summary, initialSummary);
});

test("reciprocal evidence accumulated across completed conversations evolves the notebook one step", async () => {
  const messages = [
    { role: "user", content: "I value talking with you and feel comfortable with you." },
    { role: "persona", content: "I value the honesty in our conversations too." },
    { role: "user", content: "We've gotten to know each other and I appreciate how you listen to me." },
    { role: "persona", content: "That history matters, and I want to keep earning the trust in it." }
  ];
  const db = relationshipDb(messages);
  const result = await evaluateCompletedRelationship({ NINA_MEMORY_DB: db, AI: {} }, "owner-user-id", "owner-memory-id", "conversation-2", {
    runEvaluator: async () => ({
      changed: true,
      changes: { familiarity: "high", trust: "high", relational_significance: "high" },
      summary: "Repeated reciprocal conversations show growing familiarity and trust without assuming romance.",
      reason: "Repeated completed conversational history supports conservative progression."
    })
  });
  assert.deepEqual(result, { evaluated: true, changed: true });
  const state = JSON.parse(db.rows.get("owner-user-id").state_json);
  assert.equal(state.familiarity, "low");
  assert.equal(state.trust, "moderate");
  assert.equal(state.relational_significance, "developing");
  assert.match(db.rows.get("owner-user-id").last_evaluated_at, /^\d{4}-\d{2}-\d{2}T/);
});

test("qualified evidence is retained when evaluator reports insufficient evidence", async () => {
  const messages = [
    { role: "user", content: "I feel comfortable being honest with you." },
    { role: "persona", content: "I am listening carefully." },
    { role: "user", content: "I appreciate how you listen to me across our conversations." }
  ];
  const db = relationshipDb(messages);
  const result = await evaluateCompletedRelationship({ NINA_MEMORY_DB: db, AI: {} }, "owner-user-id", "owner-memory-id", "conversation-2", {
    runEvaluator: async () => ({ changed: false, changes: {}, summary: "", reason: "Insufficient evidence for a change." })
  });
  assert.deepEqual(result, { evaluated: true, changed: false, reason: "insufficient_evidence" });
  assert.equal(db.rows.get("owner-user-id").last_evaluated_at, null);
});

test("relationship evidence cursor follows the last accepted state change, not a no-change evaluation", async () => {
  const db = relationshipDb([{ role: "user", content: "Hello." }, { role: "persona", content: "Hello." }]);
  await getOrCreateRelationshipState({ NINA_MEMORY_DB: db }, "owner-user-id");
  const row = db.rows.get("owner-user-id");
  row.updated_at = "2026-08-29T10:00:00.000Z";
  row.last_evaluated_at = "2026-08-30T10:00:00.000Z";
  await evaluateCompletedRelationship({ NINA_MEMORY_DB: db, AI: {} }, "owner-user-id", "owner-memory-id", "conversation-2");
  assert.deepEqual(db.messageQueries[0].slice(2), [row.updated_at, row.updated_at]);
});

test("latest completed relationship attempt exposes insufficient evidence or a safe error", async () => {
  const diagnosticDb = (messages, lastEvaluatedAt = null) => ({
    prepare(sql) { return { bind() {
      if (sql.includes("FROM nina_relationship_states")) return { first: async () => ({ last_evaluated_at: lastEvaluatedAt }) };
      if (sql.includes("FROM conversations")) return { first: async () => ({ conversation_id: "conversation-2", ended_at: "2026-08-30T12:00:00.000Z" }) };
      if (sql.includes("FROM messages")) return { all: async () => ({ results: messages }) };
      throw new Error(`Unexpected SQL: ${sql}`);
    } }; }
  });
  const insufficient = await relationshipEvaluationDiagnostic({ NINA_MEMORY_DB: diagnosticDb([
    { role: "user", content: "I really enjoy cooking Mexican food." }, { role: "persona", content: "That sounds good." }
  ]) }, "owner-user-id", "owner-memory-id");
  assert.deepEqual(insufficient, {
    last_attempted_conversation_id: "conversation-2", attempted_at: "2026-08-30T12:00:00.000Z", status: "insufficient_evidence"
  });
  const failed = await relationshipEvaluationDiagnostic({ NINA_MEMORY_DB: diagnosticDb([
    { role: "user", content: "I feel comfortable being honest with you." }, { role: "persona", content: "I'm listening." },
    { role: "user", content: "I appreciate how you listen to me across our conversations." }
  ]) }, "owner-user-id", "owner-memory-id");
  assert.deepEqual(failed, {
    last_attempted_conversation_id: "conversation-2", attempted_at: "2026-08-30T12:00:00.000Z", status: "error",
    error: { code: "evaluation_not_recorded", message: "No completed relationship evaluation was recorded." }
  });
});

test("closed authenticated owner conversation schedules relationship evaluation", async () => {
  const scheduled = [];
  const calls = [];
  const ctx = { waitUntil(promise) { scheduled.push(promise); } };
  const identity = { user_id: "owner-user-id", visitor_id: "owner-memory-id", role: "owner", account_authenticated: true };
  const evaluator = async (...args) => { calls.push(args); return { evaluated: true }; };
  assert.equal(scheduleCompletedRelationshipEvaluation(ctx, { marker: "env" }, identity, "conversation-1", true, evaluator), true);
  await Promise.all(scheduled);
  assert.deepEqual(calls[0].slice(1), ["owner-user-id", "owner-memory-id", "conversation-1"]);
});

test("legacy owner identity does not schedule account relationship evaluation", () => {
  const ctx = { waitUntil() { throw new Error("must not schedule"); } };
  const legacyOwner = { visitor_id: "owner-memory-id", role: "owner", account_authenticated: false };
  assert.equal(scheduleCompletedRelationshipEvaluation(ctx, {}, legacyOwner, "conversation-1", true), false);
});

test("message storage does not consolidate and a successful close schedules exactly one consolidation", async () => {
  const source = await readFile(new URL("../src/index.js", import.meta.url), "utf8");
  const storeHandler = source.slice(source.indexOf("async function handleStoreMessages"), source.indexOf("export function scheduleCompletedRelationshipEvaluation"));
  assert.doesNotMatch(storeHandler, /consolidateMemory|scheduleCompletedMemoryConsolidation/);
  const scheduled = [];
  const calls = [];
  const ctx = { waitUntil(promise) { scheduled.push(promise); } };
  const identity = { visitor_id: "owner-memory-id" };
  const consolidator = async (...args) => { calls.push(args); return { consolidated: true }; };
  assert.equal(scheduleCompletedMemoryConsolidation(ctx, { marker: "env" }, identity, true, consolidator), true);
  assert.equal(scheduleCompletedMemoryConsolidation(ctx, {}, identity, false, consolidator), false);
  await Promise.all(scheduled);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], "owner-memory-id");
});

test("personal-data deletion removes only the authenticated user's relationship row", async () => {
  const db = relationshipDb();
  const env = { NINA_MEMORY_DB: db };
  await getOrCreateRelationshipState(env, "user-a");
  await getOrCreateRelationshipState(env, "user-b");
  await deleteRelationshipState(env, "user-a");
  assert.equal(db.rows.has("user-a"), false);
  assert.equal(db.rows.has("user-b"), true);
});

test("prompt context contains summary only and never exposes raw categorical state", async () => {
  const db = relationshipDb();
  const context = await buildRelationshipContext({ NINA_MEMORY_DB: db }, "user-a");
  assert.match(context, /HIDDEN INTERNAL RELATIONAL CONTEXT/);
  assert.doesNotMatch(context, /very_low|state_json|familiarity/);
});

test("migration creates one cascading relationship row per user", async () => {
  const migration = await readFile(new URL("../migrations/0008_nina_relationship_notebook.sql", import.meta.url), "utf8");
  assert.match(migration, /user_id TEXT PRIMARY KEY REFERENCES users\(id\) ON DELETE CASCADE/);
  assert.match(migration, /state_json TEXT NOT NULL CHECK\(json_valid\(state_json\)\)/);
  assert.doesNotMatch(migration, /score|stage|flag/i);
});
