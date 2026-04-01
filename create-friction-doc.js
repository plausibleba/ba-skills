const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
        ShadingType, PageNumber, LevelFormat, PageBreak, TableOfContents } = require("docx");
const fs = require("fs");

// ── Colours ──
const INK = "1A1A1A";
const INK2 = "3A3A3A";
const INK3 = "6B6B6B";
const ACCENT = "2E5FA1";
const AMBER = "D97706";
const RED = "BE123C";
const SURFACE = "F7F6F3";
const BORDER = "D4D4D4";
const WHITE = "FFFFFF";

// ── Page dims (US Letter) ──
const PAGE_W = 12240;
const PAGE_H = 15840;
const MARGIN = 1440;
const CONTENT_W = PAGE_W - 2 * MARGIN; // 9360

// ── Helpers ──
const border = { style: BorderStyle.SINGLE, size: 1, color: BORDER };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, spacing: { before: level === HeadingLevel.HEADING_1 ? 360 : 240, after: 180 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: level === HeadingLevel.HEADING_1 ? 32 : level === HeadingLevel.HEADING_2 ? 26 : 22, color: INK })] });
}

function para(text, opts = {}) {
  const runs = typeof text === "string" ? [new TextRun({ text, font: "Arial", size: 21, color: opts.color || INK2, ...opts.run })] : text;
  return new Paragraph({ spacing: { after: 160 }, alignment: opts.align, children: runs, ...opts.para });
}

function bold(text, color = INK) { return new TextRun({ text, bold: true, font: "Arial", size: 21, color }); }
function normal(text, color = INK2) { return new TextRun({ text, font: "Arial", size: 21, color }); }
function italic(text, color = INK3) { return new TextRun({ text, italics: true, font: "Arial", size: 21, color }); }

function bullet(text, ref = "bullets", level = 0) {
  const runs = typeof text === "string" ? [normal(text)] : text;
  return new Paragraph({ numbering: { reference: ref, level }, spacing: { after: 80 }, children: runs });
}

function headerCell(text, width) {
  return new TableCell({ borders, width: { size: width, type: WidthType.DXA },
    shading: { fill: "2E5FA1", type: ShadingType.CLEAR }, margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, font: "Arial", size: 18, color: WHITE })] })] });
}

function cell(text, width, opts = {}) {
  const runs = typeof text === "string" ? [new TextRun({ text, font: "Arial", size: 18, color: opts.color || INK2 })] : text;
  return new TableCell({ borders, width: { size: width, type: WidthType.DXA },
    shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins, children: [new Paragraph({ children: runs })] });
}

// ── Document ──
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 21 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: INK },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: INK },
        paragraph: { spacing: { before: 240, after: 180 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Arial", color: INK2 },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "\u2013", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
      ]},
      { reference: "numbers", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      ]},
    ]
  },
  sections: [
    // ── COVER ──
    {
      properties: {
        page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } },
      },
      children: [
        new Paragraph({ spacing: { before: 3600 } }),
        new Paragraph({ spacing: { after: 200 }, children: [
          new TextRun({ text: "VCC METHODOLOGY", font: "Arial", size: 20, bold: true, color: ACCENT, characterSpacing: 120 }),
        ]}),
        new Paragraph({ spacing: { after: 120 }, children: [
          new TextRun({ text: "Friction Assessment", font: "Arial", size: 52, bold: true, color: INK }),
        ]}),
        new Paragraph({ spacing: { after: 400 }, children: [
          new TextRun({ text: "How constraint is identified, classified, and scored across value streams", font: "Arial", size: 24, color: INK3 }),
        ]}),
        new Paragraph({ spacing: { after: 80 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: ACCENT, space: 8 } },
          children: [normal("Value Cognition Canvas v0.4.0", INK3)] }),
        para("March 2026", { color: INK3 }),
        new Paragraph({ children: [new PageBreak()] }),
      ]
    },

    // ── BODY ──
    {
      properties: {
        page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } },
      },
      headers: {
        default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "VCC Friction Assessment Methodology", font: "Arial", size: 16, color: INK3, italics: true })] })] }),
      },
      footers: {
        default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Page ", font: "Arial", size: 16, color: INK3 }),
                     new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: INK3 })] })] }),
      },
      children: [
        new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),
        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════
        // 1. OVERVIEW
        // ═══════════════════════════════════════════════════
        heading("1. What is a Friction Assessment?"),

        para([
          normal("A Friction Assessment is a structured diagnostic that identifies "),
          bold("where constraint accumulates"),
          normal(" in a value stream. Unlike traditional process reviews that list problems, a friction assessment anchors every observation to a specific element in the operating model (an activity, role, control, or capability) and classifies it according to a formal taxonomy."),
        ]),

        para([
          normal("The output is a "),
          bold("heatmap"),
          normal(" that overlays the value stream canvas, showing which activities carry the most friction and which single point represents the "),
          bold("binding constraint"),
          normal(" \u2014 the bottleneck that limits overall throughput."),
        ]),

        para("The assessment serves three purposes:"),
        bullet([bold("Diagnostic: "), normal("Surface where operational friction exists and quantify its intensity")]),
        bullet([bold("Interpretive: "), normal("Identify the binding constraint \u2014 the single point that most limits throughput")]),
        bullet([bold("Interventional: "), normal("Map friction observations to solution recommendations (People, Process, Information, Technology)")]),

        // ═══════════════════════════════════════════════════
        // 2. THE FRICTION TAXONOMY
        // ═══════════════════════════════════════════════════
        heading("2. The Friction Taxonomy"),

        para("Friction observations are classified into six categories, split between two governance concerns. This taxonomy is exhaustive \u2014 any operational friction in a value stream maps to exactly one of these categories."),

        heading("2.1 Execution Friction (Amber)", HeadingLevel.HEADING_2),
        para("Execution friction describes operational bottlenecks \u2014 places where work stalls, fragments, or degrades as it moves through the value stream."),

        // Execution table
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [2200, 3600, 3560],
          rows: [
            new TableRow({ children: [headerCell("Category", 2200), headerCell("Definition", 3600), headerCell("Structural Signal", 3560)] }),
            new TableRow({ children: [
              cell([bold("Process Handoff", AMBER)], 2200),
              cell("Work stalls between stages. Rework loops, wait-time queues, and sequential gating without parallelism.", 3600),
              cell("Long activity chains without branching; repeated outcome loops", 3560),
            ]}),
            new TableRow({ children: [
              cell([bold("Technology Integration", AMBER)], 2200),
              cell("Systems don\u2019t interoperate. Manual data re-entry, automation gaps, capability spread across multiple unlinked systems.", 3600),
              cell("Single activity requiring multiple capabilities; capability spread across VS", 3560),
            ]}),
            new TableRow({ children: [
              cell([bold("Data Signal", AMBER)], 2200),
              cell("Information is fragmented or delayed. Decision latency due to data dependency chains (3+ consecutive activities depending on same information objects).", 3600),
              cell("Repeated informationObjectIds across sequential activities", 3560),
            ]}),
          ]
        }),

        new Paragraph({ spacing: { after: 200 } }),

        heading("2.2 Governing Friction (Red)", HeadingLevel.HEADING_2),
        para("Governing friction describes decision and control bottlenecks \u2014 places where authority, compliance, or accountability structures impede flow."),

        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [2200, 3600, 3560],
          rows: [
            new TableRow({ children: [headerCell("Category", 2200), headerCell("Definition", 3600), headerCell("Structural Signal", 3560)] }),
            new TableRow({ children: [
              cell([bold("Decision Authority", RED)], 2200),
              cell("Decision rights are ambiguous. Escalation layers multiply, approval gates concentrate on single roles, delegation is unclear.", 3600),
              cell("Single-point approval; role appearing in >5 activities", 3560),
            ]}),
            new TableRow({ children: [
              cell([bold("Governance Risk", RED)], 2200),
              cell("Control layering creates overhead. Compliance gates multiply without clear risk reduction; audit burden exceeds value.", 3600),
              cell("2+ controls per activity; metric absence where controls exist", 3560),
            ]}),
            new TableRow({ children: [
              cell([bold("Incentive Capacity", RED)], 2200),
              cell("Performance measures distort behaviour. Budget fragments accountability. Metrics misaligned with outcomes or absent entirely.", 3600),
              cell("Role overload (5+ activities); missing or misaligned metrics", 3560),
            ]}),
          ]
        }),

        new Paragraph({ spacing: { after: 200 } }),

        // ═══════════════════════════════════════════════════
        // 3. EVIDENCE CLASSIFICATION
        // ═══════════════════════════════════════════════════
        heading("3. Evidence Classification"),

        para("Every observation declares its evidential basis. This matters because it determines how much weight the observation carries in scoring and how urgently it needs validation."),

        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [1800, 4000, 3560],
          rows: [
            new TableRow({ children: [headerCell("Classification", 1800), headerCell("Meaning", 4000), headerCell("Rules", 3560)] }),
            new TableRow({ children: [
              cell([bold("EVIDENCED")], 1800),
              cell("Directly stated in source material (transcript, document, or user input). Includes verbatim or paraphrased evidence.", 4000),
              cell("Must include evidence[] array with source references. No intensity cap.", 3560),
            ]}),
            new TableRow({ children: [
              cell([bold("INFERRED")], 1800),
              cell("Derived from scaffold structure. The AI identifies structural patterns that typically indicate friction.", 4000),
              cell("Must include structuralPattern object describing what was detected. No intensity cap.", 3560),
            ]}),
            new TableRow({ children: [
              cell([bold("ASSUMED")], 1800),
              cell("Domain heuristic only. Common friction pattern applied without specific evidence from this context.", 4000),
              cell("Intensity capped at 5/10. Requires validation flag. Lowest scoring weight.", 3560),
            ]}),
          ]
        }),

        new Paragraph({ spacing: { after: 200 } }),

        // ═══════════════════════════════════════════════════
        // 4. INTENSITY SCORING
        // ═══════════════════════════════════════════════════
        heading("4. Intensity Scoring"),

        para("Each observation receives an intensity score on a 0\u201310 scale. This score is assigned by the AI based on the severity of the friction pattern and the strength of the evidence."),

        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [1500, 1500, 6360],
          rows: [
            new TableRow({ children: [headerCell("Score", 1500), headerCell("Severity", 1500), headerCell("Interpretation", 6360)] }),
            new TableRow({ children: [cell("8 \u2013 10", 1500), cell([bold("Critical", RED)], 1500), cell("Immediate action required. Blocks throughput or creates systemic risk.", 6360)] }),
            new TableRow({ children: [cell("6 \u2013 7", 1500), cell([bold("High", AMBER)], 1500), cell("Significant friction. Blocks key decisions or degrades quality noticeably.", 6360)] }),
            new TableRow({ children: [cell("4 \u2013 5", 1500), cell([bold("Medium")], 1500), cell("Moderate friction. Worth addressing but not blocking. ASSUMED observations capped here.", 6360)] }),
            new TableRow({ children: [cell("0 \u2013 3", 1500), cell("Low", 1500), cell("Minor friction. Low priority unless part of a pattern.", 6360)] }),
          ]
        }),

        new Paragraph({ spacing: { after: 200 } }),

        // ═══════════════════════════════════════════════════
        // 5. ANCHOR MODEL
        // ═══════════════════════════════════════════════════
        heading("5. The Anchor Model"),

        para([
          normal("Every friction observation is "),
          bold("anchored"),
          normal(" to one or more elements in the scaffold. This is what makes friction assessments structural rather than anecdotal \u2014 each observation points to a specific, identifiable part of the operating model."),
        ]),

        heading("5.1 Anchor Types", HeadingLevel.HEADING_2),

        para("The primary anchor identifies the element most responsible for the friction. Contributing anchors identify related elements that participate in or amplify the friction pattern."),

        bullet([bold("Activity "), normal("\u2014 a step in the value stream (most common anchor type)")]),
        bullet([bold("Role "), normal("\u2014 a person or team performing work")]),
        bullet([bold("Capability "), normal("\u2014 an organisational ability required by an activity")]),
        bullet([bold("Control "), normal("\u2014 a governance mechanism (approval gate, compliance check)")]),
        bullet([bold("Metric "), normal("\u2014 a performance measure attached to an activity or outcome")]),
        bullet([bold("Constraint / Directive "), normal("\u2014 a policy or rule governing behaviour")]),

        heading("5.2 Anchor Resolution", HeadingLevel.HEADING_2),

        para("When a friction observation is anchored to a non-activity element (e.g., a Role or Metric), the system resolves it to the set of activities that reference that element. This is how the heatmap overlay works: even a Role-anchored observation lights up the correct activity columns on the canvas."),

        para("Resolution paths:"),
        bullet([bold("Role \u2192 Activities: "), normal("All activities where performedByRoleIds includes the role")]),
        bullet([bold("Capability \u2192 Activities: "), normal("All activities where requiresCapabilityIds includes the capability")]),
        bullet([bold("Metric \u2192 Activities: "), normal("All activities where metricIds includes the metric")]),
        bullet([bold("Control \u2192 Activities: "), normal("All activities where controlIds includes the control")]),

        // ═══════════════════════════════════════════════════
        // 6. BINDING CONSTRAINT
        // ═══════════════════════════════════════════════════
        heading("6. The Binding Constraint"),

        para([
          normal("The binding constraint is the "),
          bold("single point in the value stream that most limits overall throughput"),
          normal(". Borrowed from the Theory of Constraints, this concept ensures the assessment doesn\u2019t just list problems but identifies the one place where intervention would have the greatest systemic effect."),
        ]),

        heading("6.1 Scoring Model", HeadingLevel.HEADING_2),

        para("Binding constraint eligibility is determined by a 5-dimensional scoring model. Each dimension scores 0\u20133 for a maximum of 15 points."),

        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [2800, 5060, 1500],
          rows: [
            new TableRow({ children: [headerCell("Dimension", 2800), headerCell("What It Measures", 5060), headerCell("Range", 1500)] }),
            new TableRow({ children: [cell([bold("Observation Frequency")], 2800), cell("How many friction observations reference this anchor point", 5060), cell("0 \u2013 3", 1500)] }),
            new TableRow({ children: [cell([bold("Authority Centralisation")], 2800), cell("Degree to which decision rights concentrate at this point", 5060), cell("0 \u2013 3", 1500)] }),
            new TableRow({ children: [cell([bold("Downstream Dependency")], 2800), cell("How many subsequent activities depend on this anchor\u2019s output", 5060), cell("0 \u2013 3", 1500)] }),
            new TableRow({ children: [cell([bold("Control Layering")], 2800), cell("Number of governance controls stacked at this point", 5060), cell("0 \u2013 3", 1500)] }),
            new TableRow({ children: [cell([bold("Capacity Constraint")], 2800), cell("Whether this point is resource-limited (people, systems, budget)", 5060), cell("0 \u2013 3", 1500)] }),
          ]
        }),

        new Paragraph({ spacing: { after: 200 } }),

        heading("6.2 Eligibility and Confidence", HeadingLevel.HEADING_2),

        para([
          bold("Eligibility rule: "), normal("An anchor is only eligible to be the binding constraint if its Downstream Dependency score is \u2265 2. This prevents edge-of-chain activities (which may be painful but don\u2019t limit throughput) from being selected."),
        ]),

        para([
          bold("Confidence: "), normal("Calculated as totalScore / 15, expressed as a percentage. A binding constraint with 12/15 has 80% confidence. A null binding constraint is valid \u2014 it means the assessment found friction but no clear single bottleneck."),
        ]),

        // ═══════════════════════════════════════════════════
        // 7. THREE-LAYER ARCHITECTURE
        // ═══════════════════════════════════════════════════
        heading("7. Three-Layer Architecture"),

        para("The friction assessment is evolving toward a three-layer architecture that cleanly separates observation from interpretation from action:"),

        heading("7.1 Diagnostic Layer", HeadingLevel.HEADING_2),
        para([
          normal("Pure observations. Each friction observation is a factual finding: "),
          italic("\"Process Handoff friction at Activity X, intensity 7/10, INFERRED from sequential gating pattern.\""),
          normal(" No interpretation, no recommendations. This layer is generated by the AI and editable by the user."),
        ]),

        heading("7.2 Interpretive Layer", HeadingLevel.HEADING_2),
        para([
          normal("Human judgment applied to the diagnostics. The binding constraint selection lives here \u2014 it\u2019s zero-or-one per value stream, and represents the analyst\u2019s (or AI\u2019s) interpretation of where intervention would have the most impact. This layer can be overridden by the user."),
        ]),

        heading("7.3 Intervention Layer", HeadingLevel.HEADING_2),
        para([
          normal("Action artifacts. Solutions mapped to observations (People, Process, Information, Technology types), vendor feature references, customer stories, and generated user stories. This is where the assessment connects to implementation."),
        ]),

        // ═══════════════════════════════════════════════════
        // 8. GENERATION PIPELINE
        // ═══════════════════════════════════════════════════
        heading("8. Generation Pipeline"),

        para("Friction assessments are generated by an LLM pass (Pass C in the VCC pipeline) that analyses the scaffold structure against the taxonomy. The generation process:"),

        bullet([bold("1. Input preparation: "), normal("The scaffold is reduced to a minimal skeleton (activity names, IDs, outcome links) to stay within token limits. Pain points from the discovery transcript are included if available.")], "numbers"),
        bullet([bold("2. Structural analysis: "), normal("The LLM analyses the scaffold against each of the six friction categories, looking for structural patterns (sequential gating, role overload, control layering, etc.)")], "numbers"),
        bullet([bold("3. Observation generation: "), normal("For each identified friction point, the LLM produces a classified observation with anchor, category, intensity, evidence basis, and rationale.")], "numbers"),
        bullet([bold("4. Binding constraint scoring: "), normal("The 5-dimensional scoring model is applied to identify the binding constraint. Eligibility rules filter candidates.")], "numbers"),
        bullet([bold("5. Solution enrichment (optional): "), normal("A separate pass maps friction observations to vendor capabilities and solution recommendations, producing the intervention layer.")], "numbers"),

        heading("8.1 Quality Controls", HeadingLevel.HEADING_2),

        bullet([bold("Anchor validation: "), normal("Every anchor ID must reference a real scaffold element. Invalid anchors are rejected.")]),
        bullet([bold("ASSUMED cap: "), normal("Observations classified as ASSUMED are automatically intensity-capped at 5/10.")]),
        bullet([bold("Downstream dependency gate: "), normal("Binding constraint candidates must score \u2265 2 on downstream dependency.")]),
        bullet([bold("Null binding allowed: "), normal("If no anchor meets the eligibility threshold, the binding constraint is null rather than forced.")]),

        // ═══════════════════════════════════════════════════
        // 9. USER WORKFLOW
        // ═══════════════════════════════════════════════════
        heading("9. User Workflow"),

        para("The friction assessment integrates into the VCC workflow at Step 2 of the Stage Wizard, after the scaffold has been generated and validated:"),

        bullet([bold("Generate scaffold "), normal("(Pass A + B) \u2014 produces the value stream structure with activities, roles, capabilities")]),
        bullet([bold("Assess friction "), normal("(Pass C) \u2014 triggered by user clicking \u201CAssess Friction\u201D in the Stage Wizard. Generates one heatmap per value stream.")]),
        bullet([bold("Review on canvas "), normal("\u2014 friction observations appear as coloured badges on activity columns. Amber for execution friction, red for governing friction. The binding constraint activity gets a distinct marker.")]),
        bullet([bold("Inspect and edit "), normal("\u2014 clicking a friction badge opens the Friction Panel, showing all observations anchored to that activity. Users can modify intensity, reclassify categories, or add new observations.")]),
        bullet([bold("Enrich with solutions "), normal("(Pass 4, optional) \u2014 maps observations to vendor features and solution recommendations.")]),
        bullet([bold("Export "), normal("\u2014 the full bundle (scaffold + heatmaps + solutions) can be downloaded as JSON for re-import or sharing.")]),

        new Paragraph({ spacing: { after: 200 } }),
        para([italic("Scope: one heatmap per value stream. Observations are resolved to activities for display but can be anchored to any scaffold element type. The binding constraint is value-stream-level (one per heatmap).")]),
      ]
    },
  ]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("/sessions/clever-adoring-babbage/mnt/vcc/friction-assessment-methodology.docx", buf);
  console.log("Done:", buf.length, "bytes");
});
