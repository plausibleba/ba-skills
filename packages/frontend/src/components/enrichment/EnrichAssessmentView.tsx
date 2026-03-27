/**
 * EnrichAssessmentView — Assessment & Analysis section
 * Renders the five assessment enrichment cards (metrics, dependencies, maturity, gap-analysis, risk)
 */
import { useCanvasStore } from "../../store/canvas-store.ts";
import { useEnrichmentStore } from "../../store/enrichment-store.ts";
import { tv } from "../../theme.ts";
import { ENRICHMENT_CARDS, SectionHeader, EnrichmentCard, useEnrichmentActions } from "./shared.tsx";
import WaitPuzzle from "../WaitPuzzle";

export function EnrichAssessmentView() {
  const scaffoldData = useCanvasStore((s) => s.scaffoldData);
  const goToEnrich = useCanvasStore((s) => s.goToEnrich);
  const store = useEnrichmentStore();
  const { runBuiltIn, revertEnrichment, viewImpact, getStatus } = useEnrichmentActions();

  const sectionCards = ENRICHMENT_CARDS.filter((c) => c.category === "assessment");

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
          title="Assessment & Analysis"
          subtitle={
            "These enrichments evaluate your model against various lenses — performance, risk, maturity, dependencies, and gaps. " +
            "They don't add structural detail but instead overlay analytical insights that help you understand the strengths and weaknesses " +
            "of your operating model and where to focus improvement efforts."
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

        {/* Cards */}
        <div className="grid gap-3 mb-8">
          {sectionCards.map((card) => (
            <EnrichmentCard
              key={card.id}
              card={card}
              status={getStatus(card)}
              onRun={() => runBuiltIn(card)}
              onNavigate={() => card.navigateTo && {}}
              disabled={!!store.running}
              userContent={store.userContentByCard[card.id]}
              onUserContentChange={(patch) => store.updateUserContent(card.id, patch)}
              canRevert={store.snapshots.some((s) => s.cardId === card.id)}
              revertConfirmActive={store.revertConfirm === card.id}
              onRevertRequest={() => store.setRevertConfirm(card.id)}
              onRevertConfirm={() => revertEnrichment(card.id)}
              onRevertCancel={() => store.setRevertConfirm(null)}
              reviewResult={store.reviewResults.find((r) => r.cardId === card.id)}
              onCommitReview={() => store.commitReview(card.id)}
              onViewImpact={() => viewImpact(card.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
