/**
 * Test State Builder for Bidding Phase
 * 
 * Helper utilities for creating test game states with specific configurations.
 * Enhanced with fluent API and presets.
 */

import { buildTestState, addCardToHand, getDefaultSpice } from '../../battle/helpers/test-state-builder';
import {
  Faction,
  Phase,
  type GameState,
  type TreacheryCard,
} from '../../../types';
import { getFactionState, getFactionMaxHandSize, removeSpice, addSpice } from '../../../state';
import { SCENARIO_PRESETS, SPICE_PRESETS, HAND_SIZE_PRESETS, TREACHERY_CARDS } from './fixtures';

export interface BiddingTestStateConfig {
  factions: readonly Faction[];
  phase?: Phase;
  turn?: number;
  advancedRules?: boolean;
  spice?: Map<Faction, number>;
  handCards?: Map<Faction, string[]>; // Card IDs to add to hand
}

/**
 * Fluent builder for test game states
 */
export class BiddingTestStateBuilder {
  private config: BiddingTestStateConfig & { factions: Faction[] } = {
    factions: [],
    phase: Phase.BIDDING,
    turn: 1,
    advancedRules: true,
    spice: new Map(),
  };

  /**
   * Set factions
   */
  withFactions(factions: readonly Faction[]): this {
    this.config.factions = [...factions];
    return this;
  }

  /**
   * Set turn number
   */
  withTurn(turn: number): this {
    this.config.turn = turn;
    return this;
  }

  /**
   * Set phase
   */
  withPhase(phase: Phase): this {
    this.config.phase = phase;
    return this;
  }

  /**
   * Set advanced rules
   */
  withAdvancedRules(advancedRules: boolean): this {
    this.config.advancedRules = advancedRules;
    return this;
  }

  /**
   * Set spice for a faction
   */
  withSpice(faction: Faction, amount: number): this {
    if (!this.config.spice) {
      this.config.spice = new Map();
    }
    this.config.spice.set(faction, amount);
    return this;
  }

  /**
   * Set spice for multiple factions
   */
  withSpiceMap(spice: Map<Faction, number>): this {
    this.config.spice = spice;
    return this;
  }

  /**
   * Set hand size for a faction (adds cards to reach target size)
   * Uses real card IDs from the deck
   */
  withHandSize(faction: Faction, size: number): this {
    if (!this.config.handCards) {
      this.config.handCards = new Map();
    }
    const currentCards = this.config.handCards.get(faction) || [];
    const maxHand = getFactionMaxHandSize(faction);
    if (size > maxHand) {
      throw new Error(
        `Cannot set hand size ${size} for ${faction} (max is ${maxHand})`
      );
    }
    // Use real card IDs - common cards that should exist
    // Note: shield cards are numbered (shield_1, shield_2, shield_3, shield_4)
    // snooper cards are numbered (snooper_1, snooper_2, snooper_3, snooper_4)
    const commonCards = [
      'lasgun',
      'maula_pistol',
      'crysknife',
      'slip_tip',
      'stunner',
      'shield_1',
      'shield_2',
      'shield_3',
      'shield_4',
      'snooper_1',
      'snooper_2',
      'snooper_3',
      'snooper_4',
      'baliset',
      'jubba_cloak',
      'kulon',
      'la_la_la',
      'trip_to_gamont',
      'poison_tooth',
      'cheap_hero_1',
      'cheap_hero_2',
      'cheap_hero_3',
    ];
    const cardsToAdd = size - currentCards.length;
    const newCards: string[] = [];
    for (let i = 0; i < cardsToAdd; i++) {
      // Use different cards to avoid duplicates
      const cardIndex = (currentCards.length + i) % commonCards.length;
      newCards.push(commonCards[cardIndex]);
    }
    // Update the hand cards map with all cards
    this.config.handCards.set(faction, [...currentCards, ...newCards]);
    return this;
  }

  /**
   * Set faction to full hand (max cards)
   */
  withFullHand(faction: Faction): this {
    const maxHand = getFactionMaxHandSize(faction);
    return this.withHandSize(faction, maxHand);
  }

  /**
   * Add specific card to faction's hand
   */
  withCardInHand(faction: Faction, cardId: string): this {
    if (!this.config.handCards) {
      this.config.handCards = new Map();
    }
    const currentCards = this.config.handCards.get(faction) || [];
    if (!currentCards.includes(cardId)) {
      this.config.handCards.set(faction, [...currentCards, cardId]);
    }
    return this;
  }

  /**
   * Add Karama card to faction's hand
   */
  withKaramaInHand(faction: Faction, karamaCardId?: string): this {
    return this.withCardInHand(faction, karamaCardId || TREACHERY_CARDS.KARAMA);
  }

  /**
   * Set Karama flags on faction state
   */
  withKaramaFlags(faction: Faction, bidding?: boolean, freeCard?: boolean): this {
    (this.config as any).karamaFlags = (this.config as any).karamaFlags || new Map();
    (this.config as any).karamaFlags.set(faction, { bidding, freeCard });
    return this;
  }

  /**
   * Set treachery deck cards
   */
  withTreacheryDeck(cardIds: string[]): this {
    // This would need to be handled in buildTestState or after build
    // For now, we'll note this in the config
    (this.config as any).treacheryDeck = cardIds;
    return this;
  }

  /**
   * Set empty treachery deck
   */
  withEmptyTreacheryDeck(): this {
    (this.config as any).treacheryDeck = [];
    return this;
  }

  /**
   * Set single card in deck
   */
  withSingleCardInDeck(cardId: string): this {
    (this.config as any).treacheryDeck = [cardId];
    return this;
  }

  /**
   * Ensure Emperor is in game
   */
  withEmperorInGame(): this {
    if (!this.config.factions.includes(Faction.EMPEROR)) {
      this.config.factions.push(Faction.EMPEROR);
    }
    return this;
  }

  /**
   * Ensure Emperor is NOT in game
   */
  withoutEmperor(): this {
    this.config.factions = this.config.factions.filter(f => f !== Faction.EMPEROR);
    return this;
  }

  /**
   * Ensure Atreides is in game
   */
  withAtreidesInGame(): this {
    if (!this.config.factions.includes(Faction.ATREIDES)) {
      this.config.factions.push(Faction.ATREIDES);
    }
    return this;
  }

  /**
   * Ensure Atreides is NOT in game
   */
  withoutAtreides(): this {
    this.config.factions = this.config.factions.filter(f => f !== Faction.ATREIDES);
    return this;
  }

  /**
   * Set all factions to full hands
   */
  withFullHandsForAll(): this {
    for (const faction of this.config.factions) {
      this.withFullHand(faction);
    }
    return this;
  }

  /**
   * Set mixed hand sizes
   */
  withMixedHandSizes(config: Map<Faction, number>): this {
    for (const [faction, size] of config.entries()) {
      this.withHandSize(faction, size);
    }
    return this;
  }

  /**
   * Build the game state
   */
  build(): GameState {
    // Build base state with default spice first
    let state = buildTestState({
      factions: this.config.factions,
      phase: this.config.phase ?? Phase.BIDDING,
      turn: this.config.turn ?? 1,
      advancedRules: this.config.advancedRules ?? true,
      // Don't pass spice here - we'll set it explicitly below
    });
    
    // Now set spice to exact amounts if specified
    // buildTestState uses addSpice which adds to existing, so we need to
    // remove existing spice first, then add the desired amount
    if (this.config.spice && this.config.spice.size > 0) {
      for (const [faction, desiredAmount] of this.config.spice.entries()) {
        if (state.factions.has(faction)) {
          const factionState = getFactionState(state, faction);
          const currentSpice = factionState.spice;
          // Remove all current spice, then add desired amount
          if (currentSpice > 0) {
            state = removeSpice(state, faction, currentSpice);
          }
          if (desiredAmount > 0) {
            state = addSpice(state, faction, desiredAmount);
          }
        }
      }
    }

    // Clear all hands first (buildTestState might add cards)
    for (const faction of this.config.factions) {
      const factionState = getFactionState(state, faction);
      factionState.hand = [];
    }

    // Add cards to hands if specified
    if (this.config.handCards) {
      for (const [faction, cardIds] of this.config.handCards.entries()) {
        for (const cardId of cardIds) {
          state = addCardToHand(state, faction, cardId);
        }
      }
    }

    // Set Karama flags if specified
    const karamaFlags = (this.config as any).karamaFlags as Map<Faction, { bidding?: boolean; freeCard?: boolean }> | undefined;
    if (karamaFlags) {
      const newFactions = new Map(state.factions);
      for (const [faction, flags] of karamaFlags.entries()) {
        const factionState = getFactionState(state, faction);
        const updatedState = { ...factionState } as any;
        if (flags.bidding !== undefined) {
          updatedState.karamaBiddingActive = flags.bidding;
        }
        if (flags.freeCard !== undefined) {
          updatedState.karamaFreeCardActive = flags.freeCard;
        }
        newFactions.set(faction, updatedState);
      }
      state = { ...state, factions: newFactions };
    }

    // Set treachery deck if specified
    const treacheryDeck = (this.config as any).treacheryDeck as string[] | undefined;
    if (treacheryDeck !== undefined) {
      // Create card objects from IDs
      const deckCards = treacheryDeck.map(cardId => ({
        definitionId: cardId,
        location: 'deck' as const,
        ownerId: null,
      }));
      state = { ...state, treacheryDeck: deckCards as any };
    }

    return state;
  }
}

/**
 * Build a test game state for bidding phase tests (legacy function, uses builder)
 */
export function buildBiddingTestState(config: BiddingTestStateConfig): GameState {
  const builder = new BiddingTestStateBuilder();
  if (config.factions) builder.withFactions(config.factions);
  if (config.turn) builder.withTurn(config.turn);
  if (config.phase) builder.withPhase(config.phase);
  if (config.advancedRules !== undefined) builder.withAdvancedRules(config.advancedRules);
  if (config.spice) builder.withSpiceMap(config.spice);
  if (config.handCards) {
    for (const [faction, cardIds] of config.handCards.entries()) {
      for (const cardId of cardIds) {
        builder.withCardInHand(faction, cardId);
      }
    }
  }
  return builder.build();
}

// =============================================================================
// PRESET BUILDERS
// =============================================================================

/**
 * Create basic bidding state with 3 factions
 */
export function createBasicBiddingState(): GameState {
  return new BiddingTestStateBuilder()
    .withFactions(SCENARIO_PRESETS.BASIC_3_FACTIONS)
    .build();
}

/**
 * Create bidding state with Harkonnen
 */
export function createHarkonnenBiddingState(handSize: number = 0): GameState {
  return new BiddingTestStateBuilder()
    .withFactions(SCENARIO_PRESETS.WITH_HARKONNEN)
    .withHandSize(Faction.HARKONNEN, handSize)
    .build();
}

/**
 * Create bidding state with all factions at max hand size
 */
export function createFullHandState(): GameState {
  const builder = new BiddingTestStateBuilder()
    .withFactions(SCENARIO_PRESETS.ALL_6_FACTIONS);
  
  for (const faction of SCENARIO_PRESETS.ALL_6_FACTIONS) {
    builder.withFullHand(faction);
  }
  
  return builder.build();
}

/**
 * Create bidding state with Karama card
 */
export function createKaramaTestState(faction: Faction = Faction.ATREIDES): GameState {
  return new BiddingTestStateBuilder()
    .withFactions(SCENARIO_PRESETS.BASIC_3_FACTIONS)
    .withKaramaInHand(faction)
    .build();
}

/**
 * Create bidding state with Emperor for payment testing
 */
export function createEmperorTestState(): GameState {
  return new BiddingTestStateBuilder()
    .withFactions(SCENARIO_PRESETS.WITH_EMPEROR)
    .withSpice(Faction.ATREIDES, 15)
    .withSpice(Faction.EMPEROR, 10)
    .build();
}

/**
 * Create bidding state with Atreides for prescience testing
 */
export function createAtreidesTestState(): GameState {
  return new BiddingTestStateBuilder()
    .withFactions(SCENARIO_PRESETS.WITH_ATREIDES)
    .build();
}

/**
 * Create eligibility test state with various hand sizes
 */
export function createEligibilityTestState(): GameState {
  return new BiddingTestStateBuilder()
    .withFactions(SCENARIO_PRESETS.ALL_6_FACTIONS)
    .withHandSize(Faction.ATREIDES, 0)
    .withHandSize(Faction.HARKONNEN, 2)
    .withHandSize(Faction.EMPEROR, 4) // Full
    .withHandSize(Faction.FREMEN, 3)
    .withHandSize(Faction.BENE_GESSERIT, 1)
    .withHandSize(Faction.SPACING_GUILD, 8) // Harkonnen max, but for SG it's invalid - will be capped
    .build();
}

/**
 * Create Harkonnen TOP CARD test state
 */
export function createHarkonnenTopCardTestState(handSize: number = 6): GameState {
  return new BiddingTestStateBuilder()
    .withFactions(SCENARIO_PRESETS.WITH_HARKONNEN)
    .withHandSize(Faction.HARKONNEN, handSize)
    .build();
}

/**
 * Create BOUGHT-IN test state (all full hands or all pass)
 */
export function createBoughtInTestState(): GameState {
  return new BiddingTestStateBuilder()
    .withFactions(SCENARIO_PRESETS.BASIC_3_FACTIONS)
    .withFullHandsForAll()
    .build();
}

/**
 * Get a Karama card ID from the deck or hand
 */
export function getKaramaCardId(state: GameState, faction?: Faction): string | null {
  // If faction specified, check their hand first
  if (faction) {
    const factionState = getFactionState(state, faction);
    const karamaInHand = factionState.hand.find(c => c.definitionId.startsWith('karama'));
    if (karamaInHand) {
      return karamaInHand.definitionId;
    }
  }
  
  // Look for Karama in deck
  const karamaCard = state.treacheryDeck.find(c => c.definitionId.startsWith('karama'));
  if (karamaCard) {
    return karamaCard.definitionId;
  }
  
  // Default to karama_1 if not found
  return 'karama_1';
}

/**
 * Get a worthless card ID (for BG ability testing)
 */
export function getWorthlessCardId(state: GameState, faction?: Faction): string | null {
  const worthlessCards = ['baliset', 'jubba_cloak', 'kulon', 'la_la_la', 'trip_to_gamont'];
  
  // If faction specified, check their hand first
  if (faction) {
    const factionState = getFactionState(state, faction);
    const worthlessInHand = factionState.hand.find(c => 
      worthlessCards.includes(c.definitionId)
    );
    if (worthlessInHand) {
      return worthlessInHand.definitionId;
    }
  }
  
  // Look in deck
  for (const cardId of worthlessCards) {
    const card = state.treacheryDeck.find(c => c.definitionId === cardId);
    if (card) {
      return card.definitionId;
    }
  }
  
  return worthlessCards[0]; // Default to first one
}

