/**
 * EnrichmentView — Dedicated page for iteratively enriching a loaded model.
 *
 * D-118 refactoring: 2-zone layout (Enrichments / Diagnostics) with integrated:
 *   - ReadinessStepper: progressive readiness journey (Skeleton → Grounded → Detailed → Assessed → Governed)
 *   - NBACard: recommended next action
 *   - ExternalInputsPanel: all 8 external input types with provenance badges
 *   - Enrichments Zone: ppit, cards, subactivities, cross-mapping, metrics
 *   - Diagnostics Zone: friction, dependencies, maturity, gap-analysis, risk, strategic-alignment, initiative-impact, compliance
 *   - Custom Enrichments: user-editable skills
 *   - Cross-Mapping Builder: within enrichments zone
 *   - Friction Workspace Toggle: within diagnostics zone
 *
 * @see docs/DECISIONS.md D-118, D-118a
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";
import { useEnrichmentStore } from "../store/enrichment-store.ts";
import { useD118Store, useReadiness, useReadinessHint, useExternalInputsByType } from "../store/d118-store.ts";
import { tv } from "../theme.ts";
import {
  ENRICHMENT_CARDS,
  SectionHeader,
  EnrichmentCard,
  useEnrichmentActions,
  MAPPABLE_ENTITIES,
  CARDINALITY_OPTIONS,
  TARGET_LABELS,
} from "./enrichment/shared.tsx";
import type {
  MappingPair,
  MappingSemantics,
  MappableEntity,
  CustomSkill,
} from "./enrichment/shared.tsx";
import {
  OPERATIONS_BY_ID,
  ENRICHMENT_OPS,
  DIAGNOSTIC_OPS,
  READINESS_ORDER,
  READINESS_LABELS,
  READINESS_DESCRIPTIONS,
  EXTERNAL_INPUT_LABELS,
  EXTERNAL_INPUT_ICONS,
  isGenerable,
} from "../domain/enrichment-taxonomy.ts";
import type { ExternalInputType, InputProvenance, ReadinessState } from "../domain/enrichment-taxonomy.ts";
import WaitPuzzle from "./WaitPuzzle";
import { FrictionView } from "./FrictionView";

// ─── Component: ReadinessStepper ─────────────────────────────────────────────

interface ReadinessStepperProps {
  currentReadiness: ReadinessState | null;
  nextHint: string | null;
}

function ReadinessStepper({ currentReadiness, nextHint }: ReadinessStepperProps) {
  const currentIndex = currentReadiness ? READINESS_ORDER.indexOf(currentReadiness) : -1;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 0,
      padding: "12px 16px",
      backgroundColor: tv.bgCard,
      border: `1px solid ${tv.borderSubtle}`,
      borderRadius: "10px",
    }}>
      {/* Stepper Pills with Dots & Connectors */}
      {READINESS_ORDER.map((state, idx) => {
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isFuture = idx > currentIndex;

        return (
          <div key={state} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Dot */}
            <div style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: isCurrent ? tv.accent : isCompleted ? "#10b981" : tv.textDim,
              flexShrink: 0,
              boxShadow: isCurrent ? `0 0 8px rgba(99,102,241,0.4)` : "none",
            }} />

            {/* Step Label Pill */}
            <div
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: "600",
                textTransform: "uppercase",
                backgroundColor: isCurrent ? "rgba(99,102,241,0.12)" : "transparent",
                color: isCurrent ? tv.accent : isCompleted ? "#10b981" : isFuture ? tv.textDim : tv.textDim,
                transition: "all 0.2s ease",
                cursor: "pointer",
                border: isCurrent ? "1px solid rgba(99,102,241,0.25)" : "none",
                opacity: isFuture ? 0.5 : 1,
              }}
            >
              {isCompleted ? "✓ " : ""}{READINESS_LABELS[state]}
            </div>

            {/* Connector */}
            {idx < READINESS_ORDER.length - 1 && (
              <div style={{
                width: "20px",
                height: "2px",
                backgroundColor: isCompleted ? "#10b981" : tv.borderSubtle,
                flexShrink: 0,
              }} />
            )}
          </div>
        );
      })}

      {/* Readiness Hint on the right */}
      {nextHint && currentIndex >= 0 && currentIndex < READINESS_ORDER.length - 1 && (
        <div style={{
          marginLeft: "auto",
          fontSize: "11px",
          color: tv.textSecondary,
          paddingLeft: "16px",
          maxWidth: "300px",
          textAlign: "right",
        }}>
          <strong style={{ color: tv.accent }}>Next:</strong> {nextHint}
        </div>
      )}
    </div>
  );
}

// ─── Component: NBACard ──────────────────────────────────────────────────────

interface NBACardProps {
  recommendation: any | null;
  onGo: (operationId: string) => void;
  isDisabled: boolean;
}

function NBACard({ recommendation, onGo, isDisabled }: NBACardProps) {
  if (!recommendation) return null;

  const opDef = OPERATIONS_BY_ID[recommendation.operationId];
  if (!opDef) return null;

  // Find the card def for icon
  const cardDef = ENRICHMENT_CARDS.find((c) => c.id === recommendation.operationId);
  const icon = cardDef?.icon || "→";

  return (
    <div style={{
      marginBottom: "24px",
      padding: "16px 20px",
      background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.06))",
      border: "1px solid rgba(99,102,241,0.2)",
      borderRadius: "12px",
      display: "flex",
      alignItems: "center",
      gap: "16px",
    }}>
      <div style={{
        fontSize: "28px",
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: "10px",
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: "1px",
          color: tv.accent,
          marginBottom: "2px",
        }}>
          Recommended Next Action
        </div>
        <div style={{
          fontSize: "14px",
          fontWeight: "700",
          color: tv.textPrimary,
          marginBottom: "4px",
        }}>
          {opDef.label}
        </div>
        <div style={{
          fontSize: "11px",
          color: tv.textSecondary,
        }}>
          {recommendation.why || "This operation will help progress your model."}
        </div>
      </div>
      <button
        onClick={() => onGo(recommendation.operationId)}
        disabled={isDisabled}
        style={{
          padding: "8px 20px",
          backgroundColor: tv.accent,
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: isDisabled ? "not-allowed" : "pointer",
          fontSize: "12px",
          fontWeight: "600",
          opacity: isDisabled ? 0.5 : 1,
          whiteSpace: "nowrap",
          transition: "all 0.15s ease",
          filter: isDisabled ? "none" : "brightness(1.15)",
        }}
        onMouseEnter={(e) => !isDisabled && (e.currentTarget.style.filter = "brightness(1.15) translateY(-1px)")}
        onMouseLeave={(e) => !isDisabled && (e.currentTarget.style.filter = "brightness(1.15)")}
      >
        Go
      </button>
    </div>
  );
}

// ─── Component: ExternalInputsPanel ─────────────────────────────────────────

interface ExternalInputsPanelProps {
  inputs: Record<ExternalInputType, any>;
  onGenerate: (type: ExternalInputType) => void;
  onViewAll: () => void;
  isGenerating: boolean;
}

function ExternalInputsPanel({
  inputs,
  onGenerate,
  onViewAll,
  isGenerating,
}: ExternalInputsPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  const inputTypes: ExternalInputType[] = [
    "swot",
    "strategic-plan",
    "initiative-charter",
    "risk-register",
    "regulatory-framework",
    "metrics-library",
    "maturity-assessment",
    "custom",
  ];

  // Count provided and generated inputs
  const providedCount = inputTypes.filter(type => {
    const inp = inputs[type];
    return inp && inp.provenance === "provided";
  }).length;

  const generatedCount = inputTypes.filter(type => {
    const inp = inputs[type];
    return inp && inp.provenance === "generated";
  }).length;

  return (
    <div style={{
      marginBottom: "24px",
      border: `1px solid ${tv.borderSubtle}`,
      borderRadius: "10px",
      overflow: "hidden",
    }}>
      {/* Header with toggle */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          backgroundColor: tv.bgCard,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            fontSize: "12px",
            fontWeight: "600",
            color: tv.textPrimary,
          }}>
            External Inputs
          </div>
          {providedCount > 0 && (
            <div style={{
              fontSize: "10px",
              fontWeight: "600",
              padding: "2px 8px",
              borderRadius: "10px",
              backgroundColor: "rgba(16,185,129,0.12)",
              color: "#10b981",
            }}>
              {providedCount}
            </div>
          )}
          {generatedCount > 0 && (
            <div style={{
              fontSize: "10px",
              fontWeight: "600",
              padding: "2px 8px",
              borderRadius: "10px",
              backgroundColor: "rgba(20,184,166,0.12)",
              color: "#14b8a6",
            }}>
              {generatedCount}
            </div>
          )}
        </div>
        <div style={{
          fontSize: "12px",
          color: tv.textDim,
          transition: "transform 0.2s ease",
          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
        }}>
          ▼
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <div style={{
          padding: "12px 16px",
          backgroundColor: tv.bgSurface,
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "8px",
            marginBottom: "10px",
          }}>
            {inputTypes.map((type) => {
              const inputArtefact = inputs[type] ?? null;
              const hasInput = inputArtefact !== null;
              const canGenerate = isGenerable(type);
              const provenance: InputProvenance | null = hasInput ? inputArtefact.provenance : null;

              const icon = EXTERNAL_INPUT_ICONS[type] || "📋";
              const label = EXTERNAL_INPUT_LABELS[type] || type;

              return (
                <div
                  key={type}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 12px",
                    backgroundColor: tv.bgCard,
                    border: `1px solid ${tv.borderSubtle}`,
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    borderColor: provenance === "provided" ? "rgba(16,185,129,0.3)" : provenance === "generated" ? "rgba(20,184,166,0.3)" : tv.borderSubtle,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = tv.borderDefault;
                    e.currentTarget.style.backgroundColor = tv.bgCardHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = provenance === "provided" ? "rgba(16,185,129,0.3)" : provenance === "generated" ? "rgba(20,184,166,0.3)" : tv.borderSubtle;
                    e.currentTarget.style.backgroundColor = tv.bgCard;
                  }}
                >
                  {/* Icon */}
                  <div style={{ fontSize: "16px", flexShrink: 0 }}>{icon}</div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: tv.textPrimary,
                    }}>
                      {label}
                    </div>
                    {hasInput && provenance && (
                      <div style={{
                        fontSize: "10px",
                        color: provenance === "provided" ? "#10b981" : "#14b8a6",
                      }}>
                        {provenance === "provided" ? "✓ Provided" : "⚡ Generated"}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                    {canGenerate && !hasInput && (
                      <button
                        onClick={() => onGenerate(type)}
                        disabled={isGenerating}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          border: "1px dashed rgba(20,184,166,0.4)",
                          background: "transparent",
                          color: "#14b8a6",
                          fontSize: "10px",
                          fontWeight: "600",
                          cursor: isGenerating ? "not-allowed" : "pointer",
                          transition: "all 0.15s ease",
                          opacity: isGenerating ? 0.5 : 1,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(20,184,166,0.12)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        Generate
                      </button>
                    )}
                    {hasInput && (
                      <button
                        onClick={() => {/* stub */}}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          border: `1px dashed ${tv.borderDefault}`,
                          background: "transparent",
                          color: tv.textDim,
                          fontSize: "10px",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = tv.accent;
                          e.currentTarget.style.color = tv.accent;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = tv.borderDefault;
                          e.currentTarget.style.color = tv.textDim;
                        }}
                      >
                        Upload
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={onViewAll}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 14px",
              borderRadius: "7px",
              border: `1px solid ${tv.borderDefault}`,
              background: "transparent",
              color: tv.textSecondary,
              fontSize: "11px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = tv.accent;
              e.currentTarget.style.color = tv.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = tv.borderDefault;
              e.currentTarget.style.color = tv.textSecondary;
            }}
          >
            View All →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Component: EnrichmentView ──────────────────────────────────────────────

export function EnrichmentView() {
  const canvasStore = useCanvasStore();
  const enrichmentStore = useEnrichmentStore();
  const d118Store = useD118Store();

  const { runBuiltIn, revertEnrichment, navigateTo, commitReview, viewImpact, getStatus } = useEnrichmentActions();

  // Modal state
  const [showMappingEditor, setShowMappingEditor] = useState(false);
  const [selectedMappingPair, setSelectedMappingPair] = useState<MappingPair | null>(null);
  const [showFrictionWorkspace, setShowFrictionWorkspace] = useState(false);
  const [showCustomSkillEditor, setShowCustomSkillEditor] = useState(false);
  const [selectedCustomSkill, setSelectedCustomSkill] = useState<CustomSkill | null>(null);

  // Diagnostic artefacts for staleness checks
  const diagnosticArtefacts = useD118Store((s) => s.diagnosticArtefacts);

  // Initialize store hashes on mount / scaffold change.
  // Deferred via setTimeout to avoid Zustand's synchronous subscriber
  // notification triggering React re-renders mid-effect (React #185).
  useEffect(() => {
    const t = setTimeout(() => d118Store.refreshScaffoldHash(), 0);
    return () => clearTimeout(t);
  }, [d118Store, canvasStore.scaffoldData]);

  // Compute readiness (convenience hooks from d118-store)
  const currentReadiness = useReadiness();
  const readinessHintText = useReadinessHint();

  // Get NBA recommendation
  const nbaRecommendation = useMemo(
    () => d118Store.getNBA(enrichmentStore.completedThisSession),
    [d118Store, enrichmentStore.completedThisSession],
  );

  // Next hint with descriptions
  const nextHint = useMemo(() => {
    if (!currentReadiness) return readinessHintText;
    const currentIdx = READINESS_ORDER.indexOf(currentReadiness);
    if (currentIdx >= 0 && currentIdx < READINESS_ORDER.length - 1) {
      const nextState = READINESS_ORDER[currentIdx + 1];
      return READINESS_DESCRIPTIONS[nextState];
    }
    return null;
  }, [currentReadiness, readinessHintText]);

  // Get external inputs by type (hook, not a store method)
  const externalInputsByType = useExternalInputsByType();

  // Divide operations by type
  const enrichmentOpIds = useMemo(() => new Set(ENRICHMENT_OPS.map((op) => op.id)), []);
  const diagnosticOpIds = useMemo(() => new Set(DIAGNOSTIC_OPS.map((op) => op.id)), []);

  const enrichmentCards = useMemo(
    () => ENRICHMENT_CARDS.filter((c) => enrichmentOpIds.has(c.id)),
    [enrichmentOpIds],
  );

  const diagnosticCards = useMemo(
    () => ENRICHMENT_CARDS.filter((c) => diagnosticOpIds.has(c.id)),
    [diagnosticOpIds],
  );

  // Handle operation execution with D-118 availability check
  const handleRunOperation = useCallback(
    async (cardId: string) => {
      const card = ENRICHMENT_CARDS.find((c) => c.id === cardId);
      if (!card) return;

      if (card.enrichmentStep) {
        await runBuiltIn(card);
      } else if (card.customUI) {
        // Handle custom UI cards
        if (cardId === "cross-mapping") {
          setShowMappingEditor(true);
        } else if (cardId === "friction") {
          setShowFrictionWorkspace(true);
        }
      } else if (card.navigateTo) {
        navigateTo(card.navigateTo);
      }
    },
    [runBuiltIn, navigateTo],
  );

  // Handle NBA Go button
  const handleNBAGo = useCallback(
    (operationId: string) => {
      handleRunOperation(operationId);
    },
    [handleRunOperation],
  );

  const modelName = canvasStore.scaffoldData?.name || "Model";

  return (
    <div style={{ minHeight: "100%", backgroundColor: tv.bgPrimary }}>
    <div style={{ maxWidth: "920px", margin: "0 auto", padding: "24px" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{
          fontSize: "10px",
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: "1.2px",
          color: tv.textDim,
          marginBottom: "4px",
        }}>
          Model Management
        </div>
        <h1 style={{
          fontSize: "18px",
          fontWeight: "700",
          color: tv.textPrimary,
          marginBottom: "4px",
        }}>
          Model Enrichment
        </h1>
        <p style={{
          fontSize: "12px",
          color: tv.textSecondary,
          lineHeight: 1.6,
          maxWidth: "700px",
        }}>
          {modelName} — Progressively enrich your operating model from skeleton to governed
        </p>
      </div>

      {/* Readiness Stepper */}
      <div style={{ marginBottom: "24px" }}>
        <ReadinessStepper currentReadiness={currentReadiness} nextHint={nextHint ?? readinessHintText} />
      </div>

      {/* NBA Recommendation */}
      <NBACard
        recommendation={nbaRecommendation}
        onGo={handleNBAGo}
        isDisabled={enrichmentStore.running !== null}
      />

      {/* External Inputs Panel */}
      <ExternalInputsPanel
        inputs={externalInputsByType}
        onGenerate={(type) => {
          // Stub: will trigger generation
          console.log("Generate", type);
        }}
        onViewAll={() => {
          // Stub: will open detail modal
          console.log("View all inputs");
        }}
        isGenerating={false}
      />

      {/* Enrichments Zone */}
      <div style={{ marginBottom: "48px" }}>
        <SectionHeader
          title="Enrichments"
          subtitle="Operations that structurally enhance your model"
        />

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "24px",
          marginBottom: "32px",
        }}>
          {enrichmentCards.map((card) => {
            const status = getStatus(card);

            return (
              <EnrichmentCard
                key={card.id}
                card={card}
                status={status}
                onRun={() => handleRunOperation(card.id)}
                onNavigate={() => card.navigateTo && navigateTo(card.navigateTo)}
                disabled={!!enrichmentStore.running}
                userContent={enrichmentStore.userContentByCard[card.id]}
                onUserContentChange={(patch) => enrichmentStore.updateUserContent(card.id, patch)}
                canRevert={enrichmentStore.snapshots.some((s) => s.cardId === card.id)}
                revertConfirmActive={enrichmentStore.revertConfirm === card.id}
                onRevertRequest={() => enrichmentStore.setRevertConfirm(card.id)}
                onRevertConfirm={() => revertEnrichment(card.id)}
                onRevertCancel={() => enrichmentStore.setRevertConfirm(null)}
                reviewResult={enrichmentStore.reviewResults.find((r) => r.cardId === card.id)}
                onCommitReview={() => commitReview(card.id)}
                onViewImpact={() => viewImpact(card.id)}
              />
            );
          })}
        </div>

        {/* Cross-Mapping Builder (within enrichments) */}
        {showMappingEditor && (
          <div style={{
            padding: "24px",
            backgroundColor: tv.bgCard,
            border: `1px solid ${tv.borderSubtle}`,
            borderRadius: "10px",
            marginBottom: "32px",
          }}>
            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px", color: tv.textPrimary }}>
              Cross-Map Relationships
            </h3>
            <CrossMappingBuilder
              onClose={() => setShowMappingEditor(false)}
              selectedPair={selectedMappingPair}
              onSelectPair={setSelectedMappingPair}
            />
          </div>
        )}
      </div>

      {/* Diagnostics Zone */}
      <div style={{ marginBottom: "48px" }}>
        <SectionHeader
          title="Diagnostics"
          subtitle="Analytical observations that reference your current model state"
        />

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "24px",
          marginBottom: "32px",
        }}>
          {diagnosticCards.map((card) => {
            const diagnostic = diagnosticArtefacts[card.id];
            const isStale = diagnostic?.stale === true;
            const baseStatus = getStatus(card);
            const status = isStale ? "done" as const : baseStatus;

            return (
              <div
                key={card.id}
                style={{
                  opacity: isStale ? 0.55 : 1,
                  filter: isStale ? "saturate(0.3)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <EnrichmentCard
                  card={card}
                  status={status}
                  onRun={() => handleRunOperation(card.id)}
                  onNavigate={() => card.navigateTo && navigateTo(card.navigateTo)}
                  disabled={!!enrichmentStore.running}
                  userContent={enrichmentStore.userContentByCard[card.id]}
                  onUserContentChange={(patch) => enrichmentStore.updateUserContent(card.id, patch)}
                  canRevert={enrichmentStore.snapshots.some((s) => s.cardId === card.id)}
                  revertConfirmActive={enrichmentStore.revertConfirm === card.id}
                  onRevertRequest={() => enrichmentStore.setRevertConfirm(card.id)}
                  onRevertConfirm={() => revertEnrichment(card.id)}
                  onRevertCancel={() => enrichmentStore.setRevertConfirm(null)}
                  reviewResult={enrichmentStore.reviewResults.find((r) => r.cardId === card.id)}
                  onCommitReview={() => commitReview(card.id)}
                  onViewImpact={() => viewImpact(card.id)}
                />

                {/* Staleness Banner */}
                {isStale && diagnostic && (
                  <div style={{
                    padding: "8px 12px",
                    background: "rgba(245, 158, 11, 0.08)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    borderTop: "2px solid #f59e0b",
                    borderRadius: "0 0 8px 8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    marginTop: -1,
                  }}>
                    <div style={{ fontSize: 11, color: "#92400e" }}>
                      <strong>Stale</strong> — Model changed since this was run.{" "}
                      {diagnostic.stalenessDelta && (
                        <span style={{ color: "#b45309" }}>{diagnostic.stalenessDelta.summary}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRunOperation(card.id)}
                      style={{
                        padding: "4px 12px",
                        background: "#f59e0b",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 10,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Re-run
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Friction Workspace Toggle (within diagnostics) */}
        {showFrictionWorkspace && (
          <div style={{
            padding: "24px",
            backgroundColor: tv.bgCard,
            border: `1px solid ${tv.borderSubtle}`,
            borderRadius: "10px",
            marginBottom: "32px",
          }}>
            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px", color: tv.textPrimary }}>
              Friction Analysis Workspace
            </h3>
            <FrictionView />
            <button
              onClick={() => setShowFrictionWorkspace(false)}
              style={{
                marginTop: "16px",
                padding: "10px 16px",
                backgroundColor: tv.bgPrimary,
                color: tv.textPrimary,
                border: `1px solid ${tv.borderSubtle}`,
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              Close Workspace
            </button>
          </div>
        )}
      </div>

      {/* Custom Enrichments */}
      <div style={{ marginBottom: "48px" }}>
        <SectionHeader
          title="Custom Enrichments"
          subtitle="User-defined skills that apply custom prompts to your model"
        />

        <CustomSkillsManager
          skills={enrichmentStore.customSkills || []}
          onEditSkill={(skill) => {
            setSelectedCustomSkill(skill);
            setShowCustomSkillEditor(true);
          }}
          onNewSkill={() => {
            setSelectedCustomSkill(null);
            setShowCustomSkillEditor(true);
          }}
          onRunSkill={(skillId) => {
            // Stub: will execute custom skill
            console.log("Run skill", skillId);
          }}
          isRunning={enrichmentStore.running !== null}
        />
      </div>

      {/* Modals */}
      {showCustomSkillEditor && (
        <SkillEditorModal
          skill={selectedCustomSkill}
          onSave={(skill) => {
            enrichmentStore.saveCustomSkill(skill);
            setShowCustomSkillEditor(false);
            setSelectedCustomSkill(null);
          }}
          onDelete={(skillId) => {
            enrichmentStore.deleteCustomSkill(skillId);
            setShowCustomSkillEditor(false);
            setSelectedCustomSkill(null);
          }}
          onClose={() => {
            setShowCustomSkillEditor(false);
            setSelectedCustomSkill(null);
          }}
        />
      )}

      {/* Running indicator */}
      {enrichmentStore.running && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
        }}>
          <WaitPuzzle step={enrichmentStore.running} />
        </div>
      )}
    </div>
    </div>
  );
}

// ─── Component: CrossMappingBuilder ──────────────────────────────────────────

interface CrossMappingBuilderProps {
  onClose: () => void;
  selectedPair: MappingPair | null;
  onSelectPair: (pair: MappingPair | null) => void;
}

function CrossMappingBuilder({
  onClose,
  selectedPair,
  onSelectPair,
}: CrossMappingBuilderProps) {
  const enrichmentStore = useEnrichmentStore();
  const [pairs, setPairs] = useState<MappingPair[]>(enrichmentStore.mappingPairs || []);
  const [_isEditing, setIsEditing] = useState(selectedPair !== null);

  const handleAddPair = useCallback(() => {
    const newPair: MappingPair = {
      id: Math.random().toString(36).substring(7),
      relationshipTypeId: "technology-supports-capability",
      from: "capabilities",
      to: "technology",
      includeInverse: true,
      semantics: {
        symmetrical: false,
        functional: false,
        transitive: false,
        cardinality: "many-to-many",
      },
    };
    setPairs([...pairs, newPair]);
    onSelectPair(newPair);
    setIsEditing(true);
  }, [pairs, onSelectPair]);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <button
          onClick={handleAddPair}
          style={{
            padding: "0.625rem 1rem",
            backgroundColor: tv.accent,
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: "500",
          }}
        >
          + Add Mapping Pair
        </button>
      </div>

      {pairs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: tv.textSecondary }}>
          No mapping pairs yet. Create one to define relationships between elements.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {pairs.map((pair) => (
            <MappingPairRow
              key={pair.id}
              pair={pair}
              isSelected={selectedPair?.id === pair.id}
              onSelect={() => onSelectPair(pair)}
              onUpdate={(updated) => {
                setPairs(pairs.map((p) => (p.id === updated.id ? updated : p)));
              }}
              onDelete={() => {
                setPairs(pairs.filter((p) => p.id !== pair.id));
                if (selectedPair?.id === pair.id) {
                  onSelectPair(null);
                }
              }}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: "1.5rem" }}>
        <button
          onClick={onClose}
          style={{
            padding: "0.625rem 1rem",
            backgroundColor: tv.bgPrimary,
            color: tv.textPrimary,
            border: `1px solid ${tv.borderSubtle}`,
            borderRadius: "0.375rem",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: "500",
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ─── Component: MappingPairRow ──────────────────────────────────────────────

interface MappingPairRowProps {
  pair: MappingPair;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (pair: MappingPair) => void;
  onDelete: () => void;
}

function MappingPairRow({
  pair,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}: MappingPairRowProps) {
  return (
    <div
      onClick={onSelect}
      style={{
        padding: "1rem",
        backgroundColor: isSelected ? tv.bgPrimary : tv.bgCard,
        borderRadius: "0.375rem",
        border: `1px solid ${isSelected ? tv.accent : tv.borderSubtle}`,
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "0.75rem",
      }}>
        <div style={{
          fontSize: "0.875rem",
          fontWeight: "500",
          color: tv.textPrimary,
        }}>
          {MAPPABLE_ENTITIES.find((e) => e.value === pair.from)?.label} →{" "}
          {MAPPABLE_ENTITIES.find((e) => e.value === pair.to)?.label}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            padding: "0.25rem 0.5rem",
            backgroundColor: "transparent",
            color: tv.textSecondary,
            border: "none",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          ✕
        </button>
      </div>

      {isSelected && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "1rem",
          paddingTop: "0.75rem",
          borderTopColor: tv.borderSubtle,
          borderTopWidth: "1px",
        }}>
          <div>
            <label style={{
              display: "block",
              fontSize: "0.75rem",
              fontWeight: "600",
              marginBottom: "0.5rem",
              color: tv.textSecondary,
            }}>
              From
            </label>
            <select
              value={pair.from}
              onChange={(e) => {
                onUpdate({
                  ...pair,
                  from: e.target.value as MappableEntity,
                });
              }}
              style={{
                width: "100%",
                padding: "0.5rem",
                backgroundColor: tv.bgCard,
                color: tv.textPrimary,
                border: `1px solid ${tv.borderSubtle}`,
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
              }}
            >
              {MAPPABLE_ENTITIES.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{
              display: "block",
              fontSize: "0.75rem",
              fontWeight: "600",
              marginBottom: "0.5rem",
              color: tv.textSecondary,
            }}>
              To
            </label>
            <select
              value={pair.to}
              onChange={(e) => {
                onUpdate({
                  ...pair,
                  to: e.target.value as MappableEntity,
                });
              }}
              style={{
                width: "100%",
                padding: "0.5rem",
                backgroundColor: tv.bgCard,
                color: tv.textPrimary,
                border: `1px solid ${tv.borderSubtle}`,
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
              }}
            >
              {MAPPABLE_ENTITIES.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{
              display: "block",
              fontSize: "0.75rem",
              fontWeight: "600",
              marginBottom: "0.5rem",
              color: tv.textSecondary,
            }}>
              Cardinality
            </label>
            <select
              value={pair.semantics.cardinality}
              onChange={(e) => {
                onUpdate({
                  ...pair,
                  semantics: {
                    ...pair.semantics,
                    cardinality: e.target.value as MappingSemantics["cardinality"],
                  },
                });
              }}
              style={{
                width: "100%",
                padding: "0.5rem",
                backgroundColor: tv.bgCard,
                color: tv.textPrimary,
                border: `1px solid ${tv.borderSubtle}`,
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
              }}
            >
              {CARDINALITY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.875rem",
              marginTop: "1.5rem",
              cursor: "pointer",
            }}>
              <input
                type="checkbox"
                checked={pair.includeInverse}
                onChange={(e) => {
                  onUpdate({
                    ...pair,
                    includeInverse: e.target.checked,
                  });
                }}
              />
              Include inverse mapping
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Component: CustomSkillsManager ──────────────────────────────────────────

interface CustomSkillsManagerProps {
  skills: CustomSkill[];
  onEditSkill: (skill: CustomSkill) => void;
  onNewSkill: () => void;
  onRunSkill: (skillId: string) => void;
  isRunning: boolean;
}

function CustomSkillsManager({
  skills,
  onEditSkill,
  onNewSkill,
  onRunSkill,
  isRunning,
}: CustomSkillsManagerProps) {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <button
        onClick={onNewSkill}
        style={{
          padding: "0.625rem 1rem",
          backgroundColor: tv.accent,
          color: "white",
          border: "none",
          borderRadius: "0.375rem",
          cursor: "pointer",
          fontSize: "0.875rem",
          fontWeight: "500",
          marginBottom: "1rem",
        }}
      >
        + Create Skill
      </button>

      {skills.length === 0 ? (
        <div style={{
          padding: "2rem",
          backgroundColor: tv.bgCard,
          borderRadius: "0.375rem",
          textAlign: "center",
          color: tv.textSecondary,
        }}>
          No custom skills yet. Create one to define custom enrichment logic.
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1.5rem",
        }}>
          {skills.map((skill) => (
            <CustomSkillCard
              key={skill.id}
              skill={skill}
              onEdit={() => onEditSkill(skill)}
              onRun={() => onRunSkill(skill.id)}
              isRunning={isRunning}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Component: CustomSkillCard ──────────────────────────────────────────────

interface CustomSkillCardProps {
  skill: CustomSkill;
  onEdit: () => void;
  onRun: () => void;
  isRunning: boolean;
}

function CustomSkillCard({
  skill,
  onEdit,
  onRun,
  isRunning,
}: CustomSkillCardProps) {
  return (
    <div style={{
      padding: "1.5rem",
      backgroundColor: tv.bgCard,
      borderRadius: "0.375rem",
      border: `1px solid ${tv.borderSubtle}`,
      display: "flex",
      flexDirection: "column",
      gap: "1rem",
    }}>
      <div>
        <h3 style={{
          fontSize: "1rem",
          fontWeight: "600",
          color: tv.textPrimary,
          marginBottom: "0.25rem",
        }}>
          {skill.name}
        </h3>
        <p style={{
          fontSize: "0.875rem",
          color: tv.textSecondary,
          lineHeight: "1.5",
          marginBottom: "0.5rem",
        }}>
          {skill.prompt.substring(0, 100)}
          {skill.prompt.length > 100 ? "..." : ""}
        </p>
        <div style={{
          fontSize: "0.75rem",
          color: tv.textDim,
        }}>
          Target: {TARGET_LABELS[skill.target] || skill.target}
        </div>
      </div>

      <div style={{
        display: "flex",
        gap: "0.75rem",
      }}>
        <button
          onClick={onRun}
          disabled={isRunning}
          style={{
            flex: 1,
            padding: "0.625rem 1rem",
            backgroundColor: isRunning ? tv.bgPrimary : tv.accent,
            color: isRunning ? tv.textSecondary : "white",
            border: "none",
            borderRadius: "0.375rem",
            cursor: isRunning ? "not-allowed" : "pointer",
            fontSize: "0.875rem",
            fontWeight: "500",
          }}
        >
          Run
        </button>
        <button
          onClick={onEdit}
          style={{
            flex: 1,
            padding: "0.625rem 1rem",
            backgroundColor: tv.bgPrimary,
            color: tv.textPrimary,
            border: `1px solid ${tv.borderSubtle}`,
            borderRadius: "0.375rem",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: "500",
          }}
        >
          Edit
        </button>
      </div>
    </div>
  );
}

// ─── Component: SkillEditorModal ─────────────────────────────────────────────

interface SkillEditorModalProps {
  skill: CustomSkill | null;
  onSave: (skill: CustomSkill) => void;
  onDelete: (skillId: string) => void;
  onClose: () => void;
}

function SkillEditorModal({
  skill,
  onSave,
  onDelete,
  onClose,
}: SkillEditorModalProps) {
  const [name, setName] = useState(skill?.name ?? "");
  const [prompt, setPrompt] = useState(skill?.prompt ?? "");
  const [target, setTarget] = useState<CustomSkill["target"]>(skill?.target ?? "full-model");

  const handleSave = useCallback(() => {
    if (!name.trim() || !prompt.trim()) return;

    const newSkill: CustomSkill = {
      id: skill?.id ?? Math.random().toString(36).substring(7),
      name: name.trim(),
      prompt: prompt.trim(),
      target,
      createdAt: skill?.createdAt ?? Date.now(),
    };

    onSave(newSkill);
  }, [name, prompt, target, skill, onSave]);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 50,
    }}>
      <div style={{
        backgroundColor: tv.bgPrimary,
        borderRadius: "0.5rem",
        padding: "2rem",
        maxWidth: "500px",
        width: "90%",
        maxHeight: "80vh",
        overflowY: "auto",
      }}>
        <h2 style={{
          fontSize: "1.5rem",
          fontWeight: "700",
          marginBottom: "1.5rem",
          color: tv.textPrimary,
        }}>
          {skill ? "Edit Skill" : "Create Custom Skill"}
        </h2>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            marginBottom: "0.5rem",
            color: tv.textSecondary,
          }}>
            Skill Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., 'Identify Technology Gaps'"
            style={{
              width: "100%",
              padding: "0.625rem",
              backgroundColor: tv.bgCard,
              color: tv.textPrimary,
              border: `1px solid ${tv.borderSubtle}`,
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
            }}
          />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            marginBottom: "0.5rem",
            color: tv.textSecondary,
          }}>
            Target
          </label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value as CustomSkill["target"])}
            style={{
              width: "100%",
              padding: "0.625rem",
              backgroundColor: tv.bgCard,
              color: tv.textPrimary,
              border: `1px solid ${tv.borderSubtle}`,
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
            }}
          >
            {Object.entries(TARGET_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            marginBottom: "0.5rem",
            color: tv.textSecondary,
          }}>
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Write the prompt that will be applied to your model..."
            style={{
              width: "100%",
              padding: "0.625rem",
              backgroundColor: tv.bgCard,
              color: tv.textPrimary,
              border: `1px solid ${tv.borderSubtle}`,
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              fontFamily: "monospace",
              minHeight: "150px",
              resize: "vertical",
            }}
          />
        </div>

        <div style={{
          display: "flex",
          gap: "0.75rem",
          justifyContent: "flex-end",
        }}>
          {skill && (
            <button
              onClick={() => {
                onDelete(skill.id);
              }}
              style={{
                padding: "0.625rem 1rem",
                backgroundColor: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "0.375rem",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: "500",
                marginRight: "auto",
              }}
            >
              Delete
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: "0.625rem 1rem",
              backgroundColor: tv.bgCard,
              color: tv.textPrimary,
              border: `1px solid ${tv.borderSubtle}`,
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: "500",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !prompt.trim()}
            style={{
              padding: "0.625rem 1rem",
              backgroundColor: !name.trim() || !prompt.trim() ? tv.bgCard : tv.accent,
              color: !name.trim() || !prompt.trim() ? tv.textSecondary : "white",
              border: "none",
              borderRadius: "0.375rem",
              cursor: !name.trim() || !prompt.trim() ? "not-allowed" : "pointer",
              fontSize: "0.875rem",
              fontWeight: "500",
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
