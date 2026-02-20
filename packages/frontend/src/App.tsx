import { FileLoader } from "./components/FileLoader.tsx";
import { CanvasView } from "./components/CanvasView.tsx";
import { useCanvasStore } from "./store/canvas-store.ts";

function Sidebar() {
  const { scaffoldData, canvasViewModel, reset } = useCanvasStore();

  if (!scaffoldData) {
    return (
      <div className="flex flex-col gap-3 p-4 text-sm text-gray-500">
        <p>Load a scaffold to begin.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Scaffold
        </h3>
        <p className="mt-1 text-sm font-medium text-vcc-800">
          {scaffoldData.name}
        </p>
        <p className="text-xs text-gray-500">{scaffoldData.scaffoldId}</p>
      </div>

      {canvasViewModel?.summary && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Summary
          </h3>
          <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <dt className="text-gray-500">Activities</dt>
            <dd className="font-medium text-vcc-800">
              {canvasViewModel.summary.totalActivities}
            </dd>
            <dt className="text-gray-500">Roles</dt>
            <dd className="font-medium text-vcc-800">
              {canvasViewModel.summary.totalRoles}
            </dd>
            <dt className="text-gray-500">Capabilities</dt>
            <dd className="font-medium text-vcc-800">
              {canvasViewModel.summary.totalCapabilities}
            </dd>
            <dt className="text-gray-500">Metrics</dt>
            <dd className="font-medium text-vcc-800">
              {canvasViewModel.summary.totalMetrics}
            </dd>
            <dt className="text-gray-500">Controls</dt>
            <dd className="font-medium text-vcc-800">
              {canvasViewModel.summary.totalControls}
            </dd>
          </dl>
        </div>
      )}

      <button
        onClick={reset}
        className="mt-auto rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
      >
        Load different scaffold
      </button>
    </div>
  );
}

export default function App() {
  const { canvasViewModel } = useCanvasStore();

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-vcc-900 px-6 py-3">
        <h1 className="text-base font-semibold tracking-tight text-white">
          Value Cognition Canvas
        </h1>
        <span className="text-xs text-vcc-300">v0.1.0</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0 border-r border-gray-200 bg-white">
          <Sidebar />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">
          {canvasViewModel ? (
            <CanvasView />
          ) : (
            <div className="flex h-full items-center justify-center">
              <FileLoader />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
