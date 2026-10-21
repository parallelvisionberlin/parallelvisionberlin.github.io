# Parallel Vision Agent Instructions

## Project
Parallel Vision is a Berlin-based music label, visual world, fashion archive, and website.

The website mixes:
- music releases
- artist pages
- Berlin 2063 worldbuilding
- Future Fashion collections
- Nina FOK
- editorial photography and video
- interactive web experiences

## Core rule
Do not change unrelated parts of the website.

Before editing:
1. Inspect the relevant files.
2. Understand the existing structure.
3. Preserve working functionality.
4. Make the smallest coherent change that solves the task.

## Design direction
Parallel Vision should feel:
- minimal
- editorial
- high fashion
- industrial
- sophisticated
- future-facing
- Berlin
- photographic and believable

Avoid:
- generic cyberpunk
- cheap sci-fi graphics
- obvious AI aesthetics
- excessive neon
- unnecessary UI decoration
- random redesigns

## Berlin 2063
Berlin 2063 is an imagined future world, not generic science fiction.

Use restrained architecture, industrial environments, transit systems, fashion, sound, material research, and human characters.

## Future Fashion
Preserve the identity of each collection.

Existing collections include:
- Chromia
- Lotus 2063
- Bio-Material / DNA Mutation
- Magnetic Tape
- Flesh Zero

Do not merge collections or rename assets unless explicitly requested.

## Website development
- Preserve desktop and mobile responsiveness.
- Never intentionally break an existing layout to fix another breakpoint.
- Reuse existing CSS and JavaScript patterns where possible.
- Avoid unnecessary dependencies.
- Avoid unnecessary refactors.
- Preserve existing filenames and asset paths unless explicitly requested.
- Keep performance in mind.
- Preserve autoplay/video behavior unless the task concerns it.
- Check for horizontal mobile overflow.
- Check desktop and mobile after visual changes.

## Working method
When given a task:
1. Read this AGENTS.md file.
2. Inspect only the files relevant to the task.
3. Make the implementation.
4. Review the diff.
5. Fix obvious regressions before finishing.
6. Report exactly what files were changed.

Do not repeatedly ask for confirmation for normal implementation decisions.

## Git
- Never force push.
- Never rewrite Git history.
- Do not delete working code without a clear reason.
- Prefer one coherent commit per task.

## Active feature handoffs
- PV LAB publishing: follow `lab/RELEASE-PROTOCOL.md`. Production is Cloudflare Pages `pvlab-studio` at `pvlab.studio`; GitHub Pages success is not production evidence. Use the scoped, read-only release verifier before claiming an asset is live.
- PV LAB Control Room: `lab/OWNER-WORK-STATE.md`.
- PV LAB staged prompt safety: `lab-worker/SAFETY-WORK-STATE.md`.
- Parallel Vision homepage hero: `WORK-STATE.md`.

## Automatic continuity and usage efficiency

Standing instruction from Alejandro: preserve quality, speed and autonomy while eliminating repeated work. Apply without reminders or repeated confirmations.

### Start
1. Read applicable AGENTS.md instructions and the existing scoped handoff/current-state summary before exploring source files.
2. For PV LAB, use the relevant sections of `lab/README.md`; for a specific feature, find its heading first instead of reading the full historical log. For Nina, locate the existing Nina/Worker README or handoff by filename and reuse it.
3. Check the summary's recorded commit and date against current Git state. Read only the changed or task-relevant files. Current code and verified results override stale notes.
4. Reuse approved designs, asset paths, previous findings and existing authorization. Do not reconstruct completed work or repeat searches for known assets.

### During work
- Scope retrieval and tool output to the next unresolved decision. Batch independent reads; avoid full repository scans, repeated screenshots, broad logs and repeated tests without a concrete reason.
- Diagnose failures before retrying. Check uncertain paid jobs before resubmission. Do not create unsolicited generation variants.
- Group related fixes and verify affected behavior. Preserve required checks for payments, credits, security and data integrity.
- Keep implementation, commit and confirmed deployment status distinct. Do not infer that a commit is live.

### Finish automatically
- Update the existing scoped handoff/current-state summary after each meaningful work unit, before the final reply. No user reminder is required.
- Keep the active summary about 30 to 60 lines: objective, date and verified source commit, relevant file paths, approved decisions/assets, completed work, checks already run, actual deployment status, blockers and exact next action.
- Link to detailed history instead of copying it. Preserve other active tasks and collaborators' entries. Never include credentials or private transcripts.
- If no scoped handoff exists, create `WORK-STATE.md` beside the relevant component and add a short pointer in its README or AGENTS.md. Initialize it from verified work only, not historical assumptions.
- Save through the project's normal authorized version-control workflow. Report a save or deployment failure clearly. Do not claim that these instructions retroactively changed an already-running chat.
