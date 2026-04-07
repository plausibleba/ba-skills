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
  const infoObjs = scaffoldData.elements.informationObjects ?? {};
  const techAppsLookup = scaffoldData.elements.technologyApplications ?? scaffoldData.elements.technologyApps ?? {};
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
    const a = act as Record<string, unknown>;
    const vsId = (a.valueStreamId as string | undefined) ?? (a.vsId as string | undefined);
    const vsName = vsId ? ((vsLookup[vsId] as unknown as Record<string, unknown>)?.name as string ?? "") : "";

    // Source 1: activity→capability links from Pass B (always present)
    // Only record the activity/VS relationship here — do NOT pull activity-level
    // roles, info objects, sub-activities, or tech into per-capability PPIT.
    // Those are shared across all capabilities in the stage and are misleading.
    // Fine-grained per-capability PPIT only comes from Source 2 (Pass C).
    const capIds: string[] = (a.enabledByCapabilityIds as string[] | undefined) ?? (a.requiresCapabilityIds as string[] | undefined) ?? [];
    for (const capId of capIds) {
      const entry = ensure(capId);
      // Do NOT add activityNames here — those are structural links, not PPIT process data.
      // Activity names only belong in the PPIT view after Pass C enrichment (Source 2).
      if (vsName) addUnique(entry.vsNames, vsName);
      if (vsName && a.name) {
        const pair = { vs: vsName, activity: a.name as string };
        if (!entry.vsActivityPairs.some((p) => p.vs === pair.vs && p.activity === pair.activity)) {
          entry.vsActivityPairs.push(pair);
        }
      }
    }

    // Source 2: capabilityPPIT from Pass C (fine-grained, may not exist)
    const ppit = a.capabilityPPIT as Record<string, any> | undefined;
    if (!ppit) continue;
    for (const [capId, decomp] of Object.entries(ppit)) {
      const d = decomp as Record<string, unknown>;
      const entry = ensure(capId);
      for (const rId of (d.roleIds as string[] | undefined) ?? []) {
        addUnique(entry.roles, ((rolesLookup[rId] as unknown as Record<string, unknown>)?.name as string ?? rId) || rId);
      }
      addUnique(entry.activityNames, (a.name as string) ?? "");
      for (const sub of (d.activities as string[] | undefined) ?? []) {
        addUnique(entry.subActivities, sub);
      }
      for (const iId of (d.informationObjectIds as string[] | undefined) ?? []) {
        addUnique(entry.infoObjects, ((infoObjs[iId] as unknown as Record<string, unknown>)?.name as string ?? iId) || iId);
      }
      for (const tId of (d.technologyAppIds as string[] | undefined) ?? []) {
        addUnique(entry.techApps, ((techAppsLookup[tId] as unknown as Record<string, unknown>)?.name as string ?? tId) || tId);
      }
      if (vsName) addUnique(entry.vsNames, vsName);
      if (vsName && a.name) {
        const pair = { vs: vsName, activity: a.name as string };
        if (!entry.vsActivityPairs.some((p) => p.vs === pair.vs && p.activity === pair.activity)) {
          entry.vsActivityPairs.push(pair);
        }
      }
    }
  }
  return map;
}
