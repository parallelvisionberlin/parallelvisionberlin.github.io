# Nina Anam token and memory Worker

This Worker keeps the Anam API key server-side, returns a fresh short-lived session token for Nina's published persona, and stores authenticated owner memory in Cloudflare D1. Public visitors remain on browser-only recent memory.

## Deploy

Run these commands from `anam-token-worker`:

```powershell
npm install --global wrangler
wrangler login
wrangler secret put ANAM_API_KEY
wrangler secret put NINA_OWNER_TOKEN
wrangler d1 migrations apply nina-fok-memory --remote
wrangler deploy
```

When `wrangler secret put` prompts for a value, paste the API key from Anam Lab there. Do not paste it into a file or into Codex.

Copy the deployed URL printed by Wrangler, append `/session-token`, then replace the placeholder value of `ANAM_SESSION_TOKEN_ENDPOINT` in `js/nina-access.js`. Example:

```js
const ANAM_SESSION_TOKEN_ENDPOINT =
  "https://parallel-vision-anam-token.YOUR-SUBDOMAIN.workers.dev/session-token";
```

The Worker accepts production browser requests only from `https://parallelvisionlabel.com` and `https://www.parallelvisionlabel.com`; HTTP localhost and `127.0.0.1` origins are allowed for development.

## Owner activation

The owner token must never be committed or printed in browser logs. On Alejandro's browser, enroll it once from the site console:

```js
enrollNinaAlejandro("PASTE_OWNER_TOKEN_HERE")
```

The existing browser-only 20-message archive remains available if the server binding, owner credential, or network is unavailable.

## Owner memory endpoints

All endpoints require `Authorization: Bearer <NINA_OWNER_TOKEN>`, Alejandro's permanent `visitorId`, and the production Origin header.

- `GET /memory/metadata?visitorId=...` returns counts and summary presence only.
- `GET /memory/export?visitorId=...` downloads the complete transcript as JSON.
- `DELETE /memory` deletes the complete owner memory graph.
- `POST /memory/messages` accepts validated completed user/persona messages.
- `POST /memory/conversations/end` closes a conversation and schedules consolidation.
