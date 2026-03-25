/**
 * SideNav — Collapsed icon rail that expands on hover.
 *
 * Thin 48px rail with icons. Expands to ~200px on hover to reveal labels.
 * Contains all navigation: project views, utilities, account, theme.
 *
 * Session 28 — Account Management & Nav restructure.
 */
import { useState, useRef } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";
import { useWorkbenchStore } from "../store/workbench-store.ts";
import { useAuthStore } from "../store/auth-store.ts";
import { useThemeStore } from "../store/theme-store.ts";
import { useProjectStore } from "../store/project-store.ts";
import { autoSaveToProject } from "../utils/auto-save.ts";

/* ── Icon components (inline SVG, 20×20) ─────────────────── */

function IconProjects() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function IconDiscovery() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function IconNetwork() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function IconStream() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

function IconCapabilities() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  );
}

function IconConcepts() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  );
}

function IconFriction() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function IconWorkbench() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-3.43a1.5 1.5 0 010-2.5l5.1-3.43a1.5 1.5 0 011.58 0l5.1 3.43a1.5 1.5 0 010 2.5l-5.1 3.43a1.5 1.5 0 01-1.58 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.32 13.74l5.1 3.43a1.5 1.5 0 001.58 0l5.1-3.43" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.32 17.24l5.1 3.43a1.5 1.5 0 001.58 0l5.1-3.43" />
    </svg>
  );
}

function IconAccount() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

function IconImport() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

/* ── Types ────────────────────────────────────────────────── */

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  /** Visually separate from above item */
  divider?: boolean;
}

/* ── Main component ──────────────────────────────────────── */

interface SideNavProps {
  onOpenAccountSettings: () => void;
}

export function SideNav({ onOpenAccountSettings }: SideNavProps) {
  const [expanded, setExpanded] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user, isLocalMode } = useAuthStore();
  const { mode: themeMode, toggle: toggleTheme } = useThemeStore();
  const isDark = themeMode === "dark";

  const {
    scaffoldData,
    viewMode,
    backToNetwork,
    goToIntake,
    goToCapabilityMap,
    goToConceptGraph,
    goToFriction,
  } = useCanvasStore();

  const workbenchActive = useWorkbenchStore((s) => s.isActive);
  const isLoaded = !!scaffoldData;

  // Navigate back to project list
  const goToProjects = async () => {
    const canvas = useCanvasStore.getState();
    if (canvas.scaffoldDirty && canvas.scaffoldData) {
      await canvas.saveToProject();
    }
    canvas.reset();
    useProjectStore.getState().setCurrentProject(null);
  };

  // Navigate to stream view (first VS)
  const goToStream = () => {
    const store = useCanvasStore.getState();
    const vsId =
      store.selectedVsId ||
      Object.keys(store.scaffoldData?.elements?.valueStreams ?? {})[0];
    if (vsId) store.selectVs(vsId);
  };

  // Navigate to workbench — must enter with scaffold if not already active
  const goToWorkbench = () => {
    const canvas = useCanvasStore.getState();
    const wb = useWorkbenchStore.getState();
    if (!wb.isActive && canvas.scaffoldData) {
      wb.enterWorkbench(canvas.scaffoldData);
    }
    canvas.goToWorkbench();
  };

  // Import reference model from .xlsx
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so the same file can be re-selected
    e.target.value = "";

    setImporting(true);
    try {
      const { importReferenceModelFile } = await import(
        "../utils/reference-model-import.ts"
      );
      const { scaffold, stats } = await importReferenceModelFile(file);
      const store = useCanvasStore.getState();
      await store.loadScaffold(scaffold);
      store.backToNetwork();
      await autoSaveToProject({});
      console.log(
        `[SideNav] Reference model imported: ${stats.valueStreams} VS, ${stats.activities} activities, ${stats.capabilities} capabilities, ${stats.roles} roles, ${stats.informationObjects} IOs`,
      );
    } catch (err) {
      console.error("[SideNav] Reference model import failed:", err);
      useCanvasStore.setState({
        error: `Import failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setImporting(false);
    }
  };

  /* ── Build nav items ──────────────────────────────── */

  const items: NavItem[] = [];

  // Projects (authenticated mode only)
  if (!isLocalMode) {
    items.push({
      id: "projects",
      label: "Projects",
      icon: <IconProjects />,
      onClick: goToProjects,
      active: !isLoaded && viewMode !== "intake",
    });
  }

  // Discovery
  items.push({
    id: "discovery",
    label: "Discovery",
    icon: <IconDiscovery />,
    onClick: goToIntake,
    active: viewMode === "intake",
  });

  // Import reference model
  items.push({
    id: "import",
    label: importing ? "Importing..." : "Import Model",
    icon: <IconImport />,
    onClick: handleImportClick,
    disabled: importing,
  });

  // Divider before model views
  items.push({
    id: "network",
    label: "Network",
    icon: <IconNetwork />,
    onClick: backToNetwork,
    active: viewMode === "network",
    disabled: !isLoaded,
    divider: true,
  });

  items.push({
    id: "stream",
    label: "Value Stream",
    icon: <IconStream />,
    onClick: goToStream,
    active: viewMode === "stage",
    disabled: !isLoaded,
  });

  items.push({
    id: "capabilities",
    label: "Capabilities",
    icon: <IconCapabilities />,
    onClick: goToCapabilityMap,
    active: viewMode === "capabilityMap",
    disabled: !isLoaded,
  });

  items.push({
    id: "concepts",
    label: "Concepts",
    icon: <IconConcepts />,
    onClick: goToConceptGraph,
    active: viewMode === "conceptGraph",
    disabled: !isLoaded,
  });

  items.push({
    id: "friction",
    label: "Friction",
    icon: <IconFriction />,
    onClick: goToFriction,
    active: viewMode === "friction",
    disabled: !isLoaded,
  });

  // Workbench
  items.push({
    id: "workbench",
    label: "Workbench",
    icon: <IconWorkbench />,
    onClick: goToWorkbench,
    active: viewMode === "workbench" && workbenchActive,
    disabled: !isLoaded,
    divider: true,
  });

  /* ── Bottom-pinned items ──────────────────────────── */

  const bottomItems: NavItem[] = [];

  // Theme toggle
  bottomItems.push({
    id: "theme",
    label: isDark ? "Light mode" : "Dark mode",
    icon: isDark ? <IconSun /> : <IconMoon />,
    onClick: toggleTheme,
  });

  // Account (authenticated only)
  if (!isLocalMode && user) {
    bottomItems.push({
      id: "account",
      label: "Account",
      icon: <IconAccount />,
      onClick: onOpenAccountSettings,
    });
  }

  /* ── Colours ──────────────────────────────────────── */

  const bg = isDark ? "bg-gray-900" : "bg-vcc-900";
  const borderClr = isDark ? "border-gray-800" : "border-vcc-800";
  const hoverBg = isDark ? "hover:bg-white/10" : "hover:bg-white/10";
  const activeColor = "#4a9eda";

  /* ── Render ───────────────────────────────────────── */

  return (
    <>
    {/* Hidden file input for reference model import */}
    <input
      ref={fileInputRef}
      type="file"
      accept=".xlsx,.xls"
      className="hidden"
      onChange={handleFileChange}
    />
    <nav
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={`
        flex flex-col justify-between
        ${bg} ${borderClr} border-r
        transition-all duration-200 ease-in-out
        shrink-0 overflow-hidden
      `}
      style={{ width: expanded ? 180 : 48 }}
    >
      {/* Top: Brand + main items */}
      <div className="flex flex-col">
        {/* Brand */}
        <div
          className="flex h-11 items-center gap-2.5 px-3 border-b"
          style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.12)" }}
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-vcc-600 text-[10px] font-black text-white">
            V
          </div>
          <span
            className="whitespace-nowrap text-sm font-semibold text-white transition-opacity duration-200"
            style={{ opacity: expanded ? 1 : 0 }}
          >
            VCC
          </span>
        </div>

        {/* Nav items */}
        <div className="mt-1.5 flex flex-col gap-0.5 px-1.5">
          {items.map((item) => (
            <div key={item.id}>
              {item.divider && (
                <div
                  className="mx-2 my-1.5"
                  style={{ height: 1, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.12)" }}
                />
              )}
              <button
                onClick={item.disabled ? undefined : item.onClick}
                disabled={item.disabled}
                title={expanded ? undefined : item.label}
                className={`
                  group flex h-9 w-full items-center gap-2.5 rounded-md px-2.5
                  transition-colors duration-100
                  ${item.disabled ? "opacity-30 cursor-not-allowed" : `cursor-pointer ${hoverBg}`}
                `}
                style={
                  item.active
                    ? { background: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.15)" }
                    : undefined
                }
              >
                <span
                  className="shrink-0"
                  style={{ color: item.active ? activeColor : "rgba(255,255,255,0.55)" }}
                >
                  {item.icon}
                </span>
                <span
                  className="whitespace-nowrap text-[12px] font-medium transition-opacity duration-200"
                  style={{
                    color: item.active ? "#ffffff" : "rgba(255,255,255,0.55)",
                    opacity: expanded ? 1 : 0,
                  }}
                >
                  {item.label}
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: theme, account */}
      <div className="mb-2 flex flex-col gap-0.5 px-1.5">
        <div
          className="mx-2 mb-1.5"
          style={{ height: 1, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.12)" }}
        />
        {bottomItems.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            title={expanded ? undefined : item.label}
            className={`
              group flex h-9 w-full items-center gap-2.5 rounded-md px-2.5
              transition-colors duration-100 cursor-pointer ${hoverBg}
            `}
          >
            <span className="shrink-0" style={{ color: "rgba(255,255,255,0.55)" }}>
              {item.icon}
            </span>
            <span
              className="whitespace-nowrap text-[12px] font-medium transition-opacity duration-200"
              style={{
                color: "rgba(255,255,255,0.55)",
                opacity: expanded ? 1 : 0,
              }}
            >
              {item.label}
            </span>
          </button>
        ))}

        {/* User avatar row (when authenticated) */}
        {!isLocalMode && user && expanded && (
          <div className="mt-1 flex items-center gap-2 px-2.5 py-1">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-vcc-600 text-[9px] font-bold text-white">
              {(user.user_metadata?.full_name ?? user.email ?? "?")[0].toUpperCase()}
            </div>
            <span className="truncate text-[10px] text-white/40">{user.email}</span>
          </div>
        )}
      </div>
    </nav>
    </>
  );
}
