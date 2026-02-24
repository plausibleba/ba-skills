"""
IR (Intermediate Representation) Types — v0.3

The contract between Ingest (Track A), Reconciliation, and
Deterministic Scaffold Generation.

Constitutional principles:
1. The IR is provisional, not canonical.
2. No IR element becomes canonical without reconciliation approval.
3. The Scaffold Generator must be deterministic and idempotent.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
import json
from datetime import datetime


# ── Enums ─────────────────────────────────────────────────────────

class ElementType(str, Enum):
    VALUE_STREAM = "ValueStream"
    ACTIVITY = "Activity"
    CAPABILITY = "Capability"
    ROLE = "Role"
    CONTROL = "Control"
    METRIC = "Metric"
    OUTCOME = "Outcome"


class DiscoveredBy(str, Enum):
    INGEST = "ingest"
    AGENT = "agent"


class ConflictType(str, Enum):
    IDENTITY = "identity"
    SCOPE = "scope"
    STRUCTURAL = "structural"
    ATTRIBUTE = "attribute"
    GAP = "gap"


class ResolutionStatus(str, Enum):
    PENDING = "pending"
    MERGED = "merged"
    REJECTED = "rejected"
    CONFIRMED = "confirmed"
    ACCEPTED = "accepted"  # v0.3: for gap/single-track elements


# ── Confidence ────────────────────────────────────────────────────

@dataclass
class Confidence:
    """
    Calibration anchors:

    dataQuality:
      0.9-1.0  Extracted from structured labelled field
      0.7-0.9  Semi-structured source, clear mapping
      0.5-0.7  Inferred from unstructured text with cues
      <0.5     Weak inference or ambiguous

    interpretiveCertainty:
      0.9-1.0  Explicit statement of function/authority/process
      0.7-0.9  Strong contextual alignment
      0.5-0.7  Plausible but inferred
      <0.5     Speculative or indirect
    """
    data_quality: float = 1.0
    interpretive_certainty: float = 1.0
    provenance_depth: int = 1


# ── Conflict ──────────────────────────────────────────────────────

@dataclass
class ConflictRecord:
    conflict_type: ConflictType
    related_element_ids: list[str] = field(default_factory=list)
    detected_by: str = "system"  # system | agent | human
    resolution_status: ResolutionStatus = ResolutionStatus.PENDING


# ── Source Registry ───────────────────────────────────────────────

@dataclass
class SourceRecord:
    source_id: str
    document_type: str  # spreadsheet, capability_map, strategy_doc, etc.
    authority_level: str  # formal, working, indicative
    filename: str
    ingestion_method: str  # parser, manual, agent
    ingested_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


# ── IR Element ────────────────────────────────────────────────────

@dataclass
class IRElement:
    ir_element_id: str
    element_type: ElementType
    name: str
    description: Optional[str] = None
    discovered_by: DiscoveredBy = DiscoveredBy.INGEST
    confidence: Confidence = field(default_factory=Confidence)
    source_refs: list[str] = field(default_factory=list)
    candidate_matches: list[str] = field(default_factory=list)
    conflict_flags: list[ConflictRecord] = field(default_factory=list)
    resolution_status: ResolutionStatus = ResolutionStatus.ACCEPTED

    # Type-specific fields stored as dict
    attributes: dict = field(default_factory=dict)


# ── IR Friction Observation ───────────────────────────────────────

@dataclass
class IRFrictionObservation:
    ir_observation_id: str
    statement: str
    proposed_category: str
    proposed_anchor_type: ElementType
    proposed_anchor_ir_id: str
    intensity_estimate: float  # 0-10
    confidence: Confidence = field(default_factory=Confidence)
    source_refs: list[str] = field(default_factory=list)
    rationale: str = ""


# ── IR Engagement Model (Root) ────────────────────────────────────

@dataclass
class IREngagementModel:
    engagement_id: str
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    sources: list[SourceRecord] = field(default_factory=list)
    elements: dict[str, list[IRElement]] = field(default_factory=lambda: {
        "value_streams": [],
        "activities": [],
        "capabilities": [],
        "roles": [],
        "controls": [],
        "metrics": [],
        "outcomes": [],
    })
    candidate_friction_observations: list[IRFrictionObservation] = field(
        default_factory=list
    )

    def add_element(self, element: IRElement):
        """Add an element to the appropriate list by type."""
        type_map = {
            ElementType.VALUE_STREAM: "value_streams",
            ElementType.ACTIVITY: "activities",
            ElementType.CAPABILITY: "capabilities",
            ElementType.ROLE: "roles",
            ElementType.CONTROL: "controls",
            ElementType.METRIC: "metrics",
            ElementType.OUTCOME: "outcomes",
        }
        key = type_map.get(element.element_type)
        if key:
            self.elements[key].append(element)

    def find_by_name(self, element_type: ElementType, name: str) -> Optional[IRElement]:
        """Find an element by type and normalised name."""
        type_map = {
            ElementType.VALUE_STREAM: "value_streams",
            ElementType.ACTIVITY: "activities",
            ElementType.CAPABILITY: "capabilities",
            ElementType.ROLE: "roles",
            ElementType.CONTROL: "controls",
            ElementType.METRIC: "metrics",
            ElementType.OUTCOME: "outcomes",
        }
        key = type_map.get(element_type, "")
        normalised = _normalise(name)
        for el in self.elements.get(key, []):
            if _normalise(el.name) == normalised:
                return el
        return None

    def summary(self) -> dict:
        return {k: len(v) for k, v in self.elements.items()}

    def to_dict(self) -> dict:
        """Serialise to plain dict for JSON export."""
        return _to_dict(self)


# ── Helpers ───────────────────────────────────────────────────────

def _normalise(s: str) -> str:
    """Normalise string for matching: lowercase, collapse whitespace."""
    import re
    return re.sub(r'\s+', ' ', s.replace('\n', ' ').replace('\xa0', ' ')).strip().lower()


def _to_dict(obj) -> dict | list | str | int | float | bool | None:
    """Recursively convert dataclasses/enums to plain dicts."""
    if isinstance(obj, Enum):
        return obj.value
    if hasattr(obj, '__dataclass_fields__'):
        return {k: _to_dict(v) for k, v in obj.__dict__.items()}
    if isinstance(obj, list):
        return [_to_dict(i) for i in obj]
    if isinstance(obj, dict):
        return {k: _to_dict(v) for k, v in obj.items()}
    return obj
