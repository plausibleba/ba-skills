/**
 * Project store (D-109: Minimum Backend Schema)
 *
 * Manages CRUD for VCC projects stored in Supabase.
 * Each project = a persisted bundle with metadata (name, module, owner, sharing).
 */
import { create } from "zustand";
import { supabase, isSupabaseConfigured } from "../lib/supabase.ts";
import type { ProjectRow, ProjectModule } from "../types/database.ts";

interface ProjectState {
  projects: ProjectRow[];
  currentProjectId: string | null;
  currentRevision: number;
  loading: boolean;
  saving: boolean;
  error: string | null;

  // CRUD
  fetchProjects: () => Promise<void>;
  createProject: (name: string, module: ProjectModule, bundle: Record<string, unknown>) => Promise<string | null>;
  loadProject: (id: string) => Promise<ProjectRow | null>;
  saveProject: (id: string, bundle: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
  deleteProject: (id: string) => Promise<void>;

  // Sharing
  shareProject: (projectId: string, email: string, permission: "view" | "edit") => Promise<{ error: string | null }>;

  // State management
  setCurrentProject: (id: string | null, revision?: number) => void;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProjectId: null,
  currentRevision: 0,
  loading: false,
  saving: false,
  error: null,

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

    set({
      loading: false,
      currentProjectId: id,
      currentRevision: data.revision,
    });
    return data as ProjectRow;
  },

  saveProject: async (id, bundle) => {
    if (!isSupabaseConfigured) return { ok: false, error: "Not configured" };
    set({ saving: true, error: null });

    const knownRevision = get().currentRevision;

    // Optimistic lock check: only update if revision matches
    const { data, error } = await supabase
      .from("projects")
      .update({ bundle })
      .eq("id", id)
      .eq("revision", knownRevision)  // optimistic lock
      .select("revision")
      .single();

    if (error) {
      // Could be a conflict (revision mismatch) or other error
      set({ saving: false, error: error.message });
      return { ok: false, error: error.message };
    }

    if (!data) {
      // No rows updated — revision mismatch (conflict)
      set({ saving: false, error: "Conflict: project was modified by another user. Please reload." });
      return { ok: false, error: "conflict" };
    }

    set({ saving: false, currentRevision: data.revision });
    return { ok: true };
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

    // Look up user by email — requires a Supabase edge function or RPC
    // For MVP, we'll store by email and resolve on access
    // Simplified: use Supabase admin API or a simple RPC function
    // For now, return an informational error
    return { error: "Sharing by email requires a server-side function. Coming in Phase 2." };
  },

  setCurrentProject: (id, revision) => {
    set({ currentProjectId: id, currentRevision: revision ?? 0 });
  },

  clearError: () => set({ error: null }),
}));
