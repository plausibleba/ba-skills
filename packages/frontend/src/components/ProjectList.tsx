/**
 * Project list page (D-109: Project management)
 *
 * Shows user's projects. Create new project with module selection.
 * Opens a project by loading its bundle into the canvas store.
 */
import { useState, useEffect, useRef } from "react";
import { useProjectStore } from "../store/project-store.ts";
import { useCanvasStore } from "../store/canvas-store.ts";
import { useAuthStore } from "../store/auth-store.ts";
import { ChangelogLink } from "./ChangelogModal.tsx";
import { autoSaveToProject } from "../utils/auto-save.ts";
import { FileLoader } from "./FileLoader.tsx";
import { ShareDialog } from "./ShareDialog.tsx";
import { useGateCheck } from "../hooks/useGateCheck.ts";
import type { ProjectModule } from "../types/database.ts";

const MODULE_INFO: Record<ProjectModule, { label: string; description: string; color: string }> = {
  "sales-discovery": {
    label: "Solution Engineering",
    description: "Presales discovery — transcript to operating model with vendor solutions",
    color: "bg-blue-100 text-blue-700",
  },
  "board-diagnostic": {
    label: "Board Diagnostic",
    description: "Operating model analysis — friction assessment and binding constraint identification",
    color: "bg-purple-100 text-purple-700",
  },
  "transformation": {
    label: "Transformation Planning",
    description: "Transformation planning — friction to user stories, Jira export",
    color: "bg-amber-100 text-amber-700",
  },
  "mvc": {
    label: "Agentic Governance",
    description: "Agentic governance — friction assessment with Concept & Policy Cards",
    color: "bg-indigo-100 text-indigo-700",
  },
};

export function ProjectList() {
  const { user, signOut } = useAuthStore();
  const { projects, loading, error, fetchProjects, createProject, loadProject, deleteProject, setCreatingProject } = useProjectStore();
  const { loadScaffold, loadHeatmap, backToNetwork, goToIntake } = useCanvasStore();

  const [showNewProject, _setShowNewProject] = useState(false);
  const setShowNewProject = (v: boolean) => { _setShowNewProject(v); setCreatingProject(v); };
  const [newName, setNewName] = useState("");
  const [newModule, setNewModule] = useState<ProjectModule>("sales-discovery");
  const [creating, setCreating] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ id: string; name: string } | null>(null);
  const bundleInputRef = useRef<HTMLInputElement>(null);
  const { gate } = useGateCheck();

  // Split projects into owned and shared-with-me
  const ownedProjects = projects.filter((p) => p.owner_id === user?.id);
  const sharedProjects = projects.filter((p) => p.owner_id !== user?.id);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Download a project's bundle as JSON
  const handleDownloadBundle = async (e: React.MouseEvent, project: { id: string; name: string }) => {
    e.stopPropagation();
    const row = await loadProject(project.id);
    if (!row) return;
    const bundle = row.bundle ?? {};
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const filename = `vcc-bundle-${project.name.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Open a project: load bundle into canvas store
  const handleOpenProject = async (id: string) => {
    const project = await loadProject(id);
    if (!project) return;

    const bundle = project.bundle as any;

    // Guard: empty project (no bundle saved yet)
    if (!bundle || (typeof bundle === "object" && Object.keys(bundle).length === 0)) {
      useProjectStore.getState().setCurrentProject(id, project.revision, project.module);
      goToIntake();
      return;
    }

    // The bundle might be a full export bundle or just a scaffold
    const canvasStore = useCanvasStore.getState();
    if (bundle.scaffold) {
      await loadScaffold(bundle.scaffold);
      if (bundle.heatmaps) {
        for (const hm of bundle.heatmaps) {
          await loadHeatmap(hm);
        }
      }
      // Restore user stories and card registry from bundle
      if (bundle.userStoriesByActivity) {
        for (const [actId, stories] of Object.entries(bundle.userStoriesByActivity)) {
          canvasStore.setActivityStories(actId, stories as any[]);
        }
      }
      if (bundle.cardRegistry) {
        canvasStore.loadCards(bundle.cardRegistry);
      }
    } else if (bundle.elements) {
      // It's a raw scaffold
      await loadScaffold(bundle);
    }

    backToNetwork();
  };

  // Create a new empty project and go to intake
  const handleCreateProject = () => {
    if (!newName.trim()) return;
    gate("create_project", async () => {
      setCreating(true);
      const id = await createProject(newName.trim(), newModule, {});
      if (id) {
        useProjectStore.getState().setCurrentProject(id, 1, newModule);
        goToIntake();
      }
      setCreating(false);
      setShowNewProject(false);
      setNewName("");
      setNewModule("sales-discovery");
    });
  };

  // Load a bundle file into the canvas store (shared helper)
  const loadBundleIntoCanvas = async (json: any) => {
    const { isPlausibleBABundle, normaliseBundle } = await import("../utils/bundle-import.ts");
    const canvasStore = useCanvasStore.getState();

    if (json.bundleVersion && json.scaffold) {
      await canvasStore.loadScaffold(json.scaffold);
      if (json.heatmaps) for (const hm of json.heatmaps) await canvasStore.loadHeatmap(hm);
      if (json.userStoriesByActivity) {
        for (const [actId, stories] of Object.entries(json.userStoriesByActivity)) {
          canvasStore.setActivityStories(actId, stories as any[]);
        }
      }
      if (json.cardRegistry) canvasStore.loadCards(json.cardRegistry);
    } else if (isPlausibleBABundle(json)) {
      const scaffold = normaliseBundle(json);
      await canvasStore.loadScaffold(scaffold);
    } else if (json.scaffoldId && json.elements) {
      await canvasStore.loadScaffold(json);
    } else {
      alert("Unrecognized JSON file. Expected a VCC Bundle or PlausibleBA bundle.");
      return false;
    }
    canvasStore.backToNetwork();
    return true;
  };

  // Import bundle from New Project dialog (use user-selected module and name)
  const handleImportWithModule = async (file: File, module: ProjectModule, projectName: string) => {
    try {
      const json = JSON.parse(await file.text());
      if (!(await loadBundleIntoCanvas(json))) return;

      // Build the bundle from what's now in the canvas store
      const canvas = useCanvasStore.getState();
      const bundle: Record<string, unknown> = {
        bundleVersion: "2.0",
        updatedAt: new Date().toISOString(),
        scaffold: canvas.scaffoldData,
        heatmaps: Array.from(canvas.heatmapsByVs.values()),
      };
      if (json.cardRegistry) bundle.cardRegistry = json.cardRegistry;
      if (json.userStoriesByActivity) bundle.userStoriesByActivity = json.userStoriesByActivity;

      // Create project with the user-chosen name and module
      const name = projectName.trim() || canvas.scaffoldData?.name || "Imported Bundle";
      const projectId = await createProject(name, module, bundle);
      if (projectId) {
        useProjectStore.getState().setCurrentProject(projectId, 1, module);
      }
    } catch (err) {
      console.error("[ImportBundle] parse error:", err);
      alert("Failed to parse JSON file.");
    }
  };

  // Quick action: start a new discovery without creating a project first
  // (local mode or quick start — project created on first save)
  const handleQuickDiscovery = () => {
    gate("run_discovery", () => goToIntake());
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">My Projects</h2>
          <p className="text-xs text-gray-500">
            {user?.email ?? "Local mode"}
          </p>
          <div className="mt-1">
            <ChangelogLink />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewProject(true)}
            className="rounded-lg bg-vcc-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-vcc-700"
          >
            + New Project
          </button>
          <button
            onClick={signOut}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* New project modal */}
      {showNewProject && (
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div className="mx-auto max-w-lg">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Create New Project</h3>

            <div className="mb-3">
              <label className="mb-1 block text-xs font-semibold text-gray-700">Step 1: Give your project a name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. My Prospect Discovery Q1"
                autoFocus
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-vcc-500 focus:outline-none focus:ring-1 focus:ring-vcc-500"
              />
            </div>

            <div className="mb-4">
              <label className="mb-0.5 block text-xs font-semibold text-gray-700">Step 2: Select your use case</label>
              <p className="mb-2 text-[11px] text-gray-400">This will determine which features get enabled in the project.</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(MODULE_INFO) as ProjectModule[]).map((mod) => {
                  const info = MODULE_INFO[mod];
                  const selected = newModule === mod;
                  return (
                    <button
                      key={mod}
                      onClick={() => setNewModule(mod)}
                      className={`rounded-lg border p-3 text-left transition-all ${
                        selected
                          ? "border-vcc-500 bg-vcc-50 ring-1 ring-vcc-500"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${info.color}`}>
                        {info.label}
                      </span>
                      <p className="mt-1.5 text-[11px] leading-snug text-gray-500">
                        {info.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="mb-2 block text-xs font-semibold text-gray-700">
              Step 3: Create your new project{newName.trim() ? `: '${newName.trim()}' — ${MODULE_INFO[newModule].label}` : ""}
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateProject}
                disabled={!newName.trim() || creating}
                className="rounded-lg bg-vcc-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-vcc-700 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Project"}
              </button>
              <span className="text-xs text-gray-400">or</span>
              <label className="cursor-pointer rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100">
                Import Bundle
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImportWithModule(file, newModule, newName);
                      setShowNewProject(false);
                      setNewName("");
                      setNewModule("sales-discovery");
                    }
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                onClick={() => { setShowNewProject(false); setNewName(""); }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Project list */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-center text-sm text-gray-400">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="mx-auto max-w-2xl py-12">
            {!showNewProject && (
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-gray-100 p-4">
                  <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
              </div>
            )}
            <h3 className="mb-1 text-center text-sm font-semibold text-gray-900">
              {showNewProject ? "Or: Select a different path" : "No projects yet"}
            </h3>
            <p className="mb-8 text-center text-xs text-gray-500">
              {showNewProject
                ? "Changed your mind? Jump straight in or import an existing file instead."
                : "Choose how you'd like to get started."}
            </p>

            <div className={`grid gap-6 ${showNewProject ? "grid-cols-2" : "grid-cols-3"}`}>
              {/* New Project — hide when the panel is already open */}
              {!showNewProject && (
                <div className="flex flex-col items-center text-center">
                  <button
                    onClick={() => setShowNewProject(true)}
                    className="mb-3 w-full rounded-lg bg-vcc-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-vcc-700 transition-colors"
                  >
                    New Project
                  </button>
                  <p className="text-xs leading-relaxed text-gray-500">
                    Start from scratch. Describe a business and let AI build the operating model for you.
                  </p>
                </div>
              )}

              {/* Quick Discovery */}
              <div className="flex flex-col items-center text-center">
                <button
                  onClick={handleQuickDiscovery}
                  className="mb-3 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Quick Discovery
                </button>
                <p className="text-xs leading-relaxed text-gray-500">
                  Jump straight in without creating a project. Your work will be saved automatically.
                </p>
              </div>

              {/* Drop Zone */}
              <div className="flex flex-col items-center text-center">
                <FileLoader compact />
                <p className="mt-3 text-xs leading-relaxed text-gray-500">
                  Import a VCC Bundle, PlausibleBA Bundle, or individual artifacts (.json).
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
          {/* My Projects */}
          {ownedProjects.length > 0 && (
            <>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">My Projects</h3>
              <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ownedProjects.map((project) => {
                  const info = MODULE_INFO[project.module as ProjectModule] ?? MODULE_INFO["sales-discovery"];
                  return (
                    <div
                      key={project.id}
                      className="group relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-vcc-300 hover:shadow-md"
                    >
                      <button
                        onClick={() => handleOpenProject(project.id)}
                        className="w-full text-left"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${info.color}`}>
                            {info.label}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            v{project.revision}
                          </span>
                        </div>
                        <h3 className="mb-1 text-sm font-semibold text-gray-900 group-hover:text-vcc-700">
                          {project.name}
                        </h3>
                        <p className="text-[11px] text-gray-400">
                          Updated {new Date(project.updated_at).toLocaleDateString()}
                        </p>
                      </button>
                      {/* Card actions — bottom row, always visible */}
                      <div className="mt-2 flex items-center gap-1 border-t border-gray-100 pt-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setShareTarget({ id: project.id, name: project.name }); }}
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Share project"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                          Share
                        </button>
                        <button
                          onClick={(e) => handleDownloadBundle(e, project)}
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Download bundle"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete "${project.name}"? This cannot be undone.`)) {
                              deleteProject(project.id);
                            }
                          }}
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-gray-400 hover:bg-red-50 hover:text-red-500"
                          title="Delete project"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Quick actions */}
                <button
                  onClick={handleQuickDiscovery}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 p-4 text-center transition-all hover:border-vcc-300 hover:bg-vcc-50/50"
                >
                  <svg className="mb-1 h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-xs font-medium text-gray-500">Quick Discovery</span>
                  <span className="text-[10px] text-gray-400">No project — just run</span>
                </button>

                {/* Import Bundle */}
                <button
                  onClick={() => gate("load_bundle", () => bundleInputRef.current?.click())}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 p-4 text-center transition-all hover:border-emerald-300 hover:bg-emerald-50/50"
                >
                  <svg className="mb-1 h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-xs font-medium text-gray-500">Import Bundle</span>
                  <span className="text-[10px] text-gray-400">PlausibleBA or VCC JSON</span>
                  <input
                    ref={bundleInputRef}
                    type="file"
                    accept=".json"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      if (files.length > 0) {
                        // Delegate to FileLoader's logic via a temporary mount
                        // Simpler: trigger FileLoader directly by reading the file and passing to canvas store
                        void (async () => {
                          for (const file of files) {
                            const text = await file.text();
                            try {
                              const json = JSON.parse(text);
                              // Use FileLoader component — but we need the same logic inline
                              // Import the bundle-import utilities directly
                              const { isPlausibleBABundle, normaliseBundle } = await import("../utils/bundle-import.ts");
                              const canvasStore = useCanvasStore.getState();
                              if (json.bundleVersion && json.scaffold) {
                                await canvasStore.loadScaffold(json.scaffold);
                                if (json.heatmaps) {
                                  for (const hm of json.heatmaps) await canvasStore.loadHeatmap(hm);
                                }
                                if (json.userStoriesByActivity) {
                                  for (const [actId, stories] of Object.entries(json.userStoriesByActivity)) {
                                    canvasStore.setActivityStories(actId, stories as any[]);
                                  }
                                }
                                if (json.cardRegistry) canvasStore.loadCards(json.cardRegistry);
                              } else if (isPlausibleBABundle(json)) {
                                const scaffold = normaliseBundle(json);
                                await canvasStore.loadScaffold(scaffold);
                              } else if (json.scaffoldId && json.elements) {
                                await canvasStore.loadScaffold(json);
                              } else {
                                alert("Unrecognized JSON file. Expected a VCC Bundle or PlausibleBA bundle.");
                                return;
                              }
                              canvasStore.backToNetwork();
                              // Auto-create project and save to Supabase
                              await autoSaveToProject({ cardRegistry: json.cardRegistry });
                            } catch (err) {
                              console.error("[ImportBundle] parse error:", err);
                              alert("Failed to parse JSON file.");
                            }
                          }
                        })();
                      }
                      e.target.value = "";
                    }}
                  />
                </button>
              </div>
            </>
          )}

          {/* Shared with me */}
          {sharedProjects.length > 0 && (
            <>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Shared with me</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sharedProjects.map((project) => {
                  const info = MODULE_INFO[project.module as ProjectModule] ?? MODULE_INFO["sales-discovery"];
                  return (
                    <button
                      key={project.id}
                      onClick={() => handleOpenProject(project.id)}
                      className="group rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:border-vcc-300 hover:shadow-md"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${info.color}`}>
                          {info.label}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Shared
                        </span>
                      </div>
                      <h3 className="mb-1 text-sm font-semibold text-gray-900 group-hover:text-vcc-700">
                        {project.name}
                      </h3>
                      <p className="text-[11px] text-gray-400">
                        Updated {new Date(project.updated_at).toLocaleDateString()}
                      </p>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Empty state when no owned projects but only Quick Discovery */}
          {ownedProjects.length === 0 && sharedProjects.length > 0 && (
            <div className="mt-4">
              <button
                onClick={handleQuickDiscovery}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 p-4 text-center transition-all hover:border-vcc-300 hover:bg-vcc-50/50"
              >
                <svg className="mb-1 h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs font-medium text-gray-500">Quick Discovery</span>
              </button>
            </div>
          )}
          </>
        )}
      </div>

      {/* Share dialog */}
      {shareTarget && (
        <ShareDialog
          projectId={shareTarget.id}
          projectName={shareTarget.name}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  );
}
