/**
 * Project list page (D-109: Project management)
 *
 * Shows user's projects. Create new project with module selection.
 * Opens a project by loading its bundle into the canvas store.
 */
import { useState, useEffect } from "react";
import { useProjectStore } from "../store/project-store.ts";
import { useCanvasStore } from "../store/canvas-store.ts";
import { useAuthStore } from "../store/auth-store.ts";
import { FileLoader } from "./FileLoader.tsx";
import type { ProjectModule } from "../types/database.ts";

const MODULE_INFO: Record<ProjectModule, { label: string; description: string; color: string }> = {
  "sales-discovery": {
    label: "Sales Discovery",
    description: "Presales discovery — transcript to operating model with vendor solutions",
    color: "bg-blue-100 text-blue-700",
  },
  "board-diagnostic": {
    label: "Board Diagnostic",
    description: "Operating model analysis — friction assessment and binding constraint identification",
    color: "bg-purple-100 text-purple-700",
  },
  "transformation": {
    label: "Transformation",
    description: "Transformation planning — friction to user stories, Jira export",
    color: "bg-amber-100 text-amber-700",
  },
};

export function ProjectList() {
  const { user, signOut } = useAuthStore();
  const { projects, loading, error, fetchProjects, createProject, loadProject, deleteProject } = useProjectStore();
  const { loadScaffold, loadHeatmap, backToNetwork, goToIntake } = useCanvasStore();

  const [showNewProject, setShowNewProject] = useState(false);
  const [newName, setNewName] = useState("");
  const [newModule, setNewModule] = useState<ProjectModule>("sales-discovery");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Open a project: load bundle into canvas store
  const handleOpenProject = async (id: string) => {
    const project = await loadProject(id);
    if (!project) return;

    const bundle = project.bundle as any;

    // The bundle might be a full export bundle or just a scaffold
    if (bundle.scaffold) {
      await loadScaffold(bundle.scaffold);
      if (bundle.heatmaps) {
        for (const hm of bundle.heatmaps) {
          await loadHeatmap(hm);
        }
      }
    } else if (bundle.elements) {
      // It's a raw scaffold
      await loadScaffold(bundle);
    }

    backToNetwork();
  };

  // Create a new empty project and go to intake
  const handleCreateProject = async () => {
    if (!newName.trim()) return;
    setCreating(true);

    const id = await createProject(newName.trim(), newModule, {});
    if (id) {
      useProjectStore.getState().setCurrentProject(id, 1);
      goToIntake();
    }
    setCreating(false);
    setShowNewProject(false);
    setNewName("");
  };

  // Quick action: start a new discovery without creating a project first
  // (local mode or quick start — project created on first save)
  const handleQuickDiscovery = () => {
    goToIntake();
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
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewProject(true)}
            className="flex items-center gap-1.5 rounded-lg bg-vcc-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-vcc-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project
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
              <label className="mb-1 block text-xs font-medium text-gray-700">Project name</label>
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
              <label className="mb-1.5 block text-xs font-medium text-gray-700">Module (D-111)</label>
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

            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateProject}
                disabled={!newName.trim() || creating}
                className="rounded-lg bg-vcc-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-vcc-700 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Project"}
              </button>
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
          <div className="mx-auto max-w-md py-12 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-gray-100 p-4">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
            </div>
            <h3 className="mb-1 text-sm font-semibold text-gray-900">No projects yet</h3>
            <p className="mb-4 text-xs text-gray-500">Create a new project to get started, or run a quick discovery.</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowNewProject(true)}
                className="rounded-lg bg-vcc-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-vcc-700"
              >
                New Project
              </button>
              <span className="text-xs text-gray-400">or</span>
              <button
                onClick={handleQuickDiscovery}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Quick Discovery
              </button>
              <span className="text-xs text-gray-400">or</span>
              <FileLoader />
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
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
          </div>
        )}
      </div>
    </div>
  );
}
