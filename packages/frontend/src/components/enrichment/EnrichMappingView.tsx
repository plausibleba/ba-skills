/**
 * EnrichMappingView — Cross-Mapping section
 * Renders the mapping enrichment card and the full mapping pair builder UI
 */
import { useState, useCallback } from "react";
import { useCanvasStore } from "../../store/canvas-store.ts";
import { useEnrichmentStore } from "../../store/enrichment-store.ts";
import { tv } from "../../theme.ts";
import { ENRICHMENT_CARDS, SectionHeader, EnrichmentCard, useEnrichmentActions, MappingPairRow } from "./shared.tsx";
import type { MappingPair, MappingSemantics } from "./shared.tsx";
import WaitPuzzle from "../WaitPuzzle";

export function EnrichMappingView() {
  const scaffoldData = useCanvasStore((s) => s.scaffoldData);
  const goToEnrich = useCanvasStore((s) => s.goToEnrich);
  const store = useEnrichmentStore();
  const { viewImpact, getStatus } = useEnrichmentActions();

  const sectionCards = ENRICHMENT_CARDS.filter((c) => c.category === "mapping");

  // Cross-mapping state
  const [mappingPairs, setMappingPairs] = useState<MappingPair[]>([]);

  // ── Cross-mapping helpers ──
  const addMappingPair = useCallback(() => {
    setMappingPairs((prev) => [
      ...prev,
      {
        id: `mp-${Date.now()}`,
        from: "capabilities",
        to: "stages",
        includeInverse: true,
        semantics: { symmetrical: false, functional: false, transitive: false, cardinality: "many-to-many" },
      },
    ]);
  }, []);

  const updateMappingPair = useCallback((id: string, patch: Partial<MappingPair>) => {
    setMappingPairs((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const updateMappingSemantics = useCallback((id: string, semPatch: Partial<MappingSemantics>) => {
    setMappingPairs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, semantics: { ...p.semantics, ...semPatch } } : p)),
    );
  }, []);

  const removeMappingPair = useCallback((id: string) => {
    setMappingPairs((prev) => prev.filter((p) => p.id !== id));
  }, []);

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
            "Build explicit relationship maps between different element types in your model. For example, map which Technologies support " +
            "which Capabilities, or which Roles are responsible for which Activities. These cross-references unlock powerful impact analysis — " +
            "when something changes, you can instantly see everything that's affected."
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
                  // Revert logic - remove this when actual store method is available
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

        {/* Mapping pair builder */}
        <div className="mb-8 rounded-lg p-4" style={{ background: tv.bgCard, border: `1px solid ${tv.borderSubtle}` }}>
          <p className="text-[11px] font-semibold mb-1" style={{ color: tv.textPrimary }}>
            Configure Mappings
          </p>
          <p className="text-[10px] mb-3" style={{ color: tv.textDim }}>
            Add one or more mapping pairs below. For each pair, choose the source and target element types, and optionally configure
            the relationship semantics. The inverse mapping (target → source) is included by default.
          </p>

          {/* Existing pairs */}
          {mappingPairs.map((pair) => (
            <MappingPairRow
              key={pair.id}
              pair={pair}
              onUpdate={(patch) => updateMappingPair(pair.id, patch)}
              onUpdateSemantics={(sem) => updateMappingSemantics(pair.id, sem)}
              onRemove={() => removeMappingPair(pair.id)}
            />
          ))}

          {/* Add pair button */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={addMappingPair}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium transition-colors"
              style={{ background: tv.bgSurface, border: `1.5px dashed ${tv.borderSubtle}`, color: tv.textSecondary, cursor: "pointer" }}
            >
              <span style={{ fontSize: 14 }}>+</span>
              Add Mapping Pair
            </button>
            {mappingPairs.length > 0 && (
              <button
                onClick={() => {/* TODO: run cross-mapping enrichment */}}
                disabled={!!store.running || mappingPairs.length === 0}
                className="rounded-lg px-4 py-2 text-[11px] font-semibold transition-all"
                style={{
                  background: tv.textPrimary,
                  color: tv.bgPrimary,
                  cursor: store.running ? "not-allowed" : "pointer",
                  opacity: store.running ? 0.5 : 1,
                }}
              >
                Run {mappingPairs.length} Mapping Set{mappingPairs.length !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
