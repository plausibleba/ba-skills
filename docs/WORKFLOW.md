# Workflow Contracts

Multi-agent coordination protocol for VCC development.

---

## Core Principle

> Conversations are thinking. Artefacts are decisions.
>
> Never forward transcripts. Only forward files.

---

## Roles

### Terry (Orchestrator)
- Owns the repo
- Decides what gets merged
- Routes work to the right participant
- Uploads context files at session start
- Commits outputs to repo

### Claude (Implementation)
- Reads: `CURRENT-STATE.md`, `ARCHITECTURE.md`, relevant code files
- Outputs: code files, updated docs, scaffold JSON
- Never outputs narrative-only responses for implementation tasks
- Always produces files that can be committed directly

### Reviewer (Structure & Design)
- Reads: `CURRENT-STATE.md`, `DESIGN-PRINCIPLES.md`, screenshots, proposed docs
- Outputs: replacement documents (not inline comments on chat)
- Feedback becomes numbered principles in `DESIGN-PRINCIPLES.md`
- Design mandates become decisions in `DECISIONS.md`

### UI/UX Model (Layout & Interaction)
- Reads: `CURRENT-STATE.md`, `DESIGN-PRINCIPLES.md`, screenshots
- Outputs: proposals in `/docs/ui-proposals/YYYY-MM-DD-topic.md`
- Proposals include: rationale, specific CSS/component changes, before/after
- Terry decides which proposals to implement

---

## Session Protocol

### Starting a Session

1. Upload `CURRENT-STATE.md` (always)
2. Upload relevant docs for the task:
   - Implementation task → `ARCHITECTURE.md` + relevant code files
   - Design critique → `DESIGN-PRINCIPLES.md` + screenshots
   - New feature → `ARCHITECTURE.md` + `DESIGN-PRINCIPLES.md`
3. State the task clearly
4. Reference specific files if changes are needed: *"Update `/docs/ARCHITECTURE.md` to reflect the new X"*

### During a Session

- All meaningful outputs must be files (`.md`, `.tsx`, `.ts`, `.json`, `.py`)
- No raw chat-only responses for implementation work
- Short clarification questions are fine in chat
- Screenshots are valid inputs (not outputs)

### Ending a Session

1. All changed files are in `/mnt/user-data/outputs/`
2. `SESSION-LOG.md` updated with what was done
3. `CURRENT-STATE.md` updated if priorities or status changed
4. `DECISIONS.md` updated if non-trivial design choices were made
5. Terry commits everything to repo
6. **Claude reminds Terry to commit and push to Git:**
   ```
   cd ~/projects/vcc
   git add .
   git status        # sanity check
   git commit -m "session N: <summary>"
   git push
   ```
   This step is mandatory. Do not end a session without confirming Git is up to date.

---

## Output Contracts

### For Code Changes
```
Input:  "Implement [specific change]"
Output: Changed files + file paths
        No narrative explanation longer than 2 sentences
```

### For Design Critique
```
Input:  Screenshot + "What's wrong with this?"
Output: Numbered findings as a replacement document
        e.g., /docs/reviews/2026-02-25-stage-card-critique.md
```

### For Architecture Changes
```
Input:  "Propose changes to [specific doc]"
Output: Full replacement document (not a diff, not inline comments)
        Terry diffs against current version and decides
```

### For New Features
```
Input:  "Design the schema for [X]"
Output: Specification document in /docs/
        Implementation follows as separate code files
```

---

## What Never Gets Forwarded

- Full chat transcripts
- Mixed code + commentary
- Long reasoning threads
- Unstructured brainstorming

## What Always Gets Forwarded

- Finalised files only
- Screenshots (as input to critique sessions)
- Specific questions referencing specific files

---

## Conflict Resolution

If two participants produce conflicting recommendations:

1. Both outputs are committed as proposals (not merged)
2. Terry reviews both against `DESIGN-PRINCIPLES.md`
3. If principles don't resolve it, Reviewer has final say on structure/design
4. Decision is recorded in `DECISIONS.md`

---

## File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Decision | `D-NNN` in `DECISIONS.md` | D-022: Info Icon Tooltips |
| UI Proposal | `/docs/ui-proposals/YYYY-MM-DD-topic.md` | `2026-02-25-capability-card-layout.md` |
| Review | `/docs/reviews/YYYY-MM-DD-topic.md` | `2026-02-25-stage-card-critique.md` |
| Session log entry | Appended to `SESSION-LOG.md` | `## Session 5 — Tuesday 25 Feb 2026` |

---

## Why This Works

- **Repo is memory** — No participant needs to remember previous sessions
- **Files are contracts** — Clear, versioned, diffable
- **Terry is integrator, not router** — Decides what merges, doesn't relay conversations
- **Scaling is linear** — Adding a 4th participant just means one more reader of the docs
- **Quality stays high** — Design principles are enforced by document, not by memory
