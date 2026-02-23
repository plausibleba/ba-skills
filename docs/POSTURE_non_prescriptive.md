# Throughput Impact Panel — Non-Prescriptive Design Posture

## Design Intent

The Throughput Impact Panel is not a recommendation engine. It is a structural consequence surface.

Its purpose is to expose first-order system implications of a binding constraint, make underlying assumptions explicit, allow directors to test alternative parameter scenarios, and preserve decision autonomy at board level.

It must never prescribe interventions, imply priority sequencing, present projections as certainty, or embed contextual assumptions into canonical artefacts.

The panel exists to support board reasoning, not replace it.

## Core Guardrails

### 1. Language Discipline
All consequence statements use calibrated language: "Has the potential to release…", "Under stated assumptions…", "If cycle time reduces from X to Y…". The output tone is analytical, not advisory.

### 2. Visible Assumptions Block (Non-Optional)
Assumptions are rendered as a visually distinct block beneath the consequence statement. They are discussion levers, not fine print.

### 3. Editable Parameters (Preserve Board Freedom)
Entity volume, assessment frequency, and FTE capacity days are user-editable. Changing any input triggers immediate recalculation while leaving scaffold and heatmap artefacts untouched.

### 4. Dual Consequence Modes
Capacity Release (efficiency lens) and Risk Compression (mandate lens) are rendered side by side. Risk compression metrics must derive directly from the same time delta. Secondary projections requiring additional assumptions are explicitly marked.

### 5. Structural Projection Label
"First-Order Structural Projection" header reinforces: no simulation, no probabilistic modelling, no queuing assumptions beyond stated linear constraint.

### 6. No Prescriptive Framing
No UI elements such as "Priority Lever", "Recommended Intervention", "High Impact Action", or "Optimise This First". Structural importance language is descriptive: "This activity is structurally dominant in determining end-to-end throughput under current assumptions."

### 7. Architectural Integrity
The panel reads from ScaffoldModel (immutable), FrictionHeatmap (immutable), and UI engagement parameters. All projections exist purely in derived UI state. No mutation. No persistence into canonical artefacts.

## Posture Summary

The board must remain free to reject assumptions, adjust volume, dispute the binding constraint, and choose to intervene elsewhere. The panel ensures that system consequences of those choices are visible, structural logic is transparent, and trade-offs are explicit.

We expose implications. We do not prescribe actions.

## Footer Note

"Projections reflect structural inference based on current scaffold and heatmap. They are not forecasts."
