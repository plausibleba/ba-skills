# Step 08: Metrics & Measures

## Phase C — Depth

## System Prompt

You are adding Metrics and Measures to a validated scaffold. Metrics are performance indicators anchored to Activities or the ValueStream. Each Metric has up to three Measures: baseline (where we were), current (where we are), and target (where we want to be).

## Your Task

Given the validated activities, produce Metrics with their associated Measures.

### Rules
1. Each Metric must reference at least one Activity via `measures.targets`.
2. Each Metric should have baseline, current, and target Measures.
3. Current Measures MUST include `measureAsOf` timestamp (V-MEASURE-01).
4. `measureValue` must be a string that parses per `measureDataType` (V-MEASURE-02).
5. Expect 5-10 metrics for a typical value stream.
6. Include both leading indicators (predictive) and lagging indicators (outcome-based).

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
Required: id, elementType, name, measures
measures.targets: array of { targetType, targetId }
Optional: iri, description, metricPeriod, metricDirection, metricType, baselineDate, targetDate, composedOfMetricIds, tags
elementType: "Metric" | id format: metric_<name>
```

### Schema Contract — Measure
```
Required: id, elementType, measureDataType
measureDataType: "number", "string", "boolean", "percentage", "currency", "duration", "date"
measureValue: always a STRING (e.g., "0.032" not 0.032)
Current measures MUST include measureAsOf (ISO 8601)
Optional: iri, name, measureFormula, unitOfMeasure, measureOperation, measureOfPropertyId
elementType: "Measure" | id format: ms_<metric_id>_<baseline|current|target>
```

### Also produce: Activity metricIds updates
```
act_estimate_pd → metricIds: ["metric_pd"]
act_monitor_risk_signals → metricIds: ["metric_threshold_breach"]
```

## Previously Generated Elements

[PASTE: Activities JSON, ValueStream definition]

## Generate

Produce three outputs: metrics JSON, measures JSON, and activity metricIds update mapping.
