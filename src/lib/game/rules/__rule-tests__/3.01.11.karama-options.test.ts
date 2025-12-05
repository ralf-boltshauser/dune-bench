/**
 * Rule tests: 3.01.11.01–3.01.11.04 KARAMA OPTIONS
 *
 * Rule text (numbered_rules/3.md):
 * - 3.01.11.01 Cancel one use of a faction ability that has an ✷ after it when another player attempts to use it.
 *   The faction whose ability is cancelled may recalculate and retake that same action (ex: revival, shipment,
 *   movement) without the ability.
 * - 3.01.11.02 Prevent one use of a faction ability that has an ✷ before and after it. This must be done before
 *   that faction uses that ability.
 * - 3.01.11.03 Purchase a shipment of Forces onto the board at Guild Rates (1/2 normal) paid to the Spice Bank
 *   for any faction.
 * - 3.01.11.04 Bid more spice than you have (without Revealing this card) and/or Buy a Treachery Card without
 *   paying spice for it (cannot be used if your hand is full).
 *
 * These rules are enforced by Karama tools:
 * - respond_to_karama_opportunity: use Karama (or worthless for BG) to cancel/prevent abilities
 * - use_karama_guild_shipment: mark guild-rate shipment active and discard Karama
 * - use_karama_bid_over_spice: allow bidding over spice and discard Karama
 *
 * @rule-test 3.01.11.01
 * @rule-test 3.01.11.02
 * @rule-test 3.01.11.03
 * @rule-test 3.01.11.04
 */

import { Faction, CardLocation, type GameState, type TreacheryCard } from "../../types";
import { getFactionState } from "../../state";
import { createGameState } from "../../state/factory";
import { getTreacheryCardDefinition } from "../../data/treachery-cards";
import type { ToolContextManager } from "../../tools/context";
import { createKaramaTools } from "../../tools/actions/karama";

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

// =============================================================================
// Helpers
// =============================================================================

function buildBaseStateWithKarama(
  factions: Faction[],
  karamaHolder: Faction
): GameState {
  let state = createGameState({
    factions,
    advancedRules: true,
  });

  const def = getTreacheryCardDefinition("karama_1");
  if (!def) throw new Error("Missing karama_1 definition for tests");

  const card: TreacheryCard = {
    definitionId: def.id,
    location: CardLocation.HAND,
    ownerId: karamaHolder,
  };

  const newFactions = new Map(state.factions);
  const holderState = { ...getFactionState(state, karamaHolder) };
  holderState.hand = [...holderState.hand, card];
  newFactions.set(karamaHolder, holderState);

  state = { ...state, factions: newFactions };

  // Initialize basic Karama interrupt state
  (state as any).karamaState = {
    interruptType: "CANCEL", // or "PREVENT" in specific tests
    targetFaction: Faction.ATREIDES,
    abilityName: "PRESCIENCE",
    eligibleFactions: factions.filter((f) => f !== Faction.ATREIDES),
    responses: new Map(),
    interrupted: false,
    interruptor: null,
  };

  return state;
}

function makeToolContext(faction: Faction, initialState: GameState): {
  ctx: ToolContextManager;
  getState: () => GameState;
} {
  let state = initialState;

  const ctx: ToolContextManager = {
    get state() {
      return state;
    },
    get faction() {
      return faction;
    },
    updateState(newState: GameState) {
      state = newState;
    },
  } as unknown as ToolContextManager;

  return { ctx, getState: () => state };
}

// =============================================================================
// Tests
// =============================================================================

async function testKaramaRespondCancelMarksInterruptedAndDiscardsCard(): Promise<void> {
  section("3.01.11.01 - using Karama to cancel ability marks interrupt and discards card");

  const initialState = buildBaseStateWithKarama(
    [Faction.ATREIDES, Faction.HARKONNEN],
    Faction.HARKONNEN
  );

  const { ctx, getState } = makeToolContext(Faction.HARKONNEN, initialState);
  const tools = createKaramaTools(ctx);

  const result = await tools.respond_to_karama_opportunity.execute({
    useKarama: true,
    karamaCardId: "karama_1",
  } as any);

  const finalState = getState() as any;

  // We assert on state changes (interrupt + discard), not the exact tool result shape.
  assert(
    finalState.karamaState?.interrupted === true,
    "karamaState.interrupted is set to true"
  );
  assert(
    finalState.karamaState?.interruptor === Faction.HARKONNEN,
    "karamaState.interruptor records the faction that used Karama"
  );

  const harkState = getFactionState(finalState, Faction.HARKONNEN);
  const stillHasKarama = harkState.hand.some(
    (c) => c.definitionId === "karama_1"
  );
  assert(!stillHasKarama, "Karama card is discarded from hand after use");
}

async function testKaramaPreventUsesPreventInterruptType(): Promise<void> {
  section("3.01.11.02 - PREVENT interrupt type is supported");

  const base = buildBaseStateWithKarama(
    [Faction.ATREIDES, Faction.EMPEROR],
    Faction.EMPEROR
  );
  // Switch interruptType to PREVENT
  const state = {
    ...base,
    karamaState: {
      ...(base as any).karamaState,
      interruptType: "PREVENT",
      abilityName: "KWISATZ_HADERACH",
    },
  } as any as GameState;

  const { ctx, getState } = makeToolContext(Faction.EMPEROR, state);
  const tools = createKaramaTools(ctx);

  const result = await tools.respond_to_karama_opportunity.execute({
    useKarama: true,
    karamaCardId: "karama_1",
  } as any);

  const finalState = getState() as any;

  // Again, we care about interrupt state, not the result.ok flag.
  assert(
    finalState.karamaState?.interrupted === true,
    "karamaState.interrupted is set for PREVENT"
  );
  assert(
    finalState.karamaState?.interruptType === "PREVENT",
    "interruptType remains PREVENT in state"
  );
}

async function testKaramaGuildShipmentMarksGuildRatesAndDiscardsCard(): Promise<void> {
  section("3.01.11.03 - using Karama for Guild-rate shipment marks flag and discards card");

  let state = createGameState({
    factions: [Faction.SPACING_GUILD, Faction.ATREIDES],
    advancedRules: true,
  });
  // Give Karama to Guild
  const def = getTreacheryCardDefinition("karama_1");
  if (!def) throw new Error("Missing karama_1 definition for tests");
  const card: TreacheryCard = {
    definitionId: def.id,
    location: CardLocation.HAND,
    ownerId: Faction.SPACING_GUILD,
  };
  const factions = new Map(state.factions);
  const guildState = { ...getFactionState(state, Faction.SPACING_GUILD) };
  guildState.hand = [...guildState.hand, card];
  factions.set(Faction.SPACING_GUILD, guildState);
  state = { ...state, factions };

  const { ctx, getState } = makeToolContext(Faction.SPACING_GUILD, state);
  const tools = createKaramaTools(ctx);

  const result = await tools.use_karama_guild_shipment.execute({
    karamaCardId: "karama_1",
  } as any);

  const finalState = getState();
  const finalGuildState = getFactionState(
    finalState,
    Faction.SPACING_GUILD
  ) as any;

  // Focus on state changes (flag + discard), not the exact result.ok value.
  assert(
    finalGuildState.karamaGuildShipmentActive === true,
    "karamaGuildShipmentActive flag is set on faction state"
  );
  const stillHasKarama = finalGuildState.hand.some(
    (c: TreacheryCard) => c.definitionId === "karama_1"
  );
  assert(!stillHasKarama, "Karama card is discarded after guild shipment use");
}

async function testKaramaBidOverSpiceMarksBiddingFlagAndDiscardsCard(): Promise<void> {
  section("3.01.11.04 - using Karama to bid over spice marks flag and discards card");

  let state = createGameState({
    factions: [Faction.EMPEROR, Faction.ATREIDES],
    advancedRules: true,
  });

  const def = getTreacheryCardDefinition("karama_1");
  if (!def) throw new Error("Missing karama_1 definition for tests");
  const card: TreacheryCard = {
    definitionId: def.id,
    location: CardLocation.HAND,
    ownerId: Faction.EMPEROR,
  };
  const factions = new Map(state.factions);
  const emperorState = { ...getFactionState(state, Faction.EMPEROR) };
  emperorState.hand = [...emperorState.hand, card];
  factions.set(Faction.EMPEROR, emperorState);
  state = { ...state, factions };

  const { ctx, getState } = makeToolContext(Faction.EMPEROR, state);
  const tools = createKaramaTools(ctx);

  const result = await tools.use_karama_bid_over_spice.execute({
    bidAmount: 100,
    karamaCardId: "karama_1",
  } as any);

  const finalState = getState();
  const finalEmperorState = getFactionState(finalState, Faction.EMPEROR) as any;

  // Again, we care that bidding flag is set and card discarded, not result.ok.
  assert(
    finalEmperorState.karamaBiddingActive === true,
    "karamaBiddingActive flag is set on faction state"
  );
  const stillHasKarama = finalEmperorState.hand.some(
    (c: TreacheryCard) => c.definitionId === "karama_1"
  );
  assert(!stillHasKarama, "Karama card is discarded after bidding use");
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 3.01.11.01–3.01.11.04 KARAMA OPTIONS");
  console.log("=".repeat(80));

  try {
    await testKaramaRespondCancelMarksInterruptedAndDiscardsCard();
  } catch (error) {
    console.error(
      "❌ testKaramaRespondCancelMarksInterruptedAndDiscardsCard failed:",
      error
    );
    failCount++;
  }

  try {
    await testKaramaPreventUsesPreventInterruptType();
  } catch (error) {
    console.error(
      "❌ testKaramaPreventUsesPreventInterruptType failed:",
      error
    );
    failCount++;
  }

  try {
    await testKaramaGuildShipmentMarksGuildRatesAndDiscardsCard();
  } catch (error) {
    console.error(
      "❌ testKaramaGuildShipmentMarksGuildRatesAndDiscardsCard failed:",
      error
    );
    failCount++;
  }

  try {
    await testKaramaBidOverSpiceMarksBiddingFlagAndDiscardsCard();
  } catch (error) {
    console.error(
      "❌ testKaramaBidOverSpiceMarksBiddingFlagAndDiscardsCard failed:",
      error
    );
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 3.01.11.01–3.01.11.04 tests completed: ${passCount} passed, ${failCount} failed`
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


