/**
 * Scenario 3: Atreides Prescience - Sees Cards
 * 
 * Tests Atreides ability to see cards before bidding.
 */

import { Faction } from '../../../types';
import { buildBiddingTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runBiddingScenario, logScenarioResults } from './base-scenario';

export async function testAtreidesPrescience() {
  console.log('\n' + '='.repeat(80));
  console.log('SCENARIO 3: Atreides Prescience - Sees Cards');
  console.log('='.repeat(80));

  // Build state: Atreides can see cards, others cannot
  const state = buildBiddingTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
    spice: new Map([
      [Faction.ATREIDES, 15],
      [Faction.HARKONNEN, 10],
      [Faction.EMPEROR, 12],
    ]),
    handCards: new Map([
      [Faction.ATREIDES, []],
      [Faction.HARKONNEN, []],
      [Faction.EMPEROR, []],
    ]),
  });

  // Queue responses:
  // Atreides sees cards and bids strategically
  // Other factions bid blindly
  const responses = new AgentResponseBuilder();
  
  // First card (valuable - e.g., Lasgun)
  // Atreides sees it's valuable, bids high
  responses.queueBid(Faction.ATREIDES, 5); // Atreides sees value
  responses.queueBid(Faction.HARKONNEN, 6); // Harkonnen bids blindly
  responses.queueBid(Faction.EMPEROR, 7); // Emperor bids
  responses.queueBid(Faction.ATREIDES, 8); // Atreides wants it
  responses.queuePass(Faction.HARKONNEN);
  responses.queuePass(Faction.EMPEROR);
  
  // Second card (worthless - e.g., Baliset)
  // Atreides sees it's worthless, passes early
  responses.queuePass(Faction.HARKONNEN); // Harkonnen opens (Atreides passed)
  responses.queueBid(Faction.EMPEROR, 1); // Emperor bids
  responses.queueBid(Faction.HARKONNEN, 2);
  responses.queuePass(Faction.EMPEROR);
  
  // Third card (weapon - e.g., Crysknife)
  // Atreides sees it's useful, bids moderately
  responses.queueBid(Faction.EMPEROR, 1);
  responses.queueBid(Faction.ATREIDES, 2); // Atreides sees it's useful
  responses.queueBid(Faction.HARKONNEN, 3);
  responses.queueBid(Faction.EMPEROR, 4);
  responses.queuePass(Faction.ATREIDES); // Atreides doesn't overpay
  responses.queuePass(Faction.HARKONNEN);

  const result = await runBiddingScenario(
    state,
    'atreides-prescience'
  );

  logScenarioResults('Atreides Prescience', result);
  return result;
}

