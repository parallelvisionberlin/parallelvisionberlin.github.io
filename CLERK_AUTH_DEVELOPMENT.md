# Clerk authentication development

This development milestone adds Clerk accounts without applying the account migration to production.

## Clerk dashboard

For the development Clerk instance:

1. Enable email address sign-up and sign-in.
2. Enable email verification code or magic-link verification.
3. Enable Google as a social connection.
4. Allow `http://localhost:4173`, `http://127.0.0.1:4173`, `https://parallelvisionlabel.com`, and `https://www.parallelvisionlabel.com` as application origins and redirect URLs as appropriate.

## Local Worker

From `anam-token-worker`, apply the additive local migrations:

```powershell
npx wrangler d1 migrations apply nina-fok-memory --local
```

Create `anam-token-worker/.dev.vars` locally with the existing development-only Anam secret:

```text
ANAM_API_KEY=...
NINA_OWNER_ENROLLMENT_TOKEN=...
NINA_OWNER_SIGNING_SECRET=...
```

For phone testing over Wi-Fi, also add the exact origin used by the phone (replace the example IP with the computer's LAN IP):

```text
CLERK_AUTHORIZED_PARTIES=http://192.168.1.50:4173
```

Do not commit `.dev.vars`. Start the Worker:

```powershell
npx wrangler dev --local --port 8787
```

Serve the repository on port 4173. HTTP development pages automatically use port 8787 on the same host for the local Worker; production HTTPS pages continue using the production Worker URL.

## Create an account

Open `http://127.0.0.1:4173/nina-project.html`, enter Nina, and choose **Sign in**. Clerk's dialog supports the methods enabled in the Clerk dashboard. Creating or signing into the same Clerk account always produces the same verified Clerk subject. The Worker maps that subject to one internal D1 `users.id`.

## Development owner assignment

After Alejandro signs in and starts one local Nina session, inspect the local account rows:

```powershell
npx wrangler d1 execute nina-fok-memory --local --command "SELECT id, display_name, role, created_at FROM users"
```

Assign the confirmed internal account ID as owner in the local database only:

```powershell
npx wrangler d1 execute nina-fok-memory --local --command "UPDATE users SET display_name = 'Alejandro', role = 'owner', updated_at = datetime('now') WHERE id = 'CONFIRMED_INTERNAL_USER_ID'"
```

Never infer owner role from email or frontend data. Production assignment must be a separate reviewed migration step after the account is confirmed.
