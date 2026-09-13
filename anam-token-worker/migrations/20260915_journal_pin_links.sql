-- Journal and pinned views refer to the same account-owned fact.
ALTER TABLE nina_journal_entries ADD COLUMN pin_memory_id TEXT REFERENCES pinned_memories(memory_id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS nina_journal_pin ON nina_journal_entries(user_id,visitor_id,pin_memory_id);

-- Historical records are linked only when their normalized text and categories match.
UPDATE nina_journal_entries AS j SET pin_memory_id=(
  SELECT p.memory_id FROM pinned_memories p JOIN users u ON u.id=j.user_id AND u.memory_visitor_id=p.visitor_id
  WHERE p.visitor_id=j.visitor_id AND lower(trim(p.content))=lower(trim(j.content))
    AND p.category=CASE j.kind WHEN 'independent' THEN 'nina_autobiography' WHEN 'shared' THEN 'shared_memory' ELSE 'fantasy_roleplay' END
  ORDER BY p.updated_at DESC,p.memory_id LIMIT 1
) WHERE pin_memory_id IS NULL AND origin='conversation';

CREATE TRIGGER IF NOT EXISTS nina_journal_pin_account_insert BEFORE INSERT ON nina_journal_entries
WHEN NEW.pin_memory_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM pinned_memories p JOIN users u ON u.memory_visitor_id=p.visitor_id
  WHERE p.memory_id=NEW.pin_memory_id AND p.visitor_id=NEW.visitor_id AND u.id=NEW.user_id
) BEGIN SELECT RAISE(ABORT,'Journal pin belongs to another account'); END;
CREATE TRIGGER IF NOT EXISTS nina_journal_pin_account_update BEFORE UPDATE OF pin_memory_id,user_id,visitor_id ON nina_journal_entries
WHEN NEW.pin_memory_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM pinned_memories p JOIN users u ON u.memory_visitor_id=p.visitor_id
  WHERE p.memory_id=NEW.pin_memory_id AND p.visitor_id=NEW.visitor_id AND u.id=NEW.user_id
) BEGIN SELECT RAISE(ABORT,'Journal pin belongs to another account'); END;

-- Pin-editor actions update linked copies inside the same database transaction.
CREATE TRIGGER IF NOT EXISTS nina_pin_control_journal_insert AFTER INSERT ON nina_memory_controls
WHEN NEW.kind='pin'
BEGIN
  UPDATE nina_journal_entries SET content=CASE WHEN NEW.operation='save' THEN NEW.content WHEN NEW.operation='restore' THEN (SELECT content FROM pinned_memories WHERE memory_id=NEW.target_id AND visitor_id=NEW.visitor_id) ELSE content END,kind=CASE (CASE WHEN NEW.operation='save' THEN NEW.category ELSE (SELECT category FROM pinned_memories WHERE memory_id=NEW.target_id AND visitor_id=NEW.visitor_id) END) WHEN 'nina_autobiography' THEN 'independent' WHEN 'shared_memory' THEN 'shared' WHEN 'fantasy_roleplay' THEN 'fantasy' ELSE kind END,status=CASE WHEN NEW.operation='hide' OR (CASE WHEN NEW.operation='save' THEN NEW.category ELSE (SELECT category FROM pinned_memories WHERE memory_id=NEW.target_id AND visitor_id=NEW.visitor_id) END) NOT IN ('nina_autobiography','shared_memory','fantasy_roleplay') THEN 'hidden' ELSE 'active' END,
    scope='private',
    revision=revision+1,updated_at=NEW.updated_at
  WHERE user_id=NEW.user_id AND visitor_id=NEW.visitor_id AND pin_memory_id=NEW.target_id
    AND (content<>(CASE WHEN NEW.operation='save' THEN NEW.content WHEN NEW.operation='restore' THEN (SELECT content FROM pinned_memories WHERE memory_id=NEW.target_id AND visitor_id=NEW.visitor_id) ELSE content END) OR kind<>(CASE (CASE WHEN NEW.operation='save' THEN NEW.category ELSE (SELECT category FROM pinned_memories WHERE memory_id=NEW.target_id AND visitor_id=NEW.visitor_id) END) WHEN 'nina_autobiography' THEN 'independent' WHEN 'shared_memory' THEN 'shared' WHEN 'fantasy_roleplay' THEN 'fantasy' ELSE kind END) OR status<>(CASE WHEN NEW.operation='hide' OR (CASE WHEN NEW.operation='save' THEN NEW.category ELSE (SELECT category FROM pinned_memories WHERE memory_id=NEW.target_id AND visitor_id=NEW.visitor_id) END) NOT IN ('nina_autobiography','shared_memory','fantasy_roleplay') THEN 'hidden' ELSE 'active' END) OR updated_at<>NEW.updated_at);
END;

-- Pin-editor actions update linked copies inside the same database transaction.
CREATE TRIGGER IF NOT EXISTS nina_pin_control_journal_update AFTER UPDATE ON nina_memory_controls
WHEN NEW.kind='pin'
BEGIN
  UPDATE nina_journal_entries SET content=CASE WHEN NEW.operation='save' THEN NEW.content WHEN NEW.operation='restore' THEN (SELECT content FROM pinned_memories WHERE memory_id=NEW.target_id AND visitor_id=NEW.visitor_id) ELSE content END,kind=CASE (CASE WHEN NEW.operation='save' THEN NEW.category ELSE (SELECT category FROM pinned_memories WHERE memory_id=NEW.target_id AND visitor_id=NEW.visitor_id) END) WHEN 'nina_autobiography' THEN 'independent' WHEN 'shared_memory' THEN 'shared' WHEN 'fantasy_roleplay' THEN 'fantasy' ELSE kind END,status=CASE WHEN NEW.operation='hide' OR (CASE WHEN NEW.operation='save' THEN NEW.category ELSE (SELECT category FROM pinned_memories WHERE memory_id=NEW.target_id AND visitor_id=NEW.visitor_id) END) NOT IN ('nina_autobiography','shared_memory','fantasy_roleplay') THEN 'hidden' ELSE 'active' END,
    scope='private',
    revision=revision+1,updated_at=NEW.updated_at
  WHERE user_id=NEW.user_id AND visitor_id=NEW.visitor_id AND pin_memory_id=NEW.target_id
    AND (content<>(CASE WHEN NEW.operation='save' THEN NEW.content WHEN NEW.operation='restore' THEN (SELECT content FROM pinned_memories WHERE memory_id=NEW.target_id AND visitor_id=NEW.visitor_id) ELSE content END) OR kind<>(CASE (CASE WHEN NEW.operation='save' THEN NEW.category ELSE (SELECT category FROM pinned_memories WHERE memory_id=NEW.target_id AND visitor_id=NEW.visitor_id) END) WHEN 'nina_autobiography' THEN 'independent' WHEN 'shared_memory' THEN 'shared' WHEN 'fantasy_roleplay' THEN 'fantasy' ELSE kind END) OR status<>(CASE WHEN NEW.operation='hide' OR (CASE WHEN NEW.operation='save' THEN NEW.category ELSE (SELECT category FROM pinned_memories WHERE memory_id=NEW.target_id AND visitor_id=NEW.visitor_id) END) NOT IN ('nina_autobiography','shared_memory','fantasy_roleplay') THEN 'hidden' ELSE 'active' END) OR updated_at<>NEW.updated_at);
END;

-- Apply any existing editor overrides to newly linked historical copies.
UPDATE nina_memory_controls SET revision=revision WHERE kind='pin' AND EXISTS (
  SELECT 1 FROM nina_journal_entries j WHERE j.user_id=nina_memory_controls.user_id
    AND j.visitor_id=nina_memory_controls.visitor_id AND j.pin_memory_id=nina_memory_controls.target_id
);
