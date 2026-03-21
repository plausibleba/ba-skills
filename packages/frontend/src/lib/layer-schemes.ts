/**
 * Shared layer scheme definitions.
 * Consumed by DiscoveryIntake (form), NetworkView (scheme selector),
 * and anywhere else that needs to display or apply layer groupings.
 *
 * Addresses R-011: LAYER_SCHEMES defined in component, not shared config.
 */

export interface LayerDef {
  id: string;
  label: string;
  description: string;
}

export interface LayerScheme {
  id: string;
  label: string;
  layers: LayerDef[];
}

export const LAYER_SCHEMES: LayerScheme[] = [
  {
    id: "ecosystem-knowledge",
    label: "Ecosystem / Knowledge",
    layers: [
      { id: "ecosystem", label: "Ecosystem (external-facing)", description: "Value streams that serve customers, partners, or external stakeholders" },
      { id: "knowledge", label: "Knowledge (internal-facing)", description: "Value streams that govern, manage, or enable internal operations" },
    ],
  },
  {
    id: "front-back",
    label: "Front Office / Back Office",
    layers: [
      { id: "front-office", label: "Front Office", description: "Revenue-generating and customer-facing operations" },
      { id: "back-office", label: "Back Office", description: "Supporting operations, finance, HR, compliance" },
    ],
  },
  {
    id: "strategic-core-enabling",
    label: "Strategic / Core / Enabling",
    layers: [
      { id: "strategic", label: "Strategic", description: "Value streams that define direction and competitive positioning" },
      { id: "core", label: "Core", description: "Value streams that directly deliver the primary value proposition" },
      { id: "enabling", label: "Enabling", description: "Value streams that support and enable the core operations" },
    ],
  },
  {
    id: "wardley",
    label: "Wardley Zones",
    layers: [
      { id: "genesis", label: "Genesis", description: "Novel, uncertain, rapidly evolving value streams" },
      { id: "custom", label: "Custom-built", description: "Differentiated, purpose-built value streams" },
      { id: "product", label: "Product", description: "Standardised, well-understood value streams" },
      { id: "commodity", label: "Commodity", description: "Utility, outsourceable value streams" },
    ],
  },
];

export const DEFAULT_SCHEME = LAYER_SCHEMES[0];

/**
 * Detect which preset scheme the scaffold is currently using by matching
 * the layoutZones array against known schemes.
 */
export function detectSchemeId(layoutZones: Array<{ id: string }> | undefined): string | null {
  if (!layoutZones || layoutZones.length === 0) return null;
  const zoneIds = layoutZones.map(z => z.id).sort().join(",");
  for (const scheme of LAYER_SCHEMES) {
    const schemeIds = scheme.layers.map(l => l.id).sort().join(",");
    if (zoneIds === schemeIds) return scheme.id;
  }
  return null; // custom or unrecognised
}
