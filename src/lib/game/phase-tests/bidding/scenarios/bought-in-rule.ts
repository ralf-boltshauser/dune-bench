/**
 * Scenario 6: Bought-In Rule (All Pass)
 * 
 * Tests bought-in rule when all eligible bidders pass.
 */

import { Faction } from '../../../types';
import { buildBiddingTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runBiddingScenario, logScenarioResults } from './base-scenario';

export async function testBoughtInRule() {
  console.log('\n' + '='.repeat(80));
  console.log('SCENARIO 6: Bought-In Rule (All Pass)');
  console.log('='.repeat(80));

  // Build state: All factions have low spice, will pass on first card
  const state = buildBiddingTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR],
    spice: new Map([
      [Faction.ATREIDES, 1], // Very low spice
      [Faction.HARKONNEN, 1],
      [Faction.EMPEROR, 1],
    ]),
    handCards: new Map([
      [Faction.ATREIDES, []],
      [Faction.HARKONNEN, []],
      [Faction.EMPEROR, []],
    ]),
  });

  // Queue responses:
  // All factions pass on first card (worthless card scenario)
  // This should trigger bought-in rule - all remaining cards returned to deck
  const responses = new AgentResponseBuilder();
  
  // First card - all pass (bought-in rule triggers)
  responses.queuePass(Faction.ATREIDES);
  responses.queuePass(Faction.HARKONNEN);
  responses.queuePass(Faction.EMPEROR);
  
  // No more responses needed - phase should end

  const result = await runBiddingScenario(
    state,
    responses,
    'bought-in-rule'
  );

  logScenarioResults('Bought-In Rule', result);
  return result;
}

