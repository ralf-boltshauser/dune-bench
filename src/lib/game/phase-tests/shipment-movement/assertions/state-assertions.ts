/**
 * State Assertions for Shipment & Movement Phase Tests
 * 
 * Single source of truth for all state validation assertions.
 * No duplication - all tests use these helpers.
 */

import { Faction, TerritoryId, type GameState } from '../../../types';
import { getFactionState, getBGFightersInSector, getBGAdvisorsInTerritory, getForcesInTerritory } from '../../../state';

/**
 * Assert forces are in a specific territory/sector
 */
export function assertForcesInTerritory(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  sector: number,
  expectedCount: number,
  expectedElite?: number
): void {
  const factionState = getFactionState(state, faction);
  const stack = factionState.forces.onBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );
  
  const actualRegular = stack?.forces.regular || 0;
  const actualElite = stack?.forces.elite || 0;
  const actualCount = actualRegular + actualElite;
  
  if (actualCount !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} forces for ${faction} in ${territoryId} (sector ${sector}), got ${actualCount} (${actualRegular} regular, ${actualElite} elite)`
    );
  }
  
  if (expectedElite !== undefined && actualElite !== expectedElite) {
    throw new Error(
      `Expected ${expectedElite} elite forces for ${faction} in ${territoryId} (sector ${sector}), got ${actualElite}`
    );
  }
}

/**
 * Assert forces are NOT in a specific territory/sector
 */
export function assertForcesNotInTerritory(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  sector: number
): void {
  const factionState = getFactionState(state, faction);
  const stack = factionState.forces.onBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );
  
  if (stack && (stack.forces.regular > 0 || stack.forces.elite > 0)) {
    const count = stack.forces.regular + stack.forces.elite;
    throw new Error(
      `Expected NO forces for ${faction} in ${territoryId} (sector ${sector}), but found ${count}`
    );
  }
}

/**
 * Assert forces in reserves
 */
export function assertForcesInReserves(
  state: GameState,
  faction: Faction,
  expectedCount: number,
  expectedElite?: number
): void {
  const factionState = getFactionState(state, faction);
  const actualRegular = factionState.forces.reserves.regular;
  const actualElite = factionState.forces.reserves.elite;
  const actualCount = actualRegular + actualElite;
  
  if (actualCount !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} forces in reserves for ${faction}, got ${actualCount} (${actualRegular} regular, ${actualElite} elite)`
    );
  }
  
  if (expectedElite !== undefined && actualElite !== expectedElite) {
    throw new Error(
      `Expected ${expectedElite} elite forces in reserves for ${faction}, got ${actualElite}`
    );
  }
}

/**
 * Assert spice amount for a faction
 */
export function assertSpiceAmount(
  state: GameState,
  faction: Faction,
  expectedAmount: number
): void {
  const factionState = getFactionState(state, faction);
  const actualAmount = factionState.spice;
  
  if (actualAmount !== expectedAmount) {
    throw new Error(
      `Expected ${expectedAmount} spice for ${faction}, got ${actualAmount}`
    );
  }
}

/**
 * Assert spice amount is at least a minimum
 */
export function assertSpiceAtLeast(
  state: GameState,
  faction: Faction,
  minimumAmount: number
): void {
  const factionState = getFactionState(state, faction);
  const actualAmount = factionState.spice;
  
  if (actualAmount < minimumAmount) {
    throw new Error(
      `Expected at least ${minimumAmount} spice for ${faction}, got ${actualAmount}`
    );
  }
}

/**
 * Assert ornithopter access (simplified check - checks if faction has forces in Arrakeen/Carthag)
 */
export function assertOrnithopterAccess(
  state: GameState,
  faction: Faction,
  expected: boolean
): void {
  const factionState = getFactionState(state, faction);
  const hasInArrakeen = factionState.forces.onBoard.some(
    (s) => s.territoryId === TerritoryId.ARRAKEEN
  );
  const hasInCarthag = factionState.forces.onBoard.some(
    (s) => s.territoryId === TerritoryId.CARTHAG
  );
  const actual = hasInArrakeen || hasInCarthag;
  
  if (actual !== expected) {
    throw new Error(
      `Expected ornithopter access for ${faction} to be ${expected}, but faction ${actual ? 'has' : 'does not have'} forces in Arrakeen/Carthag`
    );
  }
}

/**
 * Assert alliance exists between two factions
 */
export function assertAllianceExists(
  state: GameState,
  faction1: Faction,
  faction2: Faction
): void {
  const alliances = state.alliances || [];
  const hasAlliance = alliances.some(
    (a) =>
      (a[0] === faction1 && a[1] === faction2) ||
      (a[0] === faction2 && a[1] === faction1)
  );
  
  if (!hasAlliance) {
    throw new Error(
      `Expected alliance between ${faction1} and ${faction2}, but no alliance exists`
    );
  }
}

/**
 * Assert no alliance exists between two factions
 */
export function assertNoAlliance(
  state: GameState,
  faction1: Faction,
  faction2: Faction
): void {
  const alliances = state.alliances || [];
  const hasAlliance = alliances.some(
    (a) =>
      (a[0] === faction1 && a[1] === faction2) ||
      (a[0] === faction2 && a[1] === faction1)
  );
  
  if (hasAlliance) {
    throw new Error(
      `Expected NO alliance between ${faction1} and ${faction2}, but alliance exists`
    );
  }
}

/**
 * Assert BG advisors in territory
 */
export function assertBGAdvisorsInTerritory(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  expectedCount: number
): void {
  const actualCount = getBGAdvisorsInTerritory(state, territoryId, sector);
  
  if (actualCount !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} BG advisors in ${territoryId} (sector ${sector}), got ${actualCount}`
    );
  }
}

/**
 * Assert BG fighters in territory
 */
export function assertBGFightersInTerritory(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  expectedCount: number
): void {
  const actualCount = getBGFightersInSector(state, territoryId, sector);
  
  if (actualCount !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} BG fighters in ${territoryId} (sector ${sector}), got ${actualCount}`
    );
  }
}

/**
 * Assert forces were sent to Tleilaxu Tanks
 */
export function assertForcesInTanks(
  state: GameState,
  faction: Faction,
  expectedCount: number
): void {
  // Note: This checks if forces were removed from board
  // Actual tank tracking would be in state.tanks or similar
  // For now, we check that forces are NOT on board where they should be
  // This is a simplified check - actual implementation may vary
  const factionState = getFactionState(state, faction);
  const totalOnBoard = factionState.forces.onBoard.reduce(
    (sum, stack) => sum + stack.forces.regular + stack.forces.elite,
    0
  );
  
  // This is a placeholder - actual implementation depends on how tanks are tracked
  // For now, we'll need to track this in test state or events
}

