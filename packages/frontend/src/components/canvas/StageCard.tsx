import type { ScaffoldData, FrictionObservation } from "../../types.ts";
import type { PPITLayer } from "./ppit.ts";
import type { CardToggleLayer } from "./useCanvasControls.ts";
import type { CardRegistry } from "../../types/cards.ts";
import type { InspectorTarget } from "./InspectorPanel.tsx";
import { getCardsForActivity } from "../../types/cards.ts";
import { getCapabilityIds } from "../../types.ts";
import { CapabilityBlock } from "./CapabilityBlock.tsx";
import { TransformationPane } from "./TransformationPane.tsx";
import { useCanvasStore } from "../../store/canvas-store.ts";
import { tv } from "../../theme.ts";
import { AddItemInput } from "./AddItemInput.tsx";

/* ── Stage Card ────────────────────────────────────────────────────── */

export function StageCard({
  activityId,
  scaffold,
  frictionObs,
  isBinding,
  isSelected,
  hasHeatmap,
  ppitToggles,
  cardToggles,
  cardRegistry,
  analyticsOpen,
  onFrictionClick,
  onCardClick,
  onInspect,
}: {
  activityId: string;
  scaffold: ScaffoldData;
  frictionObs: FrictionObservation[];
  isBinding: boolean;
  isSelected: boolean;
  hasHeatmap: boolean;
  ppitToggles: Record<PPITLayer, boolean>;
  cardToggles?: Record<CardToggleLayer, boolean>;
  cardRegistry?: CardRegistry | null;
  analyticsOpen: boolean;
  onFrictionClick: (activityId: string) => void;
  onCardClick?: (activityId: string) => void;
  onInspect?: (target: InspectorTarget) => void;
}) {
  const activity = scaffold.elements.activities[activityId];
  if (!activity) return null;

  const { userStoriesByActivity, setActivityStories, addCapabilityToActivity, removeCapabilityFromActivity } = useCanvasStore();

  const caps: string[] = getCapabilityIds(activity);
  const showSummary = false;

  // MVC card counts for this activity
  const anyCardToggle = cardToggles && (cardToggles.concepts || cardToggles.policies);
  const cardCounts = anyCardToggle && cardRegistry
    ? getCardsForActivity(activityId, cardRegistry, scaffold)
    : null;
  const showConceptBadge = cardToggles?.concepts && cardCounts && cardCounts.concepts.length > 0;
  const showPolicyBadge = cardToggles?.policies && cardCounts && cardCounts.policies.length > 0;

  return (
    <div
      onClick={() => {
        if (hasHeatmap && frictionObs.length > 0) onFrictionClick(activityId);
      }}
      className={`flex flex-1 flex-col overflow-hidden rounded-lg border transition-shadow ${
        hasHeatmap && frictionObs.length > 0
          ? "cursor-pointer hover:shadow-md"
          : ""
      } ${isSelected ? "ring-2 ring-vcc-500 ring-offset-2" : ""}`}
      style={isBinding ? { borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)" } : { borderColor: tv.borderSubtle, background: tv.bgCard }}
    >
      {isBinding && (
        <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ background: "rgba(239,68,68,0.1)" }}>
          <svg
            className="h-3 w-3 text-red-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-red-400">
            Binding Constraint
          </span>
        </div>
      )}

      {/* MVC Card badges — shown when card toggles are active */}
      {(showConceptBadge || showPolicyBadge) && (
        <div className="flex items-center gap-1.5 px-2.5 pt-2">
          {showConceptBadge && (
            <button
              onClick={(e) => { e.stopPropagation(); onCardClick?.(activityId); }}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors"
              style={{ border: "1px solid rgba(74,158,218,0.3)", background: "rgba(74,158,218,0.15)", color: "#4a9eda" }}
              title={`${cardCounts!.concepts.length} Concept Card${cardCounts!.concepts.length !== 1 ? "s" : ""}`}
            >
              <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
              {cardCounts!.concepts.length}C
            </button>
          )}
          {showPolicyBadge && (
            <button
              onClick={(e) => { e.stopPropagation(); onCardClick?.(activityId); }}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors"
              style={{ border: "1px solid rgba(224,91,138,0.3)", background: "rgba(224,91,138,0.15)", color: "#e05b8a" }}
              title={`${cardCounts!.policies.length} Policy Card${cardCounts!.policies.length !== 1 ? "s" : ""}`}
            >
              <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
              </svg>
              {cardCounts!.policies.length}P
            </button>
          )}
        </div>
      )}

      <div className="space-y-1 px-2.5 py-2">
        {caps.map((capId, idx) => (
          <div key={capId} className="group/cap relative">
            <CapabilityBlock
              capabilityId={capId}
              activityId={activityId}
              scaffold={scaffold}
              activity={activity}
              ppitToggles={ppitToggles}
              isFirst={idx === 0}
              onInspect={onInspect}
            />
            {/* Remove capability button */}
            <button
              onClick={(e) => { e.stopPropagation(); removeCapabilityFromActivity(activityId, capId); }}
              title="Remove capability"
              className="absolute -right-1 -top-1 z-10 hidden h-4 w-4 items-center justify-center rounded-full bg-red-100 text-[9px] text-red-500 hover:bg-red-200 group-hover/cap:flex"
            >
              ×
            </button>
          </div>
        ))}
        <AddItemInput
          label="Capability"
          onAdd={(name) => addCapabilityToActivity(activityId, name)}
        />
      </div>

      {/* Transformation pane: friction, controls (future: painpoints, ideas, requirements) */}
      <TransformationPane
        activity={activity}
        scaffold={scaffold}
        frictionObs={frictionObs}
        isBinding={isBinding}
        isVisible={analyticsOpen}
        summaryOnly={showSummary}
        onFrictionClick={() => onFrictionClick(activityId)}
        userStories={userStoriesByActivity[activityId] ?? []}
        onStoriesChange={(stories) => setActivityStories(activityId, stories)}
      />
    </div>
  );
}
