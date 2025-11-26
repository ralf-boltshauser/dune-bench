/**
 * Shipment Phase Tools
 *
 * Tools for the Shipment sub-phase where players ship forces to Dune.
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { TerritoryId } from '../../types';
import type { ToolContextManager } from '../context';
import { successResult, failureResult, validationToToolError } from '../types';
import { ShipForcesSchema, PassActionSchema } from '../schemas';
import { getFactionState, shipForces, removeSpice, addSpice } from '../../state';
import { validateShipment } from '../../rules';
import { Faction } from '../../types';

// =============================================================================
// SHIPMENT TOOLS
// =============================================================================

/**
 * Create shipment phase tools bound to a context manager.
 */
export function createShipmentTools(ctx: ToolContextManager) {
  return {
    /**
     * Ship forces from off-planet reserves to Dune.
     */
    ship_forces: tool({
      description: `Ship forces from your off-planet reserves to a territory on Dune.

Costs:
- 1 spice per force to strongholds (Arrakeen, Carthag, Tuek's Sietch, etc.)
- 2 spice per force to non-stronghold territories
- Guild pays half price for their own shipments
- Spice goes to the Guild (if in game) or the bank

Restrictions:
- Cannot ship into storm
- Cannot ship into a stronghold with 2+ other factions
- Cannot ship more forces than you have in reserves
- Fremen cannot ship normally (they use free placement instead)

Choose your landing zone carefully - it affects both cost and strategic position.`,
      inputSchema: ShipForcesSchema,
      execute: async (params: z.infer<typeof ShipForcesSchema>, options) => {
        const { territoryId, sector, count, useElite } = params;
        const state = ctx.state;
        const faction = ctx.faction;

        // Validate the shipment
        const validation = validateShipment(
          state,
          faction,
          territoryId as TerritoryId,
          sector,
          count
        );

        if (!validation.valid) {
          const error = validation.errors[0];
          return failureResult(
            `Shipment rejected: ${error.message}`,
            validationToToolError(error),
            false
          );
        }

        // Get the calculated cost from validation context
        const cost = validation.context.cost as number;

        // Execute shipment
        let newState = shipForces(state, faction, territoryId as TerritoryId, sector, count);
        newState = removeSpice(newState, faction, cost);

        // Pay Guild if in game
        if (newState.factions.has(Faction.SPACING_GUILD) && faction !== Faction.SPACING_GUILD) {
          newState = addSpice(newState, Faction.SPACING_GUILD, Math.floor(cost / 2));
        }

        ctx.updateState(newState);

        return successResult(
          `Shipped ${count} forces to ${territoryId} (sector ${sector}) for ${cost} spice`,
          {
            faction,
            territoryId,
            sector,
            count,
            cost,
            guildPayment: faction !== Faction.SPACING_GUILD ? Math.floor(cost / 2) : 0,
          },
          true
        );
      },
    }),

    /**
     * Pass on shipment.
     */
    pass_shipment: tool({
      description: `Skip your shipment action this turn.

You can always pass if you:
- Don't have forces in reserves
- Can't afford to ship
- Don't want to commit forces this turn`,
      inputSchema: PassActionSchema,
      execute: async (params, options) => {
        return successResult(
          'Passed on shipment',
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

export const SHIPMENT_TOOL_NAMES = ['ship_forces', 'pass_shipment'] as const;
export type ShipmentToolName = (typeof SHIPMENT_TOOL_NAMES)[number];
