/**
 * Shipment & Movement Phase Handler
 *
 * Phase 1.06: Shipment & Movement
 * - Factions ship forces from off-world (reserves) to Dune
 * - Factions move forces on the board
 * - Guild controls shipping rates
 * - BG can send advisors
 * - Fremen can do worm riding
 */

import {
  Faction,
  Phase,
  TerritoryId,
  TerritoryType,
  type GameState,
  TERRITORY_DEFINITIONS,
} from '../../types';
import {
  shipForces,
  moveForces,
  removeSpice,
  addSpice,
  getFactionState,
  logAction,
  getForceCountInTerritory,
} from '../../state';
import { GAME_CONSTANTS } from '../../data';
import { checkOrnithopterAccess, getMovementRange, validateShipment, validateMovement } from '../../rules';
import {
  type PhaseHandler,
  type PhaseStepResult,
  type AgentRequest,
  type AgentResponse,
  type PhaseEvent,
} from '../types';

// =============================================================================
// SHIPMENT & MOVEMENT PHASE HANDLER
// =============================================================================

type SubPhase = 'SHIPMENT' | 'MOVEMENT';

export class ShipmentMovementPhaseHandler implements PhaseHandler {
  readonly phase = Phase.SHIPMENT_MOVEMENT;

  private subPhase: SubPhase = 'SHIPMENT';
  private currentFactionIndex = 0;
  private factionsShipped: Set<Faction> = new Set();
  private factionsMoved: Set<Faction> = new Set();

  initialize(state: GameState): PhaseStepResult {
    // Reset context
    this.subPhase = 'SHIPMENT';
    this.currentFactionIndex = 0;
    this.factionsShipped = new Set();
    this.factionsMoved = new Set();

    const events: PhaseEvent[] = [];

    events.push({
      type: 'PHASE_STARTED',
      data: { phase: Phase.SHIPMENT_MOVEMENT, subPhase: 'SHIPMENT' },
      message: 'Shipment & Movement phase started (Shipment sub-phase)',
    });

    // Start shipment sub-phase
    return this.requestShipmentDecision(state, events);
  }

  processStep(state: GameState, responses: AgentResponse[]): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;

    if (this.subPhase === 'SHIPMENT') {
      for (const response of responses) {
        this.factionsShipped.add(response.factionId);

        if (!response.passed && response.actionType === 'SHIP_FORCES') {
          const result = this.processShipment(newState, response, events);
          newState = result.state;
          events.push(...result.events);
        }
      }

      // Move to next faction or switch to movement
      this.currentFactionIndex++;
      if (this.currentFactionIndex >= state.stormOrder.length) {
        // All factions have shipped, start movement
        this.subPhase = 'MOVEMENT';
        this.currentFactionIndex = 0;

        events.push({
          type: 'PHASE_STARTED',
          data: { subPhase: 'MOVEMENT' },
          message: 'Movement sub-phase started',
        });

        return this.requestMovementDecision(newState, events);
      }

      return this.requestShipmentDecision(newState, events);
    } else {
      // MOVEMENT sub-phase
      for (const response of responses) {
        this.factionsMoved.add(response.factionId);

        if (!response.passed && response.actionType === 'MOVE_FORCES') {
          const result = this.processMovement(newState, response, events);
          newState = result.state;
          events.push(...result.events);
        }
      }

      // Move to next faction or end phase
      this.currentFactionIndex++;
      if (this.currentFactionIndex >= state.stormOrder.length) {
        // All factions have moved
        return {
          state: newState,
          phaseComplete: true,
          nextPhase: Phase.BATTLE,
          pendingRequests: [],
          actions: [],
          events,
        };
      }

      return this.requestMovementDecision(newState, events);
    }
  }

  cleanup(state: GameState): GameState {
    return state;
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private requestShipmentDecision(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    const faction = state.stormOrder[this.currentFactionIndex];
    if (!faction) {
      return {
        state,
        phaseComplete: false,
        pendingRequests: [],
        actions: [],
        events,
      };
    }

    const factionState = getFactionState(state, faction);
    const reserves = factionState.forces.reserves;
    const totalReserves = reserves.regular + reserves.elite;

    // Calculate shipping cost
    const hasGuild = state.factions.has(Faction.SPACING_GUILD);
    const isGuild = faction === Faction.SPACING_GUILD;
    const baseShippingCost = GAME_CONSTANTS.SHIPMENT_COST;

    // Get valid shipping destinations
    const validDestinations = this.getValidShippingDestinations(state, faction);

    const pendingRequests: AgentRequest[] = [
      {
        factionId: faction,
        requestType: 'SHIP_FORCES',
        prompt: `Shipment phase. You have ${totalReserves} forces in reserves (${reserves.regular} regular, ${reserves.elite} elite). Shipping costs ${baseShippingCost} spice per force to strongholds, ${baseShippingCost * 2} elsewhere.`,
        context: {
          reservesRegular: reserves.regular,
          reservesElite: reserves.elite,
          totalReserves,
          spiceAvailable: factionState.spice,
          shippingCostToStronghold: baseShippingCost,
          shippingCostElsewhere: baseShippingCost * 2,
          isGuild,
          guildInGame: hasGuild,
          validDestinations,
        },
        availableActions: ['SHIP_FORCES', 'PASS'],
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

  private requestMovementDecision(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    const faction = state.stormOrder[this.currentFactionIndex];
    if (!faction) {
      return {
        state,
        phaseComplete: true,
        nextPhase: Phase.BATTLE,
        pendingRequests: [],
        actions: [],
        events,
      };
    }

    const factionState = getFactionState(state, faction);
    const hasOrnithopters = checkOrnithopterAccess(state, faction);
    const movementRange = getMovementRange(state, faction);

    // Get forces on board that can move
    const movableForces = factionState.forces.onBoard.map((stack) => ({
      territoryId: stack.territoryId,
      sector: stack.sector,
      regular: stack.forces.regular,
      elite: stack.forces.elite,
      total: stack.forces.regular + stack.forces.elite,
    }));

    const pendingRequests: AgentRequest[] = [
      {
        factionId: faction,
        requestType: 'MOVE_FORCES',
        prompt: `Movement phase. You have ${movableForces.length} force stacks on the board. Movement range: ${movementRange} territories${hasOrnithopters ? ' (ornithopters)' : ''}.`,
        context: {
          movableForces,
          movementRange,
          hasOrnithopters,
          stormSector: state.stormSector,
        },
        availableActions: ['MOVE_FORCES', 'PASS'],
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

  private processShipment(
    state: GameState,
    response: AgentResponse,
    events: PhaseEvent[]
  ): { state: GameState; events: PhaseEvent[] } {
    const newEvents: PhaseEvent[] = [];
    let newState = state;

    const faction = response.factionId;
    const shipments = response.data.shipments as ShipmentRequest[] | undefined;

    if (!shipments || shipments.length === 0) {
      return { state, events: newEvents };
    }

    for (const shipment of shipments) {
      const territoryId = shipment.territoryId as TerritoryId;
      const sector = shipment.sector;
      const count = shipment.count;

      // Validate shipment
      const validation = validateShipment(
        newState,
        faction,
        territoryId,
        sector,
        count
      );

      if (!validation.valid) {
        newEvents.push({
          type: 'FORCES_SHIPPED',
          data: {
            faction,
            territory: territoryId,
            sector,
            count,
            failed: true,
            errors: validation.errors,
          },
          message: `${faction} shipment failed: ${validation.errors[0]?.message}`,
        });
        continue;
      }

      // Calculate cost
      const cost = validation.context.cost as number;

      // Execute shipment
      newState = shipForces(newState, faction, territoryId, sector, count);
      newState = removeSpice(newState, faction, cost);

      // Pay Guild if in game
      if (newState.factions.has(Faction.SPACING_GUILD) && faction !== Faction.SPACING_GUILD) {
        newState = addSpice(newState, Faction.SPACING_GUILD, Math.floor(cost / 2));
      }

      newEvents.push({
        type: 'FORCES_SHIPPED',
        data: { faction, territory: territoryId, sector, count, cost },
        message: `${faction} ships ${count} forces to ${territoryId} (sector ${sector}) for ${cost} spice`,
      });

      newState = logAction(newState, 'FORCES_SHIPPED', faction, {
        territory: territoryId,
        sector,
        count,
        cost,
      });
    }

    return { state: newState, events: newEvents };
  }

  private processMovement(
    state: GameState,
    response: AgentResponse,
    events: PhaseEvent[]
  ): { state: GameState; events: PhaseEvent[] } {
    const newEvents: PhaseEvent[] = [];
    let newState = state;

    const faction = response.factionId;
    const movements = response.data.movements as MovementRequest[] | undefined;

    if (!movements || movements.length === 0) {
      return { state, events: newEvents };
    }

    for (const movement of movements) {
      const fromTerritory = movement.fromTerritoryId as TerritoryId;
      const fromSector = movement.fromSector;
      const toTerritory = movement.toTerritoryId as TerritoryId;
      const toSector = movement.toSector;
      const count = movement.count;

      // Validate movement
      const validation = validateMovement(
        newState,
        faction,
        fromTerritory,
        fromSector,
        toTerritory,
        toSector,
        count
      );

      if (!validation.valid) {
        newEvents.push({
          type: 'FORCES_MOVED',
          data: {
            faction,
            from: fromTerritory,
            fromSector,
            to: toTerritory,
            toSector,
            count,
            failed: true,
            errors: validation.errors,
          },
          message: `${faction} movement failed: ${validation.errors[0]?.message}`,
        });
        continue;
      }

      // Execute movement
      newState = moveForces(
        newState,
        faction,
        fromTerritory,
        fromSector,
        toTerritory,
        toSector,
        count
      );

      newEvents.push({
        type: 'FORCES_MOVED',
        data: { faction, from: fromTerritory, fromSector, to: toTerritory, toSector, count },
        message: `${faction} moves ${count} forces from ${fromTerritory} to ${toTerritory}`,
      });

      newState = logAction(newState, 'FORCES_MOVED', faction, {
        from: fromTerritory,
        fromSector,
        to: toTerritory,
        toSector,
        count,
      });
    }

    return { state: newState, events: newEvents };
  }

  private getValidShippingDestinations(
    state: GameState,
    faction: Faction
  ): { territoryId: TerritoryId; sector: number; isStronghold: boolean; costMultiplier: number }[] {
    const destinations: { territoryId: TerritoryId; sector: number; isStronghold: boolean; costMultiplier: number }[] = [];

    for (const [id, territory] of Object.entries(TERRITORY_DEFINITIONS)) {
      const territoryId = id as TerritoryId;

      // Can't ship to polar sink
      if (territory.type === TerritoryType.POLAR_SINK) continue;

      // Can't ship into storm
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
}

// =============================================================================
// TYPES
// =============================================================================

interface ShipmentRequest {
  territoryId: string;
  sector: number;
  count: number;
}

interface MovementRequest {
  fromTerritoryId: string;
  fromSector: number;
  toTerritoryId: string;
  toSector: number;
  count: number;
}
