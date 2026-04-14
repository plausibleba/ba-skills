# Session Handoff — 22 March 2026

**From**: Session 24 (Opus)
**For**: Next session (Sonnet or Opus)
**Read first**: `CURRENT-STATE.md`, then `CLAUDE.md`

---

## What Was Built This Session

Two major systems were completed and committed:

### 1. Canvas → VCC Bundle Handoff (fully working, deployed)

The pipeline that takes a user from generating a model on plausibleba.com/canvas through to having it loaded in their VCC account. The full flow:

- User generates model on Canvas → clicks "Open in VCC →"
- Canvas POSTs the bundle to `/api/claim-bundle` (Vercel Edge + KV) → gets a one-time `bndl_xxx` token (24hr TTL)
- Redirects to VCC with `?claim=token&email=...&firstName=...&lastName=...`
- VCC stashes token in sessionStorage (survives auth redirects), cleans URL
- LoginPage pre-fills email, shows contextual banner ("Your operating model is ready to import")
- After auth (magic link or OAuth), App.tsx useEffect consumes the claim → fetches bundle → imports → creates project
- User lands on their imported model

Key files: `website/api/claim-bundle.ts`, `website/canvas.html` (openInVCC function), `packages/frontend/src/utils/bundle-claim.ts`, `LoginPage.tsx`, `App.tsx`.

Terry confirmed "that works perfectly" after testing.

### 2. Commercial Tier System — Gate Wiring (complete)

Every write/execute action across the entire app is now wrapped with `gate()` calls. When a free-tier user clicks any gated action, it checks their tier and either allows it, deducts from their allowance, or shows the UpsellModal.

**Gated components** (8 total):
- `InlineEdit` — gates ALL edit pencils app-wide in one change
- `ProjectList` — create project, quick discovery, import bundle
- `FrictionView` — all 5 sub-tabs (observations add/edit/save, solutions export/upload/create, survey save, settings toggle/edit/delete/add)
- `DiscoveryIntake` — generate scaffold (×2 buttons), extract from transcript
- `NetworkView` — VS editor modal save, edit pencils (card view + graph view)
- `CanvasView` — add stage, export stories to Jira CSV
- `StageWizard` — run assessment (×2), enrich solutions (×2)

**23 gated action types** with human-readable labels in `useGateCheck.ts`.

Architecture: `tier-store.ts` → `useGateCheck` hook → `UpsellModal`. The tier store syncs with Supabase on auth.

### 3. Documentation Updated

All five PDS/context files refreshed for v0.5.0:
- `CURRENT-STATE.md` — new sections for handoff and tiers, updated known gaps
- `CLAUDE.md` — tier system, handoff architecture, updated scope
- `CHANGELOG.md` — full v0.5.0 release notes
- `ARCHITECTURE.md` — new entry path, system diagram, tier architecture
- `INVENTORY.md` — all new stores, hooks, utils, components, fixtures

---

## Git Commits This Session

| Hash | Description |
|------|-------------|
| `5506178` | Add Canvas-to-VCC bundle handoff: claim token flow, login pre-fill, auto-import |
| `052626e` | Update test-handoff page with full UX flow docs and edge cases (committed by Terry, website repo) |
| `7336f10` | Wire tier gate checks into all interactive components |
| `1bdc3cf` | Update PDS and context files for v0.5.0 |

---

## What's Next — Priorities

### 1. End-to-End Tier Verification (HIGH — blocks release)

The gate wiring is in the code but hasn't been tested in a deployed build. Need to:
- Deploy the VCC frontend with the new gate code
- Use DevTierSwitcher (bottom-right floating widget, dev only) to switch to "free" tier
- Verify that clicking gated actions (edit pencils, generate, export, etc.) shows the UpsellModal instead of executing
- Verify that "trial" tier allows everything
- Verify that allowances decrement (e.g. free tier's 1 friction analysis run)

### 2. Fix tier-store.ts Type Errors (HIGH — blocks clean build)

11 TypeScript errors in `tier-store.ts` because the Supabase-generated database types don't include the columns from our migration (`tier`, `trial_ends_at`, `trial_started_at`, `active_use_cases` on `profiles`; entire `usage_log` table). Two options:
- **Option A**: Run the migration against Supabase, then `npx supabase gen types typescript` to regenerate
- **Option B**: Add manual type overrides/extensions in a `.d.ts` file

There's also a pre-existing `TextMarkedContent` type error in `DiscoveryIntake.tsx` (PDF parsing) — unrelated.

### 3. Stripe Integration (MEDIUM — needed for monetisation)

The UpsellModal has an "Upgrade" button that currently does nothing. Needs to:
- Create Stripe products/prices for starter ($20/mo) and individual ($50/mo)
- Wire the button to Stripe Checkout
- Handle the webhook to update the user's tier in Supabase
- Consider whether trial → paid is automatic or requires action

### 4. Trial Activation Logic (MEDIUM)

Currently `initializeTier()` in App.tsx sets tier to "trial" on first auth. Need to decide:
- Does the 15-day trial start on first Canvas handoff, first VCC login, or first gated action?
- Should trial expiry be checked client-side (current) or server-side?
- What happens at trial end — hard gate to free, or grace period?

---

## Options / Decisions Needed

### A. What to tackle next session?

The choices in rough priority order:
1. **Deploy + verify tier gating** — quick win, proves the system works
2. **Supabase type fix** — removes all pre-existing TS errors, cleans up the build
3. **Stripe wiring** — monetisation plumbing
4. **Canvas UX polish** — the Stage View could use review for first-time testers
5. **Record-lifecycle coupling (R-013)** — foundational for agentic orchestration, but bigger scope

### B. Trial activation trigger

Three sensible options:
- **On first VCC login** (simplest — current implementation)
- **On first Canvas handoff claim** (ties trial to product engagement)
- **On first gated action attempt** (most generous — free browsing before clock starts)

### C. Free tier generosity

Current free allowances (1 friction run, 3 bundle uploads) may be too restrictive or too generous. Worth testing with real users before finalising.

---

## Technical Notes

- The VCC frontend builds with Vite from `packages/frontend/`. Deploy with `cd packages/frontend && vercel --prod`.
- The website (plausibleba.com) is a separate repo at `vcc/website/` with its own `.git`. Deploy with `git push origin main` (Vercel auto-deploys).
- The Vite build fails in this sandbox due to a missing Rollup native binary — not a code issue. Works fine in the real build environment.
- All `@ts-nocheck` files: `FrictionView.tsx`, `NetworkView.tsx`. These suppress the pre-existing type issues.
