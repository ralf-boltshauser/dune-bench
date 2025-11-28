/**
 * Scenario 4: Emperor Payment Collection
 * 
 * Tests Emperor receives payment for all card purchases.
 */

import { Faction } from '../../../types';
import { buildBiddingTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runBiddingScenario, logScenarioResults } from './base-scenario';

export async function testEmperorPayment() {
  console.log('\n' + '='.repeat(80));
  console.log('SCENARIO 4: Emperor Payment Collection');
  console.log('='.repeat(80));

  // Build state: Emperor in game, multiple factions will buy cards
  const state = buildBiddingTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR, Faction.FREMEN],
    spice: new Map([
      [Faction.ATREIDES, 15],
      [Faction.HARKONNEN, 20],
      [Faction.EMPEROR, 10], // Starting spice
      [Faction.FREMEN, 12],
    ]),
    handCards: new Map([
      [Faction.ATREIDES, []],
      [Faction.HARKONNEN, []],
      [Faction.EMPEROR, []],
      [Faction.FREMEN, []],
    ]),
  });

  // Queue responses:
  // Different factions win auctions, all pay Emperor
  const responses = new AgentResponseBuilder();
  
  // First card - Atreides wins
  responses.queueBid(Faction.ATREIDES, 1);
  responses.queueBid(Faction.HARKONNEN, 2);
  responses.queueBid(Faction.EMPEROR, 3);
  responses.queueBid(Faction.FREMEN, 4);
  responses.queueBid(Faction.ATREIDES, 5);
  responses.queuePass(Faction.HARKONNEN);
  responses.queuePass(Faction.EMPEROR);
  responses.queuePass(Faction.FREMEN);
  
  // Second card - Harkonnen wins
  responses.queueBid(Faction.HARKONNEN, 1);
  responses.queueBid(Faction.EMPEROR, 2);
  responses.queueBid(Faction.FREMEN, 3);
  responses.queueBid(Faction.ATREIDES, 4);
  responses.queueBid(Faction.HARKONNEN, 5);
  responses.queuePass(Faction.EMPEROR);
  responses.queuePass(Faction.FREMEN);
  responses.queuePass(Faction.ATREIDES);
  
  // Third card - Fremen wins
  responses.queueBid(Faction.EMPEROR, 1);
  responses.queueBid(Faction.FREMEN, 2);
  responses.queueBid(Faction.ATREIDES, 3);
  responses.queueBid(Faction.HARKONNEN, 4);
  responses.queueBid(Faction.FREMEN, 5);
  responses.queuePass(Faction.ATREIDES);
  responses.queuePass(Faction.HARKONNEN);
  responses.queuePass(Faction.EMPEROR);
  
  // Fourth card - Emperor wins (pays himself?)
  responses.queueBid(Faction.EMPEROR, 1);
  responses.queueBid(Faction.ATREIDES, 2);
  responses.queueBid(Faction.HARKONNEN, 3);
  responses.queueBid(Faction.FREMEN, 4);
  responses.queueBid(Faction.EMPEROR, 5);
  responses.queuePass(Faction.ATREIDES);
  responses.queuePass(Faction.HARKONNEN);
  responses.queuePass(Faction.FREMEN);

  const result = await runBiddingScenario(
    state,
    responses,
    'emperor-payment'
  );

  logScenarioResults('Emperor Payment', result);
  return result;
}

