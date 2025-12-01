/**
 * Validation tests for the rules engine.
 * Run with: npx tsx src/lib/game/rules/test-rules.ts
 */

import { addSpice, createGameState, sendForcesToTanks } from "../state";
import { Faction, TerritoryId } from "../types";
import {
  checkOrnithopterAccess,
  getMovementRange,
  getRevivalLimits,
  getVictoryContext,
  validateBid,
  validateForceRevival,
  validateMovement,
  validateShipment,
} from "./index";

// =============================================================================
// TEST UTILITIES
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

// =============================================================================
// SHIPMENT VALIDATION TESTS
// =============================================================================

function testShipmentValidation(): void {
  section("Shipment Validation");

  const state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
  });

  // Valid shipment
  const validResult = validateShipment(
    state,
    Faction.EMPEROR, // Emperor starts with 20 in reserves
    TerritoryId.TUEKS_SIETCH,
    3,
    5
  );
  assert(validResult.valid, "Valid shipment passes validation");
  assert(
    validResult.context.cost !== undefined,
    "Result includes cost calculation"
  );

  // Invalid: Not enough reserves
  const tooManyForces = validateShipment(
    state,
    Faction.EMPEROR,
    TerritoryId.CARTHAG,
    11,
    25 // More than 20 reserves
  );
  assert(!tooManyForces.valid, "Rejects shipment exceeding reserves");
  assert(
    tooManyForces.errors.some((e) => e.code === "INSUFFICIENT_RESERVES"),
    "Error code is INSUFFICIENT_RESERVES"
  );
  assert(
    tooManyForces.errors[0].suggestion !== undefined,
    "Error includes suggestion for agent"
  );

  // Invalid: Not enough spice
  const poorEmperor = createGameState({
    factions: [Faction.SPACING_GUILD, Faction.EMPEROR],
  });
  // Emperor starts with 10 spice, shipping 20 forces to non-stronghold = 40 spice
  const tooExpensive = validateShipment(
    poorEmperor,
    Faction.EMPEROR,
    TerritoryId.PLASTIC_BASIN, // Non-stronghold, 2 spice each
    5,
    10
  );
  assert(!tooExpensive.valid, "Rejects shipment exceeding spice");
  assert(
    tooExpensive.errors.some((e) => e.code === "INSUFFICIENT_SPICE"),
    "Error code is INSUFFICIENT_SPICE"
  );

  // Suggestions provided
  assert(
    tooExpensive.suggestions !== undefined &&
      tooExpensive.suggestions.length > 0,
    "Provides alternative shipment suggestions"
  );
}

// =============================================================================
// MOVEMENT VALIDATION TESTS
// =============================================================================

function testMovementValidation(): void {
  section("Movement Validation");

  const state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
  });

  // Atreides starts in Arrakeen - has ornithopters
  assert(
    checkOrnithopterAccess(state, Faction.ATREIDES),
    "Atreides has ornithopter access (in Arrakeen)"
  );
  assert(
    getMovementRange(state, Faction.ATREIDES) === 3,
    "Atreides movement range is 3 (ornithopters)"
  );

  // Harkonnen starts in Carthag - also has ornithopters
  assert(
    checkOrnithopterAccess(state, Faction.HARKONNEN),
    "Harkonnen has ornithopter access (in Carthag)"
  );

  // Valid movement from Arrakeen
  const validMove = validateMovement(
    state,
    Faction.ATREIDES,
    TerritoryId.ARRAKEEN,
    9,
    TerritoryId.SHIELD_WALL,
    8,
    5
  );
  assert(validMove.valid, "Valid adjacent movement passes");

  // Invalid: No forces in territory
  const noForces = validateMovement(
    state,
    Faction.ATREIDES,
    TerritoryId.SIETCH_TABR, // Atreides has no forces here
    5,
    TerritoryId.PASTY_MESA,
    6,
    5
  );
  assert(!noForces.valid, "Rejects movement from empty territory");
  assert(
    noForces.errors.some((e) => e.code === "NO_FORCES_TO_MOVE"),
    "Error code is NO_FORCES_TO_MOVE"
  );
}

// =============================================================================
// BIDDING VALIDATION TESTS
// =============================================================================

function testBiddingValidation(): void {
  section("Bidding Validation");

  const state = createGameState({
    factions: [Faction.ATREIDES, Faction.EMPEROR],
  });

  // Valid opening bid
  const validBid = validateBid(state, Faction.EMPEROR, 5, 0, true);
  assert(validBid.valid, "Valid opening bid passes");

  // Valid raise
  const validRaise = validateBid(state, Faction.ATREIDES, 6, 5, false);
  assert(validRaise.valid, "Valid raise passes");

  // Invalid: Bid not higher
  const lowBid = validateBid(state, Faction.ATREIDES, 5, 5, false);
  assert(!lowBid.valid, "Rejects bid not higher than current");
  assert(
    lowBid.errors.some((e) => e.code === "BID_TOO_LOW"),
    "Error code is BID_TOO_LOW"
  );
  assert(
    lowBid.errors[0].suggestion?.includes("6") ?? false,
    "Suggestion includes minimum valid bid"
  );

  // Invalid: Exceeds spice
  const tooBig = validateBid(state, Faction.ATREIDES, 20, 0, true);
  assert(!tooBig.valid, "Rejects bid exceeding spice");
  assert(
    tooBig.errors.some((e) => e.code === "BID_EXCEEDS_SPICE"),
    "Error code is BID_EXCEEDS_SPICE"
  );

  // Suggestions for valid bids
  assert(
    tooBig.suggestions !== undefined && tooBig.suggestions.length > 0,
    "Provides bid suggestions"
  );

  // Prevent self-outbidding: current high bidder cannot raise own bid
  const selfOutbid = validateBid(state, Faction.EMPEROR, 6, 5, false, {
    isCurrentHighBidder: true,
  });
  assert(!selfOutbid.valid, "Rejects self-outbidding by current high bidder");
  assert(
    selfOutbid.errors.some((e) => e.code === "SELF_OUTBID_NOT_ALLOWED"),
    "Error code is SELF_OUTBID_NOT_ALLOWED"
  );
}

// =============================================================================
// REVIVAL VALIDATION TESTS
// =============================================================================

function testRevivalValidation(): void {
  section("Revival Validation");

  let state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
  });

  // First, send some forces to tanks
  state = sendForcesToTanks(
    state,
    Faction.ATREIDES,
    TerritoryId.ARRAKEEN,
    9,
    5
  );

  // Check revival limits
  const limits = getRevivalLimits(state, Faction.ATREIDES);
  assert(limits.freeForces === 2, "Atreides has 2 free revival");
  assert(limits.maxForces === 3, "Max revival is 3 per turn");
  assert(limits.forcesInTanks === 5, "Correctly tracks forces in tanks");

  // Valid revival - free
  const freeRevival = validateForceRevival(state, Faction.ATREIDES, 2);
  assert(freeRevival.valid, "Free revival passes");
  assert(freeRevival.context.cost === 0, "Free revival costs 0");

  // Valid revival - paid
  state = addSpice(state, Faction.ATREIDES, 10); // Give more spice
  const paidRevival = validateForceRevival(state, Faction.ATREIDES, 3);
  assert(paidRevival.valid, "Paid revival passes");

  // Invalid: Exceeds limit
  const tooMany = validateForceRevival(state, Faction.ATREIDES, 5);
  assert(!tooMany.valid, "Rejects revival exceeding limit");
  assert(
    tooMany.errors.some((e) => e.code === "REVIVAL_LIMIT_EXCEEDED"),
    "Error code is REVIVAL_LIMIT_EXCEEDED"
  );
}

// =============================================================================
// VICTORY CONTEXT TESTS
// =============================================================================

function testVictoryContext(): void {
  section("Victory Context");

  const state = createGameState({
    factions: [
      Faction.ATREIDES,
      Faction.HARKONNEN,
      Faction.FREMEN,
      Faction.SPACING_GUILD,
    ],
  });

  // Check Atreides context
  const atreidesContext = getVictoryContext(state, Faction.ATREIDES);
  assert(
    atreidesContext.strongholdsControlled === 1,
    "Atreides controls 1 stronghold (Arrakeen)"
  );
  assert(
    atreidesContext.strongholdsNeeded === 3,
    "Unallied Atreides needs 3 strongholds"
  );
  assert(
    atreidesContext.turnsRemaining === 9,
    "Correct turns remaining (10 - 1 = 9)"
  );

  // Check Fremen special victory possibility
  const fremenContext = getVictoryContext(state, Faction.FREMEN);
  assert(
    fremenContext.specialVictoryPossible,
    "Fremen has special victory possible (Guild in game)"
  );
  assert(
    fremenContext.specialVictoryType === "Fremen Special",
    "Correct special victory type"
  );

  // Check Guild special
  const guildContext = getVictoryContext(state, Faction.SPACING_GUILD);
  assert(
    guildContext.specialVictoryPossible,
    "Guild has special victory possible"
  );
}

// =============================================================================
// AGENT-FRIENDLY ERROR TESTS
// =============================================================================

function testAgentFriendlyErrors(): void {
  section("Agent-Friendly Errors");

  const state = createGameState({
    factions: [Faction.ATREIDES, Faction.EMPEROR],
  });

  // Test that errors include all required fields
  const invalidShipment = validateShipment(
    state,
    Faction.EMPEROR,
    TerritoryId.CARTHAG,
    11,
    30 // Too many forces
  );

  const error = invalidShipment.errors[0];
  assert(error.code !== undefined, "Error has code");
  assert(error.message !== undefined, "Error has message");
  assert(error.suggestion !== undefined, "Error has suggestion");
  assert(error.field !== undefined, "Error identifies problematic field");
  assert(error.actual !== undefined, "Error shows actual value");
  assert(error.expected !== undefined, "Error shows expected range");

  // Test context for agent decision-making
  assert(
    invalidShipment.context.reserveForces !== undefined,
    "Context includes reserve forces"
  );
  assert(
    invalidShipment.context.spiceAvailable !== undefined,
    "Context includes spice available"
  );
}

// =============================================================================
// MAIN
// =============================================================================

function main(): void {
  console.log("\n🏜️  DUNE GF9 - Phase 2 Rules Validation Tests\n");

  testShipmentValidation();
  testMovementValidation();
  testBiddingValidation();
  testRevivalValidation();
  testVictoryContext();
  testAgentFriendlyErrors();

  console.log("\n" + "=".repeat(40));
  console.log(`\n📊 Results: ${passCount} passed, ${failCount} failed\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

main();
