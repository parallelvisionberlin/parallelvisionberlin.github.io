PRAGMA foreign_keys = ON;

DELETE FROM visitors;

INSERT INTO visitors (visitor_id, display_name, profile_type, created_at, updated_at)
VALUES ('visitor-owner-test', 'Alejandro', 'owner', '2026-08-26T08:00:00.000Z', '2026-08-26T08:00:00.000Z');

INSERT INTO conversations (conversation_id, visitor_id, started_at, ended_at) VALUES
  ('conversation-same-day-1', 'visitor-owner-test', '2026-08-26T08:00:00.000Z', '2026-08-26T08:30:00.000Z'),
  ('conversation-same-day-2', 'visitor-owner-test', '2026-08-26T16:00:00.000Z', NULL);

WITH RECURSIVE sequence(number) AS (
  SELECT 1
  UNION ALL
  SELECT number + 1 FROM sequence WHERE number < 25
)
INSERT INTO messages (message_id, conversation_id, visitor_id, role, content, created_at)
SELECT
  'message-' || printf('%02d', number),
  CASE WHEN number <= 12 THEN 'conversation-same-day-1' ELSE 'conversation-same-day-2' END,
  'visitor-owner-test',
  CASE WHEN number % 2 = 1 THEN 'user' ELSE 'persona' END,
  'completed message ' || number,
  printf('2026-08-26T%02d:%02d:00.000Z', 8 + ((number - 1) / 2), (number % 2) * 30)
FROM sequence;

INSERT INTO memory_summaries (visitor_id, summary, updated_at, messages_summarized_through)
VALUES ('visitor-owner-test', '- Alejandro is building the Parallel Vision archive.', '2026-08-26T18:00:00.000Z', 'message-05');

INSERT INTO pinned_memories (memory_id, visitor_id, category, content, created_at, updated_at)
VALUES ('pin-old-fact', 'visitor-owner-test', 'project', 'The Parallel Vision archive is an ongoing project.', '2026-08-26T18:00:00.000Z', '2026-08-26T18:00:00.000Z');

INSERT INTO open_threads (thread_id, visitor_id, content, status, created_at, updated_at)
VALUES ('thread-unresolved', 'visitor-owner-test', 'Return to the unresolved installation plan.', 'active', '2026-08-26T18:00:00.000Z', '2026-08-26T18:00:00.000Z');
