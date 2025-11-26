/**
 * Spice Collection Phase Handler
 *
 * Phase 1.08: Spice Collection
 * - Factions collect spice from territories where they have forces
 * - Each force can collect up to 2 spice
 * - Forces in the same territory share collection
 */

import {
  Faction,
  Phase,
  TerritoryId,
  type GameState,
} from '../../types';
import {
  addSpice,
  removeSpiceFromTerritory,
  getFactionState,
  logAction,
  getForceCountInTerritory,
} from '../../state';
import { GAME_CONSTANTS } from '../../data';
import {
  type PhaseHandler,
  type PhaseStepResult,
  type AgentRequest,
  type AgentResponse,
  type PhaseEvent,
} from '../types';

// =============================================================================
// SPICE COLLECTION PHASE HANDLER
// =============================================================================

export class SpiceCollectionPhaseHandler implements PhaseHandler {
  readonly phase = Phase.SPICE_COLLECTION;

  private processedFactions: Set<Faction> = new Set();
  private collectionOpportunities: Map<Faction, CollectionOpportunity[]> = new Map();

  initialize(state: GameState): PhaseStepResult {
    // Reset context
    this.processedFactions = new Set();
    this.collectionOpportunities = new Map();

    const events: PhaseEvent[] = [];
    // Note: PhaseManager emits PHASE_STARTED event, so we don't emit it here

    // Calculate collection opportunities for each faction
    for (const [faction, factionState] of state.factions) {
      const opportunities: CollectionOpportunity[] = [];

      // Check each location where faction has forces
      for (const forceStack of factionState.forces.onBoard) {
        const spiceHere = state.spiceOnBoard.find(
          (s) =>
            s.territoryId === forceStack.territoryId &&
            s.sector === forceStack.sector
        );

        if (spiceHere && spiceHere.amount > 0) {
          const totalForces = forceStack.forces.regular + forceStack.forces.elite;
          const maxCollectable = totalForces * GAME_CONSTANTS.SPICE_PER_FORCE;

          opportunities.push({
            territoryId: forceStack.territoryId,
            sector: forceStack.sector,
            spiceAvailable: spiceHere.amount,
            forcesPresent: totalForces,
            maxCollectable: Math.min(maxCollectable, spiceHere.amount),
          });
        }
      }

      if (opportunities.length > 0) {
        this.collectionOpportunities.set(faction, opportunities);
      }
    }

    // If no opportunities, skip phase
    if (this.collectionOpportunities.size === 0) {
      return {
        state,
        phaseComplete: true,
        nextPhase: Phase.MENTAT_PAUSE,
        pendingRequests: [],
        actions: [],
        events,
      };
    }

    // Request collection decisions
    return this.requestCollectionDecisions(state, events);
  }

  processStep(state: GameState, responses: AgentResponse[]): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;

    // Process collection requests
    for (const response of responses) {
      this.processedFactions.add(response.factionId);

      if (response.passed) {
        continue; // Faction passed on collection
      }

      const faction = response.factionId;
      const collections = response.data.collections as CollectionRequest[] | undefined;

      if (collections && collections.length > 0) {
        const result = this.processCollections(newState, faction, collections, events);
        newState = result.state;
        events.push(...result.events);
      }
    }

    // Check if all factions with opportunities have been processed
    const remaining = Array.from(this.collectionOpportunities.keys()).filter(
      (f) => !this.processedFactions.has(f)
    );

    if (remaining.length > 0) {
      return this.requestCollectionDecisions(newState, events);
    }

    // Phase complete
    return {
      state: newState,
      phaseComplete: true,
      nextPhase: Phase.MENTAT_PAUSE,
      pendingRequests: [],
      actions: [],
      events,
    };
  }

  cleanup(state: GameState): GameState {
    return state;
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private requestCollectionDecisions(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    const pendingRequests: AgentRequest[] = [];

    // Process in storm order
    for (const faction of state.stormOrder) {
      if (this.processedFactions.has(faction)) continue;

      const opportunities = this.collectionOpportunities.get(faction);
      if (!opportunities || opportunities.length === 0) continue;

      pendingRequests.push({
        factionId: faction,
        requestType: 'COLLECT_SPICE',
        prompt: `Spice Collection: You have ${opportunities.length} collection opportunities.`,
        context: {
          opportunities: opportunities.map((o) => ({
            territory: o.territoryId,
            sector: o.sector,
            spiceAvailable: o.spiceAvailable,
            forcesPresent: o.forcesPresent,
            maxCollectable: o.maxCollectable,
          })),
          spicePerForce: GAME_CONSTANTS.SPICE_PER_FORCE,
        },
        availableActions: ['COLLECT_SPICE', 'PASS'],
      });
    }

    if (pendingRequests.length === 0) {
      return {
        state,
        phaseComplete: true,
        nextPhase: Phase.MENTAT_PAUSE,
        pendingRequests: [],
        actions: [],
        events,
      };
    }

    return {
      state,
      phaseComplete: false,
      pendingRequests,
      simultaneousRequests: true, // All factions collect simultaneously
      actions: [],
      events,
    };
  }

  private processCollections(
    state: GameState,
    faction: Faction,
    collections: CollectionRequest[],
    events: PhaseEvent[]
  ): { state: GameState; events: PhaseEvent[] } {
    const newEvents: PhaseEvent[] = [];
    let newState = state;

    const opportunities = this.collectionOpportunities.get(faction) ?? [];

    for (const collection of collections) {
      // Validate this is a valid collection opportunity
      const opportunity = opportunities.find(
        (o) =>
          o.territoryId === collection.territoryId &&
          o.sector === collection.sector
      );

      if (!opportunity) continue;

      // Clamp to max collectable
      const amount = Math.min(collection.amount, opportunity.maxCollectable);
      if (amount <= 0) continue;

      // Collect the spice
      newState = addSpice(newState, faction, amount);
      newState = removeSpiceFromTerritory(
        newState,
        collection.territoryId as TerritoryId,
        collection.sector,
        amount
      );

      newEvents.push({
        type: 'SPICE_COLLECTED',
        data: {
          faction,
          territory: collection.territoryId,
          sector: collection.sector,
          amount,
        },
        message: `${faction} collects ${amount} spice from ${collection.territoryId}`,
      });

      newState = logAction(newState, 'SPICE_COLLECTED', faction, {
        territory: collection.territoryId,
        sector: collection.sector,
        amount,
      });
    }

    return { state: newState, events: newEvents };
  }
}

// =============================================================================
// TYPES
// =============================================================================

interface CollectionOpportunity {
  territoryId: TerritoryId;
  sector: number;
  spiceAvailable: number;
  forcesPresent: number;
  maxCollectable: number;
}

interface CollectionRequest {
  territoryId: string;
  sector: number;
  amount: number;
}
