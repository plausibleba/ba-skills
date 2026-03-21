export type LayoutMode = "wrap" | "vertical" | "horizontal";

export type LayoutMap = Record<string, LayoutMode>;

export interface CapNode {
  id: string;
  name: string;
  level: number;
  parentId: string | null;
  description?: string;
  businessObject?: string;
}

export interface L3Group {
  id: string;
  name: string;
  caps: CapNode[];
}

export interface L2Group {
  id: string;
  name: string;
  l3s: L3Group[];
  caps: CapNode[];
}

export interface L1Block {
  id: string;
  name: string;
  gov: boolean;
  l2s: L2Group[];
}
