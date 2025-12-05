/**
 * Unified entrypoint for all new-style rule tests.
 *
 * Run with:
 *   pnpm test
 *
 * This dynamically discovers all `*.test.ts` files in this directory (except
 * itself) and imports them. Each test file is responsible for printing its own
 * section header and setting `process.exitCode` on failure.
 */

/* eslint-disable no-console */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function discoverTestFiles(): Promise<string[]> {
  const entries = await fs.readdir(__dirname, { withFileTypes: true });

  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".test.ts") &&
        entry.name !== "run-all-rule-tests.ts"
    )
    .map((entry) => path.join(__dirname, entry.name))
    .sort();
}

async function main() {
  console.log("=".repeat(80));
  console.log("DUNE BENCH – RULE TEST SUITE");
  console.log("=".repeat(80));
  console.log();
  console.log("Scanning for rule tests in:");
  console.log(`  ${__dirname}`);
  console.log();

  const testFiles = await discoverTestFiles();

  if (testFiles.length === 0) {
    console.log("No rule tests (*.test.ts) found in this directory.");
    return;
  }

  console.log("Discovered rule test files:");
  for (const file of testFiles) {
    console.log(`  - ${path.basename(file)}`);
  }
  console.log();

  for (const file of testFiles) {
    console.log("-".repeat(80));
    console.log(`Running rule tests from: ${path.basename(file)}`);
    console.log("-".repeat(80));

    // Dynamic import module and, if present, call its exported runRuleTests().
    // eslint-disable-next-line no-await-in-loop
    const mod: unknown = await import(pathToFileUrl(file));
    const maybeRunner =
      (mod as { runRuleTests?: () => Promise<void> | void }).runRuleTests;

    if (typeof maybeRunner === "function") {
      // eslint-disable-next-line no-await-in-loop
      await maybeRunner();
    }

    console.log(); // spacing between files
  }

  console.log("=".repeat(80));
  console.log("Rule test suite finished. Check above for per-rule details.");
  console.log("=".repeat(80));
}

function pathToFileUrl(p: string): string {
  const resolved = path.resolve(p);
  const url = new URL(`file://${resolved}`);
  return url.toString();
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();



