/**
 * Revival Phase Handler
 *
 * Phase 1.05: Revival
 * - Factions may revive forces from the Tleilaxu Tanks
 * - Free revival limit: 2 per turn (3 for Fremen/Sardaukar)
 * - Additional revival costs 2 spice each
 * - Leaders can be revived (costs leader's strength in spice)
 * - Tleilaxu get money for all revival
 */

import {
  Faction,
  Phase,
  LeaderLocation,
  type GameState,
} from '../../types';
import {
  reviveForces,
  reviveLeader,
  removeSpice,
  addSpice,
  getFactionState,
  logAction,
} from '../../state';
import { GAME_CONSTANTS, getLeaderDefinition } from '../../data';
import {
  type PhaseHandler,
  type PhaseStepResult,
  type AgentRequest,
  type AgentResponse,
  type PhaseEvent,
} from '../types';
import { getRevivalLimits } from '../../rules';

// =============================================================================
// REVIVAL PHASE HANDLER
// =============================================================================

export class RevivalPhaseHandler implements PhaseHandler {
  readonly phase = Phase.REVIVAL;

  private processedFactions: Set<Faction> = new Set();

  initialize(state: GameState): PhaseStepResult {
    // Reset context
    this.processedFactions = new Set();

    const events: PhaseEvent[] = [];
    // Note: PhaseManager emits PHASE_STARTED event, so we don't emit it here

    console.log('\n' + '='.repeat(80));
    console.log('💀 REVIVAL PHASE (Turn ' + state.turn + ')');
    console.log('='.repeat(80));
    console.log('\n  Rule 1.05: "There is no Storm Order in this Phase."');
    console.log('  All players may revive simultaneously.\n');

    // Rule 1.05: "There is no Storm Order in this Phase."
    // Request revival decisions from all factions simultaneously
    return this.requestRevivalDecisions(state, events);
  }

  processStep(state: GameState, responses: AgentResponse[]): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;

    // Process revival requests
    for (const response of responses) {
      this.processedFactions.add(response.factionId);

      if (response.passed) {
        continue; // Faction passed on revival
      }

      const faction = response.factionId;
      const limits = getRevivalLimits(newState, faction);

      // Handle force revival
      if (response.actionType === 'REVIVE_FORCES') {
        // Response should be ADDITIONAL forces beyond free revival
        const additionalCount = Number(response.data.count ?? 0);
        // Total = free + additional
        const totalCount = limits.freeForces + additionalCount;
        const result = this.processForceRevival(newState, faction, totalCount, limits, events);
        newState = result.state;
        events.push(...result.events);
      }

      // Handle leader revival
      if (response.actionType === 'REVIVE_LEADER') {
        const leaderId = response.data.leaderId as string;
        const result = this.processLeaderRevival(newState, faction, leaderId, events);
        newState = result.state;
        events.push(...result.events);
      }
    }

    // Check if all factions have been processed
    const remaining = Array.from(state.factions.keys()).filter(
      (f) => !this.processedFactions.has(f)
    );

    if (remaining.length > 0) {
      return this.requestRevivalDecisions(newState, events);
    }

    // Phase complete
    return {
      state: newState,
      phaseComplete: true,
      nextPhase: Phase.SHIPMENT_MOVEMENT,
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

  private requestRevivalDecisions(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    const pendingRequests: AgentRequest[] = [];

    // Rule 1.05: "There is no Storm Order in this Phase."
    // Process all factions (not in storm order)
    for (const faction of state.factions.keys()) {
      if (this.processedFactions.has(faction)) continue;

      const factionState = getFactionState(state, faction);
      const limits = getRevivalLimits(state, faction);

      // Find revivable leaders
      const revivableLeaders = factionState.leaders.filter(
        (l) =>
          l.location === LeaderLocation.TANKS_FACE_UP ||
          l.location === LeaderLocation.TANKS_FACE_DOWN
      );

      // Calculate how many additional forces can be revived beyond free revival
      const maxAdditionalForces = Math.max(0, limits.maxForces - limits.freeForces);
      const maxAffordableAdditional = Math.max(0, Math.floor(factionState.spice / GAME_CONSTANTS.PAID_REVIVAL_COST));
      const actualMaxAdditional = Math.min(maxAdditionalForces, maxAffordableAdditional, limits.forcesInTanks - limits.freeForces);
      
      pendingRequests.push({
        factionId: faction,
        requestType: 'REVIVE_FORCES',
        prompt: `Revival phase. You have ${limits.forcesInTanks} forces in tanks. You get ${limits.freeForces} forces for FREE. You may revive up to ${actualMaxAdditional} ADDITIONAL forces beyond your free revival at ${GAME_CONSTANTS.PAID_REVIVAL_COST} spice each. How many ADDITIONAL forces do you want to revive? (0 to ${actualMaxAdditional})`,
        context: {
          forcesInTanks: limits.forcesInTanks,
          freeRevivalLimit: limits.freeForces,
          maxAdditionalForces: actualMaxAdditional,
          maxRevivalLimit: limits.maxForces,
          paidRevivalCost: GAME_CONSTANTS.PAID_REVIVAL_COST,
          spiceAvailable: factionState.spice,
          revivableLeaders: revivableLeaders.map((l) => ({
            id: l.definitionId,
            name: getLeaderDefinition(l.definitionId)?.name,
            strength: getLeaderDefinition(l.definitionId)?.strength,
            revivalCost: getLeaderDefinition(l.definitionId)?.strength ?? 0,
          })),
        },
        availableActions: ['REVIVE_FORCES', 'REVIVE_LEADER', 'PASS'],
      });
    }

    if (pendingRequests.length === 0) {
      return {
        state,
        phaseComplete: true,
        nextPhase: Phase.SHIPMENT_MOVEMENT,
        pendingRequests: [],
        actions: [],
        events,
      };
    }

    return {
      state,
      phaseComplete: false,
      pendingRequests,
      simultaneousRequests: true, // Rule 1.05: No storm order - all players revive simultaneously
      actions: [],
      events,
    };
  }

  private processForceRevival(
    state: GameState,
    faction: Faction,
    count: number,
    limits: ReturnType<typeof getRevivalLimits>,
    events: PhaseEvent[]
  ): { state: GameState; events: PhaseEvent[] } {
    const newEvents: PhaseEvent[] = [];
    let newState = state;

    if (count <= 0) {
      return { state, events: newEvents };
    }

    // Clamp to limits
    const actualCount = Math.min(count, limits.maxForces, limits.forcesInTanks);
    const freeCount = Math.min(actualCount, limits.freeForces);
    const paidCount = actualCount - freeCount;
    const cost = paidCount * GAME_CONSTANTS.PAID_REVIVAL_COST;

    const factionState = getFactionState(state, faction);

    // Check if faction can afford paid revival
    if (cost > factionState.spice) {
      // Can only revive what they can afford
      const affordablePaid = Math.floor(factionState.spice / GAME_CONSTANTS.PAID_REVIVAL_COST);
      const newActual = freeCount + affordablePaid;
      const newCost = affordablePaid * GAME_CONSTANTS.PAID_REVIVAL_COST;

      if (newActual > 0) {
        newState = reviveForces(newState, faction, newActual);
        if (newCost > 0) {
          newState = removeSpice(newState, faction, newCost);
          // Note: In expansion, Tleilaxu would receive revival payments
        }

        newEvents.push({
          type: 'FORCES_REVIVED',
          data: { faction, count: newActual, cost: newCost },
          message: `${faction} revives ${newActual} forces (${freeCount} free, ${affordablePaid} paid for ${newCost} spice)`,
        });

        newState = logAction(newState, 'FORCES_REVIVED', faction, {
          count: newActual,
          cost: newCost,
        });
      }

      return { state: newState, events: newEvents };
    }

    // Full revival
    newState = reviveForces(newState, faction, actualCount);
    if (cost > 0) {
      newState = removeSpice(newState, faction, cost);
      // Note: In expansion, Tleilaxu would receive revival payments
    }

    newEvents.push({
      type: 'FORCES_REVIVED',
      data: { faction, count: actualCount, cost },
      message: `${faction} revives ${actualCount} forces (${freeCount} free, ${paidCount} paid for ${cost} spice)`,
    });

    newState = logAction(newState, 'FORCES_REVIVED', faction, {
      count: actualCount,
      cost,
    });

    return { state: newState, events: newEvents };
  }

  private processLeaderRevival(
    state: GameState,
    faction: Faction,
    leaderId: string,
    events: PhaseEvent[]
  ): { state: GameState; events: PhaseEvent[] } {
    const newEvents: PhaseEvent[] = [];
    let newState = state;

    const factionState = getFactionState(state, faction);

    // Find the leader
    const leader = factionState.leaders.find((l) => l.definitionId === leaderId);
    if (!leader) {
      return { state, events: newEvents };
    }

    // Check if in tanks
    if (
      leader.location !== LeaderLocation.TANKS_FACE_UP &&
      leader.location !== LeaderLocation.TANKS_FACE_DOWN
    ) {
      return { state, events: newEvents };
    }

    const leaderDef = getLeaderDefinition(leaderId);
    if (!leaderDef) {
      return { state, events: newEvents };
    }

    const cost = leaderDef.strength;

    // Check if faction can afford
    if (factionState.spice < cost) {
      newEvents.push({
        type: 'LEADER_REVIVED',
        data: { faction, leaderId, failed: true, reason: 'insufficient_spice' },
        message: `${faction} cannot afford to revive ${leaderDef.name} (costs ${cost} spice)`,
      });
      return { state, events: newEvents };
    }

    // Revive the leader
    newState = reviveLeader(newState, faction, leaderId);
    newState = removeSpice(newState, faction, cost);
    // Note: In expansion, Tleilaxu would receive revival payments

    newEvents.push({
      type: 'LEADER_REVIVED',
      data: { faction, leaderId, leaderName: leaderDef.name, cost },
      message: `${faction} revives ${leaderDef.name} for ${cost} spice`,
    });

    newState = logAction(newState, 'LEADER_REVIVED', faction, {
      leaderId,
      leaderName: leaderDef.name,
      cost,
    });

    return { state: newState, events: newEvents };
  }
}
