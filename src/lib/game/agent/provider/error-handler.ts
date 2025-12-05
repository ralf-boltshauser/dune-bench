/**
 * Error Handler
 *
 * Handles errors during agent request processing.
 */

import type { AgentResponse } from "../../phases/types";
import type { Faction } from "../../types";

/**
 * Pattern to match schema serialization errors
 */
const SCHEMA_ERROR_PATTERN = "Transforms cannot be represented in JSON Schema";

/**
 * Pattern to match reasoning API errors
 */
const REASONING_ERROR_PATTERN = "reasoning";
const REASONING_ERROR_PATTERN2 = "required following item";

/**
 * Check if an error is a schema serialization error.
 */
export function isSchemaSerializationError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes(SCHEMA_ERROR_PATTERN);
}

/**
 * Check if an error is a reasoning API error.
 * These are transient Azure OpenAI API errors that can be logged and recovered from.
 */
export function isReasoningAPIError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes(REASONING_ERROR_PATTERN) && msg.includes(REASONING_ERROR_PATTERN2);
}

/**
 * Create a descriptive schema serialization error.
 * This error indicates a tool schema has transforms that can't be serialized.
 */
export function createSchemaSerializationError(
  factionId: Faction,
  originalMessage: string
): Error {
  const error = new Error(
    `Schema serialization error for ${factionId}: ${originalMessage}. ` +
      `This indicates a tool schema has transforms that can't be serialized to JSON Schema. ` +
      `Check tool schemas for .refine() or .transform() calls.`
  );
  error.name = "SchemaSerializationError";
  return error;
}

/**
 * Handle an error during agent request processing.
 * Returns a pass response or throws a transformed error.
 */
export function handleAgentError(
  error: unknown,
  factionId: Faction
): AgentResponse {
  const errorMsg = error instanceof Error ? error.message : "Unknown error";

  // Filter out non-fatal AI SDK schema serialization warnings
  // These are warnings that don't prevent tools from working
  if (isSchemaSerializationError(error)) {
    // The schema serialization error occurs when AI SDK tries to convert Zod schemas to JSON Schema.
    // This happens during generateText() call setup, so retrying won't help - it will fail again.
    // The error suggests a tool schema has transforms/refinements that can't be serialized.
    // Instead of retrying (which will fail), throw a descriptive error that will be caught by the phase manager
    // and trigger the retry limit, preventing infinite loops.
    throw createSchemaSerializationError(factionId, errorMsg);
  }

  // Handle reasoning API errors (non-fatal, can recover)
  if (isReasoningAPIError(error)) {
    // Reasoning API errors are transient Azure OpenAI streaming errors
    // Log the error but continue with a pass response to allow recovery
    console.warn(
      `\n⚠️  [Azure OpenAI] Reasoning API error for ${factionId}: ${errorMsg}\n` +
      `   This is a transient streaming error. Continuing with pass response.`
    );
    return createPassResponse(
      factionId,
      `Reasoning API error occurred (transient): ${errorMsg}`
    );
  }

  // Return a pass response on other errors
  return createPassResponse(factionId, `Error occurred: ${errorMsg}`);
}

/**
 * Create a pass response.
 */
export function createPassResponse(
  factionId: Faction,
  reasoning: string
): AgentResponse {
  return {
    factionId,
    actionType: "PASS",
    data: {},
    passed: true,
    reasoning,
  };
}
