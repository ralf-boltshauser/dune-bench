/**
 * Test ADAPTIVE FORCE rule (2.02.21)
 * 
 * Rule: "When you Move advisors or fighters into a Territory where you have 
 * the opposite type they flip to match the type already in the Territory."
 */

import { Faction, TerritoryId, type GameState } from './types';
import {
  createGameState,
  getFactionState,
  getBGAdvisorsInTerritory,
  getBGFightersInTerritory,
  convertBGAdvisorsToFighters,
  shipForces,
  moveForces,
} from './state';

function log(message: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(message);
  console.log('='.repeat(60));
}

function logState(state: GameState, territoryId: TerritoryId, sector: number) {
  const advisors = getBGAdvisorsInTerritory(state, territoryId);
  const fighters = getBGFightersInTerritory(state, territoryId);
  console.log(`\n${territoryId} (sector ${sector}):`);
  console.log(`  Advisors: ${advisors}`);
  console.log(`  Fighters: ${fighters}`);
  console.log(`  Total: ${advisors + fighters}`);
}

async function testAdaptiveForce() {
  log('TEST 1: Move advisors to territory with fighters → should flip to fighters');

  let state = createGameState({
    factions: [Faction.BENE_GESSERIT, Faction.ATREIDES],
    advancedRules: true,
  });

  // Ship 5 forces to Arrakeen as advisors (using isAdvisor flag)
  state = shipForces(state, Faction.BENE_GESSERIT, TerritoryId.ARRAKEEN, 9, 5, false, true);
  
  // Convert 3 of them to fighters in Arrakeen
  state = convertBGAdvisorsToFighters(state, TerritoryId.ARRAKEEN, 9, 3);
  logState(state, TerritoryId.ARRAKEEN, 9);
  // Should have: 2 advisors, 3 fighters

  // Ship 5 more advisors to Carthag (using isAdvisor flag)
  state = shipForces(state, Faction.BENE_GESSERIT, TerritoryId.CARTHAG, 10, 5, false, true);
  logState(state, TerritoryId.CARTHAG, 10);
  // Should have: 5 advisors, 0 fighters

  // Move 3 advisors from Carthag to Arrakeen (which has fighters)
  // ADAPTIVE FORCE: Should flip to fighters
  state = moveForces(
    state,
    Faction.BENE_GESSERIT,
    TerritoryId.CARTHAG,
    10,
    TerritoryId.ARRAKEEN,
    9,
    3,
    false
  );

  logState(state, TerritoryId.ARRAKEEN, 9);
  logState(state, TerritoryId.CARTHAG, 10);

  const arrakeenAdvisors = getBGAdvisorsInTerritory(state, TerritoryId.ARRAKEEN);
  const arrakeenFighters = getBGFightersInTerritory(state, TerritoryId.ARRAKEEN);
  const carthagAdvisors = getBGAdvisorsInTerritory(state, TerritoryId.CARTHAG);
  const carthagFighters = getBGFightersInTerritory(state, TerritoryId.CARTHAG);

  // After move: Arrakeen should have 2 advisors + 6 fighters (3 original + 3 moved)
  // Carthag should have 2 advisors (5 - 3)
  console.log(`\nExpected: Arrakeen = 2 advisors, 6 fighters; Carthag = 2 advisors, 0 fighters`);
  console.log(`Actual: Arrakeen = ${arrakeenAdvisors} advisors, ${arrakeenFighters} fighters; Carthag = ${carthagAdvisors} advisors, ${carthagFighters} fighters`);

  if (arrakeenAdvisors === 2 && arrakeenFighters === 6 && carthagAdvisors === 2 && carthagFighters === 0) {
    console.log('✓ PASS: Advisors flipped to fighters correctly');
  } else {
    console.log('✗ FAIL: Advisors did not flip to fighters correctly');
  }

  log('TEST 2: Move fighters to territory with advisors → should flip to advisors');

  // Setup: Convert all Arrakeen forces to fighters, ensure Carthag has advisors
  // Arrakeen currently has 2 advisors, 6 fighters
  // Convert remaining 2 advisors to fighters so Arrakeen has 0 advisors, 8 fighters
  state = convertBGAdvisorsToFighters(state, TerritoryId.ARRAKEEN, 9, 2);
  // Arrakeen now has 0 advisors, 8 fighters
  // Carthag has 2 advisors, 0 fighters
  
  // Move 2 fighters from Arrakeen to Carthag (which has advisors)
  // ADAPTIVE FORCE: Should flip to advisors
  state = moveForces(
    state,
    Faction.BENE_GESSERIT,
    TerritoryId.ARRAKEEN,
    9,
    TerritoryId.CARTHAG,
    10,
    2,
    false
  );

  logState(state, TerritoryId.ARRAKEEN, 9);
  logState(state, TerritoryId.CARTHAG, 10);

  const arrakeenAdvisors2 = getBGAdvisorsInTerritory(state, TerritoryId.ARRAKEEN);
  const arrakeenFighters2 = getBGFightersInTerritory(state, TerritoryId.ARRAKEEN);
  const carthagAdvisors2 = getBGAdvisorsInTerritory(state, TerritoryId.CARTHAG);
  const carthagFighters2 = getBGFightersInTerritory(state, TerritoryId.CARTHAG);

  // After move: Arrakeen should have 0 advisors, 6 fighters (8 - 2)
  // Carthag should have 4 advisors (2 original + 2 moved), 0 fighters
  console.log(`\nExpected: Arrakeen = 0 advisors, 6 fighters; Carthag = 4 advisors, 0 fighters`);
  console.log(`Actual: Arrakeen = ${arrakeenAdvisors2} advisors, ${arrakeenFighters2} fighters; Carthag = ${carthagAdvisors2} advisors, ${carthagFighters2} fighters`);

  if (arrakeenAdvisors2 === 0 && arrakeenFighters2 === 6 && carthagAdvisors2 === 4 && carthagFighters2 === 0) {
    console.log('✓ PASS: Fighters flipped to advisors correctly');
  } else {
    console.log('✗ FAIL: Fighters did not flip to advisors correctly');
  }

  log('TEST 3: Move mixed forces (advisors + fighters) to fighters destination');

  // Setup: Create a source with both advisors and fighters
  // Arrakeen currently has 2 advisors, 4 fighters
  // Move 3 forces (which will be 2 advisors + 1 fighter) to a new territory with fighters
  
  // First, create a destination with fighters
  state = shipForces(state, Faction.BENE_GESSERIT, TerritoryId.BASIN, 9, 3, false, true);
  state = convertBGAdvisorsToFighters(state, TerritoryId.BASIN, 9, 3);
  // Basin now has 0 advisors, 3 fighters

  // Move 3 forces from Arrakeen (2 advisors, 4 fighters) to Basin
  // removeFromStackForFaction removes advisors first, so: 2 advisors + 1 fighter
  state = moveForces(
    state,
    Faction.BENE_GESSERIT,
    TerritoryId.ARRAKEEN,
    9,
    TerritoryId.BASIN,
    9,
    3,
    false
  );

  logState(state, TerritoryId.ARRAKEEN, 9);
  logState(state, TerritoryId.BASIN, 9);

  const basinAdvisors = getBGAdvisorsInTerritory(state, TerritoryId.BASIN);
  const basinFighters = getBGFightersInTerritory(state, TerritoryId.BASIN);

  // After move: Basin should have 0 advisors, 6 fighters (3 original + 3 moved)
  console.log(`\nExpected: Basin = 0 advisors, 6 fighters`);
  console.log(`Actual: Basin = ${basinAdvisors} advisors, ${basinFighters} fighters`);

  if (basinAdvisors === 0 && basinFighters === 6) {
    console.log('✓ PASS: Mixed forces flipped to fighters correctly');
  } else {
    console.log('✗ FAIL: Mixed forces did not flip to fighters correctly');
  }

  log('TEST 4: Move to empty destination (no ADAPTIVE FORCE trigger)');

  // Move forces to empty territory - should NOT trigger ADAPTIVE FORCE
  state = shipForces(state, Faction.BENE_GESSERIT, TerritoryId.RED_CHASM, 6, 3, false, true);
  // Red Chasm has 3 advisors

  state = moveForces(
    state,
    Faction.BENE_GESSERIT,
    TerritoryId.RED_CHASM,
    6,
    TerritoryId.HAGGA_BASIN,
    9,
    2,
    false
  );

  logState(state, TerritoryId.RED_CHASM, 6);
  logState(state, TerritoryId.HAGGA_BASIN, 9);

  const haggabasinAdvisors = getBGAdvisorsInTerritory(state, TerritoryId.HAGGA_BASIN);
  const haggabasinFighters = getBGFightersInTerritory(state, TerritoryId.HAGGA_BASIN);

  // After move: Haggabasin should have 2 advisors (no flip, destination was empty)
  console.log(`\nExpected: Haggabasin = 2 advisors, 0 fighters (no flip, empty destination)`);
  console.log(`Actual: Haggabasin = ${haggabasinAdvisors} advisors, ${haggabasinFighters} fighters`);

  if (haggabasinAdvisors === 2 && haggabasinFighters === 0) {
    console.log('✓ PASS: No flip when destination is empty');
  } else {
    console.log('✗ FAIL: Forces flipped when they should not have');
  }
}

// Run tests
testAdaptiveForce().catch(console.error);

