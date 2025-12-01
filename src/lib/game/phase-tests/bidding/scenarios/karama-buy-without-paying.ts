/**
 * Scenario 1: Karama Card - Buy Without Paying
 * 
 * Tests Karama card used to buy treachery card without paying spice.
 */

import { Faction } from '../../../types';
import { buildBiddingTestState, getKaramaCardId } from '../helpers/test-state-builder';
import { runBiddingScenario, logScenarioResults } from './base-scenario';

export async function testKaramaBuyWithoutPaying() {
  console.log('\n' + '='.repeat(80));
  console.log('SCENARIO 1: Karama Card - Buy Without Paying');
  console.log('='.repeat(80));

  // Build state: Atreides has Karama, low spice, other factions have more
  const state = buildBiddingTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
    spice: new Map([
      [Faction.ATREIDES, 2], // Low spice - will use Karama to buy without paying
      [Faction.HARKONNEN, 10],
      [Faction.EMPEROR, 15],
    ]),
    handCards: new Map([
      [Faction.ATREIDES, ['karama_1']], // Atreides has Karama
      [Faction.HARKONNEN, []],
      [Faction.EMPEROR, []],
    ]),
  });

  // Note: In this test, REAL LLM agents will make decisions
  // Atreides has a Karama card and may choose to use it
  // We're testing how real agents handle the bidding phase with Karama available
  // Agents will see the game state, their cards, spice, and make decisions
  
  // Run the scenario with REAL agents
  // Agents will analyze the game state and make decisions using their tools
  const result = await runBiddingScenario(
    state,
    'karama-buy-without-paying',
    100,
    {
      model: 'gpt-5-mini', // Use gpt-5-mini
      temperature: 0.7,
      verbose: false,
    }
  );

  logScenarioResults('Karama Buy Without Paying', result);
  return result;
}

