import { useEffect, useCallback, useRef, useState } from "react";
import { useCanvasStore } from "./store/canvas-store.ts";
import { useAuthStore } from "./store/auth-store.ts";
import { useProjectStore } from "./store/project-store.ts";
import { SideNav } from "./components/SideNav.tsx";
import { FileLoader } from "./components/FileLoader.tsx";
import { CanvasView } from "./components/CanvasView.tsx";
import { StageWizard } from "./components/StageWizard.tsx";
import { UserGuidePanel } from "./components/UserGuidePanel.tsx";
import { NetworkView } from "./components/NetworkView.tsx";
import { CapabilityMapView } from "./components/CapabilityMapView.tsx";
import { ConceptGraphView } from "./components/ConceptGraphView.tsx";
import { FrictionView } from "./components/FrictionView.tsx";
import DiscoveryIntake from "./components/DiscoveryIntake.tsx";
import { LoginPage } from "./components/LoginPage.tsx";
import { AccountSettings } from "./components/AccountSettings.tsx";
import { ProjectList } from "./components/ProjectList.tsx";
import { autoSaveToProject } from "./utils/auto-save.ts";
import { VersionBadge } from "./components/ChangelogModal.tsx";
import { UpsellModalProvider, useUpsellModal } from "./components/UpsellModal.tsx";
import { RefinementExportModal } from "./components/RefinementExport.tsx";
import { ImportView } from "./components/ImportView.tsx";
import { WorkbenchView } from "./components/WorkbenchView.tsx";
import { EnrichOverview } from "./components/enrichment/EnrichOverview";
import { EnrichStructureView } from "./components/enrichment/EnrichStructureView";
import { EnrichMappingView } from "./components/enrichment/EnrichMappingView";
import { EnrichFrictionView } from "./components/enrichment/EnrichFrictionView";
import { EnrichAssessmentView } from "./components/enrichment/EnrichAssessmentView";
import { EnrichCustomView } from "./components/enrichment/EnrichCustomView";
import { useWorkbenchStore } from "./store/workbench-store.ts";
import { DevTierSwitcher } from "./components/DevTierSwitcher.tsx";
import { extractClaimFromURL, consumePendingClaim } from "./utils/bundle-claim.ts";
import { useTierStore } from "./store/tier-store.ts";
import { trackEvent, startHeartbeat, stopHeartbeat } from "./utils/analytics.ts";

export default function App() {
  const { user, loading: authLoading, isLocalMode, initialize: initAuth } = useAuthStore();
  const { saving } = useProjectStore();
  const initializeTier = useTierStore((s) => s.initialize);
  const {
    scaffoldData,
    canvasViewModel,
    viewMode,
    enrichSection,
    error,
    backToNetwork,
    goToIntake,
    loading,
    loadScaffold,
    loadHeatmap,
  } = useCanvasStore();

  const [showRefinementExport, setShowRefinementExport] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showSignUpNudge, setShowSignUpNudge] = useState(false);
  const [claimImporting, setClaimImporting] = useState(false);
  const claimProcessed = useRef(false);
  const checkoutHandled = useRef(false);
  const [checkoutBanner, setCheckoutBanner] = useState<"success" | "cancelled" | null>(null);

  // Initialize auth on mount
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Initialize tier store when user is authenticated
  useEffect(() => {
    if (user?.id) {
      initializeTier(user.id);
    }
  }, [user?.id, initializeTier]);

  // Session heartbeat — track active usage time for authenticated users
  useEffect(() => {
    if (user) {
      startHeartbeat();
      trackEvent("sign_in");
    }
    return () => stopHeartbeat();
  }, [user?.id]);

  // Handle password reset redirect (?reset=true) — open Account Settings on Security tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") !== "true" || !user) return;
    setShowAccountSettings(true);
    params.delete("reset");
    const clean = params.toString();
    window.history.replaceState({}, "", clean ? `?${clean}` : window.location.pathname);
  }, [user]);

  // Handle Stripe checkout redirect (?checkout=success or ?checkout=cancelled)
  useEffect(() => {
    if (checkoutHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("checkout");
    if (!status) return;

    checkoutHandled.current = true;

    if (status === "success") {
      setCheckoutBanner("success");
      // Re-fetch tier from Supabase — webhook should have updated it
      if (user?.id) {
        setTimeout(() => initializeTier(user.id), 1500);
      }
      // Auto-dismiss after 8 seconds
      setTimeout(() => setCheckoutBanner(null), 8000);
    } else if (status === "cancelled") {
      setCheckoutBanner("cancelled");
      setTimeout(() => setCheckoutBanner(null), 5000);
    }

    // Clean URL params
    params.delete("checkout");
    params.delete("session_id");
    const clean = params.toString();
    window.history.replaceState({}, "", clean ? `?${clean}` : window.location.pathname);
  }, [user?.id, initializeTier]);

  // Extract claim token from URL on first load (before auth redirect clears it)
  useEffect(() => {
    extractClaimFromURL();
  }, []);

  // After auth completes, check for a pending claim and auto-import
  useEffect(() => {
    if (authLoading || isLocalMode || !user || claimProcessed.current) return;
    claimProcessed.current = true;

    void (async () => {
      const payload = await consumePendingClaim();
      if (!payload) return;

      setClaimImporting(true);
      try {
        const bundle = payload.bundle as Record<string, any>;
        const { isPlausibleBABundle, normaliseBundle } = await import("./utils/bundle-import.ts");
        const store = useCanvasStore.getState();

        // Import the bundle — same logic as drag-drop / file import
        if (bundle.bundleVersion && bundle.scaffold) {
          // VCC-native bundle format
          await store.loadScaffold(bundle.scaffold);
          if (bundle.heatmaps) {
            for (const hm of bundle.heatmaps as any[]) await store.loadHeatmap(hm);
          }
          if (bundle.userStoriesByActivity) {
            for (const [actId, stories] of Object.entries(bundle.userStoriesByActivity)) {
              store.setActivityStories(actId, stories as any[]);
            }
          }
          if (bundle.cardRegistry) store.loadCards(bundle.cardRegistry);
        } else if (isPlausibleBABundle(bundle)) {
          // PlausibleBA ba-skills-bundle format
          const scaffold = normaliseBundle(bundle);
          await store.loadScaffold(scaffold);
        } else if (bundle.scaffoldId && bundle.elements) {
          // Raw scaffold
          await store.loadScaffold(bundle as any);
        } else {
          console.warn("[VCC Claim] Unrecognized bundle format");
          setClaimImporting(false);
          return;
        }

        store.backToNetwork();
        // Create project and save to Supabase
        await autoSaveToProject({ cardRegistry: bundle.cardRegistry });
        console.log("[VCC Claim] Bundle imported successfully from Canvas handoff");
      } catch (err) {
        console.error("[VCC Claim] Auto-import failed:", err);
      } finally {
        setClaimImporting(false);
      }
    })();
  }, [authLoading, isLocalMode, user]);

  // Global drag-drop interceptor: prevent browser from opening dropped files
  // and route .json files to the bundle import logic
  const handleGlobalDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (!file) return;
    if (file.name.endsWith(".json")) {
      void (async () => {
        try {
          const text = await file.text();
          const json = JSON.parse(text);
          const { isPlausibleBABundle, normaliseBundle } = await import("./utils/bundle-import.ts");
          const store = useCanvasStore.getState();
          if (json.bundleVersion && json.scaffold) {
            await store.loadScaffold(json.scaffold);
            if (json.heatmaps) for (const hm of json.heatmaps) await store.loadHeatmap(hm);
            if (json.userStoriesByActivity) {
              for (const [actId, stories] of Object.entries(json.userStoriesByActivity)) {
                store.setActivityStories(actId, stories as any[]);
              }
            }
            if (json.cardRegistry) store.loadCards(json.cardRegistry);
          } else if (isPlausibleBABundle(json)) {
            const scaffold = normaliseBundle(json);
            await store.loadScaffold(scaffold);
          } else if (json.scaffoldId && json.elements) {
            await store.loadScaffold(json);
          } else {
            console.warn("[App] Unrecognized JSON file dropped");
            return;
          }
          store.backToNetwork();
          // Auto-create project and save to Supabase
          await autoSaveToProject({ cardRegistry: json.cardRegistry });
        } catch (err) {
          console.error("[App] Drop import error:", err);
        }
      })();
    }
  }, []);

  const handleGlobalDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    document.addEventListener("drop", handleGlobalDrop);
    document.addEventListener("dragover", handleGlobalDragOver);
    return () => {
      document.removeEventListener("drop", handleGlobalDrop);
      document.removeEventListener("dragover", handleGlobalDragOver);
    };
  }, [handleGlobalDrop, handleGlobalDragOver]);

  // Flush pending save on tab close / refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      const canvas = useCanvasStore.getState();
      if (canvas.scaffoldDirty && canvas.scaffoldData) {
        canvas.saveToProject(); // fire-and-forget; browser gives ~50ms
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const isLoaded = !!scaffoldData;
  const isNetwork = viewMode === "network";
  const isStage = viewMode === "stage" && (!!canvasViewModel || loading);
  const isStageReady = viewMode === "stage" && !!canvasViewModel;
  const isIntake = viewMode === "intake";
  const isImport = viewMode === "import";
  const isCapabilityMap = viewMode === "capabilityMap";
  const isConceptGraph = viewMode === "conceptGraph";
  const isFriction = viewMode === "friction";
  const isEnrich = viewMode === "enrich";
  const isWorkbench = viewMode === "workbench";
  const workbenchActive = useWorkbenchStore((s) => s.isActive);

  // Auth gate: show login page if not authenticated and not local mode
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isLocalMode && !user) {
    return <LoginPage />;
  }

  // Show loading state while importing a claimed bundle from Canvas
  if (claimImporting) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-vcc-600" />
        <p className="text-sm font-medium text-gray-600">Importing your operating model...</p>
        <p className="text-xs text-gray-400">This will only take a moment</p>
      </div>
    );
  }

  // Project list: show when authenticated but no project/scaffold loaded
  // In local mode, skip project list and show original landing page
  const showProjectList = !isLocalMode && !isLoaded && !isIntake && !isImport;

  return (
    <UpsellModalProvider>
    <UpgradeURLTrigger />
    <div className="flex h-screen">
      {/* Side navigation */}
      <SideNav onOpenAccountSettings={() => setShowAccountSettings(true)} />

      {/* Right column: header + content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Slim header — project name + save + version */}
        <header className="flex h-11 items-center justify-between border-b border-gray-200 bg-vcc-900 px-5">
          <div className="flex items-center gap-2.5">
            {scaffoldData?.name && (
              <span className="text-[11px] font-medium text-white/60">
                {scaffoldData.name}
              </span>
            )}
            {isImport && !scaffoldData?.name && (
              <span className="text-[11px] font-medium text-white/60">
                Import Model
              </span>
            )}
            {isEnrich && (
              <span className="text-[11px] font-medium text-white/60">
                Model Enrichment
              </span>
            )}
            {showProjectList && !isLocalMode && (
              <span className="text-[11px] font-medium text-white/60">
                Projects
              </span>
            )}
            {saving && (
              <span className="text-[10px] text-white/40">Saving...</span>
            )}
          </div>
          <VersionBadge />
        </header>

        {/* Content selectors (stage view only) */}
        {isStage && <StageWizard />}

      {/* Checkout banner */}
      {checkoutBanner === "success" && (
        <div className="flex items-center justify-between bg-emerald-600 px-6 py-2.5">
          <div className="flex items-center gap-2.5">
            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-white">
              You're all set! Your subscription is now active. Welcome to VCC.
            </span>
          </div>
          <button onClick={() => setCheckoutBanner(null)} className="text-white/70 hover:text-white">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {checkoutBanner === "cancelled" && (
        <div className="flex items-center justify-between bg-amber-500 px-6 py-2.5">
          <div className="flex items-center gap-2.5">
            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-white">
              Checkout cancelled. No worries — you can upgrade anytime.
            </span>
          </div>
          <button onClick={() => setCheckoutBanner(null)} className="text-white/70 hover:text-white">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Errors — only show outside intake view */}
        {!isIntake && error && !isLoaded && !showProjectList && (
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

        {/* Project list (authenticated, no project loaded) */}
        {showProjectList && <ProjectList />}

        {/* Views — DiscoveryIntake stays mounted (hidden) to preserve form state */}
        <div style={{ display: isIntake ? undefined : "none" }}>
          <DiscoveryIntake
            onComplete={async (bundle) => {
              trackEvent("discovery_completed", {
                has_scaffold: !!bundle.scaffold,
                has_heatmaps: !!(bundle.heatmaps?.length),
              });
              const { scaffold, heatmaps = [], cardRegistry } = bundle;
              await loadScaffold(scaffold ?? bundle);
              for (const hm of heatmaps) await loadHeatmap(hm);
              if (cardRegistry) useCanvasStore.getState().loadCards(cardRegistry);
              backToNetwork();
              await autoSaveToProject({ cardRegistry });

              // Nudge anonymous users to sign up after completing discovery
              if (!user && !isLocalMode) {
                setTimeout(() => setShowSignUpNudge(true), 2000);
              }
            }}
          />
        </div>

        {/* Landing page — local mode only (no project list) */}
        {isLocalMode && !isIntake && !isImport && !isLoaded && (
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

        {isImport && !isWorkbench && <ImportView />}
        {!isIntake && isLoaded && isNetwork && !isWorkbench && <NetworkView />}
        {!isIntake && isStageReady && !isWorkbench && <CanvasView />}
        {!isIntake && isLoaded && isCapabilityMap && !isWorkbench && <CapabilityMapView />}
        {!isIntake && isLoaded && isConceptGraph && !isWorkbench && <ConceptGraphView />}
        {!isIntake && isLoaded && isFriction && !isWorkbench && <FrictionView />}
        {!isIntake && isLoaded && isEnrich && !isWorkbench && (
          enrichSection === "structure" ? <EnrichStructureView /> :
          enrichSection === "mapping" ? <EnrichMappingView /> :
          enrichSection === "friction" ? <EnrichFrictionView /> :
          enrichSection === "assessment" ? <EnrichAssessmentView /> :
          enrichSection === "custom" ? <EnrichCustomView /> :
          <EnrichOverview />
        )}
        {isWorkbench && workbenchActive && <WorkbenchView />}
      </main>
      <UserGuidePanel />
      <DevTierSwitcher />
      {showRefinementExport && (
        <RefinementExportModal onClose={() => setShowRefinementExport(false)} />
      )}
      {showAccountSettings && (
        <AccountSettings onClose={() => setShowAccountSettings(false)} />
      )}

      {/* Sign-up nudge for anonymous users after discovery */}
      {showSignUpNudge && !user && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-slide-up">
          <div className="flex items-center gap-4 rounded-xl border border-vcc-200 bg-white px-6 py-4 shadow-xl">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-vcc-50">
              <svg className="h-5 w-5 text-vcc-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Your operating model is ready!</p>
              <p className="text-xs text-gray-500">Create a free account to save your work and come back anytime.</p>
            </div>
            <button
              onClick={() => {
                setShowSignUpNudge(false);
                trackEvent("sign_up", { source: "discovery_nudge" });
                window.location.href = "/";
              }}
              className="shrink-0 rounded-lg bg-vcc-600 px-4 py-2 text-xs font-semibold text-white hover:bg-vcc-700 transition-colors"
            >
              Create Free Account
            </button>
            <button
              onClick={() => setShowSignUpNudge(false)}
              className="shrink-0 text-gray-400 hover:text-gray-600"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      </div>{/* end right column */}
    </div>{/* end outer flex */}
    </UpsellModalProvider>
  );
}

/* ── URL-triggered upgrade modal ──────────────────────────── */
// Detects ?upgrade=true from marketing site CTAs and auto-opens pricing modal
function UpgradeURLTrigger() {
  const { show } = useUpsellModal();
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;
    const params = new URLSearchParams(window.location.search);
    const upgradeParam = params.get("upgrade");
    if (!upgradeParam) return;

    triggered.current = true;

    // Extract tier hint (e.g. "starter", "individual", "team_5", "team_10", or "true" for just showing pricing)
    const autoTier = upgradeParam !== "true" ? upgradeParam : undefined;

    // Clean URL
    params.delete("upgrade");
    const clean = params.toString();
    window.history.replaceState({}, "", clean ? `?${clean}` : window.location.pathname);

    // Show pricing modal after a brief delay for the page to render
    setTimeout(() => {
      show({
        action: "upgrade" as any,
        reason: "Choose a plan to get started with VCC.",
        featureLabel: "VCC",
        forcePricing: true,
        autoCheckoutTier: autoTier,
      });
    }, 500);
  }, [show]);

  return null;
}

