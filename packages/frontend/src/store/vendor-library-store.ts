// @ts-nocheck
import { create } from "zustand";
import type { VendorFeatureLibrary } from "../types.ts";

// ─── Customer Story type (matches fixture format) ───────────────────────────

export interface CustomerStory {
  storyId: string;
  company: string;
  industry: string;
  companySize: string;
  region?: string;
  status: string;
  useCase: string;
  challenge: string;
  solution: string;
  keyMetric: string;
  productsUsed: string[];
  featureTags: string[];
}

export interface CustomerStoryCatalogue {
  catalogueId: string;
  vendorId: string;
  title: string;
  lastUpdated: string;
  stories: CustomerStory[];
}

// ─── Store ──────────────────────────────────────────────────────────────────

interface VendorLibraryState {
  // User-uploaded vendor libraries (merged with hardcoded ones at consumption)
  customLibraries: VendorFeatureLibrary[];
  customStories: CustomerStoryCatalogue[];

  // Actions
  addLibrary: (lib: VendorFeatureLibrary) => void;
  removeLibrary: (vendorId: string) => void;
  updateLibrary: (vendorId: string, lib: VendorFeatureLibrary) => void;
  addStoryCatalogue: (catalogue: CustomerStoryCatalogue) => void;
  removeStoryCatalogue: (vendorId: string) => void;

  // Helpers
  getAllStories: () => CustomerStory[];
}

export const useVendorLibraryStore = create<VendorLibraryState>((set, get) => ({
  customLibraries: [],
  customStories: [],

  addLibrary: (lib) => {
    set((state) => ({
      customLibraries: [
        ...state.customLibraries.filter((l) => l.vendorId !== lib.vendorId),
        lib,
      ],
    }));
  },

  removeLibrary: (vendorId) => {
    set((state) => ({
      customLibraries: state.customLibraries.filter((l) => l.vendorId !== vendorId),
    }));
  },

  updateLibrary: (vendorId, lib) => {
    set((state) => ({
      customLibraries: state.customLibraries.map((l) =>
        l.vendorId === vendorId ? lib : l
      ),
    }));
  },

  addStoryCatalogue: (catalogue) => {
    set((state) => ({
      customStories: [
        ...state.customStories.filter((c) => c.vendorId !== catalogue.vendorId),
        catalogue,
      ],
    }));
  },

  removeStoryCatalogue: (vendorId) => {
    set((state) => ({
      customStories: state.customStories.filter((c) => c.vendorId !== vendorId),
    }));
  },

  getAllStories: () => {
    return get().customStories.flatMap((c) => c.stories);
  },
}));
