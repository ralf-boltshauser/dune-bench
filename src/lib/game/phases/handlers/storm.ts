/**
 * Storm Phase Handler
 *
 * Phase 1.01: Storm Movement
 * - Two players dial storm movement (1-3, or 0-20 on turn 1)
 * - Storm moves counterclockwise
 * - Forces in sand territories under storm are destroyed
 * - Spice in storm path is destroyed
 * - Storm order is determined for the turn
 */

import {
  Faction,
  Phase,
  TerritoryType,
  TerritoryId,
  type GameState,
  TERRITORY_DEFINITIONS,
} from '../../types';
import {
  moveStorm,
  updateStormOrder,
  sendForcesToTanks,
  destroySpiceInTerritory,
  logAction,
  getFactionState,
  getFactionsInTerritory,
} from '../../state';
import { GAME_CONSTANTS } from '../../data';
import { calculateStormOrder, getDefaultPlayerPositions } from '../../state/factory';
import {
  type PhaseHandler,
  type PhaseStepResult,
  type AgentRequest,
  type AgentResponse,
  type PhaseEvent,
  type StormPhaseContext,
} from '../types';

// =============================================================================
// STORM PHASE HANDLER
// =============================================================================

export class StormPhaseHandler implements PhaseHandler {
  readonly phase = Phase.STORM;

  private context: StormPhaseContext = {
    dialingFactions: null,
    dials: new Map(),
    stormMovement: null,
    weatherControlUsed: false,
    weatherControlBy: null,
  };

  initialize(state: GameState): PhaseStepResult {
    // Reset context
    this.context = {
      dialingFactions: null,
      dials: new Map(),
      stormMovement: null,
      weatherControlUsed: false,
      weatherControlBy: null,
    };

    const events: PhaseEvent[] = [];
    const pendingRequests: AgentRequest[] = [];

    // Determine who dials the storm
    // Turn 1: Two players nearest storm start sector
    // Later turns: Two players who last used battle wheels
    const dialers = this.getStormDialers(state);
    this.context.dialingFactions = dialers;

    // Note: PhaseManager emits PHASE_STARTED event, so we don't emit it here

    // Fremen special: They control storm movement in advanced rules
    // In advanced rules with Fremen, they use storm deck instead of dials
    // The PHASE_STARTED event already indicates storm phase is active

    // Request dial values from the two players
    for (const faction of dialers) {
      const maxDial = state.turn === 1
        ? GAME_CONSTANTS.FIRST_STORM_MAX_DIAL
        : GAME_CONSTANTS.MAX_STORM_DIAL;

      pendingRequests.push({
        factionId: faction,
        requestType: 'DIAL_STORM',
        prompt: `Dial a number for storm movement (0-${maxDial}). The total will determine how many sectors the storm moves.`,
        context: {
          turn: state.turn,
          currentStormSector: state.stormSector,
          maxDial,
          isFirstTurn: state.turn === 1,
        },
        availableActions: ['DIAL_STORM'],
      });
    }

    return {
      state,
      phaseComplete: false,
      pendingRequests,
      simultaneousRequests: true, // Both players dial simultaneously
      actions: [],
      events,
    };
  }

  processStep(state: GameState, responses: AgentResponse[]): PhaseStepResult {
    const events: PhaseEvent[] = [];
    const actions: GameAction[] = [];

    // Process dial responses
    if (this.context.stormMovement === null) {
      return this.processDialResponses(state, responses);
    }

    // Storm has been dialed - now apply movement
    return this.applyStormMovement(state);
  }

  cleanup(state: GameState): GameState {
    // Reset context for next turn
    this.context = {
      dialingFactions: null,
      dials: new Map(),
      stormMovement: null,
      weatherControlUsed: false,
      weatherControlBy: null,
    };
    return state;
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private getStormDialers(state: GameState): [Faction, Faction] {
    const factions = Array.from(state.factions.keys());

    if (state.turn === 1) {
      // First turn: two players nearest storm start (sector 0)
      // For simplicity, use first two in list
      return [factions[0], factions[1] ?? factions[0]];
    }

    // Later turns: players who last used battle wheels
    // For simplicity, use first and last in storm order
    const order = state.stormOrder;
    return [order[0], order[order.length - 1]];
  }

  private processDialResponses(
    state: GameState,
    responses: AgentResponse[]
  ): PhaseStepResult {
    const events: PhaseEvent[] = [];
    const maxDial = state.turn === 1
      ? GAME_CONSTANTS.FIRST_STORM_MAX_DIAL
      : GAME_CONSTANTS.MAX_STORM_DIAL;

    // Collect dial values
    for (const response of responses) {
      // Tool name 'dial_storm' becomes 'DIAL_STORM' actionType
      if (response.actionType === 'DIAL_STORM') {
        // Tool returns 'dial' property
        let dialValue = Number(response.data.dial ?? 0);

        // Clamp to valid range
        if (state.turn === 1) {
          dialValue = Math.max(0, Math.min(maxDial, dialValue));
        } else {
          dialValue = Math.max(1, Math.min(maxDial, dialValue));
        }

        this.context.dials.set(response.factionId, dialValue);

        events.push({
          type: 'STORM_DIAL_REVEALED',
          data: { faction: response.factionId, value: dialValue },
          message: `${response.factionId} dials ${dialValue}`,
        });
      }
    }

    // Calculate total movement
    let totalMovement = 0;
    for (const value of this.context.dials.values()) {
      totalMovement += value;
    }
    this.context.stormMovement = totalMovement;

    // Now apply the movement
    return this.applyStormMovement(state);
  }

  private applyStormMovement(state: GameState): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;

    const movement = this.context.stormMovement ?? 0;
    const oldSector = state.stormSector;

    // Move storm
    const newSector = (oldSector + movement) % GAME_CONSTANTS.TOTAL_SECTORS;
    newState = moveStorm(newState, newSector);

    events.push({
      type: 'STORM_MOVED',
      data: {
        from: oldSector,
        to: newSector,
        movement,
        sectorsAffected: this.getSectorsBetween(oldSector, newSector),
      },
      message: `Storm moves ${movement} sectors (${oldSector} → ${newSector})`,
    });

    // Destroy forces and spice in storm path
    const destroyedForces = this.destroyForcesInStorm(newState, oldSector, newSector);
    const destroyedSpice = this.destroySpiceInStorm(newState, oldSector, newSector);

    // Apply destruction
    for (const destruction of destroyedForces) {
      newState = sendForcesToTanks(
        newState,
        destruction.faction,
        destruction.territoryId,
        destruction.sector,
        destruction.count
      );

      events.push({
        type: 'FORCES_KILLED_BY_STORM',
        data: destruction,
        message: `${destruction.count} ${destruction.faction} forces destroyed by storm in ${destruction.territoryId}`,
      });
    }

    for (const destruction of destroyedSpice) {
      newState = destroySpiceInTerritory(
        newState,
        destruction.territoryId,
        destruction.sector
      );

      events.push({
        type: 'SPICE_DESTROYED_BY_STORM',
        data: destruction,
        message: `${destruction.amount} spice destroyed by storm in ${destruction.territoryId}`,
      });
    }

    // Update storm order based on new storm position
    const playerPositions = getDefaultPlayerPositions(Array.from(newState.factions.keys()));
    const newOrder = calculateStormOrder(
      Array.from(newState.factions.keys()),
      newSector,
      playerPositions
    );
    newState = updateStormOrder(newState, newOrder);

    // Log the action
    newState = logAction(newState, 'STORM_MOVED', null, {
      from: oldSector,
      to: newSector,
      movement,
    });

    return {
      state: newState,
      phaseComplete: true,
      nextPhase: Phase.SPICE_BLOW,
      pendingRequests: [],
      actions: [],
      events,
    };
  }

  private getSectorsBetween(from: number, to: number): number[] {
    const sectors: number[] = [];
    let current = from;
    while (current !== to) {
      current = (current + 1) % GAME_CONSTANTS.TOTAL_SECTORS;
      sectors.push(current);
    }
    return sectors;
  }

  private destroyForcesInStorm(
    state: GameState,
    fromSector: number,
    toSector: number
  ): { faction: Faction; territoryId: TerritoryId; sector: number; count: number }[] {
    const destroyed: { faction: Faction; territoryId: TerritoryId; sector: number; count: number }[] = [];
    const affectedSectors = new Set([fromSector, ...this.getSectorsBetween(fromSector, toSector)]);

    // Check each territory
    for (const [territoryId, territory] of Object.entries(TERRITORY_DEFINITIONS)) {
      // Skip protected territories (rock, polar sink, imperial basin)
      if (territory.protectedFromStorm) continue;
      if (territory.type !== TerritoryType.SAND) continue;

      // Check if any sector of this territory is in the storm
      for (const sector of territory.sectors) {
        if (!affectedSectors.has(sector)) continue;

        // Find forces in this sector
        for (const [faction, factionState] of state.factions) {
          // Fremen lose half forces (rounded up) in storm
          const forceStack = factionState.forces.onBoard.find(
            (f) => f.territoryId === territoryId && f.sector === sector
          );

          if (forceStack) {
            const totalForces = forceStack.forces.regular + forceStack.forces.elite;
            let lostForces = totalForces;

            // Fremen only lose half
            if (faction === Faction.FREMEN) {
              lostForces = Math.ceil(totalForces / 2);
            }

            if (lostForces > 0) {
              destroyed.push({
                faction,
                territoryId: territoryId as TerritoryId,
                sector,
                count: lostForces,
              });
            }
          }
        }
      }
    }

    return destroyed;
  }

  private destroySpiceInStorm(
    state: GameState,
    fromSector: number,
    toSector: number
  ): { territoryId: TerritoryId; sector: number; amount: number }[] {
    const destroyed: { territoryId: TerritoryId; sector: number; amount: number }[] = [];
    const affectedSectors = new Set(this.getSectorsBetween(fromSector, toSector));

    // Note: Spice is destroyed only in sectors the storm PASSES THROUGH, not where it starts
    for (const spice of state.spiceOnBoard) {
      if (affectedSectors.has(spice.sector)) {
        destroyed.push({
          territoryId: spice.territoryId,
          sector: spice.sector,
          amount: spice.amount,
        });
      }
    }

    return destroyed;
  }
}

// Type for action logging
type GameAction = {
  type: string;
  data: Record<string, unknown>;
};
