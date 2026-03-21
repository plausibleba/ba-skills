import { useState, useCallback } from "react";
import type { PPITLayer } from "./ppit.ts";

export type CardToggleLayer = "concepts" | "policies";

export function useCanvasControls() {
  const [structureOpen, setStructureOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const [ppitToggles, setPpitToggles] = useState<Record<PPITLayer, boolean>>({
    roles: false,
    activities: false,
    concepts: false,
    applications: false,
  });
  const [cardToggles, setCardToggles] = useState<Record<CardToggleLayer, boolean>>({
    concepts: false,
    policies: false,
  });
  const [constraintDAGOpen, setConstraintDAGOpen] = useState(false);

  const toggleStructure = useCallback(() => setStructureOpen((p) => !p), []);
  const toggleAnalytics = useCallback(() => setAnalyticsOpen((p) => !p), []);
  const togglePPIT = useCallback((layer: PPITLayer) => {
    setPpitToggles((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);
  const toggleCard = useCallback((layer: CardToggleLayer) => {
    setCardToggles((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);
  const toggleConstraintDAG = useCallback(() => setConstraintDAGOpen((p) => !p), []);

  return {
    structureOpen,
    analyticsOpen,
    ppitToggles,
    cardToggles,
    constraintDAGOpen,
    toggleStructure,
    toggleAnalytics,
    togglePPIT,
    toggleCard,
    toggleConstraintDAG,
  };
}
