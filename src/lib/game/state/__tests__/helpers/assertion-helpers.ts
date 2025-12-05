/**
 * Assertion Helpers
 * 
 * Domain-specific assertion functions for game state properties.
 * Provides type-safe, clear error messages for test assertions.
 */

import type { GameState, FactionState, Leader } from '../../../types';
import { Faction, TerritoryId, LeaderLocation } from '../../../types';
import { getFactionState } from '../../queries';

/**
 * Assert faction has expected spice amount.
 */
export function expectSpice(
  state: GameState,
  faction: Faction,
  expected: number
): void {
  const factionState = getFactionState(state, faction);
  if (factionState.spice !== expected) {
    throw new Error(
      `Expected ${faction} to have ${expected} spice, but got ${factionState.spice}`
    );
  }
}

/**
 * Assert territory/sector has expected spice amount.
 */
export function expectTerritorySpice(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  expected: number
): void {
  const spice = state.spiceOnBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );

  if (expected === 0) {
    // If expecting 0, spice should not exist
    if (spice && spice.amount > 0) {
      throw new Error(
        `Expected no spice at ${territoryId} sector ${sector}, but found ${spice.amount}`
      );
    }
  } else {
    if (!spice) {
      throw new Error(
        `Expected ${expected} spice at ${territoryId} sector ${sector}, but found none`
      );
    }
    if (spice.amount !== expected) {
      throw new Error(
        `Expected ${expected} spice at ${territoryId} sector ${sector}, but got ${spice.amount}`
      );
    }
  }
}

/**
 * Assert faction has expected force count at location.
 */
export function expectForceCount(
  state: GameState,
  faction: Faction,
  location: 'reserves' | 'onBoard' | 'tanks',
  expected: { regular: number; elite?: number }
): void {
  const factionState = getFactionState(state, faction);
  const forces = factionState.forces;

  let actualRegular: number;
  let actualElite: number;

  switch (location) {
    case 'reserves':
      actualRegular = forces.reserves.regular;
      actualElite = forces.reserves.elite;
      break;
    case 'tanks':
      actualRegular = forces.tanks.regular;
      actualElite = forces.tanks.elite;
      break;
    case 'onBoard':
      // Sum all on-board forces
      actualRegular = forces.onBoard.reduce(
        (sum, stack) => sum + (stack.forces.regular || 0),
        0
      );
      actualElite = forces.onBoard.reduce(
        (sum, stack) => sum + (stack.forces.elite || 0),
        0
      );
      break;
  }

  if (actualRegular !== expected.regular) {
    throw new Error(
      `Expected ${faction} to have ${expected.regular} regular forces in ${location}, ` +
        `but got ${actualRegular}`
    );
  }

  if (expected.elite !== undefined && actualElite !== expected.elite) {
    throw new Error(
      `Expected ${faction} to have ${expected.elite} elite forces in ${location}, ` +
        `but got ${actualElite}`
    );
  }
}

/**
 * Assert forces at specific territory/sector location.
 */
export function expectForcesAtLocation(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  sector: number,
  expected: { regular: number; elite?: number; advisors?: number }
): void {
  const factionState = getFactionState(state, faction);
  const stack = factionState.forces.onBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );

  if (!stack && (expected.regular > 0 || expected.elite > 0 || expected.advisors > 0)) {
    throw new Error(
      `Expected ${faction} to have forces at ${territoryId} sector ${sector}, but found none`
    );
  }

  if (stack) {
    if (stack.forces.regular !== expected.regular) {
      throw new Error(
        `Expected ${expected.regular} regular forces at ${territoryId} sector ${sector}, ` +
          `but got ${stack.forces.regular}`
      );
    }

    if (expected.elite !== undefined && stack.forces.elite !== expected.elite) {
      throw new Error(
        `Expected ${expected.elite} elite forces at ${territoryId} sector ${sector}, ` +
          `but got ${stack.forces.elite}`
      );
    }

    if (expected.advisors !== undefined) {
      const actualAdvisors = stack.advisors ?? 0;
      if (actualAdvisors !== expected.advisors) {
        throw new Error(
          `Expected ${expected.advisors} advisors at ${territoryId} sector ${sector}, ` +
            `but got ${actualAdvisors}`
        );
      }
    }
  }
}

/**
 * Assert leader is at expected location.
 */
export function expectLeaderLocation(
  state: GameState,
  faction: Faction,
  leaderId: string,
  expectedLocation: LeaderLocation
): void {
  const factionState = getFactionState(state, faction);
  const leader = factionState.leaders.find((l) => l.definitionId === leaderId);

  if (!leader) {
    throw new Error(`Leader ${leaderId} not found for ${faction}`);
  }

  if (leader.location !== expectedLocation) {
    throw new Error(
      `Expected leader ${leaderId} to be at ${expectedLocation}, but got ${leader.location}`
    );
  }
}

/**
 * Assert leader has expected state properties.
 */
export function expectLeaderState(
  state: GameState,
  faction: Faction,
  leaderId: string,
  expected: Partial<Leader>
): void {
  const factionState = getFactionState(state, faction);
  const leader = factionState.leaders.find((l) => l.definitionId === leaderId);

  if (!leader) {
    throw new Error(`Leader ${leaderId} not found for ${faction}`);
  }

  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = (leader as Record<string, unknown>)[key];
    if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
      throw new Error(
        `Leader ${leaderId} property ${key} mismatch: ` +
          `expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`
      );
    }
  }
}

/**
 * Assert faction has expected hand size.
 */
export function expectHandSize(
  state: GameState,
  faction: Faction,
  expected: number
): void {
  const factionState = getFactionState(state, faction);
  if (factionState.hand.length !== expected) {
    throw new Error(
      `Expected ${faction} to have ${expected} cards in hand, but got ${factionState.hand.length}`
    );
  }
}

/**
 * Assert card is in faction's hand.
 */
export function expectCardInHand(
  state: GameState,
  faction: Faction,
  cardId: string
): void {
  const factionState = getFactionState(state, faction);
  const hasCard = factionState.hand.some((c) => c.definitionId === cardId);

  if (!hasCard) {
    throw new Error(`Expected card ${cardId} to be in ${faction}'s hand, but it's not`);
  }
}

/**
 * Assert card is NOT in faction's hand.
 */
export function expectCardNotInHand(
  state: GameState,
  faction: Faction,
  cardId: string
): void {
  const factionState = getFactionState(state, faction);
  const hasCard = factionState.hand.some((c) => c.definitionId === cardId);

  if (hasCard) {
    throw new Error(`Expected card ${cardId} NOT to be in ${faction}'s hand, but it is`);
  }
}

/**
 * Assert alliance status between two factions.
 */
export function expectAlliance(
  state: GameState,
  faction1: Faction,
  faction2: Faction,
  expected: boolean
): void {
  const faction1State = getFactionState(state, faction1);
  const faction2State = getFactionState(state, faction2);

  const areAllied =
    faction1State.allyId === faction2 &&
    faction2State.allyId === faction1 &&
    faction1State.allianceStatus === 'allied' &&
    faction2State.allianceStatus === 'allied';

  if (areAllied !== expected) {
    throw new Error(
      `Expected ${faction1} and ${faction2} to ${expected ? 'be' : 'not be'} allied, ` +
        `but they are ${areAllied ? 'allied' : 'not allied'}`
    );
  }
}

/**
 * Assert deck has expected number of cards.
 */
export function expectDeckSize(
  state: GameState,
  deck: 'treachery' | 'spice',
  expected: number
): void {
  const actualSize =
    deck === 'treachery' ? state.treacheryDeck.length : state.spiceDeck.length;

  if (actualSize !== expected) {
    throw new Error(
      `Expected ${deck} deck to have ${expected} cards, but got ${actualSize}`
    );
  }
}

/**
 * Assert discard pile has expected number of cards.
 */
export function expectDiscardSize(
  state: GameState,
  pile: 'treachery' | 'spice',
  expected: number
): void {
  const actualSize =
    pile === 'treachery'
      ? state.treacheryDiscard.length
      : state.spiceDiscardA.length + state.spiceDiscardB.length;

  if (actualSize !== expected) {
    throw new Error(
      `Expected ${pile} discard to have ${expected} cards, but got ${actualSize}`
    );
  }
}

/**
 * Assert storm is at expected sector.
 */
export function expectStormSector(state: GameState, expected: number): void {
  if (state.stormSector !== expected) {
    throw new Error(
      `Expected storm to be at sector ${expected}, but got ${state.stormSector}`
    );
  }
}

/**
 * Assert game is at expected phase.
 */
export function expectPhase(state: GameState, expected: import('../../../types').Phase): void {
  if (state.phase !== expected) {
    throw new Error(`Expected phase to be ${expected}, but got ${state.phase}`);
  }
}

/**
 * Assert game is at expected turn.
 */
export function expectTurn(state: GameState, expected: number): void {
  if (state.turn !== expected) {
    throw new Error(`Expected turn to be ${expected}, but got ${state.turn}`);
  }
}

// =============================================================================
// FORCE-RELATED ASSERTIONS (Extended)
// =============================================================================

/**
 * Assert faction has expected forces in reserves.
 */
export function expectForcesInReserves(
  state: GameState,
  faction: Faction,
  expected: { regular: number; elite?: number }
): void {
  expectForceCount(state, faction, 'reserves', expected);
}

/**
 * Assert faction has expected forces in tanks.
 */
export function expectForcesInTanks(
  state: GameState,
  faction: Faction,
  expected: { regular: number; elite?: number }
): void {
  expectForceCount(state, faction, 'tanks', expected);
}

/**
 * Assert faction has expected forces on board (total across all territories).
 */
export function expectForcesOnBoard(
  state: GameState,
  faction: Faction,
  expected: { regular: number; elite?: number }
): void {
  expectForceCount(state, faction, 'onBoard', expected);
}

/**
 * Assert advisors at specific location (Bene Gesserit).
 */
export function expectAdvisorsAtLocation(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  sector: number,
  expected: number
): void {
  const factionState = getFactionState(state, faction);
  const stack = factionState.forces.onBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );

  const actualAdvisors = stack?.advisors ?? 0;
  if (actualAdvisors !== expected) {
    throw new Error(
      `Expected ${expected} advisors at ${territoryId} sector ${sector}, but got ${actualAdvisors}`
    );
  }
}

/**
 * Assert no forces at location.
 */
export function expectNoForcesAtLocation(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  sector: number
): void {
  const factionState = getFactionState(state, faction);
  const stack = factionState.forces.onBoard.find(
    (s) => s.territoryId === territoryId && s.sector === sector
  );

  if (stack) {
    const total = (stack.forces.regular || 0) + (stack.forces.elite || 0) + (stack.advisors || 0);
    if (total > 0) {
      throw new Error(
        `Expected no forces at ${territoryId} sector ${sector}, but found ${total} forces`
      );
    }
  }
}

// =============================================================================
// LEADER-RELATED ASSERTIONS (Extended)
// =============================================================================

/**
 * Assert leader is in pool.
 */
export function expectLeaderInPool(
  state: GameState,
  faction: Faction,
  leaderId: string
): void {
  expectLeaderLocation(state, faction, leaderId, LeaderLocation.LEADER_POOL);
}

/**
 * Assert leader is in tanks (face-up or face-down).
 */
export function expectLeaderInTanks(
  state: GameState,
  faction: Faction,
  leaderId: string,
  faceUp: boolean
): void {
  const expectedLocation = faceUp
    ? LeaderLocation.TANKS_FACE_UP
    : LeaderLocation.TANKS_FACE_DOWN;
  expectLeaderLocation(state, faction, leaderId, expectedLocation);
}

/**
 * Assert leader is on board (used in battle).
 */
export function expectLeaderOnBoard(
  state: GameState,
  faction: Faction,
  leaderId: string,
  territoryId: TerritoryId
): void {
  const factionState = getFactionState(state, faction);
  const leader = factionState.leaders.find((l) => l.definitionId === leaderId);

  if (!leader) {
    throw new Error(`Leader ${leaderId} not found for ${faction}`);
  }

  if (leader.location !== LeaderLocation.ON_BOARD) {
    throw new Error(
      `Expected leader ${leaderId} to be ON_BOARD, but got ${leader.location}`
    );
  }

  if (leader.usedInTerritoryId !== territoryId) {
    throw new Error(
      `Expected leader ${leaderId} to be used in ${territoryId}, but got ${leader.usedInTerritoryId}`
    );
  }
}

/**
 * Assert leader has been killed.
 */
export function expectLeaderKilled(
  state: GameState,
  faction: Faction,
  leaderId: string,
  hasBeenKilled: boolean
): void {
  const factionState = getFactionState(state, faction);
  const leader = factionState.leaders.find((l) => l.definitionId === leaderId);

  if (!leader) {
    throw new Error(`Leader ${leaderId} not found for ${faction}`);
  }

  if (leader.hasBeenKilled !== hasBeenKilled) {
    throw new Error(
      `Expected leader ${leaderId} hasBeenKilled to be ${hasBeenKilled}, but got ${leader.hasBeenKilled}`
    );
  }
}

/**
 * Assert leader is used this turn.
 */
export function expectLeaderUsed(
  state: GameState,
  faction: Faction,
  leaderId: string,
  used: boolean
): void {
  const factionState = getFactionState(state, faction);
  const leader = factionState.leaders.find((l) => l.definitionId === leaderId);

  if (!leader) {
    throw new Error(`Leader ${leaderId} not found for ${faction}`);
  }

  if (leader.usedThisTurn !== used) {
    throw new Error(
      `Expected leader ${leaderId} usedThisTurn to be ${used}, but got ${leader.usedThisTurn}`
    );
  }
}

// =============================================================================
// CARD-RELATED ASSERTIONS (Extended)
// =============================================================================

/**
 * Assert card is in deck.
 */
export function expectCardInDeck(state: GameState, cardId: string): void {
  const inDeck = state.treacheryDeck.some((c) => c.definitionId === cardId);
  if (!inDeck) {
    throw new Error(`Expected card ${cardId} to be in deck, but it's not`);
  }
}

/**
 * Assert card is in discard pile.
 */
export function expectCardInDiscard(state: GameState, cardId: string): void {
  const inDiscard = state.treacheryDiscard.some((c) => c.definitionId === cardId);
  if (!inDiscard) {
    throw new Error(`Expected card ${cardId} to be in discard, but it's not`);
  }
}

/**
 * Assert card is at expected location.
 */
export function expectCardLocation(
  state: GameState,
  cardId: string,
  expectedLocation: import('../../../types').CardLocation
): void {
  // Check hand
  for (const [faction, factionState] of state.factions) {
    const card = factionState.hand.find((c) => c.definitionId === cardId);
    if (card) {
      if (card.location !== expectedLocation) {
        throw new Error(
          `Expected card ${cardId} to be at ${expectedLocation}, but got ${card.location}`
        );
      }
      return;
    }
  }

  // Check deck
  const deckCard = state.treacheryDeck.find((c) => c.definitionId === cardId);
  if (deckCard) {
    if (deckCard.location !== expectedLocation) {
      throw new Error(
        `Expected card ${cardId} to be at ${expectedLocation}, but got ${deckCard.location}`
      );
    }
    return;
  }

  // Check discard
  const discardCard = state.treacheryDiscard.find((c) => c.definitionId === cardId);
  if (discardCard) {
    if (discardCard.location !== expectedLocation) {
      throw new Error(
        `Expected card ${cardId} to be at ${expectedLocation}, but got ${discardCard.location}`
      );
    }
    return;
  }

  throw new Error(`Card ${cardId} not found in any location`);
}

// =============================================================================
// ALLIANCE-RELATED ASSERTIONS (Extended)
// =============================================================================

/**
 * Assert alliance is formed between two factions.
 */
export function expectAllianceFormed(
  state: GameState,
  faction1: Faction,
  faction2: Faction
): void {
  expectAlliance(state, faction1, faction2, true);

  // Also check alliance is in history
  const alliance = state.alliances.find(
    (a) => a.factions.includes(faction1) && a.factions.includes(faction2)
  );
  if (!alliance) {
    throw new Error(`Expected alliance between ${faction1} and ${faction2} to be in history`);
  }
}

/**
 * Assert alliance is broken.
 */
export function expectAllianceBroken(
  state: GameState,
  faction1: Faction,
  faction2: Faction
): void {
  expectAlliance(state, faction1, faction2, false);
}

/**
 * Assert alliance is in history with expected turn.
 */
export function expectAllianceInHistory(
  state: GameState,
  faction1: Faction,
  faction2: Faction,
  turn: number
): void {
  const alliance = state.alliances.find(
    (a) => a.factions.includes(faction1) && a.factions.includes(faction2)
  );
  if (!alliance) {
    throw new Error(`Expected alliance between ${faction1} and ${faction2} to be in history`);
  }
  if (alliance.formedOnTurn !== turn) {
    throw new Error(
      `Expected alliance to be formed on turn ${turn}, but got ${alliance.formedOnTurn}`
    );
  }
}

// =============================================================================
// KARAMA-RELATED ASSERTIONS
// =============================================================================

/**
 * Assert Karama interrupt exists with expected properties.
 */
export function expectKaramaInterrupt(
  state: GameState,
  interruptType: 'cancel' | 'prevent',
  targetFaction: Faction
): void {
  if (!state.karamaState) {
    throw new Error('Expected Karama interrupt to exist, but it does not');
  }
  if (state.karamaState.interruptType !== interruptType) {
    throw new Error(
      `Expected interrupt type ${interruptType}, but got ${state.karamaState.interruptType}`
    );
  }
  if (state.karamaState.targetFaction !== targetFaction) {
    throw new Error(
      `Expected target faction ${targetFaction}, but got ${state.karamaState.targetFaction}`
    );
  }
}

/**
 * Assert no Karama interrupt exists.
 */
export function expectNoKaramaInterrupt(state: GameState): void {
  if (state.karamaState !== null) {
    throw new Error('Expected no Karama interrupt, but one exists');
  }
}

// =============================================================================
// DEAL-RELATED ASSERTIONS
// =============================================================================

/**
 * Assert deal is pending.
 */
export function expectDealPending(state: GameState, dealId: string): void {
  const deal = state.pendingDeals.find((d) => d.id === dealId);
  if (!deal) {
    throw new Error(`Expected deal ${dealId} to be pending, but it's not`);
  }
}

/**
 * Assert deal is in history.
 */
export function expectDealInHistory(state: GameState, dealId: string): void {
  const deal = state.dealHistory.find((d) => d.id === dealId);
  if (!deal) {
    throw new Error(`Expected deal ${dealId} to be in history, but it's not`);
  }
}

/**
 * Assert deal does not exist (not pending, not in history).
 */
export function expectNoDeal(state: GameState, dealId: string): void {
  const pending = state.pendingDeals.find((d) => d.id === dealId);
  const history = state.dealHistory.find((d) => d.id === dealId);
  if (pending || history) {
    throw new Error(`Expected deal ${dealId} to not exist, but it does`);
  }
}

// =============================================================================
// VICTORY-RELATED ASSERTIONS
// =============================================================================

/**
 * Assert faction has expected number of win attempts.
 */
export function expectWinAttempts(
  state: GameState,
  faction: Faction,
  expected: number
): void {
  const actual = state.winAttempts.get(faction) || 0;
  if (actual !== expected) {
    throw new Error(
      `Expected ${faction} to have ${expected} win attempts, but got ${actual}`
    );
  }
}

// =============================================================================
// KWISATZ HADERACH ASSERTIONS
// =============================================================================

/**
 * Assert Kwisatz Haderach is active.
 */
export function expectKHActive(state: GameState, active: boolean): void {
  const atreides = getFactionState(state, Faction.ATREIDES);
  if (!atreides.kwisatzHaderach) {
    throw new Error('Kwisatz Haderach does not exist for Atreides');
  }
  if (atreides.kwisatzHaderach.isActive !== active) {
    throw new Error(
      `Expected KH to be ${active ? 'active' : 'inactive'}, but got ${atreides.kwisatzHaderach.isActive}`
    );
  }
}

/**
 * Assert Kwisatz Haderach has expected forces lost count.
 */
export function expectKHForcesLost(state: GameState, expected: number): void {
  const atreides = getFactionState(state, Faction.ATREIDES);
  if (!atreides.kwisatzHaderach) {
    throw new Error('Kwisatz Haderach does not exist for Atreides');
  }
  if (atreides.kwisatzHaderach.forcesLostCount !== expected) {
    throw new Error(
      `Expected KH forces lost count ${expected}, but got ${atreides.kwisatzHaderach.forcesLostCount}`
    );
  }
}

/**
 * Assert Kwisatz Haderach is used in territory.
 */
export function expectKHUsedInTerritory(
  state: GameState,
  territoryId: TerritoryId | null
): void {
  const atreides = getFactionState(state, Faction.ATREIDES);
  if (!atreides.kwisatzHaderach) {
    throw new Error('Kwisatz Haderach does not exist for Atreides');
  }
  if (atreides.kwisatzHaderach.usedInTerritoryThisTurn !== territoryId) {
    throw new Error(
      `Expected KH to be used in ${territoryId}, but got ${atreides.kwisatzHaderach.usedInTerritoryThisTurn}`
    );
  }
}

/**
 * Assert Kwisatz Haderach is dead.
 */
export function expectKHDead(state: GameState, isDead: boolean): void {
  const atreides = getFactionState(state, Faction.ATREIDES);
  if (!atreides.kwisatzHaderach) {
    throw new Error('Kwisatz Haderach does not exist for Atreides');
  }
  if (atreides.kwisatzHaderach.isDead !== isDead) {
    throw new Error(
      `Expected KH to be ${isDead ? 'dead' : 'alive'}, but got ${atreides.kwisatzHaderach.isDead}`
    );
  }
}

// =============================================================================
// ELITE REVIVAL TRACKING ASSERTIONS
// =============================================================================

/**
 * Assert elite forces revived this turn (Fremen/Emperor).
 */
export function expectEliteRevivedThisTurn(
  state: GameState,
  faction: Faction,
  expected: number
): void {
  const factionState = getFactionState(state, faction);
  const actual = factionState.eliteForcesRevivedThisTurn ?? 0;
  if (actual !== expected) {
    throw new Error(
      `Expected ${faction} to have ${expected} elite forces revived this turn, but got ${actual}`
    );
  }
}

