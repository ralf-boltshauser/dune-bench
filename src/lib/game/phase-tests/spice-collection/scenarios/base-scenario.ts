/**
 * Base Scenario Utilities
 * 
 * Common utilities for spice collection phase test scenarios.
 * 
 * Note: Spice collection is automatic - no agent responses needed.
 * Phase completes immediately in initialize().
 */

import { SpiceCollectionPhaseHandler } from '../../../phases/handlers/spice-collection';
import { TestLogger } from '../../helpers/test-logger';
import type { GameState } from '../../../types';
import type { PhaseEvent } from '../../../phases/types';

export interface ScenarioResult {
  state: GameState;
  events: Array<{ type: string; message: string }>;
  stepCount: number;
  completed: boolean;
  error?: Error;
}

interface SpiceLocationInfo {
  territory: string;
  sector: number;
  amount: number;
}

interface FactionSpiceInfo {
  faction: string;
  spice: number;
  forcesOnBoard: Array<{
    territory: string;
    sector: number;
    regular: number;
    elite: number;
    total: number;
  }>;
}

interface FactionSpiceDelta extends FactionSpiceInfo {
  initialSpice: number;
  finalSpice: number;
  delta: number;
}

/**
 * Extract spice location information from game state
 */
function extractSpiceLocations(state: GameState): SpiceLocationInfo[] {
  return state.spiceOnBoard.map(s => ({
    territory: s.territoryId,
    sector: s.sector,
    amount: s.amount,
  }));
}

/**
 * Extract faction spice information from game state
 */
function extractFactionSpiceInfo(state: GameState): FactionSpiceInfo[] {
  return Array.from(state.factions.entries()).map(([faction, fs]) => ({
    faction,
    spice: fs.spice,
    forcesOnBoard: fs.forces.onBoard.map(f => ({
      territory: f.territoryId,
      sector: f.sector,
      regular: f.forces.regular,
      elite: f.forces.elite,
      total: f.forces.regular + f.forces.elite,
    })),
  }));
}

/**
 * Calculate spice deltas between initial and final states
 */
function calculateSpiceDeltas(
  initialState: GameState,
  finalState: GameState
): FactionSpiceDelta[] {
  return Array.from(finalState.factions.entries()).map(([faction, fs]) => {
    const initialSpice = initialState.factions.get(faction)?.spice ?? 0;
    const finalSpice = fs.spice;
    const delta = finalSpice - initialSpice;
    return {
      faction,
      initialSpice,
      finalSpice,
      delta,
      spice: finalSpice,
      forcesOnBoard: fs.forces.onBoard.map(f => ({
        territory: f.territoryId,
        sector: f.sector,
        regular: f.forces.regular,
        elite: f.forces.elite,
        total: f.forces.regular + f.forces.elite,
      })),
    };
  });
}

/**
 * Log initial state information
 */
function logInitialState(
  logger: TestLogger,
  state: GameState,
  scenarioName: string
): void {
  logger.logState(0, 'Initial State', state);
  logger.logInfo(0, `Starting scenario: ${scenarioName}`);
  logger.logInfo(0, 'Spice collection is automatic - no agent responses needed');
  
  logger.logInfo(0, 'Initial Spice on Board:', {
    spiceLocations: extractSpiceLocations(state),
  });
  
  logger.logInfo(0, 'Initial Faction Spice:', {
    factionSpice: extractFactionSpiceInfo(state),
  });
}

/**
 * Log collection events
 */
function logCollectionEvents(
  logger: TestLogger,
  events: PhaseEvent[]
): Array<{ type: string; message: string }> {
  const eventList: Array<{ type: string; message: string }> = [];
  
  events.forEach(event => {
    eventList.push({
      type: event.type,
      message: event.message,
    });
    logger.logEvent(0, {
      type: event.type,
      message: event.message,
      data: event.data,
    });
  });
  
  return eventList;
}

/**
 * Log final state information
 */
function logFinalState(
  logger: TestLogger,
  initialState: GameState,
  finalState: GameState
): void {
  logger.logState(0, 'Final State', finalState);
  
  logger.logInfo(0, 'Final Spice on Board:', {
    spiceLocations: extractSpiceLocations(finalState),
  });
  
  logger.logInfo(0, 'Final Faction Spice:', {
    factionSpice: calculateSpiceDeltas(initialState, finalState),
  });
}

/**
 * Verify phase completion (automatic phase should complete immediately)
 */
function verifyPhaseCompletion(
  logger: TestLogger,
  phaseComplete: boolean,
  pendingRequests: number
): void {
  if (!phaseComplete) {
    logger.logError(0, 'Phase did not complete immediately', {
      phaseComplete,
      pendingRequests,
    });
  }

  if (pendingRequests > 0) {
    logger.logError(0, 'Unexpected pending requests in automatic phase', {
      pendingRequests,
    });
  }
}

/**
 * Run a spice collection phase scenario
 * 
 * Since spice collection is automatic, this is much simpler than battle phase.
 * No agent responses needed - phase completes immediately.
 */
export async function runSpiceCollectionScenario(
  initialState: GameState,
  scenarioName: string
): Promise<ScenarioResult> {
  const handler = new SpiceCollectionPhaseHandler();
  const logger = new TestLogger(scenarioName, 'spice-collection');
  
  try {
    // Log initial state
    logInitialState(logger, initialState, scenarioName);

    // Initialize phase - this completes the entire phase
    const initResult = handler.initialize(initialState);
    
    // Log all events
    const events = logCollectionEvents(logger, initResult.events);

    // Log final state
    logFinalState(logger, initialState, initResult.state);

    // Verify phase completed immediately
    verifyPhaseCompletion(
      logger,
      initResult.phaseComplete,
      initResult.pendingRequests.length
    );

    logger.logInfo(0, 'Phase completed successfully');
    logger.logInfo(0, `Total collection events: ${events.length}`);
    
    const result: ScenarioResult = {
      state: initResult.state,
      events,
      stepCount: 0, // Phase completes in initialize, no steps
      completed: initResult.phaseComplete,
    };
    
    logger.writeLog(result);
    return result;
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.logError(0, errorObj, { scenarioName });
    
    const result: ScenarioResult = {
      state: initialState,
      events: [],
      stepCount: 0,
      completed: false,
      error: errorObj,
    };
    
    logger.writeLog(result);
    return result;
  }
}
