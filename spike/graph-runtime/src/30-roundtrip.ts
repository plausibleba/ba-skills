/**
 * M3 / Success criterion #3: JSON-LD round-trip.
 *
 * - Dump the hydrated store as N-Quads (canonical RDF wire format)
 * - Frame it through a published CAPSICUM @context into JSON-LD
 * - Re-parse the JSON-LD back into a fresh oxigraph store
 * - Verify graph identity: same triple count, same constraint results
 *
 * The JSON-LD bundle becomes the open-core's portable contract — what
 * Layer-1 of the OSS stack publishes as the canonical operating-model
 * exchange format. Plugins consume/produce this shape.
 */
import { Store } from "oxigraph";
import { loadStore } from "./10-hydrate.js";
import jsonldDefault from "jsonld";
const jsonld = jsonldDefault as any;
import { writeFileSync } from "node:fs";

// --- Published @context (this would live at https://capsicum.plausibleba.org/contexts/v0.json) ---
const CAPSICUM_CONTEXT = {
  "@version": 1.1,
  "cap":    "https://capsicum.plausibleba.org/ns/core#",
  "sp":     "https://capsicum.plausibleba.org/ns/sp#",
  "bv":     "https://capsicum.plausibleba.org/ns/bv#",
  "rdfs":   "http://www.w3.org/2000/01/rdf-schema#",
  "xsd":    "http://www.w3.org/2001/XMLSchema#",
  "label":  "rdfs:label",
  "ValueStream":   "sp:ValueStream",
  "Capability":    "sp:Capability",
  "Stage":         "cap:Stage",
  "Outcome":       "cap:Outcome",
  "Role":          "cap:Role",
  "AgentCharter":  "cap:AgentCharter",
  "realisedBy":            { "@id": "cap:realisedBy", "@type": "@id", "@container": "@set" },
  "enabledByCapability":   { "@id": "cap:enabledByCapability", "@type": "@id", "@container": "@set" },
  "stateOf":               { "@id": "cap:stateOf", "@type": "@id" },
  "triggers":              { "@id": "cap:triggers", "@type": "@id" },
  "preOutcome":            { "@id": "cap:preOutcome", "@type": "@id" },
  "postOutcome":           { "@id": "cap:postOutcome", "@type": "@id" },
  "performedBy":           { "@id": "cap:performedBy", "@type": "@id" },
  "parentCapability":      { "@id": "cap:parentCapability", "@type": "@id" },
  "chartersAgentFor":      { "@id": "cap:chartersAgentFor", "@type": "@id" },
  "classification":        "cap:classification",
  "aesScore":              { "@id": "cap:aesScore", "@type": "xsd:decimal" },
  "position":              { "@id": "cap:position", "@type": "xsd:integer" },
};

async function dumpToJsonLd(store: Store): Promise<unknown> {
  const nquads = store.dump({ format: "application/n-quads" });
  // jsonld.fromRDF takes N-Quads and returns expanded JSON-LD.
  const expanded = await jsonld.fromRDF(nquads, { format: "application/n-quads" });
  // Compact against the @context for a publishable shape.
  const compacted = await jsonld.compact(expanded, CAPSICUM_CONTEXT as any);
  return compacted;
}

async function loadFromJsonLd(doc: unknown): Promise<Store> {
  const expanded = await jsonld.expand(doc as any);
  const nquads = (await jsonld.toRDF(expanded, { format: "application/n-quads" })) as string;
  const store = new Store();
  store.load(nquads, { format: "application/n-quads" });
  return store;
}

async function main() {
  const original = loadStore();
  const originalSize = original.size;
  console.log(`[roundtrip] Original store: ${originalSize} quads`);

  const jsonldDoc = await dumpToJsonLd(original);
  const jsonStr = JSON.stringify(jsonldDoc, null, 2);
  writeFileSync(
    "claims-settlement.bundle.jsonld",
    jsonStr,
    "utf8",
  );
  console.log(`[roundtrip] Wrote claims-settlement.bundle.jsonld (${jsonStr.length} bytes)`);

  const restored = await loadFromJsonLd(jsonldDoc);
  console.log(`[roundtrip] Restored store: ${restored.size} quads`);

  // Identity check: same number of triples (the shape ontology is also serialised in)
  const sizeMatches = restored.size === originalSize;

  // Spot-check: the FNOL charter survives the round-trip with its boundary intact.
  const PREFIXES = `
    PREFIX cap: <https://capsicum.plausibleba.org/ns/core#>
    PREFIX claims: <https://example.org/insurance/claims#>
  `;
  const charterCheck = restored.query(`${PREFIXES}
    ASK { claims:Charter_FNOL_Agent cap:chartersAgentFor claims:FNOL }`) as boolean;

  // Constraint behaviour preserved: C1 should still pass on the restored store.
  const c1Violations = (restored.query(`${PREFIXES}
    SELECT ?s WHERE { ?s a cap:Stage . FILTER NOT EXISTS { ?s cap:enabledByCapability ?c } }
  `) as Map<string, any>[]).length;

  console.log(`[roundtrip] sizeMatches: ${sizeMatches}`);
  console.log(`[roundtrip] charterCheck: ${charterCheck}`);
  console.log(`[roundtrip] C1 violations on restored store: ${c1Violations}`);

  const ok = sizeMatches && charterCheck && c1Violations === 0;
  console.log(`[roundtrip] ${ok ? "PASS" : "FAIL"} — success criterion #3`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(2); });
