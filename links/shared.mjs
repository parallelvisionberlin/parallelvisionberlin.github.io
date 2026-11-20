// One source of truth; Worker-only checkouts retain their complete dependency graph.
export * from '../lab-worker/music-links-shared.mjs?v=20261103-workspace1';
// Existing music catalogue storage retains a reserved, reversible playlist identifier.
// This avoids modifying PV LAB billing/Worker/D1 to add a second music content format.
export const PLAYLIST_CATALOGUE='__PV_PLAYLIST__';
export const contentTypeOf=record=>record?.contentType==='playlist'||record?.catalogue===PLAYLIST_CATALOGUE?'playlist':'release';
