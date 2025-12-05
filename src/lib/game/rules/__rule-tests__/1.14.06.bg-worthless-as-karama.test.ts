/**
 * Rule test: 1.14.06 Bene Gesserit worthless cards as Karama
 *
 * Rule text (numbered_rules/1.md):
 * 1.14.06 Bene Gesserit: Instead of a once a game ability you may use any worthless card as if it is a Karama Card.
 *
 * @rule-test 1.14.06
 */

import {
  Faction,
  TreacheryCardType,
  type GameState,
} from "../../types";
import { createGameState } from "../../state/factory";
import {
  canUseKarama,
  getKaramaCards,
  isKaramaCardForFaction,
  getKaramaCardDisplayName,
} from "../../rules/karama";
import { getTreacheryCardDefinition } from "../../data";

// Minimal harness
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

function buildStateWithHand(): GameState {
  const state = createGameState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES],
    turn: 1,
    phase: 0 as any,
    advancedRules: true,
  });

  // We don't care about actual deck contents; just mock hands directly
  const bgState = state.factions.get(Faction.BENE_GESSERIT)!;
  const atreidesState = state.factions.get(Faction.ATREIDES)!;

  const worthlessId = "baliset"; // real worthless card id
  const karamaId = "karama_1"; // assume at least one Karama id exists

  const newBg = {
    ...bgState,
    hand: [
      { definitionId: worthlessId, id: "c1" } as any,
      { definitionId: karamaId, id: "c2" } as any,
    ],
  };

  const newAtreides = {
    ...atreidesState,
    hand: [
      { definitionId: worthlessId, id: "c3" } as any,
      { definitionId: karamaId, id: "c4" } as any,
    ],
  };

  return {
    ...state,
    factions: new Map(state.factions)
      .set(Faction.BENE_GESSERIT, newBg)
      .set(Faction.ATREIDES, newAtreides),
  };
}

function testBgCanUseWorthlessAsKarama(): void {
  section("1.14.06 - BG may use worthless cards as Karama");

  const state = buildStateWithHand();
  const worthlessId = "baliset";

  const bgCanUse = canUseKarama(state, Faction.BENE_GESSERIT, worthlessId);
  const atreidesCanUse = canUseKarama(state, Faction.ATREIDES, worthlessId);

  assert(
    bgCanUse === true,
    "Bene Gesserit should be able to use worthless card as Karama"
  );
  assert(
    atreidesCanUse === false,
    "Non-BG faction should NOT be able to use the same worthless card as Karama"
  );
}

function testBgWorthlessIncludedInKaramaCardsList(): void {
  section("1.14.06 - BG getKaramaCards includes worthless cards");

  const state = buildStateWithHand();
  const worthlessId = "baliset";

  const bgKaramaCards = getKaramaCards(state, Faction.BENE_GESSERIT);
  const atreidesKaramaCards = getKaramaCards(state, Faction.ATREIDES);

  assert(
    bgKaramaCards.includes(worthlessId),
    "getKaramaCards for BG should include worthless card id"
  );
  assert(
    !atreidesKaramaCards.includes(worthlessId),
    "getKaramaCards for non-BG faction should NOT include worthless card id"
  );
}

function testIsKaramaCardForFactionRespectsBgException(): void {
  section("1.14.06 - isKaramaCardForFaction respects BG worthless exception");

  const worthlessId = "baliset";

  assert(
    isKaramaCardForFaction(worthlessId, Faction.BENE_GESSERIT) === true,
    "isKaramaCardForFaction should return true for BG worthless card"
  );
  assert(
    isKaramaCardForFaction(worthlessId, Faction.ATREIDES) === false,
    "isKaramaCardForFaction should return false for non-BG worthless card"
  );
}

function testBgDisplayNameMarksWorthlessAsKarama(): void {
  section("1.14.06 - getKaramaCardDisplayName marks BG worthless as Karama");

  const cardId = "baliset";

  // Pretend we have a definition for the card
  const def =
    getTreacheryCardDefinition(cardId) ||
    ({
      name: "Baliset",
      type: TreacheryCardType.WORTHLESS,
    } as any);

  const bgName = getKaramaCardDisplayName(cardId, Faction.BENE_GESSERIT);
  const atreidesName = getKaramaCardDisplayName(cardId, Faction.ATREIDES);

  assert(
    bgName.includes("(as Karama)") || bgName !== def.name,
    `BG display name should indicate Karama usage (got: ${bgName})`
  );
  assert(
    atreidesName === def.name,
    `Non-BG display name should just be the card name (got: ${atreidesName})`
  );
}

function runTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rule 1.14.06: BG WORTHLESS CARDS AS KARAMA");
  console.log("=".repeat(80));

  testBgCanUseWorthlessAsKarama();
  testBgWorthlessIncludedInKaramaCardsList();
  testIsKaramaCardForFactionRespectsBgException();
  testBgDisplayNameMarksWorthlessAsKarama();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();


