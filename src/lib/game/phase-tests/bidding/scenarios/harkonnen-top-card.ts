/**
 * Scenario 5: Harkonnen Top Card Ability
 * 
 * Tests Harkonnen gets free card after each purchase.
 */

import { Faction } from '../../../types';
import { buildBiddingTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runBiddingScenario, logScenarioResults } from './base-scenario';

export async function testHarkonnenTopCard() {
  console.log('\n' + '='.repeat(80));
  console.log('SCENARIO 5: Harkonnen Top Card Ability');
  console.log('='.repeat(80));

  // Build state: Harkonnen will win multiple auctions
  const state = buildBiddingTestState({
    factions: [Faction.HARKONNEN, Faction.ATREIDES, Faction.EMPEROR],
    spice: new Map([
      [Faction.HARKONNEN, 20],
      [Faction.ATREIDES, 10],
      [Faction.EMPEROR, 15],
    ]),
    handCards: new Map([
      [Faction.HARKONNEN, []], // Empty hand, can win multiple
      [Faction.ATREIDES, []],
      [Faction.EMPEROR, []],
    ]),
  });

  // Queue responses:
  // Harkonnen wins at least 2 auctions, should get free card each time
  const responses = new AgentResponseBuilder();
  
  // First card - Harkonnen wins
  responses.queueBid(Faction.HARKONNEN, 1);
  responses.queueBid(Faction.ATREIDES, 2);
  responses.queueBid(Faction.EMPEROR, 3);
  responses.queueBid(Faction.HARKONNEN, 4);
  responses.queuePass(Faction.ATREIDES);
  responses.queuePass(Faction.EMPEROR);
  
  // Second card - Harkonnen wins again
  responses.queueBid(Faction.ATREIDES, 1);
  responses.queueBid(Faction.EMPEROR, 2);
  responses.queueBid(Faction.HARKONNEN, 3);
  responses.queuePass(Faction.ATREIDES);
  responses.queuePass(Faction.EMPEROR);
  
  // Third card - Atreides wins (Harkonnen already has 4 cards from 2 purchases + 2 free)
  responses.queueBid(Faction.EMPEROR, 1);
  responses.queueBid(Faction.ATREIDES, 2);
  responses.queueBid(Faction.HARKONNEN, 3);
  responses.queueBid(Faction.EMPEROR, 4);
  responses.queueBid(Faction.ATREIDES, 5);
  responses.queuePass(Faction.HARKONNEN); // Harkonnen might be at limit
  responses.queuePass(Faction.EMPEROR);

  const result = await runBiddingScenario(
    state,
    'harkonnen-top-card'
  );

  logScenarioResults('Harkonnen Top Card', result);
  return result;
}

