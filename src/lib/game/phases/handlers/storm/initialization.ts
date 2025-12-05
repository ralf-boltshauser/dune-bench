/**
 * Storm Phase Initialization
 * 
 * Handles phase initialization and Fremen storm deck operations.
 */

import { GAME_CONSTANTS } from "../../../data";
import { getFactionState, getPlayerPositions } from "../../../state";
import { shuffle } from "../../../state/factory";
import { FACTION_NAMES, Faction, Phase, type GameState } from "../../../types";
import {
  type AgentRequest,
  type PhaseEvent,
  type PhaseStepResult,
  type StormPhaseContext,
} from "../../types";
import { checkFamilyAtomics } from "./family-atomics";
import { getStormDialers } from "./dialing";
import type {
  StormDeckRevealResult,
  StormDeckDrawResult,
  StormDeckAfterMovementResult,
} from "./types";

/**
 * Reset context to initial state
 */
export function resetContext(): StormPhaseContext {
  return {
    dialingFactions: null,
    dials: new Map(),
    stormMovement: null,
    weatherControlUsed: false,
    weatherControlBy: null,
    familyAtomicsUsed: false,
    familyAtomicsBy: null,
    waitingForFamilyAtomics: false,
    waitingForWeatherControl: false,
  };
}

/**
 * Check if Fremen should use Storm Deck (advanced rules, turn > 1)
 */
export function shouldUseStormDeck(state: GameState): boolean {
  return (
    state.factions.has(Faction.FREMEN) &&
    state.config.advancedRules &&
    state.turn > 1
  );
}

/**
 * Validate and parse storm card value
 */
export function parseStormCardValue(
  cardValue: string | null | undefined
): number | null {
  if (!cardValue) return null;
  const value = parseInt(cardValue, 10);
  if (isNaN(value) || value < 1 || value > 6) return null;
  return value;
}

/**
 * Draw a card from the storm deck
 */
export function drawStormCard(
  state: GameState
): StormDeckDrawResult {
  if (state.stormDeck.length === 0) {
    return {
      state,
      card: null,
      error: "Storm deck is empty",
    };
  }

  const [card, ...remainingDeck] = state.stormDeck;
  return {
    state: { ...state, stormDeck: remainingDeck },
    card: card ?? null,
    error: null,
  };
}

/**
 * Return a card to the storm deck and shuffle
 */
export function returnCardToStormDeckAndShuffle(
  state: GameState,
  cardValue: number
): GameState {
  const updatedDeck = [...state.stormDeck, cardValue];
  const shuffledDeck = shuffle(updatedDeck);
  return { ...state, stormDeck: shuffledDeck };
}

/**
 * Store storm card for Fremen
 */
export function storeStormCardForFremen(
  state: GameState,
  cardValue: number
): GameState {
  const fremenState = getFactionState(state, Faction.FREMEN);
  const updatedFremenState = {
    ...fremenState,
    fremenStormCard: cardValue.toString(),
  };
  const updatedFactions = new Map(state.factions);
  updatedFactions.set(Faction.FREMEN, updatedFremenState);
  return { ...state, factions: updatedFactions };
}

/**
 * Reveal stored storm card and set movement
 */
export function revealStormCard(state: GameState): StormDeckRevealResult {
  const fremenState = getFactionState(state, Faction.FREMEN);
  const stormCardValue = fremenState.fremenStormCard;
  const events: PhaseEvent[] = [];

  const movement = parseStormCardValue(stormCardValue);
  if (movement === null) {
    // Fallback: draw a random card (1-6) if no valid card stored
    const fallbackValue = Math.floor(Math.random() * 6) + 1;
    console.warn(
      `⚠️  WARNING: No valid storm card stored for Fremen. Using fallback value: ${fallbackValue}`
    );
    return {
      movement: fallbackValue,
      cardValue: fallbackValue.toString(),
      events,
    };
  }

  events.push({
    type: "STORM_CARD_REVEALED",
    data: {
      faction: Faction.FREMEN,
      value: movement,
      card: stormCardValue!,
    },
    message: `Fremen reveals Storm Card: ${movement} sectors`,
  });

  console.log("\n" + "=".repeat(80));
  console.log("🌪️  STORM DECK REVEAL (Fremen)");
  console.log("=".repeat(80));
  console.log(
    `\n  ${
      FACTION_NAMES[Faction.FREMEN]
    }: Storm Card ${stormCardValue} = ${movement} sectors`
  );
  console.log("=".repeat(80) + "\n");

  return {
    movement,
    cardValue: stormCardValue!,
    events,
  };
}

/**
 * @rule 2.04.13 STORM RULE: Move the Storm Marker normally using the Battle Wheels on the first Turn of the game.
 * You randomly select a card from the Storm Deck and Put it face down on the margin of the game board.
 * In the next Storm Phase the number on that Storm Card is Revealed; the storm is moved counterclockwise that number of Sectors
 * and your Storm Card is returned to the Storm Card Deck. You then shuffle the Storm Deck, randomly select a Storm Card for the next turn's storm movement, and Put it face down on the margin of the game board.
 * Handle storm deck operations after movement (return card, shuffle, draw new)
 */
export function handleStormDeckAfterMovement(
  state: GameState,
  events: PhaseEvent[]
): StormDeckAfterMovementResult {
  const fremenState = getFactionState(state, Faction.FREMEN);
  const revealedCardValue = parseStormCardValue(fremenState.fremenStormCard);

  if (state.turn === 1) {
    // Turn 1: Draw a card from storm deck for turn 2 (face down)
    const drawResult = drawStormCard(state);
    if (drawResult.error || drawResult.card === null) {
      console.error(`⚠️  WARNING: ${drawResult.error || "Cannot draw card"}`);
      return { state, events };
    }

    const newState = storeStormCardForFremen(
      drawResult.state,
      drawResult.card
    );
    events.push({
      type: "STORM_CARD_DRAWN",
      data: {
        faction: Faction.FREMEN,
        value: drawResult.card,
        card: drawResult.card.toString(),
      },
      message: `Fremen draws Storm Card ${drawResult.card} for next turn (face down)`,
    });

    console.log(
      `\n  🎴 ${FACTION_NAMES[Faction.FREMEN]}: Drew Storm Card ${
        drawResult.card
      } for Turn 2 (face down)`
    );

    return { state: newState, events };
  } else {
    // Turn 2+: Return revealed card to deck, shuffle, then draw new card
    let updatedState = state;

    // Return revealed card to deck (if it exists)
    if (revealedCardValue !== null) {
      updatedState = returnCardToStormDeckAndShuffle(
        updatedState,
        revealedCardValue
      );
    }

    // Draw new card for next turn
    const drawResult = drawStormCard(updatedState);
    if (drawResult.error || drawResult.card === null) {
      console.error(
        `⚠️  WARNING: ${drawResult.error || "Cannot draw card after shuffle"}`
      );
      return { state: updatedState, events };
    }

    const newState = storeStormCardForFremen(
      drawResult.state,
      drawResult.card
    );

    events.push({
      type: "STORM_CARD_DRAWN",
      data: {
        faction: Faction.FREMEN,
        value: drawResult.card,
        card: drawResult.card.toString(),
      },
      message: `Fremen shuffles Storm Deck and draws Storm Card ${drawResult.card} for next turn (face down)`,
    });

    console.log(
      `\n  🎴 ${
        FACTION_NAMES[Faction.FREMEN]
      }: Returned card ${revealedCardValue} to deck, shuffled, and drew Storm Card ${
        drawResult.card
      } for Turn ${state.turn + 1} (face down)`
    );

    return { state: newState, events };
  }
}

/**
 * Create dial requests for the two dialers
 */
function createDialRequests(
  dialers: [Faction, Faction],
  state: GameState
): AgentRequest[] {
  const pendingRequests: AgentRequest[] = [];

  for (const faction of dialers) {
    const maxDial =
      state.turn === 1
        ? GAME_CONSTANTS.FIRST_STORM_MAX_DIAL
        : GAME_CONSTANTS.MAX_STORM_DIAL;

    const startingSector = state.turn === 1 ? 0 : state.stormSector; // Turn 1 starts from Storm Start Sector (0)

    pendingRequests.push({
      factionId: faction,
      requestType: "DIAL_STORM",
      prompt:
        state.turn === 1
          ? `Initial Storm Placement: Dial a number from 0 to ${maxDial}. The total will determine where the storm starts on the board (moves from Storm Start Sector 0 counterclockwise).`
          : `Dial a number for storm movement (1-${maxDial}). The total will determine how many sectors the storm moves.`,
      context: {
        turn: state.turn,
        currentStormSector: startingSector,
        maxDial,
        isFirstTurn: state.turn === 1,
        stormStartSector: state.turn === 1 ? 0 : undefined,
      },
      availableActions: ["DIAL_STORM"],
    });
  }

  return pendingRequests;
}

/**
 * Initialize storm phase
 */
export function initializeStormPhase(
  state: GameState,
  context: StormPhaseContext
): PhaseStepResult {
  // Reset context
  Object.assign(context, resetContext());

  const events: PhaseEvent[] = [];
  const pendingRequests: AgentRequest[] = [];

  // Check if Fremen should use Storm Deck (advanced rules, turn > 1)
  if (shouldUseStormDeck(state)) {
    // Fremen uses Storm Deck instead of dialing
    const revealResult = revealStormCard(state);
    context.stormMovement = revealResult.movement;

    // IMPORTANT: Immediately continue with the normal post-movement flow
    // (Family Atomics → Weather Control → applyStormMovement) instead of
    // waiting for a no-op processStep call. This guarantees that after the
    // storm card is revealed, the phase will either:
    //   - request decisions for Family Atomics / Weather Control, OR
    //   - apply storm movement and complete the phase.
    const deckFlowResult = checkFamilyAtomics(state, context);

    return {
      ...deckFlowResult,
      // Prepend the reveal events so logs clearly show the card before
      // any Family Atomics / Weather Control decisions or movement.
      events: [...revealResult.events, ...deckFlowResult.events],
    };
  }

  // Standard dialing procedure
  // Determine who dials the storm
  // Turn 1: Two players nearest storm start sector
  // Later turns: Two players who last used battle wheels
  const dialers = getStormDialers(state);

  // Validate that we have two different factions before creating requests
  if (dialers[0] === dialers[1]) {
    console.error(
      `\n❌ ERROR: Duplicate dialers returned from getStormDialers(): ${
        FACTION_NAMES[dialers[0]]
      }`
    );
    console.error(
      "   This should not happen - validation should have caught this."
    );
    // Fix: Find two distinct factions
    const distinctFactions = Array.from(state.factions.keys());
    const fixedDialer1 = dialers[0];
    const fixedDialer2 =
      distinctFactions.find((f) => f !== fixedDialer1) ?? fixedDialer1;

    if (fixedDialer2 === fixedDialer1) {
      throw new Error(
        `Cannot create storm dial requests - only one faction (${FACTION_NAMES[fixedDialer1]}) exists. Need at least 2 factions.`
      );
    }

    console.error(
      `   ✅ Fixed: Using ${FACTION_NAMES[fixedDialer1]} and ${FACTION_NAMES[fixedDialer2]}`
    );
    dialers[0] = fixedDialer1;
    dialers[1] = fixedDialer2;
  }

  context.dialingFactions = dialers;

  // Note: PhaseManager emits PHASE_STARTED event, so we don't emit it here

  // Request dial values from the two players
  const requests = createDialRequests(dialers, state);
  pendingRequests.push(...requests);

  // Validate request count and factionId uniqueness
  if (pendingRequests.length !== 2) {
    console.error(
      `\n❌ ERROR: Expected 2 dial requests, got ${pendingRequests.length}`
    );
    console.error(
      `   Dialers selected: ${dialers
        .map((f) => FACTION_NAMES[f])
        .join(", ")}`
    );
    throw new Error(
      `Invalid dial request count: expected 2, got ${pendingRequests.length}`
    );
  }

  const requestFactionIds = pendingRequests.map((r) => r.factionId);
  if (requestFactionIds[0] === requestFactionIds[1]) {
    console.error(
      `\n❌ ERROR: Duplicate faction IDs in dial requests: ${
        FACTION_NAMES[requestFactionIds[0]]
      }`
    );
    console.error(
      `   This should not happen - validation should have caught this earlier.`
    );
    throw new Error(
      `Duplicate dial requests created for faction: ${
        FACTION_NAMES[requestFactionIds[0]]
      }`
    );
  }

  return {
    state,
    phaseComplete: false,
    pendingRequests,
    simultaneousRequests: true, // Both players dial simultaneously
    actions: [],
    events,
  };
}

