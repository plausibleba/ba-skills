# Changelog

All notable changes to VCC (Value Cognition Canvas) are documented here. Each release corresponds to a working session.

---

## [v0.6.0] — UPCOMING — DRAFT

**Theme: Graph Runtime / CAPSICUM JSON-LD as Canonical Layer**

The architectural turning point: VCC's canonical model becomes a typed RDF graph, with CAPSICUM as the metamodel target and JSON-LD bundles as the published machine contract for the open-core platform. The flat scaffold is demoted to a serialisation format.

### Architectural Anchor

**[DEC-122 — Graph Runtime / Metamodel Commitment](DECISIONS.md)** locks the principles, shape decisions, and four v0 amendments (versioned namespace, scoped contexts, deontic vocabulary placeholders, AgentCharter Layer-4 scope). Runtime engine selection and pipeline migration sequencing lock pending two parallel spikes:

- **Spike A** — three-way runtime comparison at Insurance reference-model scale (oxigraph-wasm vs RDF/JS-native + shacl-engine vs minimal typed-quad-store).
- **Spike B** — Pass B externalised-Outcome producibility against a real transcript.

### What's Coming

- `packages/graph/` — the v0.6 graph runtime, promoted from `spike/graph-runtime/` after the spike pair concludes.
- v4/v5 → CAPSICUM JSON-LD migration tool (validates scale claim against the IIBA reference model).
- Versioned namespace `https://capsicum.plausibleba.org/ns/core/v0/` published with stable dereferencing.
- Scoped `@context`s separating domain terminology from governance machinery.
- Deontic-operator vocabulary placeholders (Entitlement / Permit / Prohibit / Obligation / Term / Condition / Provenance / AuthoritySource / EvaluationScope).
- AgentCharter shape replacing the flat classification string with explicit deontic-operator properties.
- Validation strategy split: SPARQL-ASK in-pipeline gates with bounded LLM repair; full SHACL at the bundle-publish boundary.

### Related Strategy Updates

- `PlausibleBA_Open_Source_Strategy v2.0` amended: JSON-LD positioned as canonical machine contract (not practitioner-facing authoring contract); proprietary moat reframed; Apptio facts corrected; Foundation governance casting-vote refinement flagged for pre-launch tightening.
- `PRD - Agentic_Enterprise_Framework v0.1` updated: AgentCharter generation explicitly Layer-4 commercial scope.

### SPAR Archive

The four-reviewer SPAR materials and synthesis live at `docs/spar-archive/dec-122/`. The SPAR earned its keep — convergence on the AgentCharter-is-Layer-4 conclusion arrived independently from the pipeline reviewer (R3) and the strategy reviewer (R4), exactly the cross-axis insight the four-reviewer structure was designed to produce.

---

## [v0.5.0] — 2026-03-22 — DRAFT

**Theme: Canvas → VCC Handoff & Commercial Tier System**

The first version where VCC operates as a product with a signup flow, tier enforcement, and cross-domain bundle handoff from the PlausibleBA website.

### New Features

- **Canvas → VCC Bundle Handoff** — clicking "Open in VCC →" on plausibleba.com/canvas posts the generated bundle to a Vercel KV-backed edge function, generates a one-time claim token, and redirects to VCC. The token survives Supabase auth redirects (magic link, OAuth) via sessionStorage. After login, VCC auto-imports the bundle and creates a project. Includes login pre-fill (email, name) and contextual UI ("Your operating model is ready to import").

- **Commercial Tier System** — action-level gating across the entire app. Free users can browse everything; writes and executions are blocked with contextual upsell modals. Tiers: free → trial (15 days, everything unlocked) → starter ($20/mo per use case) → individual ($50/mo) → team. Supabase migration adds tier columns to profiles and a usage_log table.

- **Tier Gate Wiring** — every write/execute action across 8 components wrapped with `gate()` calls: InlineEdit (all edit pencils app-wide), ProjectList (create, discover, import), FrictionView (all 5 tabs: observations, solutions, survey, settings), DiscoveryIntake (generate, extract), NetworkView (VS editor), CanvasView (add stage, export stories), StageWizard (run assessment, enrich solutions). 23 gated action types with human-readable labels.

- **Dev Tier Switcher** — development-only floating widget (bottom-right) for instantly switching between tiers to test gate behaviour.

- **Test Handoff Page** — hidden page (`website/test-handoff.html`) with full UX flow documentation, edge cases table, and three-mode test harness for verifying the handoff pipeline.

### Technical

- **Claim Token Edge Function** (`website/api/claim-bundle.ts`) — Vercel Edge Runtime, POST stores bundle in Vercel KV with 24hr TTL, GET retrieves and deletes (one-time claim). In-memory Map fallback for local dev.

- **Bundle Claim Client** (`utils/bundle-claim.ts`) — client-side claim lifecycle: `extractClaimFromURL()`, `getPendingClaim()`, `getClaimPrefill()`, `consumePendingClaim()`. SessionStorage bridge for auth redirect survival.

- **Tier Store** (`store/tier-store.ts`) — Zustand store with Supabase sync, `canPerform()` gate logic with per-action allowance tracking, `initializeTier()` called on auth.

- **Gate Check Hook** (`hooks/useGateCheck.ts`) — `gate(action, callback, description)` pattern with `ACTION_LABELS` map and action-to-use-case mapping.

---

## [v0.4.0] — 2026-03-21

**Theme: First-Time User Experience & Network View Overhaul**

Focused on making VCC self-explanatory and polished for first-time testers, plus significant new functionality on the Network View.

### New Features

- **Layer Scheme Selector** on Network View — toggle between Ecosystem/Knowledge, Front Office/Back Office, Strategic/Core/Enabling, and Wardley Zones. Value streams redistribute across layers using journey order on each switch. Fine-tune individual VS assignments via the edit pencil.

- **Graph View** — new tab on Network View showing a draggable node-edge visualisation of value stream coupling. Purple dashed lines show coupling relationships, blue solid lines show flow edges. Double-click any node to drill into its Stage View.

- **VS Editor Modal** — click the edit pencil on any value stream card (Cards or Graph view) to edit its name, description, layer assignment, and accountable stakeholder.

- **Journey-Ordered Layout** — value streams within each layer are now sorted by their position in the journey flow (topological sort), not alphabetically. Earlier streams appear first.

- **Refactoring Debt Register** — `docs/REFACTORING-DEBT.md` tracks 15 items where we chose expediency over elegance, including the foundational R-013 note on record-lifecycle coupling for future agentic orchestration.

### UX Improvements

- **Discovery Intake** — renamed "Drop Transcript" tab to "Provide Content"; broke long heading lines at natural points; replaced Adelaide-specific placeholder with generic guidance; bumped advice text for better readability.

- **Tab-Aware User Guide** — the Guide panel now shows contextual content for each Discovery Intake tab (Provide Content vs Fill Form), plus the existing Network View and Stage View guidance.

- **Stepped Project Creation** — cleaner flow from project list to discovery intake with scope toggle syncing.

- **Removed Clutter** — Load Assessment and Download Bundle buttons removed from Network View header.

### Technical

- **Shared Layer Schemes** — `lib/layer-schemes.ts` provides a single source of truth for layer scheme definitions, used by both Discovery Intake and Network View (addresses R-011).

- **Auto-Derive Layout Zones** — older scaffolds without a `layoutZones` array now auto-derive zone containers from per-VS `layoutZone` fields on load.

- **Flexible Zone Model** — the zone system is no longer hardcoded to Ecosystem/Knowledge. The `layoutZones` array on the scaffold supports N layers with arbitrary IDs.

---

## [v0.3.0] — 2026-03-19

Lead capture, module gating, editable canvas, and PlausibleBA website integration. See `docs/SESSION-LOG-2026-03-19.md` for details.

---

*Versions prior to v0.3.0 were not formally tracked. See `docs/DECISIONS.md` for the full decision log.*
