/**
 * Scenario 3: Limited Spice Availability
 * 
 * Goal: Verify collection is capped at available spice amount.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { runSpiceCollectionScenario } from './base-scenario';

export async function testLimitedSpice() {
  console.log('\n' + '='.repeat(80));
  console.log('SCENARIO 3: Limited Spice Availability');
  console.log('='.repeat(80));

  const state = buildTestState({
    factions: [Faction.BENE_GESSERIT, Faction.SPACING_GUILD],
    phase: Phase.SPICE_COLLECTION,
    turn: 1,
    forces: [
      // Bene Gesserit: 10 forces but only 5 spice available
      { faction: Faction.BENE_GESSERIT, territory: TerritoryId.HAGGA_BASIN, sector: 8, regular: 10 },
      // Spacing Guild: 8 forces but only 3 spice available
      { faction: Faction.SPACING_GUILD, territory: TerritoryId.SOUTH_MESA, sector: 2, regular: 8 },
    ],
    territorySpice: [
      { territory: TerritoryId.HAGGA_BASIN, sector: 8, amount: 5 },
      { territory: TerritoryId.SOUTH_MESA, sector: 2, amount: 3 },
    ],
    spice: new Map([
      [Faction.BENE_GESSERIT, 5],
      [Faction.SPACING_GUILD, 5],
    ]),
  });

  console.log('\nSetup:');
  console.log('- Bene Gesserit: 10 forces in Hagga Basin (sector 8) with only 5 spice available');
  console.log('- Spacing Guild: 8 forces in South Mesa (sector 2) with only 3 spice available');
  console.log('\nExpected:');
  console.log('- Bene Gesserit collects 5 spice (not 20 - limited by availability)');
  console.log('- Spacing Guild collects 3 spice (not 16 - limited by availability)');

  return await runSpiceCollectionScenario(state, 'limited-spice');
}

