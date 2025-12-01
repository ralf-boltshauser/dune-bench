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
import { ShipForcesSchema, PassActionSchema, FremenSendForcesSchema, GuildCrossShipSchema, GuildOffPlanetSchema, BGSpiritualAdvisorSchema, BGIntrusionSchema, BGTakeUpArmsSchema } from '../schemas';
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
  getFactionsOccupyingTerritory,
  convertBGFightersToAdvisors,
  getBGFightersInSector,
} from '../../state';
import { validateShipment, validateCrossShip, validateOffPlanetShipment, getTerritoriesWithinDistance } from '../../rules';
import { Faction, TERRITORY_DEFINITIONS, STRONGHOLD_TERRITORIES, TerritoryId as TerritoryIdEnum } from '../../types';
import { normalizeTerritoryId } from '../../utils/territory-normalize';

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
        const { territoryId: rawTerritoryId, sector, regularCount, eliteCount } = params;
        
        // Normalize territory ID (schema no longer has transform)
        const territoryId = normalizeTerritoryId(rawTerritoryId);
        if (!territoryId) {
          return failureResult(
            `Invalid territory ID: "${rawTerritoryId}"`,
            { code: 'INVALID_TERRITORY', message: `Territory "${rawTerritoryId}" does not exist` },
            false
          );
        }
        
        const state = ctx.state;
        const faction = ctx.faction;

        const totalCount = (regularCount ?? 0) + (eliteCount ?? 0);
        if (totalCount <= 0) {
          return failureResult(
            'You must ship at least 1 force (regular or elite)',
            {
              code: 'INVALID_COUNT',
              message: 'Shipment must include at least 1 regular or elite force',
            },
            false
          );
        }

        // Validate the shipment (territory ID now normalized)
        const validation = validateShipment(
          state,
          faction,
          territoryId,
          sector,
          totalCount
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

        // Extra validation: ensure we have enough regular and elite reserves separately
        const factionState = getFactionState(state, faction);
        const reservesRegular = factionState.forces.reserves.regular;
        const reservesElite = factionState.forces.reserves.elite;
        if (regularCount > reservesRegular || eliteCount > reservesElite) {
          return failureResult(
            `Cannot ship ${regularCount} regular and ${eliteCount} elite forces, only ${reservesRegular} regular and ${reservesElite} elite available in reserves`,
            {
              code: 'INSUFFICIENT_RESERVES',
              message: `Only ${reservesRegular} regular and ${reservesElite} elite forces in reserves`,
            },
            false
          );
        }

        // Execute shipment (ID already normalized)
        let newState = state;
        if (regularCount > 0) {
          newState = shipForces(newState, faction, territoryId, sector, regularCount, false, false);
        }
        if (eliteCount > 0) {
          newState = shipForces(newState, faction, territoryId, sector, eliteCount, true, false);
        }
        newState = removeSpice(newState, faction, cost);

        // Pay Guild if in game
        if (newState.factions.has(Faction.SPACING_GUILD) && faction !== Faction.SPACING_GUILD) {
          newState = addSpice(newState, Faction.SPACING_GUILD, cost);
        }

        ctx.updateState(newState);

        return successResult(
          `Shipped ${totalCount} forces to ${territoryId} (sector ${sector}) for ${cost} spice`,
          {
            faction,
            territoryId,
            sector,
            regularCount,
            eliteCount,
            totalCount,
            cost,
            guildPayment: faction !== Faction.SPACING_GUILD ? cost : 0,
            appliedByTool: true,
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
        const { territoryId: rawTerritoryId, sector, regularCount, eliteCount, allowStormMigration } = params;
        
        // Normalize territory ID (schema no longer has transform)
        const territoryId = normalizeTerritoryId(rawTerritoryId);
        if (!territoryId) {
          return failureResult(
            `Invalid territory ID: "${rawTerritoryId}"`,
            { code: 'INVALID_TERRITORY', message: `Territory "${rawTerritoryId}" does not exist` },
            false
          );
        }
        
        const state = ctx.state;
        const faction = ctx.faction;

        const totalCount = (regularCount ?? 0) + (eliteCount ?? 0);
        if (totalCount <= 0) {
          return failureResult(
            'You must send at least 1 force (regular or elite)',
            {
              code: 'INVALID_COUNT',
              message: 'Shipment must include at least 1 regular or elite force',
            },
            false
          );
        }

        // Check: Must be Fremen
        if (faction !== Faction.FREMEN) {
          return failureResult(
            'Only Fremen can use this ability',
            { code: 'INVALID_FACTION', message: 'Only Fremen can use this ability' },
            false
          );
        }

        // Check: Sufficient forces in reserves (per bucket)
        const reserves = getFactionState(state, faction).forces.reserves;
        const totalReserves = reserves.regular + reserves.elite;
        if (totalCount > totalReserves || regularCount > reserves.regular || eliteCount > reserves.elite) {
          return failureResult(
            `Cannot send ${regularCount} regular and ${eliteCount} elite forces, only ${reserves.regular} regular and ${reserves.elite} elite available in reserves`,
            {
              code: 'INSUFFICIENT_RESERVES',
              message: `Only ${reserves.regular} regular and ${reserves.elite} elite forces in reserves`,
            },
            false
          );
        }

        // Check: Valid territory
        const territory = TERRITORY_DEFINITIONS[territoryId];

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

        if (!validDestinations.has(territoryId)) {
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
        // Use getFactionsOccupyingTerritory() which excludes BG advisors-only (Rule 2.02.12)
        if (STRONGHOLD_TERRITORIES.includes(territoryId)) {
          const occupants = getFactionsOccupyingTerritory(state, territoryId);
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

        // Territory ID already normalized by schema
        let newState = state;
        if (regularCount > 0) {
          newState = shipForces(
            newState,
            faction,
            territoryId,
            sector,
            regularCount,
            false,
            false
          );
        }
        if (eliteCount > 0) {
          newState = shipForces(
            newState,
            faction,
            territoryId,
            sector,
            eliteCount,
            true,
            false
          );
        }

        // Apply storm migration losses if sending into storm
        let lostToStorm = 0;
        if (inStorm && allowStormMigration) {
          lostToStorm = Math.ceil(totalCount / 2);
          const survivors = totalCount - lostToStorm;

          // Remove the forces we just shipped, then add back only survivors.
          // We treat storm losses as coming from regular forces first, then elite.
          let remainingToLose = lostToStorm;
          if (remainingToLose > 0 && regularCount > 0) {
            const regularLost = Math.min(regularCount, remainingToLose);
            newState = sendForcesToTanks(
              newState,
              faction,
              territoryId,
              sector,
              regularLost,
              false
            );
            remainingToLose -= regularLost;
          }
          if (remainingToLose > 0 && eliteCount > 0) {
            const eliteLost = Math.min(eliteCount, remainingToLose);
            newState = sendForcesToTanks(
              newState,
              faction,
              territoryId,
              sector,
              eliteLost,
              true
            );
          }
        }

        ctx.updateState(newState);

        const message = allowStormMigration && inStorm
          ? `Sent ${totalCount} forces to ${territoryId} (sector ${sector}) for FREE. Storm migration: ${lostToStorm} lost, ${totalCount - lostToStorm} survived.`
          : `Sent ${totalCount} forces to ${territoryId} (sector ${sector}) for FREE`;

        return successResult(message, {
          faction,
          territoryId,
          sector,
          regularCount,
          eliteCount,
          totalCount,
          cost: 0,
          stormMigration: allowStormMigration && inStorm,
          forcesLost: lostToStorm,
          forcesSurvived: totalCount - lostToStorm,
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
        const { fromTerritoryId: rawFrom, fromSector, toTerritoryId: rawTo, toSector, count, useElite } = params;
        
        // Normalize territory IDs (schema no longer has transform)
        const fromTerritoryId = normalizeTerritoryId(rawFrom);
        const toTerritoryId = normalizeTerritoryId(rawTo);
        
        if (!fromTerritoryId) {
          return failureResult(
            `Invalid from territory ID: "${rawFrom}"`,
            { code: 'INVALID_TERRITORY', message: `Territory "${rawFrom}" does not exist` },
            false
          );
        }
        if (!toTerritoryId) {
          return failureResult(
            `Invalid to territory ID: "${rawTo}"`,
            { code: 'INVALID_TERRITORY', message: `Territory "${rawTo}" does not exist` },
            false
          );
        }
        
        const state = ctx.state;
        const faction = ctx.faction;

        // Validate the cross-ship
        const validation = validateCrossShip(
          state,
          faction,
          fromTerritoryId,
          fromSector,
          toTerritoryId,
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

        // Execute cross-ship (move forces between territories) - IDs already normalized
        let newState = moveForces(
          state,
          faction,
          fromTerritoryId,
          fromSector,
          toTerritoryId,
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
        const { choice, territoryId: rawTerritoryId, sector } = params;
        
        // Normalize territory ID if provided (schema no longer has transform)
        const territoryId = rawTerritoryId ? normalizeTerritoryId(rawTerritoryId) : undefined;
        if (rawTerritoryId && !territoryId) {
          return failureResult(
            `Invalid territory ID: "${rawTerritoryId}"`,
            { code: 'INVALID_TERRITORY', message: `Territory "${rawTerritoryId}" does not exist` },
            false
          );
        }
        
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
          const newState = shipForces(
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

          // Rule 2.02.11: Must match the triggering shipment's territory AND sector
          const trigger = state.bgSpiritualAdvisorTrigger;
          if (!trigger) {
            return failureResult(
              'No triggering shipment found. Cannot use same_territory option.',
              { code: 'NO_TRIGGER', message: 'Spiritual advisor must be triggered by another faction\'s shipment' },
              false
            );
          }

          // Validate territory matches triggering shipment
          if (territoryId !== trigger.territory) {
            return failureResult(
              `Rule 2.02.11: Territory must match the triggering shipment. Expected ${trigger.territory}, got ${territoryId}`,
              {
                code: 'TERRITORY_MISMATCH',
                message: `Must send to same territory as triggering shipment (${trigger.territory})`,
                field: 'territoryId',
                providedValue: territoryId,
              },
              false
            );
          }

          // Validate sector matches triggering shipment
          if (sector !== trigger.sector) {
            return failureResult(
              `Rule 2.02.11: Sector must match the triggering shipment. Expected sector ${trigger.sector}, got ${sector}`,
              {
                code: 'SECTOR_MISMATCH',
                message: `Must send to same sector as triggering shipment (sector ${trigger.sector})`,
                field: 'sector',
                providedValue: sector,
              },
              false
            );
          }

          // Check: Valid territory (already normalized above)
          const territory = TERRITORY_DEFINITIONS[territoryId!];

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
          // TODO(#advisor-fighter): When advisor/fighter distinction is implemented, only check for fighters
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
          // Rule 2.02.11: Spiritual Advisor ability ships as advisor (not fighter)
          const newState = shipForces(
            state,
            faction,
            territoryId,
            sector,
            1,
            false, // Regular force
            true   // isAdvisor=true: Ship as advisor (for Spiritual Advisor ability)
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

        // Normalize territory ID
        const normalizedFrom = normalizeTerritoryId(fromTerritoryId);
        if (!normalizedFrom) {
          return failureResult(
            `Invalid territory ID: ${fromTerritoryId}`,
            { code: 'INVALID_TERRITORY', message: `Territory "${fromTerritoryId}" does not exist` },
            false
          );
        }

        // Execute off-planet shipment (send forces back to reserves) with normalized ID
        let newState = sendForcesToReserves(
          state,
          faction,
          normalizedFrom,
          fromSector,
          count,
          useElite
        );
        newState = removeSpice(newState, faction, cost);

        ctx.updateState(newState);

        return successResult(
          `Shipped ${count} forces from ${normalizedFrom} back to reserves for ${cost} spice`,
          {
            faction,
            fromTerritory: normalizedFrom,
            fromSector,
            count,
            cost,
          },
          true
        );
      },
    }),

    /**
     * Bene Gesserit INTRUSION ability (Rule 2.02.16).
     * When a non-ally enters a territory where BG has fighters, BG may flip them to advisors.
     */
    bg_intrusion: tool({
      description: `Bene Gesserit INTRUSION ability (Rule 2.02.16): When a Force of another faction that you are not allied to enters a Territory where you have fighters, you may flip them to advisors.

This is an OPTIONAL ability that triggers when:
- A non-ally faction ships or moves forces into a territory
- You have fighters (not advisors) in that territory
- You choose to flip those fighters to advisors

Key points:
- OPTIONAL (you can pass)
- Can be cancelled by Karama (✷)
- "Enters" includes: ship, move, send, worm ride, etc.
- Only applies to fighters (not advisors)
- Only applies when non-ally enters (allies don't trigger this)

Use this to:
- Avoid battles by converting fighters to non-combatant advisors
- Coexist peacefully with other factions
- Maintain presence without engaging in combat`,
      inputSchema: BGIntrusionSchema,
      execute: async (params: z.infer<typeof BGIntrusionSchema>, options) => {
        const { choice, territoryId: rawTerritoryId, sector, count } = params;
        
        // Normalize territory ID
        const territoryId = normalizeTerritoryId(rawTerritoryId);
        if (!territoryId) {
          return failureResult(
            `Invalid territory ID: "${rawTerritoryId}"`,
            { code: 'INVALID_TERRITORY', message: `Territory "${rawTerritoryId}" does not exist` },
            false
          );
        }
        
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
            'Bene Gesserit passes on INTRUSION ability',
            { faction, choice: 'pass' },
            false
          );
        }

        // Check: Must have fighters in the territory/sector
        const fightersInSector = getBGFightersInSector(state, territoryId, sector);
        if (fightersInSector === 0) {
          return failureResult(
            `No fighters in ${territoryId} sector ${sector} to flip to advisors`,
            { code: 'NO_FIGHTERS', message: 'No fighters present in this location' },
            false
          );
        }

        // Determine how many to flip (default to all if not specified)
        const flipCount = count !== undefined ? count : fightersInSector;
        if (flipCount > fightersInSector) {
          return failureResult(
            `Cannot flip ${flipCount} fighters: only ${fightersInSector} fighters available`,
            { code: 'INSUFFICIENT_FIGHTERS', message: 'Not enough fighters to flip' },
            false
          );
        }

        if (flipCount <= 0) {
          return failureResult(
            'Must flip at least 1 fighter',
            { code: 'INVALID_COUNT', message: 'Count must be positive' },
            false
          );
        }

        // Check: Valid territory
        const territory = TERRITORY_DEFINITIONS[territoryId];
        if (!territory) {
          return failureResult(
            `Invalid territory: ${territoryId}`,
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

        // Execute the flip
        const newState = convertBGFightersToAdvisors(
          state,
          territoryId,
          sector,
          flipCount
        );

        ctx.updateState(newState);

        return successResult(
          `Bene Gesserit flips ${flipCount} fighter${flipCount !== 1 ? 's' : ''} to advisor${flipCount !== 1 ? 's' : ''} in ${territory.name} (sector ${sector})`,
          {
            faction,
            choice: 'flip',
            territoryId,
            sector,
            count: flipCount,
          },
          true
        );
      },
    }),

    /**
     * Bene Gesserit TAKE UP ARMS ability (Rule 2.02.17).
     * When moving advisors to occupied territory, BG may flip them to fighters.
     */
    bg_take_up_arms: tool({
      description: `Bene Gesserit TAKE UP ARMS ability (Rule 2.02.17): When you Move advisors into an occupied Territory, you may flip them to fighters following occupancy limit if you do not already have advisors present.

Rule 2.02.17: "When you Move advisors into an occupied Territory, you may flip them to fighters following occupancy limit if you do not already have advisors present.✷"

Key points:
- OPTIONAL (you choose whether to flip)
- Only applies when moving advisors to occupied territory (other factions present)
- Only if you DON'T already have advisors in that territory
- Subject to PEACETIME restriction (can't flip with ally present)
- Subject to STORMED IN restriction (can't flip under storm)
- Must follow occupancy limit (for strongholds)
- Can be cancelled by Karama (✷)`,
      inputSchema: BGTakeUpArmsSchema,
      execute: async (params: z.infer<typeof BGTakeUpArmsSchema>, options) => {
        const { choice } = params;
        
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
            'Bene Gesserit passes on TAKE UP ARMS (keeps advisors as advisors)',
            { faction, choice: 'pass' },
            false
          );
        }

        // The actual flip is handled by the phase handler after movement
        // This tool just indicates the choice
        // The phase handler will validate restrictions and perform the flip
        return successResult(
          'Bene Gesserit chooses to flip advisors to fighters (TAKE UP ARMS)',
          {
            faction,
            choice: 'flip',
          },
          false // State update handled by phase handler
        );
      },
    }),
  };
}

// =============================================================================
// TOOL LIST
// =============================================================================

export const SHIPMENT_TOOL_NAMES = ['ship_forces', 'fremen_send_forces', 'guild_cross_ship', 'guild_ship_off_planet', 'bg_send_spiritual_advisor', 'bg_intrusion', 'bg_take_up_arms', 'pass_shipment', 'guild_act_now', 'guild_wait'] as const;
export type ShipmentToolName = (typeof SHIPMENT_TOOL_NAMES)[number];
