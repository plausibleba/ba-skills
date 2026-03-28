// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import type { ScaffoldData, ScaffoldActivity } from "../../types.ts";
import type { PPITLayer } from "./ppit.ts";
import { PPIT_LAYERS } from "./ppit.ts";
import { humanizeId } from "../../lib/humanize-id.ts";
import { InlineEdit } from "./InlineEdit.tsx";
import { useCanvasStore } from "../../store/canvas-store.ts";
import type { InspectorTarget } from "./InspectorPanel.tsx";
import { useThemeStore } from "../../store/theme-store.ts";
import { tv, getTheme } from "../../theme.ts";

/* ── PPIT data shape from capabilityPPIT ───────────────────────────── */
interface CapPPIT {
  roleIds: string[];
  activities: string[];
  informationObjectIds: string[];
  technologyAppIds: string[];
}

/* ── Mini add button — compact inline add for PPIT chips ──────────── */

function MiniAddButton({ placeholder, chipClass, onAdd }: {
  placeholder: string;
  chipClass: string;
  onAdd: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open && ref.current) ref.current.focus(); }, [open]);

  if (!open) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={`rounded-full border border-dashed px-1.5 py-0.5 text-[9px] opacity-60 hover:opacity-100 transition-opacity ${chipClass}`}
      >+</button>
    );
  }
  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          const n = value.trim();
          if (n) onAdd(n);
          setValue(""); setOpen(false);
        }
        if (e.key === "Escape") { setValue(""); setOpen(false); }
      }}
      onBlur={() => {
        const n = value.trim();
        if (n) onAdd(n);
        setValue(""); setOpen(false);
      }}
      placeholder={placeholder}
      className="rounded-full px-1.5 py-0.5 text-[9px] w-20 focus:outline-none focus:ring-1 focus:ring-blue-400"
      style={{ border: `1px solid ${tv.borderSubtle}`, background: tv.bgSurface, color: tv.textSecondary }}
    />
  );
}

/* ── Badge Counts (compact R3 A5 I2 T3 indicators) ────────────────── */

/* PPIT badge color sets — dark text for light mode, light text for dark mode */
const PPIT_BADGE_COLORS = {
  dark: [
    { b: "R", bg: "rgba(59,130,246,0.15)", fg: "#93c5fd" },
    { b: "A", bg: "rgba(139,92,246,0.15)", fg: "#c4b5fd" },
    { b: "I", bg: "rgba(245,158,11,0.15)", fg: "#fcd34d" },
    { b: "T", bg: "rgba(16,185,129,0.15)", fg: "#6ee7b7" },
  ],
  light: [
    { b: "R", bg: "rgba(59,130,246,0.12)", fg: "#2563eb" },
    { b: "A", bg: "rgba(139,92,246,0.12)", fg: "#7c3aed" },
    { b: "I", bg: "rgba(217,119,6,0.12)", fg: "#b45309" },
    { b: "T", bg: "rgba(5,150,105,0.12)", fg: "#047857" },
  ],
};

function CapabilityBadgeCounts({ ppit }: { ppit: CapPPIT | null }) {
  if (!ppit) return null;
  const isDark = useThemeStore((s) => s.mode) === "dark";
  const palette = isDark ? PPIT_BADGE_COLORS.dark : PPIT_BADGE_COLORS.light;
  const counts = [
    { ...palette[0], n: ppit.roleIds?.length ?? 0 },
    { ...palette[1], n: ppit.activities?.length ?? 0 },
    { ...palette[2], n: ppit.informationObjectIds?.length ?? 0 },
    { ...palette[3], n: ppit.technologyAppIds?.length ?? 0 },
  ];
  return (
    <div className="flex gap-0.5">
      {counts.map(({ b, n, bg, fg }) =>
        n > 0 ? (
          <span
            key={b}
            className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium"
            style={{ background: bg, color: fg }}
          >
            {b}{n}
          </span>
        ) : null,
      )}
    </div>
  );
}

/* ── Capability Block ──────────────────────────────────────────────── */

/* ── Theme-aware PPIT chip colours ─────────────────────────────────── */
const CHIP_COLORS = {
  dark: {
    role:  { bg: "rgba(74,158,218,0.18)", fg: "#93c5fd" },
    info:  { bg: "rgba(245,158,11,0.18)", fg: "#fcd34d" },
    tech:  { bg: "rgba(34,197,94,0.18)",  fg: "#4ade80" },
    activ: { bg: "rgba(139,92,246,0.15)", fg: "#c4b5fd" },
  },
  light: {
    role:  { bg: "rgba(59,130,246,0.12)", fg: "#2563eb" },
    info:  { bg: "rgba(217,119,6,0.12)",  fg: "#b45309" },
    tech:  { bg: "rgba(5,150,105,0.12)",  fg: "#047857" },
    activ: { bg: "rgba(139,92,246,0.12)", fg: "#7c3aed" },
  },
};

export function CapabilityBlock({
  capabilityId,
  activityId,
  scaffold,
  activity,
  ppitToggles,
  isFirst = false,
  onInspect,
}: {
  capabilityId: string;
  activityId: string;
  scaffold: ScaffoldData;
  activity: ScaffoldActivity;
  ppitToggles: Record<PPITLayer, boolean>;
  isFirst?: boolean;
  onInspect?: (target: InspectorTarget) => void;
}) {
  const { updateCapabilityName, addInfoObjectToCapability, removeInfoObjectFromCapability, addTechAppToCapability, removeTechAppFromCapability, updatePpitActivity, addPpitActivity, removePpitActivity, addRoleToCapability, removeRoleFromCapability, addRole, scaffoldData } = useCanvasStore();
  const isDark = useThemeStore((s) => s.mode) === "dark";
  const chipPalette = isDark ? CHIP_COLORS.dark : CHIP_COLORS.light;
  const cap = scaffold.elements.capabilities[capabilityId];
  const anyToggle = PPIT_LAYERS.some((l) => ppitToggles[l]);

  // Read per-capability PPIT directly from the STORE's scaffoldData (not the activity prop)
  // to ensure we always have the latest data after mutations.
  // Store mutations update scaffoldData but the prop chain may lag by one render.
  const storeActivity = scaffoldData?.elements.activities[activityId] ?? activity;
  const ppitMap = (storeActivity as Record<string, unknown>).capabilityPPIT as
    Record<string, CapPPIT> | undefined;
  const capPPIT = ppitMap?.[capabilityId] ?? null;
  const activityRec = storeActivity as Record<string, unknown>;

  // Resolve role IDs — ONLY show per-capability data from capabilityPPIT.
  // Before PPIT enrichment runs, activity-level fields (performedByRoleIds, informationObjectIds)
  // are NOT meaningful at the capability level — showing them creates a misleading impression
  // of per-capability mapping when the same data is repeated across every capability in the stage.
  const hasPPIT = !!capPPIT;
  const roleIds: string[] = ppitToggles.roles
    ? capPPIT
      ? (capPPIT.roleIds ?? [])
      : [] // No fallback — activity-level roles are not per-capability
    : [];
  const resolveRoleName = (rid: string) => {
    const roles = scaffoldData?.elements.roles ?? scaffold.elements.roles;
    return roles[rid]?.name ?? humanizeId(rid);
  };
  const rolesEditable = ppitToggles.roles && !!capPPIT;

  const activities = ppitToggles.activities
    ? capPPIT
      ? (capPPIT.activities ?? [])
      : [] // No fallback — activity name as sub-activity is misleading
    : [];

  // Whether sub-activities come from capabilityPPIT (editable) or fallback (not editable)
  const activitiesEditable = ppitToggles.activities && !!capPPIT;

  // Resolve Info Objects — ONLY from capabilityPPIT, no activity-level fallback
  const infoObjIds: string[] = ppitToggles.concepts
    ? capPPIT
      ? (capPPIT.informationObjectIds ?? [])
      : [] // No fallback — activity-level IOs are not per-capability
    : [];
  const resolveInfoName = (iid: string) => {
    const src = scaffoldData?.elements ?? scaffold.elements;
    const el = (src as Record<string, Record<string, { name?: string }>>).informationObjects;
    return el?.[iid]?.name ?? humanizeId(iid);
  };

  // Resolve Tech Apps — ONLY from capabilityPPIT, no activity-level fallback
  const techAppIds: string[] = ppitToggles.applications
    ? capPPIT
      ? (capPPIT.technologyAppIds ?? [])
      : [] // No fallback — activity-level tech is not per-capability
    : [];
  const resolveTechName = (tid: string) => {
    const src = scaffoldData?.elements ?? scaffold.elements;
    const el = (src as Record<string, Record<string, { name?: string }>>).technologyApps;
    return el?.[tid]?.name ?? humanizeId(tid);
  };

  const hasContent = roleIds.length > 0 || activities.length > 0 || infoObjIds.length > 0 || techAppIds.length > 0;

  const capDescription = (cap as Record<string, unknown> | undefined)?.description as string | undefined;

  return (
    <div className="relative rounded px-2.5 py-1.5" style={{ border: `1px solid ${tv.borderSubtle}`, background: tv.tileBg }}>
      {/* Capability name + badge counts */}
      <div className="flex items-start justify-between gap-1.5">
        <p className="min-w-0 text-xs font-medium" style={{ color: tv.textSecondary }}>
          <InlineEdit
            value={cap?.name ?? humanizeId(capabilityId)}
            onSave={(name) => updateCapabilityName(capabilityId, name)}
            className="text-xs font-medium"
            inputClassName="text-xs font-medium text-gray-900 bg-white"
            style={{ color: tv.textSecondary }}
          />
        </p>
        <div className="flex flex-shrink-0 items-center gap-1">
          {onInspect && (
            <button
              onClick={(e) => { e.stopPropagation(); onInspect({ kind: "capability", capabilityId, activityId }); }}
              className="rounded p-0.5 transition-colors hover:bg-black/10"
              style={{ color: tv.textDim }}
              title="Inspect capability"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          )}
          {capDescription && (
            <div className="group/tip">
              <svg className="h-3 w-3 cursor-help transition-colors" style={{ color: tv.textDim }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {/* Tooltip: below for first cap, above for others */}
              <div className={`pointer-events-none absolute inset-x-0 z-50 px-1 opacity-0 transition-opacity group-hover/tip:pointer-events-auto group-hover/tip:opacity-100 ${
                isFirst ? "top-full mt-1" : "bottom-full mb-1"
              }`}>
                <div className="rounded-md px-3 py-2 text-[10px] leading-relaxed shadow-lg" style={{ background: tv.bgCard, border: `1px solid ${tv.borderSubtle}`, color: tv.textSecondary }}>
                  {capDescription}
                </div>
              </div>
            </div>
          )}
          {!anyToggle && <CapabilityBadgeCounts ppit={capPPIT} />}
        </div>
      </div>

      {anyToggle && !hasPPIT && !hasContent && (
        <p className="mt-1 text-[9px] italic" style={{ color: tv.textDim }}>
          PPIT not yet mapped
        </p>
      )}

      {anyToggle && hasContent && (
        <div className="mt-1.5 space-y-1.5">
          {/* Activities — primary layer, stacked items (editable when from capabilityPPIT) */}
          {ppitToggles.activities && (
            <div className="space-y-0.5">
              {activities.map((a, i) => (
                <div key={i} className="group/act flex items-start gap-1.5">
                  <span className="mt-[3px] h-1 w-1 flex-shrink-0 rounded-full" style={{ background: chipPalette.activ.fg }} />
                  {activitiesEditable ? (
                    <>
                      <InlineEdit
                        value={a}
                        onSave={(text) => updatePpitActivity(activityId, capabilityId, i, text)}
                        className="text-[10px] leading-tight"
                        inputClassName="text-[10px] text-violet-900"
                        style={{ color: chipPalette.activ.fg }}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); removePpitActivity(activityId, capabilityId, i); }}
                        className="ml-auto hidden flex-shrink-0 text-[9px] hover:text-red-500 group-hover/act:inline"
                        style={{ color: chipPalette.activ.fg }}
                        title="Remove"
                      >×</button>
                    </>
                  ) : (
                    <span className="text-[10px] leading-tight" style={{ color: chipPalette.activ.fg }}>{a}</span>
                  )}
                </div>
              ))}
              {activitiesEditable && (
                <MiniAddButton
                  placeholder="Activity…"
                  chipClass={isDark ? "text-violet-300 border-violet-500/30" : "text-violet-600 border-violet-400/40"}
                  onAdd={(text) => addPpitActivity(activityId, capabilityId, text)}
                />
              )}
            </div>
          )}

          {/* Roles — editable chips at capability level */}
          {ppitToggles.roles && (
            <div className="flex flex-wrap gap-1">
              {roleIds.map((rid) => (
                <span key={rid} className="group/role inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] cursor-pointer" onClick={(e) => { e.stopPropagation(); onInspect?.({ kind: "role", roleId: rid }); }} style={{ background: chipPalette.role.bg, color: chipPalette.role.fg }}>
                  {resolveRoleName(rid)}
                  {rolesEditable && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeRoleFromCapability(activityId, capabilityId, rid); }}
                      className="ml-0.5 hidden hover:text-red-500 group-hover/role:inline"
                      style={{ color: chipPalette.role.fg }}
                      title="Remove"
                    >×</button>
                  )}
                </span>
              ))}
              {rolesEditable && (
                <MiniAddButton
                  placeholder="Role…"
                  chipClass={isDark ? "text-blue-300 border-blue-500/30" : "text-blue-600 border-blue-400/40"}
                  onAdd={(name) => {
                    // Reuse existing role by name or create new
                    const existing = scaffoldData ? Object.entries(scaffoldData.elements.roles).find(([, r]) => (r as any).name?.toLowerCase() === name.toLowerCase()) : null;
                    const rid = existing ? existing[0] : addRole(name);
                    if (rid) addRoleToCapability(activityId, capabilityId, rid);
                  }}
                />
              )}
            </div>
          )}

          {/* Information Objects — chips with add/remove */}
          {ppitToggles.concepts && (
            <div className="flex flex-wrap gap-1">
              {infoObjIds.map((iid) => (
                <span key={iid} className="group/io inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] cursor-pointer" onClick={(e) => { e.stopPropagation(); onInspect?.({ kind: "infoObject", infoObjectId: iid }); }} style={{ background: chipPalette.info.bg, color: chipPalette.info.fg }}>
                  {resolveInfoName(iid)}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeInfoObjectFromCapability(activityId, capabilityId, iid); }}
                    className="ml-0.5 hidden hover:text-red-500 group-hover/io:inline"
                    style={{ color: chipPalette.info.fg }}
                    title="Remove"
                  >×</button>
                </span>
              ))}
              <MiniAddButton
                placeholder="Info object…"
                chipClass={isDark ? "text-amber-300 border-amber-500/30" : "text-amber-700 border-amber-400/40"}
                onAdd={(name) => addInfoObjectToCapability(activityId, capabilityId, name)}
              />
            </div>
          )}

          {/* Technology — chips with add/remove */}
          {ppitToggles.applications && (
            <div className="flex flex-wrap gap-1">
              {techAppIds.map((tid) => (
                <span key={tid} className="group/tech inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] cursor-pointer" onClick={(e) => { e.stopPropagation(); onInspect?.({ kind: "techApp", techAppId: tid }); }} style={{ background: chipPalette.tech.bg, color: chipPalette.tech.fg }}>
                  {resolveTechName(tid)}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeTechAppFromCapability(activityId, capabilityId, tid); }}
                    className="ml-0.5 hidden hover:text-red-500 group-hover/tech:inline"
                    style={{ color: chipPalette.tech.fg }}
                    title="Remove"
                  >×</button>
                </span>
              ))}
              <MiniAddButton
                placeholder="Tech app…"
                chipClass={isDark ? "text-emerald-300 border-emerald-500/30" : "text-emerald-700 border-emerald-400/40"}
                onAdd={(name) => addTechAppToCapability(activityId, capabilityId, name)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
