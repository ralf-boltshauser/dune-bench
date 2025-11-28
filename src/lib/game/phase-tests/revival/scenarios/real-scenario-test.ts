/**
 * Real Scenario Test - Runs actual handler with difficult scenario
 * 
 * This follows the pattern:
 * 1. Set up a difficult scenario
 * 2. Run the real handler/implementation
 * 3. Provide controlled inputs (to test specific cases)
 * 4. Generate comprehensive logs
 * 5. Manually review logs to validate correctness
 */

import { RevivalPhaseHandler } from '../../../phases/handlers/revival';
import { MockAgentProvider } from '../../../phases/phase-manager';
import { TestLogger } from '../../helpers/test-logger';
import { buildTestState } from '../helpers/test-state-builder';
import { Faction, Phase } from '../../../types';
import type { AgentResponse } from '../../../phases/types';

/**
 * Difficult Scenario: Fremen Alliance Boost with Multiple Factions
 * 
 * This scenario tests:
 * - Fremen must decide on alliance boost FIRST (before other factions)
 * - Atreides gets 3 free revivals if boost granted
 * - Multiple factions reviving simultaneously (no storm order)
 * - Mix of force and leader revivals
 * - Edge case: Fremen has no forces in tanks (should still be asked about boost)
 */
async function runRealScenario() {
  console.log('='.repeat(80));
  console.log('REAL REVIVAL PHASE SCENARIO TEST');
  console.log('='.repeat(80));
  console.log('');

  // ============================================================================
  // STEP 1: Set up a difficult scenario
  // ============================================================================
  console.log('Step 1: Setting up difficult scenario...');
  
  const state = buildTestState({
    factions: [
      Faction.FREMEN,
      Faction.ATREIDES,
      Faction.EMPEROR,
      Faction.HARKONNEN,
    ],
    phase: Phase.REVIVAL,
    turn: 3,
    alliances: [
      [Faction.FREMEN, Faction.ATREIDES], // Fremen allied with Atreides
      [Faction.EMPEROR, Faction.HARKONNEN], // Emperor allied with Harkonnen
    ],
    forcesInTanks: new Map([
      [Faction.FREMEN, { regular: 0 }], // No forces - but should still be asked about boost
      [Faction.ATREIDES, { regular: 10 }], // Many forces to revive
      [Faction.EMPEROR, { regular: 5, elite: 1 }], // Has Sardaukar
      [Faction.HARKONNEN, { regular: 8 }],
    ]),
    spice: new Map([
      [Faction.FREMEN, 5], // Low spice
      [Faction.ATREIDES, 20], // Can afford paid revival
      [Faction.EMPEROR, 30], // Rich, can afford max
      [Faction.HARKONNEN, 1], // Very low spice
    ]),
    leadersInTanks: new Map([
      [Faction.ATREIDES, ['atreides_duke_leto']], // Leader to revive
    ]),
    specialStates: {
      atreides: {
        allLeadersDeadOnce: true, // Can revive leader
      },
    },
  });

  console.log('✓ Scenario setup complete');
  console.log('  - Fremen allied with Atreides (should grant boost)');
  console.log('  - Atreides has 10 forces + 1 leader in tanks');
  console.log('  - Emperor has 5 regular + 1 Sardaukar');
  console.log('  - Harkonnen has 8 forces but only 1 spice');
  console.log('');

  // ============================================================================
  // STEP 2: Run the real handler/implementation
  // ============================================================================
  console.log('Step 2: Running real RevivalPhaseHandler...');
  
  const handler = new RevivalPhaseHandler();
  const provider = new MockAgentProvider('pass');
  const logger = new TestLogger(
    'Fremen Alliance Boost - Complex Multi-Faction',
    'revival'
  );

  // Log initial state
  logger.logState(0, 'Initial State', state);
  logger.logInfo(0, 'Scenario: Fremen Alliance Boost with Multiple Factions');
  logger.logInfo(0, 'Testing: Fremen boost decision, simultaneous revival, edge cases');

  // ============================================================================
  // STEP 3: Provide controlled inputs (to test specific cases)
  // ============================================================================
  console.log('Step 3: Queuing controlled agent responses...');
  
  // Fremen grants boost to Atreides (this should be asked FIRST)
  provider.queueResponse('GRANT_FREMEN_REVIVAL_BOOST', {
    factionId: Faction.FREMEN,
    actionType: 'GRANT_FREMEN_REVIVAL_BOOST',
    data: {},
    passed: false,
  });

  // Atreides: 3 free (from Fremen boost) + 1 paid + leader revival
  provider.queueResponse('REVIVE_FORCES', {
    factionId: Faction.ATREIDES,
    actionType: 'REVIVE_FORCES',
    data: { count: 1 }, // 1 additional beyond free
    passed: false,
  });
  provider.queueResponse('REVIVE_LEADER', {
    factionId: Faction.ATREIDES,
    actionType: 'REVIVE_LEADER',
    data: { leaderId: 'atreides_duke_leto' },
    passed: false,
  });

  // Fremen: Pass (no forces in tanks)
  provider.queueResponse('REVIVE_FORCES', {
    factionId: Faction.FREMEN,
    actionType: 'PASS',
    data: {},
    passed: true,
  });

  // Emperor: 1 free + 2 paid (max revival) + 1 Sardaukar
  provider.queueResponse('REVIVE_FORCES', {
    factionId: Faction.EMPEROR,
    actionType: 'REVIVE_FORCES',
    data: { count: 2 }, // 2 additional beyond free
    passed: false,
  });

  // Harkonnen: 2 free only (only 1 spice, can't afford paid)
  provider.queueResponse('REVIVE_FORCES', {
    factionId: Faction.HARKONNEN,
    actionType: 'REVIVE_FORCES',
    data: { count: 0 }, // Only free revival
    passed: false,
  });

  console.log('✓ Responses queued');
  console.log('  - Fremen: Grant boost');
  console.log('  - Atreides: 3 free + 1 paid + leader');
  console.log('  - Fremen: Pass (no forces)');
  console.log('  - Emperor: 1 free + 2 paid + Sardaukar');
  console.log('  - Harkonnen: 2 free only');
  console.log('');

  // ============================================================================
  // STEP 4: Generate comprehensive logs
  // ============================================================================
  console.log('Step 4: Executing phase and generating logs...');

  // Initialize phase
  const initResult = handler.initialize(state);
  
  logger.logInfo(0, 'Phase initialized');
  initResult.events.forEach(event => {
    logger.logEvent(0, {
      type: event.type,
      message: event.message,
      data: event.data,
    });
  });

  const events: Array<{ type: string; message: string }> = [];
  let currentState = initResult.state;
  let responsesQueue: AgentResponse[] = [];
  let stepCount = 0;
  let phaseComplete = initResult.phaseComplete;

  // Process steps
  while (!phaseComplete && stepCount < 100) {
    stepCount++;
    
    // Log pending requests
    if (stepCount === 1 && initResult.pendingRequests.length > 0) {
      logger.logInfo(stepCount, `Step ${stepCount}: Initial requests`);
      initResult.pendingRequests.forEach(req => {
        logger.logRequest(stepCount, undefined, {
          factionId: req.factionId,
          requestType: req.requestType,
          prompt: req.prompt,
          context: req.context,
          availableActions: req.availableActions,
        });
      });
    }
    
    const stepResult = handler.processStep(currentState, responsesQueue);
    currentState = stepResult.state;
    phaseComplete = stepResult.phaseComplete;

    // Log responses
    if (responsesQueue.length > 0) {
      logger.logInfo(stepCount, `Step ${stepCount}: Processing ${responsesQueue.length} responses`);
      responsesQueue.forEach(response => {
        logger.logResponse(stepCount, {
          factionId: response.factionId,
          actionType: response.actionType,
          data: response.data,
          passed: response.passed,
        });
      });
    }

    // Log events
    if (stepResult.events.length > 0) {
      stepResult.events.forEach(event => {
        events.push({
          type: event.type,
          message: event.message,
        });
        logger.logEvent(stepCount, {
          type: event.type,
          message: event.message,
          data: event.data,
        });
      });
    }

    // Log pending requests for next step
    if (stepResult.pendingRequests.length > 0) {
      logger.logInfo(stepCount, `Step ${stepCount}: New requests pending`);
      stepResult.pendingRequests.forEach(req => {
        logger.logRequest(stepCount + 1, undefined, {
          factionId: req.factionId,
          requestType: req.requestType,
          prompt: req.prompt,
          context: req.context,
          availableActions: req.availableActions,
        });
      });
    }

    // Log state snapshot at key points
    if (stepCount === 1 || stepCount % 3 === 0 || phaseComplete) {
      logger.logState(stepCount, `State after step ${stepCount}`, currentState);
    }

    if (phaseComplete) {
      logger.logState(stepCount, 'Final State', currentState);
      logger.logInfo(stepCount, 'Phase completed successfully');
      break;
    }

    if (stepResult.pendingRequests.length > 0) {
      // Get agent responses
      responsesQueue = await provider.getResponses(
        stepResult.pendingRequests,
        stepResult.simultaneousRequests || false
      );
    } else {
      responsesQueue = [];
    }
  }

  // ============================================================================
  // STEP 5: Write logs and summary
  // ============================================================================
  const result = {
    state: currentState,
    events,
    stepCount,
    completed: phaseComplete,
  };

  logger.writeLog(result);

  console.log('✓ Logs generated');
  console.log(`  - Steps executed: ${stepCount}`);
  console.log(`  - Events: ${events.length}`);
  console.log(`  - Phase completed: ${phaseComplete ? 'Yes' : 'No'}`);
  console.log('');
  console.log('Log file written to: test-logs/revival/');
  console.log('='.repeat(80));

  return result;
}

// Run the scenario
if (require.main === module) {
  runRealScenario().catch(console.error);
}

export { runRealScenario };

