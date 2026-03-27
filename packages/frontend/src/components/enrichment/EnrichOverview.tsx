/**
 * EnrichOverview — Landing page for the Enrich section.
 * Shown when the user clicks the "ENRICH" section header in the nav.
 * Displays the enrichment explainer, progress bar, and links to each section.
 */
import { useMemo } from "react";
import { useCanvasStore } from "../../store/canvas-store.ts";
// enrichment store used via useEnrichmentActions hook
import { tv } from "../../theme.ts";
import { ENRICHMENT_CARDS, useEnrichmentActions } from "./shared.tsx";

export function EnrichOverview() {
  const scaffoldData = useCanvasStore((s) => s.scaffoldData);
  const goToEnrich = useCanvasStore((s) => s.goToEnrich);
  const { getStatus } = useEnrichmentActions();

  // Stats
  const stats = useMemo(() => {
    let done = 0, total = 0;
    for (const card of ENRICHMENT_CARDS) {
      if (card.comingSoon || card.customUI) continue;
      total++;
      if (getStatus(card) === "done") done++;
    }
    return { done, total };
  }, [getStatus]);

  if (!scaffoldData) return null;

  // Section definitions for navigation cards
  const sections = [
    { id: "structure" as const, label: "Structure & Depth", icon: "🔀", description: "Break down high-level elements into detailed sub-activities, PPIT mappings, and concept cards." },
    { id: "mapping" as const, label: "Cross-Mapping", icon: "🔄", description: "Build explicit relationship maps between different element types in your model." },
    { id: "friction" as const, label: "Friction & Bottleneck Analysis", icon: "⚡", description: "Identify where work slows down, errors accumulate, and customers experience pain." },
    { id: "assessment" as const, label: "Assessment & Analysis", icon: "📊", description: "Evaluate your model against performance, risk, maturity, and gap lenses." },
    { id: "custom" as const, label: "Custom Enrichments", icon: "🧪", description: "Create your own enrichment skills with editable prompts for domain-specific analysis." },
  ];

  return (
    <div className="h-full overflow-auto" style={{ background: tv.bgPrimary, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div className="mx-auto max-w-[900px] p-6">

        {/* Header */}
        <div className="mb-6">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: tv.textDim }}>
            Model Enrichment
          </div>
          <div className="mb-1 text-lg font-bold" style={{ color: tv.textPrimary }}>
            {scaffoldData.name}
          </div>
          <div className="text-[12px] leading-relaxed" style={{ color: tv.textSecondary }}>
            This page lets you iteratively add depth, detail, and analysis to your operating model.
            Each enrichment below can be run independently, re-run at any time, and reverted if the results aren't what you expected.
          </div>
        </div>

        {/* How it works explainer — the full 5-step panel */}
        <div className="mb-6 rounded-lg p-4" style={{ background: tv.bgCard, border: `1px solid ${tv.borderSubtle}` }}>
          <p className="text-[11px] font-semibold mb-2" style={{ color: tv.textPrimary }}>How enrichment works</p>
          <div className="grid gap-2 text-[11px] leading-relaxed" style={{ color: tv.textDim }}>
            <div className="flex gap-2">
              <span className="flex-shrink-0 font-bold" style={{ color: tv.accent }}>1. Add</span>
              <span>
                Optionally click <b>+ Add</b> to provide your own content that will guide the enrichment.
                For example, paste your actual KPIs before running "Generate Metrics", or a team roster before mapping People.
                You choose an <b>influence mode</b> — whether your content is guidance, must-include, exclusions, or the only items to use.
              </span>
            </div>
            <div className="flex gap-2">
              <span className="flex-shrink-0 font-bold" style={{ color: tv.accent }}>2. Run</span>
              <span>Click <b>Run</b> on any enrichment. The AI analyses your current model and adds the relevant data layer. A snapshot of your model is saved automatically before it runs.</span>
            </div>
            <div className="flex gap-2">
              <span className="flex-shrink-0 font-bold" style={{ color: "#10b981" }}>3. Review</span>
              <span>
                After enrichment completes, a <b>review panel</b> appears showing exactly what was added or changed — for example, "Created 12 sub-activity graphs with 47 work steps".
                This is your chance to check the output before committing.
              </span>
            </div>
            <div className="flex gap-2">
              <span className="flex-shrink-0 font-bold" style={{ color: "#10b981" }}>4. Commit</span>
              <span>
                Click <b>✓ Commit Changes</b> to accept the enrichment output. Or click the distinctive <b style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", padding: "0 4px", borderRadius: 3, fontSize: 10 }}>View Impact</b> button
                to navigate directly to the part of the application where you can see the content you just created.
              </span>
            </div>
            <div className="flex gap-2">
              <span className="flex-shrink-0 font-bold" style={{ color: tv.accent }}>↩ Revert</span>
              <span>
                If the results aren't what you expected, click <b>↩ Undo Instead</b> to instantly roll back to the exact state your model was in before that enrichment was applied.
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {stats.done > 0 && (
          <div className="mb-6 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full" style={{ background: tv.borderSubtle }}>
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(stats.done / stats.total) * 100}%`, background: "#10b981" }}
              />
            </div>
            <span className="text-[10px] font-medium" style={{ color: tv.textDim }}>
              {stats.done}/{stats.total} enrichments applied
            </span>
          </div>
        )}

        {/* Section navigation cards */}
        <div className="grid gap-3">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => goToEnrich(section.id)}
              className="flex items-start gap-3 rounded-lg px-4 py-3.5 text-left transition-all"
              style={{
                background: tv.bgCard,
                border: `1px solid ${tv.borderSubtle}`,
                cursor: "pointer",
              }}
            >
              <span className="flex-shrink-0 text-lg mt-0.5">{section.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium" style={{ color: tv.textPrimary }}>
                  {section.label}
                </p>
                <p className="text-[11px] leading-relaxed mt-0.5" style={{ color: tv.textDim }}>
                  {section.description}
                </p>
              </div>
              <span className="flex-shrink-0 mt-1 text-[14px]" style={{ color: tv.textDim }}>→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
