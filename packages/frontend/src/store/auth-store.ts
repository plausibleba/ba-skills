/**
 * Auth store (D-108: Backend Architecture)
 *
 * Manages user session via Supabase Auth.
 * Falls back to local-only mode when Supabase is not configured.
 */
import { create } from "zustand";
import { supabase, isSupabaseConfigured } from "../lib/supabase.ts";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isLocalMode: boolean; // true when Supabase not configured — single-user file mode

  initialize: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  isLocalMode: !isSupabaseConfigured,

  initialize: async () => {
    if (!isSupabaseConfigured) {
      set({ loading: false, isLocalMode: true });
      return;
    }

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    set({
      user: session?.user ?? null,
      session,
      loading: false,
    });

    // Listen for auth state changes
    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        user: session?.user ?? null,
        session,
      });
    });
  },

  signInWithGoogle: async () => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) console.error("[VCC Auth] Google sign-in error:", error.message);
  },

  signInWithEmail: async (email: string) => {
    if (!isSupabaseConfigured) return { error: "Supabase not configured" };
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      console.error("[VCC Auth] Magic link error:", error.message);
      return { error: error.message };
    }
    return { error: null };
  },

  signUp: async (email: string, password: string) => {
    if (!isSupabaseConfigured) return { error: "Supabase not configured" };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      console.error("[VCC Auth] Sign-up error:", error.message);
      return { error: error.message };
    }
    return { error: null };
  },

  signInWithPassword: async (email: string, password: string) => {
    if (!isSupabaseConfigured) return { error: "Supabase not configured" };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("[VCC Auth] Password sign-in error:", error.message);
      return { error: error.message };
    }
    return { error: null };
  },

  resetPasswordForEmail: async (email: string) => {
    if (!isSupabaseConfigured) return { error: "Supabase not configured" };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}?reset=true`,
    });
    if (error) {
      console.error("[VCC Auth] Password reset error:", error.message);
      return { error: error.message };
    }
    return { error: null };
  },

  updatePassword: async (newPassword: string) => {
    if (!isSupabaseConfigured) return { error: "Supabase not configured" };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      console.error("[VCC Auth] Update password error:", error.message);
      return { error: error.message };
    }
    return { error: null };
  },

  signOut: async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
}));
