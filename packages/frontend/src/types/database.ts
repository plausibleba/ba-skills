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
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          display_name?: string | null;
        };
        Relationships: [];
      };
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
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: "project_access_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

/** Convenience type for a project row */
export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
export type ProjectAccessRow = Database["public"]["Tables"]["project_access"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
