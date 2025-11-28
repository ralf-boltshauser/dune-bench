/**
 * Battle Phase Tools
 *
 * Tools for the Battle phase where players resolve combat.
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { TerritoryId } from '../../types';
import { LeaderLocation } from '../../types';
import type { ToolContextManager } from '../context';
import { successResult, failureResult, validationToToolError } from '../types';
import {
  ChooseBattleSchema,
  BattlePlanSchema,
  CallTraitorSchema,
  PassActionSchema,
} from '../schemas';
import { getFactionState } from '../../state';
import { getLeaderDefinition, getTreacheryCardDefinition } from '../../data';

// =============================================================================
// BATTLE TOOLS
// =============================================================================

/**
 * Create battle phase tools bound to a context manager.
 */
export function createBattleTools(ctx: ToolContextManager) {
  return {
    /**
     * Choose which battle to fight (aggressor only).
     */
    choose_battle: tool({
      description: `As the aggressor (first in storm order), choose which battle to fight.

When multiple battles are possible in the same territory or across territories,
you decide the order. Choose strategically based on:
- Your strength in each location
- Which opponents you want to face first
- Whether you want to weaken an opponent before another battle`,
      inputSchema: ChooseBattleSchema,
      execute: async (params: z.infer<typeof ChooseBattleSchema>, options) => {
        const { territoryId, opponentFaction } = params;
        // This would be validated against actual pending battles
        // For now, just return the choice
        return successResult(
          `Chose to battle ${opponentFaction} in ${territoryId}`,
          {
            faction: ctx.faction,
            territoryId,
            opponent: opponentFaction,
          },
          false
        );
      },
    }),

    /**
     * Submit battle plan.
     */
    submit_battle_plan: tool({
      description: `Submit your secret battle plan.

Components:
- Leader: Adds strength to your dial. Required if you have available leaders.
- Forces Dialed: 0 to your forces in territory. These are LOST regardless of outcome.
- Weapon Card: Kills opponent's leader (if not defended)
- Defense Card: Protects your leader from opponent's weapon

Battle Resolution:
- Total = Forces Dialed + Leader Strength (if leader survives)
- Higher total wins (aggressor wins ties)
- Winner loses only forces dialed
- Loser loses ALL forces in territory

Special:
- Lasgun + Shield = Both sides destroyed
- Cheap Hero: Can be used instead of a leader (0 strength)
- Kwisatz Haderach (Atreides): +2 to leader strength`,
      inputSchema: BattlePlanSchema,
      execute: async (params: z.infer<typeof BattlePlanSchema>, options) => {
        const {
          leaderId,
          forcesDialed,
          weaponCardId,
          defenseCardId,
          useKwisatzHaderach,
          useCheapHero,
        } = params;
        const state = ctx.state;
        const faction = ctx.faction;
        const factionState = getFactionState(state, faction);

        // Validate leader
        if (leaderId && !useCheapHero) {
          const leader = factionState.leaders.find((l) => l.definitionId === leaderId);
          if (!leader) {
            return failureResult(
              `Leader not found: ${leaderId}`,
              {
                code: 'INVALID_LEADER',
                message: 'You do not have this leader',
                suggestion: 'Check available leaders with view_my_faction',
              },
              false
            );
          }
          if (leader.location !== LeaderLocation.LEADER_POOL) {
            return failureResult(
              `Leader ${leaderId} is not available`,
              {
                code: 'LEADER_UNAVAILABLE',
                message: `This leader is ${leader.location}`,
                suggestion: 'Choose an available leader or use Cheap Hero',
              },
              false
            );
          }
        }

        // Validate weapon card if provided
        if (weaponCardId) {
          const card = factionState.hand.find((c) => c.definitionId === weaponCardId);
          if (!card) {
            return failureResult(
              `Weapon card not in hand: ${weaponCardId}`,
              {
                code: 'CARD_NOT_IN_HAND',
                message: 'You do not have this card',
                suggestion: 'Check your hand with view_my_hand',
              },
              false
            );
          }
          const cardDef = getTreacheryCardDefinition(weaponCardId);
          if (!cardDef || !cardDef.type.includes('WEAPON')) {
            return failureResult(
              `${weaponCardId} is not a weapon`,
              {
                code: 'INVALID_WEAPON',
                message: 'This card cannot be used as a weapon',
              },
              false
            );
          }
        }

        // Validate defense card if provided
        if (defenseCardId) {
          const card = factionState.hand.find((c) => c.definitionId === defenseCardId);
          if (!card) {
            return failureResult(
              `Defense card not in hand: ${defenseCardId}`,
              {
                code: 'CARD_NOT_IN_HAND',
                message: 'You do not have this card',
                suggestion: 'Check your hand with view_my_hand',
              },
              false
            );
          }
        }

        // Build battle plan summary
        const leaderDef = leaderId ? getLeaderDefinition(leaderId) : null;
        const leaderStrength = leaderDef?.strength ?? 0;
        const kwisatzBonus = useKwisatzHaderach ? 2 : 0;

        return successResult(
          `Battle plan submitted: ${forcesDialed} forces dialed, ${leaderDef?.name ?? 'no leader'}`,
          {
            faction,
            plan: {
              leaderId,
              leaderName: leaderDef?.name,
              leaderStrength,
              forcesDialed,
              weaponCardId,
              defenseCardId,
              useKwisatzHaderach,
              useCheapHero,
            },
            estimatedTotal: forcesDialed + leaderStrength + kwisatzBonus,
          },
          false // State updated by phase handler
        );
      },
    }),

    /**
     * Call traitor on opponent's leader.
     */
    call_traitor: tool({
      description: `Call traitor on your opponent's leader.

If you have a traitor card matching the opponent's leader:
- You automatically win the battle
- You lose nothing (not even forces dialed)
- Opponent loses all forces and their leader goes to tanks
- You receive spice equal to the traitor's strength

This is a powerful ability - use it at the right moment!`,
      inputSchema: CallTraitorSchema,
      execute: async (params: z.infer<typeof CallTraitorSchema>, options) => {
        const { leaderId } = params;
        const factionState = getFactionState(ctx.state, ctx.faction);

        // Check if we have this traitor
        const hasTraitor = factionState.traitors.some(
          (t) => t.leaderId === leaderId
        );

        if (!hasTraitor) {
          return failureResult(
            `You don't have ${leaderId} as a traitor`,
            {
              code: 'NO_TRAITOR_CARD',
              message: 'You do not have a traitor card for this leader',
              suggestion: 'Check your traitors with view_my_traitors',
            },
            false
          );
        }

        const leaderDef = getLeaderDefinition(leaderId);

        return successResult(
          `Called traitor on ${leaderDef?.name ?? leaderId}!`,
          {
            faction: ctx.faction,
            traitorLeaderId: leaderId,
            traitorName: leaderDef?.name,
            spiceReward: leaderDef?.strength ?? 0,
          },
          false // State updated by phase handler
        );
      },
    }),

    /**
     * Pass on calling traitor.
     */
    pass_traitor: tool({
      description: `Decline to call traitor.

You might pass if:
- You don't have the matching traitor card
- You want to save the traitor reveal for a more critical battle
- Calling traitor would hurt an ally`,
      inputSchema: PassActionSchema,
      execute: async (params, options) => {
        return successResult(
          'Passed on calling traitor',
          { faction: ctx.faction, action: 'pass' },
          false
        );
      },
    }),

    /**
     * Reveal prescience element (opponent responds to Atreides prescience).
     */
    reveal_prescience_element: tool({
      description: `Pre-commit the battle plan element Atreides chose to see with prescience.

Atreides has used their prescience ability to see ONE element of your battle plan.
You must now commit to what you will use for that element BEFORE submitting your full plan.
This is binding - you must use this element in your actual battle plan.

The element could be:
- leader: Which leader you plan to use (or null for no leader)
- weapon: Which weapon card you plan to use (or null for no weapon)
- defense: Which defense card you plan to use (or null for no defense)
- number: How many forces and/or spice you plan to dial`,
      inputSchema: z.object({
        leaderId: z.string().nullable().optional().describe('Leader you will use (if prescience target is "leader")'),
        weaponCardId: z.string().nullable().optional().describe('Weapon card you will use (if prescience target is "weapon")'),
        defenseCardId: z.string().nullable().optional().describe('Defense card you will use (if prescience target is "defense")'),
        forcesDialed: z.number().nullable().optional().describe('Number of forces you will dial (if prescience target is "number")'),
        spiceDialed: z.number().nullable().optional().describe('Amount of spice you will dial (if prescience target is "number")'),
      }),
      execute: async (params, options) => {
        // Just record the commitment - actual validation happens during battle plan submission
        return successResult(
          'Prescience element revealed to Atreides',
          {
            faction: ctx.faction,
            ...params,
          },
          false // State updated by phase handler
        );
      },
    }),
  };
}

// =============================================================================
// TOOL LIST
// =============================================================================

export const BATTLE_TOOL_NAMES = [
  'choose_battle',
  'submit_battle_plan',
  'call_traitor',
  'pass_traitor',
  'reveal_prescience_element',
] as const;
export type BattleToolName = (typeof BATTLE_TOOL_NAMES)[number];
