/**
 * Nexus Phase Tools
 *
 * Tools for the Nexus phase where players can form/break alliances.
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { ToolContextManager } from '../context';
import { successResult, failureResult } from '../types';
import { ProposeAllianceSchema, RespondAllianceSchema, BreakAllianceSchema, PassActionSchema } from '../schemas';
import { getFactionState } from '../../state';
import { Faction } from '../../types';

// =============================================================================
// NEXUS TOOLS
// =============================================================================

/**
 * Create nexus phase tools bound to a context manager.
 */
export function createNexusTools(ctx: ToolContextManager) {
  return {
    /**
     * Propose an alliance to another faction.
     */
    propose_alliance: tool({
      description: `Propose an alliance to another faction.

Alliance Rules:
- Maximum 2 factions per alliance (or 3 in 6-player games)
- Allied factions share a common victory condition
- Allies can coordinate in battles (but not combine forces)
- Breaking alliances has consequences - other players may not trust you

Strategic considerations:
- Allies can share treachery card information
- Some factions have natural synergies (Guild+Emperor for economy)
- Allied victory requires both factions to meet the shared condition`,
      inputSchema: ProposeAllianceSchema,
      execute: async (params: z.infer<typeof ProposeAllianceSchema>, _options) => {
        const { targetFaction } = params;
        const faction = ctx.faction;
        const factionState = getFactionState(ctx.state, faction);

        // Check if already allied
        if (factionState.allyId === (targetFaction as Faction)) {
          return failureResult(
            `Already allied with ${targetFaction}`,
            {
              code: 'ALREADY_ALLIED',
              message: 'You are already in an alliance with this faction',
            },
            false
          );
        }

        // Check if proposing to self
        if (targetFaction === faction) {
          return failureResult(
            'Cannot propose alliance to yourself',
            {
              code: 'INVALID_TARGET',
              message: 'You cannot form an alliance with yourself',
            },
            false
          );
        }

        // Check alliance limit
        if (factionState.allyId !== null) {
          return failureResult(
            'Already in an alliance',
            {
              code: 'ALLIANCE_LIMIT',
              message: 'You can only be in one alliance at a time',
              suggestion: 'Break your current alliance first',
            },
            false
          );
        }

        return successResult(
          `Proposed alliance to ${targetFaction}`,
          {
            faction,
            targetFaction,
            proposalPending: true,
          },
          false // State updated by phase handler
        );
      },
    }),

    /**
     * Respond to an alliance proposal.
     */
    respond_to_alliance: tool({
      description: `Accept or reject an alliance proposal.

Accepting an alliance:
- Both factions now share a victory condition
- You can coordinate strategy and share information
- Breaking the alliance later may damage your reputation

Rejecting an alliance:
- No penalties
- You can propose different alliances later
- The proposing faction may become hostile`,
      inputSchema: RespondAllianceSchema,
      execute: async (params: z.infer<typeof RespondAllianceSchema>, _options) => {
        const { proposingFaction, accept } = params;
        const faction = ctx.faction;
        const factionState = getFactionState(ctx.state, faction);

        // Validate we're not already allied
        if (accept && factionState.allyId !== null) {
          return failureResult(
            'Already in an alliance',
            {
              code: 'ALLIANCE_LIMIT',
              message: 'You can only be in one alliance at a time',
              suggestion: 'Break your current alliance to accept this one',
            },
            false
          );
        }

        if (accept) {
          return successResult(
            `Accepted alliance with ${proposingFaction}`,
            {
              faction,
              ally: proposingFaction,
              accepted: true,
            },
            false // State updated by phase handler
          );
        } else {
          return successResult(
            `Rejected alliance proposal from ${proposingFaction}`,
            {
              faction,
              proposingFaction,
              accepted: false,
            },
            false
          );
        }
      },
    }),

    /**
     * Break an existing alliance.
     */
    break_alliance: tool({
      description: `Break your current alliance.

Consequences:
- Both factions return to individual victory conditions
- Other players may view you as untrustworthy
- The former ally may become hostile
- Can only be done during the Nexus phase

You might break an alliance if:
- You're close to winning alone
- Your ally is helping opponents more than you
- Strategic situation has changed dramatically`,
      inputSchema: BreakAllianceSchema,
      execute: async (params: z.infer<typeof BreakAllianceSchema>, _options) => {
        const { allyFaction } = params;
        const faction = ctx.faction;
        const factionState = getFactionState(ctx.state, faction);

        // Check if actually allied
        if (factionState.allyId !== (allyFaction as Faction)) {
          return failureResult(
            `Not allied with ${allyFaction}`,
            {
              code: 'NOT_ALLIED',
              message: 'You do not have an alliance with this faction',
            },
            false
          );
        }

        return successResult(
          `Broke alliance with ${allyFaction}`,
          {
            faction,
            formerAlly: allyFaction,
            allianceBroken: true,
          },
          false // State updated by phase handler
        );
      },
    }),

    /**
     * Pass on alliance actions.
     */
    pass_nexus: tool({
      description: `Skip alliance actions this Nexus phase.

You might pass if:
- You're already in a satisfactory alliance
- No faction wants to ally with you
- You prefer to win independently`,
      inputSchema: PassActionSchema,
      execute: async (_params, _options) => {
        return successResult(
          'Passed on alliance actions',
          { faction: ctx.faction, action: 'pass' },
          false
        );
      },
    }),
  };
}

// =============================================================================
// TOOL LIST
// =============================================================================

export const NEXUS_TOOL_NAMES = [
  'propose_alliance',
  'respond_to_alliance',
  'break_alliance',
  'pass_nexus',
] as const;
export type NexusToolName = (typeof NEXUS_TOOL_NAMES)[number];
