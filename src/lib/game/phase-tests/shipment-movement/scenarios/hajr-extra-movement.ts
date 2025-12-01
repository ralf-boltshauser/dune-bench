/**
 * Test Scenario: HAJR Extra Movement Card
 * 
 * Tests HAJR card granting an extra movement action.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, addCardToHand, getDefaultSpice } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runPhaseScenario, logScenarioResults } from './base-scenario';

export async function testHajrExtraMovement() {
  console.log('\n🧪 Testing: HAJR Extra Movement Card');

  // Setup: Atreides has HAJR card and forces in multiple territories
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    phase: Phase.SHIPMENT_MOVEMENT,
    turn: 1,
    advancedRules: true,
    spice: getDefaultSpice(),
    forces: [
      // Atreides has forces in Arrakeen (ornithopter access at phase start)
      {
        faction: Faction.ATREIDES,
        territory: TerritoryId.ARRAKEEN,
        sector: 9,
        regular: 5,
      },
      // Atreides has forces in another territory
      {
        faction: Faction.ATREIDES,
        territory: TerritoryId.IMPERIAL_BASIN,
        sector: 9,
        regular: 3,
      },
      // Harkonnen forces
      {
        faction: Faction.HARKONNEN,
        territory: TerritoryId.CARTHAG,
        sector: 9,
        regular: 5,
      },
    ],
  });

  // Add HAJR card to Atreides hand
  const stateWithCard = addCardToHand(state, Faction.ATREIDES, 'hajr');

  // Queue responses
  const responses = new AgentResponseBuilder();

  // Atreides: Ship forces (normal shipment)
  responses.queueShipment(Faction.ATREIDES, {
    territoryId: TerritoryId.BASIN,
    sector: 9,
    regularCount: 5,
  });

  // Atreides: First movement (normal)
  responses.queueMovement(Faction.ATREIDES, {
    fromTerritoryId: TerritoryId.ARRAKEEN,
    fromSector: 9,
    toTerritoryId: TerritoryId.IMPERIAL_BASIN,
    toSector: 9,
    count: 5,
  });

  // Atreides: Play HAJR card (extra movement)
  // Note: This would be handled by the tool system, but we queue it as a card play
  responses.queuePlayHajr(Faction.ATREIDES);

  // Atreides: Second movement (extra movement from HAJR)
  responses.queueMovement(Faction.ATREIDES, {
    fromTerritoryId: TerritoryId.IMPERIAL_BASIN,
    fromSector: 9,
    toTerritoryId: TerritoryId.HOLE_IN_THE_ROCK,
    toSector: 9,
    count: 8, // Combined forces from both territories
  });

  // Harkonnen: Pass shipment
  responses.queuePassShipment(Faction.HARKONNEN);

  // Harkonnen: Pass movement
  responses.queuePassMovement(Faction.HARKONNEN);

  // Run scenario
  const result = await runPhaseScenario(
    stateWithCard,
    responses,
    'HAJR Extra Movement Card',
    200
  );

  logScenarioResults('HAJR Extra Movement Card', result);
  return result;
}

