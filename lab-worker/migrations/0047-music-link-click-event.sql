-- Replace the legacy event label without changing the existing music pixel.
-- Revision increments invalidate settings opened before this migration.
UPDATE music_link_settings
SET click_event='MusicLinkClick', revision=revision+1
WHERE id=1 AND click_event='Hypeddit Smart Link Click';
