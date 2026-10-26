# PV LAB Search indexing

## Objective and verified baseline
- Date: 2026-10-26. Source baseline: `d59ed8e1a3643b3fa69f8f97fe4f228ffa29a65a`.
- Investigate both Search Console notices: 11:06 UTC indexed without content; 11:08 UTC failed 403 validation.
- Gmail messages `1a177e415c2f21b4` and `1a177e593fdbaa7b` confirm the reasons but contain no example URL list.
- Production is Cloudflare Pages `pvlab-studio`, apex `pvlab.studio`, repository `lab/` copied to root and `/lab/`.
- Cloudflare baseline production deployment `477fd635-9ce8-48b3-899d-d18283984d12` successfully published baseline SHA.

## Confirmed 403 cause
- Cloudflare GraphQL `firewallEventsAdaptive` records verified Search Engine Crawlers blocked with HTTP 403.
- Rule: `8fcb869e55804a6d94f482a0a25aa53a`, description `Block AI training crawlers - BOBA-199`.
- Ruleset: `3e677e63d4e9479382576f3fa66279e7` in the SBFM phase; events label source `firewallManaged`.
- Googlebot `/`: 2026-10-23 10:15:56 UTC. `/zencreator-alternative/`: 10:22:46 UTC.
- Googlebot `/sitemap.xml`: Oct 23 10:27:54 and 10:31:26; Oct 25 04:33:24 UTC.
- Cloudflare classifies these as `clientIPClass: searchEngine`, `verifiedBotCategory: Search Engine Crawler`.
- These are edge blocks of public content, not legitimate account/API authorization refusals.

## Applied Cloudflare repair
- At 17:55:29 UTC, created custom entrypoint `2bc239cd277d4b0ca734045503d3e89c` v1.
- Rule `c924364254b245d5a098fe3a9a1f28d7` skips only `http_request_sbfm` for verified search crawlers.
- Exact reviewed expression and API body: `.github/cloudflare/pvlab-verified-search-public.json`.
- Scope: apex host, GET/HEAD, both Cloudflare verified-bot signals, eight explicit public page/discovery paths.
- Private account, Studio, owner, API, media and payment paths are outside the exception. Logging stays enabled.
- Managed WAF, DDoS, rate limits, Browser Integrity Check, AI-training preference and Clerk/Worker authorization unchanged.
- A per-rule skip was rejected by Cloudflare as unavailable in the custom phase; documented supported SBFM skip used.
- Readback confirms exact active rule. A subsequent genuine Google crawl is still needed to prove its crawl result.

## HTTP and source findings
- Ordinary curl GET: `/`, `/zencreator-alternative/`, `/moods`, `/sitemap.xml` return 200 with correct content types.
- Homepage and comparison have substantial static HTML, main headings and correct apex canonicals.
- HTTP apex and HTTPS www redirect 301 to HTTPS apex; `/lab/` redirects 301 to `/`.
- Production robots permits search and points to `https://pvlab.studio/sitemap.xml`; root repository robots is not deployed here.
- `/moods` incorrectly canonicalized the old Parallel Vision domain and was missing from the sitemap.
- Old Moods aliases had only client-side navigation. Unknown paths returned homepage 200 due to Pages SPA fallback.
- The Python urllib client receives Cloudflare 1010; that client-specific rejection is not treated as Googlebot evidence.

## Repository repair and validation
- Correct public Moods/aliases and legal/support canonicals to pvlab.studio; add Moods to its sitemap.
- Add permanent server redirects for old Moods aliases and a top-level Pages `404.html` for missing routes.
- No product CSS/JS, provider, account, generation, wallet or private-data changes.
- 12 focused Node checks passed: search discovery/security, comparison landing, mandatory approved Image contract.
- Source PR/merge and Pages deployment receipts: pending, must verify before claiming published.
- Relevant files: `lab/_redirects`, `lab/sitemap.xml`, `lab/404.html`, canonical tags in public HTML, new indexing test/config.

## Remaining Google verification
- Search Console browser reaches selected `parallelvision.label@gmail.com` password screen; not authenticated yet.
- Cannot identify the exact indexed-without-content example or assert it shares the 403 cause without that report.
- Next: publish verified repository repair; inspect both report example lists and latest crawl/rendered HTML.
- Then rerun live URL tests for affected public URLs and request appropriate indexing/403 validation.
- Keep authenticated pages noindexed and excluded from sitemap; do not expose private data to make validation green.
- Do not claim Google warnings cleared until Google recrawls/reprocesses them. No validation restarted yet.
