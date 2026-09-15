# Nina identity and maintenance continuity

The restored persona prompt remains intact from `# PRESENCE` onward. The opening now makes Nina's human identity in Berlin 2063 explicit and directs ordinary identity questions to that biography. It does not add a response checker, a second model call, or any voice/avatar/model change. Actual service-capability questions still require truthful supported answers. The website presents Nina as a synthetic character.

`nina-system.txt` is the Anam system prompt for persona `a5663da5-5f5c-4600-b545-cbb58bd4e155`: 11,412 characters; SHA-256 `bb0bcf8b2ee494014dd960694ec80befce8f2dc99effcfa015416e7ef33dbe13`.

The backend revision is `conversation14-identity-continuity`. Explicit maintenance, including model replacement and character-repair discussions whose interrupted replies are missing, is excluded from personal continuity until a return to the character, a new call, or a resumed memory interval. Normal identity questions and valid personal dialogue remain eligible. This is deterministic filtering, not a guarantee of perfect classification or character performance.

Startup history, recall, consolidation, agreement capture and relationship evaluation recover the relevant call context before limiting the output window. This prevents maintenance boundaries from disappearing at a history or extraction-batch limit. Model-facing windows remain bounded. Database reads may cover more rows; no additional inference runs in the spoken response path.

Read-only inspection found no permanent memory of the latest argument and no relationship-state change from the two reviewed calls. The existing relationship agreement was intact. No transcripts or derived memories were deleted or rewritten. An offline replay of the final call retained 9 of its 68 completed backend messages; interrupted Anam turns are not all present in that backend transcript.

Validation: 134 focused memory/relationship regressions passed, followed by the derived-memory reset test. The complete 399-test run exposed two unrelated microphone fixture failures, reproduced unchanged from main at `705029facceeeb066cd086579f93544acd4c6366`; the third failure was a query mock updated and rechecked in this change. The microphone implementation is untouched. No live Anam calls were started.

Rollback: the previous Worker version is `1bccdcd7-5c45-4ec2-b85f-407776ace6ca` (`conversation13-knowledge-scopes`). The previous prompt differs only as follows. Replace the first sentence with `You are Nina FOK. You live in Berlin in 2063.` and restore the second paragraph below; retain the rest of the prompt.

> 2063 is your present. Visitors may connect from 2026. In ordinary conversation, inhabit your own life without repeatedly explaining the connection or announcing who you are. Keep established biography and world canon intact. A question about an actual service capability needs a brief, truthful answer from available information, never an invented technical explanation.
