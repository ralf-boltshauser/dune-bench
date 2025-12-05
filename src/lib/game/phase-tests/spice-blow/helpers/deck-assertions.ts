/**
 * Deck Assertions for Two-Pile System
 * 
 * Reusable utilities for testing deck and discard pile operations
 */

import { type GameState } from '../../../types';
import { getSpiceCardDefinition, isShaiHulud } from '../../../data';
import { type DeckType } from '../../../phases/handlers/spice-blow/types';

export class DeckAssertions {
  /**
   * Assert card in deck
   */
  static assertCardInDeck(
    state: GameState,
    deckType: DeckType,
    cardId: string
  ): void {
    const deck = deckType === 'A' ? state.spiceDeckA : state.spiceDeckB;
    const found = deck.some(card => card.definitionId === cardId);
    if (!found) {
      throw new Error(`Expected card ${cardId} in deck ${deckType}, but not found. Deck contains: ${deck.map(c => c.definitionId).join(', ')}`);
    }
  }
  
  /**
   * Assert card in discard
   */
  static assertCardInDiscard(
    state: GameState,
    deckType: DeckType,
    cardId: string
  ): void {
    const discard = deckType === 'A' ? state.spiceDiscardA : state.spiceDiscardB;
    const found = discard.some(card => card.definitionId === cardId);
    if (!found) {
      throw new Error(`Expected card ${cardId} in discard ${deckType}, but not found. Discard contains: ${discard.map(c => c.definitionId).join(', ')}`);
    }
  }
  
  /**
   * Assert card NOT in deck
   */
  static assertCardNotInDeck(
    state: GameState,
    deckType: DeckType,
    cardId: string
  ): void {
    const deck = deckType === 'A' ? state.spiceDeckA : state.spiceDeckB;
    const found = deck.some(card => card.definitionId === cardId);
    if (found) {
      throw new Error(`Expected card ${cardId} NOT in deck ${deckType}, but found`);
    }
  }
  
  /**
   * Assert card NOT in discard
   */
  static assertCardNotInDiscard(
    state: GameState,
    deckType: DeckType,
    cardId: string
  ): void {
    const discard = deckType === 'A' ? state.spiceDiscardA : state.spiceDiscardB;
    const found = discard.some(card => card.definitionId === cardId);
    if (found) {
      throw new Error(`Expected card ${cardId} NOT in discard ${deckType}, but found`);
    }
  }
  
  /**
   * Assert topmost Territory Card in discard
   */
  static assertTopmostTerritoryCard(
    state: GameState,
    deckType: DeckType,
    expectedTerritory: string,
    expectedSector: number
  ): void {
    const discard = deckType === 'A' ? state.spiceDiscardA : state.spiceDiscardB;
    
    // Find last Territory Card (topmost = last in discard)
    for (let i = discard.length - 1; i >= 0; i--) {
      const cardDef = getSpiceCardDefinition(discard[i].definitionId);
      if (cardDef && !isShaiHulud(cardDef) && cardDef.territoryId) {
        if (cardDef.territoryId !== expectedTerritory || cardDef.sector !== expectedSector) {
          throw new Error(`Expected topmost Territory Card at ${expectedTerritory} (sector ${expectedSector}), but found ${cardDef.territoryId} (sector ${cardDef.sector})`);
        }
        return;
      }
    }
    throw new Error(`No Territory Card found in discard ${deckType}`);
  }
  
  /**
   * Assert deck size
   */
  static assertDeckSize(
    state: GameState,
    deckType: DeckType,
    expectedSize: number
  ): void {
    const deck = deckType === 'A' ? state.spiceDeckA : state.spiceDeckB;
    if (deck.length !== expectedSize) {
      throw new Error(`Expected deck ${deckType} size ${expectedSize}, but got ${deck.length}`);
    }
  }
  
  /**
   * Assert discard size
   */
  static assertDiscardSize(
    state: GameState,
    deckType: DeckType,
    expectedSize: number
  ): void {
    const discard = deckType === 'A' ? state.spiceDiscardA : state.spiceDiscardB;
    if (discard.length !== expectedSize) {
      throw new Error(`Expected discard ${deckType} size ${expectedSize}, but got ${discard.length}`);
    }
  }
  
  /**
   * Assert deck independence (Deck A operations don't affect Deck B)
   */
  static assertDeckIndependence(
    stateBefore: GameState,
    stateAfter: GameState,
    deckType: DeckType
  ): void {
    const otherDeckType: DeckType = deckType === 'A' ? 'B' : 'A';
    
    const otherDeckBefore = deckType === 'A' ? stateBefore.spiceDeckB : stateBefore.spiceDeckA;
    const otherDeckAfter = deckType === 'A' ? stateAfter.spiceDeckB : stateAfter.spiceDeckA;
    
    const otherDiscardBefore = deckType === 'A' ? stateBefore.spiceDiscardB : stateBefore.spiceDiscardA;
    const otherDiscardAfter = deckType === 'A' ? stateAfter.spiceDiscardB : stateAfter.spiceDiscardA;
    
    if (JSON.stringify(otherDeckAfter) !== JSON.stringify(otherDeckBefore)) {
      throw new Error(`Deck ${otherDeckType} changed when operating on Deck ${deckType}`);
    }
    
    if (JSON.stringify(otherDiscardAfter) !== JSON.stringify(otherDiscardBefore)) {
      throw new Error(`Discard ${otherDeckType} changed when operating on Deck ${deckType}`);
    }
  }
  
  /**
   * Assert card moved from deck to discard
   */
  static assertCardMovedToDiscard(
    stateBefore: GameState,
    stateAfter: GameState,
    deckType: DeckType,
    cardId: string
  ): void {
    // Card should not be in deck anymore
    this.assertCardNotInDeck(stateAfter, deckType, cardId);
    
    // Card should be in discard
    this.assertCardInDiscard(stateAfter, deckType, cardId);
    
    // Deck size should decrease by 1
    const deckBefore = deckType === 'A' ? stateBefore.spiceDeckA : stateBefore.spiceDeckB;
    const deckAfter = deckType === 'A' ? stateAfter.spiceDeckA : stateAfter.spiceDeckB;
    if (deckAfter.length !== deckBefore.length - 1) {
      throw new Error(`Expected deck ${deckType} size to decrease by 1, but deck size changed from ${deckBefore.length} to ${deckAfter.length}`);
    }
    
    // Discard size should increase by 1
    const discardBefore = deckType === 'A' ? stateBefore.spiceDiscardA : stateBefore.spiceDiscardB;
    const discardAfter = deckType === 'A' ? stateAfter.spiceDiscardA : stateAfter.spiceDiscardB;
    if (discardAfter.length !== discardBefore.length + 1) {
      throw new Error(`Expected discard ${deckType} size to increase by 1, but discard size changed from ${discardBefore.length} to ${discardAfter.length}`);
    }
  }
}

