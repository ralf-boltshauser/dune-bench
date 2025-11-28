/**
 * Scenario 8: Nexus Alliance Negotiations
 * 
 * Test Nexus with multiple factions forming/breaking alliances
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, getDefaultSpice } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runSpiceBlowScenario, logScenarioResults } from './base-scenario';

export async function testNexusAllianceNegotiations() {
  console.log('\n🧪 Testing: Nexus Alliance Negotiations');
  
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.FREMEN, Faction.HARKONNEN, Faction.EMPEROR],
    phase: Phase.SPICE_BLOW,
    turn: 2,
    advancedRules: true,
    stormSector: 5,
    spice: getDefaultSpice(),
    alliances: [[Faction.FREMEN, Faction.ATREIDES]], // Existing alliance
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
  // Nexus responses in storm order
  // Assuming storm order: Atreides, Fremen, Harkonnen, Emperor
  responses.queueAllianceDecision(Faction.ATREIDES, 'BREAK_ALLIANCE'); // Break with Fremen
  responses.queueAllianceDecision(Faction.FREMEN, 'PASS'); // Pass
  responses.queueAllianceDecision(Faction.HARKONNEN, 'FORM_ALLIANCE', Faction.EMPEROR); // Form with Emperor
  responses.queueAllianceDecision(Faction.EMPEROR, 'FORM_ALLIANCE', Faction.HARKONNEN); // Form with Harkonnen

  const result = await runSpiceBlowScenario(
    state,
    responses,
    'nexus-alliance-negotiations'
  );

  logScenarioResults('Nexus Alliance Negotiations', result);
  
  return result;
}

