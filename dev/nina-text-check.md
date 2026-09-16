# Isolated Nina conversation checks

The Lab browser needs a microphone before it exposes a conversation. This page uses the existing Anam SDK with `disableInputAudio: true` and sends typed user messages to an active session.

It accepts a single-session token only. It does not use Clerk, call the production Worker, write D1 messages, change the saved Anam persona, or learn memories. Anam still records and bills its own session. The page stops after three minutes, and aborts a connection that is not ready after thirty seconds.

The token generator also sets Anam's server-side session limit to three minutes. Add `?relay=1` to the page URL to select the documented TURN relay mode. The initial status identifies the loaded mode; expand Connection events to inspect the stages reached. The versioned module URL prevents a cached script from silently running the previous transport settings.

## Validation status on 16 September 2026

Native conversation validation is blocked in the automated browser. Three sessions timed out before `SESSION_READY` or `DATA_CHANNEL_OPEN`. The first two used automatic routing; a cached script invalidated the intended relay selection in the second attempt. The third explicitly confirmed TURN relay mode and emitted `VIDEO_STREAM_STARTED`, but never opened the conversation data channel or received usable video. All three session records ended with zero recorded session milliseconds. This does not diagnose the cause of a visitor's connection problem.

The temporary restricted API credential used for these tests was deactivated. The existing website and local-development API keys were not changed. No production personality improvement is claimed by this test page.

## Create a test token

Use an authorized Anam development credential in `ANAM_API_KEY`. The script reads the persona and preserves its avatar, voice, model and director settings. Only the explicitly configured Shared Canon folder is attached. No owner history, private folder, HTTP memory tool or relationship assessment is included.

```sh
node scripts/create-nina-text-test-token.mjs --out /tmp/nina-text-test-token.json
```

For a candidate, add `--prompt /path/to/candidate.txt` or `--model MODEL_ID`. Change one factor at a time. The saved token is sensitive and must stay outside the repository. Copy its `sessionToken` into `dev/nina-text-check.html`, start, and send fictional test dialogue. Stop the session before opening another test.

## Acceptance

Compare entire exchanges with the current prompt using the same questions. Assess whether Nina follows the actual point, contributes a specific thought, responds to corrections, avoids an automatic counseling or interview pattern, and leaves conversational room without cutting sentences. A shorter answer alone does not pass. Check a canon lookup separately when the candidate changes model or knowledge instructions.

The 26 Cloudflare screening outputs in `nina-screening-2026-09-16.json` are preliminary. They include one instruction-calibration response. They do not measure Anam latency, audio, interruptions or native tool retrieval. They are fictional test dialogue and include no private relationship data. None justified a production personality change. Shorter prompts reduced some turn lengths but still produced generic counseling, forced metaphors and stock future-setting details. GPT OSS 120B was tested through Cloudflare, whereas the actual Anam configuration hosts it through Groq; these are not identical runtimes.
