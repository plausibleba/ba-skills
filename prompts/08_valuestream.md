# Step 8: ValueStream Assembly

## System Prompt

You are assembling the ValueStream object that ties together all the elements generated in previous steps. The ValueStream is the top-level container that references Activities, Capabilities, and Metrics.

## Your Task

Given all previously generated elements, produce the ValueStream object.

### Rules
1. `activityIds` must list ALL activity IDs in chain order (first activity to last).
2. `capabilityIds` should list ALL capabilities used across the value stream.
3. `metricIds` should list ALL metrics anchored to the value stream.
4. The name and description should be board-appropriate — concise, governance-oriented.

### Output Format (exact JSON structure required)

```json
{
  "vs_credit_risk_assessment_mgmt": {
    "id": "vs_credit_risk_assessment_mgmt",
    "elementType": "ValueStream",
    "name": "Credit Risk Assessment and Management",
    "description": "Governance abstraction of credit risk lifecycle from case initiation through assessment, mitigation, reporting, and threshold recalibration.",
    "activityIds": [
      "act_compile_credit_data_profile",
      "act_estimate_pd",
      "act_profile_exposure_concentration",
      "act_estimate_lgd_rwa",
      "act_monitor_risk_signals",
      "act_approve_mitigation_action",
      "act_execute_mitigation_actions",
      "act_produce_risk_reports",
      "act_review_thresholds_models"
    ],
    "capabilityIds": [
      "cap_credit_assessment_mgmt",
      "cap_creditworthiness_assurance",
      "cap_credit_application_oversight",
      "cap_counterparty_risk_assessment",
      "cap_risk_countermeasure_deployment",
      "cap_credit_application_mgmt",
      "cap_information_mgmt",
      "cap_regulatory_compliance_mgmt"
    ],
    "metricIds": [
      "metric_pd",
      "metric_ead",
      "metric_lgd",
      "metric_rwa",
      "metric_concentration",
      "metric_delinquency",
      "metric_migration",
      "metric_threshold_breach",
      "metric_reporting_timeliness"
    ]
  }
}
```

### Schema Contract
```
Required fields: id, elementType, name, activityIds
Optional fields: iri, description, capabilityIds, metricIds, tags
elementType must be exactly: "ValueStream"
id format: vs_<snake_case_name>
activityIds: must contain at least 1 item, all must reference existing activities
```

### Self-Check
- [ ] activityIds lists all generated activities in chain order
- [ ] capabilityIds includes every capability referenced by any activity
- [ ] metricIds includes every metric generated
- [ ] No duplicate IDs in any array

## Previously Generated Elements
[PASTE ALL PREVIOUSLY GENERATED JSON: outcomes, roles, capabilities, controls, activities, metrics, measures, conditions]

## Generate

Produce the ValueStream JSON object.
