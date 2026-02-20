# Negative Fixture Suite
Each JSON file is intentionally invalid against the canonical schema and is designed to fail a *single* class of validation.
## Files
- **scaffold_missing_outcomes.json** — ScaffoldModel: missing required elements.outcomes map
- **scaffold_valueStream_missing_activityIds.json** — ScaffoldModel: ValueStream missing required activityIds
- **scaffold_activity_unknown_role.json** — ScaffoldModel: Activity references non-existent role in performedByRoleIds
- **scaffold_metric_missing_measure_ref.json** — ScaffoldModel: Metric.measures.currentMeasureId points to missing Measure
- **scaffold_broken_nextActivity_chain.json** — ScaffoldModel: Activity.nextActivityId points to missing activity
- **scaffold_additionalProperties_violation.json** — ScaffoldModel: Activity has unexpected field (additionalProperties false)
- **heatmap_invalid_category_enum.json** — FrictionHeatmap: observation.category not in enum
- **heatmap_invalid_anchorType.json** — FrictionHeatmap: primaryAnchor.anchorType invalid
- **heatmap_bindingConstraint_missing_observation.json** — FrictionHeatmap: bindingConstraint.bindingAnchorObservationId not found in observations
- **heatmap_missing_rationale.json** — FrictionHeatmap: observation missing required rationale
- **heatmap_invalid_scaffoldIntegrityHash.json** — FrictionHeatmap: scaffoldIntegrityHash fails pattern (expects 64-hex)
- **heatmap_additionalProperties_violation.json** — FrictionHeatmap: observation has unexpected field (additionalProperties false)
