import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DEFAULT_RELATIONSHIP_STATE, RELATIONSHIP_LEVELS, buildRelationshipContext, deleteRelationshipState,
  getOrCreateRelationshipState, normalizeRelationshipUpdate, relationshipEvidenceQualifies
} from "../src/relationship.js";

function relationshipDb() {
  const rows = new Map();
  return {
    rows,
    prepare(sql) {
      return { bind(...values) {
        if (sql.includes("INSERT OR IGNORE")) return { run: async () => {
          if (!rows.has(values[0])) rows.set(values[0], { state_json: values[1], relationship_summary: values[2], created_at: values[3], updated_at: values[4], last_evaluated_at: null });
        } };
        if (sql.includes("SELECT state_json")) return { first: async () => rows.get(values[0]) || null };
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
