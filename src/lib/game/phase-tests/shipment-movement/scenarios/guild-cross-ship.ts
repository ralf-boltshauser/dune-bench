/**
 * Test Scenario: Spacing Guild Cross-Ship and Off-Planet
 * 
 * Tests Guild's special shipment abilities.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, getDefaultSpice } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runPhaseScenario, logScenarioResults } from './base-scenario';

export async function testGuildCrossShip() {
  console.log('\n🧪 Testing: Spacing Guild Cross-Ship and Off-Planet');

  // Setup: Guild with forces on board
  const state = buildTestState({
    factions: [Faction.SPACING_GUILD, Faction.ATREIDES],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    spice: getDefaultSpice(),
    forces: [
      // Guild forces on board
      {
        faction: Faction.SPACING_GUILD,
        territory: TerritoryId.ARRAKEEN,
        sector: 9,
        regular: 5,
      },
      {
        faction: Faction.SPACING_GUILD,
        territory: TerritoryId.CARTHAG,
        sector: 9,
        regular: 3,
      },
      // Atreides forces
      {
        faction: Faction.ATREIDES,
        territory: TerritoryId.IMPERIAL_BASIN,
        sector: 9,
        regular: 5,
      },
    ],
  });

  const responses = new AgentResponseBuilder();

  // Guild: Act NOW
  responses.queueGuildActNow(Faction.SPACING_GUILD);

  // Guild: Cross-ship forces between territories
  responses.queueGuildCrossShip(Faction.SPACING_GUILD, {
    fromTerritoryId: TerritoryId.ARRAKEEN,
    fromSector: 9,
    toTerritoryId: TerritoryId.CARTHAG,
    toSector: 9,
    count: 5,
  });

  // Guild: Ship some forces off-planet (board to reserves)
  responses.queueGuildOffPlanet(Faction.SPACING_GUILD, {
    fromTerritoryId: TerritoryId.CARTHAG,
    fromSector: 9,
    count: 3,
  });

  // Guild: Move forces (normal movement)
  responses.queuePassMovement(Faction.SPACING_GUILD);

  // Atreides: Pass shipment
  responses.queuePassShipment(Faction.ATREIDES);

  // Atreides: Pass movement
  responses.queuePassMovement(Faction.ATREIDES);

  // Run scenario
  const result = await runPhaseScenario(
    state,
    responses,
    'Spacing Guild Cross-Ship and Off-Planet',
    200
  );

  logScenarioResults('Spacing Guild Cross-Ship and Off-Planet', result);
  return result;
}

