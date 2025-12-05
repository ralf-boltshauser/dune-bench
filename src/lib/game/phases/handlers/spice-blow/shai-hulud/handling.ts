import { GAME_CONSTANTS } from "../../../../data";
import { type GameState, type SpiceCard } from "../../../../types";
import { type PhaseEvent } from "../../../types";
import { type DeckType, type SpiceBlowContext, type SpiceBlowStepResult } from "../types";
import { discardSpiceCard } from "../deck";
import { getTopmostTerritoryCardLocation, devourForcesInTerritory } from "./devouring";
import { SpiceBlowEvents } from "../events/factory";
import { SpiceBlowLogger } from "../utils/logger";
import { SpiceBlowResults } from "../results/factory";

/**
 * Handle Turn 1 Shai-Hulud - set aside for reshuffle
 * @rule 1.02.02
 */
export function handleTurnOneWorm(
  state: GameState,
  card: SpiceCard,
  deckType: DeckType,
  context: SpiceBlowContext,
  events: PhaseEvent[],
  revealSpiceCard: (state: GameState, deckType: DeckType) => SpiceBlowStepResult
): SpiceBlowStepResult {
  // Rule 1.02.02: "Set Aside" means NOT discarding - keep it separate to reshuffle later
  // Set aside the worm card (will be reshuffled in cleanup)
  const updatedContext: SpiceBlowContext = {
    ...context,
    turnOneWormsSetAside: [...context.turnOneWormsSetAside, card],
  };

  events.push(SpiceBlowEvents.shaiHuludAppeared(state.wormCount, true));

  // IMPORTANT: Do NOT discard the card on Turn 1 - it's "Set Aside" which means
  // it's kept separate and will be reshuffled back into the deck at cleanup
  // The card is already removed from the deck when drawn, so we just keep it in turnOneWormsSetAside

  // Rule 1.02.05: "Continue discarding Spice Blow cards until a Territory Card is discarded"
  // Even on Turn 1, we must continue drawing until we get a Territory Card
  const result = revealSpiceCard(state, deckType);
  // CRITICAL: Preserve ALL fields from result.context (including cardARevealed/cardBRevealed
  // which may have been set by the recursive call), and only merge in turnOneWormsSetAside
  // from this call. This prevents overwriting cardBRevealed: true with false.
  return SpiceBlowResults.withContext(result, {
    ...result.context,
    turnOneWormsSetAside: updatedContext.turnOneWormsSetAside,
  });
}

/**
 * Handle normal Shai-Hulud (Turn 2+)
 * @rule 1.02.05
 */
export function handleNormalWorm(
  state: GameState,
  card: SpiceCard,
  deckType: DeckType,
  context: SpiceBlowContext,
  events: PhaseEvent[],
  revealSpiceCard: (state: GameState, deckType: DeckType) => SpiceBlowStepResult
): SpiceBlowStepResult {
  // Rule 1.02.05: "When this type of card is discarded destroy all spice and Forces
  // in the Territory of the topmost Territory Card in the discard pile and Place them
  // in the Spice Bank and Tleilaxu Tanks respectively. Continue discarding Spice Blow
  // cards until a Territory Card is discarded. Now a Nexus will occur."

  const updatedContext: SpiceBlowContext = {
    ...context,
    shaiHuludCount: context.shaiHuludCount + 1,
    pendingDevourDeck: deckType,
  };
  let newState = { ...state, wormCount: state.wormCount + 1 };

  events.push(SpiceBlowEvents.shaiHuludAppeared(newState.wormCount));

  // Check for Shield Wall destruction (4+ worms variant per rule 4.02)
  if (
    newState.wormCount >= GAME_CONSTANTS.WORMS_TO_DESTROY_SHIELD_WALL &&
    !newState.shieldWallDestroyed &&
    newState.config.variants.shieldWallStronghold
  ) {
    newState = { ...newState, shieldWallDestroyed: true };
    events.push(SpiceBlowEvents.shieldWallDestroyed());
  }

  // Rule 1.02.05: Destroy spice and forces in the Territory of the TOPMOST Territory Card
  // in the discard pile (not the last spice location!)
  // IMPORTANT: Check BEFORE discarding the Shai-Hulud, so we get the correct topmost Territory Card
  const devourLocation = getTopmostTerritoryCardLocation(
    newState,
    deckType,
    updatedContext
  );

  // Discard the worm card (after checking for devour location)
  newState = discardSpiceCard(newState, card, deckType);

  if (devourLocation) {
    SpiceBlowLogger.shaiHuludDevours(devourLocation);

    // Devour forces and spice in that territory
    const devourResult = devourForcesInTerritory(
      newState,
      devourLocation,
      events,
      updatedContext
    );

    // Check if we need to wait for Fremen protection decision
    if ("pendingRequests" in devourResult) {
      // Store pending devour location in context
      const finalContext: SpiceBlowContext = {
        ...updatedContext,
        pendingDevourLocation: devourLocation,
      };
      return SpiceBlowResults.withContext(devourResult, finalContext);
    }

    // Continue with normal flow
    newState = devourResult.state;
    events.push(...devourResult.events);
  } else {
    SpiceBlowLogger.noTerritoryCard();
  }

  // Rule 1.02.05: "Continue discarding Spice Blow cards until a Territory Card is discarded"
  // Keep drawing cards until we get a Territory Card
  SpiceBlowLogger.continueDrawing();
  const result = revealSpiceCard(newState, deckType);
  // CRITICAL: Preserve ALL fields from result.context (including cardARevealed/cardBRevealed
  // which may have been set by the recursive call), and only merge in shaiHuludCount and
  // pendingDevourDeck from this call. This prevents overwriting cardBRevealed: true with false.
  return SpiceBlowResults.withContext(result, {
    ...result.context,
    shaiHuludCount: updatedContext.shaiHuludCount,
    pendingDevourDeck: updatedContext.pendingDevourDeck,
  });
}

