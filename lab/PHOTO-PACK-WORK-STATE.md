# PV LAB Photo Pack Studio work state

Updated: 2026-10-16
Scope: The Create Photo Pack source selector, specifically “Current Image deck”.
Baseline main HEAD before this update: 4bf3bb7eba48a41f8644173d038a263a55d71840.
Repository: parallelvisionberlin/parallelvisionberlin.github.io.

## Reproduced cause
- The create step silently initialized its source to “deck” if references existed.
- “Current Image deck” was already visually pressed on entry.
- Its click handler merely chose the same source and re-rendered, so users saw no change.
- This is a selector-state/feedback bug; no broken generation API was established.

## Implementation
- A newly opened Create Photo Pack form starts with neither source chosen.
- Before selection, the photo bank shows a neutral instruction and an empty count.
- Clicking Current Image deck explicitly selects the currently attached photos.
- The preview grid and photo count then update and the selected card is highlighted.
- A small selection message confirms the choice.
- The Save button enables only after a name and 1–10 selected photos are present.
- Opening and cancelling the system upload picker preserves the prior source.
- Previously picked device files can be reselected without opening the picker again.
- Source photos, their order, roles and notes remain unchanged by selection.
- Saved-pack loading, deletion, private uploads and all billing routes are unchanged.
- Source module and parent studio script URLs receive fresh cache parameters.

## Changed files
- `lab/reference-pack-studio.js`: explicit selection and picker-cancel behavior.
- `lab/studio.html`: neutral initial photo source guidance and parent cache key.
- `lab/lab.js`: reference-pack module cache key only.
- `tests/lab-reference-pack-studio-ui.mjs`: choose-deck and cancel-picker coverage.
- `tests/lab-image-oneclick-ui.mjs`: explicitly select source before save.
- `lab/README.md`: this scoped handoff link.
- `lab/PHOTO-PACK-WORK-STATE.md`: this current work state.

## Verification and release
- Patches are restricted to selector behavior, labels, cache keys and tests.
- GitHub Actions Photo Pack Studio browser suite is the required regression gate.
- This change does not issue a model generation or debit credits.
- GitHub commit and CI status must be checked after the ref update.
- Live `https://pvlab.studio/studio.html?tool=image` deploy/runtime not yet confirmed.

## Next action
- Check GitHub Actions results and published site version.
- In an authenticated account, create a pack from an attached deck photo.
- Confirm Save Photo Pack creates a private pack and does not change the deck.
