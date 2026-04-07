# LinkedIn — Open Source Repo Announcement

> Post this as a follow-up to today's Post 10 promotion. Best timing: 24–48 hours after the first post, so it lands as a companion rather than noise.

---

Following today's post on implementing a Governed State Machine — the specification and a working reference implementation are now open source.

https://github.com/capsicum-framework/capsicum-gsm

The position is simple: the formal model should be open. Anyone building AI agent governance should be able to inspect, implement, and extend the spec without barriers.

What's in the repo:

→ The complete 9-tuple GSM specification with entitlement schema, escalation routing, and conformance requirements
→ A Python governance kernel implementing the five-step evaluation sequence (Fire / Reject / Escalate)
→ Five runnable scenarios demonstrating all three verdicts and all four escalation triggers
→ Two conformance levels so implementers know exactly what "GSM-conformant" means

The spec is under CC-BY 4.0. The code is under Apache 2.0.

This isn't a framework you install — it's a formal model you implement against. The kernel is 200 lines of Python. The value isn't in the code, it's in the specification: a deterministic, auditable governance boundary that an AI agent cannot bypass.

If your organisation is deploying autonomous agents and needs governance that is architectural rather than behavioural, this is the starting point.

Context: This is part of the "Discovered not Invented" series on Substack, and a companion to the CAPSICUM formal ontology of purposeful action.

Series: https://terryroach.substack.com
Working prototype: https://lnkd.in/gZS6QU_H
Operating model canvas: app.plausibleba.com

#AIGovernance #AgenticAI #OpenSource #EnterpriseArchitecture #BusinessArchitecture #CAPSICUM #PlausibleBA

---

> **Notes on timing and approach:**
> - Post this 1–2 days after today's Post 10 promotion so it reads as a natural follow-up ("I open-sourced the thing I wrote about yesterday") rather than competing with it
> - The framing deliberately avoids repeating the Post 10 content — today's post sold the *why*, this one announces the *what*
> - "This isn't a framework you install — it's a formal model you implement against" is the key differentiator from every other AI governance repo on GitHub
> - Consider tagging relevant connections (IIBA contacts, EA community members, anyone who engaged with today's post) in a comment rather than the post itself
