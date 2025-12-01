/**
 * Script to validate and fix spice blow locations.
 * 
 * Rule: A territory can only have spice blow if it has a spiceSlotId.
 * If spiceBlowLocation is true but spiceSlotId is missing, that's an error.
 */

import { TERRITORY_DEFINITIONS, TerritoryId } from "../src/lib/game/types/territories";

interface ValidationResult {
  territoryId: TerritoryId;
  name: string;
  hasSpiceBlowLocation: boolean;
  hasSpiceSlotId: boolean;
  issue: "missing_slot_id" | "has_slot_no_blow" | "ok";
}

const results: ValidationResult[] = [];

// Validate all territories
for (const [territoryId, definition] of Object.entries(TERRITORY_DEFINITIONS)) {
  const hasSpiceBlowLocation = definition.spiceBlowLocation === true;
  const hasSpiceSlotId = !!definition.spiceSlotId;

  let issue: ValidationResult["issue"] = "ok";
  if (hasSpiceBlowLocation && !hasSpiceSlotId) {
    issue = "missing_slot_id";
  } else if (!hasSpiceBlowLocation && hasSpiceSlotId) {
    issue = "has_slot_no_blow";
  }

  results.push({
    territoryId: territoryId as TerritoryId,
    name: definition.name,
    hasSpiceBlowLocation,
    hasSpiceSlotId,
    issue,
  });
}

// Report issues
console.log("=".repeat(80));
console.log("SPICE BLOW LOCATION VALIDATION");
console.log("=".repeat(80));
console.log();

const issues = results.filter((r) => r.issue !== "ok");
const valid = results.filter((r) => r.issue === "ok" && r.hasSpiceBlowLocation);

if (issues.length > 0) {
  console.log(`❌ Found ${issues.length} issue(s):\n`);
  
  const missingSlotId = issues.filter((r) => r.issue === "missing_slot_id");
  if (missingSlotId.length > 0) {
    console.log("⚠️  Territories with spiceBlowLocation=true but NO spiceSlotId:");
    missingSlotId.forEach((r) => {
      console.log(`   - ${r.name} (${r.territoryId})`);
    });
    console.log();
  }

  const hasSlotNoBlow = issues.filter((r) => r.issue === "has_slot_no_blow");
  if (hasSlotNoBlow.length > 0) {
    console.log("ℹ️  Territories with spiceSlotId but NO spiceBlowLocation:");
    hasSlotNoBlow.forEach((r) => {
      console.log(`   - ${r.name} (${r.territoryId})`);
    });
    console.log();
  }
} else {
  console.log("✅ All territories are valid!\n");
}

console.log(`📊 Summary:`);
console.log(`   - Valid spice blow locations: ${valid.length}`);
console.log(`   - Issues found: ${issues.length}`);
console.log();

// Show all valid spice blow locations
if (valid.length > 0) {
  console.log("✅ Valid spice blow locations (have both spiceBlowLocation and spiceSlotId):");
  valid.forEach((r) => {
    console.log(`   - ${r.name} (${r.territoryId})`);
  });
}

// Export the list of territories that need fixing
export const territoriesToFix = issues.filter((r) => r.issue === "missing_slot_id");

