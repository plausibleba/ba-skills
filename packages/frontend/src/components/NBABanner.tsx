/**
 * NBABanner — Floating Next-Best-Action prompt for canvas views.
 *
 * Renders a compact, dismissible banner in the top-right corner of any
 * visualisation view (Capability Map, Value Stream Canvas, Friction Heatmap).
 * Shows contextually relevant actions:
 *   - Standard NBA recommendation when next enrichment/diagnostic is available
 *   - Stale diagnostic warning when current view has outdated overlays
 *
 * The banner reads from the D-118 store and is designed to be unobtrusive:
 * compact size, backdrop blur, dismissible, and only appears when there's
 * a meaningful action to suggest.
 *
 * @see docs/DECISIONS.md D-118a — NBA across visualisations
 * @see ux-prototype-enrichment-v3.html Tab 2 for visual reference
 */

import { useState, useMemo, useCallback } from "react";
import { useCanvasStore } from "../store/canvas-store";
import { useEnrichmentStore } from "../store/enrichment-store";
import { useD118Store } from "../store/d118-store";
import { tv } from "../theme";
import { OPERATIONS_BY_ID } from "../domain/enrichment-taxonomy";

// ─── Icon map for operations (matches prototype) ──────────────────────────

const OP_ICONS: Record<string, string> = {
  ppit: "🧩",
  cards: "🃏",
  subactivities: "🔀",
  "cross-mapping": "🔄",
  metrics: "📊",
  friction: "⚡",
  dependencies: "🔗",
  maturity: "📈",
  "gap-analysis": "🎯",
  risk: "🛡️",
  "strategic-alignment": "🧭",
  "initiative-impact": "🚀",
  compliance: "📋",
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface NBABannerProps {
  /**
   * If set, the banner will check for stale diagnostics relevant to this view
   * and show a stale warning instead of the standard NBA recommendation.
   * E.g., "friction" when on the Friction Heatmap view.
   */
  staleDiagnosticId?: string;
  /** CSS position overrides (default: top-right) */
  style?: React.CSSProperties;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function NBABanner({ staleDiagnosticId, style }: NBABannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const completedThisSession = useEnrichmentStore((s) => s.completedThisSession);
  const goToEnrich = useCanvasStore((s) => s.goToEnrich);

  // D-118 store
  const getNBA = useD118Store((s) => s.getNBA);
  const diagnosticArtefacts = useD118Store((s) => s.diagnosticArtefacts);
  const getStalenessDelta = useD118Store((s) => s.getStalenessDelta);

  // Check for stale diagnostic relevant to current view
  const staleDiagnostic = staleDiagnosticId
    ? diagnosticArtefacts[staleDiagnosticId]
    : null;
  const isStale = staleDiagnostic?.stale === true;

  // Compute NBA
  const nba = useMemo(
    () => getNBA(completedThisSession),
    [getNBA, completedThisSession]
  );

  const stalenessDelta = useMemo(
    () => (staleDiagnosticId && isStale ? getStalenessDelta(staleDiagnosticId) : null),
    [staleDiagnosticId, isStale, getStalenessDelta]
  );

  const handleGo = useCallback(() => {
    goToEnrich(null);
  }, [goToEnrich]);

  // Don't render if dismissed, or if there's nothing to show
  if (dismissed) return null;
  if (!isStale && !nba.recommended) return null;

  // ── Stale diagnostic banner ──
  if (isStale && staleDiagnostic) {
    const opDef = OPERATIONS_BY_ID[staleDiagnosticId!];
    const icon = OP_ICONS[staleDiagnosticId!] ?? "⚠️";
    const deltaText = stalenessDelta?.summary ?? "Model has changed since this was run.";

    return (
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 14px",
          borderRadius: 10,
          background: "rgba(26, 28, 37, 0.95)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          zIndex: 20,
          maxWidth: 400,
          animation: "nba-slide-in 0.3s ease-out",
          ...style,
        }}
      >
        <button
          onClick={() => setDismissed(true)}
          style={{
            position: "absolute",
            top: 4,
            right: 6,
            background: "none",
            border: "none",
            color: tv.textDim,
            fontSize: 12,
            cursor: "pointer",
            padding: 2,
            lineHeight: 1,
          }}
        >
          ×
        </button>
        <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              color: "#f59e0b",
            }}
          >
            Stale Diagnostic
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: tv.textPrimary }}>
            {opDef?.label ?? "Diagnostic"} is outdated
          </div>
          <div style={{ fontSize: 10, color: tv.textDim }}>{deltaText}</div>
        </div>
        <button
          onClick={handleGo}
          style={{
            padding: "5px 12px",
            borderRadius: 6,
            border: "none",
            background: "#f59e0b",
            color: "#fff",
            fontSize: 10,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Re-run
        </button>
      </div>
    );
  }

  // ── Standard NBA recommendation banner ──
  const rec = nba.recommended!;
  const icon = OP_ICONS[rec.operation.id] ?? "✨";
  const downstream = nba.allOperations.filter(
    (s) =>
      s.operation.dependencies.some((d) => d.operationId === rec.operation.id) &&
      s.availability !== "completed" &&
      s.availability !== "not-implemented"
  ).length;
  const advancesTo = rec.operation.advancesTo;

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px",
        borderRadius: 10,
        background: "rgba(26, 28, 37, 0.95)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(99, 102, 241, 0.25)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        zIndex: 20,
        maxWidth: 380,
        animation: "nba-slide-in 0.3s ease-out",
        ...style,
      }}
    >
      <button
        onClick={() => setDismissed(true)}
        style={{
          position: "absolute",
          top: 4,
          right: 6,
          background: "none",
          border: "none",
          color: tv.textDim,
          fontSize: 12,
          cursor: "pointer",
          padding: 2,
          lineHeight: 1,
        }}
      >
        ×
      </button>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            color: tv.accent,
          }}
        >
          Suggested Next
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: tv.textPrimary }}>
          {rec.operation.label}
        </div>
        <div style={{ fontSize: 10, color: tv.textDim }}>
          {downstream > 0 && `Unlocks ${downstream} operation${downstream !== 1 ? "s" : ""}`}
          {downstream > 0 && advancesTo && " · "}
          {advancesTo && `Advances to ${advancesTo.charAt(0).toUpperCase() + advancesTo.slice(1)}`}
        </div>
      </div>
      <button
        onClick={handleGo}
        style={{
          padding: "5px 12px",
          borderRadius: 6,
          border: "none",
          background: tv.accent,
          color: "#fff",
          fontSize: 10,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Go
      </button>
    </div>
  );
}
