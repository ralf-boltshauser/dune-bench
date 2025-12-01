/**
 * Validation script to check alignment between dune-board.svg and territories.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import { TerritoryId, TERRITORY_DEFINITIONS } from "../src/lib/game/types/territories";

// Read SVG file
const svgPath = join(process.cwd(), "public", "dune-board.svg");
const svgContent = readFileSync(svgPath, "utf-8");

// Extract territory IDs from SVG (path elements with id)
const territoryIdPattern = /<path\s+id="([^"]+)"/g;
const svgTerritoryIds = new Set<string>();
let match;
while ((match = territoryIdPattern.exec(svgContent)) !== null) {
  const id = match[1];
  // Skip sector paths
  if (!id.startsWith("sector-")) {
    svgTerritoryIds.add(id);
  }
}

// Extract force slot group IDs from SVG
// Only match parent group IDs, not individual slot IDs (which end with -{number})
// Parent groups: force-slot-{territory}-sector-{sector} or force-slot-{territory} (for polar-sink)
// Individual slots: force-slot-{territory}-sector-{sector}-{number} or force-slot-{territory}-{number}
const forceSlotPattern = /<g\s+id="(force-slot-[^"]+)">/g;
const svgForceSlotIds = new Set<string>();
while ((match = forceSlotPattern.exec(svgContent)) !== null) {
  const id = match[1];
  // Skip individual slot IDs (they end with -{number} where number is 1-4 or more)
  // But keep parent groups which may have sector numbers
  // Pattern: if it ends with -{digit} and is not a sector pattern, it's an individual slot
  if (!/-\d+$/.test(id) || id.match(/-sector-\d+$/)) {
    // This is a parent group (either has -sector-{number} or doesn't end with -{number})
    svgForceSlotIds.add(id);
  }
}

// Extract spice slot IDs from SVG
const spiceSlotPattern = /<g\s+id="(spice-[^"]+)">/g;
const svgSpiceSlotIds = new Set<string>();
while ((match = spiceSlotPattern.exec(svgContent)) !== null) {
  svgSpiceSlotIds.add(match[1]);
}

// Convert TypeScript territory IDs to kebab-case for comparison
function toKebabCase(str: string): string {
  return str.toLowerCase().replace(/_/g, "-");
}

// Get all territory IDs from TypeScript
const tsTerritoryIds = new Set(
  Object.values(TerritoryId).map((id) => toKebabCase(id))
);

// Collect all force slot IDs from TypeScript definitions
const tsForceSlotIds = new Set<string>();
Object.values(TERRITORY_DEFINITIONS).forEach((territory) => {
  if (territory.forceSlots) {
    territory.forceSlots.forEach((slot) => {
      tsForceSlotIds.add(slot.slotGroupId);
    });
  }
});

// Collect all spice slot IDs from TypeScript definitions
const tsSpiceSlotIds = new Set<string>();
Object.values(TERRITORY_DEFINITIONS).forEach((territory) => {
  if (territory.spiceSlotId) {
    tsSpiceSlotIds.add(territory.spiceSlotId);
  }
});

// Validation results
const errors: string[] = [];
const warnings: string[] = [];

// Check territories: TS -> SVG (ERRORS: TS references something that doesn't exist in SVG)
console.log("\n=== TERRITORY VALIDATION ===\n");
tsTerritoryIds.forEach((tsId) => {
  if (!svgTerritoryIds.has(tsId)) {
    errors.push(`❌ TypeScript territory "${tsId}" not found in SVG`);
  } else {
    console.log(`✓ Territory "${tsId}" found in both`);
  }
});

// Check territories: SVG -> TS (WARNINGS: SVG has something TS doesn't reference)
svgTerritoryIds.forEach((svgId) => {
  if (!tsTerritoryIds.has(svgId)) {
    warnings.push(`⚠️  SVG territory "${svgId}" not referenced in TypeScript`);
  }
});

// Check force slots: TS -> SVG
console.log("\n=== FORCE SLOT VALIDATION ===\n");
tsForceSlotIds.forEach((tsSlotId) => {
  if (!svgForceSlotIds.has(tsSlotId)) {
    errors.push(`❌ Force slot "${tsSlotId}" defined in TS but not found in SVG`);
  } else {
    console.log(`✓ Force slot "${tsSlotId}" found in both`);
  }
});

// Check force slots: SVG -> TS (warnings only, might be unused)
svgForceSlotIds.forEach((svgSlotId) => {
  if (!tsForceSlotIds.has(svgSlotId)) {
    warnings.push(`⚠️  SVG force slot "${svgSlotId}" not referenced in TypeScript`);
  }
});

// Check spice slots: TS -> SVG
console.log("\n=== SPICE SLOT VALIDATION ===\n");
tsSpiceSlotIds.forEach((tsSpiceId) => {
  if (!svgSpiceSlotIds.has(tsSpiceId)) {
    errors.push(`❌ Spice slot "${tsSpiceId}" defined in TS but not found in SVG`);
  } else {
    console.log(`✓ Spice slot "${tsSpiceId}" found in both`);
  }
});

// Check spice slots: SVG -> TS (warnings only)
svgSpiceSlotIds.forEach((svgSpiceId) => {
  if (!tsSpiceSlotIds.has(svgSpiceId)) {
    warnings.push(`⚠️  SVG spice slot "${svgSpiceId}" not referenced in TypeScript`);
  }
});

// Print summary
console.log("\n=== SUMMARY ===\n");
console.log(`Territories in SVG: ${svgTerritoryIds.size}`);
console.log(`Territories in TS: ${tsTerritoryIds.size}`);
console.log(`Force slots in SVG: ${svgForceSlotIds.size}`);
console.log(`Force slots in TS: ${tsForceSlotIds.size}`);
console.log(`Spice slots in SVG: ${svgSpiceSlotIds.size}`);
console.log(`Spice slots in TS: ${tsSpiceSlotIds.size}`);

if (errors.length > 0) {
  console.log("\n❌ ERRORS:\n");
  errors.forEach((error) => console.log(error));
}

if (warnings.length > 0) {
  console.log("\n⚠️  WARNINGS:\n");
  warnings.forEach((warning) => console.log(warning));
}

if (errors.length === 0 && warnings.length === 0) {
  console.log("\n✅ All validations passed!");
} else if (errors.length === 0) {
  console.log("\n✅ No errors, but some warnings above");
} else {
  console.log(`\n❌ Found ${errors.length} error(s) and ${warnings.length} warning(s)`);
  process.exit(1);
}

