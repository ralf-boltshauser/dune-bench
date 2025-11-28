/**
 * Force Stack Utility Functions
 *
 * DRY utilities for manipulating force stacks and counts.
 * These are the building blocks for all force-related mutations.
 */

import { Faction, TerritoryId, type ForceStack, type ForceCount } from '../types';

// =============================================================================
// FORCE COUNT UTILITIES
// =============================================================================

/**
 * Create an empty ForceCount.
 */
export function emptyForceCount(): ForceCount {
  return { regular: 0, elite: 0 };
}

/**
 * Get total forces in a count.
 */
export function getTotalForces(count: ForceCount): number {
  return count.regular + count.elite;
}

/**
 * Check if a ForceCount is empty.
 */
export function isForceCountEmpty(count: ForceCount): boolean {
  return count.regular === 0 && count.elite === 0;
}

/**
 * Add forces to a count based on type.
 */
export function addToForceCount(
  count: ForceCount,
  amount: number,
  isElite: boolean
): ForceCount {
  return {
    regular: count.regular + (isElite ? 0 : amount),
    elite: count.elite + (isElite ? amount : 0),
  };
}

/**
 * Subtract forces from a count based on type (clamped to 0).
 */
export function subtractFromForceCount(
  count: ForceCount,
  amount: number,
  isElite: boolean
): ForceCount {
  return {
    regular: isElite ? count.regular : Math.max(0, count.regular - amount),
    elite: isElite ? Math.max(0, count.elite - amount) : count.elite,
  };
}

/**
 * Merge two force counts.
 */
export function mergeForceCount(a: ForceCount, b: ForceCount): ForceCount {
  return {
    regular: a.regular + b.regular,
    elite: a.elite + b.elite,
  };
}

// =============================================================================
// FORCE STACK UTILITIES
// =============================================================================

/**
 * Create a new ForceStack at a location.
 */
export function createForceStack(
  factionId: Faction,
  territoryId: TerritoryId,
  sector: number,
  forces: ForceCount = emptyForceCount(),
  advisors?: number
): ForceStack {
  const stack: ForceStack = {
    factionId,
    territoryId,
    sector,
    forces: { ...forces },
  };

  // BG-specific: track advisors if provided
  if (advisors !== undefined) {
    stack.advisors = advisors;
  }

  return stack;
}

/**
 * Check if a stack is empty (no forces).
 */
export function isStackEmpty(stack: ForceStack): boolean {
  return isForceCountEmpty(stack.forces);
}

/**
 * Find a stack at a specific location.
 */
export function findStack(
  stacks: ForceStack[],
  territoryId: TerritoryId,
  sector: number
): ForceStack | undefined {
  return stacks.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );
}

/**
 * Find all stacks in a territory (any sector).
 */
export function findStacksInTerritory(
  stacks: ForceStack[],
  territoryId: TerritoryId
): ForceStack[] {
  return stacks.filter((s) => s.territoryId === territoryId);
}

/**
 * Remove empty stacks from an array.
 */
export function removeEmptyStacks(stacks: ForceStack[]): ForceStack[] {
  return stacks.filter((s) => !isStackEmpty(s));
}

/**
 * Update the forces in a stack at a specific location.
 * Returns new array with updated stack.
 */
export function updateStackForces(
  stacks: ForceStack[],
  territoryId: TerritoryId,
  sector: number,
  updater: (forces: ForceCount) => ForceCount
): ForceStack[] {
  return stacks.map((s) => {
    if (s.territoryId === territoryId && s.sector === sector) {
      return {
        ...s,
        forces: updater(s.forces),
      };
    }
    return s;
  });
}

/**
 * Add forces to a stack at a location, creating if it doesn't exist.
 * Returns new array.
 *
 * For BG forces: When creating a new stack, all forces start as advisors (spiritual side).
 * When adding to existing stack, preserves existing advisor/fighter ratio.
 */
export function addToStack(
  stacks: ForceStack[],
  factionId: Faction,
  territoryId: TerritoryId,
  sector: number,
  amount: number,
  isElite: boolean
): ForceStack[] {
  const existing = findStack(stacks, territoryId, sector);

  if (existing) {
    // Update existing stack
    const updated = updateStackForces(stacks, territoryId, sector, (forces) =>
      addToForceCount(forces, amount, isElite)
    );

    // BG-specific: When adding forces to existing stack, they start as advisors
    if (factionId === Faction.BENE_GESSERIT && existing.advisors !== undefined) {
      return updated.map((s) => {
        if (s.territoryId === territoryId && s.sector === sector) {
          return {
            ...s,
            advisors: (s.advisors ?? 0) + amount,
          };
        }
        return s;
      });
    }

    return updated;
  }

  // Create new stack
  const forcesToAdd = addToForceCount(emptyForceCount(), amount, isElite);
  const newStack = createForceStack(
    factionId,
    territoryId,
    sector,
    forcesToAdd,
    // BG-specific: All forces start as advisors when first placed
    factionId === Faction.BENE_GESSERIT ? amount : undefined
  );
  return [...stacks, newStack];
}

/**
 * Remove forces from a stack at a location.
 * Returns new array with empty stacks removed.
 *
 * For BG forces: Prioritizes removing advisors first, then fighters.
 * This maintains the distinction between combat-capable and non-combat forces.
 */
export function removeFromStack(
  stacks: ForceStack[],
  territoryId: TerritoryId,
  sector: number,
  amount: number,
  isElite: boolean
): ForceStack[] {
  const stack = findStack(stacks, territoryId, sector);

  // BG-specific: When removing forces, remove advisors first, then fighters
  if (stack && stack.advisors !== undefined) {
    const currentAdvisors = stack.advisors;
    const advisorsToRemove = Math.min(amount, currentAdvisors);
    const fightersToRemove = amount - advisorsToRemove;

    const updated = stacks.map((s) => {
      if (s.territoryId === territoryId && s.sector === sector) {
        return {
          ...s,
          advisors: currentAdvisors - advisorsToRemove,
        };
      }
      return s;
    });

    // Remove the remaining as fighters (from total force count)
    if (fightersToRemove > 0) {
      const withForcesRemoved = updateStackForces(updated, territoryId, sector, (forces) =>
        subtractFromForceCount(forces, fightersToRemove, isElite)
      );
      return removeEmptyStacks(withForcesRemoved);
    }

    const withForcesRemoved = updateStackForces(updated, territoryId, sector, (forces) =>
      subtractFromForceCount(forces, advisorsToRemove, isElite)
    );
    return removeEmptyStacks(withForcesRemoved);
  }

  // Standard removal for non-BG factions
  const updated = updateStackForces(stacks, territoryId, sector, (forces) =>
    subtractFromForceCount(forces, amount, isElite)
  );
  return removeEmptyStacks(updated);
}

// =============================================================================
// HIGHER-LEVEL OPERATIONS
// =============================================================================

/**
 * Move forces between two locations on the board.
 * Returns new array.
 */
export function moveStackForces(
  stacks: ForceStack[],
  factionId: Faction,
  from: { territoryId: TerritoryId; sector: number },
  to: { territoryId: TerritoryId; sector: number },
  amount: number,
  isElite: boolean
): ForceStack[] {
  // Remove from source
  let result = removeFromStack(
    stacks,
    from.territoryId,
    from.sector,
    amount,
    isElite
  );

  // Add to destination
  result = addToStack(
    result,
    factionId,
    to.territoryId,
    to.sector,
    amount,
    isElite
  );

  return result;
}

/**
 * Calculate total forces across all stacks.
 */
export function totalForcesOnBoard(stacks: ForceStack[]): ForceCount {
  return stacks.reduce(
    (acc, stack) => mergeForceCount(acc, stack.forces),
    emptyForceCount()
  );
}

/**
 * Get forces at a specific location.
 */
export function getForcesAt(
  stacks: ForceStack[],
  territoryId: TerritoryId,
  sector: number
): ForceCount {
  const stack = findStack(stacks, territoryId, sector);
  return stack ? { ...stack.forces } : emptyForceCount();
}

// =============================================================================
// BATTLE LOSS CALCULATION
// =============================================================================

/**
 * Calculate how to distribute force losses, accounting for elite forces worth 2x.
 *
 * Rules:
 * - Sardaukar (Emperor elite): worth 2 normal forces in battle and in taking losses
 * - Fedaykin (Fremen elite): worth 2 normal forces in battle and in taking losses
 * - Exception: Sardaukar only worth 1x vs Fremen
 *
 * Strategy: Prioritize losing regular forces first to preserve valuable elites.
 *
 * @param forcesInTerritory - The forces available in the territory
 * @param lossesRequired - Number of losses that must be taken
 * @param faction - The faction taking losses (to identify elite type)
 * @param opponentFaction - The opponent faction (for Sardaukar vs Fremen check)
 * @returns Object with regularLost and eliteLost counts
 *
 * @example
 * // With 5 regular, 3 elite, need to lose 8:
 * // Lose all 5 regular (5 losses), then 2 elite (4 more losses) = 9 total absorbed
 * calculateLossDistribution({regular: 5, elite: 3}, 8, Faction.EMPEROR, Faction.ATREIDES)
 * // => {regularLost: 5, eliteLost: 2}
 *
 * @example
 * // Sardaukar vs Fremen special case (elite worth 1x):
 * // With 3 regular, 2 elite, need to lose 5:
 * // Lose all 3 regular (3 losses), then 2 elite (2 more losses) = 5 total
 * calculateLossDistribution({regular: 3, elite: 2}, 5, Faction.EMPEROR, Faction.FREMEN)
 * // => {regularLost: 3, eliteLost: 2}
 */
export function calculateLossDistribution(
  forcesInTerritory: ForceCount,
  lossesRequired: number,
  faction: Faction,
  opponentFaction: Faction
): { regularLost: number; eliteLost: number } {
  const { regular, elite } = forcesInTerritory;

  // Sardaukar only worth 1x vs Fremen (battle.md line 109)
  // Faction enum values are lowercase strings
  const isSardaukarVsFremen =
    faction.toString() === 'emperor' && opponentFaction.toString() === 'fremen';

  // Elite forces are worth 2 losses each, except Sardaukar vs Fremen
  const eliteValue = isSardaukarVsFremen ? 1 : 2;

  // Strategy: Lose regular forces first (each absorbs 1 loss)
  const regularLost = Math.min(regular, lossesRequired);
  let remainingLosses = lossesRequired - regularLost;

  // Then lose elite forces (each absorbs eliteValue losses)
  // We need ceil(remainingLosses / eliteValue) elite forces to cover remaining losses
  const eliteLost = Math.min(elite, Math.ceil(remainingLosses / eliteValue));

  return { regularLost, eliteLost };
}

// =============================================================================
// BENE GESSERIT ADVISOR/FIGHTER UTILITIES
// =============================================================================

/**
 * Convert BG advisors to fighters at a location.
 * Returns new array with updated stack.
 */
export function convertAdvisorsToFighters(
  stacks: ForceStack[],
  territoryId: TerritoryId,
  sector: number,
  count: number
): ForceStack[] {
  return stacks.map((s) => {
    if (s.territoryId === territoryId && s.sector === sector && s.advisors !== undefined) {
      const currentAdvisors = s.advisors;
      const convertCount = Math.min(count, currentAdvisors);
      return {
        ...s,
        advisors: currentAdvisors - convertCount,
      };
    }
    return s;
  });
}

/**
 * Convert BG fighters to advisors at a location.
 * Returns new array with updated stack.
 */
export function convertFightersToAdvisors(
  stacks: ForceStack[],
  territoryId: TerritoryId,
  sector: number,
  count: number
): ForceStack[] {
  return stacks.map((s) => {
    if (s.territoryId === territoryId && s.sector === sector) {
      const totalForces = getTotalForces(s.forces);
      const currentAdvisors = s.advisors ?? 0;
      const currentFighters = totalForces - currentAdvisors;
      const convertCount = Math.min(count, currentFighters);
      return {
        ...s,
        advisors: currentAdvisors + convertCount,
      };
    }
    return s;
  });
}
