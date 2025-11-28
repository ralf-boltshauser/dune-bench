/**
 * State mutation functions.
 * All state changes go through these functions for consistency.
 * Each function returns a new state (immutable updates).
 */

import {
  Faction,
  Phase,
  TerritoryId,
  LeaderLocation,
  CardLocation,
  AllianceStatus,
  type GameState,
  type FactionState,
  type Leader,
  type TreacheryCard,
  type ForceStack,
  type ForceCount,
  type SpiceLocation,
  type Deal,
  type Alliance,
  type GameAction,
  type GameActionType,
} from '../types';
import { getFactionState, getForceCountInTerritory } from './queries';
import { GAME_CONSTANTS } from '../data';
import {
  addToForceCount,
  subtractFromForceCount,
  addToStack,
  removeFromStack,
  moveStackForces,
  convertAdvisorsToFighters,
  convertFightersToAdvisors,
} from './force-utils';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Deep clone a Map
 */
function cloneMap<K, V>(map: Map<K, V>): Map<K, V> {
  return new Map(map);
}

/**
 * Update a faction's state immutably
 */
function updateFactionState(
  state: GameState,
  faction: Faction,
  updates: Partial<FactionState>
): GameState {
  const newFactions = cloneMap(state.factions);
  const currentState = getFactionState(state, faction);
  newFactions.set(faction, { ...currentState, ...updates });
  return { ...state, factions: newFactions };
}

/**
 * Generate a unique action ID
 */
function generateActionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log an action to the game state
 */
export function logAction(
  state: GameState,
  type: GameActionType,
  factionId: Faction | null,
  data: Record<string, unknown> = {}
): GameState {
  const action: GameAction = {
    id: generateActionId(),
    turn: state.turn,
    phase: state.phase,
    factionId,
    type,
    data,
    timestamp: Date.now(),
  };
  return {
    ...state,
    actionLog: [...state.actionLog, action],
  };
}

// =============================================================================
// PHASE MUTATIONS
// =============================================================================

/**
 * Advance to the next phase.
 */
export function advancePhase(state: GameState, nextPhase: Phase): GameState {
  return {
    ...state,
    phase: nextPhase,
    // Clear phase-specific state
    stormPhase: null,
    biddingPhase: null,
    battlePhase: null,
  };
}

/**
 * Advance to the next turn.
 */
export function advanceTurn(state: GameState): GameState {
  return {
    ...state,
    turn: state.turn + 1,
    phase: Phase.STORM,
    nexusOccurring: false,
  };
}

// =============================================================================
// SPICE MUTATIONS
// =============================================================================

/**
 * Add spice to a faction.
 */
export function addSpice(state: GameState, faction: Faction, amount: number): GameState {
  const factionState = getFactionState(state, faction);
  return updateFactionState(state, faction, {
    spice: factionState.spice + amount,
  });
}

/**
 * Remove spice from a faction.
 */
export function removeSpice(state: GameState, faction: Faction, amount: number): GameState {
  const factionState = getFactionState(state, faction);
  const newAmount = Math.max(0, factionState.spice - amount);
  return updateFactionState(state, faction, { spice: newAmount });
}

/**
 * Transfer spice between factions.
 */
export function transferSpice(
  state: GameState,
  from: Faction,
  to: Faction,
  amount: number
): GameState {
  let newState = removeSpice(state, from, amount);
  newState = addSpice(newState, to, amount);
  return newState;
}

/**
 * Add spice to a territory on the board.
 */
export function addSpiceToTerritory(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  amount: number
): GameState {
  const existing = state.spiceOnBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );

  if (existing) {
    return {
      ...state,
      spiceOnBoard: state.spiceOnBoard.map((s) =>
        s.territoryId === territoryId && s.sector === sector
          ? { ...s, amount: s.amount + amount }
          : s
      ),
    };
  }

  return {
    ...state,
    spiceOnBoard: [...state.spiceOnBoard, { territoryId, sector, amount }],
  };
}

/**
 * Remove spice from a territory.
 */
export function removeSpiceFromTerritory(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  amount: number
): GameState {
  return {
    ...state,
    spiceOnBoard: state.spiceOnBoard
      .map((s) => {
        if (s.territoryId === territoryId && s.sector === sector) {
          const newAmount = s.amount - amount;
          return newAmount > 0 ? { ...s, amount: newAmount } : null;
        }
        return s;
      })
      .filter((s): s is SpiceLocation => s !== null),
  };
}

/**
 * Destroy all spice in a territory (sandworm or storm).
 */
export function destroySpiceInTerritory(
  state: GameState,
  territoryId: TerritoryId,
  sector?: number
): GameState {
  return {
    ...state,
    spiceOnBoard: state.spiceOnBoard.filter(
      (s) =>
        s.territoryId !== territoryId || (sector !== undefined && s.sector !== sector)
    ),
  };
}

// =============================================================================
// FORCE MUTATIONS
// =============================================================================

/**
 * Move forces from reserves to a territory.
 */
export function shipForces(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  sector: number,
  count: number,
  isElite: boolean = false
): GameState {
  const factionState = getFactionState(state, faction);
  const forces = factionState.forces;

  // Remove from reserves, add to board
  const reserves = subtractFromForceCount(forces.reserves, count, isElite);
  const onBoard = addToStack(forces.onBoard, faction, territoryId, sector, count, isElite);

  return updateFactionState(state, faction, {
    forces: { ...forces, reserves, onBoard },
  });
}

/**
 * Move forces between territories.
 */
export function moveForces(
  state: GameState,
  faction: Faction,
  fromTerritory: TerritoryId,
  fromSector: number,
  toTerritory: TerritoryId,
  toSector: number,
  count: number,
  isElite: boolean = false
): GameState {
  const factionState = getFactionState(state, faction);
  const forces = factionState.forces;

  const onBoard = moveStackForces(
    forces.onBoard,
    faction,
    { territoryId: fromTerritory, sector: fromSector },
    { territoryId: toTerritory, sector: toSector },
    count,
    isElite
  );

  return updateFactionState(state, faction, {
    forces: { ...forces, onBoard },
  });
}

/**
 * Send forces to the Tleilaxu Tanks (death).
 *
 * This function has two call signatures:
 * 1. Legacy: sendForcesToTanks(state, faction, territoryId, sector, count, isElite)
 * 2. New: sendForcesToTanks(state, faction, territoryId, sector, regularCount, eliteCount)
 *
 * When called with 5 parameters or with boolean 6th param, uses legacy mode (single type).
 * When called with 6 numeric parameters, uses new mode (separate regular/elite counts).
 *
 * The new mode properly handles elite forces that are worth 2x in taking losses.
 */
export function sendForcesToTanks(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  sector: number,
  countOrRegular: number,
  isEliteOrEliteCount?: boolean | number
): GameState {
  const factionState = getFactionState(state, faction);
  const forces = factionState.forces;

  let onBoard = forces.onBoard;
  let tanks = forces.tanks;

  // Determine which calling convention is being used
  if (typeof isEliteOrEliteCount === 'boolean' || isEliteOrEliteCount === undefined) {
    // Legacy mode: single force type
    const count = countOrRegular;
    const isElite = isEliteOrEliteCount ?? false;

    onBoard = removeFromStack(onBoard, territoryId, sector, count, isElite);
    tanks = addToForceCount(tanks, count, isElite);
  } else {
    // New mode: separate regular and elite counts
    const regularCount = countOrRegular;
    const eliteCount = isEliteOrEliteCount;

    // Remove regular forces
    if (regularCount > 0) {
      onBoard = removeFromStack(onBoard, territoryId, sector, regularCount, false);
      tanks = addToForceCount(tanks, regularCount, false);
    }

    // Remove elite forces
    if (eliteCount > 0) {
      onBoard = removeFromStack(onBoard, territoryId, sector, eliteCount, true);
      tanks = addToForceCount(tanks, eliteCount, true);
    }
  }

  return updateFactionState(state, faction, {
    forces: { ...forces, onBoard, tanks },
  });
}

/**
 * Revive forces from tanks to reserves.
 */
export function reviveForces(
  state: GameState,
  faction: Faction,
  count: number,
  isElite: boolean = false
): GameState {
  const factionState = getFactionState(state, faction);
  const forces = factionState.forces;

  // Remove from tanks, add to reserves
  const tanks = subtractFromForceCount(forces.tanks, count, isElite);
  const reserves = addToForceCount(forces.reserves, count, isElite);

  // Track elite forces revived this turn (for Fedaykin/Sardaukar limit)
  const updatedState: Partial<FactionState> = {
    forces: { ...forces, tanks, reserves },
  };

  if (isElite && (faction === Faction.FREMEN || faction === Faction.EMPEROR)) {
    const currentEliteRevived = factionState.eliteForcesRevivedThisTurn ?? 0;
    updatedState.eliteForcesRevivedThisTurn = currentEliteRevived + count;
  }

  return updateFactionState(state, faction, updatedState);
}

/**
 * Send forces from board back to reserves (Guild off-planet shipment).
 */
export function sendForcesToReserves(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  sector: number,
  count: number,
  isElite: boolean = false
): GameState {
  const factionState = getFactionState(state, faction);
  const forces = factionState.forces;

  // Remove from board, add to reserves
  const onBoard = removeFromStack(forces.onBoard, territoryId, sector, count, isElite);
  const reserves = addToForceCount(forces.reserves, count, isElite);

  return updateFactionState(state, faction, {
    forces: { ...forces, onBoard, reserves },
  });
}

// =============================================================================
// BENE GESSERIT FORCE MUTATIONS
// =============================================================================

/**
 * Convert BG advisors to fighters (flip tokens to battle side).
 * Only applicable to Bene Gesserit faction.
 */
export function convertBGAdvisorsToFighters(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  count: number
): GameState {
  const factionState = getFactionState(state, Faction.BENE_GESSERIT);
  const forces = factionState.forces;

  const onBoard = convertAdvisorsToFighters(forces.onBoard, territoryId, sector, count);

  return updateFactionState(state, Faction.BENE_GESSERIT, {
    forces: { ...forces, onBoard },
  });
}

/**
 * Convert BG fighters to advisors (flip tokens to spiritual side).
 * Only applicable to Bene Gesserit faction.
 */
export function convertBGFightersToAdvisors(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  count: number
): GameState {
  const factionState = getFactionState(state, Faction.BENE_GESSERIT);
  const forces = factionState.forces;

  const onBoard = convertFightersToAdvisors(forces.onBoard, territoryId, sector, count);

  return updateFactionState(state, Faction.BENE_GESSERIT, {
    forces: { ...forces, onBoard },
  });
}

// =============================================================================
// LEADER MUTATIONS
// =============================================================================

/**
 * Kill a leader (send to tanks).
 *
 * IMPORTANT: Per battle.md line 23, leaders with LeaderLocation.ON_BOARD are protected
 * from game effects (storm, sandworms, etc.) but NOT from battle deaths or
 * Lasgun/Shield explosions (KH PROPHECY BLINDED ability).
 *
 * @param allowProtected - Set to true to bypass protection (e.g., for Lasgun/Shield explosions)
 */
export function killLeader(
  state: GameState,
  faction: Faction,
  leaderId: string,
  allowProtected: boolean = false
): GameState {
  const factionState = getFactionState(state, faction);
  const leaders = factionState.leaders.map((l) => {
    if (l.definitionId === leaderId) {
      // Check if leader is protected from game effects
      // Per battle.md line 23: "SURVIVING LEADERS: Leaders who survive remain in the
      // Territory where they were used. (Game effects do not kill these leaders while there.)"
      if (!allowProtected && l.location === LeaderLocation.ON_BOARD) {
        // Leader is protected - don't kill them
        console.warn(
          `[killLeader] Leader ${leaderId} of ${faction} is protected (ON_BOARD) - skipping kill`
        );
        return l;
      }

      return {
        ...l,
        location: l.hasBeenKilled
          ? LeaderLocation.TANKS_FACE_DOWN
          : LeaderLocation.TANKS_FACE_UP,
        hasBeenKilled: true,
        usedThisTurn: false,
        usedInTerritoryId: null,
      };
    }
    return l;
  });

  return updateFactionState(state, faction, { leaders });
}

/**
 * Revive a leader from tanks.
 */
export function reviveLeader(
  state: GameState,
  faction: Faction,
  leaderId: string
): GameState {
  const factionState = getFactionState(state, faction);
  const leaders = factionState.leaders.map((l) => {
    if (l.definitionId === leaderId) {
      return {
        ...l,
        location: LeaderLocation.LEADER_POOL,
      };
    }
    return l;
  });

  return updateFactionState(state, faction, { leaders });
}

/**
 * Mark a leader as used in battle this turn.
 */
export function markLeaderUsed(
  state: GameState,
  faction: Faction,
  leaderId: string,
  territoryId: TerritoryId
): GameState {
  const factionState = getFactionState(state, faction);
  const leaders = factionState.leaders.map((l) => {
    if (l.definitionId === leaderId) {
      return {
        ...l,
        location: LeaderLocation.ON_BOARD,
        usedThisTurn: true,
        usedInTerritoryId: territoryId,
      };
    }
    return l;
  });

  return updateFactionState(state, faction, { leaders });
}

/**
 * Reset all leaders' turn state (called at end of battle phase).
 */
export function resetLeaderTurnState(state: GameState, faction: Faction): GameState {
  const factionState = getFactionState(state, faction);
  const leaders = factionState.leaders.map((l) => ({
    ...l,
    usedThisTurn: false,
    usedInTerritoryId: null,
    location:
      l.location === LeaderLocation.ON_BOARD ? LeaderLocation.LEADER_POOL : l.location,
  }));

  return updateFactionState(state, faction, { leaders });
}

/**
 * Return a leader to the pool immediately (used when traitor is revealed).
 * Per rules: when a traitor is revealed, the winner's leader returns to pool immediately.
 */
export function returnLeaderToPool(
  state: GameState,
  faction: Faction,
  leaderId: string
): GameState {
  const factionState = getFactionState(state, faction);
  const leaders = factionState.leaders.map((l) => {
    if (l.definitionId === leaderId) {
      return {
        ...l,
        location: LeaderLocation.LEADER_POOL,
        usedThisTurn: false,
        usedInTerritoryId: null,
      };
    }
    return l;
  });

  return updateFactionState(state, faction, { leaders });
}

// =============================================================================
// HARKONNEN CAPTURED LEADERS
// =============================================================================

/**
 * Capture an enemy leader (Harkonnen ability).
 * After winning battle, Harkonnen can capture one active leader from the loser.
 * The captured leader is transferred to Harkonnen's leader pool.
 */
export function captureLeader(
  state: GameState,
  captor: Faction,
  victim: Faction,
  leaderId: string
): GameState {
  // Remove leader from victim's pool
  const victimState = getFactionState(state, victim);
  const victimLeaders = victimState.leaders.filter((l) => l.definitionId !== leaderId);
  let newState = updateFactionState(state, victim, { leaders: victimLeaders });

  // Find the leader being captured
  const capturedLeader = victimState.leaders.find((l) => l.definitionId === leaderId);
  if (!capturedLeader) {
    throw new Error(`Leader ${leaderId} not found in ${victim}'s leaders`);
  }

  // Add to captor's pool with capture metadata
  const captorState = getFactionState(newState, captor);
  const captorLeaders = [
    ...captorState.leaders,
    {
      ...capturedLeader,
      faction: captor, // Now controlled by captor
      location: LeaderLocation.LEADER_POOL,
      capturedBy: captor,
      usedThisTurn: false,
      usedInTerritoryId: null,
    },
  ];
  newState = updateFactionState(newState, captor, { leaders: captorLeaders });

  return newState;
}

/**
 * Kill a captured leader for 2 spice (Harkonnen ability).
 * The leader goes face-down into tanks and Harkonnen gains 2 spice.
 */
export function killCapturedLeader(
  state: GameState,
  captor: Faction,
  leaderId: string
): GameState {
  const captorState = getFactionState(state, captor);
  const leader = captorState.leaders.find((l) => l.definitionId === leaderId);

  if (!leader) {
    throw new Error(`Leader ${leaderId} not found in ${captor}'s leaders`);
  }

  if (!leader.capturedBy) {
    throw new Error(`Leader ${leaderId} is not captured`);
  }

  const originalFaction = leader.originalFaction;

  // Remove from captor's pool
  const captorLeaders = captorState.leaders.filter((l) => l.definitionId !== leaderId);
  let newState = updateFactionState(state, captor, { leaders: captorLeaders });

  // Add to original faction's tanks (face down per rules: "Place the Leader Disc face down")
  const originalState = getFactionState(newState, originalFaction);
  const originalLeaders = [
    ...originalState.leaders,
    {
      ...leader,
      faction: originalFaction, // Return to original faction
      location: LeaderLocation.TANKS_FACE_DOWN,
      capturedBy: null,
      hasBeenKilled: true,
      usedThisTurn: false,
      usedInTerritoryId: null,
    },
  ];
  newState = updateFactionState(newState, originalFaction, { leaders: originalLeaders });

  // Grant 2 spice to captor
  newState = addSpice(newState, captor, 2);

  return newState;
}

/**
 * Return a captured leader to their original owner after being used in battle.
 * Per rules: "After it is used in a battle, if it wasn't killed during that battle,
 * the leader is returned to the Active Leader Pool of the player who last had it."
 */
export function returnCapturedLeader(state: GameState, leaderId: string): GameState {
  // Find which faction currently has this leader
  let currentHolder: Faction | null = null;
  let leader: Leader | null = null;

  for (const [faction, factionState] of state.factions) {
    const foundLeader = factionState.leaders.find((l) => l.definitionId === leaderId);
    if (foundLeader) {
      currentHolder = faction;
      leader = foundLeader;
      break;
    }
  }

  if (!currentHolder || !leader) {
    throw new Error(`Leader ${leaderId} not found in any faction's leaders`);
  }

  if (!leader.capturedBy) {
    // Not a captured leader, no action needed
    return state;
  }

  const originalFaction = leader.originalFaction;

  // Remove from current holder's pool
  const currentHolderState = getFactionState(state, currentHolder);
  const currentHolderLeaders = currentHolderState.leaders.filter(
    (l) => l.definitionId !== leaderId
  );
  let newState = updateFactionState(state, currentHolder, {
    leaders: currentHolderLeaders,
  });

  // Return to original faction's pool
  const originalState = getFactionState(newState, originalFaction);
  const originalLeaders = [
    ...originalState.leaders,
    {
      ...leader,
      faction: originalFaction, // Back to original faction
      location: LeaderLocation.LEADER_POOL,
      capturedBy: null, // No longer captured
      usedThisTurn: false,
      usedInTerritoryId: null,
    },
  ];
  newState = updateFactionState(newState, originalFaction, { leaders: originalLeaders });

  return newState;
}

/**
 * Prison Break: Return all captured leaders when all of Harkonnen's own leaders are killed.
 * Per rules: "When all your own leaders have been killed, you must return all captured
 * leaders immediately to the players who last had them as an Active Leader."
 */
export function returnAllCapturedLeaders(state: GameState, captor: Faction): GameState {
  const captorState = getFactionState(state, captor);
  let newState = state;

  // Find all captured leaders
  const capturedLeaders = captorState.leaders.filter((l) => l.capturedBy !== null);

  for (const leader of capturedLeaders) {
    newState = returnCapturedLeader(newState, leader.definitionId);
  }

  return newState;
}

// =============================================================================
// CARD MUTATIONS
// =============================================================================

/**
 * Remove a traitor card after it has been revealed.
 * Traitor cards are one-time use.
 */
export function removeTraitorCard(
  state: GameState,
  faction: Faction,
  leaderId: string
): GameState {
  const factionState = getFactionState(state, faction);
  const traitors = factionState.traitors.filter((t) => t.leaderId !== leaderId);
  return updateFactionState(state, faction, { traitors });
}

/**
 * Draw a treachery card from the deck.
 */
export function drawTreacheryCard(state: GameState, faction: Faction): GameState {
  if (state.treacheryDeck.length === 0) {
    // Reshuffle discard into deck
    const newDeck = [...state.treacheryDiscard].map((c) => ({
      ...c,
      location: CardLocation.DECK,
      ownerId: null,
    }));
    // Shuffle
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    state = { ...state, treacheryDeck: newDeck, treacheryDiscard: [] };
  }

  const [card, ...remainingDeck] = state.treacheryDeck;
  if (!card) return state;

  const factionState = getFactionState(state, faction);
  const updatedCard = { ...card, location: CardLocation.HAND, ownerId: faction };

  let newState = updateFactionState(state, faction, {
    hand: [...factionState.hand, updatedCard],
  });

  return { ...newState, treacheryDeck: remainingDeck };
}

/**
 * Discard a treachery card from hand.
 */
export function discardTreacheryCard(
  state: GameState,
  faction: Faction,
  cardId: string
): GameState {
  const factionState = getFactionState(state, faction);
  const card = factionState.hand.find((c) => c.definitionId === cardId);
  if (!card) return state;

  const discardedCard = { ...card, location: CardLocation.DISCARD, ownerId: null };
  const newHand = factionState.hand.filter((c) => c.definitionId !== cardId);

  let newState = updateFactionState(state, faction, { hand: newHand });
  return { ...newState, treacheryDiscard: [...newState.treacheryDiscard, discardedCard] };
}

// =============================================================================
// ALLIANCE MUTATIONS
// =============================================================================

/**
 * Form an alliance between two factions.
 */
export function formAlliance(
  state: GameState,
  faction1: Faction,
  faction2: Faction
): GameState {
  // Update both factions
  let newState = updateFactionState(state, faction1, {
    allianceStatus: AllianceStatus.ALLIED,
    allyId: faction2,
  });
  newState = updateFactionState(newState, faction2, {
    allianceStatus: AllianceStatus.ALLIED,
    allyId: faction1,
  });

  // Record alliance
  const alliance: Alliance = {
    factions: [faction1, faction2],
    formedOnTurn: state.turn,
  };

  return {
    ...newState,
    alliances: [...newState.alliances, alliance],
  };
}

/**
 * Break an alliance.
 */
export function breakAlliance(state: GameState, faction: Faction): GameState {
  const factionState = getFactionState(state, faction);
  const allyId = factionState.allyId;
  if (!allyId) return state;

  // Update both factions
  let newState = updateFactionState(state, faction, {
    allianceStatus: AllianceStatus.UNALLIED,
    allyId: null,
  });
  newState = updateFactionState(newState, allyId, {
    allianceStatus: AllianceStatus.UNALLIED,
    allyId: null,
  });

  // Remove alliance from list
  return {
    ...newState,
    alliances: newState.alliances.filter(
      (a) => !a.factions.includes(faction) || !a.factions.includes(allyId)
    ),
  };
}

// =============================================================================
// STORM MUTATIONS
// =============================================================================

/**
 * Move the storm to a new sector.
 */
export function moveStorm(state: GameState, newSector: number): GameState {
  return {
    ...state,
    stormSector: newSector % GAME_CONSTANTS.TOTAL_SECTORS,
  };
}

/**
 * Update storm order based on current storm position.
 */
export function updateStormOrder(state: GameState, newOrder: Faction[]): GameState {
  return {
    ...state,
    stormOrder: newOrder,
  };
}

// =============================================================================
// DEAL MUTATIONS
// =============================================================================

/**
 * Add a pending deal.
 */
export function addDeal(state: GameState, deal: Deal): GameState {
  return {
    ...state,
    pendingDeals: [...state.pendingDeals, deal],
  };
}

/**
 * Remove a pending deal (accepted/rejected).
 */
export function removeDeal(state: GameState, dealId: string): GameState {
  const deal = state.pendingDeals.find((d) => d.id === dealId);
  if (!deal) return state;

  return {
    ...state,
    pendingDeals: state.pendingDeals.filter((d) => d.id !== dealId),
    dealHistory: [...state.dealHistory, deal],
  };
}

// =============================================================================
// KWISATZ HADERACH MUTATIONS (Atreides)
// =============================================================================

/**
 * Update Kwisatz Haderach state after Atreides loses forces in battle.
 * Activates KH if total losses reach 7+.
 */
export function updateKwisatzHaderach(
  state: GameState,
  forcesLost: number
): GameState {
  const atreides = getFactionState(state, Faction.ATREIDES);
  if (!atreides.kwisatzHaderach) return state;

  const newCount = atreides.kwisatzHaderach.forcesLostCount + forcesLost;
  const shouldActivate = newCount >= 7 && !atreides.kwisatzHaderach.isActive;

  return updateFactionState(state, Faction.ATREIDES, {
    kwisatzHaderach: {
      ...atreides.kwisatzHaderach,
      forcesLostCount: newCount,
      isActive: shouldActivate ? true : atreides.kwisatzHaderach.isActive,
    },
  });
}

/**
 * Mark Kwisatz Haderach as used in a territory this turn.
 */
export function markKwisatzHaderachUsed(
  state: GameState,
  territoryId: TerritoryId
): GameState {
  const atreides = getFactionState(state, Faction.ATREIDES);
  if (!atreides.kwisatzHaderach) return state;

  return updateFactionState(state, Faction.ATREIDES, {
    kwisatzHaderach: {
      ...atreides.kwisatzHaderach,
      usedInTerritoryThisTurn: territoryId,
    },
  });
}

/**
 * Kill Kwisatz Haderach (PROPHECY BLINDED - only killed by lasgun/shield explosion).
 */
export function killKwisatzHaderach(state: GameState): GameState {
  const atreides = getFactionState(state, Faction.ATREIDES);
  if (!atreides.kwisatzHaderach || atreides.kwisatzHaderach.isDead) return state;

  return updateFactionState(state, Faction.ATREIDES, {
    kwisatzHaderach: {
      ...atreides.kwisatzHaderach,
      isDead: true,
    },
  });
}

/**
 * Revive Kwisatz Haderach (REAWAKEN).
 * Cost: 2 spice (KH strength is +2).
 */
export function reviveKwisatzHaderach(state: GameState): GameState {
  const atreides = getFactionState(state, Faction.ATREIDES);
  if (!atreides.kwisatzHaderach || !atreides.kwisatzHaderach.isDead) return state;

  return updateFactionState(state, Faction.ATREIDES, {
    kwisatzHaderach: {
      ...atreides.kwisatzHaderach,
      isDead: false,
    },
  });
}

/**
 * Reset Kwisatz Haderach turn state (called at end of battle phase).
 */
export function resetKwisatzHaderachTurnState(state: GameState): GameState {
  const atreides = getFactionState(state, Faction.ATREIDES);
  if (!atreides.kwisatzHaderach) return state;

  return updateFactionState(state, Faction.ATREIDES, {
    kwisatzHaderach: {
      ...atreides.kwisatzHaderach,
      usedInTerritoryThisTurn: null,
    },
  });
}

// =============================================================================
// VICTORY MUTATIONS
// =============================================================================

/**
 * Record a win attempt for tiebreaker tracking.
 */
export function recordWinAttempt(state: GameState, faction: Faction): GameState {
  const newAttempts = new Map(state.winAttempts);
  newAttempts.set(faction, (newAttempts.get(faction) || 0) + 1);
  return { ...state, winAttempts: newAttempts };
}

// =============================================================================
// KARAMA INTERRUPT MUTATIONS
// =============================================================================

/**
 * Create a Karama interrupt opportunity.
 * Called when a faction uses an ability that can be cancelled/prevented.
 */
export function createKaramaInterrupt(
  state: GameState,
  interruptType: 'cancel' | 'prevent',
  targetFaction: Faction,
  abilityName: string,
  abilityContext: Record<string, unknown> = {}
): GameState {
  // Eligible factions are all except the target
  const eligibleFactions = Array.from(state.factions.keys()).filter((f) => f !== targetFaction);

  return {
    ...state,
    karamaState: {
      interruptType,
      targetFaction,
      abilityName,
      abilityContext,
      eligibleFactions,
      responses: new Map(),
      interrupted: false,
      interruptor: null,
      turn: state.turn,
      phase: state.phase,
    },
  };
}

/**
 * Clear the Karama interrupt state.
 * Called after all factions have responded or an interrupt occurred.
 */
export function clearKaramaInterrupt(state: GameState): GameState {
  return {
    ...state,
    karamaState: null,
  };
}

/**
 * Check if a Karama interrupt is pending.
 */
export function hasActiveKaramaInterrupt(state: GameState): boolean {
  return state.karamaState !== null;
}

/**
 * Check if all eligible factions have responded to Karama interrupt.
 */
export function allKaramaResponsesReceived(state: GameState): boolean {
  if (!state.karamaState) return false;
  return (
    state.karamaState.responses.size === state.karamaState.eligibleFactions.length ||
    state.karamaState.interrupted
  );
}

/**
 * Get the Karama interrupt result.
 * Returns the faction that interrupted, or null if no interrupt.
 */
export function getKaramaInterruptor(state: GameState): Faction | null {
  return state.karamaState?.interruptor ?? null;
}
