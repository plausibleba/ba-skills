/**
 * Single-entry run that exercises all four success criteria end-to-end.
 * Used by `npm run all` for a quick "is the spike still green?" check.
 */
import { spawnSync } from "node:child_process";

const steps = [
  { id: "M1 smoke",        cmd: "tsx", args: ["src/00-smoke.ts"] },
  { id: "SC#1 hydrate",    cmd: "tsx", args: ["src/10-hydrate.ts"] },
  { id: "SC#2/#4 validate", cmd: "tsx", args: ["src/20-validate.ts"] },
  { id: "SC#3 roundtrip",  cmd: "tsx", args: ["src/30-roundtrip.ts"] },
];

let allOk = true;
for (const step of steps) {
  const r = spawnSync(step.cmd, step.args, { stdio: "inherit" });
  if (r.status !== 0) { allOk = false; console.error(`\n*** ${step.id} FAILED ***\n`); }
  console.log("");
}
console.log(`\n=== run-all: ${allOk ? "ALL GREEN ✓" : "REGRESSION ✗"} ===`);
process.exit(allOk ? 0 : 1);
