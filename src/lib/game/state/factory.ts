/**
 * Game state factory.
 * Creates new game state with proper initialization of all components.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Faction,
  Phase,
  AllianceStatus,
  LeaderLocation,
  CardLocation,
  SpiceCardLocation,
  TerritoryId,
  type GameState,
  type GameConfig,
  type FactionState,
  type Leader,
  type TreacheryCard,
  type SpiceCard,
  type TraitorCard,
  type FactionForces,
  type ForceCount,
  type ForceStack,
} from '../types';
import {
  FACTION_CONFIGS,
  getFactionConfig,
  getLeadersForFaction,
  ALL_TREACHERY_CARDS,
  ALL_SPICE_CARDS,
  ALL_LEADERS,
  GAME_CONSTANTS,
} from '../data';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Fisher-Yates shuffle for arrays
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  // Simple fallback if uuid not available
  return typeof uuidv4 === 'function'
    ? uuidv4()
    : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================================================
// DECK CREATION
// =============================================================================

function createTreacheryDeck(): TreacheryCard[] {
  return shuffle(
    ALL_TREACHERY_CARDS.map((def) => ({
      definitionId: def.id,
      type: def.type,
      location: CardLocation.DECK,
      ownerId: null,
    }))
  );
}

function createSpiceDeck(): SpiceCard[] {
  return shuffle(
    ALL_SPICE_CARDS.map((def) => ({
      definitionId: def.id,
      type: def.type,
      location: SpiceCardLocation.DECK,
    }))
  );
}

function createTraitorDeck(factions: Faction[]): TraitorCard[] {
  // Only include leaders from factions in the game
  const relevantLeaders = ALL_LEADERS.filter((leader) =>
    factions.includes(leader.faction)
  );

  return shuffle(
    relevantLeaders.map((leader) => ({
      leaderId: leader.id,
      leaderName: leader.name,
      leaderFaction: leader.faction,
      heldBy: null,
    }))
  );
}

// =============================================================================
// FACTION INITIALIZATION
// =============================================================================

function createLeaders(faction: Faction): Leader[] {
  const definitions = getLeadersForFaction(faction);
  return definitions.map((def) => ({
    definitionId: def.id,
    faction: def.faction,
    strength: def.strength,
    location: LeaderLocation.LEADER_POOL,
    hasBeenKilled: false,
    usedThisTurn: false,
    usedInTerritoryId: null,
  }));
}

function createForces(faction: Faction): FactionForces {
  const config = getFactionConfig(faction);
  const forces: FactionForces = {
    factionId: faction,
    reserves: { regular: 0, elite: 0 },
    onBoard: [],
    tanks: { regular: 0, elite: 0 },
  };

  // Place starting forces
  for (const startPos of config.startingForces) {
    if (startPos.territoryId === 'reserves' || startPos.territoryId === 'reserves_local') {
      if (startPos.isElite) {
        forces.reserves.elite += startPos.count;
      } else {
        forces.reserves.regular += startPos.count;
      }
    } else {
      // Forces on board - place in sector 0 of territory by default
      // (actual sector would be determined by territory definition)
      forces.onBoard.push({
        factionId: faction,
        territoryId: startPos.territoryId,
        sector: getDefaultSector(startPos.territoryId),
        forces: {
          regular: startPos.isElite ? 0 : startPos.count,
          elite: startPos.isElite ? startPos.count : 0,
        },
      });
    }
  }

  return forces;
}

function getDefaultSector(territoryId: TerritoryId): number {
  // Return the first sector a territory occupies
  // This is a simplification - in real game, players choose
  const sectorMap: Partial<Record<TerritoryId, number>> = {
    [TerritoryId.ARRAKEEN]: 9,
    [TerritoryId.CARTHAG]: 11,
    [TerritoryId.SIETCH_TABR]: 5,
    [TerritoryId.HABBANYA_SIETCH]: 15,
    [TerritoryId.TUEKS_SIETCH]: 3,
    [TerritoryId.POLAR_SINK]: 0, // Center, doesn't matter
  };
  return sectorMap[territoryId] ?? 0;
}

function createFactionState(
  faction: Faction,
  traitorCards: TraitorCard[]
): FactionState {
  const config = getFactionConfig(faction);

  const state: FactionState = {
    factionId: faction,
    spice: config.startingSpice,
    spiceBribes: 0,
    forces: createForces(faction),
    leaders: createLeaders(faction),
    hand: [], // Will be populated during setup
    traitors: traitorCards,
    allianceStatus: AllianceStatus.UNALLIED,
    allyId: null,
  };

  // Add faction-specific state
  if (faction === Faction.BENE_GESSERIT) {
    state.beneGesseritPrediction = {
      faction: Faction.ATREIDES, // Default, will be set during setup
      turn: 1,
    };
  }

  if (faction === Faction.ATREIDES) {
    state.kwisatzHaderach = {
      isActive: false,
      forcesLostCount: 0,
      isDead: false,
    };
  }

  return state;
}

// =============================================================================
// GAME STATE FACTORY
// =============================================================================

export interface CreateGameOptions {
  factions: Faction[];
  maxTurns?: number;
  advancedRules?: boolean;
  variants?: {
    shieldWallStronghold?: boolean;
    leaderSkillCards?: boolean;
    homeworlds?: boolean;
  };
}

export function createGameState(options: CreateGameOptions): GameState {
  const {
    factions,
    maxTurns = GAME_CONSTANTS.DEFAULT_MAX_TURNS,
    advancedRules = false,
    variants = {},
  } = options;

  // Validate faction count
  if (factions.length < 2 || factions.length > 6) {
    throw new Error('Game requires 2-6 factions');
  }

  // Create decks
  const treacheryDeck = createTreacheryDeck();
  const spiceDeck = createSpiceDeck();
  // Note: Traitor deck is created during setup phase from leaders in game

  // Create faction states (traitors will be dealt during setup phase)
  const factionStates = new Map<Faction, FactionState>();
  for (const faction of factions) {
    factionStates.set(
      faction,
      createFactionState(faction, []) // Empty traitors - dealt during setup
    );
  }

  // Deal starting treachery cards (removed from deck)
  dealStartingTreacheryCards(factionStates, treacheryDeck);

  // Create initial game state
  const gameState: GameState = {
    gameId: generateId(),
    config: {
      maxTurns,
      factions,
      advancedRules,
      variants: {
        shieldWallStronghold: variants.shieldWallStronghold ?? false,
        leaderSkillCards: variants.leaderSkillCards ?? false,
        homeworlds: variants.homeworlds ?? false,
      },
    },
    turn: 1,
    phase: Phase.SETUP, // Start in setup phase for traitor selection
    setupComplete: false,
    factions: factionStates,
    stormOrder: [...factions], // Will be determined by first storm
    stormSector: 0, // Will be set during first storm phase
    shieldWallDestroyed: false,
    spiceOnBoard: [],
    treacheryDeck,
    treacheryDiscard: [],
    spiceDeck,
    spiceDiscardA: [],
    spiceDiscardB: [],
    alliances: [],
    pendingDeals: [],
    dealHistory: [],
    stormPhase: null,
    biddingPhase: null,
    battlePhase: null,
    winner: null,
    winAttempts: new Map(factions.map((f) => [f, 0])),
    wormCount: 0,
    nexusOccurring: false,
    actionLog: [],
  };

  return gameState;
}

// =============================================================================
// SETUP HELPERS
// =============================================================================

function dealTraitorCards(
  factions: Faction[],
  traitorDeck: TraitorCard[]
): Map<Faction, TraitorCard[]> {
  const result = new Map<Faction, TraitorCard[]>();
  let deckIndex = 0;

  for (const faction of factions) {
    const config = getFactionConfig(faction);
    const dealt: TraitorCard[] = [];

    // Deal 4 cards
    for (let i = 0; i < 4 && deckIndex < traitorDeck.length; i++) {
      dealt.push(traitorDeck[deckIndex]);
      deckIndex++;
    }

    // Keep the specified number (Harkonnen keeps all 4, others keep 1)
    const kept = dealt.slice(0, config.traitorCardsKept);
    kept.forEach((card) => (card.heldBy = faction));

    result.set(faction, kept);
  }

  return result;
}

function dealStartingTreacheryCards(
  factionStates: Map<Faction, FactionState>,
  deck: TreacheryCard[]
): void {
  for (const [faction, state] of factionStates) {
    const config = getFactionConfig(faction);

    for (let i = 0; i < config.startingTreacheryCards; i++) {
      const card = deck.shift();
      if (card) {
        card.location = CardLocation.HAND;
        card.ownerId = faction;
        state.hand.push(card);
      }
    }
  }
}

// =============================================================================
// STORM ORDER DETERMINATION
// =============================================================================

/**
 * Determine storm order based on storm position.
 * First player is the one whose marker the storm next approaches counterclockwise.
 */
export function calculateStormOrder(
  factions: Faction[],
  stormSector: number,
  playerPositions: Map<Faction, number>
): Faction[] {
  // Sort factions by their position relative to storm (counterclockwise)
  return [...factions].sort((a, b) => {
    const posA = playerPositions.get(a) ?? 0;
    const posB = playerPositions.get(b) ?? 0;

    // Calculate distance counterclockwise from storm
    const distA = (posA - stormSector + GAME_CONSTANTS.TOTAL_SECTORS) % GAME_CONSTANTS.TOTAL_SECTORS;
    const distB = (posB - stormSector + GAME_CONSTANTS.TOTAL_SECTORS) % GAME_CONSTANTS.TOTAL_SECTORS;

    return distA - distB;
  });
}

/**
 * Default player positions around the board (evenly distributed).
 */
export function getDefaultPlayerPositions(factions: Faction[]): Map<Faction, number> {
  const positions = new Map<Faction, number>();
  const spacing = Math.floor(GAME_CONSTANTS.TOTAL_SECTORS / factions.length);

  factions.forEach((faction, index) => {
    positions.set(faction, index * spacing);
  });

  return positions;
}
