/**
 * Scenario 4: Multiple Factions Competing
 * 
 * Goal: Test multiple factions collecting from same territory but different sectors.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { runSpiceCollectionScenario } from './base-scenario';

export async function testMultipleFactions() {
  console.log('\n' + '='.repeat(80));
  console.log('SCENARIO 4: Multiple Factions Competing');
  console.log('='.repeat(80));

  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.FREMEN, Faction.EMPEROR],
    phase: Phase.SPICE_COLLECTION,
    turn: 1,
    forces: [
      // Atreides: 3 forces in sector 10 (has city bonus via Arrakeen)
      { faction: Faction.ATREIDES, territory: TerritoryId.ARRAKEEN, sector: 16, regular: 2 }, // Gives city bonus
      { faction: Faction.ATREIDES, territory: TerritoryId.ROCK_OUTCROPPINGS, sector: 10, regular: 3 },
      // Harkonnen: 2 forces in sector 11 (has city bonus via Carthag)
      { faction: Faction.HARKONNEN, territory: TerritoryId.CARTHAG, sector: 5, regular: 2 }, // Gives city bonus
      { faction: Faction.HARKONNEN, territory: TerritoryId.ROCK_OUTCROPPINGS, sector: 11, regular: 2 },
      // Fremen: 4 forces in sector 12 (no city bonus)
      { faction: Faction.FREMEN, territory: TerritoryId.ROCK_OUTCROPPINGS, sector: 12, regular: 4 },
      // Emperor: 1 force in sector 13 (no city bonus)
      { faction: Faction.EMPEROR, territory: TerritoryId.ROCK_OUTCROPPINGS, sector: 13, regular: 1 },
    ],
    territorySpice: [
      { territory: TerritoryId.ROCK_OUTCROPPINGS, sector: 10, amount: 12 },
      { territory: TerritoryId.ROCK_OUTCROPPINGS, sector: 11, amount: 8 },
      { territory: TerritoryId.ROCK_OUTCROPPINGS, sector: 12, amount: 10 },
      { territory: TerritoryId.ROCK_OUTCROPPINGS, sector: 13, amount: 4 },
    ],
    spice: new Map([
      [Faction.ATREIDES, 10],
      [Faction.HARKONNEN, 10],
      [Faction.FREMEN, 5],
      [Faction.EMPEROR, 5],
    ]),
  });

  console.log('\nSetup:');
  console.log('- All factions in Rock Outcroppings but different sectors:');
  console.log('  - Atreides: 3 forces in sector 10 with 12 spice (has city bonus via Arrakeen)');
  console.log('  - Harkonnen: 2 forces in sector 11 with 8 spice (has city bonus via Carthag)');
  console.log('  - Fremen: 4 forces in sector 12 with 10 spice (no city bonus)');
  console.log('  - Emperor: 1 force in sector 13 with 4 spice (no city bonus)');
  console.log('\nExpected:');
  console.log('- Atreides collects 9 spice (3 × 3) - city bonus applies');
  console.log('- Harkonnen collects 6 spice (2 × 3) - city bonus applies');
  console.log('- Fremen collects 8 spice (4 × 2) - base rate');
  console.log('- Emperor collects 2 spice (1 × 2) - base rate');

  return await runSpiceCollectionScenario(state, 'multiple-factions');
}

