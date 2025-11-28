/**
 * Revival Phase Tools
 *
 * Tools for the Revival phase where players revive forces and leaders.
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { ToolContextManager } from '../context';
import { successResult, failureResult, validationToToolError } from '../types';
import { ReviveForcesSchema, ReviveLeaderSchema, ReviveKwisatzHaderachSchema, EmperorPayAllyRevivalSchema, GrantFremenRevivalBoostSchema, DenyFremenRevivalBoostSchema, UseTleilaxuGholaSchema, PassActionSchema } from '../schemas';
import { getFactionState, reviveForces, reviveLeader, reviveKwisatzHaderach, removeSpice, discardTreacheryCard } from '../../state';
import { getRevivalLimits, validateForceRevival } from '../../rules';
import { getLeaderDefinition, GAME_CONSTANTS } from '../../data';
import { Faction, LeaderLocation } from '../../types';

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
- Maximum 3 forces per turn (total of regular + elite)
- Elite forces (Sardaukar/Fedaykin) can only revive 1 per turn for Emperor/Fremen
- You can specify both regular forces (count) and elite forces (eliteCount)

Use this to rebuild your army after losses.`,
      inputSchema: ReviveForcesSchema,
      execute: async (params: z.infer<typeof ReviveForcesSchema>, options) => {
        const { count = 0, eliteCount = 0 } = params;
        const state = ctx.state;
        const faction = ctx.faction;

        // Validate that at least one force is being revived
        if (count === 0 && eliteCount === 0) {
          return failureResult(
            `Must revive at least 1 force`,
            {
              code: 'INVALID_INPUT',
              message: 'Either count or eliteCount must be greater than 0',
              suggestion: 'Specify at least one force to revive',
            },
            false
          );
        }

        // Use validation function to check all rules
        const validation = validateForceRevival(state, faction, count, eliteCount);
        if (!validation.valid) {
          return failureResult(
            validation.errors[0]?.message ?? 'Invalid revival request',
            validationToToolError(validation.errors[0]),
            false
          );
        }

        // Get revival limits for cost calculation
        const limits = getRevivalLimits(state, faction);
        const totalRequested = count + eliteCount;
        const freeCount = Math.min(totalRequested, limits.freeForces);
        const paidCount = totalRequested - freeCount;
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
              field: 'totalCount',
              providedValue: totalRequested,
              validRange: { min: 1, max: maxAffordable },
            },
            false
          );
        }

        // Execute revival - revive regular forces first, then elite
        let newState = state;
        if (count > 0) {
          newState = reviveForces(newState, faction, count, false);
        }
        if (eliteCount > 0) {
          newState = reviveForces(newState, faction, eliteCount, true);
        }

        // Deduct spice cost
        if (cost > 0) {
          newState = removeSpice(newState, faction, cost);
        }

        ctx.updateState(newState);

        const forceTypes = [];
        if (count > 0) forceTypes.push(`${count} regular`);
        if (eliteCount > 0) forceTypes.push(`${eliteCount} elite`);
        const forceDesc = forceTypes.join(' and ');

        return successResult(
          `Revived ${forceDesc} force(s) (${freeCount} free, ${paidCount} paid for ${cost} spice)`,
          {
            faction,
            regularCount: count,
            eliteCount,
            totalCount: totalRequested,
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
     * Revive Kwisatz Haderach (Atreides only).
     */
    revive_kwisatz_haderach: tool({
      description: `Revive Kwisatz Haderach from death (Atreides only, REAWAKEN ability).

Rules:
- Can only revive when all other leaders have died once and/or become unavailable
- Cost: 2 spice (KH strength is +2)
- KH must be dead (killed by lasgun/shield explosion)
- Uses your one leader revival action per turn

REAWAKEN: When killed, the Kwisatz Haderach must be revived like any other leader. When all other leaders have died once and/or become unavailable you may use your one leader revival action to revive this token instead of a leader.`,
      inputSchema: ReviveKwisatzHaderachSchema,
      execute: async (params: z.infer<typeof ReviveKwisatzHaderachSchema>, options) => {
        const state = ctx.state;
        const faction = ctx.faction;
        const factionState = getFactionState(state, faction);

        // Check: Must be Atreides
        if (faction !== Faction.ATREIDES) {
          return failureResult(
            'Only Atreides can revive Kwisatz Haderach',
            {
              code: 'ABILITY_NOT_AVAILABLE',
              message: 'Kwisatz Haderach is an Atreides faction ability',
            },
            false
          );
        }

        const kh = factionState.kwisatzHaderach;
        if (!kh) {
          return failureResult(
            'Kwisatz Haderach not initialized',
            {
              code: 'KH_NOT_INITIALIZED',
              message: 'Kwisatz Haderach has not been initialized for Atreides',
            },
            false
          );
        }

        if (!kh.isDead) {
          return failureResult(
            'Kwisatz Haderach is not dead',
            {
              code: 'KH_NOT_DEAD',
              message: 'Kwisatz Haderach must be dead to be revived',
            },
            false
          );
        }

        // Check if all leaders have died once
        const allLeadersDeadOnce = factionState.leaders.every(
          (l) => l.hasBeenKilled || l.location === LeaderLocation.TANKS_FACE_UP || l.location === LeaderLocation.TANKS_FACE_DOWN
        );
        const hasActiveLeaders = factionState.leaders.some(
          (l) => l.location === LeaderLocation.LEADER_POOL
        );

        if (!allLeadersDeadOnce && hasActiveLeaders) {
          return failureResult(
            'Cannot revive Kwisatz Haderach yet',
            {
              code: 'KH_REVIVAL_NOT_AVAILABLE',
              message: 'Must wait until all leaders have died once before reviving KH',
              suggestion: 'Revive leaders first, then KH can be revived',
            },
            false
          );
        }

        const cost = 2; // KH strength is +2

        // Check if can afford
        if (factionState.spice < cost) {
          return failureResult(
            'Cannot afford to revive Kwisatz Haderach',
            {
              code: 'INSUFFICIENT_SPICE',
              message: `Revival costs ${cost} spice. You have ${factionState.spice}.`,
              suggestion: 'Gain more spice',
            },
            false
          );
        }

        // Execute revival
        let newState = reviveKwisatzHaderach(state);
        newState = removeSpice(newState, faction, cost);
        ctx.updateState(newState);

        return successResult(
          `Revived Kwisatz Haderach for ${cost} spice`,
          {
            faction,
            cost,
          },
          true
        );
      },
    }),

    /**
     * Emperor pays spice for ally's extra revival beyond their normal limit.
     */
    emperor_pay_ally_revival: tool({
      description: `EMPEROR ONLY: Pay spice to revive extra forces for your ally beyond their normal revival limit.

Rules:
- Only available to Emperor when allied
- Can revive up to 3 extra forces for ally per turn
- Costs 2 spice per force (paid by Emperor)
- Ally must have forces in tanks
- This is IN ADDITION to ally's normal revival (not instead of)

Use this to help rebuild your ally's forces after battle.`,
      inputSchema: EmperorPayAllyRevivalSchema,
      execute: async (params: z.infer<typeof EmperorPayAllyRevivalSchema>, options) => {
        const { forceCount } = params;
        const state = ctx.state;
        const faction = ctx.faction;

        // Check: Must be Emperor
        if (faction !== Faction.EMPEROR) {
          return failureResult(
            'Only Emperor can use this ability',
            {
              code: 'ABILITY_NOT_AVAILABLE',
              message: 'Emperor ally revival is a special Emperor faction ability',
              suggestion: 'Use revive_forces for normal revival',
            },
            false
          );
        }

        const emperorState = getFactionState(state, faction);
        const allyId = emperorState.allyId;

        // Check: Must be allied
        if (!allyId) {
          return failureResult(
            'Emperor must be allied to use this ability',
            {
              code: 'NO_ALLY',
              message: 'You need an ally to revive their forces',
              suggestion: 'Form an alliance during the Nexus card',
            },
            false
          );
        }

        const allyState = getFactionState(state, allyId);
        const allyLimits = getRevivalLimits(state, allyId);

        // Check: Emperor bonus available
        if (allyLimits.emperorBonusAvailable === 0) {
          return failureResult(
            'Emperor bonus revival already used',
            {
              code: 'EMPEROR_BONUS_EXHAUSTED',
              message: `Emperor has already paid for ${allyLimits.emperorBonusUsed} bonus revivals this turn (max 3)`,
              suggestion: 'Wait for next turn to use this ability again',
              field: 'forceCount',
              providedValue: forceCount,
              validRange: { min: 0, max: 0 },
            },
            false
          );
        }

        // Check: Request within available bonus
        if (forceCount > allyLimits.emperorBonusAvailable) {
          return failureResult(
            `Can only revive ${allyLimits.emperorBonusAvailable} more bonus forces`,
            {
              code: 'EMPEROR_BONUS_LIMIT',
              message: `Emperor can provide up to 3 extra revivals per turn. Already used ${allyLimits.emperorBonusUsed}.`,
              suggestion: `Revive at most ${allyLimits.emperorBonusAvailable} forces`,
              field: 'forceCount',
              providedValue: forceCount,
              validRange: { min: 1, max: allyLimits.emperorBonusAvailable },
            },
            false
          );
        }

        // Check: Ally has forces in tanks
        if (allyLimits.forcesInTanks === 0) {
          return failureResult(
            'Ally has no forces in tanks',
            {
              code: 'NO_FORCES_IN_TANKS',
              message: `${allyId} has no forces in the Tleilaxu Tanks to revive`,
              suggestion: 'Wait until ally loses forces in battle',
            },
            false
          );
        }

        if (forceCount > allyLimits.forcesInTanks) {
          return failureResult(
            'Ally does not have enough forces in tanks',
            {
              code: 'INSUFFICIENT_FORCES_IN_TANKS',
              message: `${allyId} only has ${allyLimits.forcesInTanks} forces in tanks`,
              suggestion: `Revive at most ${allyLimits.forcesInTanks} forces`,
              field: 'forceCount',
              providedValue: forceCount,
              validRange: { min: 1, max: allyLimits.forcesInTanks },
            },
            false
          );
        }

        // Check: Emperor has enough spice
        const cost = forceCount * GAME_CONSTANTS.PAID_REVIVAL_COST;
        if (emperorState.spice < cost) {
          const affordableCount = Math.floor(emperorState.spice / GAME_CONSTANTS.PAID_REVIVAL_COST);
          return failureResult(
            'Emperor does not have enough spice',
            {
              code: 'INSUFFICIENT_SPICE',
              message: `Revival costs ${cost} spice. Emperor has ${emperorState.spice}.`,
              suggestion: affordableCount > 0 ? `Revive ${affordableCount} forces for ${affordableCount * GAME_CONSTANTS.PAID_REVIVAL_COST} spice` : 'Not enough spice for any bonus revival',
              field: 'forceCount',
              providedValue: forceCount,
              validRange: { min: 1, max: affordableCount },
            },
            false
          );
        }

        // Execute: Revive ally forces and deduct Emperor's spice
        let newState = reviveForces(state, allyId, forceCount);
        newState = removeSpice(newState, faction, cost);

        // Track Emperor bonus usage
        const newAllyState = getFactionState(newState, allyId);
        const newAllyRevivalsUsed = (newAllyState.emperorAllyRevivalsUsed ?? 0) + forceCount;
        const updatedAllyState = { ...newAllyState, emperorAllyRevivalsUsed: newAllyRevivalsUsed };
        const newFactions = new Map(newState.factions);
        newFactions.set(allyId, updatedAllyState);
        newState = { ...newState, factions: newFactions };

        ctx.updateState(newState);

        return successResult(
          `Emperor paid ${cost} spice to revive ${forceCount} forces for ally ${allyId}`,
          {
            faction,
            allyId,
            forceCount,
            cost,
            emperorBonusUsed: newAllyRevivalsUsed,
          },
          true
        );
      },
    }),

    /**
     * Fremen grants ally 3 free revivals.
     */
    grant_fremen_revival_boost: tool({
      description: `Grant your ally 3 free revivals this turn (Fremen alliance ability).

Rules:
- Only available when Fremen has an ally
- This is a discretionary decision each turn
- Replaces ally's normal free revival count with 3
- Does not cost the Fremen anything

Use this to help your ally rebuild their forces after losses.`,
      inputSchema: GrantFremenRevivalBoostSchema,
      execute: async (params, options) => {
        const state = ctx.state;
        const faction = ctx.faction;

        // Check: Must be Fremen
        if (faction !== Faction.FREMEN) {
          return failureResult(
            'Only Fremen can grant revival boost',
            {
              code: 'NOT_FREMEN',
              message: 'This ability is exclusive to the Fremen faction',
              faction,
            },
            false
          );
        }

        const factionState = getFactionState(state, faction);
        const allyId = factionState.allyId;

        // Check: Must have ally
        if (!allyId) {
          return failureResult(
            'Fremen has no ally',
            {
              code: 'NO_ALLY',
              message: 'You must be allied to grant revival boost',
            },
            false
          );
        }

        return successResult(
          `Fremen grants ${allyId} 3 free revivals this turn`,
          {
            faction,
            allyId,
            boostGranted: true,
          },
          false // State update happens in phase handler
        );
      },
    }),

    /**
     * Fremen denies ally the revival boost.
     */
    deny_fremen_revival_boost: tool({
      description: `Decline to grant your ally the revival boost (Fremen alliance ability).

Your ally will use their normal free revival count instead.`,
      inputSchema: DenyFremenRevivalBoostSchema,
      execute: async (params, options) => {
        const state = ctx.state;
        const faction = ctx.faction;

        // Check: Must be Fremen
        if (faction !== Faction.FREMEN) {
          return failureResult(
            'Only Fremen can deny revival boost',
            {
              code: 'NOT_FREMEN',
              message: 'This ability is exclusive to the Fremen faction',
              faction,
            },
            false
          );
        }

        const factionState = getFactionState(state, faction);
        const allyId = factionState.allyId;

        return successResult(
          `Fremen declines to grant ${allyId || 'ally'} the revival boost`,
          {
            faction,
            allyId,
            boostGranted: false,
          },
          false // State update happens in phase handler
        );
      },
    }),

    /**
     * Use Tleilaxu Ghola card for extra revival.
     */
    use_tleilaxu_ghola: tool({
      description: `Play Tleilaxu Ghola card for an extra revival.

Rules:
- Allows ONE of the following:
  - Revive 1 leader from tanks (regardless of how many leaders are in tanks)
  - Revive up to 5 forces from tanks for FREE (no spice cost)
- This is IN ADDITION to your normal revival
- Card is discarded after use
- Can be played during Revival phase

Use this special card when you need a critical revival boost.`,
      inputSchema: UseTleilaxuGholaSchema,
      execute: async (params: z.infer<typeof UseTleilaxuGholaSchema>, options) => {
        const { reviveType, leaderId, forceCount } = params;
        const state = ctx.state;
        const faction = ctx.faction;
        const factionState = getFactionState(state, faction);

        // Check if player has Tleilaxu Ghola card
        const hasCard = factionState.hand.some((card) => card.definitionId === 'tleilaxu_ghola');
        if (!hasCard) {
          return failureResult(
            'You do not have a Tleilaxu Ghola card',
            {
              code: 'CARD_NOT_IN_HAND',
              message: 'Tleilaxu Ghola card not found in your hand',
              suggestion: 'Check your hand with view_my_hand',
            },
            false
          );
        }

        let newState = state;
        let revivalMessage = '';

        if (reviveType === 'leader') {
          // Validate leaderId is provided
          if (!leaderId) {
            return failureResult(
              'Leader ID required when reviveType is "leader"',
              {
                code: 'MISSING_LEADER_ID',
                message: 'You must specify which leader to revive',
                suggestion: 'Provide leaderId parameter',
                field: 'leaderId',
              },
              false
            );
          }

          // Find the leader
          const leader = factionState.leaders.find((l) => l.definitionId === leaderId);
          if (!leader) {
            return failureResult(
              `Leader not found: ${leaderId}`,
              {
                code: 'INVALID_LEADER',
                message: `You do not have a leader with ID ${leaderId}`,
                suggestion: 'Check your leaders with view_my_faction',
                field: 'leaderId',
                providedValue: leaderId,
              },
              false
            );
          }

          // Check if leader is in tanks
          if (
            leader.location !== LeaderLocation.TANKS_FACE_UP &&
            leader.location !== LeaderLocation.TANKS_FACE_DOWN
          ) {
            return failureResult(
              `Leader ${leaderId} is not in the tanks`,
              {
                code: 'LEADER_NOT_IN_TANKS',
                message: `This leader is currently ${leader.location}`,
                suggestion: 'Only leaders in the Tleilaxu Tanks can be revived',
                field: 'leaderId',
                providedValue: leaderId,
              },
              false
            );
          }

          // Get leader definition for name
          const leaderDef = getLeaderDefinition(leaderId);
          const leaderName = leaderDef?.name || leaderId;

          // Revive leader (no cost with Tleilaxu Ghola)
          newState = reviveLeader(newState, faction, leaderId);
          revivalMessage = `Revived leader ${leaderName} for free using Tleilaxu Ghola`;
        } else {
          // reviveType === 'forces'
          // Validate forceCount is provided
          if (forceCount === undefined) {
            return failureResult(
              'Force count required when reviveType is "forces"',
              {
                code: 'MISSING_FORCE_COUNT',
                message: 'You must specify how many forces to revive (1-5)',
                suggestion: 'Provide forceCount parameter',
                field: 'forceCount',
              },
              false
            );
          }

          // Validate force count
          if (forceCount < 1 || forceCount > 5) {
            return failureResult(
              `Force count must be 1-5, got ${forceCount}`,
              {
                code: 'INVALID_FORCE_COUNT',
                message: 'Tleilaxu Ghola can revive up to 5 forces',
                suggestion: 'Revive between 1 and 5 forces',
                field: 'forceCount',
                providedValue: forceCount,
                validRange: { min: 1, max: 5 },
              },
              false
            );
          }

          // Check if player has enough forces in tanks
          const limits = getRevivalLimits(state, faction);
          if (limits.forcesInTanks === 0) {
            return failureResult(
              'No forces in tanks',
              {
                code: 'NO_FORCES_IN_TANKS',
                message: 'You have no forces in the Tleilaxu Tanks to revive',
                suggestion: 'Wait until you lose forces in battle',
              },
              false
            );
          }

          if (forceCount > limits.forcesInTanks) {
            return failureResult(
              `Not enough forces in tanks`,
              {
                code: 'INSUFFICIENT_FORCES_IN_TANKS',
                message: `You only have ${limits.forcesInTanks} forces in the tanks`,
                suggestion: `Revive at most ${limits.forcesInTanks} forces`,
                field: 'forceCount',
                providedValue: forceCount,
                validRange: { min: 1, max: limits.forcesInTanks },
              },
              false
            );
          }

          // Revive forces for free (no cost)
          newState = reviveForces(newState, faction, forceCount);
          revivalMessage = `Revived ${forceCount} forces for free using Tleilaxu Ghola`;
        }

        // Discard the Tleilaxu Ghola card
        newState = discardTreacheryCard(newState, faction, 'tleilaxu_ghola');
        ctx.updateState(newState);

        return successResult(
          revivalMessage,
          {
            faction,
            reviveType,
            leaderId: reviveType === 'leader' ? leaderId : undefined,
            forceCount: reviveType === 'forces' ? forceCount : undefined,
            cardUsed: 'tleilaxu_ghola',
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

export const REVIVAL_TOOL_NAMES = ['revive_forces', 'revive_leader', 'emperor_pay_ally_revival', 'grant_fremen_revival_boost', 'deny_fremen_revival_boost', 'use_tleilaxu_ghola', 'pass_revival'] as const;
export type RevivalToolName = (typeof REVIVAL_TOOL_NAMES)[number];
