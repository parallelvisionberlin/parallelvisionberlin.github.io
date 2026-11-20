// One source of truth; Worker-only checkouts retain their complete dependency graph.
export * from '../lab-worker/music-links-shared.mjs?v=20261103-workspace1';
// Existing music catalogue storage retains a reserved, reversible playlist identifier.
// This avoids modifying PV LAB billing/Worker/D1 to add a second music content format.
export const PLAYLIST_CATALOGUE='__PV_PLAYLIST__';
// Older playlist links created before the content-type selector do not have its
// catalogue marker. Recognize their Spotify playlist destination without changing
// the saved record, so the editor can migrate it safely on the next save.
const isLegacyPlaylist=record=>!record?.catalogue&&!record?.releaseDate&&Array.isArray(record?.links)&&record.links.length===1&&record.links[0]?.service==='spotify'&&/^https:\/\/open\.spotify\.com\/playlist\/[^/?#]+(?:[?#]|$)/i.test(record.links[0]?.url||'');
export const contentTypeOf=record=>record?.contentType==='playlist'||record?.catalogue===PLAYLIST_CATALOGUE||isLegacyPlaylist(record)?'playlist':'release';
