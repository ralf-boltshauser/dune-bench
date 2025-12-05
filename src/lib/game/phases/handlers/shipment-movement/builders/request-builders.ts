/**
 * Request Builders
 *
 * Builds agent requests for shipment and movement decisions.
 * Handles faction-specific prompts and context building.
 */

import { GAME_CONSTANTS } from "../../../../data";
import { Faction, TerritoryId, TerritoryType, type GameState } from "../../../../types";
import { FACTION_NAMES, TERRITORY_DEFINITIONS } from "../../../../types";
import { getFactionState } from "../../../../state";
import { type AgentRequest, type PhaseEvent, type PhaseStepResult } from "../../../../types";
import { buildShipmentContext } from "./shipment-context";
import { buildMovementContext } from "./movement-context";

export class RequestBuilder {
  /**
   * Build shipment request for a faction
   */
  buildShipmentRequest(
    state: GameState,
    faction: Faction,
    events: PhaseEvent[]
  ): PhaseStepResult {
    const factionState = getFactionState(state, faction);
    const reserves = factionState.forces.reserves;
    const totalReserves = reserves.regular + reserves.elite;

    const isGuild = faction === Faction.SPACING_GUILD;
    const isFremen = faction === Faction.FREMEN;
    const hasGuild = state.factions.has(Faction.SPACING_GUILD);
    const baseShippingCost = GAME_CONSTANTS.SHIPMENT_COST;

    // @rule 1.06.03.01 COST: The cost of shipping off-planet reserves is 1 spice per Force shipped into any Stronghold and 2 spice per Force shipped into any Non-Stronghold Territory.
    // Calculate costs
    let costToStronghold: number = baseShippingCost;
    let costElsewhere: number = baseShippingCost * 2;
    if (isGuild) {
      // Guild pays half price (Rule 2.06.07: HALF PRICE SHIPPING)
      costToStronghold = Math.ceil(costToStronghold / 2);
      costElsewhere = Math.ceil(costElsewhere / 2);
    }

    console.log(`\n🚢 SHIPMENT: ${FACTION_NAMES[faction]}`);
    console.log(
      `   Reserves: ${totalReserves} forces (${reserves.regular} regular, ${reserves.elite} elite)`
    );
    console.log(`   Spice: ${factionState.spice}`);

    // Fremen have special shipment display
    if (isFremen) {
      console.log(`   Cost: FREE (Fremen native reserves - Rule 2.04.05)`);
      console.log(
        `   Valid Destinations: Great Flat or within 2 territories of Great Flat`
      );
      console.log(`   Use 'fremen_send_forces' tool for shipment`);
    } else {
      console.log(
        `   Cost: ${costToStronghold}/force (strongholds), ${costElsewhere}/force (elsewhere)`
      );
    }

    const validDestinations = this.getValidShippingDestinations(state, faction);

    // Build shipment context: where our forces are and stronghold states
    const shipmentContext = buildShipmentContext(state, faction);

    // Build prompt based on faction
    let prompt: string;
    let availableActions: string[];

    if (isFremen) {
      prompt = this.buildFremenShipmentPrompt(
        totalReserves,
        shipmentContext,
        faction
      );
      availableActions = ["fremen_send_forces", "pass_shipment"];
    } else {
      prompt = this.buildNormalShipmentPrompt(
        totalReserves,
        costToStronghold,
        costElsewhere,
        shipmentContext
      );
      availableActions = ["ship_forces", "pass_shipment"];

      // Guild has additional options
      if (isGuild) {
        availableActions.push("guild_cross_ship", "guild_ship_off_planet");
      }
    }

    const pendingRequests: AgentRequest[] = [
      {
        factionId: faction,
        requestType: "SHIP_FORCES",
        prompt,
        context: {
          reservesRegular: reserves.regular,
          reservesElite: reserves.elite,
          totalReserves,
          spiceAvailable: factionState.spice,
          shippingCostToStronghold: isFremen ? 0 : costToStronghold,
          shippingCostElsewhere: isFremen ? 0 : costElsewhere,
          isGuild,
          isFremen,
          guildInGame: hasGuild,
          validDestinations,
          phase: "shipment",
          willMoveAfter: true,
          shipmentContext,
        },
        availableActions,
      },
    ];

    return {
      state,
      phaseComplete: false,
      pendingRequests,
      actions: [],
      events,
    };
  }

  /**
   * Build movement request for a faction
   */
  buildMovementRequest(
    state: GameState,
    faction: Faction,
    events: PhaseEvent[],
    ornithopterAccess: Set<Faction>
  ): PhaseStepResult {
    // CRITICAL: Use ornithopter access from phase START, not current state
    // This prevents factions from gaining ornithopter access by shipping into Arrakeen/Carthag first
    const hasOrnithopters = ornithopterAccess.has(faction);
    const movementRange = this.getMovementRange(faction, hasOrnithopters);

    console.log(`\n🚶 MOVEMENT: ${FACTION_NAMES[faction]}`);
    console.log(
      `   Movement Range: ${movementRange} territory${
        movementRange !== 1 ? "ies" : ""
      }${hasOrnithopters ? " (Ornithopters)" : ""}`
    );

    // Build detailed movement context for informed decision-making
    const movementContext = buildMovementContext(
      state,
      faction,
      movementRange,
      hasOrnithopters
    );

    // Build prompt with detailed context information
    const prompt = this.buildMovementPrompt(faction, movementContext, movementRange, hasOrnithopters);

    const pendingRequests: AgentRequest[] = [
      {
        factionId: faction,
        requestType: "MOVE_FORCES",
        prompt,
        context: {
          movementContext,
          movementRange,
          hasOrnithopters,
          hasOrnithoptersFromPhaseStart: hasOrnithopters,
          stormSector: state.stormSector,
          phase: "movement",
          // Keep backwards compatibility
          movableForces: movementContext.forceStacks.map((stack) => ({
            territoryId: stack.fromTerritory.territoryId,
            sector: stack.myForces.sector,
            regular: stack.myForces.regular,
            elite: stack.myForces.elite,
            total: stack.myForces.total,
          })),
        },
        availableActions: ["MOVE_FORCES", "PASS"],
      },
    ];

    return {
      state,
      phaseComplete: false,
      pendingRequests,
      actions: [],
      events,
    };
  }

  /**
   * @rule 1.06.05.03 ONE ADJACENT TERRITORY: A player without a Force in either Arrakeen or Carthag at the start of their movement can only Move their Forces to one adjacent Territory.
   * @rule 1.06.05.04 ORNITHOPTERS: A player who starts a force move with one or more Forces in either Arrakeen, Carthag, or both, has access to ornithopters and may Move Forces through up to three adjacent territories.
   * @rule 2.04.06 MOVEMENT: During movement you may Move your Forces two territories instead of one (Fremen)
   * Calculate movement range for a faction based on ornithopter access (from phase start).
   * Fremen get 2 territories base, all others get 1. Ornithopters add +2 (making it 3).
   */
  getMovementRange(faction: Faction, hasOrnithopters: boolean): number {
    // Ornithopters grant 3 territories to ANY faction (including Fremen)
    if (hasOrnithopters) return 3;

    // @rule 2.04.06: Fremen base movement is 2 territories (without ornithopters)
    if (faction === Faction.FREMEN) return 2;

    // All other factions: 1 territory without ornithopters
    return 1;
  }

  /**
   * Get valid shipping destinations
   */
  getValidShippingDestinations(
    state: GameState,
    _faction: Faction
  ): {
    territoryId: TerritoryId;
    sector: number;
    isStronghold: boolean;
    costMultiplier: number;
  }[] {
    const destinations: {
      territoryId: TerritoryId;
      sector: number;
      isStronghold: boolean;
      costMultiplier: number;
    }[] = [];

    for (const [id, territory] of Object.entries(TERRITORY_DEFINITIONS)) {
      const territoryId = id as TerritoryId;

      // Can't ship to polar sink
      if (territory.type === TerritoryType.POLAR_SINK) continue;

      // Check each sector (can't ship into storm)
      for (const sector of territory.sectors) {
        if (sector === state.stormSector) continue;

        destinations.push({
          territoryId,
          sector,
          isStronghold: territory.type === TerritoryType.STRONGHOLD,
          costMultiplier: territory.type === TerritoryType.STRONGHOLD ? 1 : 2,
        });
      }
    }

    return destinations;
  }

  /**
   * Build Fremen shipment prompt
   */
  private buildFremenShipmentPrompt(
    totalReserves: number,
    shipmentContext: ReturnType<typeof buildShipmentContext>,
    faction: Faction
  ): string {
    const fremenTerritories =
      shipmentContext.fremenAvailableTerritories || [];
    const territoryList = fremenTerritories
      .map((t) => {
        const parts: string[] = [];
        parts.push(t.name);

        // Add distance indicator
        if (t.distance === 0) {
          parts.push("(Great Flat)");
        } else {
          parts.push(`(distance ${t.distance})`);
        }

        // Add storm status
        if (t.hasAnySectorInStorm) {
          if (t.safeSectors.length === 0) {
            parts.push(
              "[ALL SECTORS IN STORM - use storm migration for half loss]"
            );
          } else {
            parts.push(`[${t.inStormSectors.length} sector(s) in storm]`);
          }
        }

        // Add occupancy info
        if (
          t.isStronghold &&
          t.occupancyCount >= 2 &&
          !t.occupants.includes(faction)
        ) {
          parts.push(`[OCCUPANCY LIMIT: ${t.occupancyCount} factions]`);
        } else if (t.occupancyCount > 0) {
          const occupantNames = t.occupants
            .map((f) => FACTION_NAMES[f])
            .join(", ");
          parts.push(`[occupied by: ${occupantNames}]`);
        }

        // Add spice info
        if (t.spice > 0) {
          parts.push(`(${t.spice} spice)`);
        }

        // Add my forces if present
        if (t.myForces > 0) {
          parts.push(`(you have ${t.myForces} forces here)`);
        }

        // Add canShipHere status
        if (!t.canShipHere && t.reasonCannotShip) {
          parts.push(`[CANNOT SHIP: ${t.reasonCannotShip}]`);
        }

        return parts.join(" ");
      })
      .join("\n- ");

    const ownForceSummary = shipmentContext.ownForces
      .map((loc) => `${loc.name}: ${loc.totalForces} forces`)
      .join(", ");

    return `Shipment: You have ${totalReserves} forces in reserves. As Fremen, you ship for FREE to Great Flat or territories within 2 of Great Flat. Use 'fremen_send_forces' tool (NOT 'ship_forces').

Available destinations:
- ${territoryList || "none available"}

${
  ownForceSummary
    ? `Current board presence: ${ownForceSummary}`
    : "No forces on board yet"
}`;
  }

  /**
   * Build normal shipment prompt
   */
  private buildNormalShipmentPrompt(
    totalReserves: number,
    costToStronghold: number,
    costElsewhere: number,
    shipmentContext: ReturnType<typeof buildShipmentContext>
  ): string {
    const strongholdSummary = shipmentContext.strongholds
      .map((s) => {
        const myPresence = s.myForces > 0 ? " (you have forces here)" : "";
        const storm = s.inStorm ? " [IN STORM]" : "";
        return `${s.name}${storm}${myPresence}`;
      })
      .join(", ");

    const ownForceSummary = shipmentContext.ownForces
      .map((loc) => `${loc.name}: ${loc.totalForces} forces`)
      .join(", ");

    return `Shipment: You have ${totalReserves} forces in reserves. Cost: ${costToStronghold} spice per force to strongholds, ${costElsewhere} elsewhere.

Current board presence:
- Your forces: ${ownForceSummary || "none on board"}
- Strongholds: ${strongholdSummary || "none occupied yet"}

Do you want to ship forces, and if so, where?`;
  }

  /**
   * Build movement prompt
   */
  private buildMovementPrompt(
    faction: Faction,
    movementContext: ReturnType<typeof buildMovementContext>,
    movementRange: number,
    hasOrnithopters: boolean
  ): string {
    let prompt = `Movement: You have ${
      movementContext.forceStacks.length
    } force stack${
      movementContext.forceStacks.length !== 1 ? "s" : ""
    }. Movement range: ${movementRange} territories${
      hasOrnithopters ? " (ornithopters)" : ""
    }.\n\n`;

    prompt += `IMPORTANT: You can move a SUBGROUP of forces from any territory - you don't have to move all forces. For example, if you have 10 forces in Arrakeen and want to collect spice nearby, you can move just 3 forces out, leaving 7 behind to keep control of the stronghold.\n\n`;

    if (movementContext.forceStacks.length > 0) {
      prompt += `Current Situation:\n`;
      for (const stack of movementContext.forceStacks) {
        prompt += `- ${stack.fromTerritory.name} (sector ${stack.myForces.sector}): You have ${stack.myForces.total} forces`;
        if (stack.fromTerritory.spice > 0) {
          prompt += `, territory has ${stack.fromTerritory.spice} spice`;
        }
        if (stack.fromTerritory.allForces.length > 1) {
          const otherForces = stack.fromTerritory.allForces.filter(
            (f) => f.faction !== faction
          );
          if (otherForces.length > 0) {
            prompt += `, ${otherForces.length} other faction${
              otherForces.length !== 1 ? "s" : ""
            } present`;
          }
        }
        prompt += `\n`;

        if (stack.reachableTerritories.length > 0) {
          prompt += `  Can reach ${stack.reachableTerritories.length} territories: `;
          const topDestinations = stack.reachableTerritories.slice(0, 5);
          prompt += topDestinations
            .map((t) => {
              let desc = t.territory.name;
              if (t.territory.spice > 0)
                desc += ` (${t.territory.spice} spice)`;
              if (t.territory.isStronghold) desc += ` [Stronghold]`;
              return desc;
            })
            .join(", ");
          if (stack.reachableTerritories.length > 5) {
            prompt += `, and ${stack.reachableTerritories.length - 5} more`;
          }
          prompt += `\n`;
        } else {
          prompt += `  No reachable territories (blocked by storm or full strongholds)\n`;
        }
      }
      prompt += `\nReview the movementContext below for full details about territories, forces, spice, and reachable destinations.\n`;
      prompt += `Strategic opportunities: Look for territories with spice to enable collection in the next phase.`;
    }

    return prompt;
  }
}

