export interface PPITEntry {
  roles: string[];
  activityNames: string[];
  subActivities: string[];
  infoObjects: string[];
  techApps: string[];
  vsNames: string[];
  vsActivityPairs: { vs: string; activity: string }[];
}

export function buildPPITByCapId(scaffoldData: any): Map<string, PPITEntry> {
  if (!scaffoldData?.elements?.activities) return new Map<string, PPITEntry>();
  const map = new Map<string, PPITEntry>();
  const rolesLookup = scaffoldData.elements.roles ?? {};
  const infoObjs = (scaffoldData.elements as any).informationObjects ?? {};
  const techAppsLookup = (scaffoldData.elements as any).technologyApplications ?? (scaffoldData.elements as any).technologyApps ?? {};
  const vsLookup = scaffoldData.elements.valueStreams ?? {};

  const ensure = (capId: string): PPITEntry => {
    if (!map.has(capId)) map.set(capId, {
      roles: [], activityNames: [], subActivities: [], infoObjects: [], techApps: [],
      vsNames: [], vsActivityPairs: [],
    });
    return map.get(capId)!;
  };
  const addUnique = (arr: string[], val: string) => { if (val && !arr.includes(val)) arr.push(val); };

  for (const [, act] of Object.entries(scaffoldData.elements.activities)) {
    const a = act as any;
    const vsId = a.valueStreamId ?? a.vsId;
    const vsName = vsId ? ((vsLookup as any)[vsId]?.name ?? "") : "";

    // Source 1: activity→capability links from Pass B (always present)
    // Only record the activity/VS relationship here — do NOT pull activity-level
    // roles, info objects, sub-activities, or tech into per-capability PPIT.
    // Those are shared across all capabilities in the stage and are misleading.
    // Fine-grained per-capability PPIT only comes from Source 2 (Pass C).
    const capIds: string[] = a.enabledByCapabilityIds ?? a.requiresCapabilityIds ?? [];
    for (const capId of capIds) {
      const entry = ensure(capId);
      // Do NOT add activityNames here — those are structural links, not PPIT process data.
      // Activity names only belong in the PPIT view after Pass C enrichment (Source 2).
      if (vsName) addUnique(entry.vsNames, vsName);
      if (vsName && a.name) {
        const pair = { vs: vsName, activity: a.name };
        if (!entry.vsActivityPairs.some((p: any) => p.vs === pair.vs && p.activity === pair.activity)) {
          entry.vsActivityPairs.push(pair);
        }
      }
    }

    // Source 2: capabilityPPIT from Pass C (fine-grained, may not exist)
    const ppit = a.capabilityPPIT;
    if (!ppit) continue;
    for (const [capId, decomp] of Object.entries(ppit)) {
      const d = decomp as any;
      const entry = ensure(capId);
      for (const rId of d.roleIds ?? []) {
        addUnique(entry.roles, (rolesLookup as any)[rId]?.name ?? rId);
      }
      addUnique(entry.activityNames, a.name ?? "");
      for (const sub of d.activities ?? []) {
        addUnique(entry.subActivities, sub);
      }
      for (const iId of d.informationObjectIds ?? []) {
        addUnique(entry.infoObjects, (infoObjs as any)[iId]?.name ?? iId);
      }
      for (const tId of d.technologyAppIds ?? []) {
        addUnique(entry.techApps, (techAppsLookup as any)[tId]?.name ?? tId);
      }
      if (vsName) addUnique(entry.vsNames, vsName);
      if (vsName && a.name) {
        const pair = { vs: vsName, activity: a.name };
        if (!entry.vsActivityPairs.some((p: any) => p.vs === pair.vs && p.activity === pair.activity)) {
          entry.vsActivityPairs.push(pair);
        }
      }
    }
  }
  return map;
}
