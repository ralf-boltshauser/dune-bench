/**
 * Multi-Sector Territory - Complex Scenario
 * 
 * Tests:
 * - Territory spanning multiple sectors (Imperial Basin: 8, 9, 10)
 * - Only affected sectors destroyed, others protected
 * - Forces in different sectors of same territory
 * - Protected territory behavior
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, setPlayerPosition } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runStormScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

export async function testMultiSectorTerritory(): Promise<ScenarioResult> {
  console.log('\n🌪️  Setting up Multi-Sector Territory Scenario');

  // Build test state
  // Scenario: Imperial Basin spans sectors 8, 9, 10
  // Storm at 5, moves 3 sectors → hits sectors 6, 7, 8
  // Sector 8 is in Imperial Basin (protected), but storm passes through it
  let state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
    phase: Phase.STORM,
    turn: 2,
    advancedRules: true,
    stormSector: 5,
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TerritoryId.THE_MINOR_ERG, // Sand, sector 6
        sector: 6,
        regular: 10,
      },
      {
        faction: Faction.HARKONNEN,
        territory: TerritoryId.THE_MINOR_ERG, // Sand, sector 7
        sector: 7,
        regular: 8,
      },
      {
        faction: Faction.EMPEROR,
        territory: TerritoryId.IMPERIAL_BASIN, // Protected, sector 8
        sector: 8,
        regular: 5,
      },
      {
        faction: Faction.EMPEROR,
        territory: TerritoryId.IMPERIAL_BASIN, // Protected, sector 9 (not in storm path)
        sector: 9,
        regular: 3,
      },
      {
        faction: Faction.EMPEROR,
        territory: TerritoryId.IMPERIAL_BASIN, // Protected, sector 10 (not in storm path)
        sector: 10,
        regular: 2,
      },
    ],
    territorySpice: [
      {
        territory: TerritoryId.THE_MINOR_ERG,
        sector: 6,
        amount: 5,
      },
      {
        territory: TerritoryId.IMPERIAL_BASIN,
        sector: 8,
        amount: 10, // Should be protected
      },
      {
        territory: TerritoryId.IMPERIAL_BASIN,
        sector: 9,
        amount: 8, // Not in storm path
      },
    ],
  });

  // Set player positions
  state = setPlayerPosition(state, Faction.ATREIDES, 4);
  state = setPlayerPosition(state, Faction.HARKONNEN, 6);
  state = setPlayerPosition(state, Faction.EMPEROR, 11);

  // Queue agent responses
  const responses = new AgentResponseBuilder();
  responses.queueStormDial(Faction.ATREIDES, 1);
  responses.queueStormDial(Faction.HARKONNEN, 2);
  // Total: 3 sectors
  // Storm moves from 5 → 8 (passes through 6, 7, ends at 8)
  // Expected: Atreides forces in sector 6 destroyed
  // Expected: Harkonnen forces in sector 7 destroyed
  // Expected: Emperor forces in sectors 8, 9, 10 protected (Imperial Basin)
  // Expected: Spice in sector 6 destroyed
  // Expected: Spice in sectors 8, 9 protected (Imperial Basin)

  // Run scenario
  const result = await runStormScenario(
    state,
    responses,
    'Multi-Sector Territory'
  );

  logScenarioResults('Multi-Sector Territory', result);
  return result;
}

