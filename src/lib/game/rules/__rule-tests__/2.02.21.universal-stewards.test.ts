/**
 * Rule test: 2.02.21 UNIVERSAL STEWARDS
 * @rule-test 2.02.21
 *
 * Rule text (numbered_rules/2.md):
 * "2.02.21 UNIVERSAL STEWARDS: When advisors are ever alone in a Territory before Battle Phase [1.07], they automatically flip to fighters."
 *
 * These tests verify:
 * - Advisors alone in territory automatically flip to fighters before Battle Phase
 * - Only applies when advisors are truly alone (no other faction forces)
 * - Restrictions (PEACETIME, STORMED IN) still apply
 * - Only works in advanced rules
 * - Applied automatically (not optional)
 */

import { Faction, TerritoryId, Phase, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState, getFactionsInTerritory, formAlliance } from "../../state";
import { applyUniversalStewards } from "../../phases/handlers/battle/initialization/universal-stewards";

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passCount++;
  } else {
    console.log(`  ✗ ${message}`);
    failCount++;
  }
}

function section(name: string): void {
  console.log(`\n=== ${name} ===`);
}

function buildBaseState(): GameState {
  return createGameState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES],
    advancedRules: true,
  });
}

// =============================================================================
// 2.02.21 – UNIVERSAL STEWARDS: Auto-flip when alone
// =============================================================================

function testUniversalStewards_AutoFlipsAloneAdvisors(): void {
  section("2.02.21 - Advisors alone in territory auto-flip to fighters before Battle Phase");

  let state = buildBaseState();
  state.phase = Phase.BATTLE;

  // Clear all forces from all factions to ensure advisors are truly alone
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  state = {
    ...state,
    factions: new Map(state.factions)
      .set(Faction.ATREIDES, {
        ...atreidesState,
        forces: {
          ...atreidesState.forces,
          onBoard: [], // Clear Atreides forces
        },
      }),
  };

  // Ensure territory is not in storm (STORMED IN restriction would block flipping)
  state.stormSector = 10; // Storm away from Arrakeen (sector 0)

  // Set up BG with advisors alone in territory
  // Advisors are represented as both regular forces AND advisors (same physical tokens, different sides)
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.BENE_GESSERIT, {
      ...bgState,
      forces: {
        ...bgState.forces,
        onBoard: [
          { factionId: Faction.BENE_GESSERIT, territoryId: TerritoryId.ARRAKEEN, sector: 0, forces: { regular: 3, elite: 0 }, advisors: 3 },
        ],
      },
    }),
  };

  // Verify advisors are alone
  // getFactionsInTerritory excludes BG advisors-only, so if empty, advisors are alone
  const occupants = getFactionsInTerritory(state, TerritoryId.ARRAKEEN);
  // Advisors are alone if no other factions have forces (BG advisors don't count as "occupying")
  assert(
    occupants.length === 0,
    `Advisors are alone in territory (occupants: ${occupants.length}, factions: ${occupants.join(", ")})`
  );

  // Apply UNIVERSAL STEWARDS
  const events: any[] = [];
  state = applyUniversalStewards(state, events);

  // Check that advisors were flipped to fighters
  const finalStack = getFactionState(state, Faction.BENE_GESSERIT).forces.onBoard.find(
    (s) => s.territoryId === TerritoryId.ARRAKEEN && s.sector === 0
  );

  assert(
    !!finalStack,
    `Stack exists after UNIVERSAL STEWARDS`
  );
  assert(
    (finalStack?.forces.regular ?? 0) + (finalStack?.forces.elite ?? 0) === 3,
    `Advisors were auto-flipped to fighters: 3 fighters (regular=${finalStack?.forces.regular}, elite=${finalStack?.forces.elite})`
  );
  assert(
    (finalStack?.advisors ?? 0) === 0,
    `No advisors remain (got ${finalStack?.advisors ?? 0})`
  );
  assert(
    events.length > 0,
    `UNIVERSAL STEWARDS emits events (got ${events.length})`
  );
  assert(
    events.some((e) => e && e.type === "ADVISORS_FLIPPED"),
    `Event type is ADVISORS_FLIPPED (events: ${JSON.stringify(events.map(e => e?.type))})`
  );
}

function testUniversalStewards_DoesNotFlipWhenNotAlone(): void {
  section("2.02.21 - Advisors do NOT auto-flip when other factions are present");

  let state = buildBaseState();
  state.phase = Phase.BATTLE;

  // Set up BG with advisors and Atreides forces in same territory
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  state = {
    ...state,
    factions: new Map(state.factions)
      .set(Faction.BENE_GESSERIT, {
        ...bgState,
        forces: {
          ...bgState.forces,
          onBoard: [
            { factionId: Faction.BENE_GESSERIT, territoryId: TerritoryId.ARRAKEEN, sector: 0, forces: { regular: 0, elite: 0 }, advisors: 3 },
          ],
        },
      })
      .set(Faction.ATREIDES, {
        ...atreidesState,
        forces: {
          ...atreidesState.forces,
          onBoard: [
            { factionId: Faction.ATREIDES, territoryId: TerritoryId.ARRAKEEN, sector: 0, forces: { regular: 5, elite: 0 } },
          ],
        },
      }),
  };

  // Verify advisors are NOT alone
  const occupants = getFactionsInTerritory(state, TerritoryId.ARRAKEEN);
  assert(
    occupants.includes(Faction.ATREIDES),
    `Territory is occupied by Atreides (advisors are not alone)`
  );

  // Apply UNIVERSAL STEWARDS
  const events: any[] = [];
  state = applyUniversalStewards(state, events);

  // Check that advisors were NOT flipped
  const finalStack = getFactionState(state, Faction.BENE_GESSERIT).forces.onBoard.find(
    (s) => s.territoryId === TerritoryId.ARRAKEEN && s.sector === 0
  );

  assert(
    !!finalStack,
    `Stack exists after UNIVERSAL STEWARDS`
  );
  assert(
    (finalStack?.advisors ?? 0) === 3,
    `Advisors remain advisors when not alone (got ${finalStack?.advisors ?? 0})`
  );
  assert(
    (finalStack?.forces.regular ?? 0) + (finalStack?.forces.elite ?? 0) === 0,
    `No fighters created (regular=${finalStack?.forces.regular}, elite=${finalStack?.forces.elite})`
  );
}

function testUniversalStewards_RespectsRestrictions(): void {
  section("2.02.21 - UNIVERSAL STEWARDS respects PEACETIME and STORMED IN restrictions");

  let state = buildBaseState();
  state.phase = Phase.BATTLE;

  // Form alliance and set storm
  state = formAlliance(state, Faction.BENE_GESSERIT, Faction.ATREIDES);
  state.stormSector = 0; // Storm in sector 0 (Arrakeen)

  // Set up BG with advisors alone, but ally present (PEACETIME) and in storm (STORMED IN)
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  state = {
    ...state,
    factions: new Map(state.factions)
      .set(Faction.BENE_GESSERIT, {
        ...bgState,
        forces: {
          ...bgState.forces,
          onBoard: [
            { factionId: Faction.BENE_GESSERIT, territoryId: TerritoryId.ARRAKEEN, sector: 0, forces: { regular: 0, elite: 0 }, advisors: 3 },
          ],
        },
      })
      .set(Faction.ATREIDES, {
        ...atreidesState,
        forces: {
          ...atreidesState.forces,
          onBoard: [
            { factionId: Faction.ATREIDES, territoryId: TerritoryId.ARRAKEEN, sector: 0, forces: { regular: 5, elite: 0 } },
          ],
        },
      }),
  };

  // Apply UNIVERSAL STEWARDS
  const events: any[] = [];
  state = applyUniversalStewards(state, events);

  // Check that advisors were NOT flipped (restrictions block it)
  const finalStack = getFactionState(state, Faction.BENE_GESSERIT).forces.onBoard.find(
    (s) => s.territoryId === TerritoryId.ARRAKEEN && s.sector === 0
  );

  assert(
    !!finalStack,
    `Stack exists after UNIVERSAL STEWARDS`
  );
  // Advisors should remain advisors due to restrictions (even if alone, PEACETIME/STORMED IN block it)
  // But in this case, they're also not alone (ally present), so definitely shouldn't flip
  assert(
    (finalStack?.advisors ?? 0) === 3,
    `Advisors remain advisors when restrictions apply (got ${finalStack?.advisors ?? 0})`
  );
}

function testUniversalStewards_RequiresAdvancedRules(): void {
  section("2.02.21 - UNIVERSAL STEWARDS only works in advanced rules");

  let state = createGameState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES],
    advancedRules: false, // Basic rules
  });
  state.phase = Phase.BATTLE;

  // Set up BG with advisors alone
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  state = {
    ...state,
    factions: new Map(state.factions).set(Faction.BENE_GESSERIT, {
      ...bgState,
      forces: {
        ...bgState.forces,
        onBoard: [
          { factionId: Faction.BENE_GESSERIT, territoryId: TerritoryId.ARRAKEEN, sector: 0, forces: { regular: 0, elite: 0 }, advisors: 3 },
        ],
      },
    }),
  };

  // Apply UNIVERSAL STEWARDS
  const events: any[] = [];
  state = applyUniversalStewards(state, events);

  // Check that advisors were NOT flipped (basic rules)
  const finalStack = getFactionState(state, Faction.BENE_GESSERIT).forces.onBoard.find(
    (s) => s.territoryId === TerritoryId.ARRAKEEN && s.sector === 0
  );

  assert(
    !!finalStack,
    `Stack exists after UNIVERSAL STEWARDS`
  );
  assert(
    (finalStack?.advisors ?? 0) === 3,
    `Advisors remain advisors in basic rules (got ${finalStack?.advisors ?? 0})`
  );
  assert(
    events.length === 0,
    `No events emitted in basic rules (got ${events.length})`
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.02.21 UNIVERSAL STEWARDS");
  console.log("=".repeat(80));

  try {
    testUniversalStewards_AutoFlipsAloneAdvisors();
    testUniversalStewards_DoesNotFlipWhenNotAlone();
    testUniversalStewards_RespectsRestrictions();
    testUniversalStewards_RequiresAdvancedRules();
  } catch (error) {
    console.error("Unexpected error during 2.02.21 tests:", error);
    failCount++;
  }

  console.log("\nSummary:");
  console.log(`  Passed: ${passCount}`);
  console.log(`  Failed: ${failCount}`);

  if (failCount > 0) {
    throw new Error("Some 2.02.21 rule tests failed");
  }
}

// Self-executing main function for direct script execution
if (require.main === module) {
  runRuleTests().catch(console.error);
}

