/**
 * Movement Phase Tools
 *
 * Tools for the Movement sub-phase where players move forces on the board.
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { TerritoryId } from '../../types';
import type { ToolContextManager } from '../context';
import { successResult, failureResult, validationToToolError } from '../types';
import { MoveForcesSchema, PassActionSchema } from '../schemas';
import { getFactionState, moveForces } from '../../state';
import { validateMovement, checkOrnithopterAccess, getMovementRange } from '../../rules';

// =============================================================================
// MOVEMENT TOOLS
// =============================================================================

/**
 * Create movement phase tools bound to a context manager.
 */
export function createMovementTools(ctx: ToolContextManager) {
  return {
    /**
     * Move forces on the board.
     */
    move_forces: tool({
      description: `Move forces from one territory to another.

Movement Rules:
- Basic movement: 1 adjacent territory
- With ornithopters (forces in Arrakeen or Carthag): up to 3 territories
- Fremen: 2 territories (desert movement)
- Cannot move through storm
- Cannot move into strongholds with 2+ other factions
- You get ONE movement action per turn (all forces must move as a group)

Ornithopters are key - controlling Arrakeen or Carthag gives mobility advantage.`,
      inputSchema: MoveForcesSchema,
      execute: async (params: z.infer<typeof MoveForcesSchema>, options) => {
        const { fromTerritoryId, fromSector, toTerritoryId, toSector, count } = params;
        const state = ctx.state;
        const faction = ctx.faction;

        // Check ornithopter access and movement range
        const hasOrnithopters = checkOrnithopterAccess(state, faction);
        const movementRange = getMovementRange(state, faction);

        // Validate the movement
        const validation = validateMovement(
          state,
          faction,
          fromTerritoryId as TerritoryId,
          fromSector,
          toTerritoryId as TerritoryId,
          toSector,
          count
        );

        if (!validation.valid) {
          const error = validation.errors[0];
          return failureResult(
            `Movement rejected: ${error.message}`,
            validationToToolError(error),
            false
          );
        }

        // Execute movement
        const newState = moveForces(
          state,
          faction,
          fromTerritoryId as TerritoryId,
          fromSector,
          toTerritoryId as TerritoryId,
          toSector,
          count
        );

        ctx.updateState(newState);

        return successResult(
          `Moved ${count} forces from ${fromTerritoryId} to ${toTerritoryId}`,
          {
            faction,
            from: { territory: fromTerritoryId, sector: fromSector },
            to: { territory: toTerritoryId, sector: toSector },
            count,
            hadOrnithopters: hasOrnithopters,
            movementRange,
          },
          true
        );
      },
    }),

    /**
     * Pass on movement.
     */
    pass_movement: tool({
      description: `Skip your movement action this turn.

You might pass if:
- Your forces are already well-positioned
- You want to avoid triggering battles
- You're waiting for a better opportunity`,
      inputSchema: PassActionSchema,
      execute: async (params, options) => {
        return successResult(
          'Passed on movement',
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

export const MOVEMENT_TOOL_NAMES = ['move_forces', 'pass_movement'] as const;
export type MovementToolName = (typeof MOVEMENT_TOOL_NAMES)[number];
