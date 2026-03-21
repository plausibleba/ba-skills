import { useMemo } from "react";
import type { ScaffoldData, ScaffoldActivity } from "../../types.ts";
import { humanizeId } from "../../lib/humanize-id.ts";
import { useThemeStore } from "../../store/theme-store.ts";
import { tv } from "../../theme.ts";

/* ── Inspector selection types ───────────────────────────────────────── */

export type InspectorTarget =
  | { kind: "stage"; activityId: string }
  | { kind: "capability"; capabilityId: string; activityId: string }
  | { kind: "role"; roleId: string }
  | { kind: "infoObject"; infoObjectId: string }
  | { kind: "techApp"; techAppId: string };

/* ── Colour palettes ─────────────────────────────────────────────────── */

const PALETTE = {
  dark: {
    role:  { bg: "rgba(59,130,246,0.15)",  fg: "#93c5fd", label: "People" },
    info:  { bg: "rgba(245,158,11,0.15)",  fg: "#fcd34d", label: "Information" },
    tech:  { bg: "rgba(34,197,94,0.15)",   fg: "#4ade80", label: "Technology" },
    activ: { bg: "rgba(139,92,246,0.15)",  fg: "#c4b5fd", label: "Process" },
    stage: { bg: "rgba(74,158,218,0.15)",  fg: "#93c5fd", label: "Stage" },
    cap:   { bg: "rgba(74,158,218,0.10)",  fg: "#7dd3fc", label: "Capability" },
  },
  light: {
    role:  { bg: "rgba(59,130,246,0.08)",  fg: "#2563eb", label: "People" },
    info:  { bg: "rgba(217,119,6,0.08)",   fg: "#b45309", label: "Information" },
    tech:  { bg: "rgba(5,150,105,0.08)",   fg: "#047857", label: "Technology" },
    activ: { bg: "rgba(139,92,246,0.08)",  fg: "#7c3aed", label: "Process" },
    stage: { bg: "rgba(59,130,246,0.08)",  fg: "#2563eb", label: "Stage" },
    cap:   { bg: "rgba(59,130,246,0.06)",  fg: "#1d4ed8", label: "Capability" },
  },
};

/* ── Section component ───────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: tv.textDim }}>
        {title}
      </h4>
      {children}
    </div>
  );
}

function ChipList({ items, color }: { items: { id: string; name: string }[]; color: { bg: string; fg: string } }) {
  if (items.length === 0) return <span className="text-[10px] italic" style={{ color: tv.textDim }}>None</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span key={item.id} className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: color.bg, color: color.fg }}>
          {item.name}
        </span>
      ))}
    </div>
  );
}

/* ── Cross-VS Usage derivation ───────────────────────────────────────── */

function deriveCrossVsUsage(
  elementId: string,
  elementKind: "capability" | "role" | "infoObject" | "techApp",
  scaffold: ScaffoldData,
): { vsId: string; vsName: string; activityId: string; activityName: string; capabilityName?: string }[] {
  const results: { vsId: string; vsName: string; activityId: string; activityName: string; capabilityName?: string }[] = [];
  const vsEntries = Object.entries(scaffold.elements.valueStreams) as [string, { name?: string }][];

  for (const [vsId, vs] of vsEntries) {
    // Walk all activities (linked list or activityIds)
    const activityIds = collectVsActivityIds(vsId, scaffold);
    for (const actId of activityIds) {
      const act = scaffold.elements.activities[actId] as ScaffoldActivity & Record<string, unknown>;
      if (!act) continue;

      if (elementKind === "capability") {
        const caps = (act.enabledByCapabilityIds ?? act.requiresCapabilityIds ?? []) as string[];
        if (caps.includes(elementId)) {
          results.push({
            vsId,
            vsName: vs?.name ?? humanizeId(vsId),
            activityId: actId,
            activityName: act.name ?? humanizeId(actId),
          });
        }
      } else {
        // Check capabilityPPIT for role/info/tech
        const ppitMap = act.capabilityPPIT as Record<string, { roleIds?: string[]; informationObjectIds?: string[]; technologyAppIds?: string[] }> | undefined;
        const caps = (act.enabledByCapabilityIds ?? act.requiresCapabilityIds ?? []) as string[];
        for (const capId of caps) {
          const ppit = ppitMap?.[capId];
          let found = false;
          if (elementKind === "role") {
            found = !!(ppit?.roleIds?.includes(elementId) || (!ppit && (act.performedByRoleIds as string[] | undefined)?.includes(elementId)));
          } else if (elementKind === "infoObject") {
            found = !!(ppit?.informationObjectIds?.includes(elementId));
          } else if (elementKind === "techApp") {
            found = !!(ppit?.technologyAppIds?.includes(elementId));
          }
          if (found) {
            const cap = scaffold.elements.capabilities[capId];
            results.push({
              vsId,
              vsName: vs?.name ?? humanizeId(vsId),
              activityId: actId,
              activityName: act.name ?? humanizeId(actId),
              capabilityName: cap?.name ?? humanizeId(capId),
            });
            break; // one match per activity is enough
          }
        }
      }
    }
  }
  return results;
}

function collectVsActivityIds(vsId: string, scaffold: ScaffoldData): string[] {
  const vs = scaffold.elements.valueStreams[vsId] as unknown as Record<string, unknown>;
  if (!vs) return [];
  // v5: chain walk
  if (vs.activityChainHead) {
    const ids: string[] = [];
    let cur = vs.activityChainHead as string;
    const seen = new Set<string>();
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      ids.push(cur);
      const act = scaffold.elements.activities[cur] as unknown as Record<string, unknown> | undefined;
      cur = (act?.nextActivityId as string) ?? "";
    }
    return ids;
  }
  // v4: activityIds array
  if (Array.isArray(vs.activityIds)) return vs.activityIds as string[];
  return [];
}

/* ── Inspector Panel ─────────────────────────────────────────────────── */

export function InspectorPanel({
  target,
  scaffold,
  onClose,
}: {
  target: InspectorTarget;
  scaffold: ScaffoldData;
  onClose: () => void;
}) {
  const isDark = useThemeStore((s) => s.mode) === "dark";
  const pal = isDark ? PALETTE.dark : PALETTE.light;

  return (
    <div className="flex h-full flex-col overflow-hidden border-l" style={{ borderColor: tv.borderSubtle, background: tv.bgSurface }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${tv.borderSubtle}` }}>
        <div className="flex items-center gap-2">
          <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
            style={{ background: pal[target.kind === "stage" ? "stage" : target.kind === "capability" ? "cap" : target.kind === "role" ? "role" : target.kind === "infoObject" ? "info" : "tech"].bg,
                     color: pal[target.kind === "stage" ? "stage" : target.kind === "capability" ? "cap" : target.kind === "role" ? "role" : target.kind === "infoObject" ? "info" : "tech"].fg }}>
            {pal[target.kind === "stage" ? "stage" : target.kind === "capability" ? "cap" : target.kind === "role" ? "role" : target.kind === "infoObject" ? "info" : "tech"].label}
          </span>
          <span className="text-[11px] font-medium" style={{ color: tv.textPrimary }}>Inspector</span>
        </div>
        <button onClick={onClose} className="rounded p-1 transition-colors hover:bg-black/10" style={{ color: tv.textDim }}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin">
        {target.kind === "stage" && <StageInspector activityId={target.activityId} scaffold={scaffold} pal={pal} />}
        {target.kind === "capability" && <CapabilityInspector capabilityId={target.capabilityId} activityId={target.activityId} scaffold={scaffold} pal={pal} />}
        {target.kind === "role" && <RoleInspector roleId={target.roleId} scaffold={scaffold} pal={pal} />}
        {target.kind === "infoObject" && <InfoObjectInspector infoObjectId={target.infoObjectId} scaffold={scaffold} pal={pal} />}
        {target.kind === "techApp" && <TechAppInspector techAppId={target.techAppId} scaffold={scaffold} pal={pal} />}
      </div>
    </div>
  );
}

/* ── Stage Inspector ─────────────────────────────────────────────────── */

type Pal = typeof PALETTE.dark;

function StageInspector({ activityId, scaffold, pal }: { activityId: string; scaffold: ScaffoldData; pal: Pal }) {
  const act = scaffold.elements.activities[activityId] as ScaffoldActivity & Record<string, unknown>;
  if (!act) return null;

  const preOutcome = act.preOutcomeId ? scaffold.elements.outcomes[act.preOutcomeId] : null;
  const postOutcome = act.postOutcomeId ? scaffold.elements.outcomes[act.postOutcomeId] : null;
  const caps = ((act.enabledByCapabilityIds ?? act.requiresCapabilityIds ?? []) as string[])
    .map(id => ({ id, name: scaffold.elements.capabilities[id]?.name ?? humanizeId(id) }));
  const ppitMap = act.capabilityPPIT as Record<string, { roleIds?: string[]; activities?: string[]; informationObjectIds?: string[]; technologyAppIds?: string[] }> | undefined;

  // Aggregate all PPIT items across all capabilities
  const allRoles = new Set<string>();
  const allInfoObjs = new Set<string>();
  const allTechApps = new Set<string>();
  const allSubActivities: string[] = [];

  if (ppitMap) {
    for (const capId of Object.keys(ppitMap)) {
      const p = ppitMap[capId];
      p.roleIds?.forEach(r => allRoles.add(r));
      p.informationObjectIds?.forEach(i => allInfoObjs.add(i));
      p.technologyAppIds?.forEach(t => allTechApps.add(t));
      p.activities?.forEach(a => allSubActivities.push(a));
    }
  }
  // Fallback to activity-level
  if (allRoles.size === 0) {
    ((act.performedByRoleIds as string[] | undefined) ?? []).forEach(r => allRoles.add(r));
  }

  const roles = Array.from(allRoles).map(id => ({
    id, name: scaffold.elements.roles[id]?.name ?? humanizeId(id),
  }));
  const infoObjs = Array.from(allInfoObjs).map(id => ({
    id, name: ((scaffold.elements as Record<string, Record<string, { name?: string }>>).informationObjects?.[id]?.name ?? humanizeId(id)),
  }));
  const techApps = Array.from(allTechApps).map(id => ({
    id, name: ((scaffold.elements as Record<string, Record<string, { name?: string }>>).technologyApps?.[id]?.name ?? humanizeId(id)),
  }));
  const metrics = (act.metricIds ?? []).map(id => ({
    id, name: scaffold.elements.metrics[id]?.name ?? humanizeId(id),
  }));

  const description = (act as unknown as Record<string, unknown>).description as string | undefined;

  return (
    <>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: tv.textPrimary }}>{act.name ?? humanizeId(activityId)}</h3>
        {description && <p className="mt-1 text-[11px] leading-relaxed" style={{ color: tv.textSecondary }}>{description}</p>}
      </div>

      {/* Lifecycle */}
      {(preOutcome || postOutcome) && (
        <Section title="Record Lifecycle">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="rounded px-2 py-0.5" style={{ background: pal.stage.bg, color: pal.stage.fg }}>
              {preOutcome?.name ?? "—"}
            </span>
            <svg className="h-3 w-3" style={{ color: tv.textDim }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
            <span className="rounded px-2 py-0.5" style={{ background: pal.stage.bg, color: pal.stage.fg }}>
              {postOutcome?.name ?? "—"}
            </span>
          </div>
        </Section>
      )}

      {/* Capabilities */}
      <Section title={`Capabilities (${caps.length})`}>
        <ChipList items={caps} color={pal.cap} />
      </Section>

      {/* PPIT summary */}
      <Section title={`People (${roles.length})`}>
        <ChipList items={roles} color={pal.role} />
      </Section>

      {allSubActivities.length > 0 && (
        <Section title={`Sub-Activities (${allSubActivities.length})`}>
          <div className="space-y-0.5">
            {allSubActivities.map((a, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="mt-[3px] h-1 w-1 flex-shrink-0 rounded-full" style={{ background: pal.activ.fg }} />
                <span className="text-[10px] leading-tight" style={{ color: pal.activ.fg }}>{a}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title={`Information (${infoObjs.length})`}>
        <ChipList items={infoObjs} color={pal.info} />
      </Section>

      <Section title={`Technology (${techApps.length})`}>
        <ChipList items={techApps} color={pal.tech} />
      </Section>

      {metrics.length > 0 && (
        <Section title={`Metrics (${metrics.length})`}>
          <ChipList items={metrics} color={pal.stage} />
        </Section>
      )}
    </>
  );
}

/* ── Capability Inspector ────────────────────────────────────────────── */

function CapabilityInspector({ capabilityId, activityId, scaffold, pal }: { capabilityId: string; activityId: string; scaffold: ScaffoldData; pal: Pal }) {
  const cap = scaffold.elements.capabilities[capabilityId];
  const act = scaffold.elements.activities[activityId] as ScaffoldActivity & Record<string, unknown>;
  const ppitMap = act ? (act.capabilityPPIT as Record<string, { roleIds?: string[]; activities?: string[]; informationObjectIds?: string[]; technologyAppIds?: string[] }> | undefined) : undefined;
  const ppit = ppitMap?.[capabilityId];

  const description = (cap as unknown as Record<string, unknown> | undefined)?.description as string | undefined;

  const roles = (ppit?.roleIds ?? (act?.performedByRoleIds as string[] | undefined) ?? [])
    .map(id => ({ id, name: scaffold.elements.roles[id]?.name ?? humanizeId(id) }));
  const subActivities = ppit?.activities ?? [];
  const infoObjs = (ppit?.informationObjectIds ?? [])
    .map(id => ({ id, name: ((scaffold.elements as Record<string, Record<string, { name?: string }>>).informationObjects?.[id]?.name ?? humanizeId(id)) }));
  const techApps = (ppit?.technologyAppIds ?? [])
    .map(id => ({ id, name: ((scaffold.elements as Record<string, Record<string, { name?: string }>>).technologyApps?.[id]?.name ?? humanizeId(id)) }));

  // Cross-VS usage
  const crossVs = useMemo(() => deriveCrossVsUsage(capabilityId, "capability", scaffold), [capabilityId, scaffold]);

  return (
    <>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: tv.textPrimary }}>{cap?.name ?? humanizeId(capabilityId)}</h3>
        {description && <p className="mt-1 text-[11px] leading-relaxed" style={{ color: tv.textSecondary }}>{description}</p>}
        <p className="mt-1 text-[10px]" style={{ color: tv.textDim }}>
          on stage: <span style={{ color: tv.textSecondary }}>{act?.name ?? humanizeId(activityId)}</span>
        </p>
      </div>

      <Section title={`People (${roles.length})`}>
        <ChipList items={roles} color={pal.role} />
      </Section>

      {subActivities.length > 0 && (
        <Section title={`Sub-Activities (${subActivities.length})`}>
          <div className="space-y-0.5">
            {subActivities.map((a, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="mt-[3px] h-1 w-1 flex-shrink-0 rounded-full" style={{ background: pal.activ.fg }} />
                <span className="text-[10px] leading-tight" style={{ color: pal.activ.fg }}>{a}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title={`Information (${infoObjs.length})`}>
        <ChipList items={infoObjs} color={pal.info} />
      </Section>

      <Section title={`Technology (${techApps.length})`}>
        <ChipList items={techApps} color={pal.tech} />
      </Section>

      {/* Cross-VS Usage */}
      {crossVs.length > 1 && (
        <Section title={`Shared Across ${new Set(crossVs.map(u => u.vsId)).size} Value Streams`}>
          <div className="space-y-1">
            {crossVs.map((u, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px]">
                <span className="rounded px-1.5 py-0.5" style={{ background: pal.cap.bg, color: pal.cap.fg }}>{u.vsName}</span>
                <span style={{ color: tv.textDim }}>→</span>
                <span style={{ color: tv.textSecondary }}>{u.activityName}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

/* ── Role Inspector ──────────────────────────────────────────────────── */

function RoleInspector({ roleId, scaffold, pal }: { roleId: string; scaffold: ScaffoldData; pal: Pal }) {
  const role = scaffold.elements.roles[roleId];
  const crossVs = useMemo(() => deriveCrossVsUsage(roleId, "role", scaffold), [roleId, scaffold]);
  const uniqueVs = new Set(crossVs.map(u => u.vsId));

  return (
    <>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: tv.textPrimary }}>{role?.name ?? humanizeId(roleId)}</h3>
        <p className="mt-1 text-[10px]" style={{ color: tv.textDim }}>
          Participates in {crossVs.length} activit{crossVs.length !== 1 ? "ies" : "y"} across {uniqueVs.size} value stream{uniqueVs.size !== 1 ? "s" : ""}
        </p>
      </div>

      <Section title="Usage Map">
        <div className="space-y-1">
          {crossVs.map((u, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]">
              <span className="rounded px-1.5 py-0.5" style={{ background: pal.stage.bg, color: pal.stage.fg }}>{u.vsName}</span>
              <span style={{ color: tv.textDim }}>→</span>
              <span style={{ color: tv.textSecondary }}>{u.activityName}</span>
              {u.capabilityName && (
                <>
                  <span style={{ color: tv.textDim }}>·</span>
                  <span className="italic" style={{ color: tv.textDim }}>{u.capabilityName}</span>
                </>
              )}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

/* ── Info Object Inspector ───────────────────────────────────────────── */

function InfoObjectInspector({ infoObjectId, scaffold, pal }: { infoObjectId: string; scaffold: ScaffoldData; pal: Pal }) {
  const el = ((scaffold.elements as Record<string, Record<string, { name?: string }>>).informationObjects)?.[infoObjectId];
  const crossVs = useMemo(() => deriveCrossVsUsage(infoObjectId, "infoObject", scaffold), [infoObjectId, scaffold]);
  const uniqueVs = new Set(crossVs.map(u => u.vsId));

  return (
    <>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: tv.textPrimary }}>{el?.name ?? humanizeId(infoObjectId)}</h3>
        <p className="mt-1 text-[10px]" style={{ color: tv.textDim }}>
          Referenced in {crossVs.length} activit{crossVs.length !== 1 ? "ies" : "y"} across {uniqueVs.size} value stream{uniqueVs.size !== 1 ? "s" : ""}
        </p>
      </div>

      <Section title="Usage Map">
        <div className="space-y-1">
          {crossVs.map((u, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]">
              <span className="rounded px-1.5 py-0.5" style={{ background: pal.stage.bg, color: pal.stage.fg }}>{u.vsName}</span>
              <span style={{ color: tv.textDim }}>→</span>
              <span style={{ color: tv.textSecondary }}>{u.activityName}</span>
              {u.capabilityName && (
                <>
                  <span style={{ color: tv.textDim }}>·</span>
                  <span className="italic" style={{ color: tv.textDim }}>{u.capabilityName}</span>
                </>
              )}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

/* ── Tech App Inspector ──────────────────────────────────────────────── */

function TechAppInspector({ techAppId, scaffold, pal }: { techAppId: string; scaffold: ScaffoldData; pal: Pal }) {
  const el = ((scaffold.elements as Record<string, Record<string, { name?: string }>>).technologyApps)?.[techAppId];
  const crossVs = useMemo(() => deriveCrossVsUsage(techAppId, "techApp", scaffold), [techAppId, scaffold]);
  const uniqueVs = new Set(crossVs.map(u => u.vsId));

  return (
    <>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: tv.textPrimary }}>{el?.name ?? humanizeId(techAppId)}</h3>
        <p className="mt-1 text-[10px]" style={{ color: tv.textDim }}>
          Used in {crossVs.length} activit{crossVs.length !== 1 ? "ies" : "y"} across {uniqueVs.size} value stream{uniqueVs.size !== 1 ? "s" : ""}
        </p>
      </div>

      <Section title="Usage Map">
        <div className="space-y-1">
          {crossVs.map((u, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]">
              <span className="rounded px-1.5 py-0.5" style={{ background: pal.stage.bg, color: pal.stage.fg }}>{u.vsName}</span>
              <span style={{ color: tv.textDim }}>→</span>
              <span style={{ color: tv.textSecondary }}>{u.activityName}</span>
              {u.capabilityName && (
                <>
                  <span style={{ color: tv.textDim }}>·</span>
                  <span className="italic" style={{ color: tv.textDim }}>{u.capabilityName}</span>
                </>
              )}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
