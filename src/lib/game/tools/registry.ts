/**
 * Tool Registry
 *
 * Maps game phases to available tools and provides factory functions
 * for creating tool sets for AI agents.
 */

import type { Tool } from 'ai';
import { Phase, Faction, GameState } from '../types';
import { ToolContextManager } from './context';
import { createInformationTools, INFORMATION_TOOL_NAMES, isInformationTool } from './information/tools';
import { wrapToolsForStreaming, type StreamingConfig } from './streaming-wrapper';
import {
  createSetupTools,
  createStormTools,
  createBiddingTools,
  createRevivalTools,
  createShipmentTools,
  createMovementTools,
  createBattleTools,
  createNexusTools,
  createKaramaTools,
  SETUP_TOOL_NAMES,
  STORM_TOOL_NAMES,
  BIDDING_TOOL_NAMES,
  REVIVAL_TOOL_NAMES,
  SHIPMENT_TOOL_NAMES,
  MOVEMENT_TOOL_NAMES,
  BATTLE_TOOL_NAMES,
  NEXUS_TOOL_NAMES,
  KARAMA_TOOL_NAMES,
} from './actions';

// =============================================================================
// TYPES
// =============================================================================

/**
 * A record of tools keyed by tool name.
 */
export type ToolSet = Record<string, Tool<any, any>>;

/**
 * Configuration for tool availability.
 */
export interface ToolConfig {
  /** Whether to include information tools (always available) */
  includeInformation?: boolean;
  /** Additional tools to include regardless of phase */
  additionalTools?: ToolSet;
}

// =============================================================================
// PHASE TO TOOLS MAPPING
// =============================================================================

/**
 * Maps each phase to the tool names available during that phase.
 * Information tools are always available and added separately.
 * Karama tools are available in all phases (as interrupts).
 */
export const PHASE_TOOLS: Record<Phase, readonly string[]> = {
  [Phase.SETUP]: [...SETUP_TOOL_NAMES, ...KARAMA_TOOL_NAMES], // Traitor selection, BG prediction
  [Phase.STORM]: [...STORM_TOOL_NAMES, ...KARAMA_TOOL_NAMES],
  [Phase.SPICE_BLOW]: [...KARAMA_TOOL_NAMES], // Automatic phase but Karama can interrupt
  [Phase.CHOAM_CHARITY]: [...KARAMA_TOOL_NAMES], // Simple yes/no but Karama can interrupt
  [Phase.BIDDING]: [...BIDDING_TOOL_NAMES, ...KARAMA_TOOL_NAMES],
  [Phase.REVIVAL]: [...REVIVAL_TOOL_NAMES, ...KARAMA_TOOL_NAMES],
  [Phase.SHIPMENT_MOVEMENT]: [...SHIPMENT_TOOL_NAMES, ...MOVEMENT_TOOL_NAMES, 'use_tleilaxu_ghola', ...KARAMA_TOOL_NAMES], // Tleilaxu Ghola and Karama can be used "at any time"
  [Phase.BATTLE]: [...BATTLE_TOOL_NAMES, 'use_tleilaxu_ghola', ...KARAMA_TOOL_NAMES], // Tleilaxu Ghola and Karama can be used "at any time"
  [Phase.SPICE_COLLECTION]: [...KARAMA_TOOL_NAMES], // Automatic phase but Karama can interrupt
  [Phase.MENTAT_PAUSE]: [...NEXUS_TOOL_NAMES, ...KARAMA_TOOL_NAMES], // Nexus happens here
};

/**
 * Get the tool names available for a specific phase.
 */
export function getToolNamesForPhase(phase: Phase): readonly string[] {
  return PHASE_TOOLS[phase];
}

/**
 * Check if a tool is available in a specific phase.
 */
export function isToolAvailableInPhase(toolName: string, phase: Phase): boolean {
  // Information tools are always available
  if (isInformationTool(toolName)) {
    return true;
  }
  return PHASE_TOOLS[phase].includes(toolName);
}

// =============================================================================
// TOOL FACTORY
// =============================================================================

/**
 * Create all tools bound to a context manager.
 * Returns tools organized by category.
 */
export function createAllTools(ctx: ToolContextManager) {
  return {
    information: createInformationTools(ctx),
    setup: createSetupTools(ctx),
    storm: createStormTools(ctx),
    bidding: createBiddingTools(ctx),
    revival: createRevivalTools(ctx),
    shipment: createShipmentTools(ctx),
    movement: createMovementTools(ctx),
    battle: createBattleTools(ctx),
    nexus: createNexusTools(ctx),
    karama: createKaramaTools(ctx),
  };
}

/**
 * Create a flat tool set with all tools.
 */
export function createFlatToolSet(ctx: ToolContextManager): ToolSet {
  const allTools = createAllTools(ctx);
  return {
    ...allTools.information,
    ...allTools.setup,
    ...allTools.storm,
    ...allTools.bidding,
    ...allTools.revival,
    ...allTools.shipment,
    ...allTools.movement,
    ...allTools.battle,
    ...allTools.nexus,
    ...allTools.karama,
  };
}

/**
 * Create a tool set filtered by phase.
 * Always includes information tools.
 */
export function createToolSetForPhase(
  ctx: ToolContextManager,
  phase: Phase,
  config: ToolConfig = {}
): ToolSet {
  const { includeInformation = true, additionalTools = {} } = config;

  const allTools = createFlatToolSet(ctx);
  const allowedNames = new Set(PHASE_TOOLS[phase]);

  // Filter to only allowed tools
  const filteredTools: ToolSet = {};

  for (const [name, tool] of Object.entries(allTools)) {
    // Always include information tools if configured
    if (includeInformation && isInformationTool(name)) {
      filteredTools[name] = tool;
      continue;
    }

    // Include phase-specific tools
    if (allowedNames.has(name)) {
      filteredTools[name] = tool;
    }
  }

  // Add any additional tools
  return { ...filteredTools, ...additionalTools };
}

// =============================================================================
// AGENT TOOL PROVIDER
// =============================================================================

/**
 * Configuration options for AgentToolProvider.
 */
export interface AgentToolProviderOptions {
  /** Enable streaming - tools will emit events when they execute */
  streaming?: {
    /** Game ID for event association */
    gameId: string;
    /** Whether streaming is enabled (default: true) */
    enabled?: boolean;
  };
}

/**
 * Tool provider for AI agents.
 * Manages tool context and provides phase-appropriate tools.
 *
 * When streaming is enabled, all tools automatically emit events:
 * - AGENT_TOOL_CALL: Before tool executes
 * - AGENT_TOOL_RESULT: After tool completes
 *
 * This eliminates the need for manual event emission in the agent provider.
 */
export class AgentToolProvider {
  private ctx: ToolContextManager;
  private allTools: ToolSet;
  private streamingConfig: StreamingConfig | null;

  constructor(state: GameState, faction: Faction, options?: AgentToolProviderOptions) {
    this.ctx = new ToolContextManager(state, faction);

    // Configure streaming
    if (options?.streaming) {
      this.streamingConfig = {
        gameId: options.streaming.gameId,
        faction,
        enabled: options.streaming.enabled ?? true,
      };
    } else {
      this.streamingConfig = null;
    }

    // Create all tools (wrapped for streaming if configured)
    const baseTools = createFlatToolSet(this.ctx);
    this.allTools = this.streamingConfig
      ? wrapToolsForStreaming(baseTools, this.streamingConfig)
      : baseTools;
  }

  /**
   * Get the context manager for direct state access.
   */
  get context(): ToolContextManager {
    return this.ctx;
  }

  /**
   * Get current game state.
   */
  get state(): GameState {
    return this.ctx.state;
  }

  /**
   * Get the faction this provider is for.
   */
  get faction(): Faction {
    return this.ctx.faction;
  }

  /**
   * Update the game state.
   */
  updateState(newState: GameState): void {
    this.ctx.updateState(newState);
  }

  /**
   * Get the current game state.
   * (Method form for interface compatibility)
   */
  getState(): GameState {
    return this.ctx.state;
  }

  /**
   * Set ornithopter access override for this faction.
   * Used during shipment-movement phase to lock ornithopter access at phase start.
   */
  setOrnithopterAccessOverride(hasAccess: boolean | undefined): void {
    this.ctx.setOrnithopterAccessOverride(hasAccess);
  }

  /**
   * Get all tools (for use with prepareStep for dynamic filtering).
   */
  getAllTools(): ToolSet {
    return this.allTools;
  }

  /**
   * Get tools available for the current phase.
   * If streaming is enabled, tools are wrapped to emit events.
   */
  getToolsForCurrentPhase(): ToolSet {
    const baseTools = createToolSetForPhase(this.ctx, this.ctx.state.phase);
    return this.streamingConfig
      ? wrapToolsForStreaming(baseTools, this.streamingConfig)
      : baseTools;
  }

  /**
   * Get tools for a specific phase.
   * If streaming is enabled, tools are wrapped to emit events.
   */
  getToolsForPhase(phase: Phase): ToolSet {
    const baseTools = createToolSetForPhase(this.ctx, phase);
    return this.streamingConfig
      ? wrapToolsForStreaming(baseTools, this.streamingConfig)
      : baseTools;
  }

  /**
   * Check if streaming is enabled for this provider.
   */
  get isStreaming(): boolean {
    return this.streamingConfig?.enabled ?? false;
  }

  /**
   * Get the game ID for streaming (if enabled).
   */
  get streamingGameId(): string | null {
    return this.streamingConfig?.gameId ?? null;
  }

  /**
   * Create a prepareStep function for dynamic tool control.
   * This is used with the Vercel AI SDK Agent class.
   */
  createPrepareStep() {
    return ({ toolCallsCount }: { toolCallsCount: number }) => {
      const currentPhase = this.ctx.state.phase;
      const tools = createToolSetForPhase(this.ctx, currentPhase);

      return {
        tools,
        // Could add maxSteps logic here based on phase complexity
      };
    };
  }

  /**
   * Get a summary of available tools for the current phase.
   * Useful for prompting the agent about what actions are available.
   */
  getAvailableToolSummary(): string {
    const phase = this.ctx.state.phase;
    const toolNames = getToolNamesForPhase(phase);

    if (toolNames.length === 0) {
      return `No action tools available in ${phase} phase. Only information tools are available.`;
    }

    return `Available tools in ${phase} phase: ${toolNames.join(', ')}. Information tools are always available.`;
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Create a tool provider for an agent.
 *
 * @param state - Initial game state
 * @param faction - The faction this agent plays
 * @param options - Optional configuration including streaming
 *
 * @example
 * ```typescript
 * // Without streaming (for testing)
 * const provider = createAgentToolProvider(state, Faction.ATREIDES);
 *
 * // With streaming (for production)
 * const provider = createAgentToolProvider(state, Faction.ATREIDES, {
 *   streaming: { gameId: 'game_123' }
 * });
 * ```
 */
export function createAgentToolProvider(
  state: GameState,
  faction: Faction,
  options?: AgentToolProviderOptions
): AgentToolProvider {
  return new AgentToolProvider(state, faction, options);
}

/**
 * Get tool names available for a faction in the current game state.
 */
export function getAvailableToolNames(state: GameState): readonly string[] {
  const phaseTools = getToolNamesForPhase(state.phase);
  return [...INFORMATION_TOOL_NAMES, ...phaseTools];
}
