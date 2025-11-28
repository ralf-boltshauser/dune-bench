/**
 * Karama card validation helpers.
 *
 * Handles the special case where Bene Gesserit can use any worthless card
 * as if it were a Karama card (battle.md line 97).
 */

import { Faction, TreacheryCardType, type GameState } from '../types';
import { getFactionState } from '../state/queries';
import { getTreacheryCardDefinition, isKaramaCard as isActualKaramaCard } from '../data';

// =============================================================================
// KARAMA VALIDATION
// =============================================================================

/**
 * Check if a faction can use Karama functionality.
 *
 * BG special ability: Can use any worthless card as if it were a Karama card.
 *
 * @param state - Current game state
 * @param faction - Faction to check
 * @param cardId - Optional specific card ID to check
 * @returns True if faction can use Karama (either has actual Karama or BG with worthless)
 */
export function canUseKarama(
  state: GameState,
  faction: Faction,
  cardId?: string
): boolean {
  const factionState = getFactionState(state, faction);

  // If specific card provided, check that exact card
  if (cardId) {
    const hasCard = factionState.hand.some(c => c.definitionId === cardId);
    if (!hasCard) return false;

    const def = getTreacheryCardDefinition(cardId);
    if (!def) return false;

    // Actual Karama card always works
    if (isActualKaramaCard(def)) return true;

    // BG can use worthless as Karama
    if (faction === Faction.BENE_GESSERIT && def.type === TreacheryCardType.WORTHLESS) {
      return true;
    }

    return false;
  }

  // No specific card - check if faction has ANY valid Karama card
  for (const card of factionState.hand) {
    const def = getTreacheryCardDefinition(card.definitionId);
    if (!def) continue;

    // Check for actual Karama
    if (isActualKaramaCard(def)) return true;

    // BG special: worthless cards work as Karama
    if (faction === Faction.BENE_GESSERIT && def.type === TreacheryCardType.WORTHLESS) {
      return true;
    }
  }

  return false;
}

/**
 * Get all cards that can be used as Karama for a faction.
 *
 * For most factions: returns actual Karama cards
 * For Bene Gesserit: returns Karama cards + worthless cards
 *
 * @param state - Current game state
 * @param faction - Faction to check
 * @returns Array of card IDs that can be used as Karama
 */
export function getKaramaCards(state: GameState, faction: Faction): string[] {
  const factionState = getFactionState(state, faction);
  const cards: string[] = [];

  for (const card of factionState.hand) {
    const def = getTreacheryCardDefinition(card.definitionId);
    if (!def) continue;

    // Actual Karama cards work for everyone
    if (isActualKaramaCard(def)) {
      cards.push(card.definitionId);
    }
    // BG can use worthless as Karama
    else if (faction === Faction.BENE_GESSERIT && def.type === TreacheryCardType.WORTHLESS) {
      cards.push(card.definitionId);
    }
  }

  return cards;
}

/**
 * Check if a specific card can be used as Karama by a faction.
 *
 * @param cardId - Card definition ID to check
 * @param faction - Faction attempting to use the card
 * @returns True if this card can function as Karama for this faction
 */
export function isKaramaCardForFaction(cardId: string, faction: Faction): boolean {
  const def = getTreacheryCardDefinition(cardId);
  if (!def) return false;

  // Actual Karama works for everyone
  if (isActualKaramaCard(def)) return true;

  // BG special: worthless cards work as Karama
  if (faction === Faction.BENE_GESSERIT && def.type === TreacheryCardType.WORTHLESS) {
    return true;
  }

  return false;
}

/**
 * Get the display name for a Karama-usable card.
 * For actual Karama cards, returns "Karama"
 * For BG worthless cards used as Karama, returns the card name + "(as Karama)"
 *
 * @param cardId - Card definition ID
 * @param faction - Faction using the card
 * @returns Display string for the card
 */
export function getKaramaCardDisplayName(cardId: string, faction: Faction): string {
  const def = getTreacheryCardDefinition(cardId);
  if (!def) return cardId;

  if (isActualKaramaCard(def)) {
    return def.name;
  }

  if (faction === Faction.BENE_GESSERIT && def.type === TreacheryCardType.WORTHLESS) {
    return `${def.name} (as Karama)`;
  }

  return def.name;
}
