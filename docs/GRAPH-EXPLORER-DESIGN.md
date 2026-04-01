# Graph Explorer Design — Op Model Workbench

**Status:** Design spec — Phase 3
**Session:** 26
**Reference:** IcePanel.io C4-style architectural diagrams

---

## 1. Intent

The current Graph Explorer is a force-directed physics simulation — useful for spotting clusters but structurally meaningless. The goal is to evolve it into a **structured, zoomable architectural diagram** that Business Architects can actually read and reason about, comparable to IcePanel.io's C4-style approach.

The key shift: from "everything at once, positioned by physics" to "hierarchical containment with meaningful drill-in/out."

---

## 2. Design Principles

1. **Containment over proximity.** Related elements live inside their parent's boundary, not just "near" it. A capability tree is rendered as nested boxes, not clustered dots.
2. **Edges tell stories.** Every line has a verb. "Performed by", "Requires capability", "Transitions record". Not just "linked".
3. **Drill-in/out, not zoom.** Zooming in doesn't show more detail — drilling in replaces the view with a deeper level. Each level is a coherent diagram.
4. **Progressive disclosure.** Start at the highest strategic level. Complexity is always one click away, never in your face.
5. **Architects navigate, not search.** The graph is spatial memory. Once you've learned the layout, you can find things by location.

---

## 3. Abstraction Levels (C4-Inspired)

The drill-in model has 4 levels, each a complete diagram:

### Level 1 — Operating Model (Network)
**What you see:** Value streams as large boxes, arranged by layout zone (ecosystem / knowledge / etc). Edges between value streams show shared outcomes (the triggers that connect one flow to the next).

**Containment:** Layout zones are the outermost boundary (like IcePanel's "Google Cloud" box). Value streams are inside their zone.

**Edges:**
- VS → VS via shared outcome (labelled with outcome name)
- Feedback edges (back-edges in the DAG) shown as dashed lines

**Entry point:** This is the default view when you open Graph Explorer.

### Level 2 — Value Stream Detail
**What you see:** Click into a value stream → see its activity chain (the FSM). Activities are boxes arranged left-to-right in sequence order (following `nextActivityId` chain). Each activity shows its name and the outcome transition (preOutcome → postOutcome).

**Containment:** The value stream is the boundary. Activities are inside it, laid out as a horizontal chain. Composite activities (D-054) shown as grouped sub-chains.

**Edges:**
- Activity → Activity via `nextActivityId` (labelled with postOutcome)
- Activity → Capability (subtle reference lines down to a capability strip below)
- Activity → Role (subtle reference lines up to a role strip above)

**Layout pattern:** Swim-lane / horizontal FSM. Roles above, capabilities below, activities in the middle.

### Level 3 — Activity Detail (PPIT View)
**What you see:** Click into an activity → see the full execution grammar: which roles perform which capabilities, using which application functions, producing which information objects, governed by which controls.

**Containment:** The activity is the boundary. Inside: the PPIT (People, Process, Information, Technology) decomposition.

**Edges:**
- Role → Capability (via capabilityPPIT mapping, labelled "performs")
- Capability → ApplicationFunction (labelled "enabled by")
- Capability → InformationObject (labelled "consumes/produces")
- Activity → Control (labelled "governed by")
- Activity → RecordClass (labelled "transitions")

**Layout:** Structured grid — Roles on the left, Capabilities centre, Technology and Information on the right. Controls along the bottom.

### Level 4 — Capability Taxonomy
**What you see:** The full L1→L2→L3→L4 capability tree as nested containment boxes. Click from any higher level when you see a capability reference.

**Containment:** L1 boxes contain L2 boxes contain L3 boxes contain L4 leaf nodes.

**Edges:**
- L4 → Activity references (dotted outbound lines, "used in")
- L4 → Metric references (dotted, "measured by")

**Layout:** Treemap-style nested rectangles, or horizontal tree with containment boxes.

---

## 4. Layout Engine

### Recommendation: ELK.js (Eclipse Layout Kernel)

**Why ELK:**
- Purpose-built for hierarchical graph layout with containment (compound graphs)
- Orthogonal edge routing (the clean right-angle paths IcePanel uses)
- Layered layout algorithm (Sugiyama) for directed graphs — perfect for activity chains
- Supports port-based edge connections (edges connect to specific sides of nodes)
- ~80KB gzipped, runs entirely client-side via WebAssembly
- Used by: VS Code (extension dependency graphs), Theia, Eclipse CDT

**Alternative considered:** dagre (simpler, smaller) — rejected because it doesn't support compound/nested graphs or orthogonal edge routing.

**Alternative considered:** d3-hierarchy + custom layout — rejected because too much manual work for edge routing and containment.

### Layout Configuration by Level

| Level | ELK Algorithm | Direction | Edge Routing |
|-------|--------------|-----------|--------------|
| L1 (Network) | `layered` | LEFT_RIGHT or TOP_DOWN | `ORTHOGONAL` |
| L2 (VS Detail) | `layered` | LEFT_RIGHT | `ORTHOGONAL` |
| L3 (Activity PPIT) | `layered` | LEFT_RIGHT | `POLYLINE` |
| L4 (Capability Tree) | `mrtree` or `layered` | TOP_DOWN | `ORTHOGONAL` |

### ELK Graph Input Format

```typescript
interface ElkNode {
  id: string;
  width: number;
  height: number;
  labels?: { text: string }[];
  children?: ElkNode[];    // ← containment
  ports?: ElkPort[];
  layoutOptions?: Record<string, string>;
}

interface ElkEdge {
  id: string;
  sources: string[];
  targets: string[];
  labels?: { text: string }[];   // ← "performs", "requires", etc.
}
```

The scaffold elements map directly to ElkNodes. Cross-references become ElkEdges. Hierarchy (zones → VS, VS → activities, capabilities → sub-capabilities) becomes the `children` nesting.

---

## 5. Rendering

### Canvas vs SVG vs HTML

**Recommendation: SVG rendered via React.**

Reasons:
- IcePanel uses SVG — it's the right tool for labelled, styled diagram elements
- DOM-based hit detection (click on a box, get the element) — free with SVG
- Text rendering is native (labels, edge descriptions) — no manual font rendering
- CSS transitions for drill-in/out animations
- Manageable at our scale (hundreds, not thousands of nodes per level)

**The current Canvas renderer was right for the force-directed prototype** (thousands of nodes, rapid re-render). But for a structured diagram with <200 elements per view, SVG is clearer and more maintainable.

### Visual Language

**Node types:**
| Element | Shape | Icon/Badge | Colour |
|---------|-------|------------|--------|
| Value Stream | Large rounded rect | Flow icon | Blue (#3b82f6) |
| Activity | Rounded rect | Stage icon | Green (#22c55e) |
| Capability (L1-L3) | Containment rect (thin border) | Level badge | Amber (#f59e0b) gradient |
| Capability (L4) | Small rounded rect | L4 badge | Amber solid |
| Role | Rounded rect with person icon | — | Red (#ef4444) |
| Information Object | Diamond or rounded rect | IO icon | Purple (#a855f7) |
| Metric | Small pill | Chart icon | Cyan (#06b6d4) |
| Control | Small rect with shield | — | Slate |
| Application Function | Rounded rect with tech icon | — | Indigo |
| Outcome | Circle/oval | — | Grey |
| Containment boundary | Dashed rounded rect | Label top-left | Faint fill |

**Edge styles:**
| Relationship | Line | Label | Colour |
|-------------|------|-------|--------|
| VS → VS (shared outcome) | Solid, orthogonal | Outcome name | Blue |
| VS → VS (feedback) | Dashed, orthogonal | Outcome name | Grey |
| Activity → Activity (sequence) | Solid, arrow | Post-outcome | Green |
| Activity → Capability | Dotted | "requires" | Amber |
| Activity → Role | Dotted | "performed by" | Red |
| Capability → parent | Containment (implicit) | — | — |
| Metric → target | Thin dotted | "measures" | Cyan |
| Control → Activity | Thin dotted | "governs" | Slate |

---

## 6. Interaction Model

### Drill-In / Drill-Out
- **Click** on a value stream box at L1 → transitions to L2 (that VS's activity chain)
- **Click** on an activity at L2 → transitions to L3 (PPIT decomposition)
- **Click** on a capability reference → transitions to L4 (capability taxonomy, centred on that capability)
- **Breadcrumb** trail at top: `Operating Model > Customer Onboarding > Initial Assessment`
- **Back button** or breadcrumb click to drill out
- Transition animation: current view fades/scales, new view fades in

### Selection & Inspection
- **Click** on any element → opens inspector panel (right sidebar, reusing existing pattern)
  - Shows: all fields, all cross-references (clickable), edit count if dirty
  - "Go to in Catalog" button → switches to catalog view, selects that element
  - "Navigate to" → drills into that element's level
- **Hover** → highlights element + all edges connected to it. Dims unconnected elements.
- **Multi-select** (Shift+click) → highlights shared relationships between selected elements

### Filtering & Search
- **Type filter:** Toggle visibility of element types (same as current, but per-level)
- **Search:** Cmd+F overlay — matches by name, jumps to element, highlights path from current view
- **Relationship filter:** Show/hide specific edge types (e.g., "show only capability references")

### Neighbourhood View (1st/2nd/3rd Order)
- Select any element → toggle "Neighbourhood" mode
- Slider or buttons: 1st order (direct connections), 2nd order (+1 hop), 3rd order (+2 hops)
- Non-connected elements fade to ~10% opacity
- Edge labels remain visible on connected paths

---

## 7. Data Pipeline: Scaffold → ELK Graph

```typescript
// Transform scaffold into ELK graph for each abstraction level

function buildL1Graph(scaffold: ScaffoldData): ElkGraph {
  // Group VS by layoutZone → containment boxes
  // VS nodes inside zone containers
  // Edges: VS→VS via shared outcomes (from networkForwardEdges/networkFeedbackEdges)
}

function buildL2Graph(scaffold: ScaffoldData, vsId: string): ElkGraph {
  // Activity chain for this VS (follow nextActivityId)
  // Role strip above, capability strip below
  // Edges: Activity→Activity (sequence), Activity→Role, Activity→Capability
}

function buildL3Graph(scaffold: ScaffoldData, activityId: string): ElkGraph {
  // PPIT decomposition from capabilityPPIT
  // Structured grid layout
}

function buildL4Graph(scaffold: ScaffoldData, focusCapId?: string): ElkGraph {
  // Full L1→L4 tree as nested containment
  // Optional focus: expand to show focusCapId's ancestry
}
```

Each builder function returns an ELK-compatible graph that gets laid out by `elk.layout()`, then rendered as SVG.

---

## 8. Implementation Phases

### Phase 3a — Foundation (~4-6 hours)
- Install elkjs
- Build `ElkGraphRenderer` component (SVG-based, takes laid-out ELK graph → React SVG)
- Build `buildL1Graph()` transformer
- Replace current force-directed GraphExplorer with L1 view
- Drill-in/out to L2 (activity chain)
- Breadcrumb navigation
- Reuse existing inspector sidebar pattern

### Phase 3b — Full Depth (~3-4 hours)
- Build `buildL2Graph()`, `buildL3Graph()`, `buildL4Graph()` transformers
- L3 PPIT view
- L4 capability taxonomy view
- Drill-in from any level to any other
- Search overlay

### Phase 3c — Polish (~2-3 hours)
- Neighbourhood view (1st/2nd/3rd order filtering)
- Hover highlight with edge tracing
- Transition animations between levels
- Edge routing optimisation (port assignments)
- Responsive: handle small screens by collapsing inspector

---

## 9. Dependency Budget

| Package | Size (gzipped) | Purpose |
|---------|---------------|---------|
| elkjs (Web Worker) | ~80KB | Layout engine |
| — | — | SVG rendering is built-in React |

Total addition: ~80KB. No other new dependencies. The SVG rendering is pure React + inline styles (consistent with the rest of VCC).

---

## 10. Open Questions

1. **Layout persistence.** Should manually repositioned nodes be remembered across sessions? IcePanel does this. For Phase 3, ephemeral is fine (layout recomputes on each drill-in). Phase 4 could add persistence.

2. **Export.** Should the graph be exportable as SVG/PNG? Useful for documentation. Low-hanging fruit once SVG rendering is in place — just serialize the SVG DOM.

3. **Live editing.** Should you be able to drag elements between containers in the graph (e.g., reparent a capability by dragging it to a new L2 box)? Very powerful, very complex. Phase 4.

4. **Collaborative annotations.** Sticky notes or comments on the graph? Useful for review sessions. Phase 4+.

5. **Performance threshold.** At what element count does SVG rendering degrade? Likely ~500-1000 visible nodes. For L1 views this is never an issue (tens of VS). For L4 (full capability taxonomy) with 200+ capabilities, may need virtualisation or level-of-detail simplification.

6. **Minimap.** IcePanel has a minimap in the corner. Worth adding for L4 views where the full taxonomy doesn't fit in viewport.

---

## 11. Relationship to Existing Views

The Graph Explorer in the Workbench **complements, not replaces**, the existing Op Model canvas views:

| View | Purpose | Entry point |
|------|---------|-------------|
| **Network View** (subway) | Strategic overview, VS selection, friction heatmap | Main app, subway nav |
| **Stage View** (subway) | Detailed VS stage editing, assessment, enrichment | Click a VS in Network |
| **Capability Map** (subway) | Visual heatmap of capabilities by business area | Subway nav |
| **Concept Graph** (subway) | Entity-relationship diagram of business objects | Subway nav |
| **Graph Explorer** (Workbench) | Structured drill-in/out architectural diagram for model refinement | Workbench tab |

The Graph Explorer serves the **refinement use case** — understanding structure, finding gaps, validating relationships. The canvas views serve the **analysis use case** — assessing friction, identifying solutions, tracking progress.

---

*Designed Session 26. Build target: Session 27+.*
