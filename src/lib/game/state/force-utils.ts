/**
 * Force Stack Utility Functions
 *
 * DRY utilities for manipulating force stacks and counts.
 * These are the building blocks for all force-related mutations.
 */

import {
  Faction,
  TerritoryId,
  type ForceStack,
  type ForceCount,
  type FactionForces,
} from "../types";

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
  const safeRegular = Number.isFinite(count.regular) ? count.regular : 0;
  const safeElite = Number.isFinite(count.elite) ? count.elite : 0;
  return {
    regular: safeRegular + (isElite ? 0 : amount),
    elite: safeElite + (isElite ? amount : 0),
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
  const safeRegular = Number.isFinite(count.regular) ? count.regular : 0;
  const safeElite = Number.isFinite(count.elite) ? count.elite : 0;
  return {
    regular: isElite ? safeRegular : Math.max(0, safeRegular - amount),
    elite: isElite ? Math.max(0, safeElite - amount) : safeElite,
  };
}

/**
 * Merge two force counts.
 */
export function mergeForceCount(a: ForceCount, b: ForceCount): ForceCount {
  const aRegular = Number.isFinite(a.regular) ? a.regular : 0;
  const aElite = Number.isFinite(a.elite) ? a.elite : 0;
  const bRegular = Number.isFinite(b.regular) ? b.regular : 0;
  const bElite = Number.isFinite(b.elite) ? b.elite : 0;
  return {
    regular: aRegular + bRegular,
    elite: aElite + bElite,
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
  const safeForces: ForceCount = {
    regular: Number.isFinite(forces.regular) ? forces.regular : 0,
    elite: Number.isFinite(forces.elite) ? forces.elite : 0,
  };

  const stack: ForceStack = {
    factionId,
    territoryId,
    sector,
    forces: { ...safeForces },
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
 * NOTE: This does NOT check faction - use findStackForFaction for faction-specific lookups
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
 * Find a stack at a specific location for a specific faction.
 * This is safer when you want to ensure you're getting the right faction's stack.
 */
export function findStackForFaction(
  stacks: ForceStack[],
  factionId: Faction,
  territoryId: TerritoryId,
  sector: number
): ForceStack | undefined {
  return stacks.find(
    (s) => s.factionId === factionId && s.territoryId === territoryId && s.sector === sector
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
 * NOTE: This does NOT check faction - use updateStackForcesForFaction for faction-specific updates
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
 * Update the forces in a stack at a specific location for a specific faction.
 * This is safer when you want to ensure you're updating the right faction's stack.
 */
export function updateStackForcesForFaction(
  stacks: ForceStack[],
  factionId: Faction,
  territoryId: TerritoryId,
  sector: number,
  updater: (forces: ForceCount) => ForceCount
): ForceStack[] {
  return stacks.map((s) => {
    if (s.factionId === factionId && s.territoryId === territoryId && s.sector === sector) {
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
 * For BG forces:
 * - Normal shipment (isAdvisor=false): Forces are shipped as fighters (advisors = 0)
 * - Spiritual Advisor ability (isAdvisor=true): Forces are shipped as advisors
 * - When adding to existing stack, new forces match the specified type
 *
 * @param advisorCount - For BG: number of forces to add as advisors. If undefined, uses default behavior:
 *                       - If isAdvisor=true: all forces are advisors
 *                       - If isAdvisor=false: all forces are fighters (advisors = 0)
 */
export function addToStack(
  stacks: ForceStack[],
  factionId: Faction,
  territoryId: TerritoryId,
  sector: number,
  amount: number,
  isElite: boolean,
  advisorCount?: number
): ForceStack[] {
  // Find existing stack for this faction at this location
  // Note: We check faction to prevent accidentally updating wrong faction's stack
  const existing = stacks.find(
    (s) => s.territoryId === territoryId && s.sector === sector && s.factionId === factionId
  );

  if (existing) {
    // Update existing stack
    const updated = stacks.map((s) => {
      if (s.territoryId === territoryId && s.sector === sector && s.factionId === factionId) {
        return {
          ...s,
          forces: addToForceCount(s.forces, amount, isElite),
        };
      }
      return s;
    });

    // BG-specific: Handle advisor count
    if (factionId === Faction.BENE_GESSERIT) {
      // If advisorCount is explicitly provided, use it
      // Otherwise, preserve the existing ratio:
      // - If existing stack has advisors > 0, add as advisors (preserve ratio)
      // - If existing stack has advisors = 0 (all fighters), add as fighters (advisorsToAdd = 0)
      // - If existing stack has advisors = undefined (old game state), default to advisors for backward compatibility
      const advisorsToAdd = advisorCount !== undefined 
        ? advisorCount 
        : (existing.advisors !== undefined 
          ? (existing.advisors > 0 ? amount : 0)  // If all fighters, add as fighters; otherwise preserve ratio
          : amount);  // Old game state: default to advisors
      
      return updated.map((s) => {
        if (s.territoryId === territoryId && s.sector === sector && s.factionId === factionId) {
          return {
            ...s,
            advisors: (s.advisors ?? 0) + advisorsToAdd,
          };
        }
        return s;
      });
    }

    return updated;
  }

  // Create new stack
  const forcesToAdd = addToForceCount(emptyForceCount(), amount, isElite);
  
  // BG-specific: Determine advisor count
  // If advisorCount is explicitly provided, use it
  // Otherwise, default to 0 (fighters) for normal shipment
  const bgAdvisorCount = factionId === Faction.BENE_GESSERIT
    ? (advisorCount !== undefined ? advisorCount : 0)
    : undefined;
  
  const newStack = createForceStack(
    factionId,
    territoryId,
    sector,
    forcesToAdd,
    bgAdvisorCount
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
  // NOTE: This function doesn't check faction, but it's typically called with stacks from a single faction
  // For safety, we should add a faction parameter, but that would be a breaking change
  // For now, we'll use findStack which doesn't check faction (legacy behavior)
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

/**
 * Remove forces from a stack at a specific location for a specific faction.
 * This is safer when you want to ensure you're removing from the right faction's stack.
 */
export function removeFromStackForFaction(
  stacks: ForceStack[],
  factionId: Faction,
  territoryId: TerritoryId,
  sector: number,
  amount: number,
  isElite: boolean
): ForceStack[] {
  const stack = findStackForFaction(stacks, factionId, territoryId, sector);

  // BG-specific: When removing forces, remove advisors first, then fighters
  if (stack && stack.advisors !== undefined) {
    const currentAdvisors = stack.advisors;
    const advisorsToRemove = Math.min(amount, currentAdvisors);
    const fightersToRemove = amount - advisorsToRemove;

    const updated = stacks.map((s) => {
      if (s.factionId === factionId && s.territoryId === territoryId && s.sector === sector) {
        return {
          ...s,
          advisors: currentAdvisors - advisorsToRemove,
        };
      }
      return s;
    });

    // Remove the remaining as fighters (from total force count)
    if (fightersToRemove > 0) {
      const withForcesRemoved = updateStackForcesForFaction(updated, factionId, territoryId, sector, (forces) =>
        subtractFromForceCount(forces, fightersToRemove, isElite)
      );
      return removeEmptyStacks(withForcesRemoved);
    }

    const withForcesRemoved = updateStackForcesForFaction(updated, factionId, territoryId, sector, (forces) =>
      subtractFromForceCount(forces, advisorsToRemove, isElite)
    );
    return removeEmptyStacks(withForcesRemoved);
  }

  // Standard removal for non-BG factions
  const updated = updateStackForcesForFaction(stacks, factionId, territoryId, sector, (forces) =>
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
 *
 * ADAPTIVE FORCE Rule (2.02.21): When you Move advisors or fighters into a Territory
 * where you have the opposite type they flip to match the type already in the Territory.
 * - Move advisors to territory with your fighters → Flip to fighters
 * - Move fighters to territory with your advisors → Flip to advisors
 * - Automatic (not optional)
 */
export function moveStackForces(
  stacks: ForceStack[],
  factionId: Faction,
  from: { territoryId: TerritoryId; sector: number },
  to: { territoryId: TerritoryId; sector: number },
  amount: number,
  isElite: boolean
): ForceStack[] {
  // For Bene Gesserit: Check ADAPTIVE FORCE rule before moving
  if (factionId === Faction.BENE_GESSERIT) {
    const sourceStack = findStackForFaction(stacks, factionId, from.territoryId, from.sector);
    const destStack = findStackForFaction(stacks, factionId, to.territoryId, to.sector);

    if (sourceStack && sourceStack.advisors !== undefined) {
      // Determine what type is being moved
      // removeFromStackForFaction removes advisors first, then fighters
      const sourceAdvisors = sourceStack.advisors;
      const advisorsToMove = Math.min(amount, sourceAdvisors);
      const fightersToMove = amount - advisorsToMove;

      // Check destination type (if it exists)
      if (destStack && destStack.advisors !== undefined) {
        const destTotalForces = getTotalForces(destStack.forces);
        const destAdvisors = destStack.advisors;
        const destFighters = destTotalForces - destAdvisors;

        // ADAPTIVE FORCE: Flip to match destination type
        // Rule: "When you Move advisors or fighters into a Territory where you have
        // the opposite type they flip to match the type already in the Territory."
        if (destFighters > 0 && advisorsToMove > 0) {
          // Moving advisors (or mix with advisors) to fighters destination → flip all to fighters
          // Remove from source (will remove advisors first, then fighters if any)
          let result = removeFromStackForFaction(
            stacks,
            factionId,
            from.territoryId,
            from.sector,
            amount,
            isElite
          );

          // Add to destination (addToStack will add all as advisors by default for BG)
          result = addToStack(
            result,
            factionId,
            to.territoryId,
            to.sector,
            amount,
            isElite
          );

          // ADAPTIVE FORCE: Convert all moved forces to fighters to match destination
          // Note: addToStack adds all forces as advisors, so we convert all moved forces to fighters
          // This handles both pure advisor moves and mixed moves (advisors + fighters)
          result = convertAdvisorsToFighters(
            result,
            to.territoryId,
            to.sector,
            amount // Convert all moved forces (advisorsToMove + any fighters that were added as advisors)
          );

          return result;
        } else if (destAdvisors > 0 && fightersToMove > 0) {
          // Moving fighters (or mix with fighters) to advisors destination → flip all to advisors
          // Remove from source (will remove advisors first, then fighters)
          let result = removeFromStackForFaction(
            stacks,
            factionId,
            from.territoryId,
            from.sector,
            amount,
            isElite
          );

          // Add to destination (addToStack will add all as advisors by default for BG)
          result = addToStack(
            result,
            factionId,
            to.territoryId,
            to.sector,
            amount,
            isElite
          );

          // ADAPTIVE FORCE: addToStack already adds all forces as advisors, so we're good.
          // The moved fighters are now advisors, matching the destination type.
          // This handles both pure fighter moves and mixed moves (advisors + fighters).
          return result;
        }
      }
    }
  }

  // Standard movement (non-BG or no ADAPTIVE FORCE trigger)
  // For BG: Determine advisor count BEFORE removing forces (to preserve type when moving to empty destination)
  let advisorCount: number | undefined = undefined;
  if (factionId === Faction.BENE_GESSERIT) {
    const sourceStack = findStackForFaction(stacks, factionId, from.territoryId, from.sector);
    const destStack = findStackForFaction(stacks, factionId, to.territoryId, to.sector);
    
    // If destination is empty (new stack), preserve the type being moved
    // removeFromStackForFaction removes advisors first, then fighters
    if (!destStack && sourceStack && sourceStack.advisors !== undefined) {
      const sourceAdvisors = sourceStack.advisors;
      const advisorsToMove = Math.min(amount, sourceAdvisors);
      // Preserve advisor count when moving to empty destination
      // This ensures advisors stay advisors and fighters stay fighters when moving to empty territory
      advisorCount = advisorsToMove;
    }
    // If destination exists, addToStack will handle preserving the ratio automatically
  }

  // Remove from source - use faction-specific version to prevent accidentally removing wrong faction's forces
  let result = removeFromStackForFaction(
    stacks,
    factionId,
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
    isElite,
    advisorCount
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
 * Calculate total forces from all sources in FactionForces (reserves + onBoard + tanks).
 */
export function getTotalForcesFromFactionForces(forces: FactionForces): number {
  const reservesTotal = getTotalForces(forces.reserves);
  const onBoardTotal = getTotalForces(totalForcesOnBoard(forces.onBoard));
  const tanksTotal = getTotalForces(forces.tanks);
  return reservesTotal + onBoardTotal + tanksTotal;
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
  const remainingLosses = lossesRequired - regularLost;

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
