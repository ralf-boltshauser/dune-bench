/**
 * Test Fremen ally revival boost implementation.
 * Tests that Fremen can grant their ally 3 free revivals at their discretion.
 */

import { Faction, TerritoryId } from './types';
import { createGameState, getFactionState, sendForcesToTanks } from './state';
import { getRevivalLimits } from './rules';
import { getFactionConfig } from './data';

// Create test game state
let state = createGameState({
  factions: [Faction.FREMEN, Faction.ATREIDES],
  maxTurns: 10,
  advancedRules: false,
  variants: {
    shieldWallStronghold: false,
    leaderSkillCards: false,
    homeworlds: false,
  },
});

console.log('='.repeat(80));
console.log('FREMEN ALLY REVIVAL BOOST TEST');
console.log('='.repeat(80));

// Form alliance between Fremen and Atreides
const fremenState = getFactionState(state, Faction.FREMEN);
const atreidesState = getFactionState(state, Faction.ATREIDES);

const newFactions = new Map(state.factions);
newFactions.set(Faction.FREMEN, { ...fremenState, allyId: Faction.ATREIDES });
newFactions.set(Faction.ATREIDES, { ...atreidesState, allyId: Faction.FREMEN });
state = { ...state, factions: newFactions };

console.log('\nTest Setup:');
console.log('  - Fremen and Atreides are allied');
console.log('  - Atreides normally gets', getFactionConfig(Faction.ATREIDES).freeRevival, 'free revivals');

// Send some Atreides forces to tanks
state = sendForcesToTanks(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, 0, 5);
console.log('  - Sent 5 Atreides forces to tanks');

// Test 1: Check initial revival limits (without boost)
console.log('\n' + '-'.repeat(80));
console.log('TEST 1: Revival limits without Fremen boost');
console.log('-'.repeat(80));

let atreidesLimits = getRevivalLimits(state, Faction.ATREIDES);
console.log('\nAtreides Revival Limits (before boost):');
console.log(`  - Free forces: ${atreidesLimits.freeForces}`);
console.log(`  - Forces in tanks: ${atreidesLimits.forcesInTanks}`);
console.log(`  - Fremen boost available: ${atreidesLimits.fremenBoostAvailable}`);
console.log(`  - Fremen boost granted: ${atreidesLimits.fremenBoostGranted}`);

if (atreidesLimits.freeForces !== 2) {
  console.error('ERROR: Expected 2 free revivals, got', atreidesLimits.freeForces);
  process.exit(1);
}
if (!atreidesLimits.fremenBoostAvailable) {
  console.error('ERROR: Fremen boost should be available (Fremen is ally)');
  process.exit(1);
}
if (atreidesLimits.fremenBoostGranted) {
  console.error('ERROR: Fremen boost should not be granted yet');
  process.exit(1);
}

console.log('✓ Test 1 passed: Atreides has 2 free revivals without boost');

// Test 2: Grant Fremen boost
console.log('\n' + '-'.repeat(80));
console.log('TEST 2: Grant Fremen boost to ally');
console.log('-'.repeat(80));

const updatedAtreidesState = getFactionState(state, Faction.ATREIDES);
const newFactions2 = new Map(state.factions);
newFactions2.set(Faction.ATREIDES, {
  ...updatedAtreidesState,
  fremenRevivalBoostGranted: true,
});
state = { ...state, factions: newFactions2 };

atreidesLimits = getRevivalLimits(state, Faction.ATREIDES);
console.log('\nAtreides Revival Limits (after Fremen grants boost):');
console.log(`  - Free forces: ${atreidesLimits.freeForces}`);
console.log(`  - Forces in tanks: ${atreidesLimits.forcesInTanks}`);
console.log(`  - Fremen boost available: ${atreidesLimits.fremenBoostAvailable}`);
console.log(`  - Fremen boost granted: ${atreidesLimits.fremenBoostGranted}`);

if (atreidesLimits.freeForces !== 3) {
  console.error('ERROR: Expected 3 free revivals with boost, got', atreidesLimits.freeForces);
  process.exit(1);
}
if (!atreidesLimits.fremenBoostGranted) {
  console.error('ERROR: Fremen boost should be marked as granted');
  process.exit(1);
}

console.log('✓ Test 2 passed: Atreides has 3 free revivals with Fremen boost');

// Test 3: Verify Fremen themselves are not affected
console.log('\n' + '-'.repeat(80));
console.log('TEST 3: Verify Fremen revival limits are unaffected');
console.log('-'.repeat(80));

state = sendForcesToTanks(state, Faction.FREMEN, TerritoryId.HABBANYA_ERG, 0, 5);
const fremenLimits = getRevivalLimits(state, Faction.FREMEN);
console.log('\nFremen Revival Limits:');
console.log(`  - Free forces: ${fremenLimits.freeForces}`);
console.log(`  - Forces in tanks: ${fremenLimits.forcesInTanks}`);
console.log(`  - Fremen boost available: ${fremenLimits.fremenBoostAvailable}`);

if (fremenLimits.freeForces !== 3) {
  console.error('ERROR: Fremen should have their own 3 free revivals');
  process.exit(1);
}
if (fremenLimits.fremenBoostAvailable) {
  console.error('ERROR: Fremen cannot be their own ally');
  process.exit(1);
}

console.log('✓ Test 3 passed: Fremen has their normal 3 free revivals');

// Test 4: Test without alliance
console.log('\n' + '-'.repeat(80));
console.log('TEST 4: Test without Fremen alliance');
console.log('-'.repeat(80));

const newFactions3 = new Map(state.factions);
newFactions3.set(Faction.FREMEN, { ...getFactionState(state, Faction.FREMEN), allyId: null });
newFactions3.set(Faction.ATREIDES, {
  ...getFactionState(state, Faction.ATREIDES),
  allyId: null,
  fremenRevivalBoostGranted: false,
});
state = { ...state, factions: newFactions3 };

atreidesLimits = getRevivalLimits(state, Faction.ATREIDES);
console.log('\nAtreides Revival Limits (no alliance):');
console.log(`  - Free forces: ${atreidesLimits.freeForces}`);
console.log(`  - Fremen boost available: ${atreidesLimits.fremenBoostAvailable}`);
console.log(`  - Fremen boost granted: ${atreidesLimits.fremenBoostGranted}`);

if (atreidesLimits.freeForces !== 2) {
  console.error('ERROR: Without alliance, Atreides should have 2 free revivals');
  process.exit(1);
}
if (atreidesLimits.fremenBoostAvailable) {
  console.error('ERROR: Fremen boost should not be available without alliance');
  process.exit(1);
}

console.log('✓ Test 4 passed: No boost without Fremen alliance');

console.log('\n' + '='.repeat(80));
console.log('ALL TESTS PASSED!');
console.log('='.repeat(80));
console.log('\nSummary:');
console.log('  ✓ Atreides normally gets 2 free revivals');
console.log('  ✓ When Fremen grants boost, Atreides gets 3 free revivals');
console.log('  ✓ Fremen keeps their own 3 free revivals');
console.log('  ✓ Boost only works when allied with Fremen');
console.log('  ✓ Boost is discretionary (controlled by fremenRevivalBoostGranted flag)');
