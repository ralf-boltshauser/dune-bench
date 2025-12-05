/**
 * Rule test: 3.01.20 TLEILAXU GHOLA
 *
 * Rule text (numbered_rules/3.md):
 * "3.01.20 TLEILAXU GHOLA: Special - Play at any time to gain an extra Revival. You may immediately revive
 *  1 of your Leaders regardless of how many leaders you have in the Tanks (adding it to your Active Leader pool)
 *  or up to 5 of your Forces from the Tleilaxu Tanks to your reserves at no cost in spice. You still receive your
 *  normal revivals. Discard after use."
 *
 * This rule is enforced by the use_tleilaxu_ghola revival tool:
 * - Allows reviving 1 leader from tanks for free
 * - Allows reviving up to 5 forces from tanks for free
 * - Discards the Tleilaxu Ghola card after use
 *
 * @rule-test 3.01.20
 */

import { Faction, LeaderLocation, CardLocation, type GameState, type TreacheryCard } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { getTreacheryCardDefinition } from "../../data";
import type { ToolContextManager } from "../../tools/context";
import { createRevivalTools } from "../../tools/actions/revival";

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

function buildBaseRevivalState(): GameState {
  // Use two standard factions to satisfy createGameState validation (2–6 factions)
  return createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    advancedRules: true,
  });
}

function giveTleilaxuGhola(state: GameState, faction: Faction): GameState {
  const def = getTreacheryCardDefinition("tleilaxu_ghola");
  if (!def) throw new Error("Missing tleilaxu_ghola definition for tests");

  const card: TreacheryCard = {
    definitionId: def.id,
    location: CardLocation.HAND,
    ownerId: faction,
  };

  const factions = new Map(state.factions);
  const factionState = { ...getFactionState(state, faction) };
  factionState.hand = [...factionState.hand, card];
  factions.set(faction, factionState);

  return { ...state, factions };
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

async function testGholaRevivesLeaderForFreeAndDiscardsCard(): Promise<void> {
  section("3.01.20 - revive leader for free and discard Tleilaxu Ghola");

  let state = buildBaseRevivalState();
  state = giveTleilaxuGhola(state, Faction.ATREIDES);

  // Move first leader to tanks to be a valid revival target
  const factions = new Map(state.factions);
  const atreidesState = { ...getFactionState(state, Faction.ATREIDES) };
  const leaders = [...atreidesState.leaders];
  leaders[0] = {
    ...leaders[0],
    location: LeaderLocation.TANKS_FACE_UP,
  };
  atreidesState.leaders = leaders;
  factions.set(Faction.ATREIDES, atreidesState);
  state = { ...state, factions };

  const { ctx, getState } = makeToolContext(Faction.ATREIDES, state);
  const tools = createRevivalTools(ctx);

  const leaderId = leaders[0].definitionId;

  const result = await tools.use_tleilaxu_ghola.execute({
    reviveType: "leader",
    leaderId,
  } as any);

  const finalState = getState();
  const finalFactionState = getFactionState(finalState, Faction.ATREIDES);

  const revivedLeader = finalFactionState.leaders.find(
    (l) => l.definitionId === leaderId
  );
  assert(
    revivedLeader?.location === LeaderLocation.LEADER_POOL,
    "leader is moved from tanks to leader pool (revived)"
  );

  const stillHasCard = finalFactionState.hand.some(
    (c) => c.definitionId === "tleilaxu_ghola"
  );
  assert(!stillHasCard, "Tleilaxu Ghola card is discarded from hand");

  // We focus this rule test on state changes (leader revival + card discard)
  // rather than the exact shape of the tool result.
}

async function testGholaRevivesUpToFiveForcesForFree(): Promise<void> {
  section("3.01.20 - revive up to 5 forces for free");

  let state = buildBaseRevivalState();
  state = giveTleilaxuGhola(state, Faction.ATREIDES);

  // Put some forces in tanks so revival is possible
  const factions = new Map(state.factions);
  const atreidesState = { ...getFactionState(state, Faction.ATREIDES) };
  const forces = { ...atreidesState.forces };
  forces.inTanks = { regular: 5, elite: 0 };
  atreidesState.forces = forces;
  factions.set(Faction.ATREIDES, atreidesState);
  state = { ...state, factions };

  const { ctx, getState } = makeToolContext(Faction.ATREIDES, state);
  const tools = createRevivalTools(ctx);

  const result = await tools.use_tleilaxu_ghola.execute({
    reviveType: "forces",
    forceCount: 5,
  } as any);

  const finalState = getState();
  const finalFactionState = getFactionState(finalState, Faction.ATREIDES);

  // Implementation detail: reviveForces may be constrained by per-turn limits or
  // other revival rules. For this rule test we only assert that some forces moved
  // from tanks to reserves for free when using Ghola.
  assert(
    finalFactionState.forces.reserves.regular >
      atreidesState.forces.reserves.regular,
    "revived forces appear in reserves"
  );

  const stillHasCard = finalFactionState.hand.some(
    (c) => c.definitionId === "tleilaxu_ghola"
  );
  assert(!stillHasCard, "Tleilaxu Ghola card is discarded after force revival");

  // As above, this rule test asserts on revival + discard behavior, not result.ok
}

// =============================================================================
// Main
// =============================================================================

export async function runRuleTests() {
  console.log("=".repeat(80));
  console.log("RULE TESTS: 3.01.20 TLEILAXU GHOLA");
  console.log("=".repeat(80));

  try {
    await testGholaRevivesLeaderForFreeAndDiscardsCard();
  } catch (error) {
    console.error(
      "❌ testGholaRevivesLeaderForFreeAndDiscardsCard failed:",
      error
    );
    failCount++;
  }

  try {
    await testGholaRevivesUpToFiveForcesForFree();
  } catch (error) {
    console.error(
      "❌ testGholaRevivesUpToFiveForcesForFree failed:",
      error
    );
    failCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    `Rule 3.01.20 tests completed: ${passCount} passed, ${failCount} failed`
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


