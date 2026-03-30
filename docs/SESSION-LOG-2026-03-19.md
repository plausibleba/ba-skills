# Session Log — 19 March 2026

---

## Participants
- Terry Roach (orchestrator, laptop — travelling Dallas)
- Claude Opus (Cowork — execution, debugging)

---

## Context

Terry transferred from Mac Mini to laptop for 10 days of travel. This session resumed from a compacted context that covered the 17 March session and an earlier 18 March session where lead capture infrastructure was initially built.

---

## What Was Built

### Lead Capture System — Fully Operational

End-to-end lead capture pipeline for plausibleba.com/canvas now working across three channels:

**1. Vercel KV (Upstash Redis) — Rate Limiting + Persistence**
- User records stored as `user:{email}` keys with firstName, lastName, count, firstSeen, lastSeen
- Rate limit: 3 canvas sessions per email (enforced server-side)
- Upstash Redis instance: syd1, free tier, connected to Vercel website project

**2. /api/leads Endpoint**
- `GET /api/leads?key=PBA-LEADS-2026` returns all leads as JSON
- Scans `user:*` keys via Upstash REST API `KEYS` command
- Protected by `LEADS_API_KEY` env var

**3. Google Sheets Webhook**
- Apps Script web app receives POST from generate.ts on each new canvas session
- Writes to "PlausibleBA Leads" spreadsheet with columns: Timestamp, First Name, Last Name, Email, Generation #, Source
- Fire-and-forget from generate.ts (non-blocking)

### Bugs Fixed

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Garbled JSON in /api/leads (character-by-character output) | `setUser()` double-stringified data (`JSON.stringify(JSON.stringify(data))`), readers only parsed once | Changed to single `JSON.stringify(data)` in setUser; added `typeof === "string"` guard in both getUser and leads.ts for legacy data |
| Rate limiting never triggered | Same double-encoding bug — `existing?.count` always returned undefined, defaulting to 0 | Fixed by the encoding fix above |
| Google Sheets webhook returning 401 | Apps Script deployed with "Only myself" access | Changed to "Anyone" access in Apps Script deployment |
| Dead `zadd/users:all` code in generate.ts | Upstash REST API doesn't support zadd in the format used; leads.ts was rewritten to use KEYS scan | Removed the zadd call |
| One canvas run consuming all 3 free generations | Canvas makes 3 API calls (Capability Map, Concept Model, Value Streams) — each counted as separate generation | Added 2-minute session window: calls within 2 min of lastSeen don't increment count or create duplicate Sheet rows |

### Infrastructure

| Component | Detail |
|-----------|--------|
| Upstash Redis | syd1, free tier, connected via KV_REST_API_URL + KV_REST_API_TOKEN |
| Vercel env vars | ANTHROPIC_API_KEY, KV_REST_API_URL, KV_REST_API_TOKEN, LEADS_API_KEY, GSHEET_WEBHOOK_URL |
| Git workflow | `vcc/website` folder now has its own `.git` pointing at `plausibleba/website` remote on GitHub. Push directly from laptop terminal. |

---

## Git Commits (plausibleba/website → main)

| Commit | Message |
|--------|---------|
| (from 18 Mar) 301a79b | Add lead capture: KV persistence + Sheets webhook + /api/leads |
| (from 18 Mar) | Fix leads endpoint: use KEYS scan instead of sorted set |
| 462add7 | Clean up: remove dead zadd call, add Sheets webhook logging |
| (19 Mar) | Fix double-encoding bug: KV data now stored and read correctly |
| (19 Mar, pending push) | Fix: treat multi-pass canvas runs as one generation for rate limiting and lead capture |

---

## Test Results (19 March 2026)

| Test | Result |
|------|--------|
| /api/leads returns proper JSON with email, name, count, timestamps | ✅ |
| Rate limiting reads count correctly from KV | ✅ |
| Google Sheets receives lead rows | ✅ |
| Canvas generation completes (Seed to Harvest test) | ✅ |
| Multiple leads tracked across different emails | ✅ (2 leads: terence.roach@uts.edu.au, terry.roach@plausibleba.com) |
| Session dedup (pending test after push) | ⏳ |

---

## Pending

- [ ] Push session-dedup fix and test (canvas run should = 1 generation, 1 Sheet row)
- [ ] Clean up test data in Upstash (terry.roach@iiba.org has inflated count from pre-fix testing)
- [ ] Remove SHEETS: diagnostic logging from generate.ts once webhook confirmed stable
- [ ] Substack footer URL inconsistency: some pages link to `discoverednotinvented.substack.com`, skills page links to `plausibleba.substack.com`
- [ ] Sync workflow: vcc/website working copy ↔ plausibleba/website git repo (now established via git init + remote)
- [ ] Bundle → Canvas / VCC re-test from 17 March still pending (Dough-to-Door)

---

## Key Files Modified

| File | Changes |
|------|---------|
| `website/api/generate.ts` | Fixed double-encoding, removed zadd, added Sheets logging, added session-window dedup |
| `website/api/leads.ts` | Fixed double-encoding in record parsing |
| `website/SETUP-LEADS.md` | Setup guide (created 18 Mar) |
| `google-sheets-webhook.js` | Apps Script code reference (created 18 Mar) |
