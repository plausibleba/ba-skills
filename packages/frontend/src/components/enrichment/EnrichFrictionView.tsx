/**
 * EnrichFrictionView — Friction & Bottleneck Analysis section
 * Renders the friction enrichment card and the embedded FrictionView
 */
import { useState } from "react";
import { useCanvasStore } from "../../store/canvas-store.ts";
import { useEnrichmentStore } from "../../store/enrichment-store.ts";
import { tv } from "../../theme.ts";
import { ENRICHMENT_CARDS, SectionHeader, EnrichmentCard, useEnrichmentActions } from "./shared.tsx";
import WaitPuzzle from "../WaitPuzzle";
import { FrictionView } from "../FrictionView";

export function EnrichFrictionView() {
  const scaffoldData = useCanvasStore((s) => s.scaffoldData);
  const goToEnrich = useCanvasStore((s) => s.goToEnrich);
  const store = useEnrichmentStore();
  const { revertEnrichment, viewImpact, getStatus } = useEnrichmentActions();

  const sectionCards = ENRICHMENT_CARDS.filter((c) => c.category === "friction");

  // Friction view expanded state
  const [frictionExpanded, setFrictionExpanded] = useState(false);

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
          title="Friction & Bottleneck Analysis"
          subtitle={
            "Friction analysis is a foundational assessment that identifies where work slows down, errors accumulate, and customers or employees " +
            "experience pain across your value streams. Because friction insights inform almost every other assessment and improvement decision, " +
            "it is surfaced here as its own dedicated section. You can provide known pain points as input content, then run the analysis to generate " +
            "a full heatmap of observations, binding constraints, and bottlenecks."
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
        <div className="grid gap-3 mb-3">
          {sectionCards.map((card) => (
            <EnrichmentCard
              key={card.id}
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
              onRevertConfirm={() => revertEnrichment(card.id)}
              onRevertCancel={() => store.setRevertConfirm(null)}
              hideActionButton
              reviewResult={store.reviewResults.find((r) => r.cardId === card.id)}
              onCommitReview={() => store.commitReview(card.id)}
              onViewImpact={() => viewImpact(card.id)}
            />
          ))}
        </div>

        {/* Open / collapse the full friction workspace */}
        <div className="mb-8">
          <button
            onClick={() => setFrictionExpanded(!frictionExpanded)}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-[12px] font-semibold transition-all"
            style={{
              background: frictionExpanded ? tv.bgSurface : tv.textPrimary,
              color: frictionExpanded ? tv.textSecondary : tv.bgPrimary,
              border: frictionExpanded ? `1px solid ${tv.borderSubtle}` : "none",
              cursor: "pointer",
            }}
          >
            <span>{frictionExpanded ? "▾" : "▸"}</span>
            {frictionExpanded ? "Collapse Friction Workspace" : "Open Friction Workspace"}
          </button>
          {frictionExpanded && (
            <div
              className="mt-3 rounded-xl overflow-hidden"
              style={{ border: `1px solid ${tv.borderSubtle}`, height: "calc(100vh - 200px)" }}
            >
              <FrictionView />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
