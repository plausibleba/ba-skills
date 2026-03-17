# Cowork Skills Install Issue — Diagnostic Summary

*Written: 17 March 2026 | For: Opus*

---

## Background

The PlausibleBA skills were working correctly at **v1.6.1** installed via the GitHub marketplace connector in Cowork desktop app. Today we added a fourth plugin (`ba-plausibleba`) and updated all three existing plugins. This triggered a series of install failures that were never fully resolved via the GitHub path. Skills are currently installed via the **zip upload workaround** (see below).

---

## What Was Changed Today

1. Added `ba-plausibleba` as a fourth plugin directory with:
   - `.claude-plugin/plugin.json`
   - `commands/plausibleba.md`
   - `skills/ba-plausibleba/SKILL.md`

2. Updated `marketplace.json` to add `ba-plausibleba` as the first entry

3. Updated the three existing plugin command files (capability-map.md, concept-model.md, value-stream.md)

4. Updated SKILL.md files for all three existing plugins (contrast fixes to colour specs)

5. Version bumps: existing plugins went from 1.6.1 → 1.5.0 (accidental downgrade) → 1.7.0

---

## Install Attempts & Results

### Attempt 1 — GitHub marketplace reinstall after adding ba-plausibleba
- **Result:** "Failed to install plugin"
- **Diagnosis:** `marketplace.json` did not actually contain the `ba-plausibleba` entry despite a commit claiming to add it. The three original plugins were also failing.

### Attempt 2 — Fixed marketplace.json, pushed, reinstalled
- **Result:** Still failing. All four plugins showing in Browse panel but none installing.
- **Diagnosis:** Versions had been accidentally downgraded from 1.6.1 to 1.5.0. Cowork may reject version downgrades.

### Attempt 3 — Bumped all versions to 1.7.0, pushed, reinstalled
- **Result:** Still failing for all four. Two plugins briefly showed "Manage" (installed) on one attempt, suggesting the version bump helped partially, but after removing to reinstall all cleanly, all four failed again.

### Attempt 4 — "Add marketplace by URL"
- **Result:** "Failed to load the plugin"
- No additional error detail.

### Attempt 5 — "Upload plugin" with the full `ba-skills.zip`
- **Result:** "Invalid plugin: missing .claude-plugin/plugin.json"
- **Diagnosis:** The zip contained `ba-skills-v2/ba-capability-mapping/...` — the `plugin.json` was not at the root of the zip. Upload plugin expects each plugin zipped individually from inside its own directory.

### Attempt 6 — Zip each plugin individually, upload one at a time
- **Result:** ✅ **SUCCESS**
- Command used:
```bash
cd ba-capability-mapping && zip -r ../ba-capability-mapping.zip . --exclude "*/.DS_Store" && cd ..
cd ba-concept-model && zip -r ../ba-concept-model.zip . --exclude "*/.DS_Store" && cd ..
cd ba-value-streams && zip -r ../ba-value-streams.zip . --exclude "*/.DS_Store" && cd ..
cd ba-plausibleba && zip -r ../ba-plausibleba.zip . --exclude "*/.DS_Store" && cd ..
```
- Each zip uploaded via Customize → Skills → Browse Plugins → Personal → + → Upload plugin
- All four installed successfully
- **Note:** Cowork showed warning: *"Plugin installed. Note: it uses the legacy commands/ format. Both formats work — consider migrating to skills/*/SKILL.md"*

---

## Key Diagnostics Discovered Along the Way

### 1. plugin.json schema
The working v1.6.1 schema (which Cowork accepts) is:
```json
{
  "name": "ba-capability-mapping",
  "version": "1.6.1",
  "description": "...",
  "author": {
    "name": "PlausibleBA",
    "url": "https://www.plausibleba.com"
  },
  "skills": [
    "skills/ba-taxonomy-standard",
    "skills/ba-capability-mapping"
  ],
  "commands": [
    "commands/capability-map.md"
  ]
}
```

Our initial `ba-plausibleba` plugin.json used a different schema with `commands` as an array of objects (`{name, description, file}`) — this is invalid. Needs to match the simple string array format above.

### 2. marketplace.json must list all plugins explicitly
The `source` field must use `./` prefix:
```json
{ "name": "ba-plausibleba", "source": "./ba-plausibleba" }
```

### 3. SKILL.md must exist
`skills/ba-plausibleba/SKILL.md` must be present and non-empty. An empty directory causes install failure.

### 4. Version downgrade causes failure
Going from 1.6.1 → 1.5.0 caused install failures. Always bump upward.

### 5. Upload plugin expects zip with plugin.json at root
The zip must be created from *inside* the plugin directory, not from the repo root. The `.claude-plugin/plugin.json` must be at the root of the zip.

### 6. Legacy commands/ format warning
Cowork prefers the `skills/*/SKILL.md` format over the `commands/*.md` format. Both work, but we should consider migrating to the newer format post-Summit.

---

## Current State

All four plugins installed and working via zip upload:
- `ba-plausibleba` v1.7.0 ✅
- `ba-capability-mapping` v1.7.0 ✅
- `ba-concept-model` v1.7.0 ✅
- `ba-value-streams` v1.7.0 ✅

**The GitHub marketplace install path (`Add marketplace from GitHub`) is still broken for this repo.** This is a problem for end users who will use that path.

---

## Hypothesis on Why GitHub Install Is Broken

Not definitively confirmed, but the most likely cause is one of:

1. **The legacy commands/ format warning** — the GitHub marketplace installer may be stricter than the zip uploader and only accepts the newer `skills/*/SKILL.md` format. The zip uploader accepts both with a warning; the GitHub installer may reject the legacy format silently.

2. **The `ba-plausibleba` plugin** — even though it now has the correct schema locally, there may be a caching issue where Cowork fetched a bad version and cached it. The zip upload bypasses this cache.

3. **A platform-level issue** with the GitHub connector in the current Cowork version, unrelated to our files.

---

## Recommended Investigation for Opus

1. **Test the GitHub install on a clean Cowork install** (or different account) to determine if it's a file issue or a platform/cache issue.

2. **Consider migrating all plugins to the `skills/*/SKILL.md` format** — remove the `commands/` directories and move command content into SKILL.md files. This eliminates the legacy warning and may fix the GitHub installer.

3. **Host individual plugin zips on plausibleba.com/install** as a fallback for Guild Summit attendees, linking directly to each zip for manual upload. This is reliable regardless of the GitHub install issue.

4. **Check if there's a Cowork CLI or MCP command** for installing plugins from a local path — this would be more reliable than the UI for development workflows.

---

## Guild Summit Mitigation

If the GitHub install path cannot be fixed before 23 March, the install guide should be updated to offer the zip upload path as the primary method, with GitHub as a secondary option. The plausibleba.com/install page already has a manual installation section added today (per Opus's canvas.html work).

Individual plugin zips to host:
- `ba-plausibleba.zip`
- `ba-capability-mapping.zip`
- `ba-concept-model.zip`
- `ba-value-streams.zip`
