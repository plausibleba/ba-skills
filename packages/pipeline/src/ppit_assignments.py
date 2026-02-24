"""
Capability-level PPIT (People, Process, Information, Technology) assignments.

This module enriches each capability instance with:
  - roles: specific roles (not inherited from stage)
  - processActivity: the process step this capability supports
  - informationObjects: data/content items consumed or produced
  - technologyApps: systems and tools used

These are informed estimates for IIBA validation, not source-of-record data.
"""

# Structure: { capability_name: { stage_name: { roles, process, info, tech } } }
# Where the same capability appears in multiple stages, assignments differ.

PPIT_MAP: dict[str, dict[str, dict]] = {

    # ══════════════════════════════════════════════════════════════
    # VALUE STREAM 1: Member Engagement & Retention
    # ══════════════════════════════════════════════════════════════

    # Stage 1: Market & Attract Prospects
    "Member Marketing": {
        "Market & Attract Prospects": {
            "roles": ["Marketing Team", "Chapters"],
            "process": "Design and execute member acquisition campaigns",
            "info": ["Campaign Brief", "Target Audience Profile", "Marketing Calendar"],
            "tech": ["CRM", "Marketing Automation Platform", "Analytics Dashboard"],
        },
    },
    "Community Communications": {
        "Market & Attract Prospects": {
            "roles": ["Marketing Team", "Chapter Leaders"],
            "process": "Distribute awareness content to community channels",
            "info": ["Content Calendar", "Chapter Distribution List", "Brand Guidelines"],
            "tech": ["Email Platform", "CMS", "Social Media Tools"],
        },
        "Onboard & Orient Member": {
            "roles": ["Membership Services", "Chapter Leaders"],
            "process": "Welcome new member and connect to local chapter",
            "info": ["Welcome Pack Content", "Chapter Directory", "Member Profile"],
            "tech": ["CRM", "Email Platform", "Chapter Portal"],
        },
        "Facilitate Networking & Mentorship": {
            "roles": ["Community Managers", "Chapter Leaders"],
            "process": "Coordinate community announcements and discussion facilitation",
            "info": ["Community Newsletter", "Discussion Topics", "Event Calendar"],
            "tech": ["Community Platform", "Email Platform", "Collaboration Tools"],
        },
    },
    "Social Media & Marketing": {
        "Market & Attract Prospects": {
            "roles": ["Marketing Team"],
            "process": "Manage social media presence and paid campaigns",
            "info": ["Social Content Calendar", "Campaign Performance Data", "Audience Insights"],
            "tech": ["Social Media Management Platform", "Analytics Dashboard", "Ad Platform"],
        },
        "Publish & Distribute": {
            "roles": ["Social Media Managers", "Marketing & Communications"],
            "process": "Amplify thought leadership content via social channels",
            "info": ["Content Assets", "Promotional Schedule", "Engagement Metrics"],
            "tech": ["Social Media Management Platform", "Analytics Dashboard", "CMS"],
        },
    },

    # Stage 2: Register & Activate Membership
    "Member Onboarding": {
        "Register & Activate Membership": {
            "roles": ["Membership Services", "Prospect"],
            "process": "Process membership application and provision credentials",
            "info": ["Application Form", "Membership Tier Definition", "Payment Confirmation"],
            "tech": ["Membership Management System", "Payment Gateway", "CRM"],
        },
        "Onboard & Orient Member": {
            "roles": ["Membership Services", "New Member"],
            "process": "Guide new member through orientation and resource discovery",
            "info": ["Onboarding Checklist", "Resource Guide", "Member Profile"],
            "tech": ["Membership Portal", "LMS", "Email Platform"],
        },
    },
    "Member Account Management": {
        "Register & Activate Membership": {
            "roles": ["Membership Services"],
            "process": "Create and configure member account in systems",
            "info": ["Member Record", "Contact Details", "Membership Agreement"],
            "tech": ["Membership Management System", "CRM", "Identity Provider"],
        },
        "Renew or Exit": {
            "roles": ["Membership Services", "Member"],
            "process": "Manage account updates, status changes and data retention",
            "info": ["Member Record", "Renewal History", "Communication Preferences"],
            "tech": ["Membership Management System", "CRM"],
        },
    },
    "Billing & Collections": {
        "Register & Activate Membership": {
            "roles": ["Finance"],
            "process": "Process membership fee and issue invoice",
            "info": ["Invoice", "Payment Record", "Fee Schedule"],
            "tech": ["Payment Gateway", "Accounting System", "CRM"],
        },
        "Renew or Exit": {
            "roles": ["Finance", "Membership Services"],
            "process": "Process renewal payment or final billing",
            "info": ["Renewal Invoice", "Payment History", "Refund Policy"],
            "tech": ["Payment Gateway", "Accounting System"],
        },
        "Process Application": {
            "roles": ["Finance", "Certification Services"],
            "process": "Process certification exam fee payment",
            "info": ["Exam Fee Schedule", "Invoice", "Payment Confirmation"],
            "tech": ["Payment Gateway", "Accounting System"],
        },
        "Renew or Expand": {
            "roles": ["Finance", "Partner Manager"],
            "process": "Process partner renewal billing or expansion invoicing",
            "info": ["Partner Invoice", "Contract Terms", "Payment History"],
            "tech": ["Payment Gateway", "Accounting System", "Partner Portal"],
        },
    },

    # Stage 3: Onboard & Orient Member
    "Member Benefits Delivery": {
        "Onboard & Orient Member": {
            "roles": ["Membership Services", "Volunteers"],
            "process": "Provision access to member benefits and resources",
            "info": ["Benefits Catalogue", "Access Entitlements", "KnowledgeHub Credentials"],
            "tech": ["Membership Portal", "KnowledgeHub", "SSO Provider"],
        },
        "Deliver Ongoing Value": {
            "roles": ["Knowledge Team", "Chapter Leaders"],
            "process": "Deliver ongoing benefits including content, events and tools",
            "info": ["Benefits Usage Report", "Content Library", "Event Schedule"],
            "tech": ["KnowledgeHub", "Event Platform", "Career Tools"],
        },
    },
    "Networking & Mentorship Programmes": {
        "Onboard & Orient Member": {
            "roles": ["Chapters", "Mentors"],
            "process": "Match new member with mentor and introduce networking opportunities",
            "info": ["Mentor Directory", "Member Interests Profile", "Chapter Events"],
            "tech": ["Mentorship Platform", "Community Portal", "CRM"],
        },
        "Deliver Ongoing Value": {
            "roles": ["Mentors", "Mentees", "Chapter Leaders"],
            "process": "Facilitate ongoing mentorship sessions and networking events",
            "info": ["Mentorship Progress Log", "Session Notes", "Event Feedback"],
            "tech": ["Mentorship Platform", "Video Conferencing", "Community Portal"],
        },
    },

    # Stage 4: Deliver Ongoing Value
    "Event Planning & Management": {
        "Deliver Ongoing Value": {
            "roles": ["Chapter Leaders", "Volunteers", "Event Planners"],
            "process": "Plan, promote and deliver member events and webinars",
            "info": ["Event Brief", "Speaker Roster", "Attendee List", "Feedback Survey"],
            "tech": ["Event Platform", "Registration System", "Video Conferencing"],
        },
    },
    "Education & Training Content Management": {
        "Deliver Ongoing Value": {
            "roles": ["Knowledge Team", "Chapter Leaders"],
            "process": "Curate and deliver educational content for member development",
            "info": ["Course Catalogue", "Learning Path", "Completion Records"],
            "tech": ["LMS", "KnowledgeHub", "Content Authoring Tools"],
        },
        "Prepare Candidate": {
            "roles": ["Training Partners", "Chapter Mentors"],
            "process": "Deliver exam preparation materials and study guidance",
            "info": ["Study Guide", "Practice Exams", "Competency Framework"],
            "tech": ["LMS", "Assessment Platform", "KnowledgeHub"],
        },
    },

    # Stage 5: Renew or Exit
    "Membership Renewal & Retention": {
        "Renew or Exit": {
            "roles": ["Membership Services", "Member"],
            "process": "Execute renewal campaign and process retention interventions",
            "info": ["Renewal Reminder", "Engagement Score", "Exit Survey", "Retention Offer"],
            "tech": ["CRM", "Marketing Automation Platform", "Survey Platform"],
        },
    },
    "Integrated Marketing Communication": {
        "Renew or Exit": {
            "roles": ["Marketing Team", "Membership Services"],
            "process": "Deliver targeted retention and win-back communications",
            "info": ["Segmentation Data", "Communication Templates", "Campaign Results"],
            "tech": ["Marketing Automation Platform", "CRM", "Email Platform"],
        },
    },

    # ══════════════════════════════════════════════════════════════
    # VALUE STREAM 2: Certification & Credential Lifecycle
    # ══════════════════════════════════════════════════════════════

    "Eligibility & Prerequisite Management": {
        "Promote Certification Options": {
            "roles": ["Certification Services", "Marketing Team"],
            "process": "Assess and communicate eligibility criteria per certification path",
            "info": ["Certification Requirements", "Prerequisite Checklist", "Eligibility Matrix"],
            "tech": ["Certification Portal", "CRM", "Website CMS"],
        },
    },
    "Integrated Marketing Communications": {
        "Promote Certification Options": {
            "roles": ["Marketing Team", "Training Partners"],
            "process": "Promote certification programmes to target audiences",
            "info": ["Certification Brochure", "Partner Marketing Kit", "Testimonials"],
            "tech": ["Marketing Automation Platform", "CRM", "Website CMS"],
        },
        "Prospect & Qualify Partners": {
            "roles": ["Business Development Manager"],
            "process": "Market partner programme benefits to prospective organisations",
            "info": ["Partner Programme Brochure", "Value Proposition", "Case Studies"],
            "tech": ["CRM", "Marketing Automation Platform", "Website CMS"],
        },
    },
    "Candidate Scheduling & Logistics": {
        "Process Application": {
            "roles": ["Certification Services", "Candidate"],
            "process": "Schedule exam session and confirm logistics",
            "info": ["Exam Schedule", "Testing Centre Directory", "Booking Confirmation"],
            "tech": ["Exam Scheduling System", "Certification Portal", "Email Platform"],
        },
    },
    "Assessment & Scoring": {
        "Deliver Examination": {
            "roles": ["Exam Proctoring Provider", "Certification Board"],
            "process": "Administer exam, score results and communicate outcome",
            "info": ["Exam Paper", "Answer Key", "Score Report", "Pass/Fail Threshold"],
            "tech": ["Assessment Platform", "Proctoring System", "Certification Portal"],
        },
    },
    "Endorsed Education Provider Relations": {
        "Prepare Candidate": {
            "roles": ["Training Partners", "Certification Services"],
            "process": "Manage endorsed training provider quality and alignment",
            "info": ["Provider Agreement", "Curriculum Alignment Matrix", "Quality Review"],
            "tech": ["Partner Portal", "LMS", "Certification Portal"],
        },
    },
    "Continuing Professional Development": {
        "Maintain & Recertify": {
            "roles": ["Certified BA", "Certification Services"],
            "process": "Track CDU accumulation and process recertification",
            "info": ["CDU Log", "Recertification Application", "Activity Evidence"],
            "tech": ["Certification Portal", "LMS", "CDU Tracking System"],
        },
    },

    # ══════════════════════════════════════════════════════════════
    # VALUE STREAM 3: Knowledge & Standards Curation
    # ══════════════════════════════════════════════════════════════

    "Market & Trends Research": {
        "Research & Identify Gaps": {
            "roles": ["Research Team", "Volunteer SMEs"],
            "process": "Conduct environmental scan and identify emerging practice areas",
            "info": ["Industry Report", "Trend Analysis", "Gap Assessment"],
            "tech": ["Research Database", "Survey Platform", "Analytics Dashboard"],
        },
        "Monitor Trends & Identify Topics": {
            "roles": ["Thought-Leadership Committee", "Research Team"],
            "process": "Monitor industry and practice trends for thought leadership topics",
            "info": ["Trend Report", "Topic Prioritisation Matrix", "Competitor Analysis"],
            "tech": ["Research Database", "Social Listening Tools", "Analytics Dashboard"],
        },
    },
    "Salary & Benchmark Surveys": {
        "Research & Identify Gaps": {
            "roles": ["Research Team", "Partners"],
            "process": "Design and conduct salary and practice benchmark surveys",
            "info": ["Survey Instrument", "Benchmark Dataset", "Salary Report"],
            "tech": ["Survey Platform", "Data Analysis Tools", "Reporting Dashboard"],
        },
        "Monitor Trends & Identify Topics": {
            "roles": ["Research Team", "Product Team"],
            "process": "Analyse benchmark data for thought leadership insights",
            "info": ["Benchmark Results", "Comparative Analysis", "Infographic Assets"],
            "tech": ["Data Analysis Tools", "Reporting Dashboard", "CMS"],
        },
    },
    "Standard Authoring & Editing": {
        "Research & Identify Gaps": {
            "roles": ["Authors", "Volunteer SMEs"],
            "process": "Draft new standard content based on research findings",
            "info": ["Draft Standard", "Style Guide", "Reference Bibliography"],
            "tech": ["Authoring Platform", "Document Management System", "Collaboration Tools"],
        },
        "Review & Edit Content": {
            "roles": ["Editorial Committee", "Reviewers"],
            "process": "Edit and refine standard content for publication readiness",
            "info": ["Edited Draft", "Review Comments", "Style Guide", "Publication Checklist"],
            "tech": ["Authoring Platform", "Document Management System", "Review Workflow Tool"],
        },
    },
    "Research Collaboration & Partnerships": {
        "Research & Identify Gaps": {
            "roles": ["Research Team", "Partners"],
            "process": "Coordinate research partnerships with academic and industry bodies",
            "info": ["Partnership Agreement", "Joint Research Brief", "Co-authored Papers"],
            "tech": ["Collaboration Tools", "Document Management System", "Video Conferencing"],
        },
        "Engage & Gather Feedback": {
            "roles": ["Partner Manager", "Product Team"],
            "process": "Gather partner insights for product and research collaboration",
            "info": ["Partner Feedback Report", "Collaboration Opportunities", "Joint Roadmap"],
            "tech": ["Partner Portal", "Survey Platform", "CRM"],
        },
        "Author & Develop Content": {
            "roles": ["Authors", "Collaborators"],
            "process": "Co-develop thought leadership content with external experts",
            "info": ["Co-authored Draft", "Expert Contributions", "Research Data"],
            "tech": ["Authoring Platform", "Collaboration Tools", "Video Conferencing"],
        },
    },
    "Standard Versioning & Lifecycle Management": {
        "Review & Edit Content": {
            "roles": ["Standards Board", "Editorial Committee"],
            "process": "Manage version control and publication lifecycle of standards",
            "info": ["Version History", "Change Log", "Approval Record", "Release Plan"],
            "tech": ["Document Management System", "Version Control System", "Publishing Platform"],
        },
    },
    "Digital Distribution & Access": {
        "Produce & Distribute": {
            "roles": ["Publishing Team", "KnowledgeHub Admins"],
            "process": "Publish content to digital channels and manage access rights",
            "info": ["Publication Package", "Access Policy", "Distribution Manifest"],
            "tech": ["KnowledgeHub", "DRM System", "CDN"],
        },
    },
    "Sales & Licensing Management": {
        "Produce & Distribute": {
            "roles": ["Publishing Team", "Finance"],
            "process": "Manage licensing, pricing and sales of published content",
            "info": ["License Agreement", "Price List", "Sales Report"],
            "tech": ["E-commerce Platform", "Licensing System", "Accounting System"],
        },
    },
    "KnowledgeHub & Platform Management": {
        "Produce & Distribute": {
            "roles": ["KnowledgeHub Admins", "IT"],
            "process": "Maintain and optimise the KnowledgeHub platform",
            "info": ["Platform Health Dashboard", "User Analytics", "Content Index"],
            "tech": ["KnowledgeHub", "Monitoring Tools", "Search Engine"],
        },
    },
    "Knowledge Asset Feedback & Improvement": {
        "Promote & Gather Feedback": {
            "roles": ["Curators", "Members"],
            "process": "Collect and triage feedback on published knowledge assets",
            "info": ["Feedback Submissions", "Improvement Backlog", "Quality Metrics"],
            "tech": ["Feedback Portal", "Issue Tracker", "KnowledgeHub"],
        },
    },
    "Content Tagging & Search": {
        "Promote & Gather Feedback": {
            "roles": ["Curators", "KnowledgeHub Admins"],
            "process": "Maintain taxonomy and improve content discoverability",
            "info": ["Taxonomy", "Tag Dictionary", "Search Analytics"],
            "tech": ["KnowledgeHub", "Search Engine", "Taxonomy Management Tool"],
        },
    },
    "Audience Engagement & Feedback": {
        "Promote & Gather Feedback": {
            "roles": ["Marketing", "Chapters"],
            "process": "Promote content and gather audience engagement data",
            "info": ["Engagement Metrics", "Survey Results", "Usage Analytics"],
            "tech": ["Analytics Dashboard", "Survey Platform", "Marketing Automation Platform"],
        },
        "Publish & Distribute": {
            "roles": ["Marketing & Communications"],
            "process": "Track audience engagement with published thought leadership",
            "info": ["Engagement Metrics", "Reader Feedback", "Content Performance"],
            "tech": ["Analytics Dashboard", "CMS", "Social Media Tools"],
        },
    },

    # ══════════════════════════════════════════════════════════════
    # VALUE STREAM 4: Community & Volunteer Engagement
    # ══════════════════════════════════════════════════════════════

    "Volunteer Onboarding": {
        "Recruit & Assign Volunteers": {
            "roles": ["Volunteer Services", "Chapter Leaders"],
            "process": "Screen, orient and onboard new volunteer applicants",
            "info": ["Volunteer Application", "Role Description", "Onboarding Checklist"],
            "tech": ["Volunteer Management System", "LMS", "Email Platform"],
        },
    },
    "Volunteer Assignment & Support": {
        "Recruit & Assign Volunteers": {
            "roles": ["Volunteer Services", "Chapter Leaders"],
            "process": "Match volunteers to roles based on skills and chapter needs",
            "info": ["Skills Inventory", "Role Requirements", "Assignment Record"],
            "tech": ["Volunteer Management System", "CRM", "Collaboration Tools"],
        },
    },
    "Volunteer Administration": {
        "Recruit & Assign Volunteers": {
            "roles": ["Volunteer Services"],
            "process": "Manage volunteer records, agreements and compliance",
            "info": ["Volunteer Agreement", "Activity Log", "Compliance Checklist"],
            "tech": ["Volunteer Management System", "Document Management System"],
        },
    },
    "Roundtable & Community Facilitation": {
        "Plan Events & Programmes": {
            "roles": ["Event Planners", "Speakers", "Volunteers"],
            "process": "Organise and facilitate community roundtables and workshops",
            "info": ["Event Brief", "Facilitator Guide", "Attendee Feedback"],
            "tech": ["Event Platform", "Video Conferencing", "Registration System"],
        },
    },
    "Chapter Collaboration": {
        "Facilitate Networking & Mentorship": {
            "roles": ["Chapters", "Community Managers"],
            "process": "Coordinate inter-chapter collaboration and knowledge sharing",
            "info": ["Chapter Activity Report", "Best Practices Library", "Collaboration Calendar"],
            "tech": ["Community Portal", "Collaboration Tools", "Video Conferencing"],
        },
    },
    "Performance & Recognition Management": {
        "Recognise Contributions": {
            "roles": ["Awards Committee", "Chapter Leaders"],
            "process": "Evaluate contributions and deliver recognition awards",
            "info": ["Nomination Form", "Evaluation Criteria", "Award Record"],
            "tech": ["Awards Management System", "Digital Badging Platform", "CRM"],
        },
    },
    "Support & Service Management": {
        "Collect Feedback & Improve": {
            "roles": ["Feedback Survey Team", "Volunteer Services"],
            "process": "Collect community feedback and route to improvement backlog",
            "info": ["Feedback Survey", "Service Metrics", "Improvement Backlog"],
            "tech": ["Survey Platform", "Service Desk", "Issue Tracker"],
        },
        "Deliver Partner Value": {
            "roles": ["Partner Manager", "Support Team"],
            "process": "Provide ongoing support and service to active partners",
            "info": ["Support Tickets", "SLA Dashboard", "Partner Satisfaction Score"],
            "tech": ["Service Desk", "Partner Portal", "CRM"],
        },
    },

    # ══════════════════════════════════════════════════════════════
    # VALUE STREAM 5: Partner & Institutional Engagement
    # ══════════════════════════════════════════════════════════════

    "Partner Qualification": {
        "Prospect & Qualify Partners": {
            "roles": ["Business Development Manager"],
            "process": "Evaluate prospective partners against qualification criteria",
            "info": ["Qualification Scorecard", "Partner Profile", "Due Diligence Report"],
            "tech": ["CRM", "Partner Portal", "Analytics Dashboard"],
        },
    },
    "Partner Onboarding Setup": {
        "Negotiate & Onboard": {
            "roles": ["Partner Manager", "Legal & Finance"],
            "process": "Execute partner agreement and provision portal access",
            "info": ["Partnership Agreement", "Onboarding Checklist", "Account Setup Confirmation"],
            "tech": ["Partner Portal", "CRM", "Contract Management System"],
        },
    },
    "Partner Program Design": {
        "Negotiate & Onboard": {
            "roles": ["Partner Manager", "Product Team"],
            "process": "Configure partner programme tier and benefits package",
            "info": ["Programme Tier Matrix", "Benefits Schedule", "Custom Terms"],
            "tech": ["Partner Portal", "CRM"],
        },
    },
    "Partner Portal & Data Management": {
        "Deliver Partner Value": {
            "roles": ["Partner Manager", "IT"],
            "process": "Maintain partner portal and manage partner data quality",
            "info": ["Partner Directory", "Usage Analytics", "Data Quality Report"],
            "tech": ["Partner Portal", "CRM", "Analytics Dashboard"],
        },
    },
    "Account Management & Relationship": {
        "Deliver Partner Value": {
            "roles": ["Partner Manager"],
            "process": "Manage ongoing partner relationship and quarterly reviews",
            "info": ["Account Plan", "Quarterly Review Deck", "Partnership Health Score"],
            "tech": ["CRM", "Presentation Tools", "Video Conferencing"],
        },
    },
    "Partner Communication & Feedback": {
        "Engage & Gather Feedback": {
            "roles": ["Partner Manager", "Product Team"],
            "process": "Conduct partner satisfaction surveys and feedback sessions",
            "info": ["Partner Survey", "Feedback Report", "Net Promoter Score"],
            "tech": ["Survey Platform", "Partner Portal", "CRM"],
        },
    },
    "Partner Success Measurement": {
        "Engage & Gather Feedback": {
            "roles": ["Partner Manager", "Analytics Team"],
            "process": "Measure and report on partner programme outcomes",
            "info": ["KPI Dashboard", "ROI Analysis", "Benchmark Comparison"],
            "tech": ["Analytics Dashboard", "Reporting Tools", "Partner Portal"],
        },
        "Renew or Expand": {
            "roles": ["Partner Manager"],
            "process": "Assess partner performance for renewal or expansion recommendation",
            "info": ["Performance Scorecard", "Expansion Opportunity Assessment", "Renewal Brief"],
            "tech": ["CRM", "Analytics Dashboard", "Partner Portal"],
        },
    },
    "Upselling & Expansion Planning": {
        "Renew or Expand": {
            "roles": ["Partner Manager", "Business Development Manager"],
            "process": "Identify and propose expansion opportunities to existing partners",
            "info": ["Expansion Proposal", "Cross-sell Matrix", "Partner Growth Plan"],
            "tech": ["CRM", "Partner Portal", "Presentation Tools"],
        },
    },

    # ══════════════════════════════════════════════════════════════
    # VALUE STREAM 6: Thought Leadership & Advocacy
    # ══════════════════════════════════════════════════════════════

    "Content Review & Quality Assurance": {
        "Author & Develop Content": {
            "roles": ["Editors", "Peer Reviewers"],
            "process": "Peer review and quality assure thought leadership content",
            "info": ["Draft Content", "Review Checklist", "Quality Standards"],
            "tech": ["Authoring Platform", "Review Workflow Tool", "Document Management System"],
        },
    },
    "Editorial Calendar Management": {
        "Author & Develop Content": {
            "roles": ["Editors", "Marketing & Communications"],
            "process": "Manage thought leadership publication schedule and pipeline",
            "info": ["Editorial Calendar", "Content Pipeline", "Author Assignments"],
            "tech": ["Project Management Tool", "CMS", "Collaboration Tools"],
        },
    },
    "Analytics & Impact Measurement": {
        "Publish & Distribute": {
            "roles": ["Marketing & Communications", "Analytics Team"],
            "process": "Measure reach, engagement and impact of published content",
            "info": ["Content Performance Report", "Audience Demographics", "Citation Index"],
            "tech": ["Analytics Dashboard", "Social Media Analytics", "CMS"],
        },
    },
    "Policy & Standards Advocacy": {
        "Advocate & Present": {
            "roles": ["Executive Leadership", "Advocacy Team"],
            "process": "Engage with policy makers and standards bodies on BA profession",
            "info": ["Policy Brief", "Position Paper", "Advocacy Calendar"],
            "tech": ["CRM", "Document Management System", "Presentation Tools"],
        },
    },
    "Speaking Engagement Management": {
        "Advocate & Present": {
            "roles": ["Advocacy Team", "Executive Leadership"],
            "process": "Manage speaking opportunities at conferences and industry events",
            "info": ["Speaker Profile", "Event Roster", "Presentation Materials"],
            "tech": ["Event Platform", "Presentation Tools", "CRM"],
        },
    },
    "Research & Case Study Dissemination": {
        "Advocate & Present": {
            "roles": ["Advocacy Team", "Authors"],
            "process": "Package and disseminate research findings and case studies",
            "info": ["Case Study", "Research Summary", "Distribution Plan"],
            "tech": ["CMS", "Email Platform", "KnowledgeHub"],
        },
    },
}
