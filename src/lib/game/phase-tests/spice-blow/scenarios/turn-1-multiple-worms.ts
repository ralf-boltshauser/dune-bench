/**
 * Scenario 1: Turn 1 Multiple Worms
 * 
 * Test Turn 1 special rules - worms set aside, no Nexus, reshuffled
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, getDefaultSpice } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runSpiceBlowScenario, logScenarioResults } from './base-scenario';

export async function testTurn1MultipleWorms() {
  console.log('\n🧪 Testing: Turn 1 Multiple Worms');
  
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.FREMEN, Faction.HARKONNEN],
    phase: Phase.SPICE_BLOW,
    turn: 1,
    advancedRules: true,
    stormSector: 5,
    spice: getDefaultSpice(),
    // Deck A: Shai-Hulud, Shai-Hulud, Territory Card
    spiceDeckA: [
      'shai_hulud_1',
      'shai_hulud_2',
      'spice_cielago_north', // 8 spice, sector 0
    ],
  });

  const responses = new AgentResponseBuilder();
  // No responses needed - no Nexus on Turn 1, no decisions required

  const result = await runSpiceBlowScenario(
    state,
    responses,
    'turn-1-multiple-worms'
  );

  logScenarioResults('Turn 1 Multiple Worms', result);
  
  return result;
}

