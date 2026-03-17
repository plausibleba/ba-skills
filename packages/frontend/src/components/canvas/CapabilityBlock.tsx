// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import type { ScaffoldData, ScaffoldActivity } from "../../types.ts";
import type { PPITLayer } from "./ppit.ts";
import { PPIT_LAYERS } from "./ppit.ts";
import { humanizeId } from "../../lib/humanize-id.ts";
import { InlineEdit } from "./InlineEdit.tsx";
import { useCanvasStore } from "../../store/canvas-store.ts";
import { useThemeStore } from "../../store/theme-store.ts";
import { getTheme } from "../../theme.ts";

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
  const mt = getTheme(useThemeStore.getState().mode);
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
      style={{ border: `1px solid ${mt.borderSubtle}`, background: mt.bgSurface, color: mt.textSecondary }}
    />
  );
}

/* ── Badge Counts (compact R3 A5 I2 T3 indicators) ────────────────── */

function CapabilityBadgeCounts({ ppit }: { ppit: CapPPIT | null }) {
  if (!ppit) return null;
  const counts: { b: string; n: number; c: string }[] = [
    { b: "R", n: ppit.roleIds?.length ?? 0, c: "text-blue-300 bg-blue-500/15" },
    { b: "A", n: ppit.activities?.length ?? 0, c: "text-violet-300 bg-violet-500/15" },
    { b: "I", n: ppit.informationObjectIds?.length ?? 0, c: "text-amber-300 bg-amber-500/15" },
    { b: "T", n: ppit.technologyAppIds?.length ?? 0, c: "text-emerald-300 bg-emerald-500/15" },
  ];
  return (
    <div className="flex gap-0.5">
      {counts.map(({ b, n, c }) =>
        n > 0 ? (
          <span
            key={b}
            className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium ${c}`}
          >
            {b}{n}
          </span>
        ) : null,
      )}
    </div>
  );
}

/* ── Capability Block ──────────────────────────────────────────────── */

export function CapabilityBlock({
  capabilityId,
  activityId,
  scaffold,
  activity,
  ppitToggles,
  isFirst = false,
}: {
  capabilityId: string;
  activityId: string;
  scaffold: ScaffoldData;
  activity: ScaffoldActivity;
  ppitToggles: Record<PPITLayer, boolean>;
  isFirst?: boolean;
}) {
  const { updateCapabilityName, addInfoObjectToCapability, removeInfoObjectFromCapability, addTechAppToCapability, removeTechAppFromCapability, updatePpitActivity, addPpitActivity, removePpitActivity, addRoleToCapability, removeRoleFromCapability, addRole, scaffoldData } = useCanvasStore();
  const themeMode = useThemeStore((s) => s.mode);
  const t = getTheme(themeMode);
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

  // Resolve role IDs — v4 uses capPPIT.roleIds, v5 falls back to activity-level
  const roleIds: string[] = ppitToggles.roles
    ? capPPIT
      ? (capPPIT.roleIds ?? [])
      : ((activityRec.performedByRoleIds as string[] | undefined) ?? [])
    : [];
  const resolveRoleName = (rid: string) => {
    const roles = scaffoldData?.elements.roles ?? scaffold.elements.roles;
    return roles[rid]?.name ?? humanizeId(rid);
  };
  const rolesEditable = ppitToggles.roles && !!capPPIT;

  const activities = ppitToggles.activities
    ? capPPIT
      ? (capPPIT.activities ?? [])
      : [storeActivity.name ?? activity.name]
    : [];

  // Whether sub-activities come from capabilityPPIT (editable) or fallback (not editable)
  const activitiesEditable = ppitToggles.activities && !!capPPIT;

  // Resolve Info Objects — keep IDs for add/remove (read from store for freshness)
  const infoObjIds: string[] = ppitToggles.concepts
    ? capPPIT
      ? (capPPIT.informationObjectIds ?? [])
      : ((activityRec.informationObjectIds as string[] | undefined) ?? [])
    : [];
  const resolveInfoName = (iid: string) => {
    const src = scaffoldData?.elements ?? scaffold.elements;
    const el = (src as Record<string, Record<string, { name?: string }>>).informationObjects;
    return el?.[iid]?.name ?? humanizeId(iid);
  };

  // Resolve Tech Apps — keep IDs for add/remove (read from store for freshness)
  const techAppIds: string[] = ppitToggles.applications
    ? capPPIT
      ? (capPPIT.technologyAppIds ?? [])
      : ((activityRec.technologyAppIds as string[] | undefined) ?? [])
    : [];
  const resolveTechName = (tid: string) => {
    const src = scaffoldData?.elements ?? scaffold.elements;
    const el = (src as Record<string, Record<string, { name?: string }>>).technologyApps;
    return el?.[tid]?.name ?? humanizeId(tid);
  };

  const hasContent = roleIds.length > 0 || activities.length > 0 || infoObjIds.length > 0 || techAppIds.length > 0;

  const capDescription = (cap as Record<string, unknown> | undefined)?.description as string | undefined;

  return (
    <div className="relative rounded px-2.5 py-1.5" style={{ border: `1px solid ${t.borderSubtle}`, background: t.tileBg }}>
      {/* Capability name + badge counts */}
      <div className="flex items-start justify-between gap-1.5">
        <p className="min-w-0 text-xs font-medium" style={{ color: t.textSecondary }}>
          <InlineEdit
            value={cap?.name ?? humanizeId(capabilityId)}
            onSave={(name) => updateCapabilityName(capabilityId, name)}
            className="text-xs font-medium"
            inputClassName="text-xs font-medium text-gray-900 bg-white"
            style={{ color: t.textSecondary }}
          />
        </p>
        <div className="flex flex-shrink-0 items-center gap-1">
          {capDescription && (
            <div className="group/tip">
              <svg className="h-3 w-3 cursor-help transition-colors" style={{ color: t.textDim }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {/* Tooltip: below for first cap, above for others */}
              <div className={`pointer-events-none absolute inset-x-0 z-50 px-1 opacity-0 transition-opacity group-hover/tip:pointer-events-auto group-hover/tip:opacity-100 ${
                isFirst ? "top-full mt-1" : "bottom-full mb-1"
              }`}>
                <div className="rounded-md px-3 py-2 text-[10px] leading-relaxed shadow-lg" style={{ background: t.bgCard, border: `1px solid ${t.borderSubtle}`, color: t.textSecondary }}>
                  {capDescription}
                </div>
              </div>
            </div>
          )}
          {!anyToggle && <CapabilityBadgeCounts ppit={capPPIT} />}
        </div>
      </div>

      {anyToggle && hasContent && (
        <div className="mt-1.5 space-y-1.5">
          {/* Activities — primary layer, stacked items (editable when from capabilityPPIT) */}
          {ppitToggles.activities && (
            <div className="space-y-0.5">
              {activities.map((a, i) => (
                <div key={i} className="group/act flex items-start gap-1.5">
                  <span className="mt-[3px] h-1 w-1 flex-shrink-0 rounded-full bg-violet-400" />
                  {activitiesEditable ? (
                    <>
                      <InlineEdit
                        value={a}
                        onSave={(text) => updatePpitActivity(activityId, capabilityId, i, text)}
                        className="text-[10px] leading-tight text-violet-600"
                        inputClassName="text-[10px] text-violet-900"
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); removePpitActivity(activityId, capabilityId, i); }}
                        className="ml-auto hidden flex-shrink-0 text-[9px] text-violet-300 hover:text-red-500 group-hover/act:inline"
                        title="Remove"
                      >×</button>
                    </>
                  ) : (
                    <span className="text-[10px] leading-tight text-violet-300">{a}</span>
                  )}
                </div>
              ))}
              {activitiesEditable && (
                <MiniAddButton
                  placeholder="Activity…"
                  chipClass="text-violet-300 border-violet-500/30"
                  onAdd={(text) => addPpitActivity(activityId, capabilityId, text)}
                />
              )}
            </div>
          )}

          {/* Roles — editable chips at capability level */}
          {ppitToggles.roles && (
            <div className="flex flex-wrap gap-1">
              {roleIds.map((rid) => (
                <span key={rid} className="group/role inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px]" style={{ background: "rgba(74,158,218,0.18)", color: "#4a9eda" }}>
                  {resolveRoleName(rid)}
                  {rolesEditable && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeRoleFromCapability(activityId, capabilityId, rid); }}
                      className="ml-0.5 hidden text-blue-300 hover:text-red-500 group-hover/role:inline"
                      title="Remove"
                    >×</button>
                  )}
                </span>
              ))}
              {rolesEditable && (
                <MiniAddButton
                  placeholder="Role…"
                  chipClass="text-blue-300 border-blue-500/30"
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
                <span key={iid} className="group/io inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px]" style={{ background: "rgba(245,158,11,0.18)", color: "#fbbf24" }}>
                  {resolveInfoName(iid)}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeInfoObjectFromCapability(activityId, capabilityId, iid); }}
                    className="ml-0.5 hidden text-amber-400 hover:text-red-500 group-hover/io:inline"
                    title="Remove"
                  >×</button>
                </span>
              ))}
              <MiniAddButton
                placeholder="Info object…"
                chipClass="text-amber-300 border-amber-500/30"
                onAdd={(name) => addInfoObjectToCapability(activityId, capabilityId, name)}
              />
            </div>
          )}

          {/* Technology — chips with add/remove */}
          {ppitToggles.applications && (
            <div className="flex flex-wrap gap-1">
              {techAppIds.map((tid) => (
                <span key={tid} className="group/tech inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px]" style={{ background: "rgba(34,197,94,0.18)", color: "#4ade80" }}>
                  {resolveTechName(tid)}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeTechAppFromCapability(activityId, capabilityId, tid); }}
                    className="ml-0.5 hidden text-emerald-400 hover:text-red-500 group-hover/tech:inline"
                    title="Remove"
                  >×</button>
                </span>
              ))}
              <MiniAddButton
                placeholder="Tech app…"
                chipClass="text-emerald-300 border-emerald-500/30"
                onAdd={(name) => addTechAppToCapability(activityId, capabilityId, name)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
