# PV LAB 120-credit signup welcome offer (staged, not activated)

This is a separate campaign from the existing **200 + 200 referral rewards**. It uses PV LAB's existing D1 customer wallet and immutable `lab_credit_entries` ledger. It does not write to Nina, Stripe or the owner-only workspace.

## What is implemented

- **120 PV credits** automatically awarded to each new, authenticated Lab customer created **on or after the explicit activation timestamp**, once per Clerk subject.
- Credits are **general-purpose**, not tied to five images or a specific model. Image, video, upscale and other supported billable jobs can consume the balance if the backend quote is within the available credits and that model is enabled for customer use.
- No debit occurs at sign-up. The actual provider is not called until the customer initiates a generation and it passes all existing quote, permission and balance gates.
- The grant is written with `kind='adjustment'` and the immutable unique reference `welcome:120:v1:<clerk-subject>`. Account creation and the bonus insert are one atomic D1 batch. Repeated requests, concurrent sessions or webhook retries cannot award it twice.
- Accounts created before the activation timestamp are excluded, including customers with old zero-credit balances. No database migration is required.
- **No expiry, per-mood limit or image-only restriction** is introduced in this implementation. If expiration is later required, implement an auditable bucket/spend-order policy first rather than silently deducting an existing balance.
- No bypass of provider moderation, account restrictions, billing holds, or customer model authorizations. Higgsfield permissions and upstream provider rules remain separate.

## Activation is intentionally pending

The user asked to start the campaign **after the current chat ends**, not while implementation is under discussion. A chat-end event is not a deployment trigger, so the code remains inactive until an explicit activation action.

Current settings in `lab-worker/wrangler.toml`:

```toml
LAB_WELCOME_CREDITS_ENABLED = "false"
LAB_WELCOME_CREDITS_ACTIVATED_AT = "0"
```

To activate deliberately:

1. Verify the prepared branch has been reviewed and the Lab tests passed. Merge it with the bonus **still off**.
2. At the agreed go-live moment, choose the current epoch time **in milliseconds**, e.g. retrieve via `Date.now()` in an authenticated operator environment. Set `LAB_WELCOME_CREDITS_ACTIVATED_AT` to that 13-digit value and `LAB_WELCOME_CREDITS_ENABLED` to `"true"`. Update both in the actual Cloudflare production Worker configuration, or release the corresponding Wrangler configuration changes and **read back the deployed values**. The deployment workflow uses `--keep-vars`, so do not assume a repository edit alone proves the active Worker settings.
3. Test a brand-new Google/Clerk account in production and confirm **one 120-credit `adjustment` ledger entry**, 120-credit wallet and the expected displayed balance. Then sign out/in and refresh concurrently; confirm no second grant. Verify an existing pre-activation Lab customer receives nothing.
4. Generate a low-cost permitted model using the gift credit, confirm charged credits and failure refunds, and ensure no unbilled customer routes can incur provider costs.
5. Monitor new-account grants, duplicate or abusive signups, provider spend and new-customer purchases. Pause instantly by switching `LAB_WELCOME_CREDITS_ENABLED` back to `false`. Existing awards are not revoked by the switch.

**Important:** Starting the campaign does not itself authorize opening any separate customer generation, checkout, region, restricted model, or commercial content feature. Read back those rollout controls separately. The repository currently has checkout/generation flags set to true, while the October 13 release safety audit documents earlier restrictions. Live Cloudflare settings and compliance status need verification before calling a full commercial launch approved.

## Cost envelope

At 460 PV credits per $1 of quoted provider cost, 120 gift credits nominally represent approximately **$0.261** of API quotes per fully redeemed account, not a provider invoice. 100 / 1,000 fully redeemed new accounts represent about **$26.09 / $260.87** before other operating costs, unexpected upstream price changes, or refunds. Providers must independently enforce spend limits.

Seedream 5 Pro currently uses SpicyAPI; Seedream Flash is configured through OpenRouter. Provider charges for advanced models, references, and video duration are governed by the live quote or independently verified server estimate, not by the marketing claim.
