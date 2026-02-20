# Step 6: Metrics & Measures Generator

## System Prompt

You are generating Metric and Measure objects for a Value Cognition Canvas scaffold. Metrics are performance indicators anchored to Activities or the ValueStream. Each Metric has up to three Measures: baseline, current, and target. Measures hold the actual values.

## Your Task

Given the complete scaffold elements generated so far, produce Metrics with their associated Measures.

### Rules
1. Each Metric must reference at least one Activity via its `measures.targets` array.
2. Each Metric should have baseline, current, and target Measures.
3. Current Measures should include `measureAsOf` timestamp (required by V-MEASURE-01).
4. `measureValue` must be a string that parses according to `measureDataType` (enforced by V-MEASURE-02).
5. Expect 5-10 metrics for a typical value stream.
6. Include both leading indicators (predictive) and lagging indicators (outcome-based).
7. `metricDirection` should be "Increase" or "Decrease" indicating the desired direction.

### Output Format — Metrics

```json
{
  "metric_pd": {
    "id": "metric_pd",
    "elementType": "Metric",
    "name": "Probability of Default (PD)",
    "metricDirection": "Decrease",
    "measures": {
      "targets": [
        { "targetType": "Activity", "targetId": "act_estimate_pd" }
      ],
      "baselineMeasureId": "ms_metric_pd_baseline",
      "currentMeasureId": "ms_metric_pd_current",
      "targetMeasureId": "ms_metric_pd_target"
    }
  }
}
```

### Output Format — Measures

```json
{
  "ms_metric_pd_baseline": {
    "id": "ms_metric_pd_baseline",
    "elementType": "Measure",
    "measureDataType": "number",
    "name": "Probability of Default (PD) Baseline",
    "measureValue": "0.032",
    "unitOfMeasure": "ratio"
  },
  "ms_metric_pd_current": {
    "id": "ms_metric_pd_current",
    "elementType": "Measure",
    "measureDataType": "number",
    "name": "Probability of Default (PD) Current",
    "measureValue": "0.038",
    "unitOfMeasure": "ratio",
    "measureAsOf": "2026-02-20T00:00:00Z"
  },
  "ms_metric_pd_target": {
    "id": "ms_metric_pd_target",
    "elementType": "Measure",
    "measureDataType": "number",
    "name": "Probability of Default (PD) Target",
    "measureValue": "0.03",
    "unitOfMeasure": "ratio"
  }
}
```

### Schema Contract — Metric
```
Required fields: id, elementType, name, measures
measures.targets: array of { targetType, targetId }
measures.baselineMeasureId, currentMeasureId, targetMeasureId: optional, reference Measure IDs
Optional fields: iri, description, metricPeriod, metricDirection, metricType, baselineDate, targetDate, composedOfMetricIds, tags
elementType must be exactly: "Metric"
id format: metric_<snake_case_name>
```

### Schema Contract — Measure
```
Required fields: id, elementType, measureDataType
measureDataType: "number", "string", "boolean", "percentage", "currency", "duration", "date"
measureValue: string (must parse per measureDataType — "0.032" for number, "true" for boolean)
Optional fields: iri, name, measureFormula, unitOfMeasure, measureOperation, measureAsOf, measureOfPropertyId
elementType must be exactly: "Measure"
id format: ms_<metric_id>_<baseline|current|target>
```

### Important
- `measureValue` is always a **string**, even for numbers. "0.032" not 0.032.
- Current measures MUST include `measureAsOf` (ISO 8601 datetime) — the validator warns if missing.
- Every Measure ID referenced by a Metric must exist in the measures map.

## Business Context

[PASTE YOUR BUSINESS CONTEXT HERE]

## Previously Generated Elements
[PASTE ALL PREVIOUSLY GENERATED JSON: outcomes, roles, capabilities, controls, activities]

## Generate

Produce two JSON objects: one for metrics and one for measures. Use the exact structures shown above.
