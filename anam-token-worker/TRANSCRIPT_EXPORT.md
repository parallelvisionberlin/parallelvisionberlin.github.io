# Owner transcript downloads

In `/nina-admin/`, **Download transcripts** exports a plain UTF-8 `.txt` file directly from the existing Worker. Blank account means the signed-in owner's `memory_visitor_id`. An exact account email or internal user ID selects another account. All exports require the authenticated owner role.

- Today and custom dates use Europe/Berlin, including daylight-saving changes.
- Last 3 hours is a rolling message-time window.
- Custom dates are inclusive calendar dates, limited to 31 days.
- Period exports include stored messages within the selected window and empty conversation records started in that window. They do not depend on the historical analytics-to-conversation matching heuristic.
- Open a linked call and select **Download TXT** to export its entire conversation, independent of the 2,000-message inspector display limit.
- Unlinked authenticated calls offer **Export this account by date**, which preselects the account and Berlin day without guessing a conversation link.

Endpoint: `GET /api/nina/analytics/transcript.txt`. Provide either `conversation=<uuid>` or `period=today|last3h|custom`, optional `user=<exact email or ID>`, and `from=YYYY-MM-DD&to=YYYY-MM-DD` for custom dates. Reuse the dashboard's Clerk bearer token and allowed Origin. Tokens never appear in download URLs.

The response is an attachment with `text/plain; charset=utf-8`, private/no-store caching, and exposed message/conversation count headers. Wording is preserved; database timestamps are not audio timecodes. No PDF generation, AI processing, public transcript storage, migration, transcript rewrite or credit mutation is involved. No-result selections return 404. More than 10,000 result rows or an 8 MiB output returns 413 instead of a partial file.

Verification: `node --test anam-token-worker/test/transcript-export.test.js` covers actual SQLite queries with a synthetic 228-message fixture, account isolation, Berlin/DST boundaries, literal text, empty records, size limits and HTTP authorization. `python scripts/test-nina-admin-call-recovery.py` checks actual browser downloads at 1280px and 390px using synthetic data only. The existing admin workflow runs both.
