import { useState, useCallback } from "react";
import type { PPITLayer } from "./ppit.ts";

export function useCanvasControls() {
  const [structureOpen, setStructureOpen] = useState(true);
  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const [ppitToggles, setPpitToggles] = useState<Record<PPITLayer, boolean>>({
    roles: false,
    activities: false,
    concepts: false,
    applications: false,
  });

  const toggleStructure = useCallback(() => setStructureOpen((p) => !p), []);
  const toggleAnalytics = useCallback(() => setAnalyticsOpen((p) => !p), []);
  const togglePPIT = useCallback((layer: PPITLayer) => {
    setPpitToggles((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  return {
    structureOpen,
    analyticsOpen,
    ppitToggles,
    toggleStructure,
    toggleAnalytics,
    togglePPIT,
  };
}
