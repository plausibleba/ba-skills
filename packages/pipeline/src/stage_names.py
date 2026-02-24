"""
IIBA Stage Name Overrides

The spreadsheet has narrative descriptions, not concise stage names.
These overrides provide clean, action-oriented labels for scaffold generation.

Format: (vs_sheet_name, stage_index) → stage_name
"""

STAGE_NAMES: dict[tuple[str, int], str] = {
    # VS 1: Member Engagement & Retention
    ("Member Engagement & Retention", 0): "Market & Attract Prospects",
    ("Member Engagement & Retention", 1): "Register & Activate Membership",
    ("Member Engagement & Retention", 2): "Onboard & Orient Member",
    ("Member Engagement & Retention", 3): "Deliver Ongoing Value",
    ("Member Engagement & Retention", 4): "Renew or Exit",

    # VS 2: Certification & Credential Lifecycle
    ("Certification & Credential Lifecycle", 0): "Promote Certification Options",
    ("Certification & Credential Lifecycle", 1): "Process Application",
    ("Certification & Credential Lifecycle", 2): "Prepare Candidate",
    ("Certification & Credential Lifecycle", 3): "Deliver Examination",
    ("Certification & Credential Lifecycle", 4): "Issue Credential",
    ("Certification & Credential Lifecycle", 5): "Maintain & Recertify",

    # VS 3: Knowledge & Standards Curation
    ("Knowledge & Standards Curation", 0): "Research & Identify Gaps",
    ("Knowledge & Standards Curation", 1): "Review & Edit Content",
    ("Knowledge & Standards Curation", 2): "Produce & Distribute",
    ("Knowledge & Standards Curation", 3): "Promote & Gather Feedback",

    # VS 4: Community & Volunteer Engagement
    ("Community & Volunteer Engagement", 0): "Recruit & Assign Volunteers",
    ("Community & Volunteer Engagement", 1): "Plan Events & Programmes",
    ("Community & Volunteer Engagement", 2): "Facilitate Networking & Mentorship",
    ("Community & Volunteer Engagement", 3): "Recognise Contributions",
    ("Community & Volunteer Engagement", 4): "Collect Feedback & Improve",

    # VS 5: Partner & Institutional Engagement
    ("Partner & Institutional Engagement", 0): "Prospect & Qualify Partners",
    ("Partner & Institutional Engagement", 1): "Negotiate & Onboard",
    ("Partner & Institutional Engagement", 2): "Deliver Partner Value",
    ("Partner & Institutional Engagement", 3): "Engage & Gather Feedback",
    ("Partner & Institutional Engagement", 4): "Renew or Expand",

    # VS 6: Thought Leadership & Advocacy
    ("Thought Leadership & Advocacy", 0): "Monitor Trends & Identify Topics",
    ("Thought Leadership & Advocacy", 1): "Author & Develop Content",
    ("Thought Leadership & Advocacy", 2): "Publish & Distribute",
    ("Thought Leadership & Advocacy", 3): "Advocate & Present",
}
