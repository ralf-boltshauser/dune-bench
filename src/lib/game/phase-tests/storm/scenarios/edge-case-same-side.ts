/**
 * Edge Case: Factions on Same Side of Storm
 * 
 * Tests "nearest on either side" logic when factions are on same side.
 * Verifies one faction before storm (clockwise) and one after storm (counterclockwise) are selected.
 */

import { Faction, Phase } from '../../../types';
import { buildTestState, setPlayerPosition } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runStormScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

/**
 * Edge Case: Factions on Same Side of Storm
 * 
 * Tests:
 * - Factions positioned on same side of storm
 * - "Nearest on either side" logic finds one before and one after
 * - Not the same faction selected twice
 * - Correct dialers selected
 */
export async function testEdgeCaseSameSide(): Promise<ScenarioResult> {
  console.log('\n🌪️  Setting up Edge Case: Factions on Same Side of Storm');

  // Build test state with factions on same side
  let state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.BENE_GESSERIT],
    phase: Phase.STORM,
    turn: 2,
    advancedRules: true,
    stormSector: 10,
  });

  // Set factions - two before storm, one after
  // But all relatively close together on "one side" of the board
  // Atreides at 8 (2 sectors before), Harkonnen at 9 (1 sector before)
  // BG at 11 (1 sector after)
  // Expected: Should find one before (closest: Harkonnen at 9) and one after (BG at 11)
  state = setPlayerPosition(state, Faction.ATREIDES, 8);
  state = setPlayerPosition(state, Faction.HARKONNEN, 9);
  state = setPlayerPosition(state, Faction.BENE_GESSERIT, 11);

  // Queue agent responses
  const responses = new AgentResponseBuilder();
  responses.queueStormDial(Faction.HARKONNEN, 2); // Before storm
  responses.queueStormDial(Faction.BENE_GESSERIT, 3); // After storm
  // Total: 5 sectors
  // Storm at 10, moves 5 sectors counterclockwise → ends at sector 15

  // Run scenario
  const result = await runStormScenario(
    state,
    responses,
    'Edge Case: Factions on Same Side of Storm'
  );

  logScenarioResults('Edge Case: Factions on Same Side of Storm', result);
  return result;
}

