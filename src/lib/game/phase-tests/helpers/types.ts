/**
 * Common types shared across all phase tests
 * 
 * Note: ScenarioResult is also defined in test-logger.ts for backward compatibility.
 * This file provides a centralized location for shared types that can be imported
 * without pulling in the entire TestLogger class.
 */

import type { GameState } from '../../types';

/**
 * Result of running a test scenario
 * 
 * This type is shared across all phase test scenarios.
 * It's also exported from test-logger.ts for backward compatibility.
 */
export interface ScenarioResult {
  state: GameState;
  events: Array<{ type: string; message: string }>;
  stepCount: number;
  completed: boolean;
  error?: Error;
}

