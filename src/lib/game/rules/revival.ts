/**
 * Revival validation rules.
 * Handles force and leader revival from the Tleilaxu Tanks.
 */

import {
  Faction,
  LeaderLocation,
  type GameState,
  type Leader,
} from '../types';
import {
  getFactionState,
  getForcesInTanks,
  getLeadersInTanks,
  canReviveLeader,
  getAvailableLeaders,
} from '../state';
import { GAME_CONSTANTS, getFactionConfig, getLeaderDefinition } from '../data';
import {
  type ValidationResult,
  type RevivalSuggestion,
  validResult,
  invalidResult,
  createError,
} from './types';

// =============================================================================
// REVIVAL LIMITS
// =============================================================================

export interface RevivalLimits {
  /** Number of free force revivals */
  freeForces: number;
  /** Maximum forces that can be revived this turn (free + paid) */
  maxForces: number;
  /** Forces currently in tanks */
  forcesInTanks: number;
  /** Cost per additional force */
  costPerForce: number;
  /** Whether leader revival is available */
  canReviveLeader: boolean;
  /** Leaders available to revive */
  revivableLeaders: { id: string; name: string; cost: number }[];
}

/**
 * Get the revival limits for a faction.
 */
export function getRevivalLimits(state: GameState, faction: Faction): RevivalLimits {
  const config = getFactionConfig(faction);
  const factionState = getFactionState(state, faction);
  const forcesInTanks = getForcesInTanks(state, faction);

  // Get revivable leaders (face up in tanks)
  const revivableLeaders = factionState.leaders
    .filter((l) => l.location === LeaderLocation.TANKS_FACE_UP)
    .map((l) => {
      const def = getLeaderDefinition(l.definitionId);
      return {
        id: l.definitionId,
        name: def?.name ?? l.definitionId,
        cost: def?.strength ?? 0,
      };
    });

  // Can revive leader if all leaders dead or all have died at least once
  const canRevive = canReviveLeader(state, faction);

  return {
    freeForces: config.freeRevival,
    maxForces: GAME_CONSTANTS.MAX_FORCE_REVIVAL_PER_TURN,
    forcesInTanks,
    costPerForce: GAME_CONSTANTS.COST_PER_FORCE_REVIVAL,
    canReviveLeader: canRevive && revivableLeaders.length > 0,
    revivableLeaders,
  };
}

// =============================================================================
// FORCE REVIVAL VALIDATION
// =============================================================================

/**
 * Validate force revival from tanks.
 */
export function validateForceRevival(
  state: GameState,
  faction: Faction,
  regularCount: number,
  eliteCount: number = 0
): ValidationResult<RevivalSuggestion> {
  const errors: ReturnType<typeof createError>[] = [];
  const factionState = getFactionState(state, faction);
  const limits = getRevivalLimits(state, faction);
  const totalRequested = regularCount + eliteCount;

  const context = {
    ...limits,
    requestedRegular: regularCount,
    requestedElite: eliteCount,
    spiceAvailable: factionState.spice,
  };

  // Check: Forces in tanks
  const tanksRegular = factionState.forces.tanks.regular;
  const tanksElite = factionState.forces.tanks.elite;

  if (regularCount > tanksRegular) {
    errors.push(
      createError(
        'NO_FORCES_IN_TANKS',
        `Cannot revive ${regularCount} regular forces, only ${tanksRegular} in tanks`,
        {
          field: 'regularCount',
          actual: regularCount,
          expected: `0-${tanksRegular}`,
          suggestion: tanksRegular > 0 ? `Revive ${tanksRegular} regular forces` : 'No regular forces in tanks',
        }
      )
    );
  }

  if (eliteCount > tanksElite) {
    errors.push(
      createError(
        'NO_FORCES_IN_TANKS',
        `Cannot revive ${eliteCount} elite forces, only ${tanksElite} in tanks`,
        {
          field: 'eliteCount',
          actual: eliteCount,
          expected: `0-${tanksElite}`,
          suggestion: tanksElite > 0 ? `Revive ${tanksElite} elite forces` : 'No elite forces in tanks',
        }
      )
    );
  }

  // Check: Revival limit
  if (totalRequested > limits.maxForces) {
    errors.push(
      createError(
        'REVIVAL_LIMIT_EXCEEDED',
        `Cannot revive ${totalRequested} forces, maximum is ${limits.maxForces} per turn`,
        {
          field: 'totalCount',
          actual: totalRequested,
          expected: `<= ${limits.maxForces}`,
          suggestion: `Revive ${limits.maxForces} forces instead`,
        }
      )
    );
  }

  // Calculate cost
  const freeRevival = Math.min(totalRequested, limits.freeForces);
  const paidRevival = Math.max(0, totalRequested - freeRevival);
  const cost = paidRevival * limits.costPerForce;

  // Check: Sufficient spice
  if (cost > factionState.spice) {
    const affordable = limits.freeForces + Math.floor(factionState.spice / limits.costPerForce);
    errors.push(
      createError(
        'INSUFFICIENT_SPICE',
        `Revival costs ${cost} spice but you only have ${factionState.spice}`,
        {
          field: 'totalCount',
          actual: cost,
          expected: `<= ${factionState.spice}`,
          suggestion: affordable > 0 ? `Revive ${affordable} forces for ${Math.max(0, affordable - limits.freeForces) * limits.costPerForce} spice` : 'Only free revival available',
        }
      )
    );
  }

  if (errors.length === 0) {
    return validResult({
      ...context,
      cost,
      freeRevival,
      paidRevival,
    });
  }

  // Generate suggestions
  const suggestions = generateRevivalSuggestions(state, faction, limits);

  return invalidResult(errors, context, suggestions);
}

/**
 * Generate revival suggestions.
 */
function generateRevivalSuggestions(
  state: GameState,
  faction: Faction,
  limits: RevivalLimits
): RevivalSuggestion[] {
  const suggestions: RevivalSuggestion[] = [];
  const factionState = getFactionState(state, faction);
  const tanksRegular = factionState.forces.tanks.regular;
  const tanksElite = factionState.forces.tanks.elite;

  // Free revival only
  if (limits.freeForces > 0 && limits.forcesInTanks > 0) {
    const freeCount = Math.min(limits.freeForces, tanksRegular);
    if (freeCount > 0) {
      suggestions.push({
        regularForces: freeCount,
        eliteForces: 0,
        cost: 0,
        isFreeRevival: true,
      });
    }
  }

  // Max revival
  const maxRegular = Math.min(tanksRegular, limits.maxForces);
  const paidCount = Math.max(0, maxRegular - limits.freeForces);
  const maxCost = paidCount * limits.costPerForce;

  if (maxCost <= factionState.spice && maxRegular > limits.freeForces) {
    suggestions.push({
      regularForces: maxRegular,
      eliteForces: 0,
      cost: maxCost,
      isFreeRevival: false,
    });
  }

  // Elite revival (if available)
  if (tanksElite > 0 && (faction === Faction.EMPEROR || faction === Faction.FREMEN)) {
    const eliteCount = Math.min(1, tanksElite); // Only 1 elite per turn
    suggestions.push({
      regularForces: Math.min(limits.freeForces, tanksRegular),
      eliteForces: eliteCount,
      cost: 0,
      isFreeRevival: true,
    });
  }

  return suggestions;
}

// =============================================================================
// LEADER REVIVAL VALIDATION
// =============================================================================

export interface LeaderRevivalSuggestion {
  leaderId: string;
  leaderName: string;
  cost: number;
}

/**
 * Validate leader revival from tanks.
 */
export function validateLeaderRevival(
  state: GameState,
  faction: Faction,
  leaderId: string
): ValidationResult<LeaderRevivalSuggestion> {
  const errors: ReturnType<typeof createError>[] = [];
  const factionState = getFactionState(state, faction);
  const limits = getRevivalLimits(state, faction);

  const context = {
    canReviveLeader: limits.canReviveLeader,
    revivableLeaders: limits.revivableLeaders,
    spiceAvailable: factionState.spice,
  };

  // Check: Can revive leaders at all
  if (!limits.canReviveLeader) {
    const availableLeaders = getAvailableLeaders(state, faction);
    if (availableLeaders.length > 0) {
      errors.push(
        createError(
          'CANNOT_REVIVE_LEADER_YET',
          'Cannot revive leaders while you have active leaders available',
          {
            suggestion: 'Wait until all your leaders have been killed at least once',
          }
        )
      );
    } else {
      errors.push(
        createError(
          'NO_LEADERS_IN_TANKS',
          'No leaders available to revive (all face-down)',
          {
            suggestion: 'Leaders that have died twice cannot be revived until others die',
          }
        )
      );
    }
    return invalidResult(errors, context);
  }

  // Check: Leader exists and is revivable
  const leader = factionState.leaders.find((l) => l.definitionId === leaderId);
  if (!leader) {
    errors.push(
      createError('LEADER_NOT_IN_POOL', `Leader ${leaderId} not found`, {
        field: 'leaderId',
        suggestion: `Choose from: ${limits.revivableLeaders.map((l) => l.id).join(', ')}`,
      })
    );
    return invalidResult(errors, context);
  }

  if (leader.location !== LeaderLocation.TANKS_FACE_UP) {
    if (leader.location === LeaderLocation.TANKS_FACE_DOWN) {
      errors.push(
        createError(
          'LEADER_FACE_DOWN',
          `${leaderId} has died twice and cannot be revived yet`,
          {
            field: 'leaderId',
            suggestion: 'Other leaders must die again before this one can be revived',
          }
        )
      );
    } else {
      errors.push(
        createError('LEADER_NOT_IN_POOL', `${leaderId} is not in the tanks`, {
          field: 'leaderId',
          actual: leader.location,
        })
      );
    }
    return invalidResult(errors, context);
  }

  // Check: Sufficient spice (cost = leader strength)
  const leaderDef = getLeaderDefinition(leaderId);
  const cost = leaderDef?.strength ?? 0;

  if (cost > factionState.spice) {
    errors.push(
      createError(
        'INSUFFICIENT_SPICE',
        `Revival costs ${cost} spice (leader strength) but you only have ${factionState.spice}`,
        {
          field: 'leaderId',
          actual: cost,
          expected: `<= ${factionState.spice}`,
          suggestion: limits.revivableLeaders
            .filter((l) => l.cost <= factionState.spice)
            .map((l) => `Revive ${l.name} for ${l.cost} spice`)
            .join(', ') || 'Not enough spice for any leader',
        }
      )
    );
  }

  if (errors.length === 0) {
    return validResult({
      ...context,
      cost,
      leaderName: leaderDef?.name ?? leaderId,
    });
  }

  // Generate suggestions
  const suggestions = limits.revivableLeaders
    .filter((l) => l.cost <= factionState.spice)
    .map((l) => ({
      leaderId: l.id,
      leaderName: l.name,
      cost: l.cost,
    }));

  return invalidResult(errors, context, suggestions);
}
