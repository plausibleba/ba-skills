# Substack — Addendum to Post 10

> Add this as an update at the bottom of Post 10, or as a short follow-up post/note.

---

**Update — 1 April 2026: The spec is now open source**

The formal GSM specification and a complete Python reference implementation are now publicly available on GitHub under the [capsicum-framework](https://github.com/capsicum-framework) organisation:

**[github.com/capsicum-framework/capsicum-gsm](https://github.com/capsicum-framework/capsicum-gsm)**

What's in the repo:

- The full 9-tuple GSM specification, including the entitlement schema, verdict schema, escalation routing, and conformance requirements
- A working Python governance kernel that implements the five-step evaluation sequence described in this post
- The loan approval example from the series — five scenarios covering all three verdicts (Fire, Reject, Escalate) and all four escalation triggers
- Documentation on the Translation Integrity Pipeline and confinement architecture

The specification is released under CC-BY 4.0 and the code under Apache 2.0. The intent is straightforward: the formal model is open for anyone to implement against, study, or extend. If you believe AI agents need deterministic governance boundaries — not probabilistic guardrails — this is the spec to build on.

Two conformance levels are defined. Level 1 (Kernel Conformant) covers the evaluation function and default-deny semantics. Level 2 (Fully Conformant) adds the confinement requirement, provenance chain, and ontological conformance. If you build a GSM implementation, the conformance document tells you exactly what to test against.

Contributions, issues, and feedback are welcome. The spec is the source of truth — the reference implementation follows it, not the other way around.
