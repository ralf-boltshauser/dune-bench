/**
 * Test Elite Forces Loss Distribution
 *
 * Verifies that elite forces (Sardaukar/Fedaykin) count as 2x when taking losses,
 * except for the special case of Sardaukar vs Fremen (where they count as 1x).
 */

import { Faction } from './types';
import { calculateLossDistribution } from './state';

console.log('Testing Elite Forces Loss Distribution\n');
console.log('=' .repeat(60));

// Test 1: Regular forces only
console.log('\nTest 1: Regular forces only (5 regular, 0 elite, 3 losses)');
const test1 = calculateLossDistribution(
  { regular: 5, elite: 0 },
  3,
  Faction.ATREIDES,
  Faction.HARKONNEN
);
console.log(`  Result: ${test1.regularLost} regular, ${test1.eliteLost} elite`);
console.log(`  Expected: 3 regular, 0 elite`);
console.log(`  ${test1.regularLost === 3 && test1.eliteLost === 0 ? '✓ PASS' : '✗ FAIL'}`);

// Test 2: Elite forces only, each worth 2x
console.log('\nTest 2: Elite forces only (0 regular, 3 elite, 4 losses)');
const test2 = calculateLossDistribution(
  { regular: 0, elite: 3 },
  4,
  Faction.EMPEROR,
  Faction.ATREIDES
);
console.log(`  Result: ${test2.regularLost} regular, ${test2.eliteLost} elite`);
console.log(`  Expected: 0 regular, 2 elite (4 losses / 2 per elite = 2 elite lost)`);
console.log(`  ${test2.regularLost === 0 && test2.eliteLost === 2 ? '✓ PASS' : '✗ FAIL'}`);

// Test 3: Mixed forces, regular used first
console.log('\nTest 3: Mixed forces (5 regular, 3 elite, 8 losses)');
const test3 = calculateLossDistribution(
  { regular: 5, elite: 3 },
  8,
  Faction.EMPEROR,
  Faction.ATREIDES
);
console.log(`  Result: ${test3.regularLost} regular, ${test3.eliteLost} elite`);
console.log(`  Expected: 5 regular, 2 elite (lose all 5 regular = 5 losses, then 2 elite = 4 more = 9 total absorbed)`);
console.log(`  ${test3.regularLost === 5 && test3.eliteLost === 2 ? '✓ PASS' : '✗ FAIL'}`);

// Test 4: Sardaukar vs Fremen special case (elite worth 1x, not 2x)
console.log('\nTest 4: Sardaukar vs Fremen (3 regular, 2 elite, 5 losses)');
console.log(`  Faction EMPEROR: "${Faction.EMPEROR}", toString: "${Faction.EMPEROR.toString()}"`);
console.log(`  Faction FREMEN: "${Faction.FREMEN}", toString: "${Faction.FREMEN.toString()}"`);
console.log(`  Match: ${Faction.EMPEROR.toString() === 'EMPEROR' && Faction.FREMEN.toString() === 'FREMEN'}`);
const test4 = calculateLossDistribution(
  { regular: 3, elite: 2 },
  5,
  Faction.EMPEROR,
  Faction.FREMEN
);
console.log(`  Result: ${test4.regularLost} regular, ${test4.eliteLost} elite`);
console.log(`  Expected: 3 regular, 2 elite (Sardaukar worth 1x vs Fremen, so 3+2=5)`);
console.log(`  ${test4.regularLost === 3 && test4.eliteLost === 2 ? '✓ PASS' : '✗ FAIL'}`);

// Test 5: Fremen Fedaykin vs Emperor (elite worth 2x normally)
console.log('\nTest 5: Fremen Fedaykin vs Emperor (3 regular, 2 elite, 6 losses)');
const test5 = calculateLossDistribution(
  { regular: 3, elite: 2 },
  6,
  Faction.FREMEN,
  Faction.EMPEROR
);
console.log(`  Result: ${test5.regularLost} regular, ${test5.eliteLost} elite`);
console.log(`  Expected: 3 regular, 2 elite (3 regular = 3 losses, 2 Fedaykin = 4 losses = 7 total absorbed)`);
console.log(`  ${test5.regularLost === 3 && test5.eliteLost === 2 ? '✓ PASS' : '✗ FAIL'}`);

// Test 6: Elite forces with odd number of losses
console.log('\nTest 6: Elite with odd losses (2 regular, 3 elite, 5 losses)');
const test6 = calculateLossDistribution(
  { regular: 2, elite: 3 },
  5,
  Faction.FREMEN,
  Faction.ATREIDES
);
console.log(`  Result: ${test6.regularLost} regular, ${test6.eliteLost} elite`);
console.log(`  Expected: 2 regular, 2 elite (2 regular = 2 losses, need 3 more: 2 elite = 4 losses, total 6 absorbed)`);
console.log(`  ${test6.regularLost === 2 && test6.eliteLost === 2 ? '✓ PASS' : '✗ FAIL'}`);

// Test 7: More losses than available forces
console.log('\nTest 7: More losses than forces (3 regular, 2 elite, 20 losses)');
const test7 = calculateLossDistribution(
  { regular: 3, elite: 2 },
  20,
  Faction.EMPEROR,
  Faction.ATREIDES
);
console.log(`  Result: ${test7.regularLost} regular, ${test7.eliteLost} elite`);
console.log(`  Expected: 3 regular, 2 elite (all forces lost)`);
console.log(`  ${test7.regularLost === 3 && test7.eliteLost === 2 ? '✓ PASS' : '✗ FAIL'}`);

// Test 8: Zero losses
console.log('\nTest 8: Zero losses (5 regular, 3 elite, 0 losses)');
const test8 = calculateLossDistribution(
  { regular: 5, elite: 3 },
  0,
  Faction.EMPEROR,
  Faction.ATREIDES
);
console.log(`  Result: ${test8.regularLost} regular, ${test8.eliteLost} elite`);
console.log(`  Expected: 0 regular, 0 elite`);
console.log(`  ${test8.regularLost === 0 && test8.eliteLost === 0 ? '✓ PASS' : '✗ FAIL'}`);

console.log('\n' + '='.repeat(60));
console.log('All tests completed!');
