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
- Readback confirms exact active rule. Search Console live homepage fetch on Oct 26 at 21:20 Europe/Berlin now says `URL is available to Google` and `Page can be indexed`.

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
- PR #589. Initial CI found security-config fixture absent in legacy sparse checkouts; retain its assertions in a dedicated full-checkout search-indexing workflow. Product code unchanged by fixture repair.
- PR #589 merged as `c4ea73c6ea215cf6e3df10682cf0ddf8f5e70353` at 18:56:33 UTC; reviewed head `90b663c08c1201dfef9ce633846ddf7e4af2401d` has 15 successful checks.
- Exact merge Cloudflare Pages check succeeded. Production `0019e506-7c1a-493e-b227-3f1ba77e6cb1` at descendant `5bf68cc665aa3613e81c93f127df116324873747` succeeded 19:03:35 UTC; ancestry verified.
- Live verification: three public pages 200 with apex canonicals; sitemap includes Moods; aliases 301; missing URL 404 with noindex. Sitemap and 404 body exactly match reviewed source.
- Source hashes: sitemap SHA256 `c8f13fab609d734a3b909d540f490d5dd96c260f3fb7877801faadd825550e1c`; 404 `01c5c0de409128de8663934494485e2547a3dc47d014b9a855f97793184ec65e`.
- Account/owner/Studio shells remain noindexed. Unauthenticated Worker GET `/api/jobs` returns 401, no-store and X-Robots-Tag noindex.
- The post-merge comparison smoke failed because it required the withdrawn 200-credit offer. Follow-up changes only that obsolete expectation to current prepaid/monthly and no-free-signup copy; image/sitemap/robots checks retained.
- Relevant files: `lab/_redirects`, `lab/sitemap.xml`, `lab/404.html`, canonical tags in public HTML, new indexing test/config.

## Google verification on 2026-10-26
- Secure sign-in and iPhone verification completed; Search Console shows Parallel Vision account and domain property pvlab.studio.
- Exact indexed-without-content example: `https://clerk.pvlab.studio/`, last crawl Oct 23. This is the Clerk frontend API host, not a commercial HTML page.
- Direct root GET returns HTTP 200, application/json, empty body and `X-Robots-Tag: noindex, nofollow`. Preserve its DNS/authentication/privacy; do not publish content or request indexing for this host.
- Exact five 403 report examples: HTTPS apex homepage, HTTPS apex /zencreator-alternative/, HTTP www homepage, HTTPS www homepage and HTTP apex homepage.
- Homepage live inspection succeeded: available to Google, page can be indexed; indexing request accepted into priority crawl queue.
- 403 validation restarted and visibly confirmed `Validation Started`, Oct 26, 5 pending / 0 failed. This is a newly started check, not a completed pass.
- Indexed-without-content validation also visibly confirmed `Validation Started`, Oct 26, for the Clerk root; noindex was retained.
- Sitemap still showed Oct 23 `Couldn't fetch`. Resubmitted changed sitemap exactly once; Google now reports `Success`, last read Oct 26, 3 discovered pages.
- No new production code or security changes were needed during this Google follow-up. Prior repairs and private account protections remain in place.
- Next: await Google's recrawl and validation results. Do not restart checks or resubmit unchanged sitemap repeatedly; do not claim pages already indexed.
