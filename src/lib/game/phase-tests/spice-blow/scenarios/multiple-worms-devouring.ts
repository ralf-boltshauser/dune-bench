/**
 * Scenario 2: Multiple Worms Devouring
 * 
 * Test multiple worms in sequence, correct devour locations
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, getDefaultSpice } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runSpiceBlowScenario, logScenarioResults } from './base-scenario';

export async function testMultipleWormsDevouring() {
  console.log('\n🧪 Testing: Multiple Worms Devouring');
  
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
    phase: Phase.SPICE_BLOW,
    turn: 2,
    advancedRules: true,
    stormSector: 5,
    spice: getDefaultSpice(),
    forces: [
      { faction: Faction.ATREIDES, territory: TerritoryId.SOUTH_MESA, sector: 2, regular: 5 },
      { faction: Faction.HARKONNEN, territory: TerritoryId.SOUTH_MESA, sector: 2, regular: 3 },
      { faction: Faction.EMPEROR, territory: TerritoryId.RED_CHASM, sector: 3, regular: 2 },
    ],
    territorySpice: [
      { territory: TerritoryId.SOUTH_MESA, sector: 2, amount: 10 },
      { territory: TerritoryId.RED_CHASM, sector: 3, amount: 8 },
    ],
    // Deck A: Territory Card, Shai-Hulud, Territory Card, Shai-Hulud, Territory Card
    spiceDeckA: [
      'spice_south_mesa', // 10 spice, sector 2
      'shai_hulud_1',
      'spice_red_chasm', // 8 spice, sector 3
      'shai_hulud_2',
      'spice_basin', // 8 spice, sector 9
    ],
    // Pre-populate discard with South Mesa card so first worm has something to devour
    spiceDiscardA: ['spice_south_mesa'],
  });

  const responses = new AgentResponseBuilder();
  // No responses needed - no decisions required

  const result = await runSpiceBlowScenario(
    state,
    responses,
    'multiple-worms-devouring'
  );

  logScenarioResults('Multiple Worms Devouring', result);
  
  return result;
}

