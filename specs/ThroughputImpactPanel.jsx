import { useState, useMemo } from "react";

// ─── Throughput Impact Panel ───────────────────────────────────────
// Decision-support instrument for the VCC canvas.
// Reads: scaffold (metrics/measures), heatmap (binding constraint), UI params
// Writes: nothing. Derived-only. No mutation.

const COLORS = {
  bg: "#0B0F14",
  surface: "#131920",
  surfaceRaised: "#1A2230",
  border: "#2A3544",
  borderSubtle: "#1E2938",
  text: "#E8ECF0",
  textMuted: "#8899AA",
  textDim: "#556677",
  accent: "#F0A050",
  accentDim: "#805830",
  capacityRelease: "#50B090",
  capacityReleaseDim: "#204838",
  riskCompression: "#E07050",
  riskCompressionDim: "#4A2820",
  secondary: "#7888A0",
  confidenceFill: "#F0A050",
  confidenceEmpty: "#2A3544",
  trendImproving: "#50B090",
  trendWorsening: "#E07050",
  assumptionBg: "#10161E",
  assumptionBorder: "#1E2938",
  interventionBg: "#14192240",
  interventionBorder: "#F0A05030",
};

const FONT = {
  mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
  sans: "'DM Sans', 'Helvetica Neue', sans-serif",
  display: "'Instrument Serif', Georgia, serif",
};

// ─── Hardcoded scaffold + heatmap data for banking supervision ─────
// In production, these would be props from the canvas state.
const SCAFFOLD_DATA = {
  bindingConstraintActivityName: "Review & Approve Ratings and Plan",
  primaryMetric: {
    name: "Review & Approval Cycle Time",
    unit: "business days",
    direction: "Decrease",
    baseline: 15,
    current: 12,
    target: 7,
  },
  secondaryMetric: {
    name: "Escalation Rate",
    unit: "%",
    direction: "Attain",
    baseline: 18,
    current: 20,
    target: 12,
  },
  frictionCategories: [
    "DecisionAuthorityFriction",
    "GovernanceRiskFriction",
  ],
};

const HEATMAP_DATA = {
  confidence: 0.75,
  operationalValidationStatus: "NotYetVerified",
};

// ─── Friction category → intervention vector mapping ───────────────
const INTERVENTION_MAP = {
  DecisionAuthorityFriction: "Delegation authority redistribution",
  GovernanceRiskFriction: "Escalation threshold recalibration",
  ProcessHandoffFriction: "Handoff protocol redesign",
  DataSignalFriction: "Information flow improvement",
  TechnologyIntegrationFriction: "System integration optimisation",
  IncentiveCapacityFriction: "Role distribution adjustment",
};

// ─── Sub-components ────────────────────────────────────────────────

function ConfidenceDots({ value, max = 4 }) {
  const filled = Math.round(value * max);
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: i < filled ? COLORS.confidenceFill : COLORS.confidenceEmpty,
            transition: "background 0.3s ease",
          }}
        />
      ))}
      <span style={{ marginLeft: 6, fontFamily: FONT.mono, fontSize: 12, color: COLORS.textMuted }}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function DeltaCard({ label, value, unit, variant }) {
  const colors = {
    current: { bg: COLORS.surfaceRaised, border: COLORS.border, text: COLORS.text },
    target: { bg: COLORS.surfaceRaised, border: COLORS.border, text: COLORS.textMuted },
    delta: { bg: COLORS.accentDim + "40", border: COLORS.accent + "60", text: COLORS.accent },
  };
  const c = colors[variant] || colors.current;

  return (
    <div
      style={{
        flex: 1,
        padding: "16px 14px",
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 6,
        textAlign: "center",
      }}
    >
      <div style={{ fontFamily: FONT.mono, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.textDim, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: FONT.display, fontSize: 28, color: c.text, lineHeight: 1.1 }}>
        {variant === "delta" ? "−" : ""}{value}
      </div>
      <div style={{ fontFamily: FONT.mono, fontSize: 11, color: COLORS.textDim, marginTop: 4 }}>
        {unit}
      </div>
    </div>
  );
}

function ParamInput({ label, value, onChange, suffix }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontFamily: FONT.mono, fontSize: 11, color: COLORS.textDim, minWidth: 90 }}>{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        style={{
          width: 64,
          padding: "4px 8px",
          background: COLORS.bg,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 4,
          color: COLORS.text,
          fontFamily: FONT.mono,
          fontSize: 13,
          textAlign: "right",
          outline: "none",
        }}
      />
      {suffix && <span style={{ fontFamily: FONT.mono, fontSize: 11, color: COLORS.textDim }}>{suffix}</span>}
    </div>
  );
}

function ConsequenceMode({ title, color, dimColor, items }) {
  return (
    <div
      style={{
        flex: 1,
        padding: 16,
        background: dimColor + "20",
        border: `1px solid ${dimColor}`,
        borderRadius: 6,
      }}
    >
      <div style={{ fontFamily: FONT.mono, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color, marginBottom: 12 }}>
        {title}
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ marginBottom: i < items.length - 1 ? 10 : 0 }}>
          <div style={{ fontFamily: FONT.display, fontSize: 22, color: COLORS.text, lineHeight: 1.2 }}>
            {item.value}
          </div>
          <div style={{ fontFamily: FONT.sans, fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
            {item.label}
          </div>
          {item.secondary && (
            <div style={{ fontFamily: FONT.mono, fontSize: 10, color: COLORS.secondary, marginTop: 4, fontStyle: "italic" }}>
              * secondary projection
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TrendLine({ label, baseline, current, target, direction, unit, worsening }) {
  const min = Math.min(baseline, current, target) * 0.8;
  const max = Math.max(baseline, current, target) * 1.2;
  const range = max - min;
  const pct = (v) => ((v - min) / range) * 100;

  const color = worsening ? COLORS.trendWorsening : COLORS.trendImproving;

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 10, color: COLORS.textDim }}>{label}</span>
        <span style={{ fontFamily: FONT.mono, fontSize: 10, color }}>
          {worsening ? "▲ worsening" : "▼ improving"}
        </span>
      </div>
      <div style={{ position: "relative", height: 20, background: COLORS.surfaceRaised, borderRadius: 3, overflow: "hidden" }}>
        {/* Target zone */}
        <div style={{
          position: "absolute",
          left: `${pct(target)}%`,
          top: 0,
          bottom: 0,
          width: 2,
          background: COLORS.accent + "60",
        }} />
        {/* Baseline marker */}
        <div style={{
          position: "absolute",
          left: `${pct(baseline)}%`,
          top: 4,
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: COLORS.textDim,
          transform: "translateX(-3px)",
        }} />
        {/* Current marker */}
        <div style={{
          position: "absolute",
          left: `${pct(current)}%`,
          top: 3,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          transform: "translateX(-4px)",
          border: `2px solid ${COLORS.bg}`,
          boxShadow: `0 0 6px ${color}60`,
        }} />
        {/* Labels below */}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 9, color: COLORS.textDim }}>
          baseline {baseline}{unit}
        </span>
        <span style={{ fontFamily: FONT.mono, fontSize: 9, color }}>
          current {current}{unit}
        </span>
        <span style={{ fontFamily: FONT.mono, fontSize: 9, color: COLORS.accent }}>
          target {target}{unit}
        </span>
      </div>
    </div>
  );
}

// ─── Main Panel ────────────────────────────────────────────────────

export default function ThroughputImpactPanel() {
  const [entityVolume, setEntityVolume] = useState(160);
  const [assessmentFrequency, setAssessmentFrequency] = useState(1.0);
  const [fteCapacityDays, setFteCapacityDays] = useState(60);

  const data = SCAFFOLD_DATA;
  const hm = HEATMAP_DATA;

  // ─── Calculations ──────────────────────────────────────────────
  const calc = useMemo(() => {
    const pm = data.primaryMetric;
    const sm = data.secondaryMetric;

    const constraintDelta = pm.current - pm.target;
    const annualCycles = entityVolume * assessmentFrequency;
    const quarterlyCycles = annualCycles / 4;
    const daysReleasedPerQuarter = constraintDelta * quarterlyCycles;
    const fteEquivalent = fteCapacityDays > 0 ? daysReleasedPerQuarter / fteCapacityDays : 0;

    const currentEscalations = quarterlyCycles * (sm.current / 100);
    const targetEscalations = quarterlyCycles * (sm.target / 100);
    const escalationReduction = currentEscalations - targetEscalations;

    const exposureReduction = constraintDelta;

    return {
      constraintDelta,
      quarterlyCycles: Math.round(quarterlyCycles),
      daysReleasedPerQuarter: Math.round(daysReleasedPerQuarter),
      fteEquivalent: fteEquivalent.toFixed(1),
      escalationReduction: escalationReduction.toFixed(1),
      exposureReduction,
    };
  }, [entityVolume, assessmentFrequency, fteCapacityDays, data]);

  // ─── Intervention vectors ──────────────────────────────────────
  const interventionVectors = data.frictionCategories
    .map((cat) => INTERVENTION_MAP[cat])
    .filter(Boolean);

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div
      style={{
        width: 520,
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        padding: 24,
        fontFamily: FONT.sans,
        color: COLORS.text,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: COLORS.accent, marginBottom: 6 }}>
            Structural Projection (First-Order)
          </div>
          <div style={{ fontFamily: FONT.display, fontSize: 18, color: COLORS.text, lineHeight: 1.3 }}>
            {data.bindingConstraintActivityName}
          </div>
        </div>
        <ConfidenceDots value={hm.confidence} />
      </div>

      {/* Delta Bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center" }}>
        <DeltaCard label="Current" value={data.primaryMetric.current} unit={`${data.primaryMetric.unit}/cycle`} variant="current" />
        <span style={{ fontFamily: FONT.mono, fontSize: 16, color: COLORS.textDim }}>→</span>
        <DeltaCard label="Target" value={data.primaryMetric.target} unit={`${data.primaryMetric.unit}/cycle`} variant="target" />
        <span style={{ fontFamily: FONT.mono, fontSize: 16, color: COLORS.textDim }}>=</span>
        <DeltaCard label="Delta" value={calc.constraintDelta} unit={`${data.primaryMetric.unit}/cycle`} variant="delta" />
      </div>

      {/* Engagement Context */}
      <div style={{ padding: "12px 14px", background: COLORS.bg, border: `1px solid ${COLORS.borderSubtle}`, borderRadius: 6, marginBottom: 20 }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.textDim, marginBottom: 10 }}>
          Engagement Context
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <ParamInput label="Entities" value={entityVolume} onChange={setEntityVolume} />
          <ParamInput label="Cycles/year" value={assessmentFrequency} onChange={setAssessmentFrequency} />
          <ParamInput label="FTE days/qtr" value={fteCapacityDays} onChange={setFteCapacityDays} />
        </div>
      </div>

      {/* Dual Consequence Modes */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <ConsequenceMode
          title="Capacity Release"
          color={COLORS.capacityRelease}
          dimColor={COLORS.capacityReleaseDim}
          items={[
            { value: `${calc.daysReleasedPerQuarter} days/qtr`, label: "supervisory days released" },
            { value: `≈ ${calc.fteEquivalent} FTEs`, label: "equivalent capacity" },
          ]}
        />
        <ConsequenceMode
          title="Risk Compression"
          color={COLORS.riskCompression}
          dimColor={COLORS.riskCompressionDim}
          items={[
            { value: `−${calc.exposureReduction} days`, label: "exposure window per entity per cycle" },
            { value: `−${calc.escalationReduction}/qtr`, label: "executive escalation backlogs", secondary: true },
          ]}
        />
      </div>

      {/* Intervention Vector */}
      <div style={{
        padding: "12px 14px",
        background: COLORS.interventionBg,
        border: `1px solid ${COLORS.interventionBorder}`,
        borderRadius: 6,
        marginBottom: 20,
      }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.accent, marginBottom: 8 }}>
          Intervention Vector
        </div>
        <div style={{ fontFamily: FONT.sans, fontSize: 13, color: COLORS.text, marginBottom: 6 }}>
          Governance design optimisation
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {interventionVectors.map((v, i) => (
            <div key={i} style={{ fontFamily: FONT.mono, fontSize: 11, color: COLORS.textMuted }}>
              • {v}
            </div>
          ))}
          <div style={{ fontFamily: FONT.mono, fontSize: 11, color: COLORS.textMuted }}>
            • Approval parallelisation or tiered authority
          </div>
        </div>
      </div>

      {/* Consequence Statement */}
      <div style={{
        padding: 16,
        background: COLORS.surfaceRaised,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 6,
        marginBottom: 20,
      }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.textDim, marginBottom: 10 }}>
          Consequence
        </div>
        <div style={{ fontFamily: FONT.sans, fontSize: 13, color: COLORS.text, lineHeight: 1.6, marginBottom: 14 }}>
          If the approval cycle time is reduced from {data.primaryMetric.current} to {data.primaryMetric.target} {data.primaryMetric.unit}, and current assessment volumes remain constant, the value stream has the potential to release approximately{" "}
          <strong style={{ color: COLORS.capacityRelease }}>{calc.daysReleasedPerQuarter} supervisory days per quarter</strong>{" "}
          (≈{calc.fteEquivalent} FTEs). Each entity's exposure window would reduce by{" "}
          <strong style={{ color: COLORS.riskCompression }}>{calc.exposureReduction} {data.primaryMetric.unit} per cycle</strong>.
        </div>
        <div style={{ fontFamily: FONT.sans, fontSize: 12, color: COLORS.secondary, lineHeight: 1.5, fontStyle: "italic", marginBottom: 14 }}>
          * Secondary: Achieving target escalation rate would reduce executive backlogs by ≈{calc.escalationReduction}/qtr. Requires escalation rate to reach target independently — see assumptions.
        </div>

        {/* Assumptions */}
        <div style={{
          padding: "10px 12px",
          background: COLORS.assumptionBg,
          border: `1px solid ${COLORS.assumptionBorder}`,
          borderRadius: 4,
          marginBottom: 12,
        }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.textDim, marginBottom: 6 }}>
            Assumptions
          </div>
          {[
            "Review & Approve is sole throughput limiter",
            "Occurs once per cycle per entity",
            `Assessment volumes remain constant (${entityVolume} entities, ${assessmentFrequency} cycles/yr)`,
            "Downstream stages do not re-accumulate equivalent delay",
            "* Escalation rate reaches target independently (secondary only)",
          ].map((a, i) => (
            <div key={i} style={{ fontFamily: FONT.mono, fontSize: 10, color: COLORS.textDim, lineHeight: 1.6 }}>
              {a.startsWith("*") ? (
                <span style={{ color: COLORS.secondary }}>{a}</span>
              ) : (
                <>• {a}</>
              )}
            </div>
          ))}
        </div>

        {/* Confidence footer */}
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT.mono, fontSize: 10, color: COLORS.textDim }}>
          <span>Structural inference confidence: {hm.confidence.toFixed(2)}</span>
          <span>Operational validation: {hm.operationalValidationStatus === "NotYetVerified" ? "Not yet verified" : hm.operationalValidationStatus}</span>
        </div>
      </div>

      {/* Trend Lines */}
      <div>
        <TrendLine
          label={data.primaryMetric.name}
          baseline={data.primaryMetric.baseline}
          current={data.primaryMetric.current}
          target={data.primaryMetric.target}
          direction={data.primaryMetric.direction}
          unit="d"
          worsening={false}
        />
        <TrendLine
          label={data.secondaryMetric.name}
          baseline={data.secondaryMetric.baseline}
          current={data.secondaryMetric.current}
          target={data.secondaryMetric.target}
          direction={data.secondaryMetric.direction}
          unit="%"
          worsening={true}
        />
      </div>
    </div>
  );
}
