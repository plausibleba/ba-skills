# Session Log — 2026-03-08 — Scaffold Generation Quality + Build Fix

## Context
Continuation of Step 1 (make it work for what we have). PureTec presales scenario.
Previous session had established working PPIT rendering but several generation quality issues remained.

## Issues Addressed This Session

### 1. Template literal / build error
**Symptom:** `vite build` exiting with 1 — `Expected ";" but found "json"` at line 696.
**Root cause:** Python script wrote `\`` (escaped backtick) as the closing delimiter of the Pass 3 template literal. TypeScript sees `\`` as an escaped backtick *inside* the template (not a closer), so the template ran to line 696 where the first real backtick (inside a `/```json|```/g` regex) terminated it mid-code.
**Fix:** Changed `\`` → `` `; `` on the closing line of pass3Prompt.
**Secondary fix:** Also replaced `/```json|```/g` regex pattern (used in all three JSON.parse calls) with `/[`][`][`]json|[`][`][`]/g` to prevent future recurrence.

### 2. Initiatives appearing as Value Streams (Technology Integration Foundation on form)
**Root cause:** Pass 1 had no exclusion rule for time-bounded initiatives vs ongoing operations.
**Fix:** Added `## EXCLUDE: Initiatives and Projects` block to Pass 1 rules with named examples (Salesforce Implementation, NetSuite Integration, Technology Integration Foundation) and key heuristic: "if it has a go-live date and end date, it's an initiative."

### 3. Only 2 VS on Network Map (6 on form)
**Root cause:** Pass 3 had no instruction to preserve all VS. Model was silently dropping VS based on its own judgement.
**Fix:** Added RULE 1 to Pass 3 prompt: "Produce exactly ONE valueStream entry for EVERY VS in confirmed inputs. Do NOT exclude, rename, or merge. 6 in = 6 out."

### 4. Verbose Stage Names
**Root cause:** Pass 1 stage naming rule said "4-8 per VS" with no name length constraint.
**Fix:** Added `2-4 words, title case — short labels not sentences` to stage rule. Added GOOD/BAD examples: "Territory Planning", "Pre-Visit Prep" vs "Planning and Preparing the Sales Territory Visit".

### 5. Pass 4 (friction) still auto-running on generate
**Root cause:** Pass 4 removal from previous session never landed in the deployed source.
**Fix:** Removed Pass 4 block. Pain points stashed on `scaffold._discoveryPainPoints`. Generation ends with `setGenerated(true)` → Save Bundle screen.

### 6. Pass 3 generating v5 format (activityChainHead) instead of v4 (activityIds[])
**Root cause:** Pass 3 prompt was instructing the model to use `nextActivityId` chain and `enabledByCapabilityIds` — a v5 format the deployed canvas-store can't read.
**Fix:** Rewrote Pass 3 to generate v4 format: `activityIds[]` on VS, `requiresCapabilityIds` on activities, `capabilityPPIT{}` on every activity.

## What's Working After This Session
- PPIT rendering (Activities, Roles, Info) ✅ — confirmed in screenshot `frontend-9vh29gem2`
- Capability names: operational, specific
- Activity names: 5-10 word verb+object
- Metrics & Roles: painting on canvas
- capabilityPPIT populated with micro-level work statements
- informationObjects: populated and assigned via capabilityPPIT entries

## Known Remaining Issues (for tomorrow)
- Capability and Role labels showing snake_case ID instead of display name (e.g. `cap_lead_qualification` instead of "Lead Qualification")
- Sales VS only 3 stages (may self-correct with RULE 1 + better stage count guidance)
- Network Map may still show < 6 VS depending on scaffold quality (RULE 1 should fix)

## Deployment State
- Last good deployment: `frontend-9vh29gem2-terryroachs-projects.vercel.app` (PPIT working, v9 bundle generated)
- Failed deployments: `gXJGfN674X3zJuQG31pZJvhqb7W3`, `6s71ukef9k8WJcB4gF1z2xMJGNFS` (build errors, now resolved)
- Production alias: `frontend-five-eta-l0j2mk66gi.vercel.app`

## Artefacts
- `puretec-vcc-bundle_v9.json` — v9 PureTec bundle (good quality, ID labels issue noted)
- `DiscoveryIntake.tsx` — patched with all fixes above

## Decisions
- **D-044** — Pass 3 prompt generates v4 format exclusively (`activityIds[]`, `requiresCapabilityIds`, `capabilityPPIT`)
- **D-045** — Pass 1 excludes initiatives/projects explicitly; stage names 2-4 words
- **D-046** — Pass 3 RULE 1: preserve all VS, no silent drops
- **D-047** — Template literal closing backtick must be unescaped; regex with backticks use `[`]` character class form
