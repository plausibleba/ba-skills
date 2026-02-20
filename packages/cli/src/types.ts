export interface RunJson {
  engagement: string;
  runId: string;
  packVersion: string;
  createdAt: string;
  operator: string;
  notes: string;
  sources: string[];
}

export interface Patch {
  target: { elementType: string; id: string };
  op: "add" | "set";
  path: string;
  values: string[];
}

export interface MappingFile {
  version: string;
  generatedAt: string;
  patches: Patch[];
}

export interface ValueStreamConfig {
  valueStreamId?: string;
  name?: string;
  description?: string;
  scaffoldId?: string;
}
