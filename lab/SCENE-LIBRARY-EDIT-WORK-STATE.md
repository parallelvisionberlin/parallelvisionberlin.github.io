# PV LAB Scene Library: Edit Elements

## Scope and intent
- Date: 2026-10-18.
- Branch: `feature/scene-library-edit-elements-20261018`.
- Add an editable saved Element flow for Characters, Outfits, Props and Locations.
- Preserve existing Elements hero images, Photo Packs, original media bytes and prompt deck.
- No new image generation, provider requests, credit charges or migrations.

## Verified starting point
- The `···` card action directly called `deleteItem`; no edit option existed.
- The Scene Library only created and deleted private packs; no update API route existed.
- Stored Elements are private `packs` rows with `PVSCENE1|category|title` names and ordered reference roles.
- `sourceReferenced` and source pruning protect packs and job history.

## Changes in this branch
- `lab/scene-library.js`: small accessible menu with `Edit element` and separate `Delete`; the edit action opens the existing save form.
- Existing photos appear using authenticated thumbnails; users can retain, remove, add and reorder photos without replacing original media or silently changing them.
- Editable fields: title, type, saved note, Character identity/full-appearance setting.
- Saving updates the existing private pack ID; cancelling discards changes and does not mutate the record.
- Original per-reference notes remain byte-for-byte unchanged if title/type/appearance/notes are untouched.
- Save uses optimistic concurrency so stale tabs cannot overwrite a newer Element revision.
- `lab-worker/worker.mjs`: owner-scoped `PATCH /api/packs/:id`, restricted to valid Scene Library Element names, authenticated photo references and matching category roles.
- Removed images are only detached from the Element; private source media is not deleted during an edit because a Studio deck may still be using it.
- `lab/studio.html`, `lab/scene-library.css`, `lab/lab.js`: a consistent edit heading, minimal popover, thumbnail reorder controls and cache keys.

## Validation added
- `tests/lab-worker.test.mjs`: preserve original Element ID, photo order, note propagation; reject stale, wrong-owner and invalid role updates; prevent paid jobs.
- `tests/lab-scene-library-notes.test.mjs`: preserve per-photo notes when editing.
- `tests/lab-scene-library-edit-ui.mjs`: mocked desktop/mobile browser scenario and no paid request.
- `.github/workflows/pv-lab-photo-packs.yml`: runs the new browser and note regressions.
- These changes and tests have been authored; execution results must be checked in GitHub Actions before claiming success.

## Deployment status
- Implementation committed to feature branch; not yet merged or verified live when this handoff was written.
- Production Worker must deploy before frontend edit controls become publicly available.
- If CI fails, resolve it on the feature branch and rerun tests.
- After merge, check Cloudflare Worker production health and Pages deployment independently.
- Verify in an authenticated PV LAB session: Elements > Locations > MyRoom > ··· > Edit.
- Do not claim the production site is updated until deployment is confirmed.
