/**
 * Complex Multi-Faction Destruction Scenario
 * 
 * Tests destruction of multiple factions across multiple sectors.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, setPlayerPosition } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runStormScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

export async function testComplexMultiFaction(): Promise<ScenarioResult> {
  console.log('\n🌪️  Setting up Complex Multi-Faction Destruction');

  // Build test state with forces across multiple sectors
  let state = buildTestState({
    factions: [
      Faction.ATREIDES,
      Faction.HARKONNEN,
      Faction.BENE_GESSERIT,
      Faction.FREMEN,
      Faction.EMPEROR,
      Faction.SPACING_GUILD,
    ],
    phase: Phase.STORM,
    turn: 3,
    advancedRules: true,
    stormSector: 12,
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TerritoryId.MERIDIAN,
        sector: 13,
        regular: 10,
      },
      {
        faction: Faction.HARKONNEN,
        territory: TerritoryId.CIELAGO_NORTH,
        sector: 14,
        regular: 8,
      },
      {
        faction: Faction.BENE_GESSERIT,
        territory: TerritoryId.CIELAGO_SOUTH,
        sector: 15,
        regular: 6,
      },
      {
        faction: Faction.FREMEN,
        territory: TerritoryId.MERIDIAN,
        sector: 16,
        regular: 7, // Should lose 4 (half of 7, rounded up)
      },
      {
        faction: Faction.EMPEROR,
        territory: TerritoryId.ROCK_OUTCROPPINGS, // Protected
        sector: 17,
        regular: 5,
      },
      {
        faction: Faction.SPACING_GUILD,
        territory: TerritoryId.IMPERIAL_BASIN, // Protected
        sector: 0,
        regular: 4,
      },
    ],
    territorySpice: [
      {
        territory: TerritoryId.MERIDIAN,
        sector: 13,
        amount: 5,
      },
      {
        territory: TerritoryId.CIELAGO_NORTH,
        sector: 14,
        amount: 8,
      },
      {
        territory: TerritoryId.CIELAGO_SOUTH,
        sector: 15,
        amount: 3,
      },
    ],
  });

  // Set player positions
  state = setPlayerPosition(state, Faction.ATREIDES, 11);
  state = setPlayerPosition(state, Faction.HARKONNEN, 13);
  state = setPlayerPosition(state, Faction.BENE_GESSERIT, 15);
  state = setPlayerPosition(state, Faction.FREMEN, 17);
  state = setPlayerPosition(state, Faction.EMPEROR, 2);
  state = setPlayerPosition(state, Faction.SPACING_GUILD, 5);

  // Queue agent responses
  // Storm moves 4 sectors (from 12 to 16), hitting sectors 13-16
  const responses = new AgentResponseBuilder();
  responses.queueStormDial(Faction.ATREIDES, 2);
  responses.queueStormDial(Faction.HARKONNEN, 2);
  // Total: 4 sectors

  // Run scenario
  const result = await runStormScenario(
    state,
    responses,
    'Complex Multi-Faction Destruction'
  );

  logScenarioResults('Complex Multi-Faction Destruction', result);
  return result;
}

