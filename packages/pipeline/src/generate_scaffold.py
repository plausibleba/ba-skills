"""
Deterministic Scaffold Generator — IR → Canonical ScaffoldModel

Constitutional rule: No LLM involvement. Deterministic and idempotent.
Same IR input produces same scaffold output.

Follows PDS core schema for ScaffoldModel.
"""

import hashlib
import json
import re
from pathlib import Path
from ir_types import IREngagementModel, IRElement, ElementType


# ── ID Generation ─────────────────────────────────────────────────

def canonical_id(prefix: str, name: str) -> str:
    """Deterministic canonical ID: prefix + name-based slug."""
    slug = re.sub(r'[^a-z0-9]+', '_', name.lower().strip()).strip('_')
    # Keep it readable but add short hash for uniqueness
    short_hash = hashlib.md5(name.encode()).hexdigest()[:6]
    return f"{prefix}_{slug[:50]}_{short_hash}"


def outcome_id(vs_name: str, stage_name: str, position: str) -> str:
    """Deterministic outcome ID."""
    combined = f"{vs_name}::{stage_name}::{position}"
    return canonical_id("outcome", combined)


# ── Generator ─────────────────────────────────────────────────────

def generate_scaffold(ir: IREngagementModel) -> dict:
    """Transform reconciled IR into canonical ScaffoldModel."""

    scaffold = {
        "schemaVersion": "3.1",
        "scaffoldId": "scaffold_iiba_v1",
        "name": "IIBA Operating Model",
        "description": (
            "Business architecture of the International Institute of Business Analysis. "
            "6 value streams covering member engagement, certification, knowledge curation, "
            "community engagement, partner relations, and thought leadership."
        ),
        "scaffoldIntegrityHash": "",  # Computed at end
        "elements": {
            "valueStreams": {},
            "activities": {},
            "outcomes": {},
            "roles": {},
            "capabilities": {},
            "metrics": {},
            "measures": {},
            "controls": {},
        },
    }

    elements = scaffold["elements"]

    # ── Build role registry ───────────────────────────────────────

    role_id_map: dict[str, str] = {}  # ir_element_id → canonical_id
    for ir_role in ir.elements["roles"]:
        cid = canonical_id("role", ir_role.name)
        role_id_map[ir_role.ir_element_id] = cid
        elements["roles"][cid] = {
            "id": cid,
            "elementType": "Role",
            "name": ir_role.name,
        }

    # ── Build capability registry ─────────────────────────────────

    cap_id_map: dict[str, str] = {}  # ir_element_id → canonical_id
    for ir_cap in ir.elements["capabilities"]:
        cid = canonical_id("cap", ir_cap.name)
        cap_id_map[ir_cap.ir_element_id] = cid
        entry = {
            "id": cid,
            "elementType": "Capability",
            "name": ir_cap.name,
        }
        if ir_cap.description:
            entry["description"] = ir_cap.description
        attrs = ir_cap.attributes
        if attrs.get("level1_area"):
            entry["level1Area"] = attrs["level1_area"]
        if attrs.get("level2_domain"):
            entry["level2Domain"] = attrs["level2_domain"]
        if attrs.get("core_object"):
            entry["coreObject"] = attrs["core_object"]
        elements["capabilities"][cid] = entry

    # ── Build metric registry ─────────────────────────────────────

    metric_id_map: dict[str, str] = {}  # ir_element_id → canonical_id
    for ir_metric in ir.elements["metrics"]:
        cid = canonical_id("metric", ir_metric.name)
        metric_id_map[ir_metric.ir_element_id] = cid
        elements["metrics"][cid] = {
            "id": cid,
            "elementType": "Metric",
            "name": ir_metric.name,
            "direction": "monitor",  # Default; needs manual calibration
            "measureIds": [],
        }

    # ── Build value streams and activities ─────────────────────────

    for ir_vs in ir.elements["value_streams"]:
        vs_cid = canonical_id("vs", ir_vs.name)
        activity_ir_ids = ir_vs.attributes.get("activity_ids", [])

        # Get activities for this VS, sorted by stage_index
        vs_activities = []
        for ir_act in ir.elements["activities"]:
            if ir_act.ir_element_id in activity_ir_ids:
                vs_activities.append(ir_act)
        vs_activities.sort(key=lambda a: a.attributes.get("stage_index", 0))

        canonical_activity_ids = []
        prev_post_outcome_cid = None

        for i, ir_act in enumerate(vs_activities):
            act_cid = canonical_id("act", f"{ir_vs.name}_{ir_act.name}")
            canonical_activity_ids.append(act_cid)
            attrs = ir_act.attributes

            # ── Outcomes ──

            # Pre-outcome: use previous stage's post-outcome for chaining
            # First stage: create entry outcome from entry criteria
            pre_outcome_cid = None
            if i == 0:
                entry_text = attrs.get("entry_criteria", "")
                if entry_text:
                    pre_outcome_cid = outcome_id(ir_vs.name, ir_act.name, "entry")
                    elements["outcomes"][pre_outcome_cid] = {
                        "id": pre_outcome_cid,
                        "elementType": "Outcome",
                        "name": _outcome_name(entry_text),
                        "description": entry_text,
                    }
            else:
                # Chain: this stage's pre-outcome = previous stage's post-outcome
                pre_outcome_cid = prev_post_outcome_cid

            # Post-outcome: from exit criteria + value item
            exit_text = attrs.get("exit_criteria", "")
            value_text = attrs.get("value_item", "")
            post_outcome_cid = outcome_id(ir_vs.name, ir_act.name, "exit")
            outcome_name = _outcome_name(exit_text or value_text)
            outcome_desc = ""
            if exit_text:
                outcome_desc += exit_text
            if value_text:
                outcome_desc += f" | Value delivered: {value_text}" if outcome_desc else value_text

            elements["outcomes"][post_outcome_cid] = {
                "id": post_outcome_cid,
                "elementType": "Outcome",
                "name": outcome_name,
                "description": outcome_desc,
            }

            prev_post_outcome_cid = post_outcome_cid

            # ── Map references to canonical IDs ──

            act_role_ids = [
                role_id_map[rid] for rid in attrs.get("role_ids", [])
                if rid in role_id_map
            ]
            act_cap_ids = [
                cap_id_map[cid] for cid in attrs.get("capability_ids", [])
                if cid in cap_id_map
            ]
            act_metric_ids = [
                metric_id_map[mid] for mid in attrs.get("metric_ids", [])
                if mid in metric_id_map
            ]

            # Deduplicate while preserving order
            act_role_ids = list(dict.fromkeys(act_role_ids))
            act_cap_ids = list(dict.fromkeys(act_cap_ids))
            act_metric_ids = list(dict.fromkeys(act_metric_ids))

            # ── Build activity ──

            activity = {
                "id": act_cid,
                "elementType": "Activity",
                "name": ir_act.name,
                "description": ir_act.description,
                "preOutcomeId": pre_outcome_cid,
                "postOutcomeId": post_outcome_cid,
                "performedByRoleIds": act_role_ids,
                "capabilityIds": act_cap_ids,
                "metricIds": act_metric_ids,
                "controlIds": [],
            }

            # Link to next activity
            if i < len(vs_activities) - 1:
                next_act_cid = canonical_id("act", f"{ir_vs.name}_{vs_activities[i+1].name}")
                activity["nextActivityId"] = next_act_cid

            elements["activities"][act_cid] = activity

        # ── Build VS ──

        elements["valueStreams"][vs_cid] = {
            "id": vs_cid,
            "elementType": "ValueStream",
            "name": ir_vs.name,
            "description": ir_vs.description,
            "activityIds": canonical_activity_ids,
        }

    # ── Compute integrity hash ────────────────────────────────────

    scaffold["scaffoldIntegrityHash"] = _compute_hash(scaffold)

    return scaffold


def _outcome_name(text: str) -> str:
    """Create concise outcome name from criteria text."""
    if not text:
        return "Stage Complete"
    # Take first clause, capitalise, truncate
    name = re.split(r'[;.|]', text)[0].strip()
    if len(name) > 80:
        name = name[:77] + "..."
    return name[0].upper() + name[1:] if name else "Stage Complete"


def _compute_hash(scaffold: dict) -> str:
    """Compute deterministic integrity hash of scaffold content."""
    # Hash the elements only (not the hash field itself)
    content = json.dumps(scaffold["elements"], sort_keys=True)
    return f"sha256:{hashlib.sha256(content.encode()).hexdigest()}"


# ── Main ──────────────────────────────────────────────────────────

def main():
    from parse_iiba import parse_capability_map, parse_value_streams

    fixtures = Path("../fixtures")
    outputs = Path("../outputs")
    outputs.mkdir(exist_ok=True)

    # Step 1: Parse → IR
    print("Step 1: Parsing spreadsheets → IR...")
    caps = parse_capability_map(str(fixtures / "IIBA_Capability_Map.xlsx"), "src_cap")
    ir = parse_value_streams(str(fixtures / "IIBA_Value_Streams.xlsx"), "src_vs", caps)

    summary = ir.summary()
    for k, v in summary.items():
        print(f"  IR {k}: {v}")

    # Step 2: Generate scaffold
    print("\nStep 2: Generating canonical scaffold...")
    scaffold = generate_scaffold(ir)

    els = scaffold["elements"]
    print(f"  Value Streams: {len(els['valueStreams'])}")
    print(f"  Activities: {len(els['activities'])}")
    print(f"  Outcomes: {len(els['outcomes'])}")
    print(f"  Roles: {len(els['roles'])}")
    print(f"  Capabilities: {len(els['capabilities'])}")
    print(f"  Metrics: {len(els['metrics'])}")
    print(f"  Controls: {len(els['controls'])}")
    print(f"  Integrity hash: {scaffold['scaffoldIntegrityHash'][:40]}...")

    # Show VS structure
    for vs_id, vs in els["valueStreams"].items():
        print(f"\n  {vs['name']} ({len(vs['activityIds'])} stages):")
        for aid in vs["activityIds"]:
            act = els["activities"][aid]
            pre = els["outcomes"].get(act.get("preOutcomeId", ""), {}).get("name", "—")
            post = els["outcomes"].get(act.get("postOutcomeId", ""), {}).get("name", "—")
            caps_n = len(act.get("capabilityIds", []))
            roles_n = len(act.get("performedByRoleIds", []))
            metrics_n = len(act.get("metricIds", []))
            print(f"    → {act['name']}")
            print(f"      pre: {pre[:60]}")
            print(f"      post: {post[:60]}")
            print(f"      caps={caps_n} roles={roles_n} metrics={metrics_n}")

    # Write scaffold
    scaffold_path = outputs / "iiba_scaffold.json"
    with open(scaffold_path, "w") as f:
        json.dump(scaffold, f, indent=2)
    print(f"\nScaffold written to: {scaffold_path}")

    return scaffold


if __name__ == "__main__":
    main()
