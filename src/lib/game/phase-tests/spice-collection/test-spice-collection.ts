/**
 * Spice Collection Phase Test Suite
 * 
 * Comprehensive test suite for the spice collection phase.
 * Tests write detailed log files for manual review.
 */

import { testCityBonusGlobal } from './scenarios/city-bonus-global';
import { testMultipleSectors } from './scenarios/multiple-sectors';
import { testLimitedSpice } from './scenarios/limited-spice';
import { testMultipleFactions } from './scenarios/multiple-factions';
import { testEliteVsRegular } from './scenarios/elite-vs-regular';
import { testNoSpice } from './scenarios/no-spice';
import { testLargeScale } from './scenarios/large-scale';
import { testCityStrongholdCollection } from './scenarios/city-stronghold-collection';
import { testSpiceInStormSector } from './scenarios/spice-in-storm-sector';
import { testStormSeparation } from './scenarios/storm-separation';
import { testStormSeparationCorrect } from './scenarios/storm-separation-correct';

async function runAllTests() {
  console.log('='.repeat(80));
  console.log('SPICE COLLECTION PHASE TEST SUITE');
  console.log('='.repeat(80));
  console.log('\nNote: Spice collection is automatic - no agent decisions needed.');
  console.log('All tests write detailed log files for manual review.');
  console.log('='.repeat(80));

  const scenarios = [
    { name: 'City Bonus Global Application', fn: testCityBonusGlobal },
    { name: 'Multiple Sectors Same Territory', fn: testMultipleSectors },
    { name: 'Limited Spice Availability', fn: testLimitedSpice },
    { name: 'Multiple Factions Competing', fn: testMultipleFactions },
    { name: 'Elite vs Regular Forces', fn: testEliteVsRegular },
    { name: 'No Spice Scenarios', fn: testNoSpice },
    { name: 'Large Scale Collection', fn: testLargeScale },
    { name: 'City Stronghold Collection', fn: testCityStrongholdCollection },
    { name: 'Spice in Storm Sector', fn: testSpiceInStormSector },
    { name: 'Storm Separation', fn: testStormSeparation },
    { name: 'Storm Separation - Correct Path', fn: testStormSeparationCorrect },
  ];

  let passed = 0;
  let failed = 0;

  for (const scenario of scenarios) {
    try {
      console.log(`\n\nRunning: ${scenario.name}...`);
      await scenario.fn();
      passed++;
      console.log(`✓ ${scenario.name} completed`);
    } catch (error) {
      failed++;
      console.error(`✗ ${scenario.name} failed:`, error);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total scenarios: ${scenarios.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('\n✅ All tests completed. Check test-logs/spice-collection/ for log files.');
  console.log('='.repeat(80));
}

if (require.main === module) {
  runAllTests().catch(console.error);
}

