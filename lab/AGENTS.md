# PV LAB Studio: owner-approved interface safeguards

These instructions apply to all changes under `lab/`, in addition to the repository-level `AGENTS.md`.

## Scope first
- Change only what the user requested. Do not "improve" copy, UI labels, Mood content, models, buttons, defaults, CSS, pricing or imagery as a side effect of an unrelated fix.
- Treat previously approved interface decisions as locked. If a requested fix truly requires changing one, explain the conflict and ask before changing it.
- Inspect the current code and the scoped work-state note before editing. Review the final diff for unrelated edits.

## Approved Image prompt copy
- Empty Image input: `What do you imagine?`
- Base image: `What would you like to change?`
- References-only or Controlled Pose with references: `Describe the image you want to create...`
- Native optional direction: `Anything else? Add a direction (optional)`
- `lab/lab.js` function `syncImageComposer()` is the sole writer of the contextual prompt placeholder.
- `fitImageComposerPrompt()` owns only sizing. It must never change the prompt placeholder or rewrite the user's text.
- `image-editorial-deck.js` owns only presentation state. Clearing a long prompt must restore compact empty dimensions; attached photos keep their reference strip. Do not reintroduce an unconditional sticky expanded state.
- Preserve the approved two-row long-prompt deck, compact empty deck, toolbar, Generate action, Mood and image reference controls.

## Required verification
- Run `node --test tests/lab-approved-image-ui-contract.test.mjs` before proposing UI changes, even when an unrelated change touches Image Studio.
- The GitHub Actions workflow `PV LAB approved Image UI contract` runs for every PR and every push to `main`. Never bypass, delete, or weaken the contract just to make a change pass.
- When the Image deck itself changes, also run the relevant Playwright tests: `tests/lab-image-prompt-paste-ui.mjs`, `tests/lab-first-image-instant-browser.mjs`, and `tests/lab-studio-layout-ui.mjs`.
- Treat changes to locked wording or sizing as requiring specific, explicit user approval and corresponding test changes. A failing unrelated suite is not permission to weaken this check.
- Verify merged source, actual hosting deployment, and signed-in behavior separately. A GitHub merge by itself does not prove the live site updated.
