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
    <div style={{ padding: "1.5rem" }}>
      <div style={{ marginBottom: "1rem", fontSize: "0.875rem", fontWeight: "500", color: tv.textSecondary }}>
        Model Readiness Journey
      </div>

      {/* Stepper Pills */}
      <div style={{
        display: "flex",
        gap: "0.75rem",
        flexWrap: "wrap",
        alignItems: "center",
        marginBottom: "1rem",
      }}>
        {READINESS_ORDER.map((state, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isFuture = idx > currentIndex;

          return (
            <div
              key={state}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <div
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "9999px",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  backgroundColor: isCurrent ? tv.accent : isCompleted ? "#10b981" : tv.bgCard,
                  color: isCurrent || isCompleted ? "white" : isFuture ? tv.textDim : tv.textPrimary,
                  transition: "all 0.2s ease",
                }}
              >
                {isCompleted ? "✓" : ""} {READINESS_LABELS[state]}
              </div>
              {idx < READINESS_ORDER.length - 1 && (
                <div style={{ fontSize: "1.25rem", color: tv.borderSubtle }}>→</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Next-Hint Callout */}
      {nextHint && currentIndex >= 0 && currentIndex < READINESS_ORDER.length - 1 && (
        <div style={{
          padding: "0.75rem 1rem",
          backgroundColor: tv.bgCard,
          borderLeftColor: tv.accent,
          borderLeftWidth: "3px",
          borderRadius: "0.375rem",
          fontSize: "0.875rem",
          color: tv.textSecondary,
        }}>
          <strong>Next step:</strong> {nextHint}
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
      padding: "1.5rem",
      backgroundColor: tv.bgCard,
      borderLeftColor: tv.accent,
      borderLeftWidth: "4px",
      borderRadius: "0.375rem",
      marginBottom: "1.5rem",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "1rem",
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: "1rem",
            fontWeight: "600",
            color: tv.textPrimary,
            marginBottom: "0.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}>
            <span>{icon}</span>
            <span>Recommended: {opDef.label}</span>
          </div>
          <div style={{
            fontSize: "0.875rem",
            color: tv.textSecondary,
          }}>
            {recommendation.why || "This operation will help progress your model."}
          </div>
        </div>
        <button
          onClick={() => onGo(recommendation.operationId)}
          disabled={isDisabled}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: isDisabled ? tv.bgCard : tv.accent,
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            cursor: isDisabled ? "not-allowed" : "pointer",
            fontSize: "0.875rem",
            fontWeight: "500",
            opacity: isDisabled ? 0.5 : 1,
            whiteSpace: "nowrap",
          }}
        >
          Go
        </button>
      </div>
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

  return (
    <div style={{
      padding: "1.5rem",
      backgroundColor: tv.bgCard,
      borderRadius: "0.375rem",
      marginBottom: "1.5rem",
    }}>
      {/* Header with toggle */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          marginBottom: isOpen ? "1rem" : 0,
        }}
      >
        <div style={{
          fontSize: "1rem",
          fontWeight: "600",
          color: tv.textPrimary,
        }}>
          External Inputs
        </div>
        <div style={{
          fontSize: "1.25rem",
          color: tv.textSecondary,
          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s ease",
        }}>
          ▼
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "1rem",
            marginBottom: "1rem",
          }}>
            {inputTypes.map((type) => {
              const inputArtefact = inputs[type] ?? null;
              const hasInput = inputArtefact !== null;
              const canGenerate = isGenerable(type);

              // Determine provenance for this type
              const provenance: InputProvenance | null = hasInput ? inputArtefact.provenance : null;

              const icon = EXTERNAL_INPUT_ICONS[type] || "📋";
              const label = EXTERNAL_INPUT_LABELS[type] || type;

              return (
                <div
                  key={type}
                  style={{
                    padding: "1rem",
                    backgroundColor: tv.bgPrimary,
                    borderRadius: "0.375rem",
                    border: `1px solid ${tv.borderSubtle}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    alignItems: "center",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "1.5rem" }}>{icon}</div>
                  <div style={{
                    fontSize: "0.75rem",
                    fontWeight: "500",
                    color: tv.textPrimary,
                  }}>
                    {label}
                  </div>

                  {/* Provenance Badge */}
                  {hasInput && provenance && (
                    <div style={{
                      fontSize: "0.625rem",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "9999px",
                      backgroundColor: provenance === "provided" ? "#d1fae5" : "#f3e8ff",
                      color: provenance === "provided" ? "#065f46" : "#6b21a8",
                      fontWeight: "600",
                    }}>
                      {provenance === "provided" ? "✓ Provided" : "⚡ Generated"}
                    </div>
                  )}

                  {/* Generate Button */}
                  {canGenerate && !hasInput && (
                    <button
                      onClick={() => onGenerate(type)}
                      disabled={isGenerating}
                      style={{
                        width: "100%",
                        padding: "0.5rem 0.75rem",
                        backgroundColor: tv.accent,
                        color: "white",
                        border: "none",
                        borderRadius: "0.375rem",
                        cursor: isGenerating ? "not-allowed" : "pointer",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                        opacity: isGenerating ? 0.5 : 1,
                      }}
                    >
                      ✦ Generate
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={onViewAll}
            style={{
              width: "100%",
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
            View All
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
    <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "700", color: tv.textPrimary, marginBottom: "0.5rem" }}>
          Model Enrichment
        </h1>
        <p style={{ fontSize: "1rem", color: tv.textSecondary }}>
          {modelName} — Progressively enrich your operating model from skeleton to governed
        </p>
      </div>

      {/* Readiness Stepper */}
      <div style={{
        backgroundColor: tv.bgCard,
        borderRadius: "0.375rem",
        marginBottom: "2rem",
      }}>
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
      <div style={{ marginBottom: "3rem" }}>
        <SectionHeader
          title="Enrichments"
          subtitle="Operations that structurally enhance your model"
        />

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
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
            padding: "1.5rem",
            backgroundColor: tv.bgCard,
            borderRadius: "0.375rem",
            marginBottom: "2rem",
          }}>
            <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem", color: tv.textPrimary }}>
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
      <div style={{ marginBottom: "3rem" }}>
        <SectionHeader
          title="Diagnostics"
          subtitle="Analytical observations that reference your current model state"
        />

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
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
            padding: "1.5rem",
            backgroundColor: tv.bgCard,
            borderRadius: "0.375rem",
            marginBottom: "2rem",
          }}>
            <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem", color: tv.textPrimary }}>
              Friction Analysis Workspace
            </h3>
            <FrictionView />
            <button
              onClick={() => setShowFrictionWorkspace(false)}
              style={{
                marginTop: "1rem",
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
              Close Workspace
            </button>
          </div>
        )}
      </div>

      {/* Custom Enrichments */}
      <div style={{ marginBottom: "3rem" }}>
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
