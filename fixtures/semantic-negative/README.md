# Semantic Negative Fixture Suite

These fixtures are **schema-valid** (they should pass AJV/JSON Schema) but are designed to fail **semantic validation rules**.

## Files
- **scaffold_semantic_cycle_nextActivity.json** — Semantic: nextActivityId chain contains a cycle (last -> first).
- **scaffold_semantic_disconnected_chain.json** — Semantic: valueStream.activityIds contains activities unreachable from chain start (broken nextActivityId).
- **scaffold_semantic_duplicate_activityIds.json** — Semantic: valueStream.activityIds contains duplicates (violates exactly-once sequencing).
- **scaffold_semantic_inconsistent_outcome_chain.json** — Semantic: activity preOutcome does not align with prior postOutcome (checkpoint chain inconsistent).
- **scaffold_semantic_measure_value_type_mismatch.json** — Semantic: measureDataType=Number but measureValue is non-numeric (type/parse mismatch).
- **heatmap_semantic_anchor_type_mismatch.json** — Semantic: primaryAnchor.anchorType=Measure but anchorId references an Activity ID.
- **heatmap_semantic_unknown_anchor_id.json** — Semantic: contributingAnchors contains an ID not present in scaffold elements.
- **heatmap_semantic_bindingConstraint_inconsistent.json** — Semantic: bindingConstraint.bindingAnchor does not match the referenced observation's primaryAnchor.
- **heatmap_semantic_scaffold_hash_mismatch.json** — Semantic: scaffoldIntegrityHash intentionally mismatched (should fail integrity cross-check).
