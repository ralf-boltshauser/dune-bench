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
import { ShipForcesSchema, PassActionSchema, FremenSendForcesSchema, GuildCrossShipSchema, GuildOffPlanetSchema, BGSpiritualAdvisorSchema } from '../schemas';
import {
  getFactionState,
  shipForces,
  removeSpice,
  addSpice,
  sendForcesToTanks,
  sendForcesToReserves,
  moveForces,
  getReserveForceCount,
  isSectorInStorm,
  getFactionsInTerritory,
} from '../../state';
import { validateShipment, validateCrossShip, validateOffPlanetShipment, getTerritoriesWithinDistance } from '../../rules';
import { Faction, TERRITORY_DEFINITIONS, STRONGHOLD_TERRITORIES, TerritoryId as TerritoryIdEnum } from '../../types';

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
          newState = addSpice(newState, Faction.SPACING_GUILD, cost);
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
            guildPayment: faction !== Faction.SPACING_GUILD ? cost : 0,
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

    /**
     * Spacing Guild timing decision: Act now or wait.
     */
    guild_act_now: tool({
      description: `Spacing Guild special ability: Choose to act now, out of storm order.
      
When you use this, you will immediately do BOTH your shipment and movement actions together, before the next faction in storm order acts.

Use this when you want to:
- Act before a specific faction
- Seize an opportunity before others
- Control the timing of your actions`,
      inputSchema: z.object({
        reason: z.string().optional().describe('Brief reason for acting now'),
      }),
      execute: async (params, options) => {
        if (ctx.faction !== Faction.SPACING_GUILD) {
          return failureResult(
            'Only Spacing Guild can use this ability',
            { code: 'INVALID_FACTION', message: 'Only Spacing Guild can use this ability' },
            false
          );
        }
        return successResult(
          'Spacing Guild chooses to act now',
          { faction: ctx.faction, actNow: true, reason: params.reason },
          true
        );
      },
    }),

    /**
     * Spacing Guild timing decision: Wait for normal storm order.
     */
    guild_wait: tool({
      description: `Spacing Guild special ability: Choose to wait and act in normal storm order.

When you use this, you will wait and the next faction in storm order will act. You can be asked again after each faction acts.

Use this when you want to:
- See what other factions do first
- Act later in the turn
- Wait for a better opportunity`,
      inputSchema: PassActionSchema,
      execute: async (params, options) => {
        if (ctx.faction !== Faction.SPACING_GUILD) {
          return failureResult(
            'Only Spacing Guild can use this ability',
            { code: 'INVALID_FACTION', message: 'Only Spacing Guild can use this ability' },
            false
          );
        }
        return successResult(
          'Spacing Guild chooses to wait',
          { faction: ctx.faction, actNow: false },
          false
        );
      },
    }),

    /**
     * Fremen special ability: Send forces for free to Great Flat area.
     */
    fremen_send_forces: tool({
      description: `Fremen special ability: Send forces from reserves for FREE to the Great Flat or nearby territories.

Valid destinations:
- The Great Flat itself
- Any territory within 2 territories of The Great Flat

Special abilities:
- COMPLETELY FREE (no spice cost)
- Can optionally use Storm Migration: send into storm at half loss (rounded up)
- Subject to normal storm restrictions (unless using storm migration)
- Subject to occupancy limits at strongholds

This is your only shipment method as Fremen - you cannot use normal off-planet shipment.`,
      inputSchema: FremenSendForcesSchema,
      execute: async (params: z.infer<typeof FremenSendForcesSchema>, options) => {
        const { territoryId, sector, count, useElite, allowStormMigration } = params;
        const state = ctx.state;
        const faction = ctx.faction;

        // Check: Must be Fremen
        if (faction !== Faction.FREMEN) {
          return failureResult(
            'Only Fremen can use this ability',
            { code: 'INVALID_FACTION', message: 'Only Fremen can use this ability' },
            false
          );
        }

        // Check: Sufficient forces in reserves
        const reserves = getReserveForceCount(state, faction);
        if (count > reserves) {
          return failureResult(
            `Cannot send ${count} forces, only ${reserves} available in reserves`,
            { code: 'INSUFFICIENT_RESERVES', message: `Only ${reserves} forces in reserves` },
            false
          );
        }

        // Check: Valid territory
        const territory = TERRITORY_DEFINITIONS[territoryId as TerritoryId];
        if (!territory) {
          return failureResult(
            `Territory ${territoryId} does not exist`,
            { code: 'INVALID_TERRITORY', message: 'Territory does not exist' },
            false
          );
        }

        // Check: Valid sector
        if (!territory.sectors.includes(sector) && territory.sectors.length > 0) {
          return failureResult(
            `Sector ${sector} is not part of ${territory.name}`,
            { code: 'INVALID_TERRITORY', message: `Invalid sector for ${territory.name}` },
            false
          );
        }

        // Check: Must be Great Flat or within 2 territories
        const greatFlat = TerritoryIdEnum.THE_GREAT_FLAT;
        const validDestinations = getTerritoriesWithinDistance(greatFlat, 2);
        validDestinations.add(greatFlat); // Include Great Flat itself

        if (!validDestinations.has(territoryId as TerritoryId)) {
          return failureResult(
            `${territory.name} is not The Great Flat or within 2 territories of it`,
            {
              code: 'INVALID_DESTINATION',
              message: 'Fremen can only send to Great Flat area (within 2 territories)',
            },
            false
          );
        }

        // Check: Storm restrictions
        const inStorm = isSectorInStorm(state, sector);
        if (inStorm && !allowStormMigration) {
          return failureResult(
            `Sector ${sector} is in storm. Use allowStormMigration=true to send forces at half loss`,
            {
              code: 'SECTOR_IN_STORM',
              message: 'Cannot send to storm without storm migration',
            },
            false
          );
        }

        // Check: Occupancy limit for strongholds
        if (STRONGHOLD_TERRITORIES.includes(territoryId as TerritoryId)) {
          const occupants = getFactionsInTerritory(state, territoryId as TerritoryId);
          if (occupants.length >= 2 && !occupants.includes(faction)) {
            return failureResult(
              `${territory.name} already has 2 factions occupying it`,
              {
                code: 'OCCUPANCY_LIMIT_EXCEEDED',
                message: 'Stronghold is full',
              },
              false
            );
          }
        }

        // Execute send
        let newState = shipForces(
          state,
          faction,
          territoryId as TerritoryId,
          sector,
          count,
          useElite
        );

        // Apply storm migration losses if sending into storm
        let lostToStorm = 0;
        if (inStorm && allowStormMigration) {
          lostToStorm = Math.ceil(count / 2);
          const survivors = count - lostToStorm;

          // Remove the forces we just shipped, then add back only survivors
          newState = sendForcesToTanks(
            newState,
            faction,
            territoryId as TerritoryId,
            sector,
            lostToStorm,
            useElite
          );
        }

        ctx.updateState(newState);

        const message = allowStormMigration && inStorm
          ? `Sent ${count} forces to ${territoryId} (sector ${sector}) for FREE. Storm migration: ${lostToStorm} lost, ${count - lostToStorm} survived.`
          : `Sent ${count} forces to ${territoryId} (sector ${sector}) for FREE`;

        return successResult(message, {
          faction,
          territoryId,
          sector,
          count,
          cost: 0,
          stormMigration: allowStormMigration && inStorm,
          forcesLost: lostToStorm,
          forcesSurvived: count - lostToStorm,
        }, true);
      },
    }),

    /**
     * Guild cross-ship: Ship forces from one territory to another.
     */
    guild_cross_ship: tool({
      description: `Spacing Guild special ability: Cross-ship forces from one territory to another.

This is ONE of the THREE shipment types available to Guild:
1. Normal shipment (reserves to planet)
2. Cross-ship (planet to planet) - THIS TOOL
3. Off-planet (planet to reserves)

You can only use ONE shipment type per turn.

Costs:
- Based on destination: 1 spice per force to strongholds, 2 per force to territories
- Guild and Guild's ally pay half price (rounded up)
- Spice goes to the bank

Restrictions:
- Cannot ship into storm
- Cannot ship into a stronghold with 2+ other factions
- Cannot ship more forces than you have in the source territory
- Guild's ally can also use this ability (ability 2.06.10)

Use this when you need to reposition forces on the board without bringing new forces from reserves.`,
      inputSchema: GuildCrossShipSchema,
      execute: async (params: z.infer<typeof GuildCrossShipSchema>, options) => {
        const { fromTerritoryId, fromSector, toTerritoryId, toSector, count, useElite } = params;
        const state = ctx.state;
        const faction = ctx.faction;

        // Validate the cross-ship
        const validation = validateCrossShip(
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
            `Cross-ship rejected: ${error.message}`,
            validationToToolError(error),
            false
          );
        }

        // Get the calculated cost from validation context
        const cost = validation.context.cost as number;

        // Execute cross-ship (move forces between territories)
        let newState = moveForces(
          state,
          faction,
          fromTerritoryId as TerritoryId,
          fromSector,
          toTerritoryId as TerritoryId,
          toSector,
          count,
          useElite
        );
        newState = removeSpice(newState, faction, cost);

        ctx.updateState(newState);

        return successResult(
          `Cross-shipped ${count} forces from ${fromTerritoryId} to ${toTerritoryId} for ${cost} spice`,
          {
            faction,
            fromTerritory: fromTerritoryId,
            fromSector,
            toTerritory: toTerritoryId,
            toSector,
            count,
            cost,
          },
          true
        );
      },
    }),

    /**
     * Bene Gesserit spiritual advisor: Send 1 force for free when another faction ships.
     */
    bg_send_spiritual_advisor: tool({
      description: `Bene Gesserit special ability: Send 1 spiritual advisor for FREE when another faction ships forces.

Rule 2.02.05 (Basic): Whenever any other faction ships forces onto Dune from off-planet, you may send 1 Force (fighter) for free from your reserves to the Polar Sink.

Rule 2.02.11 (Advanced): When using ability Spiritual Advisors, you may send 1 advisor for free from your reserves into the same Territory (and same Sector) that faction ships to, in place of sending a fighter to the Polar Sink. You may only do this when you do not have fighters already present in that Territory.

Key points:
- COMPLETELY FREE (no spice cost)
- Does NOT count as your shipment action (it's a reaction)
- Can trigger MULTIPLE times per phase if multiple factions ship
- Choose between: Polar Sink (basic), same territory as triggering shipment (advanced), or pass
- Advanced option only available if you have NO fighters in the target territory`,
      inputSchema: BGSpiritualAdvisorSchema,
      execute: async (params: z.infer<typeof BGSpiritualAdvisorSchema>, options) => {
        const { choice, territoryId, sector } = params;
        const state = ctx.state;
        const faction = ctx.faction;

        // Check: Must be Bene Gesserit
        if (faction !== Faction.BENE_GESSERIT) {
          return failureResult(
            'Only Bene Gesserit can use this ability',
            { code: 'INVALID_FACTION', message: 'Only Bene Gesserit can use this ability' },
            false
          );
        }

        // Check if passing
        if (choice === 'pass') {
          return successResult(
            'Bene Gesserit passes on sending spiritual advisor',
            { faction, choice: 'pass' },
            false
          );
        }

        // Check: Must have reserves
        const reserves = getReserveForceCount(state, faction);
        if (reserves < 1) {
          return failureResult(
            'No forces in reserves to send as spiritual advisor',
            { code: 'INSUFFICIENT_RESERVES', message: 'No forces in reserves' },
            false
          );
        }

        // Handle polar sink choice (basic rules)
        if (choice === 'polar_sink') {
          const polarSink = TerritoryIdEnum.POLAR_SINK;
          const polarSinkTerritory = TERRITORY_DEFINITIONS[polarSink];
          const polarSinkSector = polarSinkTerritory.sectors[0] || 0;

          // Ship 1 fighter to Polar Sink for free
          let newState = shipForces(
            state,
            faction,
            polarSink,
            polarSinkSector,
            1,
            false // Regular force (fighter)
          );

          ctx.updateState(newState);

          return successResult(
            'Bene Gesserit sends 1 spiritual advisor (fighter) to Polar Sink for FREE',
            {
              faction,
              choice: 'polar_sink',
              territoryId: polarSink,
              sector: polarSinkSector,
              count: 1,
              cost: 0,
            },
            true
          );
        }

        // Handle same_territory choice (advanced rules)
        if (choice === 'same_territory') {
          // Validate required parameters
          if (!territoryId || sector === undefined) {
            return failureResult(
              'Territory and sector are required for same_territory choice',
              { code: 'INVALID_PARAMETERS', message: 'Missing territory or sector' },
              false
            );
          }

          // Check: Valid territory
          const territory = TERRITORY_DEFINITIONS[territoryId as TerritoryId];
          if (!territory) {
            return failureResult(
              `Territory ${territoryId} does not exist`,
              { code: 'INVALID_TERRITORY', message: 'Territory does not exist' },
              false
            );
          }

          // Check: Valid sector
          if (!territory.sectors.includes(sector) && territory.sectors.length > 0) {
            return failureResult(
              `Sector ${sector} is not part of ${territory.name}`,
              { code: 'INVALID_TERRITORY', message: `Invalid sector for ${territory.name}` },
              false
            );
          }

          // Check: Cannot send into storm
          const inStorm = isSectorInStorm(state, sector);
          if (inStorm) {
            return failureResult(
              `Sector ${sector} is in storm. Cannot send spiritual advisor into storm`,
              { code: 'SECTOR_IN_STORM', message: 'Cannot send into storm' },
              false
            );
          }

          // Advanced Rule Check: No fighters already present in that territory
          // We need to check if BG has any fighters (not advisors) in the territory
          const factionState = getFactionState(state, faction);
          const forcesInTerritory = factionState.forces.onBoard.filter(
            (s) => s.territoryId === territoryId
          );

          // For now, treat all forces as fighters (we don't have advisor tracking yet)
          // TODO: When advisor/fighter distinction is implemented, only check for fighters
          const hasForcesInTerritory = forcesInTerritory.length > 0;
          if (hasForcesInTerritory) {
            return failureResult(
              `Cannot use advanced spiritual advisor ability: you already have fighters in ${territory.name}`,
              {
                code: 'INVALID_TARGET',
                message: 'Can only send advisor to territory with no fighters present',
              },
              false
            );
          }

          // Ship 1 advisor to the same territory as triggering shipment
          // Note: Using regular force for now, but this should be an advisor
          // TODO: When advisor/fighter distinction is implemented, send as advisor
          let newState = shipForces(
            state,
            faction,
            territoryId as TerritoryId,
            sector,
            1,
            false // Regular force (advisor in this case)
          );

          ctx.updateState(newState);

          return successResult(
            `Bene Gesserit sends 1 spiritual advisor to ${territory.name} (sector ${sector}) for FREE`,
            {
              faction,
              choice: 'same_territory',
              territoryId,
              sector,
              count: 1,
              cost: 0,
              isAdvisor: true, // Mark for future advisor tracking
            },
            true
          );
        }

        // Should not reach here
        return failureResult(
          'Invalid choice',
          { code: 'INVALID_PARAMETERS', message: 'Invalid choice parameter' },
          false
        );
      },
    }),

    /**
     * Guild off-planet: Ship forces from a territory back to reserves.
     */
    guild_ship_off_planet: tool({
      description: `Spacing Guild special ability: Ship forces from a territory back to your off-planet reserves.

This is ONE of the THREE shipment types available to Guild:
1. Normal shipment (reserves to planet)
2. Cross-ship (planet to planet)
3. Off-planet (planet to reserves) - THIS TOOL

You can only use ONE shipment type per turn.

Cost:
- Retreat cost: 1 spice per 2 forces (rounded up)
- Spice goes to the bank

Use this when you need to:
- Retreat forces from a dangerous position
- Reposition forces back to reserves for later deployment
- Escape from a losing battle situation

Note: This is more expensive than movement but allows you to pull forces completely off the board.`,
      inputSchema: GuildOffPlanetSchema,
      execute: async (params: z.infer<typeof GuildOffPlanetSchema>, options) => {
        const { fromTerritoryId, fromSector, count, useElite } = params;
        const state = ctx.state;
        const faction = ctx.faction;

        // Validate the off-planet shipment
        const validation = validateOffPlanetShipment(
          state,
          faction,
          fromTerritoryId as TerritoryId,
          fromSector,
          count
        );

        if (!validation.valid) {
          const error = validation.errors[0];
          return failureResult(
            `Off-planet shipment rejected: ${error.message}`,
            validationToToolError(error),
            false
          );
        }

        // Get the calculated cost from validation context
        const cost = validation.context.cost as number;

        // Execute off-planet shipment (send forces back to reserves)
        let newState = sendForcesToReserves(
          state,
          faction,
          fromTerritoryId as TerritoryId,
          fromSector,
          count,
          useElite
        );
        newState = removeSpice(newState, faction, cost);

        ctx.updateState(newState);

        return successResult(
          `Shipped ${count} forces from ${fromTerritoryId} back to reserves for ${cost} spice`,
          {
            faction,
            fromTerritory: fromTerritoryId,
            fromSector,
            count,
            cost,
          },
          true
        );
      },
    }),
  };
}

// =============================================================================
// TOOL LIST
// =============================================================================

export const SHIPMENT_TOOL_NAMES = ['ship_forces', 'fremen_send_forces', 'guild_cross_ship', 'guild_ship_off_planet', 'bg_send_spiritual_advisor', 'pass_shipment', 'guild_act_now', 'guild_wait'] as const;
export type ShipmentToolName = (typeof SHIPMENT_TOOL_NAMES)[number];
