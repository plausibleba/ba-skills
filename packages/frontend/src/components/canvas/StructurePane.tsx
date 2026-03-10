import { useState, useRef, useEffect } from "react";
import type { ScaffoldData, ScaffoldActivity } from "../../types.ts";
import { humanizeId } from "../../lib/humanize-id.ts";
import { InlineEdit } from "./InlineEdit.tsx";
import { useCanvasStore } from "../../store/canvas-store.ts";

/* ── Structure Pane — entry/exit states + metrics ──────────────────── */

export function StructurePane({
  activity,
  scaffold,
  isOpen,
  maxMetricRows,
}: {
  activity: ScaffoldActivity;
  scaffold: ScaffoldData;
  isOpen: boolean;
  maxMetricRows: number;
}) {
  const { updateOutcomeName, addRole, addRoleToActivity, removeRoleFromActivity, scaffoldData } = useCanvasStore();
  const [addingRole, setAddingRole] = useState(false);
  const [roleInput, setRoleInput] = useState("");
  const roleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingRole && roleInputRef.current) roleInputRef.current.focus();
  }, [addingRole]);

  if (!isOpen) return null;

  const preOutcome = activity.preOutcomeId
    ? scaffold.elements.outcomes[activity.preOutcomeId]
    : null;
  const postOutcome = activity.postOutcomeId
    ? scaffold.elements.outcomes[activity.postOutcomeId]
    : null;
  const metricIds = activity.metricIds ?? [];

  // Consistent metrics section height across columns
  // Each badge row ~22px, label ~16px, divider ~12px
  const metricsMinH = maxMetricRows > 0 ? 12 + 16 + maxMetricRows * 22 : 0;

  return (
    <div className="overflow-y-auto border-t border-white/20 px-4 pb-0.5 pt-2 scrollbar-thin">
      {/* Row 1: Entry State → Exit State */}
      {(preOutcome || postOutcome) && (
        <div className="flex items-start">
          <div className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-white/50">
              Entry State
            </span>
            {preOutcome && (
              <span className="line-clamp-2 rounded-md bg-white/15 px-2 py-0.5 text-center text-[10px] leading-snug text-white/90">
                <InlineEdit
                  value={preOutcome.name ?? ""}
                  onSave={(name) => updateOutcomeName(activity.preOutcomeId, name)}
                  className="text-[10px] text-white/90"
                  inputClassName="text-[10px] text-gray-900 bg-white"
                />
              </span>
            )}
          </div>
          <div className="flex items-center px-2 pt-4">
            <svg
              className="h-4 w-4 text-white/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
          <div className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-white/50">
              Exit State
            </span>
            {postOutcome && (
              <span className="line-clamp-2 rounded-md bg-white/15 px-2 py-0.5 text-center text-[10px] leading-snug text-white/90">
                <InlineEdit
                  value={postOutcome.name ?? ""}
                  onSave={(name) => updateOutcomeName(activity.postOutcomeId, name)}
                  className="text-[10px] text-white/90"
                  inputClassName="text-[10px] text-gray-900 bg-white"
                />
              </span>
            )}
          </div>
        </div>
      )}

      {/* Roles */}
      <div className="my-2 border-t border-dashed border-white/15" />
      <div className="flex flex-col items-center gap-1">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-white/50">
          Roles
        </span>
        <div className="flex flex-wrap justify-center gap-1">
          {(activity.performedByRoleIds ?? []).map((rid) => (
            <span key={rid} className="group/role inline-flex items-center gap-0.5 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-200">
              <InlineEdit
                value={scaffold.elements.roles[rid]?.name ?? humanizeId(rid)}
                onSave={(name) => {
                  const { updateRoleName } = useCanvasStore.getState();
                  updateRoleName(rid, name);
                }}
                className="text-[10px] text-blue-200"
                inputClassName="text-[10px] text-gray-900 bg-white"
              />
              <button
                onClick={() => removeRoleFromActivity(activity.id, rid)}
                title="Remove role"
                className="ml-0.5 hidden text-[9px] text-blue-300/60 hover:text-red-300 group-hover/role:inline"
              >
                ×
              </button>
            </span>
          ))}
          {!addingRole ? (
            <button
              onClick={() => setAddingRole(true)}
              className="rounded-full border border-dashed border-white/20 px-2 py-0.5 text-[9px] text-white/40 hover:border-white/40 hover:text-white/70 transition-colors"
            >
              + Role
            </button>
          ) : (
            <input
              ref={roleInputRef}
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const name = roleInput.trim();
                  if (name) {
                    // Check if role exists, reuse if so
                    const existing = scaffoldData ? Object.entries(scaffoldData.elements.roles).find(([, r]) => (r as any).name?.toLowerCase() === name.toLowerCase()) : null;
                    const rid = existing ? existing[0] : addRole(name);
                    if (rid) addRoleToActivity(activity.id, rid);
                  }
                  setRoleInput("");
                  setAddingRole(false);
                }
                if (e.key === "Escape") { setRoleInput(""); setAddingRole(false); }
              }}
              onBlur={() => {
                const name = roleInput.trim();
                if (name) {
                  const existing = scaffoldData ? Object.entries(scaffoldData.elements.roles).find(([, r]) => (r as any).name?.toLowerCase() === name.toLowerCase()) : null;
                  const rid = existing ? existing[0] : addRole(name);
                  if (rid) addRoleToActivity(activity.id, rid);
                }
                setRoleInput("");
                setAddingRole(false);
              }}
              placeholder="Role name…"
              className="rounded-full border border-white/30 bg-white/10 px-2 py-0.5 text-[10px] text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-300/50 w-24"
            />
          )}
        </div>
      </div>

      {/* Metrics */}
      {metricsMinH > 0 && (
        <div style={{ minHeight: metricsMinH }}>
          {metricIds.length > 0 && (
            <>
              <div className="my-2 border-t border-dashed border-white/15" />
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-white/50">
                  Metrics
                </span>
                <div className="flex flex-wrap justify-center gap-1">
                  {metricIds.map((mid) => (
                    <span key={mid} className="rounded-md bg-white/15 px-2.5 py-0.5 text-[10px] text-white/80">
                      {scaffold.elements.metrics[mid]?.name ?? humanizeId(mid)}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
