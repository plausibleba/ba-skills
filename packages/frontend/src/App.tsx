import { useCanvasStore } from "./store/canvas-store.ts";
import { FileLoader } from "./components/FileLoader.tsx";
import { CanvasView } from "./components/CanvasView.tsx";
import { StageWizard } from "./components/StageWizard.tsx";
import { UserGuidePanel } from "./components/UserGuidePanel.tsx";
import { NetworkView } from "./components/NetworkView.tsx";
import  DiscoveryIntake  from "./components/DiscoveryIntake.tsx";

export default function App() {
  const {
    scaffoldData,
    canvasViewModel,
    viewMode,
    selectedVsId,
    error,
    backToNetwork,
    goToIntake,
    loadScaffold,
    loadHeatmap,
  } = useCanvasStore();

  const isLoaded = !!scaffoldData;
  const isNetwork = viewMode === "network";
  const isStage = viewMode === "stage" && !!canvasViewModel;
  const isIntake = viewMode === "intake";

  // Get selected VS name for breadcrumb
  const selectedVsName = selectedVsId && scaffoldData
    ? ((scaffoldData.elements.valueStreams[selectedVsId] as { name?: string })?.name ?? selectedVsId)
    : null;

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-vcc-900 px-6 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-base font-semibold tracking-tight text-white">
            Value Cognition Canvas
          </h1>

          {/* Mode switch */}
          {isLoaded && (
            <div className="flex items-center rounded-lg bg-white/10 p-0.5">
              <button
                onClick={backToNetwork}
                className={`rounded-md px-3 py-1 text-[11px] font-medium transition-all ${
                  isNetwork
                    ? "bg-white/20 text-white shadow-sm"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                Network
              </button>
              <button
                disabled={!isStage}
                className={`rounded-md px-3 py-1 text-[11px] font-medium transition-all ${
                  isStage
                    ? "bg-white/20 text-white shadow-sm"
                    : "text-white/30"
                }`}
              >
                Stage
              </button>
            </div>
          )}

          {/* Breadcrumb */}
          {isStage && selectedVsName && scaffoldData && (
            <nav className="flex items-center gap-1.5 text-[11px]">
              <button
                onClick={backToNetwork}
                className="text-white/50 transition-colors hover:text-white/80"
              >
                {scaffoldData.name}
              </button>
              <svg className="h-3 w-3 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-medium text-white/90">{selectedVsName}</span>
            </nav>
          )}

          {/* Intake breadcrumb */}
          {isIntake && (
            <nav className="flex items-center gap-1.5 text-[11px]">
              <span className="font-medium text-white/90">New Discovery</span>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* New Discovery button — always visible */}
          <button
            onClick={goToIntake}
            className={`rounded-md border px-3 py-1 text-[11px] font-medium transition-all ${
              isIntake
                ? "border-white/30 bg-white/20 text-white"
                : "border-white/20 text-white/60 hover:border-white/30 hover:bg-white/10 hover:text-white"
            }`}
          >
            + New Discovery
          </button>
          <span className="text-xs text-vcc-300">v0.2.0</span>
        </div>
      </header>

      {/* Content selectors (stage view only) */}
      {isStage && <StageWizard />}

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Errors — only show outside intake view */}
        {!isIntake && error && !isLoaded && (
          <div className="m-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!isIntake && error && isLoaded && (
          <div className="mx-6 mt-4 flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5">
            <p className="text-xs text-amber-700">{error}</p>
            <button
              onClick={() => useCanvasStore.setState({ error: null })}
              className="ml-4 text-xs font-medium text-amber-500 hover:text-amber-700"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Views */}
        {isIntake && (
          <DiscoveryIntake
            onComplete={(bundle) => {
              const { scaffold, heatmaps = [] } = bundle;
              loadScaffold(scaffold ?? bundle);
              heatmaps.forEach((hm: any) => loadHeatmap(hm));
              backToNetwork();
            }}
          />
        )}

        {!isIntake && !isLoaded && (
          <div className="flex h-full flex-col items-center justify-center gap-8 p-6">
            <div className="max-w-md text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-vcc-50 p-4">
                  <svg className="h-8 w-8 text-vcc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <h3 className="mb-2 text-base font-semibold text-vcc-900">Start with a discovery</h3>
              <p className="mb-6 text-sm text-gray-500 leading-relaxed">
                Paste a client transcript or notes and the AI will build a structured operating model — value streams, friction points, and Salesforce solutions — in minutes.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={goToIntake}
                  className="flex items-center gap-2 rounded-lg bg-vcc-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-vcc-700"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Discovery
                </button>
                <span className="text-xs text-gray-400">or</span>
                <div className="flex flex-col items-center gap-1">
                  <FileLoader />
                  <span className="text-[10px] text-gray-400">Load a saved VCC Bundle (.json)</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6 rounded-xl border border-gray-100 bg-gray-50/60 px-8 py-4">
              {[
                { n: "1", label: "Run Discovery" },
                { n: "2", label: "Inspect Network" },
                { n: "3", label: "Assess Friction" },
                { n: "4", label: "Enrich Solutions" },
              ].map((step, i, arr) => (
                <div key={step.n} className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-vcc-100 text-[11px] font-bold text-vcc-600">{step.n}</div>
                    <span className="text-xs font-medium text-gray-600">{step.label}</span>
                  </div>
                  {i < arr.length - 1 && <span className="text-gray-300">→</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {!isIntake && isLoaded && isNetwork && <NetworkView />}
        {!isIntake && isStage && <CanvasView />}
      </main>
      <UserGuidePanel />
    </div>
  );
}
