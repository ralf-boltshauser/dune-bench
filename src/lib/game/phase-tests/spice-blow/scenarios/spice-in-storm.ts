/**
 * Scenario 6: Spice in Storm
 * 
 * Test spice not placed when sector in storm
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, getDefaultSpice } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runSpiceBlowScenario, logScenarioResults } from './base-scenario';

export async function testSpiceInStorm() {
  console.log('\n🧪 Testing: Spice in Storm');
  
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SPICE_BLOW,
    turn: 2,
    advancedRules: true,
    stormSector: 0, // Same as Cielago North spice blow sector
    spice: getDefaultSpice(),
    // Deck A: Territory Card (Cielago North, sector 0)
    spiceDeckA: [
      'spice_cielago_north', // 8 spice, sector 0
    ],
  });

  const responses = new AgentResponseBuilder();
  // No responses needed

  const result = await runSpiceBlowScenario(
    state,
    responses,
    'spice-in-storm'
  );

  logScenarioResults('Spice in Storm', result);
  
  return result;
}

