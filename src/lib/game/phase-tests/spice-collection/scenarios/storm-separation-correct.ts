/**
 * Scenario 11: Storm Separation - Correct Path
 * 
 * Goal: Test that forces CAN collect spice if storm is NOT in the path between them.
 * 
 * Example: Atreides sector 4, Storm sector 5, Harkonnen sector 6, Spice sector 7
 * - Atreides CANNOT collect (storm is in path: 4 -> 5 -> 6 -> 7)
 * - Harkonnen CAN collect (storm is NOT in path: 6 -> 7, direct path)
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { runSpiceCollectionScenario } from './base-scenario';
import { moveStorm } from '../../../state';

export async function testStormSeparationCorrect() {
  console.log('\n' + '='.repeat(80));
  console.log('SCENARIO 11: Storm Separation - Correct Path');
  console.log('='.repeat(80));

  // Create state with storm between some forces but not others
  let state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SPICE_COLLECTION,
    turn: 2,
    forces: [
      // Atreides: Forces in Sihaya Ridge (sector 4)
      // Storm is in sector 5
      // Harkonnen is in sector 6
      // Spice is in sector 7
      // Atreides path to spice: 4 -> 5 -> 6 -> 7 (storm blocks)
      // Harkonnen path to spice: 6 -> 7 (direct, no storm)
      { faction: Faction.ATREIDES, territory: TerritoryId.SIHAYA_RIDGE, sector: 4, regular: 5 },
      { faction: Faction.HARKONNEN, territory: TerritoryId.SIHAYA_RIDGE, sector: 6, regular: 3 },
    ],
    territorySpice: [
      // Spice in Sihaya Ridge sector 7
      { territory: TerritoryId.SIHAYA_RIDGE, sector: 7, amount: 15 },
    ],
    spice: new Map([
      [Faction.ATREIDES, 10],
      [Faction.HARKONNEN, 10],
    ]),
  });

  // Set storm to sector 5 (between Atreides and Harkonnen, but not between Harkonnen and spice)
  state = moveStorm(state, 5);

  console.log('\nSetup:');
  console.log('- Storm is in sector 5');
  console.log('- Atreides: 5 forces in Sihaya Ridge (sector 4)');
  console.log('- Harkonnen: 3 forces in Sihaya Ridge (sector 6)');
  console.log('- Spice: 15 spice in Sihaya Ridge (sector 7)');
  console.log('\nPath Analysis:');
  console.log('- Atreides (4) -> Spice (7): Path goes 4 -> 5 -> 6 -> 7 (storm at 5 blocks)');
  console.log('- Harkonnen (6) -> Spice (7): Direct path 6 -> 7 (no storm, can collect)');
  console.log('\nExpected:');
  console.log('- Atreides CANNOT collect spice (storm blocks path)');
  console.log('- Harkonnen CAN collect spice (direct path, no storm)');
  console.log('- Harkonnen collects 6 spice (3 forces × 2 spice/force)');

  return await runSpiceCollectionScenario(state, 'storm-separation-correct');
}









