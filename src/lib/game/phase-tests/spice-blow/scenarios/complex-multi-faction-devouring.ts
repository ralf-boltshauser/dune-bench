/**
 * Scenario 10: Complex Multi-Faction Devouring
 * 
 * Test multiple factions, Fremen immunity, protected ally
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, getDefaultSpice } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runSpiceBlowScenario, logScenarioResults } from './base-scenario';

export async function testComplexMultiFactionDevouring() {
  console.log('\n🧪 Testing: Complex Multi-Faction Devouring');
  
  const state = buildTestState({
    factions: [Faction.FREMEN, Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
    phase: Phase.SPICE_BLOW,
    turn: 2,
    advancedRules: true,
    stormSector: 5,
    spice: getDefaultSpice(),
    forces: [
      { faction: Faction.FREMEN, territory: TerritoryId.HABBANYA_ERG, sector: 14, regular: 5 },
      { faction: Faction.ATREIDES, territory: TerritoryId.HABBANYA_ERG, sector: 14, regular: 4 },
      { faction: Faction.HARKONNEN, territory: TerritoryId.HABBANYA_ERG, sector: 14, regular: 3 },
      { faction: Faction.EMPEROR, territory: TerritoryId.HABBANYA_ERG, sector: 14, regular: 2 },
    ],
    territorySpice: [
      { territory: TerritoryId.HABBANYA_ERG, sector: 14, amount: 8 },
    ],
    alliances: [[Faction.FREMEN, Faction.ATREIDES]],
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
  // Fremen chooses to protect their ally
  responses.queueFremenProtection(Faction.FREMEN, true);
  // Nexus responses
  responses.queueAllianceDecision(Faction.FREMEN, 'PASS');
  responses.queueAllianceDecision(Faction.ATREIDES, 'PASS');
  responses.queueAllianceDecision(Faction.HARKONNEN, 'PASS');
  responses.queueAllianceDecision(Faction.EMPEROR, 'PASS');

  const result = await runSpiceBlowScenario(
    state,
    responses,
    'complex-multi-faction-devouring'
  );

  logScenarioResults('Complex Multi-Faction Devouring', result);
  
  return result;
}

