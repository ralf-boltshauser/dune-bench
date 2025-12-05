import { type PhaseStepResult } from "../../../types";
import { type SpiceBlowContext, type SpiceBlowStepResult } from "../types";

/**
 * Context Helper Utilities
 * 
 * Provides type-safe context passing without the _contextUpdate hack.
 * This is the single source of truth for context handling.
 */

/**
 * Wrap a PhaseStepResult with context to create a SpiceBlowStepResult
 */
export function withContext(
  result: PhaseStepResult,
  context: SpiceBlowContext
): SpiceBlowStepResult {
  return {
    ...result,
    context,
  };
}

/**
 * Extract context from a SpiceBlowStepResult
 * Returns both the base result and the context separately
 */
export function extractContext(
  result: SpiceBlowStepResult
): { result: PhaseStepResult; context: SpiceBlowContext } {
  const { context, ...baseResult } = result;
  return {
    result: baseResult,
    context,
  };
}

/**
 * Update context in a result
 */
export function updateContext(
  result: SpiceBlowStepResult,
  contextUpdate: Partial<SpiceBlowContext>
): SpiceBlowStepResult {
  return {
    ...result,
    context: {
      ...result.context,
      ...contextUpdate,
    },
  };
}

