import { useState, useMemo } from "react";
import type {
  HeatmapData,
  ScaffoldData,
  ScaffoldMetric,
  EngagementParams,
} from "../types.ts";
import { humanizeId } from "../lib/humanize-id.ts";

// ─── Throughput impact calculation ─────────────────────────────────
// First-order arithmetic only. No simulation, no queuing theory.
// Constraint delta × volume = capacity released.

interface ThroughputCalc {
  constraintDelta: number;
  quarterlyCycles: number;
  daysReleasedPerQuarter: number;
  fteEquivalent: string;
  escalationReduction: string | null;
  exposureReduction: number;
  primaryMetric: ScaffoldMetric | null;
  secondaryMetric: ScaffoldMetric | null;
  isWorseningScenario: boolean;
}

function computeThroughput(
  primaryMetric: ScaffoldMetric | null,
  secondaryMetric: ScaffoldMetric | null,
  params: EngagementParams,
): ThroughputCalc {
  const pm = primaryMetric;
  const current = pm?.currentMeasure ?? 0;
  const target = pm?.targetMeasure ?? 0;
  const direction = pm?.direction;

  // Direction-aware delta: positive = improvement, negative = worsening
  // "Decrease" metrics (duration, cost): improvement = current - target
  // "Increase"/"Attain" metrics (rate, throughput): improvement = target - current
  let constraintDelta: number;
  if (direction === "Increase" || direction === "Attain") {
    constraintDelta = target - current;
  } else {
    // Default to "Decrease" polarity (cycle time, cost, defect rate)
    constraintDelta = current - target;
  }

  // Guard: if delta is negative, target is worse than current — flag it
  const isWorseningScenario = constraintDelta < 0;
  const effectiveDelta = isWorseningScenario ? 0 : constraintDelta;

  const annualCycles = params.entityVolume * params.assessmentFrequency;
  const quarterlyCycles = annualCycles / 4;
  const daysReleasedPerQuarter = effectiveDelta * quarterlyCycles;
  const fteEquivalent =
    params.fteCapacityDays > 0
      ? (daysReleasedPerQuarter / params.fteCapacityDays).toFixed(1)
      : "0";

  // Secondary metric (e.g. escalation rate) — optional
  let escalationReduction: string | null = null;
  if (
    secondaryMetric?.currentMeasure != null &&
    secondaryMetric?.targetMeasure != null
  ) {
    const currentEsc = quarterlyCycles * (secondaryMetric.currentMeasure / 100);
    const targetEsc = quarterlyCycles * (secondaryMetric.targetMeasure / 100);
    escalationReduction = (currentEsc - targetEsc).toFixed(1);
  }

  return {
    constraintDelta,
    quarterlyCycles: Math.round(quarterlyCycles),
    daysReleasedPerQuarter: Math.round(daysReleasedPerQuarter),
    fteEquivalent,
    escalationReduction,
    exposureReduction: effectiveDelta,
    primaryMetric: pm ?? null,
    secondaryMetric: secondaryMetric ?? null,
    isWorseningScenario,
  };
}

// ─── Resolve metrics from binding constraint activity ──────────────

function resolveBindingMetrics(
  activityId: string,
  scaffold: ScaffoldData,
): { primary: ScaffoldMetric | null; secondary: ScaffoldMetric | null; unavailableReason: string | null } {
  const activity = scaffold.elements.activities[activityId];
  if (!activity?.metricIds?.length) {
    return { primary: null, secondary: null, unavailableReason: "No metrics defined on this activity." };
  }

  // Require explicit throughput metric designation — no guessing
  if (!activity.throughputMetricId) {
    return { primary: null, secondary: null, unavailableReason: "Throughput metric not designated for this activity." };
  }

  // Validate throughputMetricId exists in metrics and is referenced by activity
  if (!activity.metricIds.includes(activity.throughputMetricId)) {
    return { primary: null, secondary: null, unavailableReason: `throughputMetricId "${activity.throughputMetricId}" is not in this activity's metricIds.` };
  }

  const primaryRaw = scaffold.elements.metrics[activity.throughputMetricId] as ScaffoldMetric | undefined;
  if (!primaryRaw) {
    return { primary: null, secondary: null, unavailableReason: `Metric "${activity.throughputMetricId}" not found in scaffold.` };
  }

  // Require both currentMeasure and targetMeasure — otherwise delta is meaningless
  if (primaryRaw.currentMeasure == null || primaryRaw.targetMeasure == null) {
    return { primary: null, secondary: null, unavailableReason: "Designated throughput metric is missing currentMeasure or targetMeasure." };
  }

  const primary = primaryRaw;

  // Secondary: any other metric on the activity with both measures present
  const secondary = activity.metricIds
    .filter((mid) => mid !== primary.id)
    .map((mid) => scaffold.elements.metrics[mid] as ScaffoldMetric | undefined)
    .find((m): m is ScaffoldMetric => m != null && m.currentMeasure != null && m.targetMeasure != null)
    ?? null;

  return { primary, secondary, unavailableReason: null };
}

// ─── Sub-components ────────────────────────────────────────────────

function ConfidenceDots({
  value,
  max = 4,
}: {
  value: number;
  max?: number;
}) {
  const filled = Math.round(value * max);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-full transition-colors ${
            i < filled ? "bg-amber-500" : "bg-gray-200"
          }`}
        />
      ))}
      <span className="ml-1.5 font-mono text-[10px] text-gray-500">
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function DeltaCard({
  label,
  value,
  unit,
  variant,
}: {
  label: string;
  value: number;
  unit: string;
  variant: "current" | "target" | "delta";
}) {
  const styles = {
    current: "border-gray-200 bg-white text-vcc-800",
    target: "border-gray-200 bg-white text-gray-500",
    delta: "border-amber-300 bg-amber-50 text-amber-700",
  };

  return (
    <div
      className={`flex-1 rounded-md border px-3 py-2.5 text-center ${styles[variant]}`}
    >
      <div className="font-mono text-[9px] uppercase tracking-widest text-gray-400">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold leading-none">
        {variant === "delta" ? "−" : ""}
        {value}
      </div>
      <div className="mt-1 font-mono text-[10px] text-gray-400">{unit}</div>
    </div>
  );
}

function ParamInput({
  label,
  value,
  onChange,
  suffix,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] text-gray-400">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-14 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-right font-mono text-xs text-vcc-800 outline-none focus:border-vcc-400 focus:ring-1 focus:ring-vcc-200"
      />
      {suffix && (
        <span className="font-mono text-[10px] text-gray-400">{suffix}</span>
      )}
    </div>
  );
}

function TrendDot({
  label,
  baseline,
  current,
  target,
  unit,
  worsening,
}: {
  label: string;
  baseline: number;
  current: number;
  target: number;
  unit: string;
  worsening: boolean;
}) {
  const min = Math.min(baseline, current, target) * 0.8;
  const max = Math.max(baseline, current, target) * 1.2;
  const range = max - min || 1;
  const pct = (v: number) => ((v - min) / range) * 100;

  return (
    <div className="mb-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] text-gray-400">{label}</span>
        <span
          className={`font-mono text-[9px] ${worsening ? "text-red-500" : "text-emerald-600"}`}
        >
          {worsening ? "▲ worsening" : "▼ improving"}
        </span>
      </div>
      <div className="relative mt-1 h-3 overflow-hidden rounded-sm bg-gray-100">
        {/* Target line */}
        <div
          className="absolute bottom-0 top-0 w-0.5 bg-amber-400/50"
          style={{ left: `${pct(target)}%` }}
        />
        {/* Baseline dot */}
        <div
          className="absolute top-1 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-gray-300"
          style={{ left: `${pct(baseline)}%` }}
        />
        {/* Current dot */}
        <div
          className={`absolute top-0.5 h-2 w-2 -translate-x-1/2 rounded-full border border-white shadow-sm ${
            worsening ? "bg-red-500" : "bg-emerald-500"
          }`}
          style={{ left: `${pct(current)}%` }}
        />
      </div>
      <div className="mt-0.5 flex justify-between font-mono text-[8px] text-gray-300">
        <span>
          base {baseline}
          {unit}
        </span>
        <span className={worsening ? "text-red-400" : "text-emerald-500"}>
          curr {current}
          {unit}
        </span>
        <span className="text-amber-500">
          tgt {target}
          {unit}
        </span>
      </div>
    </div>
  );
}

// ─── Main panel ────────────────────────────────────────────────────

export function ThroughputPanel({
  activityId,
  heatmap,
  scaffold,
  engagementParams: initialParams,
}: {
  activityId: string;
  heatmap: HeatmapData;
  scaffold: ScaffoldData;
  engagementParams?: Partial<EngagementParams>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [scenarioOverride, setScenarioOverride] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState<number | null>(null);

  // Engagement params — local UI state, editable
  const [entityVolume, setEntityVolume] = useState(
    initialParams?.entityVolume ?? 160,
  );
  const [assessmentFrequency, setAssessmentFrequency] = useState(
    initialParams?.assessmentFrequency ?? 1.0,
  );
  const [fteCapacityDays, setFteCapacityDays] = useState(
    initialParams?.fteCapacityDays ?? 60,
  );

  // Resolve metrics from the binding constraint activity
  const { primary, secondary, unavailableReason } = useMemo(
    () => resolveBindingMetrics(activityId, scaffold),
    [activityId, scaffold],
  );

  // Apply scenario override if active
  const effectivePrimary = useMemo(() => {
    if (!primary) return null;
    if (scenarioOverride && overrideTarget != null) {
      return { ...primary, targetMeasure: overrideTarget };
    }
    return primary;
  }, [primary, scenarioOverride, overrideTarget]);

  // Compute throughput impact
  const calc = useMemo(
    () =>
      computeThroughput(effectivePrimary, secondary, {
        entityVolume,
        assessmentFrequency,
        fteCapacityDays,
      }),
    [effectivePrimary, secondary, entityVolume, assessmentFrequency, fteCapacityDays],
  );

  const confidence = heatmap.bindingConstraint.confidence ?? 0;
  const activityName =
    scaffold.elements.activities[activityId]?.name ?? humanizeId(activityId);
  const hasData = effectivePrimary != null && effectivePrimary.currentMeasure != null && unavailableReason == null;

  // If no metric data or not designated, show a quiet unavailable notice
  if (!hasData) {
    return (
      <div className="border-t border-gray-100 px-4 py-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="font-mono text-[9px] uppercase tracking-widest text-gray-400">
            Throughput Impact
          </span>
          <svg
            className={`h-3 w-3 text-gray-300 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {expanded && (
          <p className="mt-2 text-[10px] leading-relaxed text-gray-400">
            Projection unavailable: {unavailableReason ?? "No metric measures available on this activity."}
          </p>
        )}
      </div>
    );
  }

  const primaryUnit = primary?.unit ?? "days";

  return (
    <div className="border-t border-gray-100">
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-widest text-gray-400">
            Throughput Impact
          </span>
          {!expanded && calc.daysReleasedPerQuarter > 0 && (
            <span className="rounded bg-amber-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-amber-700">
              {calc.daysReleasedPerQuarter} days/qtr
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!expanded && <ConfidenceDots value={confidence} />}
          <svg
            className={`h-3 w-3 text-gray-300 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="space-y-4 px-4 pb-4">
          {/* Sub-header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-[8px] uppercase tracking-widest text-amber-600">
                First-Order Structural Projection
              </p>
              <p className="mt-0.5 text-xs font-medium text-vcc-800">
                {activityName}
              </p>
            </div>
            <ConfidenceDots value={confidence} />
          </div>

          {/* Delta bar: Current → Target → Delta */}
          <div className="flex items-center gap-1.5">
            <DeltaCard
              label="Current"
              value={effectivePrimary!.currentMeasure!}
              unit={`${primaryUnit}/cycle`}
              variant="current"
            />
            <span className="font-mono text-xs text-gray-300">→</span>
            <DeltaCard
              label={scenarioOverride ? "Scenario" : "Target"}
              value={effectivePrimary!.targetMeasure!}
              unit={`${primaryUnit}/cycle`}
              variant="target"
            />
            <span className="font-mono text-xs text-gray-300">=</span>
            <DeltaCard
              label="Delta"
              value={calc.constraintDelta}
              unit={`${primaryUnit}/cycle`}
              variant="delta"
            />
          </div>

          {/* Scenario override toggle */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setScenarioOverride(!scenarioOverride);
                if (!scenarioOverride && overrideTarget == null && primary) {
                  setOverrideTarget(primary.targetMeasure ?? 0);
                }
              }}
              className={`flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[10px] transition-colors ${
                scenarioOverride
                  ? "bg-vcc-100 text-vcc-700"
                  : "text-gray-400 hover:bg-gray-50 hover:text-gray-500"
              }`}
            >
              <svg
                className={`h-3 w-3 ${scenarioOverride ? "text-vcc-600" : "text-gray-300"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              {scenarioOverride ? "Scenario active" : "Override target"}
            </button>
            {scenarioOverride && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-gray-400">Target:</span>
                <input
                  type="number"
                  value={overrideTarget ?? 0}
                  step={1}
                  min={0}
                  onChange={(e) => setOverrideTarget(Number(e.target.value) || 0)}
                  className="w-14 rounded border border-vcc-200 bg-vcc-50 px-2 py-1 text-right font-mono text-xs text-vcc-800 outline-none focus:border-vcc-400"
                />
                <span className="font-mono text-[10px] text-gray-400">{primaryUnit}</span>
                <button
                  onClick={() => {
                    setScenarioOverride(false);
                    setOverrideTarget(null);
                  }}
                  className="rounded p-0.5 text-gray-300 hover:bg-gray-100 hover:text-gray-500"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Worsening scenario warning */}
          {calc.isWorseningScenario && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5">
              <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <p className="text-[10px] leading-relaxed text-amber-800">
                Target is worse than current — no capacity is released under this scenario. Projections are zero-floored.
              </p>
            </div>
          )}

          {/* Engagement context — editable params */}
          <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
            <p className="mb-2 font-mono text-[8px] uppercase tracking-widest text-gray-400">
              Engagement Context
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <ParamInput
                label="Entities"
                value={entityVolume}
                onChange={setEntityVolume}
              />
              <ParamInput
                label="Cycles/yr"
                value={assessmentFrequency}
                onChange={setAssessmentFrequency}
                step={0.25}
              />
              <ParamInput
                label="FTE days/qtr"
                value={fteCapacityDays}
                onChange={setFteCapacityDays}
              />
            </div>
          </div>

          {/* Dual consequence modes */}
          <div className="grid grid-cols-2 gap-2">
            {/* Capacity Release */}
            <div className="rounded-md border border-emerald-200 bg-emerald-50/40 p-3">
              <p className="mb-2 font-mono text-[8px] uppercase tracking-widest text-emerald-700">
                Capacity Release
              </p>
              <p className="text-lg font-semibold leading-none text-vcc-800">
                {calc.daysReleasedPerQuarter}
                <span className="ml-1 text-xs font-normal text-gray-500">
                  {primaryUnit}/qtr
                </span>
              </p>
              <p className="mt-0.5 text-[10px] text-gray-500">
                supervisory days released
              </p>
              <p className="mt-2 text-sm font-semibold text-vcc-800">
                ≈ {calc.fteEquivalent}
                <span className="ml-1 text-xs font-normal text-gray-500">
                  FTEs
                </span>
              </p>
              <p className="mt-0.5 text-[10px] text-gray-500">
                equivalent capacity
              </p>
            </div>

            {/* Risk Compression */}
            <div className="rounded-md border border-red-200 bg-red-50/40 p-3">
              <p className="mb-2 font-mono text-[8px] uppercase tracking-widest text-red-700">
                Risk Compression
              </p>
              <p className="text-lg font-semibold leading-none text-vcc-800">
                −{calc.exposureReduction}
                <span className="ml-1 text-xs font-normal text-gray-500">
                  {primaryUnit}
                </span>
              </p>
              <p className="mt-0.5 text-[10px] text-gray-500">
                exposure window per entity per cycle
              </p>
              {calc.escalationReduction != null && (
                <>
                  <p className="mt-2 text-xs font-medium text-gray-500">
                    −{calc.escalationReduction}
                    <span className="ml-1 text-[10px] font-normal text-gray-400">
                      /qtr
                    </span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-gray-400">
                    executive escalation backlogs
                    <span className="ml-1 italic text-gray-300">
                      *conditional
                    </span>
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Consequence statement */}
          <div className="rounded-md border border-gray-200 bg-white p-3">
            <p className="mb-2 font-mono text-[8px] uppercase tracking-widest text-gray-400">
              Consequence
            </p>
            <p className="text-xs leading-relaxed text-gray-700">
              If the approval cycle time is reduced from{" "}
              {effectivePrimary!.currentMeasure} to {effectivePrimary!.targetMeasure}{" "}
              {primaryUnit}
              {scenarioOverride && (
                <span className="italic text-vcc-500"> (scenario)</span>
              )}
              , and current assessment volumes remain constant, the
              value stream has the potential to release approximately{" "}
              <strong className="text-emerald-700">
                {calc.daysReleasedPerQuarter} supervisory {primaryUnit} per
                quarter
              </strong>{" "}
              (≈{calc.fteEquivalent} FTEs). Under these assumptions, each
              entity's exposure window has the potential to reduce by{" "}
              <strong className="text-red-700">
                {calc.exposureReduction} {primaryUnit} per cycle
              </strong>
              .
            </p>
            {calc.escalationReduction != null && (
              <p className="mt-2 text-[10px] italic leading-relaxed text-gray-500">
                * Secondary: Achieving target escalation rate would reduce
                executive backlogs by ≈{calc.escalationReduction}/qtr. Requires
                escalation rate to reach target independently — see assumptions.
              </p>
            )}

            {/* Assumptions block — non-optional per posture */}
            <div className="mt-3 rounded border border-gray-100 bg-gray-50 p-2.5">
              <p className="mb-1.5 font-mono text-[8px] uppercase tracking-widest text-gray-400">
                Assumptions
              </p>
              <div className="space-y-0.5 font-mono text-[10px] leading-relaxed text-gray-500">
                <p>• {activityName} is sole throughput limiter</p>
                <p>• Occurs once per cycle per entity</p>
                <p>
                  • Assessment volumes remain constant ({entityVolume} entities,{" "}
                  {assessmentFrequency} cycles/yr)
                </p>
                <p>
                  • Downstream stages do not re-accumulate equivalent delay
                </p>
                {calc.escalationReduction != null && (
                  <p className="italic text-gray-400">
                    * Escalation rate reaches target independently (secondary
                    only)
                  </p>
                )}
              </div>
            </div>

            {/* Confidence footer */}
            <div className="mt-2.5 flex justify-between font-mono text-[9px] text-gray-400">
              <span>
                Structural inference confidence: {confidence.toFixed(2)}
              </span>
              <span>Operational validation: Not yet verified</span>
            </div>
          </div>

          {/* Trend lines */}
          {(primary?.baselineMeasure != null ||
            secondary?.baselineMeasure != null) && (
            <div>
              {primary?.baselineMeasure != null && (
                <TrendDot
                  label={primary.name ?? "Primary metric"}
                  baseline={primary.baselineMeasure}
                  current={primary.currentMeasure!}
                  target={primary.targetMeasure!}
                  unit={primaryUnit === "business days" ? "d" : primaryUnit}
                  worsening={false}
                />
              )}
              {secondary?.baselineMeasure != null &&
                secondary?.currentMeasure != null &&
                secondary?.targetMeasure != null && (
                  <TrendDot
                    label={secondary.name ?? "Secondary metric"}
                    baseline={secondary.baselineMeasure}
                    current={secondary.currentMeasure}
                    target={secondary.targetMeasure}
                    unit={secondary.unit ?? "%"}
                    worsening={
                      secondary.direction === "Decrease"
                        ? secondary.currentMeasure > secondary.baselineMeasure
                        : secondary.currentMeasure < secondary.baselineMeasure
                    }
                  />
                )}
            </div>
          )}

          {/* Footer disclaimer */}
          <p className="text-center font-mono text-[8px] leading-relaxed text-gray-300">
            Projections reflect structural inference based on current scaffold
            and heatmap. They are not forecasts.
          </p>
        </div>
      )}
    </div>
  );
}
