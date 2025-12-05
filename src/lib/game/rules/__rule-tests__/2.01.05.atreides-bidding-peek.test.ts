/**
 * Rule test: 2.01.05 ATREIDES BIDDING (PEEK TREACHERY CARD)
 *
 * Rule text (numbered_rules/2.md):
 * "2.01.05 ✷BIDDING: During the Bidding Phase when a Treachery Card comes up for purchase,
 * you may look at it before any faction bids on it."
 *
 * These tests exercise the core behavior of the Atreides bidding ability:
 * - When Atreides is in the game, a PEEK_CARD request is generated for them
 * - When Atreides is not in the game, no request is generated (shouldTrigger = false)
 * - Atreides can always see the full card description when bidding
 * - Other factions see only an "unknown Treachery card" description
 *
 * @rule-test 2.01.05
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/2.01.05.atreides-bidding-peek.test.ts
 */

import { Faction, type GameState } from "../../types";
import {
  createAtreidesBiddingPeekRequest,
  canAtreidesSeeCard,
  getCardDescriptionForBidding,
} from "../../faction-abilities/atreides";
import { ALL_TREACHERY_CARDS } from "../../data";

// =============================================================================
// Minimal test harness
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
// Helpers
// =============================================================================

function buildState(factions: Faction[]): GameState {
  // We don't need full game initialization here; we only care that the
  // factions map includes or excludes Atreides, which is encoded in the
  // bidding ability's logic via state.factions.has(Faction.ATREIDES).
  const emptyState = new Map<Faction, never>();
  const factionsMap = new Map(
    factions.map((faction) => [
      faction,
      {
        factionId: faction,
      } as unknown as never,
    ])
  );

  return {
    // Minimal shape required by the ability: factions map
    factions: factionsMap,
  } as unknown as GameState;
}

function getSampleCardId(): string {
  const anyCard = ALL_TREACHERY_CARDS[0];
  if (!anyCard) {
    throw new Error(
      "No treachery cards defined; cannot run 2.01.05 tests without card data"
    );
  }
  return anyCard.id;
}

// =============================================================================
// Tests for 2.01.05
// =============================================================================

function testAtreidesPeekRequest_generatedWhenInGame(): void {
  section("2.01.05 - Peek request generated when Atreides is in the game");

  const state = buildState([Faction.ATREIDES, Faction.HARKONNEN]);
  const cardId = getSampleCardId();

  const result = createAtreidesBiddingPeekRequest({
    state,
    cardId,
    auctionNumber: 1,
    totalAuctions: 9,
    startingBidder: Faction.HARKONNEN,
  });

  assert(result.shouldTrigger === true, "Peek request should trigger");
  assert(
    !!result.request,
    "Peek request object is present when Atreides is in the game"
  );
  assert(
    result.request?.factionId === Faction.ATREIDES,
    "Peek request is addressed to Atreides"
  );
  assert(
    result.request?.requestType === "PEEK_CARD",
    "Peek request type is PEEK_CARD"
  );
}

function testAtreidesPeekRequest_notGeneratedWhenNotInGame(): void {
  section("2.01.05 - No peek request when Atreides is not in the game");

  const state = buildState([Faction.HARKONNEN, Faction.EMPEROR]);
  const cardId = getSampleCardId();

  const result = createAtreidesBiddingPeekRequest({
    state,
    cardId,
    auctionNumber: 1,
    totalAuctions: 9,
    startingBidder: Faction.HARKONNEN,
  });

  assert(
    result.shouldTrigger === false,
    "Peek request should not trigger when Atreides is not in the game"
  );
  assert(
    !result.request,
    "No request object is generated when Atreides is not in the game"
  );
}

function testAtreidesCanSeeCardAndOthersCannot(): void {
  section("2.01.05 - Atreides sees full card description; others see unknown");

  const sampleDef = ALL_TREACHERY_CARDS[0];
  if (!sampleDef) {
    throw new Error(
      "No treachery cards defined; cannot run description tests"
    );
  }

  const atreidesDescription = getCardDescriptionForBidding(
    { name: sampleDef.name },
    true
  );
  const otherDescription = getCardDescriptionForBidding(
    { name: sampleDef.name },
    false
  );

  assert(
    atreidesDescription === sampleDef.name,
    `Atreides sees full card name "${sampleDef.name}" (actual: "${atreidesDescription}")`
  );
  assert(
    otherDescription === "an unknown Treachery card",
    `Non-Atreides bidders see "an unknown Treachery card" (actual: "${otherDescription}")`
  );

  assert(
    canAtreidesSeeCard(Faction.ATREIDES) === true,
    "canAtreidesSeeCard returns true for Atreides"
  );
  assert(
    canAtreidesSeeCard(Faction.HARKONNEN) === false,
    "canAtreidesSeeCard returns false for non-Atreides faction"
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.01.05 ATREIDES BIDDING PEEK");
  console.log("=".repeat(80));

  try {
    testAtreidesPeekRequest_generatedWhenInGame();
  } catch (error) {
    console.error(
      "❌ testAtreidesPeekRequest_generatedWhenInGame failed:",
      error
    );
    failCount++;
  }

  try {
    testAtreidesPeekRequest_notGeneratedWhenNotInGame();
  } catch (error) {
    console.error(
      "❌ testAtreidesPeekRequest_notGeneratedWhenNotInGame failed:",
      error
    );
    failCount++;
  }

  try {
    testAtreidesCanSeeCardAndOthersCannot();
  } catch (error) {
    console.error(
      "❌ testAtreidesCanSeeCardAndOthersCannot failed:",
      error
    );
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.01.05 tests completed: ${passCount} passed, ${failCount} failed`
  );
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  // Allow this file to be run directly via tsx
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  runRuleTests();
}


