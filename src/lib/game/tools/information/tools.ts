/**
 * Information Tools
 *
 * Read-only tools that provide game state information to AI agents.
 * These tools are always available regardless of game phase.
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { TerritoryId } from '../../types';
import type { ToolContextManager } from '../context';
import { successResult, failureResult } from '../types';
import { ViewTerritorySchema, ViewFactionSchema, FactionSchema } from '../schemas';
import { normalizeTerritoryId } from '../../utils/territory-normalize';

// =============================================================================
// TOOL FACTORIES
// =============================================================================

/**
 * Create information tools bound to a context manager.
 */
export function createInformationTools(ctx: ToolContextManager) {
  return {
    /**
     * View current game state summary.
     */
    view_game_state: tool({
      description: `View the current game state summary including:
- Current turn and phase
- Storm position and storm order
- Stronghold control
- Active alliances
- Spice locations on the board

Use this to understand the overall game situation.`,
      inputSchema: z.object({}),
      execute: async (params, options) => {
        const summary = ctx.getGameStateSummary();
        return successResult(
          `Game State - Turn ${summary.turn}, Phase: ${summary.phase}`,
          summary,
          false
        );
      },
    }),

    /**
     * View detailed faction information.
     */
    view_my_faction: tool({
      description: `View detailed information about your faction including:
- Spice reserves
- Forces (reserves, on board, in tanks)
- Leaders and their status
- Hand size (not card contents)
- Current ally
- Controlled strongholds

Use this to plan your strategy and understand your resources.`,
      inputSchema: z.object({}),
      execute: async (params, options) => {
        const info = ctx.getFactionInfo();
        return successResult(
          `${info.faction}: ${info.spice} spice, ${info.reserveForces.regular + info.reserveForces.elite} reserves`,
          info,
          false
        );
      },
    }),

    /**
     * View another faction's public information.
     * @rule 1.10.01.03
     */
    view_faction: tool({
      description: `View public information about another faction:
- Their forces on the board (visible to all)
- Strongholds they control
- Whether they have an ally

Note: You cannot see their spice, hand size, or reserves in detail.`,
      inputSchema: ViewFactionSchema,
      execute: async (params: z.infer<typeof ViewFactionSchema>, options) => {
        const { faction } = params;
        if (!faction) {
          return failureResult(
            'Faction not specified',
            { code: 'MISSING_FACTION', message: 'Specify a faction to view' },
            false
          );
        }

        try {
          // Get limited public info about other factions
          const info = ctx.getFactionInfo(faction);

          // Filter to only public information
          const publicInfo = {
            faction: info.faction,
            forcesOnBoard: info.forcesOnBoard,
            controlledStrongholds: info.controlledStrongholds,
            allyId: info.allyId,
            // These would be hidden in a real game but are useful for AI
            handSize: info.handSize,
          };

          return successResult(
            `${faction}: ${info.forcesOnBoard.length} force stacks on board`,
            publicInfo,
            false
          );
        } catch (error) {
          return failureResult(
            `Could not view faction: ${faction}`,
            { code: 'INVALID_FACTION', message: `Faction ${faction} not found` },
            false
          );
        }
      },
    }),

    /**
     * View territory details.
     */
    view_territory: tool({
      description: `View detailed information about a specific territory:
- Territory type (stronghold, sand, rock, etc.)
- Which sectors it occupies
- Whether it's in the storm
- Spice present
- Forces from all factions present

Use this to scout locations before shipping or moving.`,
      inputSchema: ViewTerritorySchema,
      execute: async (params: z.infer<typeof ViewTerritorySchema>, options) => {
        const { territoryId: rawTerritoryId } = params;
        
        // Normalize territory ID (schema no longer has transform)
        const territoryId = normalizeTerritoryId(rawTerritoryId);
        if (!territoryId) {
          return failureResult(
            `Invalid territory ID: "${rawTerritoryId}"`,
            { code: 'INVALID_TERRITORY', message: `Territory "${rawTerritoryId}" does not exist` },
            false
          );
        }
        
        const info = ctx.getTerritoryInfo(territoryId);
        if (!info) {
          return failureResult(
            `Unknown territory: ${territoryId}`,
            {
              code: 'INVALID_TERRITORY',
              message: `Territory ${territoryId} does not exist`,
            },
            false
          );
        }

        return successResult(
          `${info.name}: ${info.occupants.length} factions present, ${info.spice} spice`,
          info,
          false
        );
      },
    }),

    /**
     * View valid actions for current context.
     */
    view_valid_actions: tool({
      description: `View what actions are currently available to you:
- Actions specific to the current phase
- Context-specific information (e.g., max bid, available forces)

Use this when you're unsure what you can do.`,
      inputSchema: z.object({}),
      execute: async (params, options) => {
        const actions = ctx.getValidActions();
        return successResult(
          `Phase ${actions.phase}: ${actions.availableActions.length} actions available`,
          actions,
          false
        );
      },
    }),

    /**
     * View your treachery hand.
     */
    view_my_hand: tool({
      description: `View your treachery cards:
- Card IDs and types (weapon, defense, special, worthless)

Use this to plan battle strategies and bidding decisions.`,
      inputSchema: z.object({}),
      execute: async (params, options) => {
        const hand = ctx.getMyHand();
        return successResult(
          `You have ${hand.length} treachery cards`,
          { cards: hand },
          false
        );
      },
    }),

    /**
     * View your traitor cards.
     */
    view_my_traitors: tool({
      description: `View which leaders you hold as traitors.
These can be revealed during battle to automatically win.`,
      inputSchema: z.object({}),
      execute: async (params, options) => {
        const traitors = ctx.getMyTraitors();
        return successResult(
          `You have ${traitors.length} traitor cards`,
          { traitorLeaderIds: traitors },
          false
        );
      },
    }),
  };
}

// =============================================================================
// TOOL LIST
// =============================================================================

/**
 * List of all information tool names.
 */
export const INFORMATION_TOOL_NAMES = [
  'view_game_state',
  'view_my_faction',
  'view_faction',
  'view_territory',
  'view_valid_actions',
  'view_my_hand',
  'view_my_traitors',
] as const;

export type InformationToolName = (typeof INFORMATION_TOOL_NAMES)[number];

/**
 * Type guard to check if a string is an information tool name.
 */
export function isInformationTool(name: string): name is InformationToolName {
  return (INFORMATION_TOOL_NAMES as readonly string[]).includes(name);
}
