/**
 * Storm Phase Handler
 *
 * Phase 1.01: Storm Movement
 * - Two players dial storm movement (1-3, or 0-20 on turn 1)
 * - Storm moves counterclockwise
 * - Forces in sand territories under storm are destroyed
 * - Spice in storm path is destroyed
 * - Storm order is determined for the turn
 */

import { GAME_CONSTANTS, getTreacheryCardDefinition } from "../../data";
import {
  destroySpiceInTerritory,
  getFactionState,
  getPlayerPositions,
  getProtectedLeaders,
  logAction,
  moveStorm,
  sendForcesToTanks,
  updateStormOrder,
} from "../../state";
import { calculateStormOrder, shuffle } from "../../state/factory";
import { isSectorInStorm } from "../../state/queries";
import {
  FACTION_NAMES,
  Faction,
  LeaderLocation,
  Phase,
  TERRITORY_DEFINITIONS,
  TerritoryId,
  type GameState,
} from "../../types";
import {
  getAffectedSectors,
  isTerritoryAffectedByStorm,
} from "../../utils/storm-utils";
import {
  type AgentRequest,
  type AgentResponse,
  type PhaseEvent,
  type PhaseHandler,
  type PhaseStepResult,
  type StormPhaseContext,
} from "../types";

// =============================================================================
// STORM PHASE HANDLER
// =============================================================================

export class StormPhaseHandler implements PhaseHandler {
  readonly phase = Phase.STORM;

  private context: StormPhaseContext = {
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

  initialize(state: GameState): PhaseStepResult {
    // Reset context
    this.context = {
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

    const events: PhaseEvent[] = [];
    const pendingRequests: AgentRequest[] = [];

    // Check if Fremen should use Storm Deck (advanced rules, turn > 1)
    if (this.shouldUseStormDeck(state)) {
      // Fremen uses Storm Deck instead of dialing
      const revealResult = this.revealStormCard(state);
      this.context.stormMovement = revealResult.movement;

      // IMPORTANT: Immediately continue with the normal post-movement flow
      // (Family Atomics → Weather Control → applyStormMovement) instead of
      // waiting for a no-op processStep call. This guarantees that after the
      // storm card is revealed, the phase will either:
      //   - request decisions for Family Atomics / Weather Control, OR
      //   - apply storm movement and complete the phase.
      const deckFlowResult = this.checkFamilyAtomics(state);

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
    const dialers = this.getStormDialers(state);

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

    this.context.dialingFactions = dialers;

    // Note: PhaseManager emits PHASE_STARTED event, so we don't emit it here

    // Request dial values from the two players
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

  processStep(state: GameState, responses: AgentResponse[]): PhaseStepResult {
    // Step 1: Process dial responses (if not yet dialed)
    if (this.context.stormMovement === null) {
      return this.processDialResponses(state, responses);
    }

    // Step 2: After dials are calculated, check for Family Atomics
    if (
      !this.context.familyAtomicsUsed &&
      !this.context.waitingForFamilyAtomics
    ) {
      return this.checkFamilyAtomics(state);
    }

    // Step 3: Process Family Atomics response (if waiting)
    if (this.context.waitingForFamilyAtomics) {
      // CRITICAL: If we're waiting for Family Atomics but got empty responses,
      // treat as passes and continue (defensive against agent/provider failures)
      if (responses.length === 0) {
        console.log(
          "[DEBUG] Waiting for Family Atomics but got empty responses - treating as passes"
        );
        this.context.waitingForFamilyAtomics = false;
        this.context.familyAtomicsUsed = true;
        return this.checkWeatherControl(state);
      }
      return this.processFamilyAtomics(state, responses);
    }

    // Step 4: After Family Atomics (or if not used), check for Weather Control
    // CRITICAL: Only check if we haven't already handled Weather Control
    if (
      !this.context.weatherControlUsed &&
      !this.context.waitingForWeatherControl
    ) {
      return this.checkWeatherControl(state);
    }

    // Step 5: Process Weather Control response (if waiting)
    // CRITICAL: Only process if we're actually waiting AND haven't already used it
    if (this.context.waitingForWeatherControl) {
      // Double-check: if already used, skip processing (shouldn't happen but safety check)
      if (this.context.weatherControlUsed) {
        console.log(
          "[DEBUG] Weather Control already used, skipping processWeatherControl"
        );
        this.context.waitingForWeatherControl = false;
        return this.applyStormMovement(state);
      }
      // CRITICAL: If we're waiting for Weather Control but got empty responses,
      // treat as passes and continue (defensive against agent/provider failures)
      if (responses.length === 0) {
        console.log(
          "[DEBUG] Waiting for Weather Control but got empty responses - treating as passes"
        );
        this.context.waitingForWeatherControl = false;
        this.context.weatherControlUsed = true;
        return this.applyStormMovement(state);
      }
      return this.processWeatherControl(state, responses);
    }

    // Step 6: All cards processed - now apply movement
    return this.applyStormMovement(state);
  }

  cleanup(state: GameState): GameState {
    // Reset context for next turn
    this.context = {
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
    return state;
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Check if Fremen should use Storm Deck (advanced rules, turn > 1)
   */
  private shouldUseStormDeck(state: GameState): boolean {
    return (
      state.factions.has(Faction.FREMEN) &&
      state.config.advancedRules &&
      state.turn > 1
    );
  }

  /**
   * Validate and parse storm card value
   */
  private parseStormCardValue(
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
  private drawStormCard(state: GameState): {
    state: GameState;
    card: number | null;
    error: string | null;
  } {
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
  private returnCardToStormDeckAndShuffle(
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
  private storeStormCardForFremen(
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
  private revealStormCard(state: GameState): {
    movement: number;
    cardValue: string;
    events: PhaseEvent[];
  } {
    const fremenState = getFactionState(state, Faction.FREMEN);
    const stormCardValue = fremenState.fremenStormCard;
    const events: PhaseEvent[] = [];

    const movement = this.parseStormCardValue(stormCardValue);
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
   * Handle storm deck operations after movement (return card, shuffle, draw new)
   */
  private handleStormDeckAfterMovement(
    state: GameState,
    events: PhaseEvent[]
  ): { state: GameState; events: PhaseEvent[] } {
    const fremenState = getFactionState(state, Faction.FREMEN);
    const revealedCardValue = this.parseStormCardValue(
      fremenState.fremenStormCard
    );

    if (state.turn === 1) {
      // Turn 1: Draw a card from storm deck for turn 2 (face down)
      const drawResult = this.drawStormCard(state);
      if (drawResult.error || drawResult.card === null) {
        console.error(`⚠️  WARNING: ${drawResult.error || "Cannot draw card"}`);
        return { state, events };
      }

      const newState = this.storeStormCardForFremen(
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
        updatedState = this.returnCardToStormDeckAndShuffle(
          updatedState,
          revealedCardValue
        );
      }

      // Draw new card for next turn
      const drawResult = this.drawStormCard(updatedState);
      if (drawResult.error || drawResult.card === null) {
        console.error(
          `⚠️  WARNING: ${drawResult.error || "Cannot draw card after shuffle"}`
        );
        return { state: updatedState, events };
      }

      const newState = this.storeStormCardForFremen(
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
   * Helper function to ensure two distinct dialers are selected.
   * If dialer1 === dialer2, finds a distinct second faction from available factions.
   */
  private ensureTwoDistinctDialers(
    dialer1: Faction,
    dialer2: Faction,
    availableFactions: Faction[]
  ): [Faction, Faction] {
    if (dialer1 === dialer2) {
      console.error(
        `\n❌ ERROR: Duplicate dialers detected: ${FACTION_NAMES[dialer1]}`
      );
      console.error(
        `   Attempting to find distinct second dialer from available factions...`
      );

      // Find a distinct faction from available factions
      const distinctFactions = availableFactions.filter((f) => f !== dialer1);

      if (distinctFactions.length === 0) {
        throw new Error(
          `Cannot select two different dialers - only one faction (${FACTION_NAMES[dialer1]}) is available. This should not happen in a valid game state.`
        );
      }

      // Use the first distinct faction as fallback
      dialer2 = distinctFactions[0];
      console.error(
        `   ✅ Fixed: Selected ${FACTION_NAMES[dialer2]} as second dialer`
      );
    }

    return [dialer1, dialer2];
  }

  private getStormDialers(state: GameState): [Faction, Faction] {
    const factions = Array.from(state.factions.keys());
    const playerPositions = getPlayerPositions(state);

    if (state.turn === 1) {
      // First turn: two players nearest Storm Start Sector (sector 0) on either side
      const stormStartSector = 0;

      // Find all factions with their distances from storm start
      // We need to find the nearest on EITHER side (before and after sector 0)
      const factionsWithInfo = factions.map((faction) => {
        const position = playerPositions.get(faction) ?? 0;
        // Calculate counterclockwise distance from storm start (forward/after)
        const distanceForward =
          (position - stormStartSector + GAME_CONSTANTS.TOTAL_SECTORS) %
          GAME_CONSTANTS.TOTAL_SECTORS;
        // Calculate clockwise distance (backward/before) - going the other way around
        // If position is 0, backward distance is 0. Otherwise, it's 18 - forward distance
        const distanceBackward =
          position === stormStartSector
            ? GAME_CONSTANTS.TOTAL_SECTORS // At start, treat as far
            : (stormStartSector - position + GAME_CONSTANTS.TOTAL_SECTORS) %
              GAME_CONSTANTS.TOTAL_SECTORS;
        return {
          faction,
          position,
          distanceForward,
          distanceBackward,
          // If at sector 0, treat as very far (not a dialer)
          isAtStart: position === stormStartSector,
        };
      });

      // Filter out faction at sector 0 (if any), then find nearest forward and backward
      const notAtStart = factionsWithInfo.filter((f) => !f.isAtStart);

      // Find nearest forward (after sector 0, counterclockwise)
      const nearestForward = notAtStart.reduce(
        (min, curr) =>
          curr.distanceForward < min.distanceForward ? curr : min,
        notAtStart[0] || factionsWithInfo[0]
      );

      // Find nearest backward (before sector 0, clockwise)
      const nearestBackward = notAtStart.reduce(
        (min, curr) =>
          curr.distanceBackward < min.distanceBackward ? curr : min,
        notAtStart[0] || factionsWithInfo[0]
      );

      // If we have both, use them. Otherwise fall back to two nearest overall
      let dialer1: Faction;
      let dialer2: Faction;

      if (
        nearestForward &&
        nearestBackward &&
        nearestForward.faction !== nearestBackward.faction
      ) {
        dialer1 = nearestForward.faction;
        dialer2 = nearestBackward.faction;
      } else {
        // Fallback: two nearest overall (excluding any at sector 0)
        const sorted =
          notAtStart.length > 0
            ? [...notAtStart].sort(
                (a, b) => a.distanceForward - b.distanceForward
              )
            : [...factionsWithInfo].sort(
                (a, b) => a.distanceForward - b.distanceForward
              );
        dialer1 = sorted[0]?.faction ?? factions[0];
        // Fix: Find distinct second faction, don't fallback to same as dialer1
        dialer2 =
          sorted[1]?.faction ??
          sorted.find((f) => f.faction !== dialer1)?.faction ??
          factions.find((f) => f !== dialer1) ??
          factions[0];
      }

      // Log for debugging
      console.log("\n" + "=".repeat(80));
      console.log("🌪️  INITIAL STORM PLACEMENT (Turn 1)");
      console.log("=".repeat(80));
      console.log(`\n📍 Storm Start Sector: ${stormStartSector}`);
      console.log("\n📊 Player Positions (relative to Storm Start Sector 0):");
      factionsWithInfo.forEach(
        ({
          faction,
          position,
          distanceForward,
          distanceBackward,
          isAtStart,
        }) => {
          if (isAtStart) {
            console.log(
              `  ${FACTION_NAMES[faction]}: Sector ${position} ⚠️  (AT Storm Start - not a dialer)`
            );
          } else {
            const direction =
              distanceForward < distanceBackward ? "forward" : "backward";
            const dist = Math.min(distanceForward, distanceBackward);
            console.log(
              `  ${
                FACTION_NAMES[faction]
              }: Sector ${position} (${dist} sectors ${
                direction === "forward" ? "after" : "before"
              } storm start)`
            );
          }
        }
      );
      // Validate dialers are distinct before returning
      [dialer1, dialer2] = this.ensureTwoDistinctDialers(
        dialer1,
        dialer2,
        factions
      );

      console.log(
        `\n🎯 Dialers: ${FACTION_NAMES[dialer1]} and ${FACTION_NAMES[dialer2]}`
      );
      if (dialer1 === dialer2) {
        console.warn(
          `   ⚠️  WARNING: Same faction selected twice! Only ${FACTION_NAMES[dialer1]} will dial.`
        );
      } else {
        // Log reasoning for selection
        const dialer1Info = factionsWithInfo.find((f) => f.faction === dialer1);
        const dialer2Info = factionsWithInfo.find((f) => f.faction === dialer2);
        if (dialer1Info && dialer2Info) {
          const dialer1Reason =
            dialer1Info === nearestForward
              ? "nearest forward (after storm start)"
              : dialer1Info === nearestBackward
              ? "nearest backward (before storm start)"
              : "fallback selection";
          const dialer2Reason =
            dialer2Info === nearestForward
              ? "nearest forward (after storm start)"
              : dialer2Info === nearestBackward
              ? "nearest backward (before storm start)"
              : "fallback selection";
          console.log(
            `   ${FACTION_NAMES[dialer1]}: Selected as ${dialer1Reason}`
          );
          console.log(
            `   ${FACTION_NAMES[dialer2]}: Selected as ${dialer2Reason}`
          );
        }
      }
      console.log(
        "   (Two players nearest to Storm Start Sector on either side)"
      );
      console.log("=".repeat(80) + "\n");

      return [dialer1, dialer2];
    }

    // Later turns: players who last used battle wheels
    // Since we don't track battle participation, we use the two players whose
    // markers are nearest to the storm position on either side:
    // 1. The player marker at or immediately after the storm (counterclockwise)
    // 2. The player marker closest before the storm (clockwise from storm)
    //
    // SPECIAL RULE: If someone is on the storm sector (same sector as storm),
    // they are a dialer AND the next person in storm order is also a dialer.

    const currentStormSector = state.stormSector;

    // Find all factions with their distances from storm
    const factionsWithInfo = factions.map((faction) => {
      const position = playerPositions.get(faction) ?? 0;
      // Calculate counterclockwise distance from storm (after/ahead)
      const distanceForward =
        (position - currentStormSector + GAME_CONSTANTS.TOTAL_SECTORS) %
        GAME_CONSTANTS.TOTAL_SECTORS;
      // Calculate clockwise distance (before/behind)
      const distanceBackward =
        (currentStormSector - position + GAME_CONSTANTS.TOTAL_SECTORS) %
        GAME_CONSTANTS.TOTAL_SECTORS;
      return {
        faction,
        position,
        distanceForward,
        distanceBackward,
        isOnStorm: distanceForward === 0,
      };
    });

    // Check if any faction is on the storm sector
    const factionOnStorm = factionsWithInfo.find((f) => f.isOnStorm);

    let dialer1: Faction;
    let dialer2: Faction;

    if (factionOnStorm) {
      // SPECIAL CASE: Someone is on the storm sector
      // Rule: They are a dialer AND the next person in storm order is also a dialer
      dialer1 = factionOnStorm.faction;

      // Calculate storm order to find who would be "next in storm order"
      // Since the person on the storm is last in storm order, the "next person"
      // is the first person in storm order
      const stormOrder = calculateStormOrder(state);
      // The first person in storm order is the one who comes after the person on the storm
      dialer2 = stormOrder[0]!;

      // Validate that dialer2 is different from dialer1
      if (dialer2 === dialer1) {
        // If same, find next distinct faction in storm order
        dialer2 =
          stormOrder.find((f) => f !== dialer1) ??
          factions.find((f) => f !== dialer1) ??
          dialer1; // Fallback, will be caught by validation
      }

      console.log("\n" + "=".repeat(80));
      console.log("🌪️  STORM MOVEMENT (Turn " + state.turn + ")");
      console.log("=".repeat(80));
      console.log(`\n📍 Current Storm Sector: ${currentStormSector}`);
      console.log("\n📊 Player Positions (relative to Storm):");
      factionsWithInfo.forEach(
        ({
          faction,
          position,
          distanceForward,
          distanceBackward,
          isOnStorm,
        }) => {
          if (isOnStorm) {
            console.log(
              `  ${FACTION_NAMES[faction]}: Sector ${position} ⚠️  (ON STORM - is a dialer)`
            );
          } else {
            console.log(
              `  ${FACTION_NAMES[faction]}: Sector ${position} (${distanceForward} sectors ahead, ${distanceBackward} sectors behind)`
            );
          }
        }
      );
      console.log(
        `\n🎯 Dialers: ${FACTION_NAMES[dialer1]} and ${FACTION_NAMES[dialer2]}`
      );
      console.log(
        `   ${FACTION_NAMES[dialer1]}: ON STORM SECTOR (is a dialer)`
      );
      // Validate dialers are distinct before returning
      [dialer1, dialer2] = this.ensureTwoDistinctDialers(
        dialer1,
        dialer2,
        factions
      );

      // After validation, dialers are guaranteed to be distinct
      console.log(
        `   ${FACTION_NAMES[dialer1]}: ON STORM SECTOR (is a dialer)`
      );
      console.log(
        `   ${FACTION_NAMES[dialer2]}: NEXT IN STORM ORDER (also a dialer)`
      );
      console.log(
        "   (Rule: If someone is below the storm, they are a dialer AND the next person in storm order too)"
      );
      console.log("=".repeat(80) + "\n");

      return [dialer1, dialer2];
    }

    // NORMAL CASE: No one is on the storm sector
    // Find nearest forward (at or after storm, counterclockwise)
    // This is the player marker the storm "approaches next" or is on top of
    const nearestForward = factionsWithInfo.reduce((min, curr) =>
      curr.distanceForward < min.distanceForward ? curr : min
    );

    // Find nearest backward (before storm, clockwise)
    // This is the player marker closest to storm going the other direction
    const nearestBackward = factionsWithInfo.reduce((min, curr) =>
      curr.distanceBackward < min.distanceBackward ? curr : min
    );

    dialer1 = nearestForward.faction;
    dialer2 = nearestBackward.faction;

    // Validation: Ensure we have two different factions
    // If both point to the same faction (e.g., all factions clustered on one side),
    // fall back to selecting the two nearest distinct factions
    if (dialer1 === dialer2) {
      console.warn(
        `\n⚠️  WARNING: Nearest forward and backward are the same faction (${FACTION_NAMES[dialer1]}).`
      );
      console.warn(
        "   This usually means all factions are clustered on one side of the storm."
      );
      console.warn(
        "   Falling back to selecting two nearest distinct factions..."
      );

      // Find the two nearest distinct factions
      // Sort by forward distance (counterclockwise from storm)
      const sortedByForward = [...factionsWithInfo].sort(
        (a, b) => a.distanceForward - b.distanceForward
      );
      dialer1 = sortedByForward[0]!.faction;
      // Find second nearest that's different from first
      dialer2 =
        sortedByForward.find((f) => f.faction !== dialer1)?.faction ??
        // If no forward distinct, try backward
        factionsWithInfo
          .filter((f) => f.faction !== dialer1)
          .sort((a, b) => a.distanceBackward - b.distanceBackward)[0]
          ?.faction ??
        // Last resort: any distinct faction
        factions.find((f) => f !== dialer1) ??
        dialer1;

      if (dialer1 === dialer2) {
        console.error(
          `\n❌ ERROR: Only one faction available for storm dialing: ${FACTION_NAMES[dialer1]}`
        );
        console.error(
          "   This should not happen in a valid game state. Will use validation helper."
        );
      } else {
        console.warn(
          `   ✅ Fallback selected: ${FACTION_NAMES[dialer1]} and ${FACTION_NAMES[dialer2]}`
        );
      }
    }

    // Final validation using helper function
    [dialer1, dialer2] = this.ensureTwoDistinctDialers(
      dialer1,
      dialer2,
      factions
    );

    console.log("\n" + "=".repeat(80));
    console.log("🌪️  STORM MOVEMENT (Turn " + state.turn + ")");
    console.log("=".repeat(80));
    console.log(`\n📍 Current Storm Sector: ${currentStormSector}`);
    console.log("\n📊 Player Positions (relative to Storm):");
    factionsWithInfo.forEach(
      ({ faction, position, distanceForward, distanceBackward, isOnStorm }) => {
        if (isOnStorm) {
          console.log(
            `  ${FACTION_NAMES[faction]}: Sector ${position} ⚠️  (ON STORM)`
          );
        } else {
          console.log(
            `  ${FACTION_NAMES[faction]}: Sector ${position} (${distanceForward} sectors ahead, ${distanceBackward} sectors behind)`
          );
        }
      }
    );
    console.log(
      `\n🎯 Dialers: ${FACTION_NAMES[dialer1]} and ${FACTION_NAMES[dialer2]}`
    );
    if (dialer1 === dialer2) {
      console.warn(
        `   ⚠️  WARNING: Same faction selected twice! Only ${FACTION_NAMES[dialer1]} will dial.`
      );
      console.warn(
        "   This should have been fixed by validation. Please investigate."
      );
    } else {
      // Show detailed reasoning for selection
      const dialer1Info = factionsWithInfo.find((f) => f.faction === dialer1);
      const dialer2Info = factionsWithInfo.find((f) => f.faction === dialer2);

      if (dialer1Info && dialer2Info) {
        if (dialer1 === nearestForward.faction) {
          console.log(
            `   ${FACTION_NAMES[dialer1]}: Nearest at/after storm (${dialer1Info.distanceForward} sectors counterclockwise)`
          );
        } else {
          console.log(
            `   ${FACTION_NAMES[dialer1]}: Selected as fallback (sector ${dialer1Info.position}, ${dialer1Info.distanceForward} sectors ahead)`
          );
        }

        if (dialer2 === nearestBackward.faction) {
          console.log(
            `   ${FACTION_NAMES[dialer2]}: Nearest before storm (${dialer2Info.distanceBackward} sectors clockwise)`
          );
        } else {
          console.log(
            `   ${FACTION_NAMES[dialer2]}: Selected as fallback (sector ${dialer2Info.position}, ${dialer2Info.distanceBackward} sectors behind)`
          );
        }
      }
    }
    console.log(
      "   (Two players whose markers are nearest to storm on either side)"
    );
    console.log("=".repeat(80) + "\n");

    return [dialer1, dialer2];
  }

  private processDialResponses(
    state: GameState,
    responses: AgentResponse[]
  ): PhaseStepResult {
    const events: PhaseEvent[] = [];
    const maxDial =
      state.turn === 1
        ? GAME_CONSTANTS.FIRST_STORM_MAX_DIAL
        : GAME_CONSTANTS.MAX_STORM_DIAL;

    console.log("\n" + "=".repeat(80));
    console.log("🎲 STORM DIAL REVEAL");
    console.log("=".repeat(80));

    // Collect dial values
    for (const response of responses) {
      // Tool name 'dial_storm' becomes 'DIAL_STORM' actionType
      if (response.actionType === "DIAL_STORM") {
        // Tool returns 'dial' property
        let dialValue = Number(response.data.dial ?? 0);

        // Clamp to valid range
        if (state.turn === 1) {
          dialValue = Math.max(0, Math.min(maxDial, dialValue));
        } else {
          dialValue = Math.max(1, Math.min(maxDial, dialValue));
        }

        this.context.dials.set(response.factionId, dialValue);

        console.log(
          `\n  ${FACTION_NAMES[response.factionId]}: ${dialValue} (range: ${
            state.turn === 1 ? "0-20" : "1-3"
          })`
        );

        events.push({
          type: "STORM_DIAL_REVEALED",
          data: { faction: response.factionId, value: dialValue },
          message: `${response.factionId} dials ${dialValue}`,
        });
      }
    }

    // Step 3: Check for missing responses
    const dialResponses = responses.filter(
      (r) => r.actionType === "DIAL_STORM"
    );
    if (dialResponses.length === 0) {
      console.error(`\n❌ ERROR: No storm dial responses received.`);
      console.error(`   Expected 2 dial responses, got 0.`);
      console.error(`   Cannot calculate storm movement.`);
      throw new Error(
        "No storm dial responses received - cannot proceed with storm phase"
      );
    }

    // Check for missing expected dialers
    const expectedDialers = this.context.dialingFactions;
    if (expectedDialers) {
      const respondedFactions = new Set(Array.from(this.context.dials.keys()));
      const missingDialers = expectedDialers.filter(
        (f) => !respondedFactions.has(f)
      );

      if (missingDialers.length > 0) {
        console.error(
          `\n❌ ERROR: Missing dial responses from: ${missingDialers
            .map((f) => FACTION_NAMES[f])
            .join(", ")}`
        );
        console.error(
          `   Expected dials from: ${expectedDialers
            .map((f) => FACTION_NAMES[f])
            .join(", ")}`
        );
      }
    }

    // Step 1: Validate dial response count
    const expectedDialCount = 2; // Always expect 2 dials when this method is called (storm deck skips this)
    const actualDialCount = this.context.dials.size;

    if (actualDialCount !== expectedDialCount) {
      console.error(
        `\n❌ ERROR: Expected ${expectedDialCount} dial responses, got ${actualDialCount}`
      );
      console.error(
        `   Received dials from: ${Array.from(this.context.dials.keys())
          .map((f) => FACTION_NAMES[f])
          .join(", ")}`
      );

      // If we have at least one dial, continue with warning
      // Note: actualDialCount === 0 case already handled above (lines 985-992 throws error)
      if (actualDialCount === 1) {
        console.warn(
          `   ⚠️  WARNING: Only one dial received. Movement will be incorrect (should be sum of two dials).`
        );
      }
      // actualDialCount === 0 is unreachable here (already thrown error above)
    }

    // Calculate total movement
    let totalMovement = 0;
    for (const value of this.context.dials.values()) {
      totalMovement += value;
    }
    this.context.stormMovement = totalMovement;

    // Step 2: Validate minimum movement
    if (state.turn === 1) {
      if (totalMovement < 0 || totalMovement > 40) {
        console.error(
          `\n❌ ERROR: Invalid movement for Turn 1: ${totalMovement} (expected 0-40)`
        );
        console.error(
          `   This suggests incorrect dial values or calculation error.`
        );
      }
    } else {
      // Turn 2+: Should be 2-6 (two dials of 1-3)
      if (totalMovement < 2 || totalMovement > 6) {
        console.error(
          `\n❌ ERROR: Invalid movement for Turn ${state.turn}: ${totalMovement} (expected 2-6)`
        );
        console.error(
          `   This suggests incorrect dial values, missing dial, or calculation error.`
        );

        // Check if it's because of missing dial
        if (actualDialCount === 1) {
          console.error(
            `   Root cause: Only one dial received instead of two.`
          );
        }
      }
    }

    console.log(`\n  📊 Total: ${totalMovement} sectors`);

    // Step 4: Enhanced logging for single dial warning
    if (this.context.dials.size === 1) {
      const dialer = Array.from(this.context.dials.keys())[0];
      const expectedDialersForLogging = this.context.dialingFactions;
      const missingDialer = expectedDialersForLogging?.find(
        (f) => f !== dialer
      );

      console.warn(
        `\n  ⚠️  WARNING: Only one dial received (from ${FACTION_NAMES[dialer]})`
      );
      if (missingDialer) {
        console.warn(
          `   Expected dial from ${FACTION_NAMES[missingDialer]} but none received.`
        );
      }
      console.warn(
        `   Movement will be incorrect (single dial value instead of sum of two dials).`
      );
      console.warn(
        `   Expected range: ${
          state.turn === 1 ? "0-40" : "2-6"
        }, Actual: ${totalMovement}`
      );
    }

    console.log("=".repeat(80) + "\n");

    // Lock in the movement (but don't apply yet - need to check for cards)
    // Now check for Family Atomics (after movement calculated, before moved)
    return this.checkFamilyAtomics(state);
  }

  private applyStormMovement(state: GameState): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;

    // Validate that stormMovement is not null before applying
    if (this.context.stormMovement === null) {
      console.error(
        `\n❌ ERROR: Cannot apply storm movement - stormMovement is null`
      );
      console.error(
        `   This should not happen. Storm movement should be calculated before applying.`
      );
      throw new Error(
        "Cannot apply storm movement - movement value is null. This indicates a bug in the storm phase handler."
      );
    }

    const movement = this.context.stormMovement;
    const oldSector = state.turn === 1 ? 0 : state.stormSector; // Turn 1 starts from Storm Start Sector (0)

    // Step 5: Validate movement range based on turn and context
    // Note: Weather Control can set movement to 0-10, so check context
    const isWeatherControl = this.context.weatherControlUsed;

    if (state.turn === 1) {
      // Turn 1: 0-40 valid (two dials of 0-20)
      if (movement < 0 || movement > 40) {
        console.error(
          `\n❌ ERROR: Invalid movement for Turn 1: ${movement} (expected 0-40)`
        );
      }
    } else {
      if (isWeatherControl) {
        // Weather Control: 0-10 valid
        if (movement < 0 || movement > 10) {
          console.error(
            `\n❌ ERROR: Invalid movement from Weather Control: ${movement} (expected 0-10)`
          );
        }
      } else {
        // Normal Turn 2+: 2-6 valid (two dials of 1-3)
        if (movement < 2 || movement > 6) {
          console.error(
            `\n❌ ERROR: Invalid movement for Turn ${state.turn}: ${movement} (expected 2-6)`
          );
          console.error(
            `   This should not happen with valid dials. Check for bugs.`
          );
        }
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("🌪️  STORM MOVEMENT CALCULATION");
    console.log("=".repeat(80));
    console.log(
      `\n  Starting Sector: ${oldSector}${
        state.turn === 1 ? " (Storm Start Sector)" : ""
      }`
    );
    console.log(`  Movement: ${movement} sectors counterclockwise`);

    // Move storm
    // Wrapping logic: (oldSector + movement) % TOTAL_SECTORS
    // This correctly handles:
    // - Normal movement: e.g., (5 + 3) % 18 = 8
    // - Wrapping: e.g., (17 + 3) % 18 = 2
    // - Full wrap: e.g., (0 + 18) % 18 = 0, (0 + 20) % 18 = 2
    // - Multiple wraps: e.g., (0 + 36) % 18 = 0, (5 + 36) % 18 = 5
    const newSector = (oldSector + movement) % GAME_CONSTANTS.TOTAL_SECTORS;
    console.log(`  Ending Sector: ${newSector}`);

    // Validate wrapping logic
    // Verify that newSector is in valid range [0, TOTAL_SECTORS-1]
    if (newSector < 0 || newSector >= GAME_CONSTANTS.TOTAL_SECTORS) {
      console.error(
        `\n❌ ERROR: Invalid newSector calculated: ${newSector} (expected 0-${
          GAME_CONSTANTS.TOTAL_SECTORS - 1
        })`
      );
      console.error(
        `   oldSector: ${oldSector}, movement: ${movement}, calculation: (${oldSector} + ${movement}) % ${GAME_CONSTANTS.TOTAL_SECTORS}`
      );
      throw new Error(
        `Invalid storm sector calculated: ${newSector}. This indicates a bug in the wrapping logic.`
      );
    }

    // Update state with new sector
    newState = moveStorm(newState, newSector);

    // Validate that moveStorm() correctly updated the state
    if (newState.stormSector !== newSector) {
      console.error(
        `\n❌ ERROR: moveStorm() did not correctly update storm sector`
      );
      console.error(
        `   Expected: ${newSector}, Actual: ${newState.stormSector}`
      );
      throw new Error(
        `State mutation failed - storm sector not updated correctly. Expected ${newSector}, got ${newState.stormSector}.`
      );
    }

    // Validate that storm sector actually changed (unless movement is 0, which is valid for Turn 1 or Weather Control)
    // Note: isWeatherControl already declared above
    const isMovementZeroValid =
      state.turn === 1 || (state.turn > 1 && isWeatherControl);

    if (newState.stormSector === oldSector && !isMovementZeroValid) {
      console.error(
        `\n❌ ERROR: Storm sector did not change after movement (${oldSector} → ${newState.stormSector})`
      );
      console.error(
        `   Movement: ${movement}, Turn: ${state.turn}, Weather Control: ${isWeatherControl}`
      );
      console.error(
        `   For Turn ${state.turn} (normal), movement should be 2-6, so storm should always move.`
      );
      // Don't throw error - allow phase to complete, but log the issue
      // This could happen if movement is 0 or wrapping calculation is wrong
    } else if (newState.stormSector === oldSector && isMovementZeroValid) {
      console.log(
        `\n  ℹ️  INFO: Storm did not move (movement = 0, which is valid for ${
          state.turn === 1 ? "Turn 1" : "Weather Control"
        })`
      );
    } else {
      console.log(
        `\n  ✅ Storm moved from sector ${oldSector} to sector ${newState.stormSector}`
      );
    }

    // Calculate affected sectors based on movement amount (handles wrapping correctly)
    const sectorsAffected = getAffectedSectors(oldSector, movement);

    events.push({
      type: "STORM_MOVED",
      data: {
        from: oldSector,
        to: newSector,
        movement,
        sectorsAffected,
      },
      message: `Storm moves ${movement} sectors (${oldSector} → ${newSector})`,
    });

    // Destroy forces and spice in storm path
    // NOTE: Use original state (before storm moved) to check what exists,
    // since moveStorm() only updates stormSector and doesn't affect forces/spice
    const destroyedForces = this.destroyForcesInStorm(
      state,
      oldSector,
      movement
    );
    const destroyedSpice = this.destroySpiceInStorm(
      state,
      oldSector,
      movement
    );

    // Apply destruction
    for (const destruction of destroyedForces) {
      newState = sendForcesToTanks(
        newState,
        destruction.faction,
        destruction.territoryId,
        destruction.sector,
        destruction.count
      );

      events.push({
        type: "FORCES_KILLED_BY_STORM",
        data: destruction,
        message: `${destruction.count} ${destruction.faction} forces destroyed by storm in ${destruction.territoryId}`,
      });
    }

    for (const destruction of destroyedSpice) {
      newState = destroySpiceInTerritory(
        newState,
        destruction.territoryId,
        destruction.sector
      );

      events.push({
        type: "SPICE_DESTROYED_BY_STORM",
        data: destruction,
        message: `${destruction.amount} spice destroyed by storm in ${destruction.territoryId}`,
      });
    }

    // Update storm order based on new storm position
    // Note: calculateStormOrder now uses state.playerPositions internally
    const newOrder = calculateStormOrder(newState);
    newState = updateStormOrder(newState, newOrder);

    // If Fremen is in play with advanced rules, handle storm deck
    if (
      newState.factions.has(Faction.FREMEN) &&
      newState.config.advancedRules
    ) {
      const deckResult = this.handleStormDeckAfterMovement(newState, events);
      newState = deckResult.state;
      // Events are already added to the events array by handleStormDeckAfterMovement
    }

    // Log storm order calculation
    console.log("\n" + "=".repeat(80));
    console.log("📋 STORM ORDER DETERMINATION");
    console.log("=".repeat(80));
    console.log(`\n  Storm Position: Sector ${newSector}`);
    console.log("\n  Player Positions:");
    const playerPositions = getPlayerPositions(newState);
    const factions = Array.from(newState.factions.keys());
    factions.forEach((faction) => {
      const position = playerPositions.get(faction) ?? 0;
      const distance =
        (position - newSector + GAME_CONSTANTS.TOTAL_SECTORS) %
        GAME_CONSTANTS.TOTAL_SECTORS;
      const isOnStorm = distance === 0;
      const marker = isOnStorm ? " ⚠️  (ON STORM - goes last)" : "";
      console.log(
        `    ${FACTION_NAMES[faction]}: Sector ${position} (distance: ${distance}${marker})`
      );
    });
    console.log("\n  Storm Order (First → Last):");
    newOrder.forEach((faction, index) => {
      const position = playerPositions.get(faction) ?? 0;
      const distance =
        (position - newSector + GAME_CONSTANTS.TOTAL_SECTORS) %
        GAME_CONSTANTS.TOTAL_SECTORS;
      console.log(
        `    ${index + 1}. ${
          FACTION_NAMES[faction]
        } (Sector ${position}, distance: ${distance})`
      );
    });
    console.log(`\n  ✅ First Player: ${FACTION_NAMES[newOrder[0]]}`);
    console.log("=".repeat(80) + "\n");

    // Log the action
    newState = logAction(newState, "STORM_MOVED", null, {
      from: oldSector,
      to: newSector,
      movement,
    });

    return {
      state: newState,
      phaseComplete: true,
      nextPhase: Phase.SPICE_BLOW,
      pendingRequests: [],
      actions: [],
      events,
    };
  }

  private destroyForcesInStorm(
    state: GameState,
    fromSector: number,
    movement: number
  ): {
    faction: Faction;
    territoryId: TerritoryId;
    sector: number;
    count: number;
  }[] {
    const destroyed: {
      faction: Faction;
      territoryId: TerritoryId;
      sector: number;
      count: number;
    }[] = [];
    // Get all affected sectors based on movement (handles wrapping correctly)
    const affectedSectors = new Set(getAffectedSectors(fromSector, movement));

    // Check each territory
    for (const [territoryId, territory] of Object.entries(
      TERRITORY_DEFINITIONS
    )) {
      // Skip territories that are not affected by storm (protected or wrong type)
      if (!isTerritoryAffectedByStorm(state, territoryId as TerritoryId))
        continue;

      // Check if any sector of this territory is in the storm
      for (const sector of territory.sectors) {
        if (!affectedSectors.has(sector)) continue;

        // Find forces in this sector
        for (const [faction, factionState] of state.factions) {
          // Check for protected leaders in this territory/sector
          // Per battle.md line 23: "SURVIVING LEADERS: Leaders who survive remain in the
          // Territory where they were used. (Game effects do not kill these leaders while there.)"
          const protectedLeaders = getProtectedLeaders(state, faction);
          if (protectedLeaders.length > 0) {
            const leadersInTerritory = factionState.leaders.filter(
              (l) =>
                l.location === LeaderLocation.ON_BOARD &&
                l.usedInTerritoryId === territoryId
            );
            if (leadersInTerritory.length > 0) {
              console.log(
                `   🛡️  ${leadersInTerritory.length} ${FACTION_NAMES[faction]} leader(s) protected from storm in ${territoryId}`
              );
            }
          }

          // Fremen lose half forces (rounded up) in storm
          const forceStack = factionState.forces.onBoard.find(
            (f) => f.territoryId === territoryId && f.sector === sector
          );

          if (forceStack) {
            const totalForces =
              forceStack.forces.regular + forceStack.forces.elite;
            let lostForces = totalForces;

            // Fremen only lose half
            if (faction === Faction.FREMEN) {
              lostForces = Math.ceil(totalForces / 2);
            }

            if (lostForces > 0) {
              destroyed.push({
                faction,
                territoryId: territoryId as TerritoryId,
                sector,
                count: lostForces,
              });
            }
          }
        }
      }
    }

    return destroyed;
  }

  /**
   * Identify spice to be destroyed by storm movement.
   * 
   * Spice is destroyed in all sectors where the storm starts, passes through, or stops.
   * Protected territories are skipped unless Family Atomics was played.
   * 
   * @param state - Current game state
   * @param fromSector - Starting sector (0-17)
   * @param movement - Number of sectors the storm moves
   * @returns Array of spice entries to be destroyed
   * 
   * @remarks
   * Rule 1.01.03: "any spice in a Sector which a storm passes over or stops is destroyed"
   * "stops" includes both where it starts and where it ends.
   * When movement >= TOTAL_SECTORS, storm wraps around entire board and affects all sectors.
   */
  private destroySpiceInStorm(
    state: GameState,
    fromSector: number,
    movement: number
  ): { territoryId: TerritoryId; sector: number; amount: number }[] {
    // Input validation
    if (fromSector < 0 || fromSector >= GAME_CONSTANTS.TOTAL_SECTORS) {
      console.error(`⚠️  WARNING: Invalid fromSector in destroySpiceInStorm(): ${fromSector}`);
      return [];
    }
    if (movement < 0) {
      console.error(`⚠️  WARNING: Invalid movement in destroySpiceInStorm(): ${movement}`);
      return [];
    }

    const destroyed: {
      territoryId: TerritoryId;
      sector: number;
      amount: number;
    }[] = [];
    // CRITICAL: Include starting sector, all sectors passed through, and ending sector
    // Rule 1.01.03: "any spice in a Sector which a storm passes over or stops is destroyed"
    // "stops" includes both where it starts and where it ends
    // When movement >= TOTAL_SECTORS, storm wraps around entire board and affects all sectors
    const affectedSectors = new Set(getAffectedSectors(fromSector, movement));

    console.log(`\n  🔍 Checking spice destruction:`);
    console.log(`     Storm moved from sector ${fromSector}, movement: ${movement}`);
    console.log(`     Affected sectors: [${Array.from(affectedSectors).sort((a, b) => a - b).join(', ')}]`);
    console.log(`     Total spice on board: ${state.spiceOnBoard.length}`);
    
    // Log all spice entries for debugging
    if (state.spiceOnBoard.length > 0) {
      console.log(`     Spice entries:`);
      state.spiceOnBoard.forEach((s) => {
        const inAffectedSector = affectedSectors.has(s.sector);
        const isAffected = isTerritoryAffectedByStorm(state, s.territoryId as TerritoryId);
        console.log(`       - ${s.territoryId} (sector ${s.sector}): ${s.amount} spice | In affected sector: ${inAffectedSector} | Territory affected: ${isAffected}`);
      });
    }

    // Note: Spice is destroyed in sectors where the storm starts, passes through, or stops
    // But spice in protected territories is also protected (unless Family Atomics was played)
    for (const spice of state.spiceOnBoard) {
      if (!affectedSectors.has(spice.sector)) {
        continue;
      }

      // Skip protected territories unless Family Atomics removed their protection
      const territoryAffected = isTerritoryAffectedByStorm(state, spice.territoryId as TerritoryId);
      if (!territoryAffected) {
        console.log(`     ⚠️  Skipping protected territory: ${spice.territoryId} (sector ${spice.sector})`);
        continue;
      }

      console.log(`     ✅ Destroying ${spice.amount} spice in ${spice.territoryId} (sector ${spice.sector})`);
      destroyed.push({
        territoryId: spice.territoryId,
        sector: spice.sector,
        amount: spice.amount,
      });
    }

    console.log(`     Total spice destroyed: ${destroyed.length} entries`);
    if (destroyed.length === 0 && state.spiceOnBoard.length > 0) {
      console.log(`     ⚠️  WARNING: No spice was destroyed, but there is spice on the board!`);
      console.log(`        This might indicate a bug in the destruction logic.`);
    }
    return destroyed;
  }

  // ===========================================================================
  // FAMILY ATOMICS & WEATHER CONTROL
  // ===========================================================================

  /**
   * Check if any faction can play Family Atomics and ask them
   */
  private checkFamilyAtomics(state: GameState): PhaseStepResult {
    const events: PhaseEvent[] = [];
    const pendingRequests: AgentRequest[] = [];

    // Family Atomics can only be played after Turn 1
    if (state.turn === 1) {
      // Skip to Weather Control check
      return this.checkWeatherControl(state);
    }

    // Check each faction for Family Atomics card and requirements
    for (const [faction, factionState] of state.factions) {
      // Check if faction has Family Atomics card
      const hasFamilyAtomics = factionState.hand.some((card) => {
        const def = getTreacheryCardDefinition(card.definitionId);
        return def && def.id === "family_atomics";
      });

      if (!hasFamilyAtomics) continue;

      // Check if faction meets requirements:
      // - Forces on Shield Wall OR
      // - Forces in territory adjacent to Shield Wall with no storm between
      const canPlay = this.canPlayFamilyAtomics(state, faction);

      if (canPlay) {
        pendingRequests.push({
          factionId: faction,
          requestType: "PLAY_FAMILY_ATOMICS",
          prompt: `You have Family Atomics. After storm movement is calculated (${this.context.stormMovement} sectors), you may play it to destroy all forces on the Shield Wall and remove protection from Imperial Basin, Arrakeen, and Carthag. Do you want to play Family Atomics?`,
          context: {
            calculatedMovement: this.context.stormMovement,
            turn: state.turn,
          },
          availableActions: ["PLAY_FAMILY_ATOMICS", "PASS"],
        });
      }
    }

    if (pendingRequests.length > 0) {
      this.context.waitingForFamilyAtomics = true;
      return {
        state,
        phaseComplete: false,
        pendingRequests,
        simultaneousRequests: false,
        actions: [],
        events,
      };
    }

    // No one can play Family Atomics - mark as checked and check Weather Control
    // CRITICAL: Set familyAtomicsUsed to prevent infinite re-checking in processStep
    this.context.familyAtomicsUsed = true;
    return this.checkWeatherControl(state);
  }

  /**
   * Process Family Atomics response
   */
  private processFamilyAtomics(
    state: GameState,
    responses: AgentResponse[]
  ): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;

    this.context.waitingForFamilyAtomics = false;

    // Process responses
    for (const response of responses) {
      if (response.actionType === "PLAY_FAMILY_ATOMICS" && !response.passed) {
        const faction = response.factionId;
        this.context.familyAtomicsUsed = true;
        this.context.familyAtomicsBy = faction;

        // Remove card from hand
        const factionState = getFactionState(newState, faction);
        const cardIndex = factionState.hand.findIndex((card) => {
          const def = getTreacheryCardDefinition(card.definitionId);
          return def && def.id === "family_atomics";
        });

        if (cardIndex >= 0) {
          factionState.hand.splice(cardIndex, 1);
          // Note: Family Atomics is "Set Aside" (not discarded), but we remove from hand
          // The card remains in play as a reminder (shieldWallDestroyed flag)
        }

        // Destroy all forces on Shield Wall
        const shieldWallForces = this.getForcesOnShieldWall(newState);
        for (const destruction of shieldWallForces) {
          newState = sendForcesToTanks(
            newState,
            destruction.faction,
            destruction.territoryId,
            destruction.sector,
            destruction.count
          );

          events.push({
            type: "FORCES_KILLED_BY_FAMILY_ATOMICS",
            data: destruction,
            message: `${destruction.count} ${destruction.faction} forces destroyed on Shield Wall by Family Atomics`,
          });
        }

        // Mark Shield Wall as destroyed
        newState = { ...newState, shieldWallDestroyed: true };

        // Remove protection from Imperial Basin, Arrakeen, and Carthag
        // This is done by updating territory definitions - but since they're constants,
        // we need to track this in state. For now, we'll handle it in destroyForcesInStorm
        // by checking if shieldWallDestroyed is true and if territory is one of the three cities

        events.push({
          type: "FAMILY_ATOMICS_PLAYED",
          data: { faction, shieldWallDestroyed: true },
          message: `${faction} played Family Atomics. Shield Wall destroyed. Imperial Basin, Arrakeen, and Carthag lose storm protection.`,
        });

        console.log(`\n💣 ${FACTION_NAMES[faction]} played Family Atomics!`);
        console.log(`   Shield Wall destroyed. Cities lose protection.`);
      }
    }

    // Now check for Weather Control
    return this.checkWeatherControl(newState);
  }

  /**
   * Check if any faction can play Weather Control and ask them
   */
  private checkWeatherControl(state: GameState): PhaseStepResult {
    const events: PhaseEvent[] = [];
    const pendingRequests: AgentRequest[] = [];

    // Weather Control can only be played after Turn 1
    if (state.turn === 1) {
      // Skip to applying movement
      return this.applyStormMovement(state);
    }

    // Check each faction for Weather Control card
    for (const [faction, factionState] of state.factions) {
      // Check if faction has Weather Control card
      const hasWeatherControl = factionState.hand.some((card) => {
        const def = getTreacheryCardDefinition(card.definitionId);
        return def && def.id === "weather_control";
      });

      if (!hasWeatherControl) continue;

      // Ask if they want to play it
      pendingRequests.push({
        factionId: faction,
        requestType: "PLAY_WEATHER_CONTROL",
        prompt: `You have Weather Control. You may play it to control the storm this phase. You can move it 0-10 sectors counterclockwise (0 = prevent movement, 1-10 = move that many sectors). The calculated movement is ${this.context.stormMovement} sectors. Do you want to play Weather Control?`,
        context: {
          calculatedMovement: this.context.stormMovement,
          turn: state.turn,
        },
        availableActions: ["PLAY_WEATHER_CONTROL", "PASS"],
      });
    }

    if (pendingRequests.length > 0) {
      this.context.waitingForWeatherControl = true;
      return {
        state,
        phaseComplete: false,
        pendingRequests,
        simultaneousRequests: false,
        actions: [],
        events,
      };
    }

    // No one wants to play Weather Control - mark as checked and apply movement
    // CRITICAL: Set weatherControlUsed to prevent infinite re-checking in processStep
    this.context.weatherControlUsed = true;
    return this.applyStormMovement(state);
  }

  /**
   * Process Weather Control response
   *
   * IMPORTANT: We only ask once. If agent gives invalid response, we treat it as a pass
   * and move on. We never ask again in the same phase.
   */
  private processWeatherControl(
    state: GameState,
    responses: AgentResponse[]
  ): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;

    // Mark that we've processed Weather Control - we will NEVER ask again this phase
    this.context.waitingForWeatherControl = false;
    // Mark that we've asked (even if no one played it)
    // This prevents checkWeatherControl from asking again in the same phase
    // We set weatherControlUsed = true to indicate "we've handled this, don't ask again"
    // weatherControlBy will be set if someone actually played it, null if everyone passed
    this.context.weatherControlUsed = true;

    // Process responses - only the first faction to play Weather Control gets to use it
    // If multiple factions have it, they all get asked, but only one can play it
    for (const response of responses) {
      // Handle both tool response (play_weather_control) and direct action (PLAY_WEATHER_CONTROL)
      // Tool names are converted to uppercase by parseResponse, so check both cases
      const isWeatherControl =
        response.actionType === "PLAY_WEATHER_CONTROL" ||
        response.actionType === "play_weather_control" ||
        response.actionType?.toLowerCase() === "play_weather_control";

      // Debug: log if we got a response but it's not being recognized
      if (response.factionId === Faction.HARKONNEN && responses.length > 0) {
        console.log(
          `[DEBUG] Weather Control response from ${
            FACTION_NAMES[response.factionId]
          }: actionType=${response.actionType}, passed=${
            response.passed
          }, isWeatherControl=${isWeatherControl}`
        );
      }

      // If Weather Control was already used by another faction, skip
      if (this.context.weatherControlBy !== null) {
        break;
      }

      // If this faction wants to play Weather Control (not passing)
      // NOTE: Any response that is NOT play_weather_control is treated as a pass
      // This includes view tools, invalid tool calls, or no tool calls
      if (isWeatherControl && !response.passed) {
        const faction = response.factionId;
        // weatherControlUsed is already set above, just mark who played it
        this.context.weatherControlBy = faction;

        // Get movement choice (0-10, where 0 = prevent movement)
        const movement = Number(response.data.movement ?? 0);
        const clampedMovement = Math.max(0, Math.min(10, movement));

        // Override calculated movement with Weather Control choice
        this.context.stormMovement = clampedMovement;

        // Remove card from hand (discard after use)
        const factionState = getFactionState(newState, faction);
        const cardIndex = factionState.hand.findIndex((card) => {
          const def = getTreacheryCardDefinition(card.definitionId);
          return def && def.id === "weather_control";
        });

        if (cardIndex >= 0) {
          const card = factionState.hand[cardIndex];
          // Create new state with card removed from hand
          const newHand = [...factionState.hand];
          newHand.splice(cardIndex, 1);

          // Create new faction state
          const newFactionState = {
            ...factionState,
            hand: newHand,
          };

          // Create new state with updated faction and discard pile
          newState = {
            ...newState,
            factions: new Map(newState.factions),
            treacheryDiscard: [...newState.treacheryDiscard, card],
          };
          newState.factions.set(faction, newFactionState);
        }

        events.push({
          type: "WEATHER_CONTROL_PLAYED",
          data: { faction, movement: clampedMovement },
          message: `${faction} played Weather Control. Storm movement: ${
            clampedMovement === 0 ? "no movement" : clampedMovement + " sectors"
          }`,
        });

        console.log(`\n🌤️  ${FACTION_NAMES[faction]} played Weather Control!`);
        console.log(
          `   Storm movement: ${
            clampedMovement === 0 ? "NO MOVEMENT" : clampedMovement + " sectors"
          }`
        );

        // Only one faction can play Weather Control per phase
        break;
      }
    }

    // If we got here, either:
    // 1. Someone played Weather Control (weatherControlBy is set)
    // 2. Everyone passed or gave invalid responses (weatherControlBy is null)
    //
    // Either way, we've asked once and got responses. We treat invalid responses as passes.
    // We will NEVER ask again - we move forward to apply storm movement.
    //
    // Now apply movement (either Weather Control override or normal calculated movement)
    return this.applyStormMovement(newState);
  }

  /**
   * Check if a faction can play Family Atomics
   */
  private canPlayFamilyAtomics(state: GameState, faction: Faction): boolean {
    const factionState = getFactionState(state, faction);

    // Check if forces are on Shield Wall
    const forcesOnShieldWall = factionState.forces.onBoard.some(
      (stack) => stack.territoryId === TerritoryId.SHIELD_WALL
    );

    if (forcesOnShieldWall) {
      return true;
    }

    // Check if forces are in territory adjacent to Shield Wall with no storm between
    const shieldWallDef = TERRITORY_DEFINITIONS[TerritoryId.SHIELD_WALL];
    for (const stack of factionState.forces.onBoard) {
      if (shieldWallDef.adjacentTerritories.includes(stack.territoryId)) {
        // Check if storm is between the sector and Shield Wall
        // Shield Wall is in sectors 7, 8
        const shieldWallSectors = [7, 8];
        const hasStormBetween = shieldWallSectors.some((swSector) => {
          // Check if storm is between stack.sector and swSector
          return (
            isSectorInStorm(state, stack.sector) ||
            this.isStormBetweenSectors(state, stack.sector, swSector)
          );
        });

        if (!hasStormBetween) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if storm is between two sectors
   */
  private isStormBetweenSectors(
    state: GameState,
    sector1: number,
    sector2: number
  ): boolean {
    const stormSector = state.stormSector;
    const min = Math.min(sector1, sector2);
    const max = Math.max(sector1, sector2);

    // Direct path
    if (stormSector > min && stormSector < max) {
      return true;
    }

    // Wrapped path
    if (stormSector < min || stormSector > max) {
      return true;
    }

    return false;
  }

  /**
   * Get all forces on Shield Wall
   */
  private getForcesOnShieldWall(state: GameState): Array<{
    faction: Faction;
    territoryId: TerritoryId;
    sector: number;
    count: number;
  }> {
    const destroyed: Array<{
      faction: Faction;
      territoryId: TerritoryId;
      sector: number;
      count: number;
    }> = [];

    for (const [faction, factionState] of state.factions) {
      for (const stack of factionState.forces.onBoard) {
        if (stack.territoryId === TerritoryId.SHIELD_WALL) {
          const totalForces = stack.forces.regular + stack.forces.elite;
          if (totalForces > 0) {
            destroyed.push({
              faction,
              territoryId: TerritoryId.SHIELD_WALL,
              sector: stack.sector,
              count: totalForces,
            });
          }
        }
      }
    }

    return destroyed;
  }
}
