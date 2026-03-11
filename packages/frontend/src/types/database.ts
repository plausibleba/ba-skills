/**
 * Supabase database type definitions (D-109: Minimum Backend Schema)
 *
 * Generated manually to match the SQL migration in supabase/migrations/.
 * Regenerate with `supabase gen types typescript` after schema changes.
 */

export type ProjectModule = "sales-discovery" | "board-diagnostic" | "transformation";

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          module: ProjectModule;
          bundle: Record<string, unknown>;
          schema_version: number;
          revision: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;  // defaults to auth.uid()
          name: string;
          module?: ProjectModule;
          bundle: Record<string, unknown>;
          schema_version?: number;
          revision?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          module?: ProjectModule;
          bundle?: Record<string, unknown>;
          schema_version?: number;
          revision?: number;
          updated_at?: string;
        };
      };
      project_access: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          permission: "view" | "edit";
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          permission: "view" | "edit";
          created_at?: string;
        };
        Update: {
          permission?: "view" | "edit";
        };
      };
    };
  };
}

/** Convenience type for a project row */
export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
export type ProjectAccessRow = Database["public"]["Tables"]["project_access"]["Row"];
