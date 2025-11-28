/**
 * Scenario 2: Multiple Factions Bidding War
 * 
 * Tests 4+ factions all bidding on same card with competitive bidding.
 */

import { Faction } from '../../../types';
import { buildBiddingTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runBiddingScenario, logScenarioResults } from './base-scenario';

export async function testMultipleFactionsBiddingWar() {
  console.log('\n' + '='.repeat(80));
  console.log('SCENARIO 2: Multiple Factions Bidding War');
  console.log('='.repeat(80));

  // Build state: All 6 factions with sufficient spice
  const state = buildBiddingTestState({
    factions: [
      Faction.ATREIDES,
      Faction.HARKONNEN,
      Faction.EMPEROR,
      Faction.FREMEN,
      Faction.BENE_GESSERIT,
      Faction.SPACING_GUILD,
    ],
    spice: new Map([
      [Faction.ATREIDES, 15],
      [Faction.HARKONNEN, 20],
      [Faction.EMPEROR, 25],
      [Faction.FREMEN, 10],
      [Faction.BENE_GESSERIT, 12],
      [Faction.SPACING_GUILD, 8],
    ]),
    handCards: new Map([
      [Faction.ATREIDES, []],
      [Faction.HARKONNEN, []],
      [Faction.EMPEROR, []],
      [Faction.FREMEN, []],
      [Faction.BENE_GESSERIT, []],
      [Faction.SPACING_GUILD, []],
    ]),
  });

  // Queue responses: Competitive bidding war
  const responses = new AgentResponseBuilder();
  
  // First card - bidding war
  responses.queueBid(Faction.ATREIDES, 1); // Opening bid
  responses.queueBid(Faction.HARKONNEN, 2);
  responses.queueBid(Faction.EMPEROR, 3);
  responses.queueBid(Faction.FREMEN, 4);
  responses.queueBid(Faction.BENE_GESSERIT, 5);
  responses.queueBid(Faction.SPACING_GUILD, 6);
  responses.queueBid(Faction.ATREIDES, 7);
  responses.queuePass(Faction.HARKONNEN); // Harkonnen passes
  responses.queueBid(Faction.EMPEROR, 8);
  responses.queuePass(Faction.FREMEN); // Fremen passes
  responses.queueBid(Faction.BENE_GESSERIT, 9);
  responses.queuePass(Faction.SPACING_GUILD); // Guild passes
  responses.queuePass(Faction.ATREIDES); // Atreides passes
  responses.queuePass(Faction.EMPEROR); // Emperor passes (BG wins)
  
  // Second card - shorter bidding
  responses.queueBid(Faction.HARKONNEN, 1);
  responses.queueBid(Faction.EMPEROR, 2);
  responses.queueBid(Faction.FREMEN, 3);
  responses.queuePass(Faction.SPACING_GUILD);
  responses.queuePass(Faction.ATREIDES);
  responses.queueBid(Faction.HARKONNEN, 4);
  responses.queuePass(Faction.EMPEROR);
  responses.queuePass(Faction.FREMEN);
  
  // Third card - quick pass
  responses.queueBid(Faction.EMPEROR, 1);
  responses.queuePass(Faction.FREMEN);
  responses.queuePass(Faction.SPACING_GUILD);
  responses.queuePass(Faction.ATREIDES);
  responses.queuePass(Faction.HARKONNEN);
  responses.queuePass(Faction.BENE_GESSERIT);

  const result = await runBiddingScenario(
    state,
    'multiple-factions-bidding-war'
  );

  logScenarioResults('Multiple Factions Bidding War', result);
  return result;
}

