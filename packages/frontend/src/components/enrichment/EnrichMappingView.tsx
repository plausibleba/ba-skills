/**
 * EnrichMappingView — Cross-Mapping section
 *
 * Users select relationship types from the metamodel (not free-form entity pairs).
 * Semantics are displayed read-only — they come from the ontology, not user choice.
 * Inverse mappings are always generated (not a toggle).
 * Level constraints can be adjusted per relationship type.
 * PPIT is available as a compound cross-mapping type.
 */
import { useState, useCallback } from "react";
import { useCanvasStore } from "../../store/canvas-store.ts";
import { useEnrichmentStore } from "../../store/enrichment-store.ts";
import type { MappingPair } from "../../store/enrichment-store.ts";
import { tv } from "../../theme.ts";
import { ENRICHMENT_CARDS, SectionHeader, EnrichmentCard, useEnrichmentActions } from "./shared.tsx";
import { CROSS_MAPPING_METAMODEL, getRelationshipTypeById } from "../../domain/cross-mapping-metamodel.ts";
import type { RelationshipType } from "../../domain/cross-mapping-metamodel.ts";
import { MAPPABLE_ENTITIES, CARDINALITY_OPTIONS } from "./shared.tsx";
import { runEnrichmentStep } from "../../domain/pipeline/pipeline-orchestrator.ts";
import type { PipelineProgress } from "../../domain/pipeline/pipeline-orchestrator.ts";
import { useDiscoverySessionStore } from "../../store/discovery-session-store.ts";
import WaitPuzzle from "../WaitPuzzle";

// ─── Level Constraint Editor ───────────────────────────────────────────────

const ALL_LEVELS = [1, 2, 3, 4];

function LevelConstraintEditor({
  relType,
  currentLevels,
  onChangeLevels,
}: {
  relType: RelationshipType;
  currentLevels: number[];
  onChangeLevels: (levels: number[]) => void;
}) {
  if (!relType.defaultLevelConstraint) return null;

  const lc = relType.defaultLevelConstraint;
  const entityLabel = lc.appliesTo === "from"
    ? (MAPPABLE_ENTITIES.find((e) => e.value === relType.from)?.label ?? relType.from)
    : (MAPPABLE_ENTITIES.find((e) => e.value === relType.to)?.label ?? relType.to);

  return (
    <div className="mt-2 flex items-center gap-2 flex-wrap">
      <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: tv.textDim }}>
        {lc.label} constraint ({entityLabel}):
      </span>
      {ALL_LEVELS.map((lvl) => {
        const active = currentLevels.includes(lvl);
        return (
          <button
            key={lvl}
            onClick={() => {
              if (active && currentLevels.length > 1) {
                onChangeLevels(currentLevels.filter((l) => l !== lvl));
              } else if (!active) {
                onChangeLevels([...currentLevels, lvl].sort());
              }
            }}
            className="rounded px-2 py-0.5 text-[10px] font-medium"
            style={{
              background: active ? tv.accent : tv.bgSurface,
              color: active ? "#fff" : tv.textDim,
              border: `1px solid ${active ? tv.accent : tv.borderSubtle}`,
              cursor: "pointer",
            }}
          >
            L{lvl}
          </button>
        );
      })}
    </div>
  );
}

// ─── Relationship Type Row ─────────────────────────────────────────────────

function RelationshipTypeRow({
  pair,
  onRemove,
  onLevelChange,
}: {
  pair: MappingPair;
  onRemove: () => void;
  onLevelChange: (levels: number[]) => void;
}) {
  const [showSemantics, setShowSemantics] = useState(false);
  const relType = getRelationshipTypeById(pair.relationshipTypeId);

  if (!relType) return null;

  const fromLabel = MAPPABLE_ENTITIES.find((e) => e.value === relType.from)?.label ?? relType.from;
  const toLabel = MAPPABLE_ENTITIES.find((e) => e.value === relType.to)?.label ?? relType.to;
  const cardLabel = CARDINALITY_OPTIONS.find((o) => o.value === relType.semantics.cardinality)?.label ?? relType.semantics.cardinality;

  // Effective level constraint
  const effectiveLevels = pair.levelConstraintOverride
    ?? relType.defaultLevelConstraint?.allowedLevels
    ?? [];

  return (
    <div className="mb-3 rounded-lg p-3" style={{ background: tv.bgPrimary, border: `1px solid ${tv.borderSubtle}` }}>
      {/* Relationship type header */}
      <div className="flex items-center gap-2 flex-wrap">
        {relType.compound && (
          <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "#7c3aed20", color: "#7c3aed" }}>
            compound
          </span>
        )}
        <span className="text-[11px] font-semibold" style={{ color: tv.textPrimary }}>{fromLabel}</span>
        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: tv.accent + "18", color: tv.accent }}>
          {relType.label}
        </span>
        <span className="text-[11px] font-semibold" style={{ color: tv.textPrimary }}>{toLabel}</span>

        {/* Inverse indicator */}
        <span className="ml-2 rounded px-1.5 py-0.5 text-[9px] font-medium" style={{ background: tv.bgSurface, color: tv.textDim, border: `1px solid ${tv.borderSubtle}` }}>
          inverse: {toLabel} <span style={{ color: tv.accent }}>{relType.inverseLabel}</span> {fromLabel}
        </span>

        {/* Semantics toggle (read-only) */}
        <button
          onClick={() => setShowSemantics(!showSemantics)}
          className="ml-auto rounded px-2 py-0.5 text-[10px] font-medium"
          style={{ background: tv.bgSurface, color: tv.textDim, border: `1px solid ${tv.borderSubtle}`, cursor: "pointer" }}
        >
          {showSemantics ? "Hide" : "Semantics"}
        </button>

        {/* Remove */}
        <button
          onClick={onRemove}
          className="rounded p-1 text-[10px]"
          style={{ color: tv.textDim, cursor: "pointer" }}
          title="Remove this mapping"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Description */}
      <p className="mt-1.5 text-[10px] leading-relaxed" style={{ color: tv.textDim }}>
        {relType.description}
      </p>

      {/* Level constraint editor */}
      {relType.defaultLevelConstraint && (
        <LevelConstraintEditor
          relType={relType}
          currentLevels={effectiveLevels}
          onChangeLevels={onLevelChange}
        />
      )}

      {/* Read-only semantics panel */}
      {showSemantics && (
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${tv.borderSubtle}` }}>
          <p className="text-[10px] font-semibold mb-2" style={{ color: tv.textSecondary }}>
            Metamodel Semantics
          </p>
          <p className="text-[9px] mb-2 leading-relaxed" style={{ color: tv.textDim }}>
            These properties are defined by the ontology and applied automatically during cross-mapping.
          </p>
          <div className="flex flex-wrap gap-3">
            <SemanticBadge label="Cardinality" value={cardLabel} />
            <SemanticBadge label="Symmetrical" value={relType.semantics.symmetrical ? "Yes" : "No"} />
            <SemanticBadge label="Functional" value={relType.semantics.functional ? "Yes" : "No"} />
            <SemanticBadge label="Transitive" value={relType.semantics.transitive ? "Yes" : "No"} />
          </div>
          {relType.compound && relType.subRelationshipIds && (
            <div className="mt-2">
              <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: tv.textDim }}>
                Sub-relationships:
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {relType.subRelationshipIds.map((subId) => {
                  const sub = getRelationshipTypeById(subId);
                  return sub ? (
                    <span key={subId} className="rounded px-1.5 py-0.5 text-[9px]" style={{ background: tv.bgSurface, color: tv.textSecondary, border: `1px solid ${tv.borderSubtle}` }}>
                      {sub.from} {sub.label} {sub.to}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SemanticBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg px-3 py-1.5" style={{ background: tv.bgSurface, border: `1px solid ${tv.borderSubtle}` }}>
      <span className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: tv.textDim }}>{label}</span>
      <span className="text-[11px] font-bold mt-0.5" style={{ color: tv.textPrimary }}>{value}</span>
    </div>
  );
}

// ─── Relationship Type Picker ──────────────────────────────────────────────

function RelationshipTypePicker({
  existingTypeIds,
  onSelect,
  onCancel,
}: {
  existingTypeIds: Set<string>;
  onSelect: (relType: RelationshipType) => void;
  onCancel: () => void;
}) {
  const grouped = new Map<string, RelationshipType[]>();
  for (const rt of CROSS_MAPPING_METAMODEL) {
    const fromLabel = MAPPABLE_ENTITIES.find((e) => e.value === rt.from)?.label ?? rt.from;
    const groupKey = rt.compound ? "Compound (multi-relationship)" : fromLabel;
    if (!grouped.has(groupKey)) grouped.set(groupKey, []);
    grouped.get(groupKey)!.push(rt);
  }

  return (
    <div className="rounded-lg p-4 mb-3" style={{ background: tv.bgCard, border: `1.5px solid ${tv.accent}40` }}>
      <p className="text-[11px] font-semibold mb-1" style={{ color: tv.textPrimary }}>
        Select a relationship type
      </p>
      <p className="text-[10px] mb-3" style={{ color: tv.textDim }}>
        Choose from the metamodel. Each type has fixed semantics. Level constraints can be adjusted after selection.
      </p>

      {[...grouped.entries()].map(([groupLabel, types]) => (
        <div key={groupLabel} className="mb-3">
          <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: tv.textSecondary }}>
            {groupLabel}
          </p>
          <div className="grid gap-1">
            {types.map((rt) => {
              const fromLabel = MAPPABLE_ENTITIES.find((e) => e.value === rt.from)?.label ?? rt.from;
              const toLabel = MAPPABLE_ENTITIES.find((e) => e.value === rt.to)?.label ?? rt.to;
              const alreadyAdded = existingTypeIds.has(rt.id);
              return (
                <button
                  key={rt.id}
                  onClick={() => !alreadyAdded && onSelect(rt)}
                  disabled={alreadyAdded}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors"
                  style={{
                    background: alreadyAdded ? tv.bgSurface : tv.bgPrimary,
                    border: `1px solid ${tv.borderSubtle}`,
                    cursor: alreadyAdded ? "not-allowed" : "pointer",
                    opacity: alreadyAdded ? 0.4 : 1,
                  }}
                >
                  {rt.compound && (
                    <span className="rounded px-1 py-0.5 text-[8px] font-bold" style={{ background: "#7c3aed20", color: "#7c3aed" }}>
                      compound
                    </span>
                  )}
                  <span className="text-[10px] font-medium" style={{ color: tv.textPrimary }}>{fromLabel}</span>
                  <span className="text-[10px] font-bold" style={{ color: tv.accent }}>{rt.label}</span>
                  <span className="text-[10px] font-medium" style={{ color: tv.textPrimary }}>{toLabel}</span>
                  {rt.defaultLevelConstraint && (
                    <span className="text-[9px]" style={{ color: tv.textDim }}>
                      (default: L{rt.defaultLevelConstraint.allowedLevels.join(",")})
                    </span>
                  )}
                  {alreadyAdded && (
                    <span className="ml-auto text-[9px] font-medium" style={{ color: tv.textDim }}>added</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <button
        onClick={onCancel}
        className="mt-2 rounded px-3 py-1 text-[10px] font-medium"
        style={{ background: tv.bgSurface, color: tv.textDim, border: `1px solid ${tv.borderSubtle}`, cursor: "pointer" }}
      >
        Cancel
      </button>
    </div>
  );
}

// ─── Main View ─────────────────────────────────────────────────────────────

export function EnrichMappingView() {
  const scaffoldData = useCanvasStore((s) => s.scaffoldData);
  const goToEnrich = useCanvasStore((s) => s.goToEnrich);
  const store = useEnrichmentStore();
  const discoveryIR = useDiscoverySessionStore((s) => s.discoveryIR);
  const { viewImpact, getStatus } = useEnrichmentActions();

  const sectionCards = ENRICHMENT_CARDS.filter((c) => c.category === "mapping");

  // Cross-mapping state
  const [mappingPairs, setMappingPairs] = useState<MappingPair[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const existingTypeIds = new Set(mappingPairs.map((p) => p.relationshipTypeId));

  // ── Add a relationship type ──
  const addRelationshipType = useCallback((relType: RelationshipType) => {
    setMappingPairs((prev) => [
      ...prev,
      {
        id: `mp-${Date.now()}`,
        relationshipTypeId: relType.id,
        levelConstraintOverride: null, // use metamodel default
        from: relType.from,
        to: relType.to,
        includeInverse: true,
        semantics: relType.semantics,
      },
    ]);
    setShowPicker(false);
  }, []);

  const removeMappingPair = useCallback((id: string) => {
    setMappingPairs((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updateLevelConstraint = useCallback((id: string, levels: number[]) => {
    setMappingPairs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, levelConstraintOverride: levels } : p)),
    );
  }, []);

  // ── Run cross-mapping ──
  const runCrossMapping = useCallback(async () => {
    if (!scaffoldData || mappingPairs.length === 0) return;

    store.setRunning("cross-mapping");
    store.setError(null);

    try {
      const enrichmentCopy = JSON.parse(JSON.stringify(scaffoldData));
      await runEnrichmentStep(
        "cross-mapping",
        enrichmentCopy,
        discoveryIR ?? undefined,
        (progress: PipelineProgress) => {
          if (progress.status === "enrichment-done") {
            const s = useCanvasStore.getState();
            if (progress.scaffold) {
              s.loadScaffold(progress.scaffold);
              useCanvasStore.setState({ scaffoldDirty: true });
            }
            store.markCompleted("cross-mapping");
            store.setRunning(null);
          }
        },
        mappingPairs,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      store.setError(`Cross-mapping failed: ${msg}`);
      store.setRunning(null);
    }
  }, [scaffoldData, mappingPairs, discoveryIR, store]);

  if (!scaffoldData) return null;

  return (
    <div className="h-full overflow-auto" style={{ background: tv.bgPrimary, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div className="mx-auto max-w-[900px] p-6">
        {/* Back link */}
        <button
          onClick={() => goToEnrich()}
          className="mb-4 flex items-center gap-1 text-[11px] font-medium transition-colors"
          style={{ color: tv.accent, cursor: "pointer", background: "none", border: "none" }}
        >
          ← Back to Enrichment
        </button>

        {/* Section header */}
        <SectionHeader
          title="Cross-Mapping"
          subtitle={
            "Discover typed relationships between elements in your model. Relationship types and their semantics " +
            "are defined by the metamodel — select which relationships to map, adjust level constraints if needed, " +
            "and the enricher will discover instances. Inverse mappings are always generated. " +
            "PPIT enrichment is available as a compound cross-mapping type."
          }
        />

        {/* Running indicator */}
        {store.running && (
          <div className="mb-4 rounded-lg p-4" style={{ background: tv.bgCard, border: `1px solid ${tv.borderSubtle}` }}>
            <WaitPuzzle step={store.running} />
          </div>
        )}

        {/* Error banner */}
        {store.error && (
          <div className="mb-4 rounded-lg border px-4 py-3" style={{ borderColor: "rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.08)" }}>
            <p className="text-[12px]" style={{ color: "#d97706" }}>{store.error}</p>
            <button onClick={() => store.setError(null)} className="mt-1 text-[11px] underline" style={{ color: "#b45309" }}>Dismiss</button>
          </div>
        )}

        {/* Card */}
        <div className="grid gap-3 mb-4">
          {sectionCards.map((card) => (
            <div key={card.id}>
              <EnrichmentCard
                card={card}
                status={getStatus(card)}
                onRun={() => {}}
                onNavigate={() => {}}
                disabled={!!store.running}
                userContent={store.userContentByCard[card.id]}
                onUserContentChange={(patch) => store.updateUserContent(card.id, patch)}
                canRevert={store.snapshots.some((s) => s.cardId === card.id)}
                revertConfirmActive={store.revertConfirm === card.id}
                onRevertRequest={() => store.setRevertConfirm(card.id)}
                onRevertConfirm={() => {
                  store.setRevertConfirm(null);
                }}
                onRevertCancel={() => store.setRevertConfirm(null)}
                hideActionButton
                reviewResult={store.reviewResults.find((r) => r.cardId === card.id)}
                onCommitReview={() => store.commitReview(card.id)}
                onViewImpact={() => viewImpact(card.id)}
              />
            </div>
          ))}
        </div>

        {/* Mapping relationship builder */}
        <div className="mb-8 rounded-lg p-4" style={{ background: tv.bgCard, border: `1px solid ${tv.borderSubtle}` }}>
          <p className="text-[11px] font-semibold mb-1" style={{ color: tv.textPrimary }}>
            Relationship Types to Map
          </p>
          <p className="text-[10px] mb-3" style={{ color: tv.textDim }}>
            Select which metamodel relationships to discover. Each has fixed semantics defined by the ontology.
            Adjust the level constraint to control mapping depth (e.g., L3 Capabilities only).
            Inverse mappings are always included. PPIT is available as a compound type.
          </p>

          {/* Existing relationship type rows */}
          {mappingPairs.map((pair) => (
            <RelationshipTypeRow
              key={pair.id}
              pair={pair}
              onRemove={() => removeMappingPair(pair.id)}
              onLevelChange={(levels) => updateLevelConstraint(pair.id, levels)}
            />
          ))}

          {/* Picker */}
          {showPicker && (
            <RelationshipTypePicker
              existingTypeIds={existingTypeIds}
              onSelect={addRelationshipType}
              onCancel={() => setShowPicker(false)}
            />
          )}

          {/* Add + Run buttons */}
          <div className="flex items-center gap-2 mt-2">
            {!showPicker && (
              <button
                onClick={() => setShowPicker(true)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium transition-colors"
                style={{ background: tv.bgSurface, border: `1.5px dashed ${tv.borderSubtle}`, color: tv.textSecondary, cursor: "pointer" }}
              >
                <span style={{ fontSize: 14 }}>+</span>
                Add Relationship Type
              </button>
            )}
            {mappingPairs.length > 0 && (
              <button
                onClick={runCrossMapping}
                disabled={!!store.running || mappingPairs.length === 0}
                className="rounded-lg px-4 py-2 text-[11px] font-semibold transition-all"
                style={{
                  background: tv.textPrimary,
                  color: tv.bgPrimary,
                  cursor: store.running ? "not-allowed" : "pointer",
                  opacity: store.running ? 0.5 : 1,
                }}
              >
                Run {mappingPairs.length} Mapping{mappingPairs.length !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
