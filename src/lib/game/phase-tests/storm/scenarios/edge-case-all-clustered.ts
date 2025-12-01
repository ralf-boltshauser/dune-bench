/**
 * Edge Case: All Factions Clustered Together
 * 
 * Tests dialer selection when all factions are in adjacent sectors.
 * Verifies two different dialers are selected even when all clustered.
 */

import { Faction, Phase } from '../../../types';
import { buildTestState, setPlayerPosition } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runStormScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

/**
 * Edge Case: All Factions Clustered
 * 
 * Tests:
 * - All factions in adjacent sectors
 * - Two different dialers selected
 * - Validation ensures no duplicates
 * - Both dials processed correctly
 */
export async function testEdgeCaseAllClustered(): Promise<ScenarioResult> {
  console.log('\n🌪️  Setting up Edge Case: All Factions Clustered Together');

  // Build test state with 4 factions all clustered together
  let state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.BENE_GESSERIT, Faction.FREMEN],
    phase: Phase.STORM,
    turn: 2,
    advancedRules: true,
    stormSector: 10,
  });

  // Set all factions in adjacent sectors (5, 6, 7, 8)
  // All are 2-5 sectors before storm at 10
  state = setPlayerPosition(state, Faction.ATREIDES, 5);
  state = setPlayerPosition(state, Faction.HARKONNEN, 6);
  state = setPlayerPosition(state, Faction.BENE_GESSERIT, 7);
  state = setPlayerPosition(state, Faction.FREMEN, 8);

  // Queue agent responses for expected dialers
  // Validation should ensure two different factions are selected
  const responses = new AgentResponseBuilder();
  responses.queueStormDial(Faction.ATREIDES, 1);
  responses.queueStormDial(Faction.HARKONNEN, 3);
  // Total: 4 sectors
  // Storm at 10, moves 4 sectors counterclockwise → ends at sector 14

  // Run scenario
  const result = await runStormScenario(
    state,
    responses,
    'Edge Case: All Factions Clustered Together'
  );

  logScenarioResults('Edge Case: All Factions Clustered Together', result);
  return result;
}

