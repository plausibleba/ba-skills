/**
 * M1+M2: Hydrate the Claims Settlement fixture into oxigraph.
 * Success criterion #1: load shape + fixture, verify the graph hydrates and
 * the cardinality of each major class is what we expect.
 */
import { Store } from "oxigraph";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadStore(): Store {
  const store = new Store();
  const shape = readFileSync(join(__dirname, "shape/capsicum.ttl"), "utf8");
  const fixture = readFileSync(join(__dirname, "fixtures/claims-settlement.ttl"), "utf8");
  store.load(shape, { format: "text/turtle", base_iri: "https://capsicum.plausibleba.org/ns/core#" });
  store.load(fixture, { format: "text/turtle", base_iri: "https://example.org/insurance/claims#" });
  return store;
}

function countByClass(store: Store, cls: string): number {
  const result = store.query(
    `SELECT (COUNT(?s) AS ?n) WHERE { ?s a <${cls}> }`
  ) as Map<string, any>[];
  return parseInt(result[0]?.get("n")?.value ?? "0", 10);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const store = loadStore();
  console.log(`[hydrate] Total quads: ${store.size}`);
  const ns = "https://capsicum.plausibleba.org/ns/";
  const counts = {
    ValueStream:     countByClass(store, `${ns}sp#ValueStream`),
    Capability:      countByClass(store, `${ns}sp#Capability`),
    Stage:           countByClass(store, `${ns}core#Stage`),
    Outcome:         countByClass(store, `${ns}core#Outcome`),
    Role:            countByClass(store, `${ns}core#Role`),
    AgentCharter:    countByClass(store, `${ns}core#AgentCharter`),
  };
  console.log(`[hydrate] Cardinalities:`, counts);

  const expected = { ValueStream: 1, Capability: 12, Stage: 7, Outcome: 8, Role: 5, AgentCharter: 1 };
  const ok = JSON.stringify(counts) === JSON.stringify(expected);
  console.log(`[hydrate] Expected: ${JSON.stringify(expected)}`);
  console.log(`[hydrate] ${ok ? "PASS" : "FAIL"} — success criterion #1`);
  process.exit(ok ? 0 : 1);
}
