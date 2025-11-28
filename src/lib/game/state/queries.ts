/**
 * State query helpers.
 * Pure functions to query game state without mutating it.
 */

import {
  FACTION_CONFIGS,
  GAME_CONSTANTS,
  getTreacheryCardDefinition,
} from "../data";
import {
  AllianceStatus,
  Faction,
  type FactionState,
  type ForceStack,
  type GameState,
  type Leader,
  LeaderLocation,
  type PublicFactionState,
  STRONGHOLD_TERRITORIES,
  TERRITORY_DEFINITIONS,
  TerritoryId,
  type TreacheryCard,
  TreacheryCardType,
} from "../types";
import { getTotalForces, totalForcesOnBoard } from "./force-utils";

// =============================================================================
// FACTION STATE QUERIES
// =============================================================================

/**
 * Get a faction's state, throws if faction not in game.
 */
export function getFactionState(
  state: GameState,
  faction: Faction
): FactionState {
  const factionState = state.factions.get(faction);
  if (!factionState) {
    throw new Error(`Faction ${faction} not in game`);
  }
  return factionState;
}

/**
 * Get faction's total spice (behind shield).
 */
export function getFactionSpice(state: GameState, faction: Faction): number {
  return getFactionState(state, faction).spice;
}

/**
 * Get faction's hand size.
 */
export function getFactionHandSize(state: GameState, faction: Faction): number {
  return getFactionState(state, faction).hand.length;
}

/**
 * Get faction's maximum hand size.
 */
export function getFactionMaxHandSize(faction: Faction): number {
  return FACTION_CONFIGS[faction].maxHandSize;
}

/**
 * Check if faction can bid (hand not full).
 */
export function canFactionBid(state: GameState, faction: Faction): boolean {
  return getFactionHandSize(state, faction) < getFactionMaxHandSize(faction);
}

/**
 * Get faction's available leaders (in leader pool).
 */
export function getAvailableLeaders(
  state: GameState,
  faction: Faction
): Leader[] {
  return getFactionState(state, faction).leaders.filter(
    (l) => l.location === LeaderLocation.LEADER_POOL
  );
}

/**
 * Check if faction has any available leaders.
 */
export function hasAvailableLeaders(
  state: GameState,
  faction: Faction
): boolean {
  return getAvailableLeaders(state, faction).length > 0;
}

/**
 * Get faction's leaders in tanks (dead).
 */
export function getLeadersInTanks(
  state: GameState,
  faction: Faction
): Leader[] {
  return getFactionState(state, faction).leaders.filter(
    (l) =>
      l.location === LeaderLocation.TANKS_FACE_UP ||
      l.location === LeaderLocation.TANKS_FACE_DOWN
  );
}

/**
 * Check if faction can revive a leader.
 * Can only revive when all leaders are dead or have died at least once.
 */
export function canReviveLeader(state: GameState, faction: Faction): boolean {
  const factionState = getFactionState(state, faction);
  const allLeadersDead = factionState.leaders.every(
    (l) => l.location !== LeaderLocation.LEADER_POOL
  );
  const someLeadersRevivable = factionState.leaders.some(
    (l) => l.location === LeaderLocation.TANKS_FACE_UP
  );
  return allLeadersDead || someLeadersRevivable;
}

// =============================================================================
// FORCE QUERIES
// =============================================================================

/**
 * Get total forces in reserves for a faction.
 */
export function getReserveForceCount(
  state: GameState,
  faction: Faction
): number {
  return getTotalForces(getFactionState(state, faction).forces.reserves);
}

/**
 * Get forces in a specific territory for a faction.
 */
export function getForcesInTerritory(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId
): ForceStack | undefined {
  const forces = getFactionState(state, faction).forces;
  return forces.onBoard.find((f) => f.territoryId === territoryId);
}

/**
 * Get total force count in a territory for a faction.
 */
export function getForceCountInTerritory(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId
): number {
  const stack = getForcesInTerritory(state, faction, territoryId);
  return stack ? getTotalForces(stack.forces) : 0;
}

/**
 * Get all factions with forces in a territory.
 *
 * IMPORTANT: For Bene Gesserit, only includes them if they have fighters (battle-capable forces).
 * BG advisors (spiritual side) are non-combatants and don't count for battle purposes.
 */
export function getFactionsInTerritory(
  state: GameState,
  territoryId: TerritoryId
): Faction[] {
  const factions: Faction[] = [];
  for (const [faction, factionState] of state.factions) {
    const hasForces = factionState.forces.onBoard.some(
      (f) => f.territoryId === territoryId
    );

    if (hasForces) {
      // BG special case: advisors don't count for battle purposes
      if (faction === Faction.BENE_GESSERIT) {
        const fighters = getBGFightersInTerritory(state, territoryId);
        if (fighters === 0) {
          // Only advisors present - can't battle
          continue;
        }
      }

      factions.push(faction);
    }
  }
  return factions;
}

/**
 * Get total forces on board for a faction.
 */
export function getTotalForcesOnBoard(
  state: GameState,
  faction: Faction
): number {
  return getTotalForces(
    totalForcesOnBoard(getFactionState(state, faction).forces.onBoard)
  );
}

/**
 * Get forces in tanks for a faction.
 */
export function getForcesInTanks(state: GameState, faction: Faction): number {
  return getTotalForces(getFactionState(state, faction).forces.tanks);
}

/**
 * Get BG fighters (battle-capable forces) in a territory.
 * Fighters = total forces - advisors
 */
export function getBGFightersInTerritory(
  state: GameState,
  territoryId: TerritoryId
): number {
  const stack = getForcesInTerritory(state, Faction.BENE_GESSERIT, territoryId);
  if (!stack) return 0;

  const totalForces = getTotalForces(stack.forces);
  const advisors = stack.advisors ?? 0;
  return totalForces - advisors;
}

/**
 * Get BG advisors (non-combatants) in a territory.
 */
export function getBGAdvisorsInTerritory(
  state: GameState,
  territoryId: TerritoryId
): number {
  const stack = getForcesInTerritory(state, Faction.BENE_GESSERIT, territoryId);
  if (!stack) return 0;

  return stack.advisors ?? 0;
}

/**
 * Get BG fighters (battle-capable forces) in a specific territory AND sector.
 * Fighters = total forces - advisors
 */
export function getBGFightersInSector(
  state: GameState,
  territoryId: TerritoryId,
  sector: number
): number {
  const factionState = getFactionState(state, Faction.BENE_GESSERIT);
  const stack = factionState.forces.onBoard.find(
    (f) => f.territoryId === territoryId && f.sector === sector
  );
  if (!stack) return 0;

  const totalForces = getTotalForces(stack.forces);
  const advisors = stack.advisors ?? 0;
  return totalForces - advisors;
}

/**
 * Get factions with forces in a specific territory AND sector.
 *
 * IMPORTANT: For Bene Gesserit, only includes them if they have fighters (battle-capable forces).
 * BG advisors (spiritual side) are non-combatants and don't count for battle purposes.
 */
export function getFactionsInTerritoryAndSector(
  state: GameState,
  territoryId: TerritoryId,
  sector: number
): Faction[] {
  const factions: Faction[] = [];
  for (const [faction, factionState] of state.factions) {
    const hasForces = factionState.forces.onBoard.some(
      (f) => f.territoryId === territoryId && f.sector === sector
    );
    if (hasForces) {
      // BG special case: advisors don't count for battle purposes
      if (faction === Faction.BENE_GESSERIT) {
        const fighters = getBGFightersInSector(state, territoryId, sector);
        if (fighters === 0) {
          // Only advisors present - can't battle
          continue;
        }
      }

      factions.push(faction);
    }
  }
  return factions;
}

// =============================================================================
// TERRITORY QUERIES
// =============================================================================

/**
 * Check if a territory is under storm.
 */
export function isTerritoryInStorm(
  state: GameState,
  territoryId: TerritoryId
): boolean {
  const territory = TERRITORY_DEFINITIONS[territoryId];
  if (territory.protectedFromStorm) return false;
  return territory.sectors.includes(state.stormSector);
}

/**
 * Check if a sector is in storm.
 */
export function isSectorInStorm(state: GameState, sector: number): boolean {
  return sector === state.stormSector;
}

/**
 * Check if two sectors in the same territory are separated by the storm sector.
 * Returns true if forces cannot battle due to storm separation.
 *
 * Rules:
 * - Forces in the SAME sector can always battle (even if that sector is in storm)
 * - Forces in DIFFERENT sectors cannot battle if the storm sector is between them
 *
 * @param state Game state containing current storm sector
 * @param sector1 First sector (0-17)
 * @param sector2 Second sector (0-17)
 * @returns true if storm separates these sectors, false otherwise
 */
export function areSectorsSeparatedByStorm(
  state: GameState,
  sector1: number,
  sector2: number
): boolean {
  // Same sector - can always battle (even in storm)
  if (sector1 === sector2) return false;

  const stormSector = state.stormSector;

  // Check if storm is between the two sectors
  // Sectors are arranged in a circle (0-17)
  const min = Math.min(sector1, sector2);
  const max = Math.max(sector1, sector2);

  // Check direct path (not wrapping around)
  const directPathLength = max - min;
  const directPathHasStorm = stormSector > min && stormSector < max;

  // Check wrapped path (going the other way around the circle)
  const wrappedPathLength = 18 - directPathLength; // Total sectors minus direct path
  const wrappedPathHasStorm = stormSector < min || stormSector > max;

  // Storm separates if it's in the shorter path between the sectors
  // (or if both paths are equal length and storm is in either path)
  if (directPathLength < wrappedPathLength) {
    return directPathHasStorm;
  } else if (wrappedPathLength < directPathLength) {
    return wrappedPathHasStorm;
  } else {
    // Equal length paths - storm separates if it's in either path
    return directPathHasStorm || wrappedPathHasStorm;
  }
}

/**
 * Get spice in a territory.
 */
export function getSpiceInTerritory(
  state: GameState,
  territoryId: TerritoryId,
  sector?: number
): number {
  return state.spiceOnBoard
    .filter(
      (s) =>
        s.territoryId === territoryId &&
        (sector === undefined || s.sector === sector)
    )
    .reduce((sum, s) => sum + s.amount, 0);
}

/**
 * Check how many factions occupy a stronghold (for occupancy limit).
 */
export function getStrongholdOccupancy(
  state: GameState,
  territoryId: TerritoryId
): number {
  return getFactionsInTerritory(state, territoryId).length;
}

/**
 * Check if a faction can ship to a territory (occupancy limit check).
 */
export function canShipToTerritory(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId
): boolean {
  // Can't ship into storm
  if (isTerritoryInStorm(state, territoryId)) return false;

  // Non-strongholds have no occupancy limit
  if (!STRONGHOLD_TERRITORIES.includes(territoryId)) return true;

  // Strongholds: max 2 factions
  const occupants = getFactionsInTerritory(state, territoryId);
  if (occupants.includes(faction)) return true; // Already there
  return occupants.length < 2;
}

// =============================================================================
// VICTORY QUERIES
// =============================================================================

/**
 * Get strongholds controlled by a faction.
 * Control = occupying with forces and no other faction present.
 */
export function getControlledStrongholds(
  state: GameState,
  faction: Faction
): TerritoryId[] {
  return STRONGHOLD_TERRITORIES.filter((territoryId) => {
    const occupants = getFactionsInTerritory(state, territoryId);
    return occupants.length === 1 && occupants[0] === faction;
  });
}

/**
 * Get strongholds occupied (but not necessarily controlled) by a faction.
 */
export function getOccupiedStrongholds(
  state: GameState,
  faction: Faction
): TerritoryId[] {
  return STRONGHOLD_TERRITORIES.filter((territoryId) => {
    return getFactionsInTerritory(state, territoryId).includes(faction);
  });
}

/**
 * Check if faction meets stronghold victory condition.
 */
export function checkStrongholdVictory(
  state: GameState,
  faction: Faction
): { wins: boolean; strongholds: TerritoryId[] } {
  const factionState = getFactionState(state, faction);
  const controlled = getControlledStrongholds(state, faction);

  if (
    factionState.allianceStatus === AllianceStatus.ALLIED &&
    factionState.allyId
  ) {
    // Allied victory: need 4 strongholds combined
    const allyControlled = getControlledStrongholds(state, factionState.allyId);
    const combined = [...new Set([...controlled, ...allyControlled])];
    return {
      wins: combined.length >= GAME_CONSTANTS.STRONGHOLDS_TO_WIN_ALLIED,
      strongholds: combined,
    };
  }

  // Solo victory: need 3 strongholds
  return {
    wins: controlled.length >= GAME_CONSTANTS.STRONGHOLDS_TO_WIN_SOLO,
    strongholds: controlled,
  };
}

// =============================================================================
// CARD QUERIES
// =============================================================================

/**
 * Check if faction has a Karama card.
 * Note: BG can use worthless cards as Karama. Use canUseKarama() from rules/karama.ts for full validation.
 */
export function hasKaramaCard(state: GameState, faction: Faction): boolean {
  const hand = getFactionState(state, faction).hand;
  return hand.some((card) => {
    const def = getTreacheryCardDefinition(card.definitionId);
    return def && def.id.startsWith("karama");
  });
}

/**
 * Check if faction has a Cheap Hero card.
 */
export function hasCheapHero(state: GameState, faction: Faction): boolean {
  const hand = getFactionState(state, faction).hand;
  return hand.some((card) => {
    const def = getTreacheryCardDefinition(card.definitionId);
    return def && def.id.startsWith("cheap_hero");
  });
}

/**
 * Get weapon cards in hand.
 */
export function getWeaponCards(
  state: GameState,
  faction: Faction
): TreacheryCard[] {
  const hand = getFactionState(state, faction).hand;
  return hand.filter((card) =>
    [
      TreacheryCardType.WEAPON_PROJECTILE,
      TreacheryCardType.WEAPON_POISON,
      TreacheryCardType.WEAPON_SPECIAL,
    ].includes(card.type)
  );
}

/**
 * Get defense cards in hand.
 */
export function getDefenseCards(
  state: GameState,
  faction: Faction
): TreacheryCard[] {
  const hand = getFactionState(state, faction).hand;
  return hand.filter((card) =>
    [
      TreacheryCardType.DEFENSE_PROJECTILE,
      TreacheryCardType.DEFENSE_POISON,
    ].includes(card.type)
  );
}

// =============================================================================
// ALLIANCE QUERIES
// =============================================================================

/**
 * Check if two factions are allied.
 */
export function areAllied(
  state: GameState,
  faction1: Faction,
  faction2: Faction
): boolean {
  const state1 = getFactionState(state, faction1);
  return (
    state1.allianceStatus === AllianceStatus.ALLIED &&
    state1.allyId === faction2
  );
}

/**
 * Get a faction's ally, if any.
 */
export function getAlly(state: GameState, faction: Faction): Faction | null {
  return getFactionState(state, faction).allyId;
}

// =============================================================================
// PUBLIC STATE (WHAT OTHERS CAN SEE)
// =============================================================================

/**
 * Get public information about a faction (what other players can see).
 */
export function getPublicFactionState(
  state: GameState,
  faction: Faction
): PublicFactionState {
  const factionState = getFactionState(state, faction);
  const forces = factionState.forces;

  return {
    factionId: faction,
    spice: factionState.spice, // Usually visible
    handSize: factionState.hand.length,
    forcesOnBoard: forces.onBoard.map((stack) => ({
      territoryId: stack.territoryId,
      sector: stack.sector,
      count: getTotalForces(stack.forces),
    })),
    forcesInReserves: getTotalForces(forces.reserves),
    forcesInTanks: getTotalForces(forces.tanks),
    leadersAvailable: factionState.leaders.filter(
      (l) => l.location === LeaderLocation.LEADER_POOL
    ).length,
    leadersInTanks: factionState.leaders.filter(
      (l) =>
        l.location === LeaderLocation.TANKS_FACE_UP ||
        l.location === LeaderLocation.TANKS_FACE_DOWN
    ).length,
    allianceStatus: factionState.allianceStatus,
    allyId: factionState.allyId,
  };
}

// =============================================================================
// STORM ORDER
// =============================================================================

/**
 * Get the first player for the current turn.
 */
export function getFirstPlayer(state: GameState): Faction {
  return state.stormOrder[0];
}

/**
 * Get the next faction in storm order.
 */
export function getNextInStormOrder(
  state: GameState,
  faction: Faction
): Faction {
  const index = state.stormOrder.indexOf(faction);
  if (index === -1) throw new Error(`Faction ${faction} not in storm order`);
  return state.stormOrder[(index + 1) % state.stormOrder.length];
}

/**
 * Check if faction is earlier in storm order than another (is aggressor).
 */
export function isEarlierInStormOrder(
  state: GameState,
  faction1: Faction,
  faction2: Faction
): boolean {
  const index1 = state.stormOrder.indexOf(faction1);
  const index2 = state.stormOrder.indexOf(faction2);
  return index1 < index2;
}

// =============================================================================
// PLAYER POSITION QUERIES
// =============================================================================

/**
 * Get the player token position (sector 0-17) for a faction.
 */
export function getPlayerPosition(state: GameState, faction: Faction): number {
  return state.playerPositions.get(faction) ?? 0;
}

/**
 * Get all player positions.
 */
export function getPlayerPositions(state: GameState): Map<Faction, number> {
  return state.playerPositions;
}

/**
 * Find which faction has their player token at a specific sector.
 * Returns null if no faction is at that sector.
 */
export function getFactionAtPosition(
  state: GameState,
  sector: number
): Faction | null {
  for (const [faction, position] of state.playerPositions) {
    if (position === sector) {
      return faction;
    }
  }
  return null;
}

// =============================================================================
// HARKONNEN CAPTURED LEADERS QUERIES
// =============================================================================

/**
 * Get available leaders for Harkonnen to capture after winning a battle.
 * Per rules: "randomly select 1 Active Leader from the loser (including the leader
 * used in the battle, if not killed, but excluding all leaders already used elsewhere that Turn)"
 */
export function getAvailableLeadersForCapture(
  state: GameState,
  loser: Faction,
  battleTerritoryId: TerritoryId
): Leader[] {
  const loserState = getFactionState(state, loser);

  return loserState.leaders.filter((l) => {
    // Must be in leader pool or on board (not in tanks or captured)
    if (
      l.location !== LeaderLocation.LEADER_POOL &&
      l.location !== LeaderLocation.ON_BOARD
    ) {
      return false;
    }

    // If used this turn, must be in the same territory as the battle
    if (l.usedThisTurn && l.usedInTerritoryId !== battleTerritoryId) {
      return false;
    }

    return true;
  });
}

/**
 * Get all captured leaders held by a faction.
 */
export function getCapturedLeaders(
  state: GameState,
  captor: Faction
): Leader[] {
  const captorState = getFactionState(state, captor);
  return captorState.leaders.filter((l) => l.capturedBy !== null);
}

/**
 * Check if Harkonnen needs to trigger Prison Break.
 * Per rules: "When all your own leaders have been killed, you must return all
 * captured leaders immediately to the players who last had them as an Active Leader."
 */
export function shouldTriggerPrisonBreak(
  state: GameState,
  faction: Faction
): boolean {
  const factionState = getFactionState(state, faction);

  // Find all own leaders (not captured ones)
  const ownLeaders = factionState.leaders.filter(
    (l) => l.originalFaction === faction
  );

  // Check if all own leaders are killed (in tanks)
  const allOwnLeadersKilled = ownLeaders.every(
    (l) =>
      l.location === LeaderLocation.TANKS_FACE_UP ||
      l.location === LeaderLocation.TANKS_FACE_DOWN
  );

  // Only trigger if we have captured leaders
  const hasCapturedLeaders = factionState.leaders.some(
    (l) => l.capturedBy !== null
  );

  return allOwnLeadersKilled && hasCapturedLeaders;
}

/**
 * Get the target faction for killing a leader.
 * TYING UP LOOSE ENDS (battle.md line 155): Killed captured leaders go to original faction's tanks.
 *
 * @param state - Current game state
 * @param currentController - Faction that currently controls the leader
 * @param leaderId - ID of the leader to kill
 * @returns The faction whose tanks the leader should go to (original faction if captured, current controller otherwise)
 */
export function getTargetFactionForLeaderKill(
  state: GameState,
  currentController: Faction,
  leaderId: string
): Faction {
  const controllerState = getFactionState(state, currentController);
  const leader = controllerState.leaders.find(
    (l) => l.definitionId === leaderId
  );

  // If leader is captured, return to original faction's tanks
  // Otherwise, go to current controller's tanks (normal behavior)
  if (leader && leader.capturedBy !== null) {
    return leader.originalFaction;
  }
  return currentController;
}

// =============================================================================
// LEADER PROTECTION QUERIES
// =============================================================================

/**
 * Check if a leader is protected from game effects.
 * Surviving leaders in territories are immune to storm, sandworms, etc.
 *
 * Per battle.md line 23: "SURVIVING LEADERS: Leaders who survive remain in the
 * Territory where they were used. (Game effects do not kill these leaders while there.)"
 */
export function isLeaderProtectedOnBoard(
  state: GameState,
  faction: Faction,
  leaderId: string
): boolean {
  const factionState = getFactionState(state, faction);
  const leader = factionState.leaders.find((l) => l.definitionId === leaderId);

  // Leaders with location ON_BOARD are protected from game effects
  return leader?.location === LeaderLocation.ON_BOARD;
}

/**
 * Get all leaders currently protected on board for a faction.
 * Returns the definitionIds of leaders that are immune to game effects.
 */
export function getProtectedLeaders(
  state: GameState,
  faction: Faction
): string[] {
  const factionState = getFactionState(state, faction);
  return factionState.leaders
    .filter((l) => l.location === LeaderLocation.ON_BOARD)
    .map((l) => l.definitionId);
}
