/**
 * Test Fremen BATTLE HARDENED ability - forces don't need spice for full strength
 *
 * Rule: "BATTLE HARDENED: Your Forces do not require spice to count at full strength in battles."
 * (battle.md line 138)
 */

import { calculateSpicedForceStrength } from './rules/combat';
import { Faction } from './types';

console.log('='.repeat(80));
console.log('TESTING FREMEN BATTLE HARDENED ABILITY');
console.log('='.repeat(80));

// Test Case 1: Fremen with 10 forces, NO spice (advanced rules enabled)
console.log('\n--- Test 1: Fremen with 10 forces, 0 spice (advanced rules) ---');
const fremenStrength = calculateSpicedForceStrength(
  Faction.FREMEN,
  10, // base strength (10 regular forces)
  10, // forces dialed
  0,  // NO spice paid
  true // advanced rules enabled
);
console.log(`Expected: 10 (full strength without spice)`);
console.log(`Result: ${fremenStrength}`);
console.log(`Status: ${fremenStrength === 10 ? '✓ PASS' : '✗ FAIL'}`);

// Test Case 2: Atreides with 10 forces, NO spice (should be half strength)
console.log('\n--- Test 2: Atreides with 10 forces, 0 spice (advanced rules) ---');
const atreidesStrength = calculateSpicedForceStrength(
  Faction.ATREIDES,
  10, // base strength
  10, // forces dialed
  0,  // NO spice paid
  true // advanced rules enabled
);
console.log(`Expected: 5 (half strength without spice)`);
console.log(`Result: ${atreidesStrength}`);
console.log(`Status: ${atreidesStrength === 5 ? '✓ PASS' : '✗ FAIL'}`);

// Test Case 3: Atreides with 10 forces, 10 spice (full strength)
console.log('\n--- Test 3: Atreides with 10 forces, 10 spice (advanced rules) ---');
const atreidesFullSpiced = calculateSpicedForceStrength(
  Faction.ATREIDES,
  10, // base strength
  10, // forces dialed
  10, // Full spice paid
  true // advanced rules enabled
);
console.log(`Expected: 10 (full strength with spice)`);
console.log(`Result: ${atreidesFullSpiced}`);
console.log(`Status: ${atreidesFullSpiced === 10 ? '✓ PASS' : '✗ FAIL'}`);

// Test Case 4: Harkonnen with 10 forces, 5 spice (mixed)
console.log('\n--- Test 4: Harkonnen with 10 forces, 5 spice (advanced rules) ---');
const harkonnenMixed = calculateSpicedForceStrength(
  Faction.HARKONNEN,
  10, // base strength
  10, // forces dialed
  5,  // Half spice paid
  true // advanced rules enabled
);
console.log(`Expected: 7.5 (5 spiced at 1x + 5 unspiced at 0.5x = 5 + 2.5)`);
console.log(`Result: ${harkonnenMixed}`);
console.log(`Status: ${harkonnenMixed === 7.5 ? '✓ PASS' : '✗ FAIL'}`);

// Test Case 5: Basic rules - spice dialing disabled
console.log('\n--- Test 5: Atreides with 10 forces, 0 spice (basic rules) ---');
const basicRules = calculateSpicedForceStrength(
  Faction.ATREIDES,
  10, // base strength
  10, // forces dialed
  0,  // NO spice paid
  false // basic rules (no spice dialing)
);
console.log(`Expected: 10 (full strength - spice dialing not in effect)`);
console.log(`Result: ${basicRules}`);
console.log(`Status: ${basicRules === 10 ? '✓ PASS' : '✗ FAIL'}`);

// Test Case 6: Fremen with elite forces (Fedaykin)
console.log('\n--- Test 6: Fremen with 20 elite force strength, 0 spice (advanced rules) ---');
const fremenElite = calculateSpicedForceStrength(
  Faction.FREMEN,
  20, // base strength (10 Fedaykin worth 2x = 20)
  10, // forces dialed
  0,  // NO spice paid
  true // advanced rules enabled
);
console.log(`Expected: 20 (full elite strength without spice)`);
console.log(`Result: ${fremenElite}`);
console.log(`Status: ${fremenElite === 20 ? '✓ PASS' : '✗ FAIL'}`);

// Test Case 7: Emperor with 20 elite force strength (Sardaukar), NO spice
console.log('\n--- Test 7: Emperor with 20 elite force strength, 0 spice (advanced rules) ---');
const emperorElite = calculateSpicedForceStrength(
  Faction.EMPEROR,
  20, // base strength (10 Sardaukar worth 2x = 20)
  10, // forces dialed
  0,  // NO spice paid
  true // advanced rules enabled
);
console.log(`Expected: 10 (half strength without spice)`);
console.log(`Result: ${emperorElite}`);
console.log(`Status: ${emperorElite === 10 ? '✓ PASS' : '✗ FAIL'}`);

console.log('\n' + '='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log('Key finding: Fremen always get full strength without spice payment');
console.log('Other factions need spice or suffer 50% penalty in advanced rules');
console.log('='.repeat(80));
