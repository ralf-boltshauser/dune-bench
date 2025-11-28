/**
 * Test spice dialing system (advanced rules)
 *
 * Tests:
 * 1. Spice dialing validation (cannot dial more spice than forces)
 * 2. Spice dialing strength calculation (unspiced = 0.5x, spiced = 1.0x)
 * 3. Fremen BATTLE HARDENED (no spice needed for full strength)
 * 4. Spice payment to bank (both sides pay normally)
 * 5. Traitor revealed: winner keeps spice, loser pays
 */

import { Faction, Phase, TerritoryId } from './types';
import { createGameState } from './state/factory';
import {
  shipForces,
  addSpice,
  removeSpice,
  getFactionState,
} from './state';
import { validateBattlePlan, calculateSpicedForceStrength } from './rules';

console.log('\n========================================');
console.log('SPICE DIALING SYSTEM TEST');
console.log('========================================\n');

// Test 1: Validation - Cannot dial more spice than forces
console.log('TEST 1: Spice Dialing Validation');
console.log('--------------------------------');

let state = createGameState({
  factions: [Faction.ATREIDES, Faction.HARKONNEN],
  advancedRules: true,
});

// Set up battle scenario: Atreides vs Harkonnen in Arrakeen
// Ship forces to create the battle scenario
state = shipForces(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 5, false);
state = shipForces(state, Faction.HARKONNEN, TerritoryId.ARRAKEEN, 0, 5, false);
state = addSpice(state, Faction.ATREIDES, 10);
state = addSpice(state, Faction.HARKONNEN, 10);

// Get an available leader for valid plans
const atreidesState = getFactionState(state, Faction.ATREIDES);
const atreidesLeader = atreidesState.leaders[0]?.definitionId || null;

const invalidPlan = {
  factionId: Faction.ATREIDES,
  forcesDialed: 3,
  spiceDialed: 5, // MORE than forces dialed!
  leaderId: atreidesLeader,
  cheapHeroUsed: false,
  weaponCardId: null,
  defenseCardId: null,
  kwisatzHaderachUsed: false,
  announcedNoLeader: false,
};

const validationResult = validateBattlePlan(
  state,
  Faction.ATREIDES,
  TerritoryId.ARRAKEEN,
  invalidPlan
);

if (!validationResult.valid) {
  console.log('✓ Validation correctly rejected invalid plan:');
  console.log(`  Error: ${validationResult.errors[0]?.message}`);
} else {
  console.log('✗ Validation should have rejected plan with spiceDialed > forcesDialed');
}

const validPlan = {
  factionId: Faction.ATREIDES,
  forcesDialed: 5,
  spiceDialed: 3, // Valid: spice <= forces
  leaderId: atreidesLeader,
  cheapHeroUsed: false,
  weaponCardId: null,
  defenseCardId: null,
  kwisatzHaderachUsed: false,
  announcedNoLeader: false,
};

const validResult = validateBattlePlan(
  state,
  Faction.ATREIDES,
  TerritoryId.ARRAKEEN,
  validPlan
);

if (validResult.valid) {
  console.log('✓ Validation correctly accepted valid plan (spiceDialed <= forcesDialed)');
} else {
  console.log('✗ Validation should have accepted valid plan');
  console.log(`  Error: ${validResult.errors[0]?.message}`);
}

// Test 2: Force strength calculation with spice dialing
console.log('\nTEST 2: Force Strength Calculation');
console.log('------------------------------------');

// Test case: 5 forces, 3 spiced
// Expected: 3 spiced (1.0x each) + 2 unspiced (0.5x each) = 3 + 1 = 4
const baseStrength = 5; // 5 regular forces
const forcesDialed = 5;
const spiceDialed = 3;

const effectiveStrength = calculateSpicedForceStrength(
  Faction.ATREIDES,
  baseStrength,
  forcesDialed,
  spiceDialed,
  true // advancedRules
);

console.log(`Forces: ${forcesDialed}, Spice: ${spiceDialed}`);
console.log(`Expected: 3 (spiced) + 1 (0.5 × 2 unspiced) = 4.0`);
console.log(`Actual: ${effectiveStrength}`);

if (effectiveStrength === 4.0) {
  console.log('✓ Spice dialing calculation correct');
} else {
  console.log(`✗ Expected 4.0, got ${effectiveStrength}`);
}

// Test 3: Fremen BATTLE HARDENED - no spice needed
console.log('\nTEST 3: Fremen BATTLE HARDENED');
console.log('--------------------------------');

const fremenStrength = calculateSpicedForceStrength(
  Faction.FREMEN,
  baseStrength,
  forcesDialed,
  0, // NO spice dialed
  true // advancedRules
);

console.log(`Fremen forces: ${forcesDialed}, Spice: 0`);
console.log(`Expected: 5.0 (full strength, no spice needed)`);
console.log(`Actual: ${fremenStrength}`);

if (fremenStrength === 5.0) {
  console.log('✓ Fremen BATTLE HARDENED works correctly');
} else {
  console.log(`✗ Expected 5.0, got ${fremenStrength}`);
}

// Test 4: Non-Fremen with no spice (should be half strength)
console.log('\nTEST 4: Unspiced Forces (Non-Fremen)');
console.log('--------------------------------------');

const unspicedStrength = calculateSpicedForceStrength(
  Faction.HARKONNEN,
  baseStrength,
  forcesDialed,
  0, // NO spice dialed
  true // advancedRules
);

console.log(`Harkonnen forces: ${forcesDialed}, Spice: 0`);
console.log(`Expected: 2.5 (0.5 × 5 unspiced forces)`);
console.log(`Actual: ${unspicedStrength}`);

if (unspicedStrength === 2.5) {
  console.log('✓ Unspiced forces calculate correctly at half strength');
} else {
  console.log(`✗ Expected 2.5, got ${unspicedStrength}`);
}

// Test 5: Basic rules - spice dialing should not apply
console.log('\nTEST 5: Basic Rules (No Spice Dialing)');
console.log('----------------------------------------');

const basicStrength = calculateSpicedForceStrength(
  Faction.ATREIDES,
  baseStrength,
  forcesDialed,
  3, // Spice dialed, but should be ignored
  false // Basic rules
);

console.log(`Forces: ${forcesDialed}, Spice: 3 (ignored in basic rules)`);
console.log(`Expected: 5.0 (full base strength)`);
console.log(`Actual: ${basicStrength}`);

if (basicStrength === 5.0) {
  console.log('✓ Spice dialing correctly disabled in basic rules');
} else {
  console.log(`✗ Expected 5.0, got ${basicStrength}`);
}

// Test 6: Elite forces with spice dialing
console.log('\nTEST 6: Elite Forces with Spice Dialing');
console.log('-----------------------------------------');

// Elite forces worth 2x in combat, but spice dialing applies proportionally
// 5 forces (all elite) = base strength 10
// With 3 spice: (10 × 3/5) + (10 × 2/5 × 0.5) = 6 + 2 = 8
const eliteBaseStrength = 10; // 5 elite forces = 10 strength
const eliteSpicedStrength = calculateSpicedForceStrength(
  Faction.EMPEROR,
  eliteBaseStrength,
  5,
  3,
  true
);

console.log(`Elite forces: 5, Base strength: 10, Spice: 3`);
console.log(`Expected: (10 × 0.6) + (10 × 0.4 × 0.5) = 6 + 2 = 8.0`);
console.log(`Actual: ${eliteSpicedStrength}`);

if (eliteSpicedStrength === 8.0) {
  console.log('✓ Elite forces with spice dialing calculate correctly');
} else {
  console.log(`✗ Expected 8.0, got ${eliteSpicedStrength}`);
}

console.log('\n========================================');
console.log('SPICE DIALING TESTS COMPLETE');
console.log('========================================\n');

console.log('\nNOTE: Battle handler integration tests (spice payment, traitor rule)');
console.log('      require full battle simulation and are tested separately.');
