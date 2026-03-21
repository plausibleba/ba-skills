import { tv } from "../theme.ts";
import { PPITEntry } from "../domain/ppit-enrichment.ts";
import { CapNode } from "./capability-map-types.ts";

export function CapabilityInspectorPanel({ cap, ppit }: { cap: CapNode | null; ppit?: PPITEntry }) {
  if (!cap) {
    return (
      <div
        className="mt-3 rounded-lg p-4"
        style={{ background: tv.bgCard, border: `1.5px solid ${tv.borderAccent}`, minHeight: 72 }}
      >
        <p className="text-[12px]" style={{ color: tv.textDim }}>
          Select a capability tile to see its definition, business object, and relationships.
        </p>
      </div>
    );
  }

  const SECTIONS: { label: string; items: string[]; color: string }[] = [
    { label: "People (Roles)", items: ppit?.roles ?? [], color: "#f59e0b" },
    { label: "Process (Activities)", items: ppit?.activityNames ?? [], color: "#10b981" },
    { label: "Sub-Activities", items: ppit?.subActivities ?? [], color: "#6366f1" },
    { label: "Information Objects", items: ppit?.infoObjects ?? [], color: "#3b82f6" },
    { label: "Technology", items: ppit?.techApps ?? [], color: "#8b5cf6" },
  ].filter(s => s.items.length > 0);

  return (
    <div
      className="mt-3 rounded-lg p-4"
      style={{ background: tv.bgCard, border: `1.5px solid ${tv.borderAccent}`, minHeight: 72 }}
    >
      {/* Header */}
      <div className="mb-1 text-[15px] font-bold" style={{ color: tv.textPrimary }}>
        {cap.name}
      </div>
      {cap.businessObject && (
        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: tv.accent }}>
          Business Object: {cap.businessObject}
        </div>
      )}
      {cap.description ? (
        <div className="text-[12px] leading-relaxed mb-2" style={{ color: tv.textSecondary }}>
          {cap.description}
        </div>
      ) : (
        <div className="text-[12px] mb-2" style={{ color: tv.textDim }}>
          No description. Double-click the tile to edit.
        </div>
      )}

      {/* PPIT Sections */}
      {SECTIONS.length > 0 && (
        <div className="grid gap-3" style={{ gridTemplateColumns: SECTIONS.length >= 4 ? "1fr 1fr" : "1fr" }}>
          {SECTIONS.map(s => (
            <div key={s.label}>
              <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: s.color }}>
                {s.label} ({s.items.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {s.items.map(item => (
                  <span key={item} className="inline-block rounded px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: `${s.color}18`, color: s.color }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cross-VS Usage */}
      {ppit && ppit.vsActivityPairs.length > 1 && (
        <div className="mt-3">
          <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "#ec4899" }}>
            Shared Across {ppit.vsNames.length} Value Streams
          </div>
          <div className="space-y-0.5">
            {ppit.vsActivityPairs.map((p, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px]">
                <span className="rounded px-1.5 py-0.5" style={{ backgroundColor: "rgba(236,72,153,0.1)", color: "#ec4899" }}>
                  {p.vs}
                </span>
                <span style={{ color: tv.textDim }}>→</span>
                <span style={{ color: tv.textSecondary }}>{p.activity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
