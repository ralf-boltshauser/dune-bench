/**
 * E2E Stronghold Battle Test
 * 
 * True end-to-end test where agents make decisions based on game state.
 * Uses PhaseManager and BattlePhaseHandler to run the actual battle phase.
 */

import { Faction, Phase, TerritoryId } from '../../../types';
import { buildTestState, getDefaultSpice, addCardToHand } from '../helpers/test-state-builder';
import '../../../agent/env-loader';
import { createAgentProvider } from '../../../agent/azure-provider';
import { PhaseManager } from '../../../phases/phase-manager';
import { createAllPhaseHandlers } from '../../../phases/handlers';
import { TestLogger } from '../../helpers/test-logger';
import { getFactionState } from '../../../state';

export async function testE2EStrongholdBattle(): Promise<void> {
  console.log('\n🏰 E2E Stronghold Battle Test: Atreides vs Bene Gesserit');
  console.log('Agents will make decisions based on game state\n');

  // Build test state with forces in the same territory (will trigger battle)
  let state = buildTestState({
    factions: [Faction.ATREIDES, Faction.BENE_GESSERIT],
    phase: Phase.BATTLE, // Set to battle phase
    turn: 1,
    advancedRules: true,
    spice: getDefaultSpice(),
    forces: [
      {
        faction: Faction.ATREIDES,
        territory: TerritoryId.ARRAKEEN, // Stronghold
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
    territorySpice: [
      {
        territory: TerritoryId.ARRAKEEN,
        sector: 9,
        amount: 20,
      },
    ],
    specialStates: {
      atreides: {
        kwisatzHaderachActive: true, // Atreides has KH active
      },
    },
  });

  // Add some cards to hands so agents have options
  state = addCardToHand(state, Faction.ATREIDES, 'shield_1');
  state = addCardToHand(state, Faction.BENE_GESSERIT, 'snooper_1');

  // Choose agent provider type
  // Always use Azure OpenAI agent provider
  const agentProvider = createAgentProvider(state, {
    verbose: false, // Set to true for detailed Azure OpenAI logs
  });
  console.log('Using Azure OpenAI agents');

  // Create phase manager
  const phaseManager = new PhaseManager(agentProvider);
  phaseManager.registerHandlers(createAllPhaseHandlers());

  // Create logger
  const logger = new TestLogger('E2E Stronghold Battle', 'battle');

  // Log initial state
  logger.logState(0, 'Initial State', state);
  logger.logInfo(0, 'Starting E2E battle phase test');

  // Add event listener to log all events
  phaseManager.addEventListener((event) => {
    allEvents.push({
      type: event.type,
      message: event.message,
    });
    logger.logEvent(stepCount, {
      type: event.type,
      message: event.message,
      data: event.data,
    });
    stepCount++;
  });

  // Collect events for logging
  const allEvents: Array<{ type: string; message: string }> = [];
  let stepCount = 0;

  // Run the battle phase
  try {
    const finalState = await phaseManager.runPhase(state, Phase.BATTLE);

    // Log final state
    logger.logState(stepCount, 'Final State', finalState);

    // Log summary
    logger.logInfo(stepCount, '\n=== E2E Test Summary ===');
    logger.logInfo(stepCount, `Atreides forces: ${getFactionState(finalState, Faction.ATREIDES).forces.onBoard.find(f => f.territoryId === TerritoryId.ARRAKEEN && f.sector === 9)?.forces.regular ?? 0}`);
    logger.logInfo(stepCount, `Atreides spice: ${getFactionState(finalState, Faction.ATREIDES).spice}`);
    logger.logInfo(stepCount, `BG forces: ${getFactionState(finalState, Faction.BENE_GESSERIT).forces.onBoard.find(f => f.territoryId === TerritoryId.ARRAKEEN && f.sector === 9)?.forces.regular ?? 0}`);
    logger.logInfo(stepCount, `BG spice: ${getFactionState(finalState, Faction.BENE_GESSERIT).spice}`);

    // Write log file
    logger.writeLog({
      state: finalState,
      events: allEvents,
      stepCount,
      completed: true,
    });

    console.log('\n✅ E2E test completed successfully!');
  } catch (error) {
    logger.logError(stepCount, `E2E test failed: ${error}`);
    
    // Write log file even on error
    logger.writeLog({
      state: state,
      events: allEvents,
      stepCount,
      completed: false,
      error: error as Error,
    });

    console.error('\n❌ E2E test failed:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  testE2EStrongholdBattle().catch(console.error);
}

