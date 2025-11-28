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
import { calculateStormOrder } from "../../state/factory";
import { isSectorInStorm } from "../../state/queries";
import {
  FACTION_NAMES,
  Faction,
  LeaderLocation,
  Phase,
  TERRITORY_DEFINITIONS,
  TerritoryId,
  TerritoryType,
  type GameState,
} from "../../types";
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

    // Determine who dials the storm
    // Turn 1: Two players nearest storm start sector
    // Later turns: Two players who last used battle wheels
    const dialers = this.getStormDialers(state);
    this.context.dialingFactions = dialers;

    // Note: PhaseManager emits PHASE_STARTED event, so we don't emit it here

    // Fremen special: They control storm movement in advanced rules
    // In advanced rules with Fremen, they use storm deck instead of dials
    // The PHASE_STARTED event already indicates storm phase is active

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
    const events: PhaseEvent[] = [];
    const actions: GameAction[] = [];

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
      return this.processFamilyAtomics(state, responses);
    }

    // Step 4: After Family Atomics (or if not used), check for Weather Control
    if (
      !this.context.weatherControlUsed &&
      !this.context.waitingForWeatherControl
    ) {
      return this.checkWeatherControl(state);
    }

    // Step 5: Process Weather Control response (if waiting)
    if (this.context.waitingForWeatherControl) {
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
        dialer2 = sorted[1]?.faction ?? sorted[0]?.faction ?? factions[0];
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
      console.log(
        `\n🎯 Dialers: ${FACTION_NAMES[dialer1]} and ${FACTION_NAMES[dialer2]}`
      );
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

    const dialer1 = nearestForward.faction;
    const dialer2 = nearestBackward.faction;

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
    console.log(
      `   ${FACTION_NAMES[dialer1]}: Nearest at/after storm (${nearestForward.distanceForward} sectors ahead)`
    );
    console.log(
      `   ${FACTION_NAMES[dialer2]}: Nearest before storm (${nearestBackward.distanceBackward} sectors behind)`
    );
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

    // Calculate total movement
    let totalMovement = 0;
    for (const value of this.context.dials.values()) {
      totalMovement += value;
    }
    this.context.stormMovement = totalMovement;

    console.log(`\n  📊 Total: ${totalMovement} sectors`);
    console.log("=".repeat(80) + "\n");

    // Lock in the movement (but don't apply yet - need to check for cards)
    // Now check for Family Atomics (after movement calculated, before moved)
    return this.checkFamilyAtomics(state);
  }

  private applyStormMovement(state: GameState): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;

    const movement = this.context.stormMovement ?? 0;
    const oldSector = state.turn === 1 ? 0 : state.stormSector; // Turn 1 starts from Storm Start Sector (0)

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
    const newSector = (oldSector + movement) % GAME_CONSTANTS.TOTAL_SECTORS;
    console.log(`  Ending Sector: ${newSector}`);

    // Update state with new sector (if not turn 1, or if turn 1 and we're actually moving)
    if (state.turn === 1) {
      // Turn 1: storm starts at 0, then moves
      newState = moveStorm(newState, newSector);
    } else {
      newState = moveStorm(newState, newSector);
    }

    events.push({
      type: "STORM_MOVED",
      data: {
        from: oldSector,
        to: newSector,
        movement,
        sectorsAffected: this.getSectorsBetween(oldSector, newSector),
      },
      message: `Storm moves ${movement} sectors (${oldSector} → ${newSector})`,
    });

    // Destroy forces and spice in storm path
    const destroyedForces = this.destroyForcesInStorm(
      newState,
      oldSector,
      newSector
    );
    const destroyedSpice = this.destroySpiceInStorm(
      newState,
      oldSector,
      newSector
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

  private getSectorsBetween(from: number, to: number): number[] {
    const sectors: number[] = [];
    let current = from;
    while (current !== to) {
      current = (current + 1) % GAME_CONSTANTS.TOTAL_SECTORS;
      sectors.push(current);
    }
    return sectors;
  }

  private destroyForcesInStorm(
    state: GameState,
    fromSector: number,
    toSector: number
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
    const affectedSectors = new Set([
      fromSector,
      ...this.getSectorsBetween(fromSector, toSector),
    ]);

    // Check each territory
    for (const [territoryId, territory] of Object.entries(
      TERRITORY_DEFINITIONS
    )) {
      // Skip protected territories (rock, polar sink, imperial basin, strongholds)
      // UNLESS Family Atomics was played (removes protection from Imperial Basin, Arrakeen, Carthag)
      const isCityLosingProtection =
        state.shieldWallDestroyed &&
        (territoryId === TerritoryId.IMPERIAL_BASIN ||
          territoryId === TerritoryId.ARRAKEEN ||
          territoryId === TerritoryId.CARTHAG);

      // If this is a protected territory and Family Atomics hasn't removed its protection, skip it
      if (territory.protectedFromStorm && !isCityLosingProtection) continue;

      // If this is not a sand territory (rock/stronghold) and Family Atomics hasn't removed its protection, skip it
      // Note: Imperial Basin is SAND but protected, Arrakeen/Carthag are STRONGHOLD and protected
      if (territory.type !== TerritoryType.SAND && !isCityLosingProtection)
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

  private destroySpiceInStorm(
    state: GameState,
    fromSector: number,
    toSector: number
  ): { territoryId: TerritoryId; sector: number; amount: number }[] {
    const destroyed: {
      territoryId: TerritoryId;
      sector: number;
      amount: number;
    }[] = [];
    const affectedSectors = new Set(
      this.getSectorsBetween(fromSector, toSector)
    );

    // Note: Spice is destroyed only in sectors the storm PASSES THROUGH, not where it starts
    // But spice in protected territories is also protected (unless Family Atomics was played)
    for (const spice of state.spiceOnBoard) {
      if (!affectedSectors.has(spice.sector)) continue;

      // Check if this spice is in a protected territory
      const territory = TERRITORY_DEFINITIONS[spice.territoryId];
      const isCityLosingProtection =
        state.shieldWallDestroyed &&
        (spice.territoryId === TerritoryId.IMPERIAL_BASIN ||
          spice.territoryId === TerritoryId.ARRAKEEN ||
          spice.territoryId === TerritoryId.CARTHAG);

      // Skip protected territories unless Family Atomics removed their protection
      if (territory.protectedFromStorm && !isCityLosingProtection) continue;

      destroyed.push({
        territoryId: spice.territoryId,
        sector: spice.sector,
        amount: spice.amount,
      });
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

    // No one can play Family Atomics - check Weather Control
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
          const card = factionState.hand[cardIndex];
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

    // No one wants to play Weather Control - apply movement
    return this.applyStormMovement(state);
  }

  /**
   * Process Weather Control response
   */
  private processWeatherControl(
    state: GameState,
    responses: AgentResponse[]
  ): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;

    this.context.waitingForWeatherControl = false;

    // Process responses - only the first faction to play Weather Control gets to use it
    // If multiple factions have it, they all get asked, but only one can play it
    for (const response of responses) {
      // Handle both tool response (play_weather_control) and direct action (PLAY_WEATHER_CONTROL)
      const isWeatherControl =
        response.actionType === "PLAY_WEATHER_CONTROL" ||
        response.actionType === "play_weather_control";

      // If Weather Control was already used by another faction, skip
      if (this.context.weatherControlUsed) {
        break;
      }

      // If this faction wants to play Weather Control (not passing)
      if (isWeatherControl && !response.passed) {
        const faction = response.factionId;
        this.context.weatherControlUsed = true;
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
  private getForcesOnShieldWall(
    state: GameState
  ): Array<{
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

// Type for action logging
type GameAction = {
  type: string;
  data: Record<string, unknown>;
};
