/**
 * Rule tests: 2.06.04 / 2.06.09 / 2.06.10 – GUILD PAYMENT & ALLY SHIPPING
 *
 * Rule texts (numbered_rules/2.md):
 *
 * 2.06.04 PAYMENT FOR SHIPMENT:
 * "When another faction ships Forces onto Dune, they pay the spice to you instead of to the Spice Bank."
 *
 * 2.06.09 ALLIANCE:
 * "Your ally may use the ability HALF PRICE SHIPPING [2.06.06].✷"
 *
 * 2.06.10 ALLIANCE:
 * "Your ally may use the ability CROSS-SHIP [2.06.05.01].✷"
 *
 * @rule-test 2.06.04
 * @rule-test 2.06.09
 * @rule-test 2.06.10
 */

import {
  Faction,
  TerritoryId,
  type GameState,
} from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { calculateShipmentCost } from "../../rules/movement/shipment/cost-calculation";
import { validateCrossShip } from "../../rules/movement/shipment/validate-cross-ship";
import { ShipmentProcessor } from "../../phases/handlers/shipment-movement/processors/shipment-processing";

// =============================================================================
// Minimal console-based test harness
// =============================================================================

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
    factions: [Faction.SPACING_GUILD, Faction.ATREIDES],
    advancedRules: true,
  });
}

// =============================================================================
// 2.06.04 – PAYMENT FOR SHIPMENT: others pay Guild instead of bank
// =============================================================================

function testPaymentForShipmentGoesToGuild(): void {
  section("2.06.04 - Non-Guild shipment pays spice to Guild instead of bank");

  let state = buildBaseState();
  const processor = new ShipmentProcessor();

  const atreidesBefore = getFactionState(state, Faction.ATREIDES);
  const guildBefore = getFactionState(state, Faction.SPACING_GUILD);

  // Give Atreides enough spice and reserves to ship
  const shipmentTerritory = TerritoryId.HAGGA_BASIN; // non-stronghold, simpler
  const shipmentSector = 8; // valid sector for Hagga Basin
  const shipmentCount = 2;
  const cost = calculateShipmentCost(
    shipmentTerritory,
    shipmentCount,
    Faction.ATREIDES
  );

  state = {
    ...state,
    factions: new Map(state.factions)
      .set(Faction.ATREIDES, {
        ...atreidesBefore,
        spice: 10,
      })
      .set(Faction.SPACING_GUILD, {
        ...guildBefore,
        spice: 0,
      }),
  };

  const response: any = {
    factionId: Faction.ATREIDES,
    actionType: "SHIP_FORCES",
    data: {
      territoryId: shipmentTerritory,
      sector: shipmentSector,
      count: shipmentCount,
      cost,
      useElite: false,
    },
  };

  const result = processor.process(state, response, []);
  const finalAtreides = getFactionState(result.state, Faction.ATREIDES);
  const finalGuild = getFactionState(result.state, Faction.SPACING_GUILD);

  assert(
    finalAtreides.spice === 10 - cost,
    `Atreides spice decreased by shipment cost (expected ${10 - cost}, got ${finalAtreides.spice})`
  );
  assert(
    finalGuild.spice === cost,
    `Guild received shipment payment (expected ${cost}, got ${finalGuild.spice})`
  );
}

// =============================================================================
// 2.06.09 / 2.06.10 – Ally half-price shipping & ally cross-ship
// =============================================================================

function testGuildAllyCanCrossShipAtHalfPrice(): void {
  section("2.06.09 / 2.06.10 - Guild ally can cross-ship and pays half price");

  let state = buildBaseState();

  const guildState = getFactionState(state, Faction.SPACING_GUILD);
  const atreidesState = getFactionState(state, Faction.ATREIDES);

  // Make them allies and give Atreides forces and spice
  state = {
    ...state,
    factions: new Map(state.factions)
      .set(Faction.SPACING_GUILD, {
        ...guildState,
        allianceStatus: "ALLIED" as any,
        allyId: Faction.ATREIDES,
      })
      .set(Faction.ATREIDES, {
        ...atreidesState,
        allianceStatus: "ALLIED" as any,
        allyId: Faction.SPACING_GUILD,
        spice: 10,
        forces: {
          ...atreidesState.forces,
          onBoard: [
            {
              territoryId: TerritoryId.HAGGA_BASIN,
              sector: 11,
              forces: { regular: 3, elite: 0 },
            },
          ],
        },
      }),
  };

  const strongholdDest = TerritoryId.ARRAKEEN;
  const forceCount = 2;

  const result = validateCrossShip(
    state,
    Faction.ATREIDES,
    TerritoryId.HAGGA_BASIN,
    11,
    strongholdDest,
    8,
    forceCount
  );

  assert(result.valid, "Guild ally (Atreides) is allowed to use cross-ship when allied");

  const halfPriceCostForGuild = calculateShipmentCost(
    strongholdDest,
    forceCount,
    Faction.SPACING_GUILD
  );

  if (result.valid && result.value) {
    assert(
      result.value.cost === halfPriceCostForGuild,
      `Guild ally pays half-price shipment cost (expected ${halfPriceCostForGuild}, got ${result.value.cost})`
    );
  }
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.06.04 / 2.06.09 / 2.06.10 GUILD PAYMENT & ALLY SHIPPING");
  console.log("=".repeat(80));

  try {
    testPaymentForShipmentGoesToGuild();
    testGuildAllyCanCrossShipAtHalfPrice();
  } catch (error) {
    console.error("Unexpected error during 2.06.04/2.06.09/2.06.10 tests:", error);
    failCount++;
  }

  console.log("\nSummary:");
  console.log(`  Passed: ${passCount}`);
  console.log(`  Failed: ${failCount}`);

  if (failCount > 0) {
    throw new Error("Some 2.06.04/2.06.09/2.06.10 rule tests failed");
  }
}


