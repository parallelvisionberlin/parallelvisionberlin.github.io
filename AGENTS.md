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
