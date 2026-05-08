/**
 * Zustand store for the AES (Agentic Enablement Score) layer.
 *
 * Holds:
 *  - Profile selection (currently always "financial-services")
 *  - Per-capability AES inputs (enrichment scores per dimension)
 *  - Memoised AES scores keyed by capability ID
 *
 * Inputs can come from three sources:
 *  - seedFromScaffold(): deterministic-heuristic seeding (default for demo)
 *  - User edit (Phase 2.4 — InspectorPanel allows tweaking dimension scores)
 *  - Imported fixture (Phase 3 — hand-built Finance BPO scenario)
 *
 * Scores are computed lazily and cached. Setting/clearing inputs invalidates
 * the cache for that capability.
 */

import { create } from "zustand";
import type { ScaffoldData } from "../types";
import {
  computeAES,
  type AESScore,
  type EnrichmentInputs,
  type ScoringProfile,
  FINANCIAL_SERVICES_PROFILE,
  getProfileById,
} from "../domain/agentic-enablement";
import { seedInputsForScaffold } from "../domain/agentic-enablement/seed";

interface AgenticEnablementState {
  /** Active profile id (must exist in profile registry). */
  profileId: string;
  /** AES inputs keyed by capability ID. */
  inputs: Record<string, EnrichmentInputs>;
  /** Computed AES scores keyed by capability ID. */
  scores: Record<string, AESScore>;

  // ── Actions ──────────────────────────────────────────────────────────
  setProfile(profileId: string): void;
  /** Replace all inputs (e.g., on scaffold load or scenario import). */
  setInputs(inputs: Record<string, EnrichmentInputs>): void;
  /** Update inputs for a single capability. */
  setCapabilityInputs(capabilityId: string, inputs: EnrichmentInputs): void;
  /** Seed inputs deterministically from a loaded scaffold. */
  seedFromScaffold(scaffold: ScaffoldData): void;
  /** Recompute all scores against the current profile. */
  recomputeAll(): void;
  /** Clear all inputs and scores. */
  clear(): void;
}

function profileForId(id: string): ScoringProfile {
  return getProfileById(id) ?? FINANCIAL_SERVICES_PROFILE;
}

function recompute(
  inputs: Record<string, EnrichmentInputs>,
  profile: ScoringProfile,
): Record<string, AESScore> {
  const scores: Record<string, AESScore> = {};
  for (const [capId, capInputs] of Object.entries(inputs)) {
    if (capInputs.profileId !== profile.id) continue;
    try {
      scores[capId] = computeAES(capInputs, profile);
    } catch (_err) {
      // Skip capabilities whose inputs don't match the active profile.
      continue;
    }
  }
  return scores;
}

export const useAgenticEnablementStore = create<AgenticEnablementState>(
  (set, get) => ({
    profileId: FINANCIAL_SERVICES_PROFILE.id,
    inputs: {},
    scores: {},

    setProfile(profileId) {
      const profile = profileForId(profileId);
      const inputs = get().inputs;
      // Re-tag inputs to the new profile if they were tagged differently —
      // simple migration helper for the demo.
      const reTagged: Record<string, EnrichmentInputs> = {};
      for (const [k, v] of Object.entries(inputs)) {
        reTagged[k] = { ...v, profileId };
      }
      set({
        profileId,
        inputs: reTagged,
        scores: recompute(reTagged, profile),
      });
    },

    setInputs(inputs) {
      const profile = profileForId(get().profileId);
      set({ inputs, scores: recompute(inputs, profile) });
    },

    setCapabilityInputs(capabilityId, capInputs) {
      const profile = profileForId(get().profileId);
      const inputs = { ...get().inputs, [capabilityId]: capInputs };
      const scores = { ...get().scores };
      try {
        scores[capabilityId] = computeAES(capInputs, profile);
      } catch (_err) {
        delete scores[capabilityId];
      }
      set({ inputs, scores });
    },

    seedFromScaffold(scaffold) {
      const profile = profileForId(get().profileId);
      const inputs = seedInputsForScaffold(scaffold);
      // Override profile id if it differs.
      const tagged: Record<string, EnrichmentInputs> = {};
      for (const [k, v] of Object.entries(inputs)) {
        tagged[k] = { ...v, profileId: profile.id };
      }
      set({ inputs: tagged, scores: recompute(tagged, profile) });
    },

    recomputeAll() {
      const profile = profileForId(get().profileId);
      set({ scores: recompute(get().inputs, profile) });
    },

    clear() {
      set({ inputs: {}, scores: {} });
    },
  }),
);

// ── Selectors ───────────────────────────────────────────────────────────

/** Get the AES score for one capability (returns undefined if not scored). */
export function useAESForCapability(capabilityId: string): AESScore | undefined {
  return useAgenticEnablementStore((s) => s.scores[capabilityId]);
}

/** Get the AES inputs for one capability. */
export function useAESInputsForCapability(capabilityId: string): EnrichmentInputs | undefined {
  return useAgenticEnablementStore((s) => s.inputs[capabilityId]);
}

/** Get the active profile object. */
export function useActiveProfile(): ScoringProfile {
  const id = useAgenticEnablementStore((s) => s.profileId);
  return profileForId(id);
}
