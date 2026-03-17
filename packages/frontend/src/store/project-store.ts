/**
 * Project store (D-109: Minimum Backend Schema)
 *
 * Manages CRUD for VCC projects stored in Supabase.
 * Each project = a persisted bundle with metadata (name, module, owner, sharing).
 */
import { create } from "zustand";
import { supabase, isSupabaseConfigured } from "../lib/supabase.ts";
import type { ProjectRow, ProjectModule, ProjectAccessRow, ProfileRow } from "../types/database.ts";

/** Enriched access row with profile info for UI display */
export interface AccessGrant extends ProjectAccessRow {
  email: string;
  display_name: string | null;
}

interface ProjectState {
  projects: ProjectRow[];
  currentProjectId: string | null;
  currentRevision: number;
  loading: boolean;
  saving: boolean;
  error: string | null;
  conflict: boolean;            // true when optimistic lock fails

  // CRUD
  fetchProjects: () => Promise<void>;
  createProject: (name: string, module: ProjectModule, bundle: Record<string, unknown>) => Promise<string | null>;
  loadProject: (id: string) => Promise<ProjectRow | null>;
  saveProject: (id: string, bundle: Record<string, unknown>, opts?: { force?: boolean }) => Promise<{ ok: boolean; error?: string }>;
  reloadProject: () => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Sharing
  shareProject: (projectId: string, email: string, permission: "view" | "edit") => Promise<{ error: string | null }>;
  fetchProjectAccess: (projectId: string) => Promise<AccessGrant[]>;
  updateAccess: (accessId: string, permission: "view" | "edit") => Promise<{ error: string | null }>;
  revokeAccess: (accessId: string) => Promise<{ error: string | null }>;

  // State management
  setCurrentProject: (id: string | null, revision?: number) => void;
  clearError: () => void;
  clearConflict: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProjectId: null,
  currentRevision: 0,
  loading: false,
  saving: false,
  error: null,
  conflict: false,

  fetchProjects: async () => {
    if (!isSupabaseConfigured) return;
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from("projects")
      .select("id, owner_id, name, module, schema_version, revision, created_at, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }

    // Supabase returns without the bundle field for the list view (we only select metadata)
    // We'll cast to ProjectRow[] — bundle will be undefined in the list but loaded on open
    set({ projects: (data ?? []) as ProjectRow[], loading: false });
  },

  createProject: async (name, module, bundle) => {
    if (!isSupabaseConfigured) return null;
    set({ saving: true, error: null });

    const { data, error } = await supabase
      .from("projects")
      .insert({ name, module, bundle })
      .select("id")
      .single();

    if (error) {
      set({ saving: false, error: error.message });
      return null;
    }

    set({ saving: false });
    // Refresh the project list
    get().fetchProjects();
    return data.id;
  },

  loadProject: async (id) => {
    if (!isSupabaseConfigured) return null;
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      set({ loading: false, error: error.message });
      return null;
    }

    const row = data as unknown as ProjectRow;
    set({
      loading: false,
      currentProjectId: id,
      currentRevision: row.revision,
    });
    return row;
  },

  saveProject: async (id, bundle, opts) => {
    if (!isSupabaseConfigured) return { ok: false, error: "Not configured" };
    set({ saving: true, error: null });

    const knownRevision = get().currentRevision;

    // Force-save bypasses the optimistic lock (used after user confirms overwrite)
    let query = supabase
      .from("projects")
      .update({ bundle })
      .eq("id", id);

    if (!opts?.force) {
      query = query.eq("revision", knownRevision);  // optimistic lock
    }

    const { data, error } = await query
      .select("revision")
      .single();

    if (error) {
      // Could be a conflict (revision mismatch returns no rows → error) or other error
      const isConflict = error.code === "PGRST116"; // PostgREST: "JSON object requested, multiple (or no) rows returned"
      if (isConflict) {
        set({ saving: false, conflict: true, error: "Another user modified this project. Reload to get their changes, or overwrite with yours." });
        return { ok: false, error: "conflict" };
      }
      set({ saving: false, error: error.message });
      return { ok: false, error: error.message };
    }

    set({ saving: false, conflict: false, currentRevision: (data as unknown as { revision: number }).revision });
    return { ok: true };
  },

  reloadProject: async () => {
    const id = get().currentProjectId;
    if (!id) return;

    const project = await get().loadProject(id);
    if (!project) return;

    // Reload the bundle into the canvas store
    const bundle = project.bundle as any;
    const { useCanvasStore } = await import("./canvas-store.ts");
    const canvasStore = useCanvasStore.getState();

    if (bundle.scaffold) {
      await canvasStore.loadScaffold(bundle.scaffold);
      if (bundle.heatmaps) {
        for (const hm of bundle.heatmaps) {
          await canvasStore.loadHeatmap(hm);
        }
      }
      // Restore user stories if present in the bundle
      if (bundle.userStoriesByActivity) {
        for (const [actId, stories] of Object.entries(bundle.userStoriesByActivity)) {
          canvasStore.setActivityStories(actId, stories as any[]);
        }
      }
      // Restore MVC card registry if present
      if (bundle.cardRegistry) {
        canvasStore.loadCards(bundle.cardRegistry);
      }
    } else if (bundle.elements) {
      await canvasStore.loadScaffold(bundle);
    }

    set({ conflict: false, error: null });
  },

  deleteProject: async (id) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      set({ error: error.message });
      return;
    }
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      currentProjectId: s.currentProjectId === id ? null : s.currentProjectId,
    }));
  },

  shareProject: async (projectId, email, permission) => {
    if (!isSupabaseConfigured) return { error: "Not configured" };

    // Step 1: Look up user by email via the profiles table
    const { data: profile, error: lookupErr } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (lookupErr || !profile) {
      return { error: `No account found for "${email}". They need to sign up first.` };
    }

    const targetUserId = (profile as unknown as ProfileRow).id;

    // Step 2: Don't allow sharing with yourself
    const { useAuthStore } = await import("./auth-store.ts");
    const currentUser = useAuthStore.getState().user;
    if (currentUser && targetUserId === currentUser.id) {
      return { error: "You can't share a project with yourself." };
    }

    // Step 3: Insert access grant (RLS ensures only owner can do this)
    const { error: insertErr } = await supabase
      .from("project_access")
      .upsert(
        { project_id: projectId, user_id: targetUserId, permission },
        { onConflict: "project_id,user_id" }
      );

    if (insertErr) {
      return { error: insertErr.message };
    }

    return { error: null };
  },

  fetchProjectAccess: async (projectId) => {
    if (!isSupabaseConfigured) return [];

    // Fetch access grants for a project
    const { data: grants, error } = await supabase
      .from("project_access")
      .select("*")
      .eq("project_id", projectId);

    if (error || !grants) return [];

    // Enrich with profile info
    const accessRows = grants as unknown as ProjectAccessRow[];
    const userIds = accessRows.map((g) => g.user_id);
    if (userIds.length === 0) return [];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, display_name")
      .in("id", userIds);

    const profileMap = new Map<string, ProfileRow>();
    if (profiles) {
      for (const p of profiles as unknown as ProfileRow[]) {
        profileMap.set(p.id, p);
      }
    }

    return accessRows.map((g) => {
      const p = profileMap.get(g.user_id);
      return {
        ...g,
        email: p?.email ?? "unknown",
        display_name: p?.display_name ?? null,
      };
    });
  },

  updateAccess: async (accessId, permission) => {
    if (!isSupabaseConfigured) return { error: "Not configured" };

    const { error } = await supabase
      .from("project_access")
      .update({ permission })
      .eq("id", accessId);

    if (error) return { error: error.message };
    return { error: null };
  },

  revokeAccess: async (accessId) => {
    if (!isSupabaseConfigured) return { error: "Not configured" };

    const { error } = await supabase
      .from("project_access")
      .delete()
      .eq("id", accessId);

    if (error) return { error: error.message };
    return { error: null };
  },

  setCurrentProject: (id, revision) => {
    set({ currentProjectId: id, currentRevision: revision ?? 0 });
  },

  clearError: () => set({ error: null }),
  clearConflict: () => set({ conflict: false, error: null }),
}));
