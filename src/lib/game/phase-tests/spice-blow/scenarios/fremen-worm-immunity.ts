/**
 * Scenario 3: Fremen Worm Immunity
 * 
 * Test Fremen forces immune to worms
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, getDefaultSpice } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runSpiceBlowScenario, logScenarioResults } from './base-scenario';

export async function testFremenWormImmunity() {
  console.log('\n🧪 Testing: Fremen Worm Immunity');
  
  const state = buildTestState({
    factions: [Faction.FREMEN, Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SPICE_BLOW,
    turn: 2,
    advancedRules: true,
    stormSector: 5,
    spice: getDefaultSpice(),
    forces: [
      { faction: Faction.FREMEN, territory: TerritoryId.HABBANYA_ERG, sector: 14, regular: 5 },
      { faction: Faction.ATREIDES, territory: TerritoryId.HABBANYA_ERG, sector: 14, regular: 3 },
      { faction: Faction.HARKONNEN, territory: TerritoryId.HABBANYA_ERG, sector: 14, regular: 2 },
    ],
    territorySpice: [
      { territory: TerritoryId.HABBANYA_ERG, sector: 14, amount: 8 },
    ],
    // Deck A: Territory Card, Shai-Hulud, Territory Card
    spiceDeckA: [
      'spice_habbanya_erg', // 8 spice, sector 14
      'shai_hulud_1',
      'spice_basin', // 8 spice, sector 9
    ],
    // Pre-populate discard with Habbanya Erg card
    spiceDiscardA: ['spice_habbanya_erg'],
  });

  const responses = new AgentResponseBuilder();
  // No responses needed - no decisions required

  const result = await runSpiceBlowScenario(
    state,
    responses,
    'fremen-worm-immunity'
  );

  logScenarioResults('Fremen Worm Immunity', result);
  
  return result;
}

