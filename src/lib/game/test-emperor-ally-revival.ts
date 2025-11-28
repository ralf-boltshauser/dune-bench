/**
 * Test Emperor Ally Revival Feature
 *
 * Tests the Emperor's ability to pay for up to 3 extra ally revivals per turn.
 */

import { Faction, Phase, LeaderLocation } from './types';
import { createGameState } from './state/factory';
import { getRevivalLimits } from './rules/revival';
import {
  getFactionState,
  addSpice,
  sendForcesToTanks,
  reviveForces,
  removeSpice
} from './state';

console.log('\n' + '='.repeat(80));
console.log('EMPEROR ALLY REVIVAL FEATURE TEST');
console.log('='.repeat(80));

// Create a test game with Emperor and Harkonnen
let state = createGameState({
  maxTurns: 10,
  factions: [Faction.EMPEROR, Faction.HARKONNEN],
  advancedRules: false,
  variants: {
    shieldWallStronghold: false,
    leaderSkillCards: false,
    homeworlds: false,
  },
});

// Set up alliance between Emperor and Harkonnen
const emperorState = getFactionState(state, Faction.EMPEROR);
const harkonnenState = getFactionState(state, Faction.HARKONNEN);

state.factions.set(Faction.EMPEROR, { ...emperorState, allyId: Faction.HARKONNEN });
state.factions.set(Faction.HARKONNEN, { ...harkonnenState, allyId: Faction.EMPEROR });

console.log('\n✓ Allied Emperor with Harkonnen');

// Give Emperor some spice
state = addSpice(state, Faction.EMPEROR, 20);
console.log('✓ Gave Emperor 20 spice');

// Put some Harkonnen forces in tanks
state = sendForcesToTanks(state, Faction.HARKONNEN, 10);
console.log('✓ Put 10 Harkonnen forces in tanks');

// Test 1: Check revival limits for Harkonnen (should show Emperor bonus available)
console.log('\n' + '='.repeat(80));
console.log('TEST 1: Check Revival Limits for Harkonnen (Emperor\'s Ally)');
console.log('='.repeat(80));

const harkonnenLimits = getRevivalLimits(state, Faction.HARKONNEN);
console.log('\nHarkonnen Revival Limits:');
console.log(`  - Free forces: ${harkonnenLimits.freeForces}`);
console.log(`  - Max forces: ${harkonnenLimits.maxForces}`);
console.log(`  - Forces in tanks: ${harkonnenLimits.forcesInTanks}`);
console.log(`  - Emperor bonus available: ${harkonnenLimits.emperorBonusAvailable}`);
console.log(`  - Emperor bonus used: ${harkonnenLimits.emperorBonusUsed}`);

if (harkonnenLimits.emperorBonusAvailable === 3) {
  console.log('\n✓ PASS: Emperor bonus shows 3 available revivals');
} else {
  console.log(`\n✗ FAIL: Expected 3 bonus revivals, got ${harkonnenLimits.emperorBonusAvailable}`);
}

// Test 2: Simulate Emperor paying for 2 ally revivals
console.log('\n' + '='.repeat(80));
console.log('TEST 2: Emperor Pays for 2 Ally Revivals');
console.log('='.repeat(80));

const emperorSpiceBefore = getFactionState(state, Faction.EMPEROR).spice;
const harkonnenForcesBefore = getFactionState(state, Faction.HARKONNEN).forces.reserves.regular;

console.log(`\nBefore:`);
console.log(`  - Emperor spice: ${emperorSpiceBefore}`);
console.log(`  - Harkonnen reserves: ${harkonnenForcesBefore}`);

// Revive 2 forces for Harkonnen
state = reviveForces(state, Faction.HARKONNEN, 2);
state = removeSpice(state, Faction.EMPEROR, 4); // 2 forces * 2 spice

// Track Emperor bonus usage
const updatedHarkonnenState = getFactionState(state, Faction.HARKONNEN);
state.factions.set(Faction.HARKONNEN, {
  ...updatedHarkonnenState,
  emperorAllyRevivalsUsed: 2
});

const emperorSpiceAfter = getFactionState(state, Faction.EMPEROR).spice;
const harkonnenForcesAfter = getFactionState(state, Faction.HARKONNEN).forces.reserves.regular;

console.log(`\nAfter:`);
console.log(`  - Emperor spice: ${emperorSpiceAfter}`);
console.log(`  - Harkonnen reserves: ${harkonnenForcesAfter}`);

if (emperorSpiceAfter === emperorSpiceBefore - 4 && harkonnenForcesAfter === harkonnenForcesBefore + 2) {
  console.log('\n✓ PASS: Emperor paid 4 spice and Harkonnen got 2 forces');
} else {
  console.log('\n✗ FAIL: Spice or forces mismatch');
}

// Test 3: Check limits after using 2 bonus revivals
console.log('\n' + '='.repeat(80));
console.log('TEST 3: Check Limits After Using 2 Bonus Revivals');
console.log('='.repeat(80));

const harkonnenLimitsAfter = getRevivalLimits(state, Faction.HARKONNEN);
console.log(`\nHarkonnen Revival Limits After:`);
console.log(`  - Emperor bonus available: ${harkonnenLimitsAfter.emperorBonusAvailable}`);
console.log(`  - Emperor bonus used: ${harkonnenLimitsAfter.emperorBonusUsed}`);

if (harkonnenLimitsAfter.emperorBonusAvailable === 1 && harkonnenLimitsAfter.emperorBonusUsed === 2) {
  console.log('\n✓ PASS: Bonus shows 1 remaining (2 used)');
} else {
  console.log(`\n✗ FAIL: Expected 1 available/2 used, got ${harkonnenLimitsAfter.emperorBonusAvailable}/${harkonnenLimitsAfter.emperorBonusUsed}`);
}

// Test 4: Check that non-allied faction doesn't get Emperor bonus
console.log('\n' + '='.repeat(80));
console.log('TEST 4: Non-Allied Faction Has No Emperor Bonus');
console.log('='.repeat(80));

// Check Emperor's own limits (shouldn't get bonus for self)
const emperorLimits = getRevivalLimits(state, Faction.EMPEROR);
console.log(`\nEmperor Revival Limits:`);
console.log(`  - Emperor bonus available: ${emperorLimits.emperorBonusAvailable}`);

if (emperorLimits.emperorBonusAvailable === 0) {
  console.log('\n✓ PASS: Emperor does not get bonus for self');
} else {
  console.log(`\n✗ FAIL: Emperor should not get bonus for self`);
}

// Test 5: Reset tracking at start of new turn (simulated)
console.log('\n' + '='.repeat(80));
console.log('TEST 5: Bonus Tracking Resets Each Turn');
console.log('='.repeat(80));

// Reset the tracking
const harkonnenStateReset = getFactionState(state, Faction.HARKONNEN);
state.factions.set(Faction.HARKONNEN, {
  ...harkonnenStateReset,
  emperorAllyRevivalsUsed: 0
});

const harkonnenLimitsReset = getRevivalLimits(state, Faction.HARKONNEN);
console.log(`\nHarkonnen Revival Limits After Reset:`);
console.log(`  - Emperor bonus available: ${harkonnenLimitsReset.emperorBonusAvailable}`);
console.log(`  - Emperor bonus used: ${harkonnenLimitsReset.emperorBonusUsed}`);

if (harkonnenLimitsReset.emperorBonusAvailable === 3 && harkonnenLimitsReset.emperorBonusUsed === 0) {
  console.log('\n✓ PASS: Bonus tracking reset successfully');
} else {
  console.log(`\n✗ FAIL: Reset failed`);
}

console.log('\n' + '='.repeat(80));
console.log('EMPEROR ALLY REVIVAL FEATURE TEST COMPLETE');
console.log('='.repeat(80) + '\n');
