# PV LAB release safety audit: 2026-10-13

## Legal identity display change, 2026-10-22

- The owner explicitly requested PV LAB as the sole displayed provider label throughout the public PV LAB Terms, Privacy and Impressum, keeping the already published Berlin postal address and support email. The consumer withdrawal form also uses PV LAB. Other personal and artist site pages are outside scope.
- IMPORTANT LEGAL GAP: The operator is documented as an individual business, not a registered corporation. § 5 DDG and IHK guidance require a sole proprietor's actual first and last name in Impressum; GDPR Art. 13 requires the controller's name and contact details. **Brand-only disclosures must not be represented as legally compliant.** Have this reviewed with a German lawyer and reinstate required identification or establish a genuinely separate lawful provider structure before relying on this format for paid customer sales.
- No company registration, new legal entity, or eligibility for anonymity has been verified. Do not alter billing/Stripe identities, tax records, merchant details or other websites on the assumption that PV LAB is a legal entity.
- This change was owner-directed. Preserve the provider address/email, model withdrawal accessibility, and customer statutory rights. Scope is public legal-page identity display only.

This checkpoint separates **verified configuration**, **source-level checks**, and **external go-live gates**. It is not an unconditional legal or tax certification.

## Confirmed Stripe settings in the dedicated LIVE PV Lab account

- Business profile: name **PV Lab**; address **Knorrpromenade 9, 10245 Berlin, Germany**; support `contact@parallelvisionlabel.com`; support page `https://parallelvisionlabel.com/lab/customersupport/`.
- Default live customer billing portal `bpc_1UPhdjPCZAMYtQh7khXwflER` updated **2026-10-13** with:
  - `https://parallelvisionlabel.com/lab/privacy/`
  - `https://parallelvisionlabel.com/lab/terms/`
  - Invoice history, payment-method update and subscription cancel **at period end** retained.
  - Return URL `https://parallelvisionlabel.com/lab/studio.html` retained.
- Stripe Tax head office set to the already confirmed Berlin address. Stripe Tax Settings now reports `status: active` rather than `pending` (head office missing). **Zero tax registrations** remain; this action did not register tax liabilities, enable Automatic Tax or determine whether §19 UStG applies.
- Live PV Lab Stripe webhook has **eight** enabled events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.paid`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `charge.refunded`, `charge.dispute.created`.
- A previously created live €10 Checkout session existed in state **open/unpaid** at review; do **not** describe it as a paid customer verification.
- Stripe reports `charges_enabled`, `payouts_enabled` and `details_submitted` true. Its payment statement descriptor still identifies Parallel Vision; change only after owner approval if a shorter PV LAB descriptor is desired.
- Live invoice delivery/PDF and subscription renewal have **not** been observed. One-time paid invoices are deliberately off unless `LAB_STRIPE_INVOICES_ENABLED=true` and a verified footer secret is supplied. Enabling Stripe's post-payment invoices can incur a fee. Do not silently enable them.

## Production and tests

- Static site, commercial terms, privacy notice, customer support, catalog, Studio, Clerk sign-in UI, gallery and Stripe billing portal interface are already built. Main site and original owner workflows must remain unchanged.
- The existing Stripe-only sandbox completed a €10 **test-mode** payment, delivered 1,000 **sandbox** credits via a signed webhook and verified no double grant.
- Source covers webhook HMAC signature freshness, Stripe test/live separation, per-account credit ledgers, atomic generation debit, definite-failure credit refunds, duplicate webhook idempotence and billing-review holds. CI fixtures test subscription creation/renewal, out-of-order events, wrong-account credits and refund/dispute holds. These are **not substitutes** for a real signed live subscription/invoice.
- Main Worker feature flags must stay `LAB_PUBLIC_GENERATION_ENABLED="false"` and `LAB_CHECKOUT_ENABLED="false"`. Never enable public billing just because this audit or a PR is merged.
- Private live customer pilot now allows only **one €10 one-time credit pack OR one €15/month Starter subscription**, and only for an exact separately allowlisted Clerk subject in the encrypted Cloudflare `LAB_LIVE_PILOT_CUSTOMER_ID` secret. Larger products remain denied in the pilot. For Starter, Stripe's recurring Checkout and signed **paid subscription invoice** must supply 1,600 credits, once per billing cycle.
- Recurring billing is real money if the owner explicitly purchases the Starter subscription later, and continues until cancelled at period end in Stripe's portal. **No transaction has been initiated by this code change.**
- User's existing owner-only tools and Nina databases/identity are not altered.

## Model provider entitlement and privacy

- **Higgsfield** (as of 2026-09-02 API terms, https://open.higgsfield.ai/terms-of-service §4.2): requires prior written permission for standalone or substantially similar resale/model-access/generation services. Source has a **customer-only default-deny** `LAB_CUSTOMER_HIGGSFIELD_ENABLED !== "true"`; both the customer config and direct `/api/higgsfield/` routes stay blocked pending verified commercial approval. Owner tools continue to function. Do not enable this variable casually; obtain the necessary permission, check DPA and upstream model permissions first.
- **fal** (https://fal.ai/legal/api-services and https://fal.ai/legal/data-processing-addendum) explicitly documents an API-based Client Solution offered to End Users and a DPA. Still validate model-level licenses and where/how submitted images are handled before enabling an individual model.
- **SpicyAPI** (https://docs.spicyapi.ai/docs/retention) publishes approximate default caps of 14 days for generated media, 30 days for prompt/task content and 1 day for reference uploads; shorter periods are configurable. It says it does not train on requests **itself**, while upstream model-provider terms remain separate. The customer privacy notice already avoids promising immediate upstream erasure or universal no-training. Verify model access, key caps and contracted processor/transfer safeguards.
- **Clerk** (https://clerk.com/legal/dpa) publishes a DPA. Check the linked account's signed agreements, data access and retention.
- Do not falsely represent that all generated content remains exclusively inside the EU or that every model has zero retention.

## Stripe processor use-case constraint

- Stripe's public restricted-business policy (https://stripe.com/legal/restricted-businesses) prohibits pornography and mature-audience imagery/media made for sexual gratification, including AI-generated content satisfying that description. German Gewerbe registration does **not** override Stripe's payment-processor policy.
- PV Lab's declared Stripe product is a general AI creative/fashion software platform, not a sexually explicit content service. Account `charges_enabled=true` does **not** constitute separate advance clearance to monetize erotic/pornographic generation. Before the public Stripe-backed launch, align the supported customer product and terms with Stripe's policy or obtain explicit processor guidance. Fashion editorial work is the initial product scope; do not falsely claim that any and all adult material is approved.
- The existing terms prohibit minors, intimate imagery without consent, fraud and unlawful acts. They do not currently explicitly prohibit Stripe-disallowed adult-content use. Decide and enforce an acceptable-use scope before global paid release. Do not silently switch the private owner's creative tools or advertise unrestricted adult paid generation through Stripe.

## Germany-first administrative review

- Owner confirms an existing German Gewerbe, tax registration and Berlin business address. Do not request a new company or new German tax registration simply to start preparing sales.
- Berlin official Gewerbeummeldung guidance (https://service.berlin.de/dienstleistung/122111/) says a materially additional commercial activity is to be registered as an extension, normally at the same time. It is available online for a published €15. Candidate additional description for the owner: `Entwicklung, Betrieb und Vertrieb einer webbasierten Softwareplattform zur KI-gestützten Bild- und Videogenerierung und -bearbeitung sowie Verkauf digitaler Nutzungsguthaben und Abonnements.` The owner must submit and pay for this registration, not an assistant.
- German **§19 UStG** (https://www.gesetze-im-internet.de/ustg_1980/__19.html) has preceding-year €25,000 and current-year €100,000 turnover thresholds under its conditions. Eligibility needs review of the owner’s **total** turnover and tax choices, not just PV Lab. Stripe's head-office setting alone does not determine Kleinunternehmer exemption.
- Until commercial tax scope is verified, treat **German customers** as the first launch cohort and do not assert that checkout tax handling is already suitable for the whole world. Do not substitute client-side country display/currency for actual VAT handling.

## Still-required evidence before public release

1. Later, with the owner's explicit consent, test a **real Starter subscription** from a separate Google/Clerk customer account with precise amount, billing interval and email; verify the paid Stripe invoice webhook grants 1,600 credits **exactly once**, not at redirect, and that the invoice/receipt has the correct PV Lab identity, address and applicable tax wording. Check portal cancellation and effective date. If no pilot ID is configured in Cloudflare, nothing is enabled.
2. Submit one low-cost **Seedream** job against the customer's actual 1,600-credit wallet, verify quoted debit, status, result persistence, exact original download, page reload, another-account access denial and provider spend cap. If a provider attempt fails or is uncertain, reconcile it rather than retrying blindly.
3. Test refund and chargeback operational reconciliation, not just the spending hold. `lab_billing_reviews` requires a reviewed adjustment ledger entry, treatment of spent/referral credits and supported customer communications. No automated money refund is claimed.
4. Verify the live **subscription invoice PDF / email**, invoice footer (including §19 only if applicable), Stripe Billing subscription lifecycle and domestic customer totals. Stripe's one-time post-payment invoice fee remains unapproved and disabled.
5. Confirm actual processor DPAs/transfer safeguards/retention and selected model permission. **Higgsfield public sales remain denied** unless written authorization supports the PV Lab use case.
6. Submit necessary Berlin **Gewerbeummeldung** for software platform activity and confirm §19/tax treatment from existing accounts with a qualified adviser. This is a business filing, not a reason to create a new Gewerbe or halt technical work.
7. Only after the signed-in end-to-end customer test and commercial checks pass, separately authorize the public Worker flags. Review production cash/provider balances, security/logging and roll-back plan.

This file tracks launch readiness. It does not itself deploy secrets, activate public sales, verify third-party signed agreements or charge any customer.

## Footer, referrals and consumer-rights website update (13 October, evening)

- The homepage, Studio, account, mood pages and Fashion page now include a PV LAB-branded four-column footer linking to existing Privacy, Terms, Customer Support and the new `/lab/impressum/`, `/lab/cancel/` and `/lab/withdraw/` information pages.
- Shared footer deliberately does not display the proprietor's personal name. The separate Impressum must identify the legally responsible individual and cannot be anonymized merely for visual preference.
- The public homepage's “Get your invite link” now points to the implemented customer account route `/lab/account.html#referrals` instead of `/lab/studio.html?referrals=1`. Referral rewards still depend on eligibility and the public rollout flags.
- Existing analytics “Privacy choices” control was retargeted to the Legal footer column.
- **Compliance blocker: these are information and billing-management links, not yet a complete `§ 312k BGB` or `§ 356a BGB` electronic submission feature.** The new cancellation and withdrawal pages presently offer authenticated Stripe portal access or contact-email instructions; they do **not** offer the independently accessible two-step submission interface with legally prescribed confirm action, timestamped durable proof, and immediate electronic receipt acknowledgement. Do not describe these pages as legally compliant cancellation/withdrawal buttons.
- Before accepting public B2C subscription sales, implement and test the un-gated cancellation and withdrawal notice workflows (with tamper-resistant receipt storage and sender/customer acknowledgement email delivery) and have their applicable scope reviewed. The configured `contact@parallelvisionlabel.com` is used for contact; its existence in website source is not proof of a deployed transactional email sender.

