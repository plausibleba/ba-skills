import { tv } from "../theme.ts";
import { useThemeStore } from "../store/theme-store.ts";
import { PPITEntry } from "../domain/ppit-enrichment.ts";
import { CapNode } from "./capability-map-types.ts";

/* ── Colour palette (matches standard InspectorPanel) ──────────────── */

const PALETTE = {
  dark: {
    cap:   { bg: "rgba(74,158,218,0.10)",  fg: "#7dd3fc" },
    role:  { bg: "rgba(59,130,246,0.15)",  fg: "#93c5fd" },
    activ: { bg: "rgba(139,92,246,0.15)",  fg: "#c4b5fd" },
    sub:   { bg: "rgba(99,102,241,0.15)",  fg: "#a5b4fc" },
    info:  { bg: "rgba(245,158,11,0.15)",  fg: "#fcd34d" },
    tech:  { bg: "rgba(34,197,94,0.15)",   fg: "#4ade80" },
    cross: { bg: "rgba(236,72,153,0.12)",  fg: "#f472b6" },
  },
  light: {
    cap:   { bg: "rgba(59,130,246,0.06)",  fg: "#1d4ed8" },
    role:  { bg: "rgba(59,130,246,0.08)",  fg: "#2563eb" },
    activ: { bg: "rgba(139,92,246,0.08)",  fg: "#7c3aed" },
    sub:   { bg: "rgba(99,102,241,0.08)",  fg: "#4f46e5" },
    info:  { bg: "rgba(217,119,6,0.08)",   fg: "#b45309" },
    tech:  { bg: "rgba(5,150,105,0.08)",   fg: "#047857" },
    cross: { bg: "rgba(236,72,153,0.08)",  fg: "#be185d" },
  },
};

/* ── Section helper ────────────────────────────────────────────────── */

function Section({ title, color, children }: { title: string; color: { bg: string; fg: string }; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: color.fg }}>
        {title}
      </h4>
      {children}
    </div>
  );
}

function ChipList({ items, color }: { items: string[]; color: { bg: string; fg: string } }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span
          key={item}
          className="inline-block rounded px-1.5 py-0.5 text-[10px]"
          style={{ backgroundColor: color.bg, color: color.fg }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

/* ── Main Panel ────────────────────────────────────────────────────── */

export function CapabilityInspectorPanel({
  cap,
  ppit,
  onClose,
}: {
  cap: CapNode | null;
  ppit?: PPITEntry;
  onClose: () => void;
}) {
  const isDark = useThemeStore((s) => s.mode) === "dark";
  const pal = isDark ? PALETTE.dark : PALETTE.light;

  return (
    <div
      className="flex h-full flex-col overflow-hidden border-l"
      style={{ borderColor: tv.borderSubtle, background: tv.bgSurface, width: 360, flexShrink: 0 }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid ${tv.borderSubtle}` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
            style={{ background: pal.cap.bg, color: pal.cap.fg }}
          >
            Capability
          </span>
          <span className="text-[11px] font-medium" style={{ color: tv.textPrimary }}>
            Inspector
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 transition-colors hover:bg-black/10"
          style={{ color: tv.textDim }}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin">
        {!cap ? (
          <p className="text-[12px]" style={{ color: tv.textDim }}>
            Select a capability tile to see its definition, relationships, and PPIT breakdown.
          </p>
        ) : (
          <CapabilityDetail cap={cap} ppit={ppit} pal={pal} />
        )}
      </div>
    </div>
  );
}

/* ── Detail content ────────────────────────────────────────────────── */

function CapabilityDetail({
  cap,
  ppit,
  pal,
}: {
  cap: CapNode;
  ppit?: PPITEntry;
  pal: typeof PALETTE.dark;
}) {
  return (
    <>
      {/* Name */}
      <div>
        <div className="text-[15px] font-bold leading-snug" style={{ color: tv.textPrimary }}>
          {cap.name}
        </div>
        {cap.businessObject && (
          <div className="mt-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: pal.cap.fg }}>
            Business Object: {cap.businessObject}
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        {cap.description ? (
          <p className="text-[12px] leading-relaxed" style={{ color: tv.textSecondary }}>
            {cap.description}
          </p>
        ) : (
          <p className="text-[11px] italic" style={{ color: tv.textDim }}>
            No description available. Double-click the tile to edit.
          </p>
        )}
      </div>

      {/* People (Roles) */}
      {ppit && ppit.roles.length > 0 && (
        <Section title={`People (${ppit.roles.length})`} color={pal.role}>
          <ChipList items={ppit.roles} color={pal.role} />
        </Section>
      )}

      {/* Process (Activities) */}
      {ppit && ppit.activityNames.length > 0 && (
        <Section title={`Process (${ppit.activityNames.length})`} color={pal.activ}>
          <ChipList items={ppit.activityNames} color={pal.activ} />
        </Section>
      )}

      {/* Sub-Activities */}
      {ppit && ppit.subActivities.length > 0 && (
        <Section title={`Sub-Activities (${ppit.subActivities.length})`} color={pal.sub}>
          <ChipList items={ppit.subActivities} color={pal.sub} />
        </Section>
      )}

      {/* Information Objects */}
      {ppit && ppit.infoObjects.length > 0 && (
        <Section title={`Information (${ppit.infoObjects.length})`} color={pal.info}>
          <ChipList items={ppit.infoObjects} color={pal.info} />
        </Section>
      )}

      {/* Technology */}
      {ppit && ppit.techApps.length > 0 && (
        <Section title={`Technology (${ppit.techApps.length})`} color={pal.tech}>
          <ChipList items={ppit.techApps} color={pal.tech} />
        </Section>
      )}

      {/* Cross-VS Usage */}
      {ppit && ppit.vsActivityPairs.length > 1 && (
        <Section title={`Shared Across ${ppit.vsNames.length} Value Streams`} color={pal.cross}>
          <div className="space-y-1">
            {ppit.vsActivityPairs.map((p, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px]">
                <span
                  className="rounded px-1.5 py-0.5"
                  style={{ backgroundColor: pal.cross.bg, color: pal.cross.fg }}
                >
                  {p.vs}
                </span>
                <span style={{ color: tv.textDim }}>→</span>
                <span style={{ color: tv.textSecondary }}>{p.activity}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Empty PPIT state */}
      {(!ppit || (ppit.roles.length === 0 && ppit.activityNames.length === 0 && ppit.subActivities.length === 0 && ppit.infoObjects.length === 0 && ppit.techApps.length === 0)) && (
        <div className="rounded-lg p-3" style={{ background: tv.bgCard, border: `1px solid ${tv.borderSubtle}` }}>
          <p className="text-[11px]" style={{ color: tv.textDim }}>
            No PPIT enrichment data yet. This capability has not been linked to value stream activities.
          </p>
        </div>
      )}
    </>
  );
}
