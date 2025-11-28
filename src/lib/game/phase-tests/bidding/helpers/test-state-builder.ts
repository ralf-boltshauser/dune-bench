/**
 * Test State Builder for Bidding Phase
 * 
 * Helper utilities for creating test game states with specific configurations.
 */

import { buildTestState, addCardToHand, getDefaultSpice } from '../../battle/helpers/test-state-builder';
import {
  Faction,
  Phase,
  type GameState,
} from '../../../types';
import { getFactionState } from '../../../state';

export interface BiddingTestStateConfig {
  factions: Faction[];
  phase?: Phase;
  turn?: number;
  advancedRules?: boolean;
  spice?: Map<Faction, number>;
  handCards?: Map<Faction, string[]>; // Card IDs to add to hand
}

/**
 * Build a test game state for bidding phase tests
 */
export function buildBiddingTestState(config: BiddingTestStateConfig): GameState {
  // Use default spice if not provided
  const spice = config.spice ?? getDefaultSpice();
  
  // Build base state
  let state = buildTestState({
    factions: config.factions,
    phase: config.phase ?? Phase.BIDDING,
    turn: config.turn ?? 1,
    advancedRules: config.advancedRules ?? true,
    spice,
  });

  // Add cards to hands if specified
  if (config.handCards) {
    for (const [faction, cardIds] of config.handCards.entries()) {
      for (const cardId of cardIds) {
        state = addCardToHand(state, faction, cardId);
      }
    }
  }

  return state;
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

