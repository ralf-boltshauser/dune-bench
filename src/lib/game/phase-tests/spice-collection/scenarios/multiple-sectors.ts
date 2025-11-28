/**
 * Scenario 2: Multiple Sectors Same Territory
 * 
 * Goal: Test per-sector collection within the same territory.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { runSpiceCollectionScenario } from './base-scenario';

export async function testMultipleSectors() {
  console.log('\n' + '='.repeat(80));
  console.log('SCENARIO 2: Multiple Sectors Same Territory');
  console.log('='.repeat(80));

  const state = buildTestState({
    factions: [Faction.FREMEN, Faction.EMPEROR],
    phase: Phase.SPICE_COLLECTION,
    turn: 1,
    forces: [
      // Fremen: 2 forces in sector 10, 3 forces in sector 11
      { faction: Faction.FREMEN, territory: TerritoryId.ROCK_OUTCROPPINGS, sector: 10, regular: 2 },
      { faction: Faction.FREMEN, territory: TerritoryId.ROCK_OUTCROPPINGS, sector: 11, regular: 3 },
      // Emperor: 1 force in sector 12
      { faction: Faction.EMPEROR, territory: TerritoryId.ROCK_OUTCROPPINGS, sector: 12, regular: 1 },
    ],
    territorySpice: [
      { territory: TerritoryId.ROCK_OUTCROPPINGS, sector: 10, amount: 8 },
      { territory: TerritoryId.ROCK_OUTCROPPINGS, sector: 11, amount: 10 },
      { territory: TerritoryId.ROCK_OUTCROPPINGS, sector: 12, amount: 5 },
    ],
    spice: new Map([
      [Faction.FREMEN, 5],
      [Faction.EMPEROR, 5],
    ]),
  });

  console.log('\nSetup:');
  console.log('- Fremen: 2 forces in Rock Outcroppings (sector 10) with 8 spice, 3 forces in sector 11 with 10 spice');
  console.log('- Emperor: 1 force in Rock Outcroppings (sector 12) with 5 spice');
  console.log('\nExpected:');
  console.log('- Fremen collects 4 spice from sector 10 (2 × 2) + 6 spice from sector 11 (3 × 2) = 10 total');
  console.log('- Emperor collects 2 spice from sector 12 (1 × 2)');

  return await runSpiceCollectionScenario(state, 'multiple-sectors');
}

