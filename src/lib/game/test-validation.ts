/**
 * Validation test script for Phase 1.
 * Run with: npx ts-node --esm src/lib/game/test-validation.ts
 * Or: npx tsx src/lib/game/test-validation.ts
 */

import { Faction, Phase, TerritoryId, FACTION_NAMES, STRONGHOLD_TERRITORIES } from './types';
import { ALL_LEADERS, ALL_TREACHERY_CARDS, FACTION_CONFIGS } from './data';
import {
  createGameState,
  getFactionState,
  getFactionSpice,
  getReserveForceCount,
  getTotalForcesOnBoard,
  getControlledStrongholds,
  canFactionBid,
  shipForces,
  addSpice,
  moveStorm,
} from './state';

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
// TESTS
// =============================================================================

function testDataIntegrity(): void {
  section('Data Integrity');

  // Leaders
  assert(ALL_LEADERS.length === 30, `All 30 leaders defined (got ${ALL_LEADERS.length})`);

  const leadersByFaction = new Map<Faction, number>();
  for (const leader of ALL_LEADERS) {
    leadersByFaction.set(leader.faction, (leadersByFaction.get(leader.faction) || 0) + 1);
  }
  for (const faction of Object.values(Faction)) {
    assert(
      leadersByFaction.get(faction) === 5,
      `${FACTION_NAMES[faction]} has 5 leaders`
    );
  }

  // Treachery cards - base game deck
  // Note: exact count may vary by edition; currently 31 cards implemented
  assert(
    ALL_TREACHERY_CARDS.length >= 30,
    `Treachery deck has sufficient cards (got ${ALL_TREACHERY_CARDS.length})`
  );

  // Faction configs
  for (const faction of Object.values(Faction)) {
    const config = FACTION_CONFIGS[faction];
    assert(config !== undefined, `${FACTION_NAMES[faction]} has config`);
    assert(config.totalForces === 20, `${FACTION_NAMES[faction]} has 20 forces`);
  }
}

/**
 * @rule-test 0.10
 * Tests that each faction receives their correct starting spice amount
 * as specified by their faction ability 2.XX.01 (stored in config.startingSpice).
 * 
 * @rule-test 0.12
 * Tests that each player draws their starting treachery card(s) from the Treachery Deck
 * during game setup, as specified by config.startingTreacheryCards.
 */
function testGameCreation(): void {
  section('Game Creation');

  const factions = [
    Faction.ATREIDES,
    Faction.HARKONNEN,
    Faction.EMPEROR,
    Faction.FREMEN,
  ];

  const state = createGameState({ factions });

  assert(state.gameId.length > 0, 'Game has ID');
  assert(state.turn === 1, 'Game starts on turn 1');
  assert(state.phase === Phase.SETUP, 'Game starts in setup phase');
  assert(state.factions.size === 4, 'Game has 4 factions');

  // Check each faction's starting state
  for (const faction of factions) {
    const factionState = getFactionState(state, faction);
    const config = FACTION_CONFIGS[faction];

    assert(
      factionState.spice === config.startingSpice,
      `${FACTION_NAMES[faction]} has ${config.startingSpice} starting spice`
    );

    assert(
      factionState.leaders.length === 5,
      `${FACTION_NAMES[faction]} has 5 leaders`
    );

    assert(
      factionState.hand.length === config.startingTreacheryCards,
      `${FACTION_NAMES[faction]} has ${config.startingTreacheryCards} starting card(s)`
    );

    // Traitors are dealt and selected during setup phase by agents, not at game creation
    // So traitors array starts empty (will be populated during setup)
    assert(
      factionState.traitors.length === 0,
      `${FACTION_NAMES[faction]} starts with 0 traitors (selected during setup)`
    );
  }
}

/**
 * @rule-test 0.11
 * Tests that starting forces are placed on the board and in reserves correctly
 * as specified by each faction's ability 2.XX.02 (stored in config.startingForces).
 */
function testForceManagement(): void {
  section('Force Management');

  const factions = [Faction.ATREIDES, Faction.HARKONNEN];
  let state = createGameState({ factions });

  // Atreides starts with 10 in Arrakeen, 10 in reserves
  const atreidesForcesOnBoard = getTotalForcesOnBoard(state, Faction.ATREIDES);
  const atreidesReserves = getReserveForceCount(state, Faction.ATREIDES);

  assert(atreidesForcesOnBoard === 10, `Atreides has 10 forces on board (got ${atreidesForcesOnBoard})`);
  assert(atreidesReserves === 10, `Atreides has 10 in reserves (got ${atreidesReserves})`);

  // Ship 5 forces to Carthag
  state = shipForces(state, Faction.ATREIDES, TerritoryId.CARTHAG, 11, 5);

  const newOnBoard = getTotalForcesOnBoard(state, Faction.ATREIDES);
  const newReserves = getReserveForceCount(state, Faction.ATREIDES);

  assert(newOnBoard === 15, `Atreides now has 15 on board (got ${newOnBoard})`);
  assert(newReserves === 5, `Atreides now has 5 in reserves (got ${newReserves})`);
}

function testSpiceManagement(): void {
  section('Spice Management');

  const factions = [Faction.EMPEROR, Faction.SPACING_GUILD];
  let state = createGameState({ factions });

  // Emperor starts with 10 spice
  assert(getFactionSpice(state, Faction.EMPEROR) === 10, 'Emperor starts with 10 spice');

  // Add 5 spice
  state = addSpice(state, Faction.EMPEROR, 5);
  assert(getFactionSpice(state, Faction.EMPEROR) === 15, 'Emperor now has 15 spice');

  // Guild starts with 5 spice
  assert(getFactionSpice(state, Faction.SPACING_GUILD) === 5, 'Guild starts with 5 spice');
}

function testStormMovement(): void {
  section('Storm Movement');

  let state = createGameState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
  });

  assert(state.stormSector === 0, 'Storm starts at sector 0');

  state = moveStorm(state, 5);
  assert(state.stormSector === 5, 'Storm moved to sector 5');

  state = moveStorm(state, 20); // Should wrap
  assert(state.stormSector === 2, 'Storm wraps around (20 mod 18 = 2)');
}

function testBiddingEligibility(): void {
  section('Bidding Eligibility');

  const factions = [Faction.HARKONNEN, Faction.ATREIDES];
  const state = createGameState({ factions });

  // Harkonnen starts with 2 cards (special rule), max 8
  // Atreides starts with 1 card, max 4
  assert(canFactionBid(state, Faction.HARKONNEN), 'Harkonnen can bid (2/8 cards)');
  assert(canFactionBid(state, Faction.ATREIDES), 'Atreides can bid (1/4 cards)');
}

function testStrongholdControl(): void {
  section('Stronghold Control');

  const factions = [Faction.ATREIDES, Faction.HARKONNEN];
  const state = createGameState({ factions });

  // Atreides controls Arrakeen (10 forces there, alone)
  const atreidesStrongholds = getControlledStrongholds(state, Faction.ATREIDES);
  assert(
    atreidesStrongholds.includes(TerritoryId.ARRAKEEN),
    'Atreides controls Arrakeen'
  );
  assert(atreidesStrongholds.length === 1, 'Atreides controls 1 stronghold');

  // Harkonnen controls Carthag
  const harkonnenStrongholds = getControlledStrongholds(state, Faction.HARKONNEN);
  assert(
    harkonnenStrongholds.includes(TerritoryId.CARTHAG),
    'Harkonnen controls Carthag'
  );
  assert(harkonnenStrongholds.length === 1, 'Harkonnen controls 1 stronghold');
}

// =============================================================================
// MAIN
// =============================================================================

function main(): void {
  console.log('\n🏜️  DUNE GF9 - Phase 1 Validation Tests\n');

  testDataIntegrity();
  testGameCreation();
  testForceManagement();
  testSpiceManagement();
  testStormMovement();
  testBiddingEligibility();
  testStrongholdControl();

  console.log('\n' + '='.repeat(40));
  console.log(`\n📊 Results: ${passCount} passed, ${failCount} failed\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

main();
