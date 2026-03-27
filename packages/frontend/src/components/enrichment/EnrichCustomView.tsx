/**
 * EnrichCustomView — Custom Skills section
 * Renders the custom skill cards and the skill editor modal
 */
import { useState } from "react";
import { useCanvasStore } from "../../store/canvas-store.ts";
import { useEnrichmentStore } from "../../store/enrichment-store.ts";
import { tv } from "../../theme.ts";
import { SectionHeader, CustomSkillCard, SkillEditorModal } from "./shared.tsx";
import type { CustomSkill } from "../../store/enrichment-store.ts";
import WaitPuzzle from "../WaitPuzzle";

export function EnrichCustomView() {
  const scaffoldData = useCanvasStore((s) => s.scaffoldData);
  const goToEnrich = useCanvasStore((s) => s.goToEnrich);
  const store = useEnrichmentStore();

  // Custom skills state
  const [customSkills, setCustomSkills] = useState<CustomSkill[]>([]);
  const [showSkillEditor, setShowSkillEditor] = useState(false);
  const [editingSkill, setEditingSkill] = useState<CustomSkill | null>(null);

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
          title="Custom Enrichments"
          subtitle={
            "Create your own enrichment skills with editable prompts. This is for domain-specific analysis that isn't covered by the built-in " +
            "enrichments above — for example, a regulatory compliance check specific to your industry, a vendor assessment framework your " +
            "organisation uses, or a custom scoring model. Write the prompt, choose what model elements it applies to, and run it like any other enrichment."
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

        {/* Custom skill cards */}
        <div className="grid gap-3 mb-4">
          {customSkills.map((skill) => (
            <CustomSkillCard
              key={skill.id}
              skill={skill}
              onEdit={() => { setEditingSkill(skill); setShowSkillEditor(true); }}
              onDelete={() => setCustomSkills((prev) => prev.filter((s) => s.id !== skill.id))}
              disabled={!!store.running}
            />
          ))}
        </div>

        {/* Create Custom Enrichment button */}
        <button
          onClick={() => { setEditingSkill(null); setShowSkillEditor(true); }}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-[12px] font-medium transition-colors"
          style={{
            background: tv.bgCard,
            border: `1.5px dashed ${tv.borderSubtle}`,
            color: tv.textSecondary,
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 16 }}>+</span>
          Create Custom Enrichment
        </button>

        {/* ── Skill Editor Modal ── */}
        {showSkillEditor && (
          <SkillEditorModal
            skill={editingSkill}
            onSave={(skill) => {
              setCustomSkills((prev) => {
                const existing = prev.findIndex((s) => s.id === skill.id);
                if (existing >= 0) {
                  const updated = [...prev];
                  updated[existing] = skill;
                  return updated;
                }
                return [...prev, skill];
              });
              setShowSkillEditor(false);
              setEditingSkill(null);
            }}
            onClose={() => { setShowSkillEditor(false); setEditingSkill(null); }}
          />
        )}
      </div>
    </div>
  );
}
