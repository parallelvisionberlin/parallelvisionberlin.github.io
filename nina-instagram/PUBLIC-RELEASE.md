# Nina Instagram public reply release

Prepared on 2026-10-21 from the complete production Worker supplied by Alejandro in `Pasted markdown(20261021-122346).md`. This repository commit is source preparation, not a Cloudflare deployment.

## Behavior

- First public reply: random deadline between 10 minutes and 2 hours after the first incoming message in a new conversation.
- Active conversation: up to six further successful replies around 2 minutes apart. With the existing once-minute cron, the selected next deadline is 90 to 150 seconds after the incoming message; generation and network time are additional.
- Reset: 30 minutes after the latest successful outgoing reply, or once six quick replies are used. The next incoming message gets the initial delay again.
- Messages received while waiting are grouped into one reply to the newest incoming message. Continuous typing cannot keep extending the original first deadline beyond two hours.
- A confirmed owner link retains the existing owner pacing and private-vault access checks. Public users receive only their own conversation and permitted public context.
- Incoming voice uses the same queue after transcription. Actual Instagram voice delivery remains to be checked after deployment.
- Existing limits remain: 120 send attempts globally per rolling day, 80 per sender, 8 per minute per sender, and 120 stored drafts per rolling day. No old stored messages are backfilled.

## Deploy into the existing Worker

1. Open `https://dash.cloudflare.com/a40ce1725295563a7b7db9fc3160480a/workers/services/view/nina-instagram/production` and select **Edit code**.
2. Replace the current main JavaScript module with the complete contents of `worker.mjs`, then select **Deploy**. Keep the existing bindings, secrets and once-minute cron.
3. The next cron invocation or signed incoming message initializes the release. It creates two small Instagram-only runtime tables and atomically upgrades the verified `tester` configuration to `public`, once. The owner vault and original Nina database are not changed.
4. Open `https://nina-instagram.parallelvision.workers.dev/health`. Expected values: `release: public-paced-2026-10-21`, `mode: public`, `publicRepliesEnabled: true`; timing fields show `[10,120]`, `120`, `6`, and `30`.
5. Send a fresh DM from a non-tester Instagram account. Confirm the delayed first reply and then a follow-up reply. This is the remaining end-to-end public-access check, including any Meta permissions outside the Worker.

This explicitly authorized release defaults public DM and voice flags to enabled when the corresponding environment variable is absent. An existing explicit override still applies: `NINA_PUBLIC_DM_ENABLED=false` blocks public sending and automatic activation; `NINA_PUBLIC_VOICE_ENABLED=false` blocks public audio processing. Set an existing override to the exact string `true` only when enabling that feature. Other unexpected values fail closed.

The activation marker is one-time. Changing D1 mode back to `tester` or a disabled mode after activation is respected across restarts and redeploys; the release does not keep reopening public access. Existing send deduplication, signed webhooks, opt-outs and the reply window remain enforced.

## Verification

Run with Node 24 or later:

```sh
node --check nina-instagram/worker.mjs
node --test nina-instagram/worker.test.mjs
```

The tests use real in-memory SQLite with a D1-compatible prepared-statement adapter and simulated Meta/model requests. They verify first-delay bounds, six quick replies, idle reset, coalescing and concurrent ordering, opt-out/resume, explicit disable overrides, one-time activation, owner-context separation, invalid signatures, expired jobs, uncertain-send deduplication, and voice gating/transcription deduplication. They do not prove a Cloudflare deployment or Meta public delivery.
