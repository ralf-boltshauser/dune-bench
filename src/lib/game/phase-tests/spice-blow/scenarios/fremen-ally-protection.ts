/**
 * Scenario 4: Fremen Ally Protection
 * 
 * Test Fremen protecting ally from worm
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, getDefaultSpice } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runSpiceBlowScenario, logScenarioResults } from './base-scenario';

export async function testFremenAllyProtection() {
  console.log('\n🧪 Testing: Fremen Ally Protection');
  
  const state = buildTestState({
    factions: [Faction.FREMEN, Faction.ATREIDES],
    phase: Phase.SPICE_BLOW,
    turn: 2,
    advancedRules: true,
    stormSector: 5,
    spice: getDefaultSpice(),
    forces: [
      { faction: Faction.FREMEN, territory: TerritoryId.SOUTH_MESA, sector: 2, regular: 3 },
      { faction: Faction.ATREIDES, territory: TerritoryId.SOUTH_MESA, sector: 2, regular: 4 },
    ],
    territorySpice: [
      { territory: TerritoryId.SOUTH_MESA, sector: 2, amount: 10 },
    ],
    alliances: [[Faction.FREMEN, Faction.ATREIDES]],
    // Deck A: Territory Card, Shai-Hulud, Territory Card
    spiceDeckA: [
      'spice_south_mesa', // 10 spice, sector 2
      'shai_hulud_1',
      'spice_basin', // 8 spice, sector 9
    ],
    // Pre-populate discard with South Mesa card
    spiceDiscardA: ['spice_south_mesa'],
  });

  const responses = new AgentResponseBuilder();
  // Fremen chooses to protect their ally
  responses.queueFremenProtection(Faction.FREMEN, true);

  const result = await runSpiceBlowScenario(
    state,
    responses,
    'fremen-ally-protection'
  );

  logScenarioResults('Fremen Ally Protection', result);
  
  return result;
}

