# Tier-1 Demo Build Plan — Agentic Enablement Scoring + Entitlements

**Filed:** 2026-05-08
**Driver:** Live commercial conversation with Tier-1 global consulting firm. Senior partner relationship. Lead architect (Jack) has previewed VCC and reported "excited." Working session being scheduled to walk through Finance BPO use case with AES scoring and entitlements visible.
**Goal:** Demo-ready in 3–4 weeks, NDA-protected, IP-disciplined.

---

## What "Demo-Ready" Means

Four levels of fidelity exist for an agentic-enablement demonstration. Pick the right one:

| Level | What it shows | Verdict |
|---|---|---|
| L1 — Slideware | Worked example as PDF/slides | Already done; this is what Jack and the contact have seen |
| **L2 — Live worked example** | **Claims-Settlement-style scenario baked into the app, navigable, shows AES scores + classifications + AgentCharter for one capability** | **Target for the working session** |
| L3 — Live pipeline | Pump in a new Finance capability description, watch enrichment + scoring + classification run in real time | Stretch goal if time permits; otherwise a phase 2 commitment |
| L4 — Governed execution | Full GSM kernel evaluation: agent proposes action, Fire/Reject/Escalate decisioning, four ε-triggers visible | Out of scope for this demo (Layer 4 commercial; requires entitlements engine implementation that DEC-122 explicitly defers) |

L2 is what to build. L3 as stretch. L4 as the visible roadmap point that makes the commercial discussion concrete (this is what the proprietary entitlements specification engine *does* — they don't get to see it run, but they see what it's for).

## Critical Architectural Choice: Don't Block On v0.6

**Build the demo on the current v0.4 production architecture, not on the v0.6 graph runtime.**

Reasoning:
- The v0.6 graph runtime work (DEC-122) is partially locked pending Spike A and Spike B. Those spikes can run in parallel with demo build, but the runtime migration itself is weeks of work that the demo doesn't need.
- AES scoring and AgentCharter visualisation sit *on top of* the scaffold. They don't depend on whether the scaffold is flat-FK or graph-shaped underneath.
- A demo built on the production architecture is also more stable for a live walk-through. Demo-day stability beats demo-day architectural elegance.
- The v0.6 migration is an *internal* refactor that the working-session audience will not see and will not care about. It's the wrong thing to lead with commercially.

The demo therefore reads from `scaffold` as it exists today. The new work is additive: AES scoring module, AgentCharter view, Finance scenario data.

## Build Plan — Three Phases, Three to Four Weeks

### Phase 1 — AES Scoring Implementation (Week 1, ~5 days)

The PRD defines this fully (eight dimensions, weighted composite, five classifications). This is implementation, not design.

- `domain/agentic-enablement/scoring.ts` — pure scoring engine. Takes per-dimension input (1–5 per dimension), weights from the PRD table, outputs composite score and classification. Unit-tested.
- `domain/agentic-enablement/types.ts` — `EnrichmentInputs` (PPIT, decision inventory, exception profile, dependency, regulatory), `AESScore`, `AgenticClassification` enum.
- `store/agentic-enablement-store.ts` — Zustand store holding per-capability AES inputs + computed scores. Persists alongside scaffold in the bundle (additive — old bundles don't break).
- Hand-built enrichment data for the Finance scenario (next phase loads it).

Out of scope for Phase 1: actual LLM-driven enrichment generation. The five enrichments have hand-built values for the demo. Generation is a Phase-2 / commercial-plugin commitment.

### Phase 2 — Visualisation (Week 2, ~5 days)

Two new views.

- **Agentic Enablement Heatmap view.** Capability map grid with score badges (1.0–5.0), classification colour coding (AFK green, Supervised teal, HiTL Assisted amber, Human-Primary slate, Not Yet Viable grey), drill-through to a per-capability detail panel showing the eight scoring dimensions and the contributing enrichment evidence. Reuses the existing capability-block component shape so the visual language is consistent.
- **AgentCharter view (one capability).** Hand-built charter for one fully-autonomous Finance capability (proposed: Invoice Three-Way Matching or Payment Processing). Shows: capability boundary (the authority scope), role chartered, classification, deontic structure (Permits / Obligations / Prohibitions), escalation triggers (the four ε-types — even though not evaluated, the *charter* names which conditions would trigger which ε), decision surface placeholder text. This is the artefact the entitlements specification engine *would* generate.

The AgentCharter view is the highest-value visual in the demo. It makes the proprietary plugin's purpose concrete without revealing the algorithm.

### Phase 3 — Finance Scenario + Demo Polish (Week 3, ~5 days)

- Build a Finance-BPO capability map, structurally analogous to the Claims Settlement worked example but Finance-flavoured. Suggested coverage: Accounts Payable (FNOL-equivalent fully-autonomous candidate), Three-Way Match, Payment Processing, Vendor Master Maintenance, AR Cash Application, Expense Approval, Month-End Close, Tax Compliance Reporting, Treasury Cash Forecasting. ~10–14 capabilities, 4–5 stages, mixed AFK/HiTL/Human-Primary classifications. This becomes the demo scenario.
- Hand-build one or two AgentCharters: one fully-autonomous (e.g., Three-Way Match agent) with a clean decision surface; one HiTL-assisted (e.g., Tax Compliance Reporting) showing where humans stay in the loop and *why*.
- Demo script: 30–40 minute walk-through. Capability map → enrichment evidence → AES scoring → classification distribution → drill into one fully-autonomous → AgentCharter → drill into one HiTL → contrast → roadmap point ("here's what the entitlements engine generates; the live runtime evaluation kernel is the proprietary plugin").
- Watermarking on the live demo: footer or corner stamp "Confidential — VCC — under NDA". Discreet but visible.

### Optional Phase 3.5 — Stretch L3 Capability

If the build runs ahead of schedule (unlikely, but possible if scoring + visualisation come together fast):

- Live enrichment-and-scoring against a small added capability. Audience names a capability that should be in the Finance map; we capture a few enrichment inputs in real time; AES score and classification compute live. Adds ~3 days of work and meaningful demo punch.

This is a "nice to have" — don't sacrifice L2 polish for L3 surface.

## What's Out of Scope (Hold the Line)

- **Live GSM kernel evaluation** — too much to build in the timeframe; explicitly Layer-4 commercial per DEC-122; not what the contact needs to see at this stage.
- **The v0.6 graph runtime migration** — runs in parallel via Spike A/B, doesn't block the demo. Don't entangle.
- **The Foundation governance work** — also runs in parallel; doesn't block the demo and (per the previous note) shouldn't be discussed in this commercial conversation anyway.
- **CCAF training scope** — runs in parallel, fronted by IIBA, on a different track.
- **AES enrichment LLM-generation** — hand-built enrichment data for the demo. The actual generation is Phase 2 commercial plugin scope.

## Parallel Tracks (No Conflict)

| Track | Owner | What's happening | Conflict with demo build? |
|---|---|---|---|
| Demo build (this plan) | Terry | 3–4 weeks of focused work | — |
| CCAF training wave | IIBA team (10 volunteers) | Anthropic Academy enrolment + completion | None |
| Spike A — runtime comparison | Terry (or deferred) | 3–5 days of focused work | None — different code, different files |
| Spike B — pipeline producibility | Terry (or deferred) | 1–2 days of focused work | None |
| Foundation governance review | Terry + Asif + lawyer | Background, no platform-build dependency | None |
| Anthropic letter / partnership | IIBA track | Background, separate from VCC engineering | None |

If demo build dominates the next four weeks, Spikes A and B can slide right by 4–6 weeks. The DEC-122 partial lock holds either way.

## IP Discipline During Build and Demo

This sits at the boundary of "what's already disclosed" (slides, app architecture Jack saw) and "what's still proprietary" (AES algorithm, entitlements specification, prompt engineering, SHACL shapes, scaffold engine internals).

- **NDA in place before working session.** Sent in the reply message; follow up if not turned around in 48 hours.
- **No source-code share during demo.** Show running app + visible visualisation. Don't open the IDE; don't show the AES weight table source; don't show the prompts.
- **Watermark the live demo** (footer / corner stamp: "Confidential — VCC — under NDA").
- **Brief moat anchors during the walk-through.** When showing the AES heatmap: "the algorithm is calibrated by industry vertical and risk profile — that calibration is the methodology asset." When showing the AgentCharter: "the engine that generates these charters from practitioner inputs is the proprietary entitlements plugin we'd license." This frames the commercial-value layer without revealing implementation.
- **Don't share the demo bundle file.** The JSON-LD bundle (or v4/v5 scaffold) embodies the methodology; share scenario walk-throughs visually, not as files.
- **No discussion of pricing during the working session.** Walk it through; let them react; commercial structure is a separate conversation with their commercial person.

## Critical-Path Risks

1. **Scope creep into L4 governance kernel.** The temptation to "just build a tiny live evaluation" is real. Resist. Live GSM kernel is weeks of work. The demo's job is to make L4 desirable, not to deliver it.
2. **Visualisation polish at the expense of scenario depth.** A Finance capability map with 14 capabilities + two well-built AgentCharters is more compelling than 30 capabilities with shallow charters. Depth over breadth.
3. **Working-session schedule slippage.** If the contact wants the session in 2 weeks instead of 4, the L2 demo collapses. Hard limit: target 3 weeks build, 1 week buffer for scheduling. If they push for sooner, lead with the slides + a partial L2 (scoring view only, AgentCharter view as roadmap) rather than rushing.
4. **NDA delay.** Without the NDA, the working session is at slide level only. Don't run the L2 demo without the cover.

## Deliverables

At end of build:
- `packages/frontend/src/domain/agentic-enablement/` — scoring engine + types + tests
- `packages/frontend/src/store/agentic-enablement-store.ts` — Zustand store
- `packages/frontend/src/components/AgenticEnablementView.tsx` — heatmap view
- `packages/frontend/src/components/AgentCharterView.tsx` — charter view
- `fixtures/finance-bpo-scenario/` — Finance capability map + enrichment data + AES scores + AgentCharters
- `docs/Tier1-Demo-Script.md` — 30–40 min walk-through with talking points
- Watermarking utility wired into the demo build mode

## Decision Points During Build

- **Week 1 end:** scoring engine working against hand-built inputs? If yes, proceed to Phase 2. If not, scope down — single classification example only.
- **Week 2 end:** both views functional with Claims Settlement scenario? If yes, proceed to Finance scenario build. If not, ship demo on Claims Settlement scenario instead (still a valid demo; insurance is a fine adjacent vertical for a Finance BPO conversation).
- **Week 3 mid:** demo script working end-to-end? If yes, polish + stretch L3. If not, cut L3, harden L2.

## Post-Demo Path

If the demo lands well, the conversation moves to commercial structure. The demo build artefacts also become reusable:

- The scoring engine becomes part of the OSS Layer-1 (per DEC-122 — AES is methodology, lives in the open core).
- The AgentCharter visualisation becomes part of the OSS Layer-1.
- The actual entitlements specification engine (generation, not visualisation) is the Layer-4 commercial plugin — built separately, on a longer timeline, possibly co-developed with the Tier-1 firm if the partnership conversation goes that way.
- The Finance BPO scenario becomes a published reference scenario — useful for sales, marketing, and Anthropic partnership demos.

So even if the commercial conversation goes sideways, the demo work isn't wasted — it's directly on the v0.7 / v0.8 product roadmap.
