/**
 * Rule test: 2.02.22 BENE GESSERIT KARAMA
 * @rule-test 2.02.22
 *
 * Rule text (numbered_rules/2.md):
 * "2.02.22 KARAMA: You may use any worthless card as if it were a Karama Card.✷"
 *
 * This rule allows BG to use worthless cards as Karama cards.
 * Implemented in hasKaramaCard() and canUseKaramaCard() functions.
 *
 * Run with:
 *   pnpm exec tsx src/lib/game/rules/__rule-tests__/2.02.22.bg-karama.test.ts
 */

import { Faction, TreacheryCardType, CardLocation, type GameState } from "../../types";
import { createGameState, getFactionState } from "../../state";
import { canUseKarama, isKaramaCardForFaction, getKaramaCards } from "../../rules/karama";
import { WORTHLESS_CARDS, ALL_TREACHERY_CARDS, getTreacheryCardDefinition } from "../../data/treachery-cards";

// =============================================================================
// Minimal test harness (console-based)
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

function buildBaseState(): GameState {
  return createGameState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES],
    advancedRules: true,
  });
}

function addCardToHand(
  state: GameState,
  faction: Faction,
  cardId: string
): GameState {
  const factionState = getFactionState(state, faction);
  const cardDef = getTreacheryCardDefinition(cardId);
  
  if (!cardDef) {
    throw new Error(`Card not found: ${cardId}`);
  }

  // Add to hand
  factionState.hand.push({
    definitionId: cardDef.id,
    type: cardDef.type,
    location: CardLocation.HAND,
    ownerId: faction,
  });

  return {
    ...state,
    factions: new Map(state.factions).set(faction, factionState),
  };
}

// =============================================================================
// Tests for 2.02.22
// =============================================================================

function testKarama_worthlessCardWorksAsKarama(): void {
  section("2.02.22 - worthless card works as Karama for BG");

  let state = buildBaseState();

  // Use a worthless card from the list
  const worthlessCard = WORTHLESS_CARDS[0];
  assert(worthlessCard !== undefined, "found a worthless card definition");

  // Add worthless card to BG hand
  state = addCardToHand(state, Faction.BENE_GESSERIT, worthlessCard.id);

  // Check if BG can use it as Karama
  const canUse = canUseKarama(state, Faction.BENE_GESSERIT);
  assert(canUse === true, "BG can use Karama (worthless card counts)");

  const canUseSpecific = canUseKarama(state, Faction.BENE_GESSERIT, worthlessCard.id);
  assert(canUseSpecific === true, "BG can use specific worthless card as Karama");

  const isKarama = isKaramaCardForFaction(worthlessCard.id, Faction.BENE_GESSERIT);
  assert(isKarama === true, "worthless card is recognized as Karama for BG");
}

function testKarama_actualKaramaCardStillWorks(): void {
  section("2.02.22 - actual Karama card still works for BG");

  let state = buildBaseState();

  // Find an actual Karama card definition
  const karamaCard = ALL_TREACHERY_CARDS.find(c => c.type === TreacheryCardType.KARAMA);
  if (!karamaCard) {
    console.log("  ⚠ Skipping test - no Karama card found in card definitions");
    return;
  }

  // Add Karama card to BG hand
  state = addCardToHand(state, Faction.BENE_GESSERIT, karamaCard.id);

  // Check if BG can use it
  const canUse = canUseKarama(state, Faction.BENE_GESSERIT);
  assert(canUse === true, "BG can use Karama (actual Karama card)");

  const canUseSpecific = canUseKarama(state, Faction.BENE_GESSERIT, karamaCard.id);
  assert(canUseSpecific === true, "BG can use specific Karama card");
}

function testKarama_otherFactionsCannotUseWorthlessAsKarama(): void {
  section("2.02.22 - other factions cannot use worthless as Karama");

  let state = buildBaseState();

  // Use a worthless card from the list
  const worthlessCard = WORTHLESS_CARDS[0];
  assert(worthlessCard !== undefined, "found a worthless card definition");

  // Add worthless card to Atreides hand
  state = addCardToHand(state, Faction.ATREIDES, worthlessCard.id);

  // Check if Atreides can use it as Karama (should NOT)
  const canUse = canUseKarama(state, Faction.ATREIDES);
  assert(canUse === false, "Atreides does NOT have Karama card (worthless doesn't count)");

  const canUseSpecific = canUseKarama(state, Faction.ATREIDES, worthlessCard.id);
  assert(canUseSpecific === false, "Atreides cannot use worthless card as Karama");

  const isKarama = isKaramaCardForFaction(worthlessCard.id, Faction.ATREIDES);
  assert(isKarama === false, "worthless card is NOT recognized as Karama for Atreides");
}

function testKarama_worksWithMultipleWorthlessCards(): void {
  section("2.02.22 - works with multiple worthless cards");

  let state = buildBaseState();

  // Use multiple worthless cards from the list
  const worthlessCards = WORTHLESS_CARDS.slice(0, 2);
  assert(worthlessCards.length >= 1, "found at least one worthless card");

  // Add worthless cards to BG hand
  for (const card of worthlessCards) {
    state = addCardToHand(state, Faction.BENE_GESSERIT, card.id);
  }

  // Check if BG can use any of them as Karama
  const canUse = canUseKarama(state, Faction.BENE_GESSERIT);
  assert(canUse === true, "BG can use Karama (multiple worthless cards)");

  // Check getKaramaCards returns all worthless cards (may include other cards from initial state)
  const karamaCards = getKaramaCards(state, Faction.BENE_GESSERIT);
  assert(karamaCards.length >= worthlessCards.length, `getKaramaCards returns at least ${worthlessCards.length} cards (actual: ${karamaCards.length})`);

  // Check each worthless card
  for (const card of worthlessCards) {
    const canUseSpecific = canUseKarama(state, Faction.BENE_GESSERIT, card.id);
    assert(canUseSpecific === true, `BG can use worthless card ${card.id} as Karama`);
    assert(karamaCards.includes(card.id), `getKaramaCards includes ${card.id}`);
  }
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 2.02.22 BENE GESSERIT KARAMA");
  console.log("=".repeat(80));

  try {
    testKarama_worthlessCardWorksAsKarama();
  } catch (error) {
    console.error("❌ testKarama_worthlessCardWorksAsKarama failed:", error);
    failCount++;
  }

  try {
    testKarama_actualKaramaCardStillWorks();
  } catch (error) {
    console.error("❌ testKarama_actualKaramaCardStillWorks failed:", error);
    failCount++;
  }

  try {
    testKarama_otherFactionsCannotUseWorthlessAsKarama();
  } catch (error) {
    console.error("❌ testKarama_otherFactionsCannotUseWorthlessAsKarama failed:", error);
    failCount++;
  }

  try {
    testKarama_worksWithMultipleWorthlessCards();
  } catch (error) {
    console.error("❌ testKarama_worksWithMultipleWorthlessCards failed:", error);
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 2.02.22 tests completed: ${passCount} passed, ${failCount} failed`
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

