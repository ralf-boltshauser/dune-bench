/**
 * Card management mutations (treachery cards and traitor cards).
 */

import { type GameState, Faction, CardLocation } from '../../types';
import { getFactionState, getFactionMaxHandSize } from '../queries';
import { shuffle } from '../factory';
import { updateFactionState } from './common';
import { validateHandSizeAfterMutation } from './validation-helpers';

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
    // Shuffle using improved shuffle function
    const shuffledDeck = shuffle(newDeck);
    state = { ...state, treacheryDeck: shuffledDeck, treacheryDiscard: [] };
  }

  const [card, ...remainingDeck] = state.treacheryDeck;
  if (!card) return state;

  const factionState = getFactionState(state, faction);
  
  // Check if adding this card would exceed the maximum hand size
  const maxHandSize = getFactionMaxHandSize(faction);
  const currentHandSize = factionState.hand.length;
  
  if (currentHandSize >= maxHandSize) {
    // Cannot draw more cards - hand is full
    console.warn(`Cannot draw card for ${faction}: hand is full (${currentHandSize}/${maxHandSize})`);
    return state; // Return state unchanged
  }

  const updatedCard = { ...card, location: CardLocation.HAND, ownerId: faction };

  const newState = updateFactionState(state, faction, {
    hand: [...factionState.hand, updatedCard],
  });

  // Defensive validation: validate hand size after adding card
  validateHandSizeAfterMutation(newState, faction);

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

  const newState = updateFactionState(state, faction, { hand: newHand });
  return { ...newState, treacheryDiscard: [...newState.treacheryDiscard, discardedCard] };
}

