/**
 * Tool Execution Context
 *
 * Manages the execution context for AI agent tools.
 * Provides state access, faction identity, and state updates.
 */

import type { Faction, GameState, TerritoryId } from '../types';
import { TERRITORY_DEFINITIONS, TerritoryType, Phase, LeaderLocation } from '../types';
import {
  getFactionState,
  getFactionsInTerritory,
  getForcesInTerritory,
  getControlledStrongholds,
} from '../state';
import type {
  ToolContext,
  GameStateSummary,
  FactionInfo,
  TerritoryInfo,
  ValidActionsInfo,
} from './types';
import { getLeaderDefinition, getFactionConfig } from '../data';

// =============================================================================
// CONTEXT MANAGER
// =============================================================================

/**
 * Manages tool execution context for a single agent.
 * Each faction agent has its own context manager instance.
 */
export class ToolContextManager {
  private _state: GameState;
  private _faction: Faction;
  private _stateUpdateCallback: ((state: GameState) => void) | null = null;

  constructor(initialState: GameState, faction: Faction) {
    this._state = initialState;
    this._faction = faction;
  }

  /**
   * Get current game state.
   */
  get state(): GameState {
    return this._state;
  }

  /**
   * Get the faction this context is for.
   */
  get faction(): Faction {
    return this._faction;
  }

  /**
   * Get current phase.
   */
  get phase(): Phase {
    return this._state.phase;
  }

  /**
   * Update the game state.
   */
  updateState(newState: GameState): void {
    this._state = newState;
    if (this._stateUpdateCallback) {
      this._stateUpdateCallback(newState);
    }
  }

  /**
   * Set callback for state updates (for external sync).
   */
  onStateUpdate(callback: (state: GameState) => void): void {
    this._stateUpdateCallback = callback;
  }

  /**
   * Create tool context for tool execution.
   */
  createToolContext(): ToolContext {
    return {
      state: this._state,
      faction: this._faction,
      phase: this._state.phase,
      updateState: (newState) => this.updateState(newState),
    };
  }

  // ===========================================================================
  // INFORMATION HELPERS
  // ===========================================================================

  /**
   * Get game state summary for AI consumption.
   */
  getGameStateSummary(): GameStateSummary {
    const state = this._state;

    // Get stronghold control
    const strongholdControl: Record<string, Faction | null> = {};
    for (const [id, territory] of Object.entries(TERRITORY_DEFINITIONS)) {
      if (territory.type === TerritoryType.STRONGHOLD) {
        const occupants = getFactionsInTerritory(state, id as TerritoryId);
        strongholdControl[id] = occupants.length === 1 ? occupants[0] : null;
      }
    }

    // Get active alliances
    const alliances: Array<{ factions: [Faction, Faction] }> = [];
    const seenAlliances = new Set<string>();
    for (const [faction, factionState] of state.factions) {
      if (factionState.allyId) {
        const key = [faction, factionState.allyId].sort().join('-');
        if (!seenAlliances.has(key)) {
          seenAlliances.add(key);
          alliances.push({ factions: [faction, factionState.allyId] });
        }
      }
    }

    return {
      turn: state.turn,
      phase: state.phase,
      stormSector: state.stormSector,
      stormOrder: state.stormOrder,
      factionCount: state.factions.size,
      activeAlliances: alliances,
      strongholdControl,
      spiceOnBoard: state.spiceOnBoard.map((s) => ({
        territory: s.territoryId,
        sector: s.sector,
        amount: s.amount,
      })),
    };
  }

  /**
   * Get faction information.
   */
  getFactionInfo(faction?: Faction): FactionInfo {
    const targetFaction = faction ?? this._faction;
    const factionState = getFactionState(this._state, targetFaction);
    const config = getFactionConfig(targetFaction);

    // Get leader information
    const leaders = factionState.leaders.map((leader) => {
      const def = getLeaderDefinition(leader.definitionId);
      return {
        id: leader.definitionId,
        name: def?.name ?? 'Unknown',
        strength: def?.strength ?? 0,
        location: leader.location,
        canBeUsedInBattle: leader.location === LeaderLocation.LEADER_POOL,
      };
    });

    // Get forces on board
    const forcesOnBoard = factionState.forces.onBoard.map((stack) => ({
      territory: stack.territoryId,
      sector: stack.sector,
      regular: stack.forces.regular,
      elite: stack.forces.elite,
    }));

    return {
      faction: targetFaction,
      spice: factionState.spice,
      spiceBribes: factionState.spiceBribes,
      reserveForces: {
        regular: factionState.forces.reserves.regular,
        elite: factionState.forces.reserves.elite,
      },
      forcesOnBoard,
      forcesInTanks: {
        regular: factionState.forces.tanks.regular,
        elite: factionState.forces.tanks.elite,
      },
      leaders,
      handSize: factionState.hand.length,
      maxHandSize: config.maxHandSize,
      allyId: factionState.allyId,
      controlledStrongholds: getControlledStrongholds(this._state, targetFaction),
    };
  }

  /**
   * Get territory information.
   */
  getTerritoryInfo(territoryId: TerritoryId): TerritoryInfo | null {
    const territory = TERRITORY_DEFINITIONS[territoryId];
    if (!territory) return null;

    const state = this._state;
    const inStorm = territory.sectors.some((s) => s === state.stormSector);

    // Get spice in this territory
    const spiceInTerritory = state.spiceOnBoard
      .filter((s) => s.territoryId === territoryId)
      .reduce((sum, s) => sum + s.amount, 0);

    // Get occupants
    const occupants: TerritoryInfo['occupants'] = [];
    for (const [faction, factionState] of state.factions) {
      for (const stack of factionState.forces.onBoard) {
        if (stack.territoryId === territoryId) {
          occupants.push({
            faction,
            sector: stack.sector,
            regular: stack.forces.regular,
            elite: stack.forces.elite,
          });
        }
      }
    }

    return {
      id: territoryId,
      name: territory.name,
      type: territory.type,
      sectors: territory.sectors,
      inStorm,
      spice: spiceInTerritory,
      occupants,
      isStronghold: territory.type === TerritoryType.STRONGHOLD,
      canShipTo: !inStorm && territory.type !== TerritoryType.POLAR_SINK,
      canMoveTo: !inStorm,
    };
  }

  /**
   * Get valid actions for current context.
   */
  getValidActions(): ValidActionsInfo {
    const state = this._state;
    const faction = this._faction;
    const phase = state.phase;

    // Determine available actions based on phase
    const availableActions: string[] = [];
    const context: Record<string, unknown> = { phase };

    switch (phase) {
      case Phase.STORM:
        availableActions.push('dial_storm');
        context.maxDial = state.turn === 1 ? 20 : 3;
        context.minDial = state.turn === 1 ? 0 : 1;
        break;

      case Phase.BIDDING:
        availableActions.push('place_bid', 'pass_bid');
        context.currentBid = 0; // Would need bidding context
        break;

      case Phase.REVIVAL: {
        const factionState = getFactionState(state, faction);
        const inTanks = factionState.forces.tanks.regular + factionState.forces.tanks.elite;
        if (inTanks > 0) {
          availableActions.push('revive_forces');
        }
        const deadLeaders = factionState.leaders.filter(
          (l) => l.location === LeaderLocation.TANKS_FACE_UP || l.location === LeaderLocation.TANKS_FACE_DOWN
        );
        if (deadLeaders.length > 0) {
          availableActions.push('revive_leader');
        }
        availableActions.push('pass_revival');
        context.forcesInTanks = inTanks;
        context.deadLeaders = deadLeaders.length;
        break;
      }

      case Phase.SHIPMENT_MOVEMENT: {
        const factionState = getFactionState(state, faction);
        const reserves = factionState.forces.reserves.regular + factionState.forces.reserves.elite;
        if (reserves > 0 && factionState.spice > 0) {
          availableActions.push('ship_forces');
        }
        if (factionState.forces.onBoard.length > 0) {
          availableActions.push('move_forces');
        }
        availableActions.push('pass_shipment', 'pass_movement');
        context.reserves = reserves;
        context.spice = factionState.spice;
        break;
      }

      case Phase.BATTLE:
        availableActions.push('submit_battle_plan', 'call_traitor', 'pass_traitor');
        // Would need battle context for choose_battle
        break;

      case Phase.SPICE_BLOW:
        if (state.nexusOccurring) {
          availableActions.push('propose_alliance', 'break_alliance');
        }
        break;

      default:
        // No specific actions for other phases
        break;
    }

    // Information tools are always available
    availableActions.push('view_game_state', 'view_my_faction', 'view_territory');

    return {
      phase,
      canAct: availableActions.length > 0,
      availableActions,
      context,
    };
  }

  /**
   * Get my treachery hand (card IDs only - actual cards are secret).
   */
  getMyHand(): Array<{ id: string; type: string }> {
    const factionState = getFactionState(this._state, this._faction);
    return factionState.hand.map((card) => ({
      id: card.definitionId,
      type: card.type,
    }));
  }

  /**
   * Get my traitor cards.
   */
  getMyTraitors(): string[] {
    const factionState = getFactionState(this._state, this._faction);
    return factionState.traitors.map((card) => card.leaderId);
  }
}

// =============================================================================
// CONTEXT FACTORY
// =============================================================================

/**
 * Create a tool context manager for a faction.
 */
export function createToolContextManager(
  state: GameState,
  faction: Faction
): ToolContextManager {
  return new ToolContextManager(state, faction);
}
