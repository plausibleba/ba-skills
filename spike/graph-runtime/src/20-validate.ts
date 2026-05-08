/**
 * M3 / Success criteria #2 + #4:
 *
 * Express SHACL-style constraints as SPARQL queries (the same compilation
 * target as SHACL-SPARQL). For each shape:
 *   - the WHERE pattern matches focus nodes that VIOLATE the shape
 *   - empty result set = constraint passes
 *
 * Constraints:
 *   C1 (success #2): Every Stage must reference >=1 Capability via the
 *      canonical predicate cap:enabledByCapability.  Catches the dual-field
 *      bug where a v4 scaffold uses requiresCapabilityIds and a v5 scaffold
 *      uses enabledByCapabilityIds — both would fail this.
 *   C2 (deprecation): No Stage may use the legacy v4 or v5 alias predicates.
 *   C3: Every non-terminal Outcome must trigger >=1 Stage. (Externalised
 *      Outcome / BACM CAP-7 enforcement: Outcomes are state-transition hubs.)
 *   C4 (success #4): Every AgentCharter must charter exactly one Capability.
 *      The capability boundary IS the agent's authority boundary (PRD).
 */
import { loadStore } from "./10-hydrate.js";
import type { Store } from "oxigraph";

interface Constraint {
  id: string;
  label: string;
  query: string;          // SELECT ?focus (?detail) — rows are violations
  expectedViolations?: number; // for the "negative" tests (with injected bugs)
}

const PREFIXES = `
PREFIX cap:    <https://capsicum.plausibleba.org/ns/core#>
PREFIX sp:     <https://capsicum.plausibleba.org/ns/sp#>
PREFIX bv:     <https://capsicum.plausibleba.org/ns/bv#>
PREFIX claims: <https://example.org/insurance/claims#>
PREFIX rdf:    <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs:   <http://www.w3.org/2000/01/rdf-schema#>
`;

const CONSTRAINTS: Constraint[] = [
  {
    id: "C1",
    label: "Every Stage references at least one Capability via cap:enabledByCapability",
    query: `${PREFIXES}
      SELECT ?focus WHERE {
        ?focus a cap:Stage .
        FILTER NOT EXISTS { ?focus cap:enabledByCapability ?cap }
      }`,
  },
  {
    id: "C2",
    label: "No Stage uses the deprecated v4/v5 capability alias predicates",
    query: `${PREFIXES}
      SELECT ?focus ?legacy WHERE {
        ?focus a cap:Stage .
        { ?focus cap:requiresCapabilityIds_v4 ?cap .  BIND("v4_requiresCapabilityIds" AS ?legacy) }
        UNION
        { ?focus cap:enabledByCapabilityIds_v5 ?cap . BIND("v5_enabledByCapabilityIds" AS ?legacy) }
      }`,
  },
  {
    id: "C3",
    label: "Every intermediate Outcome triggers at least one Stage (externalised state)",
    query: `${PREFIXES}
      SELECT ?focus WHERE {
        ?focus a cap:Outcome .
        # Intermediate = appears as BOTH preOutcome (something follows it) and
        # postOutcome (something precedes it). Initial outcomes (only pre) and
        # terminal outcomes (only post) are exempt — they have no successor stage.
        FILTER EXISTS { ?stagePre  cap:preOutcome  ?focus }
        FILTER EXISTS { ?stagePost cap:postOutcome ?focus }
        FILTER NOT EXISTS { ?focus cap:triggers ?nextStage }
      }`,
  },
  {
    id: "C4",
    label: "Every AgentCharter charters exactly one Capability (authority boundary)",
    query: `${PREFIXES}
      SELECT ?focus (COUNT(?cap) AS ?n) WHERE {
        ?focus a cap:AgentCharter .
        OPTIONAL { ?focus cap:chartersAgentFor ?cap }
      }
      GROUP BY ?focus
      HAVING (COUNT(?cap) != 1)`,
  },
];

function runConstraint(store: Store, c: Constraint): { pass: boolean; violations: any[] } {
  const rows = store.query(c.query) as Map<string, any>[];
  const violations = rows.map((r) => {
    const obj: Record<string, string> = {};
    for (const [k, v] of r) obj[k] = v?.value ?? "?";
    return obj;
  });
  return { pass: violations.length === 0, violations };
}

function report(c: Constraint, result: { pass: boolean; violations: any[] }) {
  const symbol = result.pass ? "✓ PASS" : "✗ FAIL";
  console.log(`[${c.id}] ${symbol}  ${c.label}`);
  if (!result.pass) {
    for (const v of result.violations) {
      console.log(`        violation: ${JSON.stringify(v)}`);
    }
  }
}

// === Phase 1: clean fixture should pass all four ===
console.log("=== Phase 1: clean fixture ===");
const cleanStore = loadStore();
let allPassed = true;
for (const c of CONSTRAINTS) {
  const r = runConstraint(cleanStore, c);
  report(c, r);
  if (!r.pass) allPassed = false;
}

// === Phase 2: inject the dual-field bug — verify C1+C2 catch it ===
console.log("\n=== Phase 2: inject the dual-field bug (v5 alias used instead of canonical) ===");
const buggyStore = loadStore();
// Simulate the bug: a stage uses cap:enabledByCapabilityIds_v5 instead of cap:enabledByCapability.
// First remove the canonical link on Stage_Pay; then add the legacy alias.
buggyStore.update(`${PREFIXES}
  DELETE { claims:Stage_Pay cap:enabledByCapability claims:PaymentProcessing }
  INSERT { claims:Stage_Pay cap:enabledByCapabilityIds_v5 claims:PaymentProcessing }
  WHERE  { claims:Stage_Pay cap:enabledByCapability claims:PaymentProcessing }
`);
let bugCaught = false;
for (const c of CONSTRAINTS) {
  const r = runConstraint(buggyStore, c);
  report(c, r);
  if (c.id === "C1" || c.id === "C2") {
    if (!r.pass) bugCaught = true;
  }
}

// === Phase 3: inject an unbounded AgentCharter — verify C4 catches it ===
console.log("\n=== Phase 3: inject unbounded AgentCharter (no chartersAgentFor) ===");
const unboundedStore = loadStore();
unboundedStore.update(`${PREFIXES}
  INSERT DATA {
    claims:Charter_Rogue a cap:AgentCharter ;
      rdfs:label "Rogue agent (no capability boundary)" .
  }
`);
let charterBugCaught = false;
for (const c of CONSTRAINTS) {
  if (c.id !== "C4") continue;
  const r = runConstraint(unboundedStore, c);
  report(c, r);
  if (!r.pass) charterBugCaught = true;
}

// === Summary ===
console.log("\n=== Summary ===");
console.log(`  Phase 1 (clean fixture all pass):  ${allPassed ? "PASS" : "FAIL"}`);
console.log(`  Phase 2 (dual-field bug caught):   ${bugCaught ? "PASS" : "FAIL"}  ← success criterion #2`);
console.log(`  Phase 3 (charter boundary caught): ${charterBugCaught ? "PASS" : "FAIL"}  ← success criterion #4`);

const ok = allPassed && bugCaught && charterBugCaught;
process.exit(ok ? 0 : 1);
