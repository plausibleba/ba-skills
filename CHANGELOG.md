# Changelog

All notable changes to VCC (Value Cognition Canvas) are documented here. Each release corresponds to a working session.

---

## [v0.4.0] — 2026-03-21 — DRAFT

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
