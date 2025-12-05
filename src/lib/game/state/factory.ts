/**
 * Game state factory.
 * Creates new game state with proper initialization of all components.
 */

import { randomBytes } from "crypto";
import { v4 as uuidv4 } from "uuid";
import {
  ALL_LEADERS,
  ALL_SPICE_CARDS,
  ALL_TREACHERY_CARDS,
  GAME_CONSTANTS,
  getFactionConfig,
  getLeadersForFaction,
} from "../data";
import {
  AllianceStatus,
  CardLocation,
  Faction,
  LeaderLocation,
  Phase,
  SpiceCardLocation,
  TERRITORY_DEFINITIONS,
  TerritoryId,
  type FactionForces,
  type FactionState,
  type ForceStack,
  type GameState,
  type Leader,
  type SpiceCard,
  type TraitorCard,
  type TreacheryCard,
} from "../types";

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get a cryptographically secure random number between 0 and max (exclusive)
 * Falls back to Math.random() if crypto is not available
 */
function secureRandom(max: number): number {
  try {
    // Use crypto.randomBytes for better entropy
    const bytes = randomBytes(4);
    const randomValue = bytes.readUInt32BE(0);
    return randomValue % max;
  } catch {
    // Fallback to Math.random() if crypto is not available
    return Math.floor(Math.random() * max);
  }
}

/**
 * Fisher-Yates shuffle for arrays with improved randomness
 * Uses crypto.randomBytes for better entropy when available
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    // Use secure random for better entropy
    const j = secureRandom(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  // Simple fallback if uuid not available
  return typeof uuidv4 === "function"
    ? uuidv4()
    : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================================================
// DECK CREATION
// =============================================================================

/**
 * Creates and shuffles the Treachery deck for game initialization.
 * The deck is shuffled using Fisher-Yates algorithm and placed in the game state.
 * Discard piles are reshuffled back into the deck when needed (handled in drawTreacheryCard).
 */
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

/**
 * Create the Storm Deck.
 * Simple deck with values 1-6, one of each.
 */
function createStormDeck(): number[] {
  // Simple deck with values 1-6, one of each
  const deck = [1, 2, 3, 4, 5, 6];
  return shuffle(deck);
}

/**
 * Creates and shuffles the Spice deck for game initialization.
 * The deck is shuffled using Fisher-Yates algorithm and placed in the game state.
 */
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
    originalFaction: def.faction, // Leaders start with their original faction
    capturedBy: null, // Not captured initially
  }));
}

/**
 * @rule 2.01.02
 * @rule 2.02.02
 * @rule 2.03.02
 * @rule 2.04.02
 * @rule 2.05.02
 * @rule 2.06.02
 * Creates and places starting forces on the board as indicated by the faction's
 * ability 2.XX.02 (stored in config.startingForces). Forces in reserves are
 * stored in the reserves structure.
 */
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
    if (
      startPos.territoryId === "reserves" ||
      startPos.territoryId === "reserves_local"
    ) {
      if (startPos.isElite) {
        forces.reserves.elite += startPos.count;
      } else {
        forces.reserves.regular += startPos.count;
      }
    } else {
      // Forces on board - place in sector 0 of territory by default
      // (actual sector would be determined by territory definition)
      const stack: ForceStack = {
        factionId: faction,
        territoryId: startPos.territoryId,
        sector: getDefaultSector(startPos.territoryId),
        forces: {
          regular: startPos.isElite ? 0 : startPos.count,
          elite: startPos.isElite ? startPos.count : 0,
        },
      };

      // BG-specific: Initialize all forces as advisors (spiritual side) by default
      if (faction === Faction.BENE_GESSERIT) {
        const totalCount = startPos.count;
        stack.advisors = totalCount; // All BG forces start as advisors
      }

      forces.onBoard.push(stack);
    }
  }

  return forces;
}

function getDefaultSector(territoryId: TerritoryId): number {
  // Return the first sector a territory occupies from the territory definition
  // This ensures we use the correct sector that matches force slot mappings
  const territory = TERRITORY_DEFINITIONS[territoryId];
  if (territory && territory.sectors.length > 0) {
    return territory.sectors[0];
  }
  // Fallback for territories without sectors (like Polar Sink)
  // Polar Sink is in the center and doesn't have sectors, but we use 0 as a placeholder
  const sectorMap: Partial<Record<TerritoryId, number>> = {
    [TerritoryId.POLAR_SINK]: 0, // Center, doesn't matter
  };
  return sectorMap[territoryId] ?? 0;
}

/**
 * @rule 0.12
 * @rule 2.01.01
 * @rule 2.02.01
 * @rule 2.03.01
 * @rule 2.04.01
 * @rule 2.05.01
 * @rule 2.06.01
 * Creates faction state with starting spice equal to the amount indicated
 * by the faction's ability 2.XX.01 (stored in config.startingSpice).
 * For Fremen: 3 spice (rule 2.04.01).
 */
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
      usedInTerritoryThisTurn: null,
    };
  }

  return state;
}

// =============================================================================
// GAME STATE FACTORY
// =============================================================================

export interface CreateGameOptions {
  factions: readonly Faction[];
  maxTurns?: number;
  /** @deprecated Always true - advanced rules are always enabled. This option is ignored. */
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
    variants = {},
  } = options;
  
  // Always use advanced rules - ignore any option that tries to disable them
  const advancedRules = true;

  // Validate faction count
  if (factions.length < 2 || factions.length > 6) {
    throw new Error("Game requires 2-6 factions");
  }

  // Create decks
  const treacheryDeck = createTreacheryDeck();
  const spiceDeck = createSpiceDeck();
  // Create two identical spice decks for the two-pile system
  const spiceDeckA = createSpiceDeck();
  const spiceDeckB = createSpiceDeck();
  const stormDeck = createStormDeck();
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
      factions: [...factions],
      advancedRules,
      variants: {
        shieldWallStronghold: variants.shieldWallStronghold ?? false,
        leaderSkillCards: variants.leaderSkillCards ?? false,
        homeworlds: variants.homeworlds ?? false,
      },
    },
    // @rule 0.15 - Place the turn marker at 1 on the Turn Track
    turn: 1,
    phase: Phase.SETUP, // Start in setup phase for traitor selection
    setupComplete: false,
    factions: factionStates,
    stormOrder: [...factions], // Will be determined by first storm
    activeFactions: [],
    playerPositions: calculatePlayerPositions([...factions]), // Initialize player token positions
    stormSector: 0, // Will be set during first storm phase
    shieldWallDestroyed: false,
    spiceOnBoard: [],
    treacheryDeck,
    treacheryDiscard: [],
    spiceDeck, // DEPRECATED: for backward compatibility
    spiceDeckA,
    spiceDeckB,
    spiceDiscardA: [],
    spiceDiscardB: [],
    stormDeck,
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
    karamaState: null,
    bgSpiritualAdvisorTrigger: null,
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

/**
 * @rule 2.05.04 - MYSTERY CARD: Harkonnen draws an extra card after starting treachery card
 * Deals starting treachery cards to each player during game setup.
 * Each player draws 1 card from the Treachery Deck (or more for certain factions/variants).
 * Harkonnen draws 2 cards total (1 from rule 0.14 + 1 from rule 2.05.04).
 * Cards are removed from the deck and placed in the player's hand.
 */
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
 *
 * IMPORTANT: Player positions are FIXED for the entire game - they never change.
 * Only the storm moves around the board. As the storm moves, the storm order changes
 * because the "first player" is always the faction whose token is next counterclockwise
 * from the storm's current position.
 *
 * This means:
 * - When storm is BEFORE a faction (counterclockwise): That faction is FIRST
 * - When storm is ON a faction: That faction is LAST (next player is first)
 * - When storm is AFTER a faction (has passed it): That faction is LAST
 * - As storm continues around, factions gradually move up in order
 * - When storm wraps back around, factions become FIRST again
 *
 * Example with faction at sector 1:
 * - Storm at 0: Faction at 1 is FIRST (distance 1)
 * - Storm at 1: Faction at 1 is LAST (distance 18, storm is on them)
 * - Storm at 2: Faction at 1 is LAST (distance 17, storm has passed)
 * - Storm at 16: Faction at 1 is FIRST again (distance 3, storm wrapping back)
 *
 * @rule 1.01.01
 * Calculate storm order - determines first player based on which player marker
 * the storm next approaches counterclockwise.
 */
export function calculateStormOrder(state: GameState): Faction[] {
  const factions = Array.from(state.factions.keys());
  const stormSector = state.stormSector;
  const playerPositions = state.playerPositions;

  // Sort factions by their position relative to storm (counterclockwise)
  // The first player is the one whose token is in the sector immediately
  // after the storm (counterclockwise), then continue around the map.
  return [...factions].sort((a, b) => {
    const posA = playerPositions.get(a) ?? 0;
    const posB = playerPositions.get(b) ?? 0;

    // Calculate distance counterclockwise from storm
    // This gives us how many sectors away (counterclockwise) each faction is
    let distA =
      (posA - stormSector + GAME_CONSTANTS.TOTAL_SECTORS) %
      GAME_CONSTANTS.TOTAL_SECTORS;
    let distB =
      (posB - stormSector + GAME_CONSTANTS.TOTAL_SECTORS) %
      GAME_CONSTANTS.TOTAL_SECTORS;

    // If storm is ON a player token (distance = 0), treat it as if they're "behind" the storm
    // This makes the NEXT player (counterclockwise) first
    if (distA === 0) {
      distA = GAME_CONSTANTS.TOTAL_SECTORS; // Put them at the end
    }
    if (distB === 0) {
      distB = GAME_CONSTANTS.TOTAL_SECTORS; // Put them at the end
    }

    // Sort by distance - smaller distance means closer counterclockwise, so first
    return distA - distB;
  });
}

/**
 * @rule 0.10
 * Calculate player positions around the board edge.
 * Players Place their Player Marker on the player circle closest to their Player Shield and their seat at the table.
 *
 * Rules:
 * - 2 players: Across from each other (9 sectors apart)
 * - 6 players: Every 3rd sector (0, 3, 6, 9, 12, 15)
 * - Other counts: Evenly distributed (18 / numFactions)
 */
export function calculatePlayerPositions(
  factions: Faction[]
): Map<Faction, number> {
  const positions = new Map<Faction, number>();
  const numFactions = factions.length;
  const totalSectors = GAME_CONSTANTS.TOTAL_SECTORS;

  if (numFactions === 2) {
    // Two players: across from each other (9 sectors apart)
    // First faction starts at sector 1, not 0
    positions.set(factions[0], 1);
    positions.set(factions[1], 10);
  } else if (numFactions === 6) {
    // Six players: every 3rd sector, starting at sector 1
    factions.forEach((faction, index) => {
      positions.set(faction, (1 + index * 3) % totalSectors);
    });
  } else {
    // Other counts: evenly distributed, starting at sector 1
    const spacing = totalSectors / numFactions;
    factions.forEach((faction, index) => {
      const position = (1 + Math.floor(index * spacing)) % totalSectors;
      positions.set(faction, position);
    });
  }

  return positions;
}

/**
 * Default player positions around the board (evenly distributed).
 * @deprecated Use calculatePlayerPositions() instead
 */
export function getDefaultPlayerPositions(
  factions: Faction[]
): Map<Faction, number> {
  return calculatePlayerPositions(factions);
}
