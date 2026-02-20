import { useCanvasStore } from "../store/canvas-store.ts";
import type { CanvasColumn, ScaffoldData } from "../types.ts";

function ActivityCard({
  activityId,
  scaffold,
}: {
  activityId: string;
  scaffold: ScaffoldData;
}) {
  const activity = scaffold.elements.activities[activityId];
  const name = activity?.name ?? activityId;
  const roles = (activity?.performedByRoleIds ?? [])
    .map((rid) => scaffold.elements.roles[rid]?.name ?? rid)
    .slice(0, 3);

  return (
    <div className="rounded border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-sm font-medium text-vcc-800">{name}</p>
      {roles.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {roles.map((r) => (
            <span
              key={r}
              className="inline-block rounded-full bg-vcc-100 px-2 py-0.5 text-[10px] font-medium text-vcc-700"
            >
              {r}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Column({
  column,
  scaffold,
  index,
  total,
}: {
  column: CanvasColumn;
  scaffold: ScaffoldData;
  index: number;
  total: number;
}) {
  const metrics = column.aggregates?.metricIds?.length ?? 0;
  const controls = column.aggregates?.controlIds?.length ?? 0;

  return (
    <div className="flex min-w-[220px] max-w-[280px] flex-shrink-0 flex-col">
      {/* Column header */}
      <div className="rounded-t-lg border border-b-0 border-vcc-200 bg-vcc-700 px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-wider text-vcc-200">
            Stage {index + 1} of {total}
          </span>
        </div>
        <h3 className="mt-0.5 text-sm font-semibold text-white">
          {column.label}
        </h3>
      </div>

      {/* Activities */}
      <div className="flex flex-1 flex-col gap-2 rounded-b-lg border border-vcc-200 bg-gray-50 p-2">
        {column.activityIds.map((actId) => (
          <ActivityCard
            key={actId}
            activityId={actId}
            scaffold={scaffold}
          />
        ))}

        {/* Column footer stats */}
        {(metrics > 0 || controls > 0) && (
          <div className="mt-auto flex gap-3 border-t border-gray-200 pt-2 text-[10px] text-gray-500">
            {metrics > 0 && (
              <span>
                {metrics} metric{metrics !== 1 ? "s" : ""}
              </span>
            )}
            {controls > 0 && (
              <span>
                {controls} control{controls !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CanvasView() {
  const { canvasViewModel, scaffoldData, validationReport } =
    useCanvasStore();

  if (!canvasViewModel || !scaffoldData) {
    return null;
  }

  const vsName =
    scaffoldData.elements.valueStreams[canvasViewModel.valueStreamId]
      ?.name ?? canvasViewModel.valueStreamId;

  return (
    <div className="flex flex-col gap-4">
      {/* Canvas header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-vcc-900">{vsName}</h2>
          <p className="text-xs text-gray-500">
            {canvasViewModel.groupingMode} view
            {canvasViewModel.summary &&
              ` \u00b7 ${canvasViewModel.summary.totalActivities} activities \u00b7 ${canvasViewModel.summary.totalRoles} roles \u00b7 ${canvasViewModel.summary.totalCapabilities} capabilities`}
          </p>
        </div>
        {validationReport && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              validationReport.status === "Valid"
                ? "bg-green-100 text-green-700"
                : validationReport.status === "ValidWithWarnings"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
            }`}
          >
            {validationReport.status}
          </span>
        )}
      </div>

      {/* Horizontal scrolling column layout */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {canvasViewModel.columns.map((col, i) => (
          <Column
            key={col.columnId}
            column={col}
            scaffold={scaffoldData}
            index={i}
            total={canvasViewModel.columns.length}
          />
        ))}
      </div>

      {/* Validation warnings */}
      {validationReport &&
        validationReport.findings.length > 0 && (
          <details className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
            <summary className="cursor-pointer text-sm font-medium text-yellow-800">
              {validationReport.findings.length} validation finding
              {validationReport.findings.length !== 1 ? "s" : ""}
            </summary>
            <ul className="mt-2 space-y-1">
              {validationReport.findings.map((f, i) => (
                <li key={i} className="text-xs text-yellow-700">
                  <span className="font-mono font-medium">
                    [{f.ruleId}]
                  </span>{" "}
                  {f.message}
                </li>
              ))}
            </ul>
          </details>
        )}
    </div>
  );
}
