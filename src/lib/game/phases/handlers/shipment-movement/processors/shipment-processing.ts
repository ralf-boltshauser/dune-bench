/**
 * Shipment Processing
 *
 * Handles all shipment action processing:
 * - Normal shipment (reserves to board)
 * - Guild cross-ship (board to board)
 * - Guild off-planet (board to reserves)
 * - Fremen shipment (special rules)
 * 
 * @rule 2.06.05 THREE TYPES OF SHIPMENT: Guild can make one of three types of shipments each Turn.
 */

import { Faction, TerritoryId, type GameState } from "@/lib/game/types";
import { FACTION_NAMES } from "@/lib/game/types";
import {
  moveForces,
  removeSpice,
  addSpice,
  sendForcesToReserves,
  shipForces,
  logAction,
  validateStrongholdOccupancy,
} from "@/lib/game/state";
import { type AgentResponse, type PhaseEvent } from "@/lib/game/phases/types";
import { type ProcessingResult } from "../types";
import { normalizeTerritoryIds } from "../helpers";

export class ShipmentProcessor {
  /**
   * Process shipment action from agent response
   */
  process(
    state: GameState,
    response: AgentResponse,
    _events: PhaseEvent[]
  ): ProcessingResult {
    const newEvents: PhaseEvent[] = [];
    const faction = response.factionId as Faction;
    const actionType = response.actionType;

    // Debug: Log action type for Guild
    if (faction === Faction.SPACING_GUILD) {
      console.log(`   🔍 DEBUG: ShipmentProcessor.process - actionType=${actionType}, faction=${faction}`);
    }

    let newState = state;

    // Handle different shipment types
    if (actionType === "GUILD_CROSS_SHIP") {
      console.log(`   🔍 DEBUG: Routing to processGuildCrossShip`);
      return this.processGuildCrossShip(state, response, newEvents);
    } else if (actionType === "GUILD_SHIP_OFF_PLANET") {
      return this.processGuildOffPlanet(state, response, newEvents);
    } else {
      return this.processNormalShipment(state, response, newEvents);
    }
  }

  /**
   * Process Guild cross-ship: Move forces between territories
   * @rule 2.06.05.02 CROSS-SHIP: Guild may ship any number of Forces from any one Territory to any other Territory on the board.
   */
  private processGuildCrossShip(
    state: GameState,
    response: AgentResponse,
    newEvents: PhaseEvent[]
  ): ProcessingResult {
    const faction = response.factionId;
    const normalized = normalizeTerritoryIds(response.data);
    const normalizedData = normalized.normalized
      ? normalized.data
      : response.data;
    const fromTerritoryId = normalizedData.fromTerritoryId as
      | TerritoryId
      | undefined;
    const fromSector = normalizedData.fromSector as number | undefined;
    const toTerritoryId = normalizedData.toTerritoryId as
      | TerritoryId
      | undefined;
    const toSector = (normalizedData.toSector as number | undefined) ?? (response.data.toSector as number | undefined);
    const count = (normalizedData.count as number | undefined) ?? (response.data.count as number | undefined);
    const useElite = (normalizedData.useElite as boolean | undefined) ?? (response.data.useElite as boolean | undefined);
    const cost = (normalizedData.cost as number | undefined) ?? (response.data.cost as number | undefined);

    // Debug: Log extracted values
    console.log(`   🔍 DEBUG: Cross-ship extraction - fromTerritoryId=${fromTerritoryId}, toTerritoryId=${toTerritoryId}, fromSector=${fromSector}, toSector=${toSector}, count=${count}, cost=${cost}`);
    console.log(`   🔍 DEBUG: Cross-ship cost check - normalizedData.cost=${normalizedData.cost}, response.data.cost=${response.data.cost}, final cost=${cost}`);

    if (
      fromTerritoryId &&
      toTerritoryId &&
      count !== undefined &&
      fromSector !== undefined &&
      toSector !== undefined
    ) {
      const newState = moveForces(
        state,
        faction,
        fromTerritoryId,
        fromSector,
        toTerritoryId,
        toSector,
        count,
        useElite ?? false
      );

      // Handle spice cost
      let finalState = newState;
      if (cost !== undefined && cost > 0) {
        finalState = removeSpice(finalState, faction, cost);
      }

      console.log(
        `   ✅ Cross-shipped ${count} forces from ${fromTerritoryId} to ${toTerritoryId} for ${
          cost ?? 0
        } spice\n`
      );

      newEvents.push({
        type: "FORCES_SHIPPED",
        data: {
          faction,
          from: fromTerritoryId,
          to: toTerritoryId,
          count,
          cost,
        },
        message: `${
          FACTION_NAMES[faction]
        } cross-ships ${count} forces from ${fromTerritoryId} to ${toTerritoryId} for ${
          cost ?? 0
        } spice`,
      });

      return { state: finalState, events: newEvents };
    }

    return { state, events: newEvents };
  }

  /**
   * Process Guild off-planet: Ship forces from board back to reserves
   * @rule 1.06.04 Restriction: No player may ship Forces from the board back to their reserves.
   * @rule 2.06.05.03 OFF-PLANET: Exception - Guild may ship any number of Forces from any one Territory back to their reserves.
   * This method is only called for Guild's special ability - normal shipments use processNormalShipment() which only ships from reserves to board.
   */
  private processGuildOffPlanet(
    state: GameState,
    response: AgentResponse,
    newEvents: PhaseEvent[]
  ): ProcessingResult {
    const faction = response.factionId;
    const normalized = normalizeTerritoryIds(response.data);
    const normalizedData = normalized.normalized
      ? normalized.data
      : response.data;
    const fromTerritoryId = normalizedData.fromTerritoryId as
      | TerritoryId
      | undefined;
    const fromSector = response.data.fromSector as number | undefined;
    const count = response.data.count as number | undefined;
    const useElite = response.data.useElite as boolean | undefined;
    const cost = response.data.cost as number | undefined;

    if (fromTerritoryId && count !== undefined && fromSector !== undefined) {
      const newState = sendForcesToReserves(
        state,
        faction,
        fromTerritoryId,
        fromSector,
        count,
        useElite ?? false
      );

      // Handle spice cost
      let finalState = newState;
      if (cost !== undefined && cost > 0) {
        finalState = removeSpice(finalState, faction, cost);
      }

      console.log(
        `   ✅ Shipped ${count} forces off-planet from ${fromTerritoryId} for ${
          cost ?? 0
        } spice\n`
      );

      newEvents.push({
        type: "FORCES_SHIPPED",
        data: { faction, from: fromTerritoryId, count, cost },
        message: `${
          FACTION_NAMES[faction]
        } ships ${count} forces off-planet from ${fromTerritoryId} for ${
          cost ?? 0
        } spice`,
      });

      return { state: finalState, events: newEvents };
    }

    return { state, events: newEvents };
  }

  /**
   * Process normal shipment or Fremen shipment: Ship from reserves to board
   * @rule 1.06.03 Shipment of Reserves: A player with off-planet reserves may use one shipment action to Ship any number of Forces from their reserves to any one Territory on the board.
   */
  private processNormalShipment(
    state: GameState,
    response: AgentResponse,
    newEvents: PhaseEvent[]
  ): ProcessingResult {
    const faction = response.factionId;
    const normalized = normalizeTerritoryIds(response.data);
    const territoryId = normalized.normalized
      ? (normalized.data.territoryId as TerritoryId | undefined)
      : (response.data.territoryId as TerritoryId | undefined);
    const sector = response.data.sector as number | undefined;
    // Tool may return 'count' or 'totalCount' - handle both
    const count = (response.data.count as number | undefined) ?? 
                  (response.data.totalCount as number | undefined);
    const cost = response.data.cost as number | undefined;
    const useElite = response.data.useElite as boolean | undefined;

    // @rule 1.06.03.03 SECTORS: When shipping into a Territory lying in several Sectors, a player must make clear in which Sector of the Territory they choose to leave their Forces.
    // Enforced by requiring sector parameter in shipment action
    if (territoryId && count !== undefined && sector !== undefined) {
      // Check if the tool already applied the shipment.
      // Tools that mutate state (like ship_forces) MUST set response.data.appliedByTool = true.
      const toolAlreadyApplied = response.data.appliedByTool === true;

      if (toolAlreadyApplied) {
        // State has already been updated by tool - don't apply again.
        console.log(
          `   ℹ️  Shipment already applied by tool for ${FACTION_NAMES[faction]} to ${territoryId} (sector ${sector}), emitting event without additional mutation\n`
        );
      } else {
        // Actually mutate state - call the state mutation function
        // This is needed because in tests, tools aren't called, so state isn't updated
        try {
          const newState = shipForces(
            state,
            faction,
            territoryId,
            sector,
            count,
            useElite ?? false
          );

          // Handle spice cost (if any) ONLY when handler is applying shipment itself.
          // @rule 1.06.03.02 PAYMENT: All spice paid for Shipment is Placed in the Spice Bank.
          // @rule 2.06.04 (Exception: When Guild is in game, other factions pay Guild instead)
          let finalState = newState;
          // Debug: Log cost value
          if (faction === Faction.SPACING_GUILD) {
            console.log(`   🔍 DEBUG: Guild shipment cost check - cost=${cost}, undefined=${cost === undefined}, >0=${(cost ?? 0) > 0}`);
          }
          if (cost !== undefined && cost > 0) {
            // Check if Guild is in game - they receive payment
            const hasGuild = finalState.factions.has(Faction.SPACING_GUILD);
            if (hasGuild && faction !== Faction.SPACING_GUILD) {
              // Guild receives payment (Rule 2.06.04)
              finalState = removeSpice(finalState, faction, cost);
              finalState = addSpice(finalState, Faction.SPACING_GUILD, cost);
            } else if (faction === Faction.SPACING_GUILD) {
              // Guild pays for their own shipment (Rule 2.06.07: HALF PRICE SHIPPING)
              // Spice goes to bank (no other faction receives it)
              finalState = removeSpice(finalState, faction, cost);
            } else {
              // Spice goes to bank
              finalState = removeSpice(finalState, faction, cost);
            }
          }

          // Log action and validate
          finalState = logAction(finalState, "FORCES_SHIPPED", faction, response.data);

          // CRITICAL: Validate stronghold occupancy after shipment
          // This catches violations even if pre-validation was bypassed or used stale state
          const violations = validateStrongholdOccupancy(finalState);
          if (violations.length > 0) {
            // Log and create error event
            for (const violation of violations) {
              console.error(
                `❌ STRONGHOLD OCCUPANCY VIOLATION after shipment: ${
                  violation.territoryId
                } has ${violation.count} factions: ${violation.factions.join(", ")}`
              );
              newEvents.push({
                type: "STRONGHOLD_OCCUPANCY_VIOLATION",
                data: {
                  territoryId: violation.territoryId,
                  factions: violation.factions,
                  count: violation.count,
                },
                message: `⚠️ CRITICAL ERROR: After shipment, ${
                  violation.territoryId
                } has ${
                  violation.count
                } factions (max 2 allowed): ${violation.factions.join(", ")}`,
              });
            }
            // Revert to previous state to prevent invalid game state
            console.error(`❌ Reverting shipment to prevent invalid game state`);
            return { state, events: newEvents };
          }

          console.log(
            `   ✅ Shipped ${count} forces to ${territoryId} (sector ${sector}) for ${
              cost ?? 0
            } spice\n`
          );

          newEvents.push({
            type: "FORCES_SHIPPED",
            data: { faction, territory: territoryId, sector, count, cost },
            message: `${
              FACTION_NAMES[faction]
            } ships ${count} forces to ${territoryId} (sector ${sector}) for ${
              cost ?? 0
            } spice`,
          });

          return { state: finalState, events: newEvents };
        } catch (error) {
          // Handle defensive validation errors from shipForces()
          if (
            error instanceof Error &&
            error.message.includes("Stronghold occupancy violation")
          ) {
            console.error(`❌ ${error.message}`);
            // Return error event instead of crashing
            newEvents.push({
              type: "STRONGHOLD_OCCUPANCY_VIOLATION",
              data: {
                faction,
                territory: territoryId,
                reason: "OCCUPANCY_LIMIT_EXCEEDED",
              },
              message: `Shipment rejected: ${error.message}`,
            });
            // Don't apply the shipment - return original state
            return { state, events: newEvents };
          }
          // Re-throw other errors
          throw error;
        }
      }

      // If tool already applied, still emit event and log action
      if (toolAlreadyApplied) {
        // Log action to game state history
        const loggedState = logAction(state, "FORCES_SHIPPED", faction, {
          territory: territoryId,
          sector,
          count,
          cost,
        });
        
        newEvents.push({
          type: "FORCES_SHIPPED",
          data: { faction, territory: territoryId, sector, count, cost },
          message: `${
            FACTION_NAMES[faction]
          } ships ${count} forces to ${territoryId} (sector ${sector}) for ${
            cost ?? 0
          } spice`,
        });
        
        return { state: loggedState, events: newEvents };
      }
    }

    return { state, events: newEvents };
  }
}

