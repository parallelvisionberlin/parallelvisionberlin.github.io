-- Parallel Vision customers have independent music workspaces, not Lab wallets.
CREATE TABLE IF NOT EXISTS music_user_settings (
  account_id TEXT PRIMARY KEY, pixel_id TEXT NOT NULL DEFAULT '',
  click_event TEXT NOT NULL DEFAULT 'MusicLinkClick', revision INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS music_releases_account ON music_releases(created_by,created_at);
CREATE INDEX IF NOT EXISTS music_media_account ON music_link_media(created_by);
