/**
 * Test script for Bene Gesserit Advisor/Fighter tracking
 */

import { Faction, TerritoryId, type GameState } from './types';
import { createGameState } from './state/factory';
import {
  getBGAdvisorsInTerritory,
  getBGFightersInTerritory,
  getFactionsInTerritory,
  getFactionState,
  convertBGAdvisorsToFighters,
  convertBGFightersToAdvisors,
  shipForces,
} from './state';

function log(message: string) {
  console.log(`\n${message}`);
  console.log('='.repeat(message.length));
}

function logState(state: GameState, territoryId: TerritoryId) {
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  const stack = bgState.forces.onBoard.find(s => s.territoryId === territoryId);

  if (stack) {
    const total = stack.forces.regular + stack.forces.elite;
    const advisors = stack.advisors ?? 0;
    const fighters = total - advisors;

    console.log(`Territory: ${territoryId}`);
    console.log(`  Total forces: ${total}`);
    console.log(`  Advisors: ${advisors}`);
    console.log(`  Fighters: ${fighters}`);
  } else {
    console.log(`No BG forces in ${territoryId}`);
  }
}

async function testBGAdvisors() {
  log('TEST 1: Initial BG forces should be all advisors');

  let state = createGameState({
    factions: [Faction.ATREIDES, Faction.BENE_GESSERIT, Faction.HARKONNEN],
  });

  // Check initial BG forces
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  console.log(`\nBG starting forces: ${JSON.stringify(bgState.forces.onBoard, null, 2)}`);

  // If BG has starting positions on board
  if (bgState.forces.onBoard.length > 0) {
    const stack = bgState.forces.onBoard[0];
    const total = stack.forces.regular + stack.forces.elite;
    const advisors = stack.advisors ?? 0;

    console.log(`\nInitial stack has ${total} total forces, ${advisors} are advisors`);

    if (advisors === total) {
      console.log('✓ PASS: All forces start as advisors');
    } else {
      console.log('✗ FAIL: Not all forces are advisors');
    }
  }

  log('TEST 2: Ship BG forces - normal shipment should be fighters (Rule 2.02.14)');

  // Normal shipment: should ship as fighters (not advisors)
  state = shipForces(state, Faction.BENE_GESSERIT, TerritoryId.ARRAKEEN, 9, 10);
  logState(state, TerritoryId.ARRAKEEN);

  const advisors = getBGAdvisorsInTerritory(state, TerritoryId.ARRAKEEN);
  const fighters = getBGFightersInTerritory(state, TerritoryId.ARRAKEEN);

  if (fighters === 10 && advisors === 0) {
    console.log('✓ PASS: Normal shipment ships forces as fighters (Rule 2.02.14)');
  } else {
    console.log(`✗ FAIL: Expected 10 fighters, 0 advisors. Got ${fighters} fighters, ${advisors} advisors`);
  }

  log('TEST 2b: Ship BG advisor via Spiritual Advisor ability');

  // Spiritual Advisor ability: should ship as advisor
  state = shipForces(state, Faction.BENE_GESSERIT, TerritoryId.CARTHAG, 9, 1, false, true);
  logState(state, TerritoryId.CARTHAG);

  const advisorsInCarthag = getBGAdvisorsInTerritory(state, TerritoryId.CARTHAG);
  const fightersInCarthag = getBGFightersInTerritory(state, TerritoryId.CARTHAG);

  if (advisorsInCarthag === 1 && fightersInCarthag === 0) {
    console.log('✓ PASS: Spiritual Advisor ability ships as advisor');
  } else {
    console.log(`✗ FAIL: Expected 1 advisor, 0 fighters. Got ${advisorsInCarthag} advisors, ${fightersInCarthag} fighters`);
  }

  log('TEST 3: Convert advisors to fighters');

  state = convertBGAdvisorsToFighters(state, TerritoryId.ARRAKEEN, 9, 5);
  logState(state, TerritoryId.ARRAKEEN);

  const advisorsAfter = getBGAdvisorsInTerritory(state, TerritoryId.ARRAKEEN);
  const fightersAfter = getBGFightersInTerritory(state, TerritoryId.ARRAKEEN);

  if (advisorsAfter === 5 && fightersAfter === 5) {
    console.log('✓ PASS: 5 advisors converted to fighters');
  } else {
    console.log(`✗ FAIL: Expected 5 advisors, 5 fighters. Got ${advisorsAfter} advisors, ${fightersAfter} fighters`);
  }

  log('TEST 4: BG with only advisors should not appear in battle');

  // Add Atreides to same location
  state = shipForces(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, 5);

  // Convert all BG to advisors
  state = convertBGFightersToAdvisors(state, TerritoryId.ARRAKEEN, 9, 5);
  logState(state, TerritoryId.ARRAKEEN);

  const factionsInBattle = getFactionsInTerritory(state, TerritoryId.ARRAKEEN);

  console.log(`\nFactions in territory: ${factionsInBattle.join(', ')}`);

  if (factionsInBattle.length === 1 && !factionsInBattle.includes(Faction.BENE_GESSERIT)) {
    console.log('✓ PASS: BG with only advisors excluded from battle');
  } else {
    console.log('✗ FAIL: BG with only advisors should not trigger battle');
  }

  log('TEST 5: BG with fighters should appear in battle');

  // Convert some advisors back to fighters
  state = convertBGAdvisorsToFighters(state, TerritoryId.ARRAKEEN, 9, 3);
  logState(state, TerritoryId.ARRAKEEN);

  const factionsWithFighters = getFactionsInTerritory(state, TerritoryId.ARRAKEEN);

  console.log(`\nFactions in territory: ${factionsWithFighters.join(', ')}`);

  if (factionsWithFighters.length === 2 && factionsWithFighters.includes(Faction.BENE_GESSERIT)) {
    console.log('✓ PASS: BG with fighters appears in battle');
  } else {
    console.log('✗ FAIL: BG with fighters should trigger battle');
  }

  log('TESTS COMPLETE');
}

// Run tests
testBGAdvisors().catch(console.error);
