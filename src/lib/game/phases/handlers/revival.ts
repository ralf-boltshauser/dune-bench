/**
 * Revival Phase Handler
 *
 * Phase 1.05: Revival
 * - Factions may revive forces from the Tleilaxu Tanks
 * - Free revival limit and paid revival costs are determined by faction config
 * - Leaders can be revived (cost = leader strength in spice)
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
  reviveKwisatzHaderach,
  removeSpice,
  addSpice,
  getFactionState,
  logAction,
} from '../../state';
import { GAME_CONSTANTS, getLeaderDefinition, getFactionConfig } from '../../data';
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
  private fremenBoostAsked: boolean = false;

  initialize(state: GameState): PhaseStepResult {
    // Reset context
    this.processedFactions = new Set();
    this.fremenBoostAsked = false;

    const events: PhaseEvent[] = [];
    // Note: PhaseManager emits PHASE_STARTED event, so we don't emit it here

    console.log('\n' + '='.repeat(80));
    console.log('💀 REVIVAL PHASE (Turn ' + state.turn + ')');
    console.log('='.repeat(80));
    console.log('\n  Rule 1.05: "There is no Storm Order in this Phase."');
    console.log('  All players may revive simultaneously.\n');

    // Reset Emperor ally revival bonus, Fremen boost, and elite revival tracking for all factions
    let newState = state;
    const newFactions = new Map(state.factions);
    for (const [faction, factionState] of state.factions) {
      const needsReset =
        (factionState.emperorAllyRevivalsUsed !== undefined && factionState.emperorAllyRevivalsUsed > 0) ||
        (factionState.fremenRevivalBoostGranted === true) ||
        (factionState.eliteForcesRevivedThisTurn !== undefined && factionState.eliteForcesRevivedThisTurn > 0);

      if (needsReset) {
        newFactions.set(faction, {
          ...factionState,
          emperorAllyRevivalsUsed: 0,
          fremenRevivalBoostGranted: false,
          eliteForcesRevivedThisTurn: 0,
        });
      }
    }
    newState = { ...state, factions: newFactions };

    // @rule 1.05.00 / 1.05 - There is no Storm Order in this Phase; all players may revive simultaneously.
    // Request revival decisions from all factions simultaneously.
    return this.requestRevivalDecisions(newState, events);
  }

  processStep(state: GameState, responses: AgentResponse[]): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;

    // Process Fremen revival boost decision first
    const fremenBoostResponse = responses.find(
      (r) => r.actionType === 'GRANT_FREMEN_REVIVAL_BOOST' || r.actionType === 'DENY_FREMEN_REVIVAL_BOOST'
    );

    if (fremenBoostResponse) {
      const fremenState = getFactionState(newState, Faction.FREMEN);
      const allyId = fremenState.allyId;

      if (allyId && fremenBoostResponse.actionType === 'GRANT_FREMEN_REVIVAL_BOOST') {
        // Grant the boost to the ally
        const allyState = getFactionState(newState, allyId);
        const newFactions = new Map(newState.factions);
        newFactions.set(allyId, {
          ...allyState,
          fremenRevivalBoostGranted: true,
        });
        newState = { ...newState, factions: newFactions };

        events.push({
          type: 'FORCES_REVIVED',
          data: { faction: Faction.FREMEN, allyId, boostGranted: true },
          message: `Fremen grants ${allyId} 3 free revivals this turn`,
        });

        newState = logAction(newState, 'FORCES_REVIVED', Faction.FREMEN, {
          allyId,
          fremenRevivalBoostGranted: true,
        });
      } else {
        // Fremen denied the boost
        events.push({
          type: 'FORCES_REVIVED',
          data: { faction: Faction.FREMEN, allyId, boostGranted: false },
          message: `Fremen declines to grant ${allyId} the revival boost`,
        });
      }

      this.fremenBoostAsked = true;
    }

    // Process revival requests
    for (const response of responses) {
      // Skip Fremen boost responses (already handled)
      if (response.actionType === 'GRANT_FREMEN_REVIVAL_BOOST' || response.actionType === 'DENY_FREMEN_REVIVAL_BOOST') {
        continue;
      }

      this.processedFactions.add(response.factionId);

      const faction = response.factionId;
      const limits = getRevivalLimits(newState, faction);

      // Handle explicit force revival request
      if (response.actionType === 'REVIVE_FORCES') {
        // Response should be ADDITIONAL forces beyond free revival
        const additionalCount = Number(response.data.count ?? 0);
        // Total = free + additional
        const totalCount = limits.freeForces + additionalCount;
        const result = this.processForceRevival(newState, faction, totalCount, limits, events);
        newState = result.state;
        events.push(...result.events);
      } else if (!response.passed) {
        // If faction didn't pass and didn't request force revival, check for other revival types
        // Handle leader revival
        if (response.actionType === 'REVIVE_LEADER') {
          const leaderId = response.data.leaderId as string;
          const result = this.processLeaderRevival(newState, faction, leaderId, events);
          newState = result.state;
          events.push(...result.events);
        }

        // Handle Kwisatz Haderach revival
        if (response.actionType === 'REVIVE_KWISATZ_HADERACH') {
          const result = this.processKwisatzHaderachRevival(newState, faction, events);
          newState = result.state;
          events.push(...result.events);
        }
      }

      // FREE REVIVAL: Automatically apply free revival if available and not already applied
      // Rule: "FREE REVIVAL: A certain number of Forces are revived for free as stated on the player sheet."
      // Free revival should happen automatically, even if faction passed or didn't explicitly request it
      // Only apply if:
      // 1. Faction has free revival available
      // 2. Faction has forces in tanks
      // 3. Faction didn't already request REVIVE_FORCES (which would have included free revival)
      if (limits.freeForces > 0 && limits.forcesInTanks > 0 && response.actionType !== 'REVIVE_FORCES') {
        // Apply free revival automatically
        const freeCount = Math.min(limits.freeForces, limits.forcesInTanks);
        if (freeCount > 0) {
          const result = this.processForceRevival(newState, faction, freeCount, limits, events);
          newState = result.state;
          events.push(...result.events);
        }
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
  // @rule 2.01.15 ASCENSION: Alive or dead, the Kwisatz Haderach does not prevent
  // the Atreides from reviving leaders. This rule is implemented by the absence of
  // any blocking logic - leader revival proceeds normally regardless of KH state.

  private requestRevivalDecisions(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    const pendingRequests: AgentRequest[] = [];

    // Check if Fremen has an ally and hasn't been asked yet
    const fremenState = state.factions.get(Faction.FREMEN);
    if (fremenState && fremenState.allyId && !this.fremenBoostAsked) {
      const allyId = fremenState.allyId;
      const allyState = getFactionState(state, allyId);
      const allyLimits = getRevivalLimits(state, allyId);

      // Only ask if ally has forces in tanks
      if (allyLimits.forcesInTanks > 0) {
        pendingRequests.push({
          factionId: Faction.FREMEN,
          requestType: 'GRANT_FREMEN_REVIVAL_BOOST',
          prompt: `Your ally ${allyId} has ${allyLimits.forcesInTanks} forces in tanks and normally gets ${allyLimits.freeForces} free revivals. FREMEN ALLIANCE ABILITY: Do you want to grant your ally 3 free revivals this turn? This is at your discretion and can be decided each turn.`,
          context: {
            allyId,
            allyForcesInTanks: allyLimits.forcesInTanks,
            allyNormalFreeRevival: getFactionConfig(allyId).freeRevival,
            fremenBoostAmount: 3,
          },
          availableActions: ['GRANT_FREMEN_REVIVAL_BOOST', 'DENY_FREMEN_REVIVAL_BOOST'],
        });

        // Return early to get Fremen's decision first
        return {
          state,
          phaseComplete: false,
          pendingRequests,
          simultaneousRequests: false, // Process Fremen's decision first
          actions: [],
          events,
        };
      } else {
        // Ally has no forces in tanks, mark as asked and continue
        this.fremenBoostAsked = true;
      }
    }

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
      const actualMaxAdditional = Math.max(0, Math.min(maxAdditionalForces, maxAffordableAdditional, limits.forcesInTanks - limits.freeForces));

      // Check if Emperor and allied for special revival ability
      const isEmperor = faction === Faction.EMPEROR;
      const allyId = factionState.allyId;
      let emperorAllyInfo = '';
      let allyLimits = null;

      if (isEmperor && allyId) {
        allyLimits = getRevivalLimits(state, allyId);
        const allyFactionState = getFactionState(state, allyId);
        if (allyLimits.emperorBonusAvailable > 0 && allyLimits.forcesInTanks > 0) {
          emperorAllyInfo = ` EMPEROR ALLIANCE ABILITY: You can pay ${GAME_CONSTANTS.PAID_REVIVAL_COST} spice per force to revive up to ${allyLimits.emperorBonusAvailable} extra forces for your ally ${allyId} (they have ${allyLimits.forcesInTanks} in tanks). Use emperor_pay_ally_revival tool.`;
        }
      }

      // Check if this faction received Fremen revival boost
      let fremenBoostInfo = '';
      if (limits.fremenBoostGranted) {
        fremenBoostInfo = ` FREMEN ALLIANCE BONUS: Your Fremen ally has granted you 3 free revivals this turn!`;
      }

      // Check if Atreides can revive Kwisatz Haderach
      let khRevivalInfo = '';
      if (faction === Faction.ATREIDES) {
        const kh = factionState.kwisatzHaderach;
        if (kh?.isDead) {
          const allLeadersDeadOnce = factionState.leaders.every(
            (l) => l.hasBeenKilled || l.location === LeaderLocation.TANKS_FACE_UP || l.location === LeaderLocation.TANKS_FACE_DOWN
          );
          const hasActiveLeaders = factionState.leaders.some(
            (l) => l.location === LeaderLocation.LEADER_POOL
          );
          const canReviveKH = (allLeadersDeadOnce || !hasActiveLeaders) && factionState.spice >= 2;
          if (canReviveKH) {
            khRevivalInfo = ` REAWAKEN: Your Kwisatz Haderach is dead. You can revive it for 2 spice (use REVIVE_KWISATZ_HADERACH action).`;
          }
        }
      }

      pendingRequests.push({
        factionId: faction,
        requestType: 'REVIVE_FORCES',
        prompt: `Revival phase. You have ${limits.forcesInTanks} forces in tanks. You get ${limits.freeForces} forces for FREE.${fremenBoostInfo} You may revive up to ${actualMaxAdditional} ADDITIONAL forces beyond your free revival at ${GAME_CONSTANTS.PAID_REVIVAL_COST} spice each. How many ADDITIONAL forces do you want to revive? (0 to ${actualMaxAdditional})${emperorAllyInfo}${khRevivalInfo}`,
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
          ...(allyLimits && {
            emperorAllyRevival: {
              allyId,
              allyForcesInTanks: allyLimits.forcesInTanks,
              emperorBonusAvailable: allyLimits.emperorBonusAvailable,
              costPerForce: GAME_CONSTANTS.PAID_REVIVAL_COST,
            }
          }),
          // Check if Kwisatz Haderach can be revived (Atreides only)
          ...(faction === Faction.ATREIDES && {
            kwisatzHaderachDead: factionState.kwisatzHaderach?.isDead ?? false,
            kwisatzHaderachRevivalCost: 2,
            canReviveKwisatzHaderach: (() => {
              const kh = factionState.kwisatzHaderach;
              if (!kh || !kh.isDead) return false;
              // Can revive if all leaders have died once or no active leaders
              const allLeadersDeadOnce = factionState.leaders.every(
                (l) => l.hasBeenKilled || l.location === LeaderLocation.TANKS_FACE_UP || l.location === LeaderLocation.TANKS_FACE_DOWN
              );
              const hasActiveLeaders = factionState.leaders.some(
                (l) => l.location === LeaderLocation.LEADER_POOL
              );
              return allLeadersDeadOnce || !hasActiveLeaders;
            })(),
          }),
        },
        availableActions: [
          'REVIVE_FORCES',
          'REVIVE_LEADER',
          ...(faction === Faction.ATREIDES && factionState.kwisatzHaderach?.isDead && (() => {
            const allLeadersDeadOnce = factionState.leaders.every(
              (l) => l.hasBeenKilled || l.location === LeaderLocation.TANKS_FACE_UP || l.location === LeaderLocation.TANKS_FACE_DOWN
            );
            const hasActiveLeaders = factionState.leaders.some(
              (l) => l.location === LeaderLocation.LEADER_POOL
            );
            return (allLeadersDeadOnce || !hasActiveLeaders) && factionState.spice >= 2;
          })() ? ['REVIVE_KWISATZ_HADERACH'] : []),
          'PASS',
        ],
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
    const currentSpice = factionState.spice;
    const currentForcesInTanks = factionState.forces.tanks.regular + factionState.forces.tanks.elite;
    const currentReserves = factionState.forces.reserves.regular + factionState.forces.reserves.elite;

    // Check if the tool already applied the revival
    // The phase manager syncs state from agent provider BEFORE calling processStep,
    // so the state passed here may already have the tool's changes applied.
    // We detect this by checking if spice has been deducted or if forces in tanks are insufficient
    const spiceAlreadyDeducted = cost > 0 && currentSpice < cost;
    const forcesInTanksInsufficient = currentForcesInTanks < actualCount;
    
    // If spice was already deducted OR forces in tanks are insufficient, tool likely already applied it
    if (spiceAlreadyDeducted || forcesInTanksInsufficient) {
      // State has already been updated by tool - don't apply again
      console.log(`   ℹ️  Revival already applied by tool (spice: ${currentSpice}, cost: ${cost}, tanks: ${currentForcesInTanks}, needed: ${actualCount}), skipping duplicate application\n`);
      return { state, events: newEvents };
    }

    // Check if faction can afford paid revival
    if (cost > factionState.spice) {
      // Can only revive what they can afford
      const affordablePaid = Math.floor(factionState.spice / GAME_CONSTANTS.PAID_REVIVAL_COST);
      const newActual = freeCount + affordablePaid;
      const newCost = affordablePaid * GAME_CONSTANTS.PAID_REVIVAL_COST;

      if (newActual > 0) {
        newState = reviveForces(newState, faction, newActual);
        if (newCost > 0) {
          // @rule 1.05.01.04
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

    // Full revival (only if tool hasn't already applied it - checked above)
    newState = reviveForces(newState, faction, actualCount);
    if (cost > 0) {
      // @rule 1.05.01.04
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

    // @rule 1.05.03.02
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
    // @rule 1.05.03.03
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

  private processKwisatzHaderachRevival(
    state: GameState,
    faction: Faction,
    events: PhaseEvent[]
  ): { state: GameState; events: PhaseEvent[] } {
    const newEvents: PhaseEvent[] = [];
    let newState = state;

    // Only Atreides can revive KH
    if (faction !== Faction.ATREIDES) {
      return { state, events: newEvents };
    }

    const factionState = getFactionState(state, faction);
    const kh = factionState.kwisatzHaderach;

    // Check if KH exists and is dead
    if (!kh || !kh.isDead) {
      return { state, events: newEvents };
    }

    // REAWAKEN: KH can be revived when all other leaders have died once and/or become unavailable
    // Check if all leaders have died at least once
    const allLeadersDeadOnce = factionState.leaders.every(
      (l) => l.hasBeenKilled || l.location === LeaderLocation.TANKS_FACE_UP || l.location === LeaderLocation.TANKS_FACE_DOWN
    );
    const hasActiveLeaders = factionState.leaders.some(
      (l) => l.location === LeaderLocation.LEADER_POOL
    );

    if (!allLeadersDeadOnce && hasActiveLeaders) {
      newEvents.push({
        type: 'KWISATZ_HADERACH_REVIVED',
        data: { faction, failed: true, reason: 'leaders_still_available' },
        message: `${faction} cannot revive Kwisatz Haderach yet - must wait until all leaders have died once`,
      });
      return { state, events: newEvents };
    }

    // Cost: 2 spice (KH strength is +2)
    const cost = 2;

    // Check if faction can afford
    if (factionState.spice < cost) {
      newEvents.push({
        type: 'KWISATZ_HADERACH_REVIVED',
        data: { faction, failed: true, reason: 'insufficient_spice' },
        message: `${faction} cannot afford to revive Kwisatz Haderach (costs ${cost} spice)`,
      });
      return { state, events: newEvents };
    }

    // Revive KH
    newState = reviveKwisatzHaderach(newState);
    newState = removeSpice(newState, faction, cost);

    newEvents.push({
      type: 'KWISATZ_HADERACH_REVIVED',
      data: { faction, cost },
      message: `${faction} revives Kwisatz Haderach for ${cost} spice`,
    });

    newState = logAction(newState, 'KWISATZ_HADERACH_REVIVED', faction, {
      cost,
    });

    return { state: newState, events: newEvents };
  }
}
