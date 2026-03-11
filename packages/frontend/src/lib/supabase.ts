/**
 * Supabase client singleton (D-108: Backend Architecture)
 *
 * Reads config from environment variables set in .env.local:
 *   VITE_SUPABASE_URL      — your Supabase project URL
 *   VITE_SUPABASE_ANON_KEY — your Supabase anonymous/public key
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.ts";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[VCC] Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local for multi-user mode."
  );
}

export const supabase = createClient<Database>(
  supabaseUrl ?? "http://localhost:54321",
  supabaseAnonKey ?? "placeholder",
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

/** True when Supabase is properly configured */
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);
