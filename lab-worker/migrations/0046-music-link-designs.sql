-- Independent, idempotent page presentation settings. Existing releases default to cinematic artwork.
CREATE TABLE IF NOT EXISTS music_link_designs (
  release_id TEXT PRIMARY KEY REFERENCES music_releases(id),
  background TEXT NOT NULL DEFAULT 'artwork' CHECK(background IN ('artwork','blur','black'))
);
