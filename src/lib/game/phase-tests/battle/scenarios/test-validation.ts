/**
 * Test Validation Scenario
 * 
 * Tests that validation catches illegal moves (using cards not in hand)
 */

import { Faction, TerritoryId } from '../../../types';
import { getFactionState, discardTreacheryCard } from '../../../state';
import { buildTestState, getDefaultSpice, getLeaderFromPool } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runBattleScenario, logScenarioResults } from './base-scenario';
import type { ScenarioResult } from './base-scenario';

export async function testValidation(): Promise<ScenarioResult> {
  console.log('\n🔍 Testing Validation: Illegal Card Usage');

  // Build test state
  let state = buildTestState({
    factions: [Faction.ATREIDES, Faction.BENE_GESSERIT],
    phase: undefined,
    turn: 1,
    advancedRules: true,
    spice: getDefaultSpice(),
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TerritoryId.ARRAKEEN,
        sector: 9,
        regular: 10,
        elite: 0,
      },
      {
        faction: Faction.BENE_GESSERIT,
        territory: TerritoryId.ARRAKEEN,
        sector: 9,
        regular: 8,
        elite: 0,
      },
    ],
  });

  // Get leaders
  const atreidesLeader = getLeaderFromPool(state, Faction.ATREIDES);
  const bgLeader = getLeaderFromPool(state, Faction.BENE_GESSERIT);

  if (!atreidesLeader || !bgLeader) {
    throw new Error('Could not find leaders for test');
  }

  // Check what cards BG actually has
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  console.log('BG hand before removal:', bgState.hand.map(c => c.definitionId));

  // Remove snooper_1 from BG's hand to test validation
  // Find if they have snooper_1
  const hasSnooper = bgState.hand.some(c => c.definitionId === 'snooper_1');
  if (hasSnooper) {
    state = discardTreacheryCard(state, Faction.BENE_GESSERIT, 'snooper_1');
    const bgStateAfter = getFactionState(state, Faction.BENE_GESSERIT);
    console.log('BG hand after removing snooper_1:', bgStateAfter.hand.map(c => c.definitionId));
  } else {
    console.log('BG does not have snooper_1, test will still work');
  }

  // Build agent responses
  const responses = new AgentResponseBuilder();

  // Aggressor chooses battle
  responses.queueBattleChoice(
    Faction.ATREIDES,
    TerritoryId.ARRAKEEN,
    Faction.BENE_GESSERIT,
    9
  );

  // Skip prescience
  responses.queuePrescience(Faction.ATREIDES, null); // Pass

  // Battle plans - BG tries to use 'snooper_1' which they DON'T have
  responses.queueBattlePlan(Faction.ATREIDES, {
    leaderId: atreidesLeader,
    forcesDialed: 5,
    weaponCardId: null,
    defenseCardId: null,
    spiceDialed: 0,
  });

  responses.queueBattlePlan(Faction.BENE_GESSERIT, {
    leaderId: bgLeader,
    forcesDialed: 4,
    weaponCardId: null,
    defenseCardId: 'snooper_1', // This should fail validation!
    spiceDialed: 0,
  });

  // Run scenario
  const result = await runBattleScenario(
    state,
    responses,
    'Validation Test (Illegal Card Usage)'
  );
  logScenarioResults('Validation Test (Illegal Card Usage)', result);

  return result;
}

// Run if executed directly
if (require.main === module) {
  testValidation().catch(console.error);
}

