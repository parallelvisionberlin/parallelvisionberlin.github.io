# Nina FOK — Anam deployment

## Architecture

The existing homepage access-code gate opens the Parallel Vision Nina interface. No paid session begins at that point. Only after the visitor presses **CONNECT** and grants microphone access does the browser request a short-lived token from the Cloudflare Worker. The Worker asks Anam for a stateful token for persona `a5663da5-5f5c-4600-b545-cbb58bd4e155`; the browser gives that token to `@anam-ai/js-sdk` and streams Nina into the existing video area.

A stateful persona token is used so the published Anam Lab persona remains the source of truth for Nina's Cara-4 avatar, Nina voice, GPT 5 Chat configuration, Knowledge Base, tools, system prompt, and Director Notes. Republishing changes in Anam Lab updates future sessions without duplicating those settings in this site.

The Anam API key stays in the Worker's encrypted `ANAM_API_KEY` secret. It must never be added to the website, repository, query strings, or logs.

## Worker setup and deployment

1. Open Anam Lab and create/copy an API key from the account's API key/developer settings.
2. In a terminal, enter `anam-token-worker`.
3. Install Wrangler if needed: `npm install --global wrangler`
4. Authenticate: `wrangler login`
5. Store the secret: `wrangler secret put ANAM_API_KEY`
6. Paste the key only into Wrangler's secure prompt.
7. Deploy: `wrangler deploy`
8. Copy the resulting `workers.dev` URL and append `/session-token`.
9. Paste that complete URL into `ANAM_SESSION_TOKEN_ENDPOINT` near the top of `js/nina-access.js`. This is the only frontend endpoint configuration point.

## Testing

Run `npm run build` for static verification. For local UI testing, serve the repository over HTTP (microphone access is unavailable from many `file:` pages) and confirm the gate, ready state, close button, Escape behavior, and the clean failure state while the endpoint placeholder remains unchanged. This consumes no Anam minutes.

After deployment, manually test one real call on a supported desktop and mobile browser: pass the gate, press CONNECT, allow the microphone, confirm Nina fills the viewport and can hear the visitor, then close with the X and verify the browser's microphone indicator stops. Repeat once with microphone permission denied and confirm no Worker token request occurs. The website never captures the visitor's camera.

## Teardown and tools

The client calls the SDK's documented `stopStreaming()` method on the X button, Escape, `pagehide`, and `beforeunload`. Pending token requests are aborted and attempt IDs prevent a late connection or duplicate stream. Anam Lab remains responsible for Nina's configured tools (`Knowledge_Olivia`, `end_call`, `change_language`, and `skip_turn`); no client-side duplicate handlers are installed.

## Reverting

Tavus runtime code is retained in Git history. To restore it, identify the last commit before **Replace Nina Tavus runtime with Anam SDK** using `git log`, then selectively restore the relevant Nina files from that commit. Do not reintroduce old deployment credentials without reviewing their current security and billing state.
