import { getSpiceCardDefinition, isShaiHulud } from "../../../data";
import { type GameState, type SpiceCard } from "../../../types";
import { type PhaseEvent } from "../../types";
import { type DeckType, type SpiceBlowContext, type SpiceBlowStepResult } from "./types";
import { getDeck, reshuffleSpiceDeck } from "./deck";
import { isInStorm } from "./validation";
import { handleTerritoryCard } from "./placement";
import { handleShaiHulud } from "./shai-hulud";
import { checkNexusTriggerAfterTerritoryCard } from "./nexus/detection";
import { triggerNexus } from "./nexus";
import { SpiceBlowEvents } from "./events/factory";
import { SpiceBlowLogger } from "./utils/logger";
import { SpiceBlowResults } from "./results/factory";

/**
 * Reveal a spice card from the specified deck
 * @rule 1.02.01
 */
export function revealSpiceCard(
  state: GameState,
  deckType: DeckType,
  context: SpiceBlowContext,
  revealSpiceCardFn: (state: GameState, deckType: DeckType) => SpiceBlowStepResult
): SpiceBlowStepResult {
  const events: PhaseEvent[] = [];
  let newState = state;
  let updatedContext = context;

  // Prevent drawing from a deck that has already been revealed
  // This prevents multiple reveals from the same deck (e.g., when processStep is called multiple times)
  const alreadyRevealed = deckType === "A" ? context.cardARevealed : context.cardBRevealed;
  if (alreadyRevealed) {
    return SpiceBlowResults.incomplete(newState, updatedContext, []);
  }

  // Draw from appropriate deck (TWO SEPARATE DECKS for two separate piles)
  const deck = getDeck(newState, deckType);
  if (deck.length === 0) {
    // Reshuffle discard back into deck
    newState = reshuffleSpiceDeck(newState, deckType);
  }

  const currentDeck = getDeck(newState, deckType);
  if (currentDeck.length === 0) {
    // No cards to draw
    updatedContext = {
      ...updatedContext,
      ...(deckType === "A" ? { cardARevealed: true } : { cardBRevealed: true }),
    };
    return SpiceBlowResults.incomplete(newState, updatedContext, []);
  }

  // Draw the top card from the appropriate deck
  const [card, ...remainingDeck] = currentDeck;
  newState =
    deckType === "A"
      ? { ...newState, spiceDeckA: remainingDeck }
      : { ...newState, spiceDeckB: remainingDeck };

  const cardDef = getSpiceCardDefinition(card.definitionId);
  if (!cardDef) {
    // Invalid card, skip
    updatedContext = {
      ...updatedContext,
      ...(deckType === "A" ? { cardARevealed: true } : { cardBRevealed: true }),
    };
    return SpiceBlowResults.incomplete(newState, updatedContext, []);
  }

  const isWorm = isShaiHulud(cardDef);
  const inStorm = !isWorm && cardDef.territoryId && cardDef.sector !== undefined
    ? isInStorm(newState, cardDef.sector, cardDef.territoryId)
    : undefined;

  SpiceBlowLogger.cardRevealed(
    cardDef.name,
    deckType,
    isWorm,
    cardDef.territoryId,
    cardDef.sector,
    cardDef.spiceAmount,
    inStorm
  );

  events.push(SpiceBlowEvents.cardRevealed(cardDef.name, cardDef.type, deckType, inStorm));

  // Handle based on card type
  if (isShaiHulud(cardDef)) {
    return handleShaiHulud(newState, card, deckType, updatedContext, events, revealSpiceCardFn);
  } else {
    // Territory Card
    const result = handleTerritoryCard(
      newState,
      card,
      cardDef,
      deckType,
      updatedContext,
      events
    );

    // Rule 1.02.05: "Continue discarding Spice Blow cards until a Territory Card is discarded. Now a Nexus will occur."
    // If we were in a Shai-Hulud chain (shaiHuludCount > 0), trigger Nexus now
    if (checkNexusTriggerAfterTerritoryCard(newState, result.context)) {
      const nexusResult = triggerNexus(result.state, result.context, result.events);
      // Merge contexts
      return SpiceBlowResults.withContext(nexusResult, {
        ...result.context,
        ...nexusResult.context,
      });
    }

    return SpiceBlowResults.incomplete(result.state, result.context, result.events);
  }
}

