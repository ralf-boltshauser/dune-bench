/**
 * Standard Storm Movement and Destruction - Difficult Scenario
 * 
 * Tests:
 * - Normal storm movement (Turn 2+)
 * - Force destruction in sand territories
 * - Spice destruction in storm path
 * - Protected territories (Imperial Basin) remain safe
 * - Multi-sector territory (Imperial Basin spans 8, 9, 10)
 * - Forces in different sectors of same territory
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, setPlayerPosition } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runStormScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

export async function testStandardMovementDestruction(): Promise<ScenarioResult> {
  console.log('\n🌪️  Setting up Standard Storm Movement and Destruction');

  // Build test state for Turn 2
  // Scenario: Storm at 5, will move to 10, hitting sectors 6-10
  let state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
    phase: Phase.STORM,
    turn: 2,
    advancedRules: true,
    stormSector: 5,
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TerritoryId.THE_MINOR_ERG, // Sand territory, sector 6
        sector: 6,
        regular: 10,
      },
      {
        faction: Faction.HARKONNEN,
        territory: TerritoryId.THE_MINOR_ERG, // Sand territory, sector 7
        sector: 7,
        regular: 5,
      },
      {
        faction: Faction.EMPEROR,
        territory: TerritoryId.IMPERIAL_BASIN, // Protected sand territory, sector 8
        sector: 8,
        regular: 3,
      },
    ],
    territorySpice: [
      {
        territory: TerritoryId.THE_MINOR_ERG,
        sector: 6,
        amount: 5, // Should be destroyed (in path)
      },
      {
        territory: TerritoryId.IMPERIAL_BASIN,
        sector: 8,
        amount: 10, // Should NOT be destroyed (protected)
      },
    ],
  });

  // Set player positions
  // Atreides at 4 (1 behind storm), Harkonnen at 6 (1 ahead), Emperor at 8 (3 ahead)
  // Expected dialers: Atreides (4) and Harkonnen (6) - nearest on either side
  state = setPlayerPosition(state, Faction.ATREIDES, 4);
  state = setPlayerPosition(state, Faction.HARKONNEN, 6);
  state = setPlayerPosition(state, Faction.EMPEROR, 8);

  // Queue agent responses
  // Two players nearest storm (5) on either side: Atreides (4) and Harkonnen (6)
  const responses = new AgentResponseBuilder();
  responses.queueStormDial(Faction.ATREIDES, 2);
  responses.queueStormDial(Faction.HARKONNEN, 3);
  // Total: 5 sectors
  // Storm moves from 5 → 10 (passes through 6, 7, 8, 9, ends at 10)
  // Expected: Atreides forces in sector 6 destroyed, Harkonnen forces in sector 7 destroyed
  // Expected: Emperor forces in sector 8 (Imperial Basin) protected
  // Expected: Spice in sector 6 destroyed, spice in sector 8 (Imperial Basin) protected

  // Run scenario
  const result = await runStormScenario(
    state,
    responses,
    'Standard Storm Movement and Destruction'
  );

  logScenarioResults('Standard Storm Movement and Destruction', result);
  return result;
}

