/**
 * Revival Phase Tools
 *
 * Tools for the Revival phase where players revive forces and leaders.
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { ToolContextManager } from '../context';
import { successResult, failureResult, validationToToolError } from '../types';
import { ReviveForcesSchema, ReviveLeaderSchema, PassActionSchema } from '../schemas';
import { getFactionState, reviveForces, reviveLeader, removeSpice } from '../../state';
import { getRevivalLimits } from '../../rules';
import { getLeaderDefinition, GAME_CONSTANTS } from '../../data';
import { LeaderLocation } from '../../types';

// =============================================================================
// REVIVAL TOOLS
// =============================================================================

/**
 * Create revival phase tools bound to a context manager.
 */
export function createRevivalTools(ctx: ToolContextManager) {
  return {
    /**
     * Revive forces from the Tleilaxu Tanks.
     */
    revive_forces: tool({
      description: `Revive forces from the Tleilaxu Tanks to your reserves.

Rules:
- Free revival: 2 forces (3 for Fremen/Sardaukar factions)
- Additional forces cost 2 spice each
- Maximum 3 forces per turn
- Elite forces (Sardaukar/Fedaykin) can only revive 1 per turn

Use this to rebuild your army after losses.`,
      inputSchema: ReviveForcesSchema,
      execute: async (params: z.infer<typeof ReviveForcesSchema>, options) => {
        const { count } = params;
        const state = ctx.state;
        const faction = ctx.faction;

        // Get revival limits
        const limits = getRevivalLimits(state, faction);

        // Validate count
        if (count > limits.maxForces) {
          return failureResult(
            `Cannot revive ${count} forces`,
            {
              code: 'REVIVAL_LIMIT_EXCEEDED',
              message: `Maximum revival is ${limits.maxForces} forces per turn`,
              suggestion: `Revive at most ${limits.maxForces} forces`,
              field: 'count',
              providedValue: count,
              validRange: { min: 1, max: limits.maxForces },
            },
            false
          );
        }

        if (count > limits.forcesInTanks) {
          return failureResult(
            `Not enough forces in tanks`,
            {
              code: 'INSUFFICIENT_FORCES_IN_TANKS',
              message: `You only have ${limits.forcesInTanks} forces in the tanks`,
              suggestion: `Revive at most ${limits.forcesInTanks} forces`,
              field: 'count',
              providedValue: count,
              validRange: { min: 1, max: limits.forcesInTanks },
            },
            false
          );
        }

        // Calculate cost
        const freeCount = Math.min(count, limits.freeForces);
        const paidCount = count - freeCount;
        const cost = paidCount * GAME_CONSTANTS.PAID_REVIVAL_COST;

        const factionState = getFactionState(state, faction);
        if (cost > factionState.spice) {
          const affordablePaid = Math.floor(factionState.spice / GAME_CONSTANTS.PAID_REVIVAL_COST);
          const maxAffordable = freeCount + affordablePaid;

          return failureResult(
            `Cannot afford ${paidCount} paid revivals`,
            {
              code: 'INSUFFICIENT_SPICE',
              message: `Paid revival costs ${GAME_CONSTANTS.PAID_REVIVAL_COST} spice each. You can only afford ${maxAffordable} total.`,
              suggestion: `Revive ${maxAffordable} forces (${freeCount} free, ${affordablePaid} paid)`,
              field: 'count',
              providedValue: count,
              validRange: { min: 1, max: maxAffordable },
            },
            false
          );
        }

        // Execute revival
        let newState = reviveForces(state, faction, count);
        if (cost > 0) {
          newState = removeSpice(newState, faction, cost);
        }
        ctx.updateState(newState);

        return successResult(
          `Revived ${count} forces (${freeCount} free, ${paidCount} paid for ${cost} spice)`,
          {
            faction,
            count,
            freeCount,
            paidCount,
            cost,
          },
          true
        );
      },
    }),

    /**
     * Revive a leader from the Tleilaxu Tanks.
     */
    revive_leader: tool({
      description: `Revive a leader from the Tleilaxu Tanks.

Rules:
- Can only revive when you have no active leaders OR all leaders have died once
- Cost equals the leader's fighting strength in spice
- Revived leaders can be used normally but are still subject to traitor cards

Leaders are valuable for battle - their strength adds to your dial.`,
      inputSchema: ReviveLeaderSchema,
      execute: async (params: z.infer<typeof ReviveLeaderSchema>, options) => {
        const { leaderId } = params;
        const state = ctx.state;
        const faction = ctx.faction;
        const factionState = getFactionState(state, faction);

        // Find the leader
        const leader = factionState.leaders.find((l) => l.definitionId === leaderId);
        if (!leader) {
          return failureResult(
            `Leader not found: ${leaderId}`,
            {
              code: 'INVALID_LEADER',
              message: `You do not have a leader with ID ${leaderId}`,
              suggestion: 'Check your available leaders with view_my_faction',
            },
            false
          );
        }

        // Check if leader is in tanks
        if (leader.location !== LeaderLocation.TANKS_FACE_UP && leader.location !== LeaderLocation.TANKS_FACE_DOWN) {
          return failureResult(
            `Leader ${leaderId} is not in the tanks`,
            {
              code: 'LEADER_NOT_IN_TANKS',
              message: `This leader is currently ${leader.location}`,
              suggestion: 'Only leaders in the Tleilaxu Tanks can be revived',
            },
            false
          );
        }

        // Get leader definition for cost
        const leaderDef = getLeaderDefinition(leaderId);
        if (!leaderDef) {
          return failureResult(
            `Unknown leader: ${leaderId}`,
            { code: 'INVALID_LEADER', message: 'Leader definition not found' },
            false
          );
        }

        const cost = leaderDef.strength;

        // Check if can afford
        if (factionState.spice < cost) {
          return failureResult(
            `Cannot afford to revive ${leaderDef.name}`,
            {
              code: 'INSUFFICIENT_SPICE',
              message: `Revival costs ${cost} spice (leader's strength). You have ${factionState.spice}.`,
              suggestion: 'Gain more spice or revive a weaker leader',
              field: 'leaderId',
              providedValue: leaderId,
            },
            false
          );
        }

        // Execute revival
        let newState = reviveLeader(state, faction, leaderId);
        newState = removeSpice(newState, faction, cost);
        ctx.updateState(newState);

        return successResult(
          `Revived ${leaderDef.name} for ${cost} spice`,
          {
            faction,
            leaderId,
            leaderName: leaderDef.name,
            cost,
          },
          true
        );
      },
    }),

    /**
     * Pass on revival.
     */
    pass_revival: tool({
      description: `Skip revival this turn.

You can always pass if you don't want to spend spice on revival.`,
      inputSchema: PassActionSchema,
      execute: async (params, options) => {
        return successResult(
          'Passed on revival',
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

export const REVIVAL_TOOL_NAMES = ['revive_forces', 'revive_leader', 'pass_revival'] as const;
export type RevivalToolName = (typeof REVIVAL_TOOL_NAMES)[number];
