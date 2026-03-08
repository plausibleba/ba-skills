## Data Model (Scaffold JSON) — v4 and v5

The frontend handles two scaffold schema versions. v4 is the IIBA/legacy format; v5 is the Water Filtration Company and newer generation format.

```
scaffold
├── scaffoldId, name, description
├── elements
│   ├── valueStreams       { id → name, description, layoutZone (v4) / zone (v5),
│   │                        activityIds[] (v4) / activityChainHead (v5) }
│   ├── activities         { id → name, description, preOutcomeId, postOutcomeId,
│   │                        requiresCapabilityIds (v4) / enabledByCapabilityIds (v5),
│   │                        performedByRoleIds,
│   │                        nextActivityId (v5 chain format),
│   │                        metricIds, controlIds,
│   │                        capabilityPPIT (v4 only — see below) }
│   ├── capabilities       { id → name, description }
│   ├── roles              { id → name }
│   ├── outcomes           { id → name, status }
│   ├── metrics            { id → name }
│   ├── controls           { id → name }
│   ├── informationObjects { id → name, type }
│   └── technologyApps     { id → name, type }
├── crossStreamOutcomes    [ { fromVsId, toVsId, outcomeId, direction } ]
└── scaffoldIntegrityHash
```

### v4 vs v5 field differences

| Concept | v4 field | v5 field |
|---------|----------|----------|
| VS activity list | `activityIds: string[]` on VS | `activityChainHead: string` on VS + `nextActivityId: string` on activity |
| VS layout zone | `layoutZone` | `zone` |
| Capability references | `requiresCapabilityIds` on activity | `enabledByCapabilityIds` on activity |
| PPIT breakdown | `capabilityPPIT` map on activity | flat `performedByRoleIds` only; no per-cap breakdown |

### capabilityPPIT (v4 only — per-activity, per-capability)

```
activity.capabilityPPIT[capabilityId] = {
  roleIds: [...],           // People — specific to this capability in this stage
  activities: [...],        // Atomic verb-object statements (3-6 per capability)
  informationObjectIds: [], // Data consumed or produced
  technologyAppIds: []      // Systems used
}
```

In v5, PPIT layers fall back to activity-level fields:
- Roles → `activity.performedByRoleIds`
- Activities → activity name
- Info / Tech → `activity.informationObjectIds` / `activity.technologyAppIds` if present

### Activity Statement Rules
- Verb + Object format (6-12 words max)
- No conjunctions, no composite logic
- Each activity creates or transforms state
- Each activity can fail — that's where friction anchors
