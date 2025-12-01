/**
 * Scenario 8: Complex Multi-Card with All Abilities
 * 
 * Tests all faction abilities in complex scenario.
 */

import { Faction } from '../../../types';
import { buildBiddingTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runBiddingScenario, logScenarioResults } from './base-scenario';

export async function testComplexMultiCard() {
  console.log('\n' + '='.repeat(80));
  console.log('SCENARIO 8: Complex Multi-Card with All Abilities');
  console.log('='.repeat(80));

  // Build state: All 6 factions with various abilities
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
      [Faction.ATREIDES, 20],
      [Faction.HARKONNEN, 25],
      [Faction.EMPEROR, 15],
      [Faction.FREMEN, 10],
      [Faction.BENE_GESSERIT, 12],
      [Faction.SPACING_GUILD, 8],
    ]),
    handCards: new Map([
      [Faction.ATREIDES, ['karama_1']], // Atreides has Karama
      [Faction.HARKONNEN, []],
      [Faction.EMPEROR, []],
      [Faction.FREMEN, []],
      [Faction.BENE_GESSERIT, []],
      [Faction.SPACING_GUILD, []],
    ]),
  });

  // Queue responses: Complex bidding with all abilities
  const responses = new AgentResponseBuilder();
  
  // First card - Atreides uses Karama, Harkonnen wins and gets free card
  responses.queueBid(Faction.ATREIDES, 1); // Atreides bids (will use Karama)
  responses.queueBid(Faction.HARKONNEN, 2);
  responses.queueBid(Faction.EMPEROR, 3);
  responses.queueBid(Faction.FREMEN, 4);
  responses.queueBid(Faction.BENE_GESSERIT, 5);
  responses.queueBid(Faction.SPACING_GUILD, 6);
  responses.queueBid(Faction.ATREIDES, 7); // Atreides uses Karama
  responses.queueBid(Faction.HARKONNEN, 8);
  responses.queuePass(Faction.EMPEROR);
  responses.queuePass(Faction.FREMEN);
  responses.queuePass(Faction.BENE_GESSERIT);
  responses.queuePass(Faction.SPACING_GUILD);
  responses.queuePass(Faction.ATREIDES);
  
  // Second card - Emperor wins (pays himself?)
  responses.queueBid(Faction.HARKONNEN, 1);
  responses.queueBid(Faction.EMPEROR, 2);
  responses.queueBid(Faction.FREMEN, 3);
  responses.queueBid(Faction.BENE_GESSERIT, 4);
  responses.queueBid(Faction.SPACING_GUILD, 5);
  responses.queueBid(Faction.ATREIDES, 6);
  responses.queueBid(Faction.HARKONNEN, 7);
  responses.queueBid(Faction.EMPEROR, 8);
  responses.queuePass(Faction.FREMEN);
  responses.queuePass(Faction.BENE_GESSERIT);
  responses.queuePass(Faction.SPACING_GUILD);
  responses.queuePass(Faction.ATREIDES);
  responses.queuePass(Faction.HARKONNEN);
  
  // Third card - Fremen wins
  responses.queueBid(Faction.FREMEN, 1);
  responses.queueBid(Faction.BENE_GESSERIT, 2);
  responses.queueBid(Faction.SPACING_GUILD, 3);
  responses.queueBid(Faction.ATREIDES, 4);
  responses.queueBid(Faction.HARKONNEN, 5);
  responses.queueBid(Faction.EMPEROR, 6);
  responses.queueBid(Faction.FREMEN, 7);
  responses.queuePass(Faction.BENE_GESSERIT);
  responses.queuePass(Faction.SPACING_GUILD);
  responses.queuePass(Faction.ATREIDES);
  responses.queuePass(Faction.HARKONNEN);
  responses.queuePass(Faction.EMPEROR);
  
  // Fourth card - Bene Gesserit wins
  responses.queueBid(Faction.BENE_GESSERIT, 1);
  responses.queueBid(Faction.SPACING_GUILD, 2);
  responses.queueBid(Faction.ATREIDES, 3);
  responses.queueBid(Faction.HARKONNEN, 4);
  responses.queueBid(Faction.EMPEROR, 5);
  responses.queueBid(Faction.BENE_GESSERIT, 6);
  responses.queuePass(Faction.SPACING_GUILD);
  responses.queuePass(Faction.ATREIDES);
  responses.queuePass(Faction.HARKONNEN);
  responses.queuePass(Faction.EMPEROR);
  
  // Fifth card - Spacing Guild wins
  responses.queueBid(Faction.SPACING_GUILD, 1);
  responses.queueBid(Faction.ATREIDES, 2);
  responses.queueBid(Faction.HARKONNEN, 3);
  responses.queueBid(Faction.EMPEROR, 4);
  responses.queueBid(Faction.SPACING_GUILD, 5);
  responses.queuePass(Faction.ATREIDES);
  responses.queuePass(Faction.HARKONNEN);
  responses.queuePass(Faction.EMPEROR);

  const result = await runBiddingScenario(
    state,
    'complex-multi-card'
  );

  logScenarioResults('Complex Multi-Card', result);
  return result;
}

