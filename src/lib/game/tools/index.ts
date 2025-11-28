/**
 * Dune Game Tools
 *
 * AI SDK tool definitions for the Dune board game.
 * These tools allow AI agents to interact with the game through
 * validated, type-safe actions.
 *
 * @module tools
 *
 * @example
 * ```typescript
 * import { createAgentToolProvider } from '@/lib/game/tools';
 *
 * // Create a tool provider for an agent
 * const provider = createAgentToolProvider(gameState, Faction.ATREIDES);
 *
 * // Get tools for the current phase
 * const tools = provider.getToolsForCurrentPhase();
 *
 * // Or use with prepareStep for dynamic control
 * const agent = new Agent({
 *   model: anthropic('claude-sonnet-4-20250514'),
 *   tools: provider.getAllTools(),
 *   prepareStep: provider.createPrepareStep(),
 * });
 * ```
 */

// =============================================================================
// CORE EXPORTS
// =============================================================================

// Types
export type {
  ToolResult,
  ToolError,
  ToolCategory,
} from './types';

export {
  successResult,
  failureResult,
  validationToToolError,
  PHASE_TO_TOOL_CATEGORY,
} from './types';

// Context
export { ToolContextManager } from './context';

// =============================================================================
// TOOL EXPORTS
// =============================================================================

// Information Tools (always available)
import { createInformationTools, INFORMATION_TOOL_NAMES } from './information/tools';
export { createInformationTools, INFORMATION_TOOL_NAMES };
export type { InformationToolName } from './information/tools';

// Action Tools (phase-specific)
import {
  createStormTools,
  createBiddingTools,
  createRevivalTools,
  createShipmentTools,
  createMovementTools,
  createBattleTools,
  createNexusTools,
  STORM_TOOL_NAMES,
  BIDDING_TOOL_NAMES,
  REVIVAL_TOOL_NAMES,
  SHIPMENT_TOOL_NAMES,
  MOVEMENT_TOOL_NAMES,
  BATTLE_TOOL_NAMES,
  NEXUS_TOOL_NAMES,
  ALL_ACTION_TOOL_NAMES,
} from './actions';

export {
  createStormTools,
  createBiddingTools,
  createRevivalTools,
  createShipmentTools,
  createMovementTools,
  createBattleTools,
  createNexusTools,
  STORM_TOOL_NAMES,
  BIDDING_TOOL_NAMES,
  REVIVAL_TOOL_NAMES,
  SHIPMENT_TOOL_NAMES,
  MOVEMENT_TOOL_NAMES,
  BATTLE_TOOL_NAMES,
  NEXUS_TOOL_NAMES,
  ALL_ACTION_TOOL_NAMES,
};

export type {
  StormToolName,
  BiddingToolName,
  RevivalToolName,
  ShipmentToolName,
  MovementToolName,
  BattleToolName,
  NexusToolName,
  ActionToolName,
} from './actions';

// =============================================================================
// REGISTRY & FACTORY EXPORTS
// =============================================================================

export type { ToolSet, ToolConfig, AgentToolProviderOptions } from './registry';

export {
  // Phase mapping
  PHASE_TOOLS,
  getToolNamesForPhase,
  isToolAvailableInPhase,
  // Tool creation
  createAllTools,
  createFlatToolSet,
  createToolSetForPhase,
  // Agent tool provider
  AgentToolProvider,
  createAgentToolProvider,
  getAvailableToolNames,
} from './registry';

// =============================================================================
// STREAMING EXPORTS
// =============================================================================

export type { StreamingConfig, StreamingToolMeta } from './streaming-wrapper';
export { wrapToolsForStreaming, createStreamingToolWrapper } from './streaming-wrapper';

// =============================================================================
// SCHEMA EXPORTS
// =============================================================================

export {
  // Base schemas
  FactionSchema,
  TerritoryIdSchema,
  SectorSchema,
  LeaderIdSchema,
  CardIdSchema,
  // Information schemas
  ViewFactionSchema,
  ViewTerritorySchema,
  // Storm schemas
  StormDialSchema,
  // Bidding schemas
  PlaceBidSchema,
  // Revival schemas
  ReviveForcesSchema,
  ReviveLeaderSchema,
  EmperorPayAllyRevivalSchema,
  GrantFremenRevivalBoostSchema,
  DenyFremenRevivalBoostSchema,
  // Movement schemas
  ShipForcesSchema,
  MoveForcesSchema,
  // Battle schemas
  ChooseBattleSchema,
  BattlePlanSchema,
  CallTraitorSchema,
  // Alliance schemas
  ProposeAllianceSchema,
  RespondAllianceSchema,
  BreakAllianceSchema,
  // Common schemas
  PassActionSchema,
} from './schemas';

// =============================================================================
// ALL TOOL NAMES
// =============================================================================

/**
 * All tool names available in the game.
 */
export const ALL_TOOL_NAMES = [
  ...INFORMATION_TOOL_NAMES,
  ...ALL_ACTION_TOOL_NAMES,
] as const;

/**
 * Type for any tool name in the game.
 */
export type ToolName = (typeof ALL_TOOL_NAMES)[number];
