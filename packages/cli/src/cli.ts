#!/usr/bin/env npx tsx
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { validateCommand } from "./commands/validate.js";
import { assembleCommand } from "./commands/assemble.js";
import { bundleCommand } from "./commands/bundle.js";

const program = new Command();

program
  .name("vcc")
  .description("VCC CLI — scaffold assembly and validation")
  .version("0.1.0");

program
  .command("init")
  .description("Initialise a new engagement run directory")
  .argument("<engagement>", "Engagement name")
  .action(async (engagement: string) => {
    await initCommand(engagement);
  });

program
  .command("validate")
  .description("Validate fragments, mappings, scaffold, or heatmap")
  .argument("<target>", "fragments | mappings | scaffold | heatmap")
  .argument("[files...]", "File paths (depends on target)")
  .action(async (target: string, files: string[]) => {
    await validateCommand(target, files);
  });

program
  .command("assemble")
  .description("Assemble fragments into a ScaffoldModel")
  .argument("<run-dir>", "Path to the run directory")
  .action(async (runDir: string) => {
    await assembleCommand(runDir);
  });

program
  .command("bundle")
  .description("Package assembled scaffold into an export ZIP")
  .argument("<run-dir>", "Path to the run directory")
  .action(async (runDir: string) => {
    await bundleCommand(runDir);
  });

program.parse();
