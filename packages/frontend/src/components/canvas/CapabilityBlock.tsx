import type { ScaffoldData, ScaffoldActivity } from "../../types.ts";
import type { PPITLayer } from "./ppit.ts";
import { PPIT_LAYERS } from "./ppit.ts";

/* ── PPIT data shape from capabilityPPIT ───────────────────────────── */
interface CapPPIT {
  roleIds: string[];
  activities: string[];
  informationObjectIds: string[];
  technologyAppIds: string[];
}

/* ── Badge Counts (compact R3 A5 I2 T3 indicators) ────────────────── */

function CapabilityBadgeCounts({ ppit }: { ppit: CapPPIT | null }) {
  if (!ppit) return null;
  const counts: { b: string; n: number; c: string }[] = [
    { b: "R", n: ppit.roleIds?.length ?? 0, c: "text-blue-500 bg-blue-50" },
    { b: "A", n: ppit.activities?.length ?? 0, c: "text-violet-500 bg-violet-50" },
    { b: "I", n: ppit.informationObjectIds?.length ?? 0, c: "text-amber-600 bg-amber-50" },
    { b: "T", n: ppit.technologyAppIds?.length ?? 0, c: "text-emerald-500 bg-emerald-50" },
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
  scaffold,
  activity,
  ppitToggles,
  isFirst = false,
}: {
  capabilityId: string;
  scaffold: ScaffoldData;
  activity: ScaffoldActivity;
  ppitToggles: Record<PPITLayer, boolean>;
  isFirst?: boolean;
}) {
  const cap = scaffold.elements.capabilities[capabilityId];
  const anyToggle = PPIT_LAYERS.some((l) => ppitToggles[l]);

  // Read per-capability PPIT
  const ppitMap = (activity as Record<string, unknown>).capabilityPPIT as
    Record<string, CapPPIT> | undefined;
  const capPPIT = ppitMap?.[capabilityId] ?? null;

  // Resolve names
  const roles = ppitToggles.roles && capPPIT
    ? (capPPIT.roleIds ?? []).map((rid) => scaffold.elements.roles[rid]?.name ?? rid)
    : [];

  const activities = ppitToggles.activities && capPPIT
    ? (capPPIT.activities ?? [])
    : [];

  const infoObjs = ppitToggles.concepts && capPPIT
    ? (capPPIT.informationObjectIds ?? []).map((iid) => {
        const el = (scaffold.elements as Record<string, Record<string, { name?: string }>>).informationObjects;
        return el?.[iid]?.name ?? iid;
      })
    : [];

  const techApps = ppitToggles.applications && capPPIT
    ? (capPPIT.technologyAppIds ?? []).map((tid) => {
        const el = (scaffold.elements as Record<string, Record<string, { name?: string }>>).technologyApps;
        return el?.[tid]?.name ?? tid;
      })
    : [];

  const hasContent = roles.length > 0 || activities.length > 0 || infoObjs.length > 0 || techApps.length > 0;

  const capDescription = (cap as Record<string, unknown> | undefined)?.description as string | undefined;

  return (
    <div className="relative rounded border border-gray-200 bg-white px-2.5 py-1.5">
      {/* Capability name + badge counts */}
      <div className="flex items-start justify-between gap-1.5">
        <p className="min-w-0 text-xs font-medium text-gray-700">
          {cap?.name ?? capabilityId}
        </p>
        <div className="flex flex-shrink-0 items-center gap-1">
          {capDescription && (
            <div className="group/tip">
              <svg className="h-3 w-3 cursor-help text-gray-300 transition-colors group-hover/tip:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {/* Tooltip: below for first cap, above for others */}
              <div className={`pointer-events-none absolute inset-x-0 z-50 px-1 opacity-0 transition-opacity group-hover/tip:pointer-events-auto group-hover/tip:opacity-100 ${
                isFirst ? "top-full mt-1" : "bottom-full mb-1"
              }`}>
                <div className="rounded-md bg-blue-50 px-3 py-2 text-[10px] leading-relaxed text-blue-800 shadow-lg ring-1 ring-blue-200">
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
          {/* Activities — primary layer, stacked items */}
          {activities.length > 0 && (
            <div className="space-y-0.5">
              {activities.map((a, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="mt-[3px] h-1 w-1 flex-shrink-0 rounded-full bg-violet-300" />
                  <span className="text-[10px] leading-tight text-violet-600">{a}</span>
                </div>
              ))}
            </div>
          )}

          {/* Roles — secondary chips */}
          {roles.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {roles.map((r) => (
                <span key={r} className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] text-blue-600">
                  {r}
                </span>
              ))}
            </div>
          )}

          {/* Information Objects — secondary chips */}
          {infoObjs.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {infoObjs.map((i) => (
                <span key={i} className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] text-amber-700">
                  {i}
                </span>
              ))}
            </div>
          )}

          {/* Technology — secondary chips */}
          {techApps.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {techApps.map((t) => (
                <span key={t} className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] text-emerald-600">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
