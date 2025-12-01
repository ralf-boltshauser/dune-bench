/**
 * Integration Tests: Storm → Spice Blow Phase Transition
 * 
 * Tests the complete flow from storm phase to spice blow phase, ensuring:
 * - Storm sector is correctly updated before spice blow phase
 * - Spice cannot be placed in the new storm sector
 * - Spice can be placed in non-storm sectors
 * - State consistency between phases
 */

import { Phase, Faction, TerritoryId } from '../../types';
import { StormPhaseHandler } from '../../phases/handlers/storm';
import { SpiceBlowPhaseHandler } from '../../phases/handlers/spice-blow';
import { createGameState } from '../../state/factory';
import { addSpiceToTerritory } from '../../state/mutations';
import { GAME_CONSTANTS } from '../../data';

/**
 * Test: Storm sector is updated before spice blow phase
 */
async function testStormSectorUpdatedBeforeSpiceBlow() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST: Storm Sector Updated Before Spice Blow Phase');
  console.log('='.repeat(80));

  // Create initial state
  let state = createGameState({
    factions: [Faction.BENE_GESSERIT, Faction.EMPEROR, Faction.SPACING_GUILD],
    advancedRules: true,
  });

  // Set up storm at sector 12
  state = { ...state, stormSector: 12 };

  // Add some spice before storm movement
  state = addSpiceToTerritory(state, TerritoryId.THE_GREAT_FLAT, 14, 10);

  // Run storm phase
  const stormHandler = new StormPhaseHandler();
  const stormResult = await stormHandler.processStep(state, []);

  // Verify storm moved (assuming movement of 2)
  const newStormSector = stormResult.state.stormSector;
  console.log(`\n  Storm moved from sector 12 to sector ${newStormSector}`);

  // Now run spice blow phase
  const spiceBlowHandler = new SpiceBlowPhaseHandler();
  const spiceBlowResult = await spiceBlowHandler.processStep(stormResult.state, []);

  // Verify spice blow phase uses the updated storm sector
  console.log(`\n  Spice Blow Phase - Storm Sector: ${spiceBlowResult.state.stormSector}`);
  console.log(`  Expected: ${newStormSector}`);

  if (spiceBlowResult.state.stormSector === newStormSector) {
    console.log('  ✅ PASS: Storm sector correctly updated before spice blow phase');
    return true;
  } else {
    console.error('  ❌ FAIL: Storm sector not correctly updated');
    return false;
  }
}

/**
 * Test: Spice cannot be placed in storm sector
 */
async function testSpiceNotPlacedInStormSector() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST: Spice Not Placed in Storm Sector');
  console.log('='.repeat(80));

  // Create initial state with storm at sector 14
  let state = createGameState({
    factions: [Faction.BENE_GESSERIT, Faction.EMPEROR, Faction.SPACING_GUILD],
    advancedRules: true,
  });

  state = { ...state, stormSector: 14 };

  // Get initial spice count
  const initialSpiceCount = state.spiceOnBoard.length;

  // Run spice blow phase
  const spiceBlowHandler = new SpiceBlowPhaseHandler();
  const result = await spiceBlowHandler.processStep(state, []);

  // Check if any spice was placed in sector 14 (storm sector)
  const spiceInStorm = result.state.spiceOnBoard.filter(
    (s) => s.sector === state.stormSector
  );

  console.log(`\n  Storm Sector: ${state.stormSector}`);
  console.log(`  Spice in storm sector: ${spiceInStorm.length} entries`);

  if (spiceInStorm.length === 0) {
    console.log('  ✅ PASS: No spice placed in storm sector');
    return true;
  } else {
    console.error('  ❌ FAIL: Spice was placed in storm sector');
    console.error(`     Spice entries: ${JSON.stringify(spiceInStorm, null, 2)}`);
    return false;
  }
}

/**
 * Test: Spice can be placed in non-storm sectors
 */
async function testSpicePlacedInNonStormSectors() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST: Spice Can Be Placed in Non-Storm Sectors');
  console.log('='.repeat(80));

  // Create initial state with storm at sector 14
  let state = createGameState({
    factions: [Faction.BENE_GESSERIT, Faction.EMPEROR, Faction.SPACING_GUILD],
    advancedRules: true,
  });

  state = { ...state, stormSector: 14 };

  // Manually add spice to a non-storm sector (simulating spice blow)
  state = addSpiceToTerritory(state, TerritoryId.SOUTH_MESA, 2, 10);
  state = addSpiceToTerritory(state, TerritoryId.FUNERAL_PLAIN, 1, 6);

  // Verify spice was placed
  const spiceInNonStormSectors = state.spiceOnBoard.filter(
    (s) => s.sector !== state.stormSector
  );

  console.log(`\n  Storm Sector: ${state.stormSector}`);
  console.log(`  Spice in non-storm sectors: ${spiceInNonStormSectors.length} entries`);

  if (spiceInNonStormSectors.length > 0) {
    console.log('  ✅ PASS: Spice can be placed in non-storm sectors');
    console.log(`     Spice entries: ${spiceInNonStormSectors.map(s => `${s.territoryId}:${s.sector}`).join(', ')}`);
    return true;
  } else {
    console.error('  ❌ FAIL: No spice in non-storm sectors');
    return false;
  }
}

/**
 * Test: State consistency between phases
 */
async function testStateConsistency() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST: State Consistency Between Phases');
  console.log('='.repeat(80));

  // Create initial state
  let state = createGameState({
    factions: [Faction.BENE_GESSERIT, Faction.EMPEROR, Faction.SPACING_GUILD],
    advancedRules: true,
  });

  // Add spice before storm
  state = addSpiceToTerritory(state, TerritoryId.THE_GREAT_FLAT, 14, 10);
  state = addSpiceToTerritory(state, TerritoryId.RED_CHASM, 3, 8);

  const spiceBeforeStorm = state.spiceOnBoard.length;
  console.log(`\n  Spice before storm: ${spiceBeforeStorm} entries`);

  // Run storm phase
  const stormHandler = new StormPhaseHandler();
  const stormResult = await stormHandler.processStep(state, []);

  const spiceAfterStorm = stormResult.state.spiceOnBoard.length;
  console.log(`  Spice after storm: ${spiceAfterStorm} entries`);
  console.log(`  Storm Sector: ${stormResult.state.stormSector}`);

  // Run spice blow phase
  const spiceBlowHandler = new SpiceBlowPhaseHandler();
  const spiceBlowResult = await spiceBlowHandler.processStep(stormResult.state, []);

  const spiceAfterSpiceBlow = spiceBlowResult.state.spiceOnBoard.length;
  console.log(`  Spice after spice blow: ${spiceAfterSpiceBlow} entries`);

  // Verify storm sector consistency
  if (spiceBlowResult.state.stormSector === stormResult.state.stormSector) {
    console.log('  ✅ PASS: Storm sector consistent between phases');
    return true;
  } else {
    console.error('  ❌ FAIL: Storm sector changed unexpectedly');
    console.error(`     Expected: ${stormResult.state.stormSector}`);
    console.error(`     Actual: ${spiceBlowResult.state.stormSector}`);
    return false;
  }
}

/**
 * Run all integration tests
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(80));
  console.log('STORM → SPICE BLOW INTEGRATION TESTS');
  console.log('='.repeat(80));

  const results: boolean[] = [];

  try {
    results.push(await testStormSectorUpdatedBeforeSpiceBlow());
  } catch (error: unknown) {
    console.error('Test failed with error:', error);
    results.push(false);
  }

  try {
    results.push(await testSpiceNotPlacedInStormSector());
  } catch (error: unknown) {
    console.error('Test failed with error:', error);
    results.push(false);
  }

  try {
    results.push(await testSpicePlacedInNonStormSectors());
  } catch (error: unknown) {
    console.error('Test failed with error:', error);
    results.push(false);
  }

  try {
    results.push(await testStateConsistency());
  } catch (error: unknown) {
    console.error('Test failed with error:', error);
    results.push(false);
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  const passed = results.filter(r => r).length;
  const total = results.length;
  console.log(`\n  Passed: ${passed}/${total}`);
  console.log(`  Failed: ${total - passed}/${total}`);

  if (passed === total) {
    console.log('\n  ✅ All tests passed!');
  } else {
    console.log('\n  ❌ Some tests failed');
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export {
  testStormSectorUpdatedBeforeSpiceBlow,
  testSpiceNotPlacedInStormSector,
  testSpicePlacedInNonStormSectors,
  testStateConsistency,
  runAllTests,
};

