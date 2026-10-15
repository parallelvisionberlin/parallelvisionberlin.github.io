# PV LAB smart prompt and precision retouch

- Deterministic photo guidance uses the existing shared browser/Worker compiler, with no extra model call or generation cost. It uses separate contextual rules for portrait, fashion, product and art. The written request remains intact.
- Identity and Body roles take priority over Style/General. Multiple competing Pose/Environment/Clothing/Body roles show advisories and require confirmation before a paid image is submitted. Reference guidance still cannot guarantee an exact physical identity match.
- Exact Prompt appears only in Advanced image options. It bypasses automatic polish while keeping role maps and selected Moods. Job Reuse restores the exact setting.
- Result image details offer Fix eyes precisely, which opens the existing Retouch masked editing system with an eye-fidelity prompt. The completed output is imported as a new source rather than passing an output-only ID as a source ID.
- Customer Retouch uses free manual Brush/Eraser selection and a quoted, explicitly approved FLUX inpainting job. The existing D1 job ledger atomically reserves image credits and refunds definite failures. SAM 3 Magic Select stays owner-only because its separate metered request has no customer quote/credit charge.
- No paid inference is triggered on deployment. Actual skin, iris and identity accuracy need consented A/B evaluation; these are prompt instructions rather than guaranteed model controls.
