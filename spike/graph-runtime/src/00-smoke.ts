/**
 * Smoke test: prove oxigraph-wasm loads, parses Turtle, and answers a SPARQL ASK.
 * No CAPSICUM yet — just verify the runtime end-to-end.
 */
import { Store } from "oxigraph";

const TTL = `
@prefix ex: <http://example.org/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

ex:Hello a ex:Greeting ; rdfs:label "Hello, oxigraph" .
`;

const store = new Store();
store.load(TTL, { format: "text/turtle", base_iri: "http://example.org/" });
console.log(`Loaded ${store.size} quads.`);

const ask = store.query(
  `ASK { ?g a <http://example.org/Greeting> }`
);
console.log(`ASK result: ${ask}`);

const select = store.query(
  `SELECT ?label WHERE { ?g <http://www.w3.org/2000/01/rdf-schema#label> ?label }`
) as Map<string, any>[];
for (const row of select) {
  console.log(`  label: ${row.get("label")?.value}`);
}

console.log("[smoke] OK");
