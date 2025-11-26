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
  forces: ForceCount = emptyForceCount()
): ForceStack {
  return {
    factionId,
    territoryId,
    sector,
    forces: { ...forces },
  };
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
    return updateStackForces(stacks, territoryId, sector, (forces) =>
      addToForceCount(forces, amount, isElite)
    );
  }

  // Create new stack
  const newStack = createForceStack(
    factionId,
    territoryId,
    sector,
    addToForceCount(emptyForceCount(), amount, isElite)
  );
  return [...stacks, newStack];
}

/**
 * Remove forces from a stack at a location.
 * Returns new array with empty stacks removed.
 */
export function removeFromStack(
  stacks: ForceStack[],
  territoryId: TerritoryId,
  sector: number,
  amount: number,
  isElite: boolean
): ForceStack[] {
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
