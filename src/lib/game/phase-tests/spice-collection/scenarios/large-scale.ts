/**
 * Scenario 7: Large Scale Collection
 * 
 * Goal: Stress test with all factions and multiple territories.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState } from '../helpers/test-state-builder';
import { runSpiceCollectionScenario } from './base-scenario';

export async function testLargeScale() {
  console.log('\n' + '='.repeat(80));
  console.log('SCENARIO 7: Large Scale Collection');
  console.log('='.repeat(80));

  const state = buildTestState({
    factions: [
      Faction.ATREIDES,
      Faction.BENE_GESSERIT,
      Faction.EMPEROR,
      Faction.FREMEN,
      Faction.HARKONNEN,
      Faction.SPACING_GUILD,
    ],
    phase: Phase.SPICE_COLLECTION,
    turn: 1,
    forces: [
      // Atreides: Multiple territories, has city bonus
      { faction: Faction.ATREIDES, territory: TerritoryId.ARRAKEEN, sector: 16, regular: 3 }, // Gives city bonus
      { faction: Faction.ATREIDES, territory: TerritoryId.HAGGA_BASIN, sector: 8, regular: 4 },
      { faction: Faction.ATREIDES, territory: TerritoryId.SOUTH_MESA, sector: 2, regular: 2 },
      // Bene Gesserit: Multiple sectors
      { faction: Faction.BENE_GESSERIT, territory: TerritoryId.ROCK_OUTCROPPINGS, sector: 10, regular: 3 },
      { faction: Faction.BENE_GESSERIT, territory: TerritoryId.ROCK_OUTCROPPINGS, sector: 11, regular: 2 },
      // Emperor: Single territory
      { faction: Faction.EMPEROR, territory: TerritoryId.CIELAGO_NORTH, sector: 0, regular: 5 },
      // Fremen: Multiple territories
      { faction: Faction.FREMEN, territory: TerritoryId.SIHAYA_RIDGE, sector: 4, regular: 3 },
      { faction: Faction.FREMEN, territory: TerritoryId.RED_CHASM, sector: 3, regular: 2 },
      // Harkonnen: Has city bonus
      { faction: Faction.HARKONNEN, territory: TerritoryId.CARTHAG, sector: 5, regular: 2 }, // Gives city bonus
      { faction: Faction.HARKONNEN, territory: TerritoryId.BROKEN_LAND, sector: 7, regular: 4 },
      // Spacing Guild: Limited spice
      { faction: Faction.SPACING_GUILD, territory: TerritoryId.OLD_GAP, sector: 8, regular: 6 },
    ],
    territorySpice: [
      { territory: TerritoryId.HAGGA_BASIN, sector: 8, amount: 20 },
      { territory: TerritoryId.SOUTH_MESA, sector: 2, amount: 10 },
      { territory: TerritoryId.ROCK_OUTCROPPINGS, sector: 10, amount: 15 },
      { territory: TerritoryId.ROCK_OUTCROPPINGS, sector: 11, amount: 8 },
      { territory: TerritoryId.CIELAGO_NORTH, sector: 0, amount: 20 },
      { territory: TerritoryId.SIHAYA_RIDGE, sector: 4, amount: 12 },
      { territory: TerritoryId.RED_CHASM, sector: 3, amount: 10 },
      { territory: TerritoryId.BROKEN_LAND, sector: 7, amount: 20 },
      { territory: TerritoryId.OLD_GAP, sector: 8, amount: 5 }, // Limited spice
    ],
    spice: new Map([
      [Faction.ATREIDES, 10],
      [Faction.BENE_GESSERIT, 5],
      [Faction.EMPEROR, 10],
      [Faction.FREMEN, 5],
      [Faction.HARKONNEN, 10],
      [Faction.SPACING_GUILD, 5],
    ]),
  });

  console.log('\nSetup:');
  console.log('- All 6 factions with forces across multiple territories');
  console.log('- Mix of city bonus (Atreides, Harkonnen) and no city bonus');
  console.log('- Mix of limited and abundant spice');
  console.log('- Multiple sectors in same territory (Bene Gesserit)');
  console.log('\nExpected:');
  console.log('- All collections happen correctly');
  console.log('- All events fire');
  console.log('- State updates correctly');
  console.log('- City bonus applies globally for Atreides and Harkonnen');

  return await runSpiceCollectionScenario(state, 'large-scale');
}

