/**
 * Scenario 7: Hand Size Changes Mid-Auction
 * 
 * Tests faction becomes ineligible during bidding.
 */

import { Faction } from '../../../types';
import { buildBiddingTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runBiddingScenario, logScenarioResults } from './base-scenario';

export async function testHandSizeChanges() {
  console.log('\n' + '='.repeat(80));
  console.log('SCENARIO 7: Hand Size Changes Mid-Auction');
  console.log('='.repeat(80));

  // Build state: Atreides has 3 cards (1 away from full)
  const state = buildBiddingTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
    spice: new Map([
      [Faction.ATREIDES, 15],
      [Faction.HARKONNEN, 10],
      [Faction.EMPEROR, 12],
    ]),
    handCards: new Map([
      [Faction.ATREIDES, ['crysknife', 'shield_1', 'snooper_1']], // 3 cards
      [Faction.HARKONNEN, []],
      [Faction.EMPEROR, []],
    ]),
  });

  // Queue responses:
  // Atreides wins first card (now at 4, ineligible)
  // Second card auction - Atreides should be skipped
  const responses = new AgentResponseBuilder();
  
  // First card - Atreides wins (goes to 4 cards, becomes ineligible)
  responses.queueBid(Faction.ATREIDES, 1);
  responses.queueBid(Faction.HARKONNEN, 2);
  responses.queueBid(Faction.EMPEROR, 3);
  responses.queueBid(Faction.ATREIDES, 4);
  responses.queuePass(Faction.HARKONNEN);
  responses.queuePass(Faction.EMPEROR);
  
  // Second card - Atreides should be skipped (ineligible)
  // Harkonnen and Emperor bid
  responses.queueBid(Faction.HARKONNEN, 1);
  responses.queueBid(Faction.EMPEROR, 2);
  responses.queueBid(Faction.HARKONNEN, 3);
  responses.queuePass(Faction.EMPEROR);
  
  // Third card - Atreides still ineligible
  responses.queueBid(Faction.EMPEROR, 1);
  responses.queuePass(Faction.HARKONNEN);

  const result = await runBiddingScenario(
    state,
    responses,
    'hand-size-changes'
  );

  logScenarioResults('Hand Size Changes', result);
  return result;
}

