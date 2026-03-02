import { useCanvasStore } from "./store/canvas-store.ts";
import { FileLoader } from "./components/FileLoader.tsx";
import { CanvasView } from "./components/CanvasView.tsx";
import { ContentSelectors } from "./components/ContentSelectors.tsx";
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
      {isStage && <ContentSelectors />}

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
            onComplete={(scaffold) => {
              loadScaffold(scaffold);
              backToNetwork();
            }}
          />
        )}

        {!isIntake && !isLoaded && (
          <div className="flex h-full items-center justify-center p-6">
            <FileLoader />
          </div>
        )}

        {!isIntake && isLoaded && isNetwork && <NetworkView />}
        {!isIntake && isStage && <CanvasView />}
      </main>
    </div>
  );
}
