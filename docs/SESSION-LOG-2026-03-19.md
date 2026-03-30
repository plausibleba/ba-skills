# Session Log — 19 March 2026

---

## Participants
- Terry Roach (orchestrator)
- Claude Opus 4.6 (Cowork — execution, code, builds, deployment)

---

## What Was Done

### VCC Postgres Persistence (Major)
The core problem: projects appeared on the home page but data never persisted to Postgres. Clicking into any project bounced back to the project list or opened an empty intake form.

**Root cause:** `goToProjects()` in App.tsx called `reset()` and `setCurrentProject(null)` immediately — wiping canvas state before the 2-second auto-save debounce could fire. Edits never reached Supabase.

**Fixes applied:**
- `goToProjects()` now `await`s `saveToProject()` before resetting
- Added `beforeunload` handler for tab close/refresh
- Created `utils/auto-save.ts` — shared by all import paths (drag-drop, Import Bundle, FileLoader, discovery onComplete)
- `autoSaveToProject()` creates project with full bundle in one shot (fixes optimistic lock conflict)
- `createProject` now receives the complete bundle instead of `{}` then saving separately
- Fixed blank page when `viewMode=stage` but `canvasViewModel` temporarily null during friction assessment
- Added delete button to project cards with confirmation dialog

### VCC Pipeline Fixes
- Fixed multi-file upload (`files is not iterable` — was passing single File instead of File[])
- Fixed PDF import: CDN worker URL matching installed pdfjs-dist version
- Fixed DOCX import: proper Vite-compatible dynamic import for mammoth
- Increased Pass A1/A2 max_tokens (8000/12000) with JSON repair fallback for truncated responses
- Renamed "Save Bundle" → "Download Bundle" everywhere, added to Network view

### VCC View Enrichment
- **Capability Map:** Injected L1/L2/L3 hierarchy from DiscoveryIR after Pass B. Smart matching: adds L3s from IR even when Pass B uses different names, assigns unmatched scaffold capabilities to best-fit L2 by keyword overlap.
- **Capability Inspector:** Shows PPIT mappings (People, Process, Info, Tech) by cross-referencing activity capabilityPPIT
- **Concept Model:** Auto-derives Party (from roles), selective Records (only key business objects referenced by 2+ activities or matching keywords), Resources (from DiscoveryIR tech). Better relationships: "produces" for Party→Record, "uses" for Party→Resource.

### PlausibleBA Canvas — Direct Intake (Major)
Eliminated the install-friction bottleneck. Users can now paste discovery notes directly on plausibleba.com/canvas without installing Claude Skills.

**New dual-path landing:**
- Left card: "Paste your discovery notes" — textarea + file upload (.docx, .xlsx, .pdf, .md, .txt)
- Right card: "Already have a bundle?" — existing JSON drop zone

**Email gate:** First name, last name, email captured before generation. 3 free generations per email. User data stored in Vercel KV (or in-memory fallback).

**LLM pipeline in vanilla JS:** Full 3-pass pipeline (A1→A2→B) ported from VCC, running via `/api/generate` Edge Runtime proxy. SSE streaming, JSON repair, progress bar.

**Post-processing:** Capability hierarchy injection + selective concept derivation, matching VCC's logic exactly.

**Additional features:** JSON download button, file upload supporting binary formats via CDN libraries (mammoth, SheetJS, pdf.js).

### PlausibleBA Deployment — Moved to Vercel
- Moved plausibleba.com from GitHub Pages to Vercel
- Created `/api/generate.ts` Edge Runtime proxy with email-based rate limiting
- Updated DNS at Namecheap (A record → 76.76.21.21, CNAME www → Vercel)
- Connected Vercel to `plausibleba/website` repo (required granting Vercel access to plausibleba GitHub org)
- Set `ANTHROPIC_API_KEY` environment variable
- Configured build settings: Framework "Other", no build command

### Prompt Alignment (Canvas ↔ VCC)
Replaced all three Canvas prompt functions with exact copies of VCC's pipeline prompts:
- Pass A1: Added "What a VS Is (and Isn't)", initiative exclusion rules, full stage structure example
- Pass A2: Added detailed capability hierarchy rules, VERBATIM extraction rule, business object grounding
- Pass B: Added naming rules, full capabilityPPIT example, information objects wiring, metric wiring, detailed output schema

---

## Commits (VCC — push pending)

| Hash | Description |
|------|-------------|
| `6eafd87` | Add UX fixes, file upload support, and reorganize docs |
| `6898a36` | Fix Postgres persistence, pipeline robustness, and view enrichment |
| `6969876` | Auto-save discovery output to Supabase project and fix bundle UX |
| `60db24f` | Add delete button to project cards with confirmation dialog |
| `a397405` | Auto-save to Supabase from all import paths |
| `540cdfe` | Fix auto-save conflict: create project with full bundle in one shot |
| `7b7c4e4` | Fix PDF and DOCX file upload in VCC Discovery Intake |
| `80a99a2` | Fix capability hierarchy injection and concept model quality |

**Push:** `cd ~/projects/vcc && git push origin main`

## Commits (PlausibleBA website — deployed on Vercel)

| Commit | Description |
|--------|-------------|
| `0a523fb` | Add Canvas intake with LLM pipeline and email gate |
| (follow-up) | Support docx, xlsx, pdf file uploads on Canvas intake |
| (follow-up) | Align Canvas prompts with VCC pipeline |
| (follow-up) | Match VCC: smart capability hierarchy + selective concepts with Resources |

---

## Known Issues / Follow-up

- Canvas and VCC produce different value streams from the same input (LLM non-determinism) — structurally similar but not identical
- Canvas Capability Map has no inspector panel (VCC feature not ported)
- Canvas Concept Model has no relationship lines between entities (rendering limitation)
- Canvas Value Stream stages need PPIT rendering in stage detail panels
- "Open in VCC" button on Canvas not yet wired up (needs to pass bundle to VCC)
- Vercel KV not yet provisioned for persistent rate limiting (using in-memory — resets on cold starts)
- VCC Capability Map: unmatched caps assigned to best-fit L2 by keyword — may not always be correct
- No Governance-type L1 capabilities being generated (all Execution) — prompt may need tuning

---

## Pending Actions

- [ ] Push VCC commits to origin: `cd ~/projects/vcc && git push origin main`
- [ ] Test TradieBot PDF through both Canvas and VCC, compare outputs
- [ ] Provision Vercel KV for persistent email rate limiting
- [ ] Wire up "Open in VCC" button on Canvas (pass bundle to VCC import URL)
- [ ] Guild Summit content prep (23 March — 4 days)
- [ ] Consider adding Governance L1 classification to capability prompts
