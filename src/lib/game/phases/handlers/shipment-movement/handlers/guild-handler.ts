/**
 * Guild Handler
 * 
 * Handles Spacing Guild timing and coordination:
 * - Guild is NOT in normal storm order iteration
 * - Ask Guild ONCE at phase start: "When do you want to act?"
 * - Options: NOW (act immediately) / LATER (ask before each faction) / DELAY_TO_END (go last)
 * - Once Guild acts (ship+move), they are DONE
 * - Never iterate Guild in storm order loop
 * 
 * @rule 2.06.12 SHIP AS IT PLEASES YOU: During the Shipment and Movement Phase Guild may activate either ability SHIP AND MOVE AHEAD OF SCHEDULE or HOLDING PATTERN.
 * @rule 2.06.12.01 SHIP AND MOVE AHEAD OF SCHEDULE: Guild may take shipment and move action before any player earlier in storm order.
 * @rule 2.06.12.02 HOLDING PATTERN: When Guild is up next in storm order, they may announce "Delay" and take their action after any player later in storm order.
 * @rule 2.06.12.03 (Continuation of HOLDING PATTERN - allows Guild to go last or after any later player)
 */

import { Faction, type GameState } from "@/lib/game/types";
import { FACTION_NAMES } from "@/lib/game/types";
import { setActiveFactions } from "@/lib/game/state";
import { type AgentRequest, type AgentResponse, type PhaseEvent, type PhaseStepResult } from "@/lib/game/phases/types";
import { type ShipmentMovementStateMachine } from "../state-machine";
import { type RequestBuilder } from "../builders/request-builders";

export class GuildHandler {
  /**
   * Ask Guild ONCE at phase start: "When do you want to act?"
   */
  askInitialTiming(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    console.log(`\n⏰ GUILD TIMING: When do you want to act?`);
    console.log(
      `   Options: NOW (act immediately) / LATER (ask before each faction) / DELAY_TO_END (go last)\n`
    );

    const pendingRequests: AgentRequest[] = [
      {
        factionId: Faction.SPACING_GUILD,
        requestType: "GUILD_TIMING_DECISION",
        prompt: `When do you want to act this turn? NOW (act immediately before all others), LATER (you'll be asked before each faction), or DELAY_TO_END (go after all other factions)?`,
        context: {
          isInitialTiming: true,
          canActNow: true,
          canDelay: true,
        },
        availableActions: [
          "guild_act_now",
          "guild_wait_later",
          "guild_delay_to_end",
        ],
      },
    ];

    return {
      state,
      phaseComplete: false,
      pendingRequests,
      actions: [],
      events,
    };
  }

  /**
   * Process Guild's initial timing decision
   */
  processTimingDecision(
    state: GameState,
    responses: AgentResponse[],
    events: PhaseEvent[],
    stateMachine: ShipmentMovementStateMachine,
    requestBuilder: RequestBuilder,
    startNextFaction: (state: GameState, events: PhaseEvent[]) => PhaseStepResult
  ): PhaseStepResult {
    const guildResponse = responses.find(
      (r) => r.factionId === Faction.SPACING_GUILD
    );
    if (!guildResponse) {
      // Default to LATER if no response
      console.log(`\n   ⏸️  Guild: No response, defaulting to LATER\n`);
      stateMachine.setAskGuildBeforeNextFaction(true);
      return startNextFaction(state, events);
    }

    const decision = guildResponse.data?.decision as string | undefined;
    const actionType = guildResponse.actionType;

    // Check if Guild wants to act NOW
    if (decision === "act_now" || actionType === "GUILD_ACT_NOW") {
      console.log(`\n   ✅ Guild chooses: ACT NOW (ship + move immediately)\n`);
      // Guild will ship and move, then mark as completed
      return this.startGuildShipment(state, events, stateMachine, requestBuilder);
    }
    // Check if Guild wants to delay to end
    else if (
      decision === "delay_to_end" ||
      actionType === "GUILD_DELAY_TO_END"
    ) {
      console.log(
        `\n   ⏸️  Guild chooses: DELAY TO END (will go after all other factions)\n`
      );
      stateMachine.setGuildWantsToDelayToEnd(true);
      stateMachine.setGuildCompleted(true); // Mark as "done" for now, will reset later
      return startNextFaction(state, events);
    }
    // Guild wants to be asked LATER
    else {
      console.log(
        `\n   ⏸️  Guild chooses: LATER (will be asked before each faction)\n`
      );
      stateMachine.setAskGuildBeforeNextFaction(true);
      return startNextFaction(state, events);
    }
  }

  /**
   * Ask Guild before each faction: "Do you want to act now?"
   */
  askBeforeFaction(
    state: GameState,
    events: PhaseEvent[],
    nextFaction: Faction
  ): PhaseStepResult {
    console.log(
      `\n⏰ GUILD TIMING: Do you want to act before ${FACTION_NAMES[nextFaction]}?`
    );
    console.log(`   You can act NOW or continue WAITING\n`);

    const pendingRequests: AgentRequest[] = [
      {
        factionId: Faction.SPACING_GUILD,
        requestType: "GUILD_TIMING_DECISION",
        prompt: `Do you want to act NOW, before ${FACTION_NAMES[nextFaction]}? Or continue WAITING?`,
        context: {
          isBeforeFaction: true,
          nextFaction: FACTION_NAMES[nextFaction],
          canActNow: true,
        },
        availableActions: ["guild_act_now", "guild_wait"],
      },
    ];

    return {
      state,
      phaseComplete: false,
      pendingRequests,
      actions: [],
      events,
    };
  }

  /**
   * Process Guild's decision when asked before a faction
   */
  processBeforeFactionDecision(
    state: GameState,
    guildResponse: AgentResponse,
    events: PhaseEvent[],
    stateMachine: ShipmentMovementStateMachine,
    requestBuilder: RequestBuilder,
    nonGuildStormOrder: Faction[],
    currentFactionIndex: number
  ): PhaseStepResult {
    const decision = guildResponse.data?.decision as string | undefined;
    const actionType = guildResponse.actionType;

    if (decision === "act_now" || actionType === "GUILD_ACT_NOW") {
      console.log(`\n   ✅ Guild chooses: ACT NOW\n`);
      stateMachine.setAskGuildBeforeNextFaction(false); // Don't ask again
      return this.startGuildShipment(state, events, stateMachine, requestBuilder);
    } else {
      console.log(
        `\n   ⏸️  Guild chooses: WAIT (continue to current faction)\n`
      );
      // BUG FIX: Temporarily disable Guild check for THIS faction
      // We'll ask Guild again before the NEXT faction
      stateMachine.setAskGuildBeforeNextFaction(false);

      // Get the current faction we're about to start
      const faction = nonGuildStormOrder[currentFactionIndex];
      stateMachine.setCurrentFaction(faction);
      stateMachine.setCurrentPhase("SHIP");

      const stateWithActive = setActiveFactions(state, [faction]);
      return requestBuilder.buildShipmentRequest(stateWithActive, faction, events);
    }
  }

  /**
   * Start Guild's shipment phase
   */
  startGuildShipment(
    state: GameState,
    events: PhaseEvent[],
    stateMachine: ShipmentMovementStateMachine,
    requestBuilder: RequestBuilder
  ): PhaseStepResult {
    stateMachine.setCurrentFaction(Faction.SPACING_GUILD);
    stateMachine.setCurrentPhase("SHIP");
    stateMachine.setAskGuildBeforeNextFaction(false); // Don't ask Guild again
    const stateWithActive = setActiveFactions(state, [Faction.SPACING_GUILD]);
    return requestBuilder.buildShipmentRequest(
      stateWithActive,
      Faction.SPACING_GUILD,
      events
    );
  }

  /**
   * Check if Guild needs to go last (HOLDING PATTERN or LATER but hasn't acted)
   */
  shouldFinalizeGuild(
    state: GameState,
    stateMachine: ShipmentMovementStateMachine
  ): boolean {
    // Check if Guild explicitly delayed to end (HOLDING PATTERN - Rule 2.06.12.02)
    if (
      stateMachine.doesGuildWantToDelayToEnd() &&
      stateMachine.isGuildCompleted()
    ) {
      return true;
    }

    // BUG FIX: Check if Guild chose LATER and kept waiting - they must act now
    // When Guild chooses LATER, they're asked before each faction. If they keep
    // choosing WAIT for all factions, we must force them to act before phase ends
    // since there are no more factions to wait for.
    //
    // CRITICAL: Only force Guild if we've actually processed at least one faction.
    // If currentFactionIndex is still 0, we haven't processed any factions yet,
    // so we shouldn't force Guild - they should be asked before the first faction.
    if (
      stateMachine.isGuildInGame() &&
      !stateMachine.isGuildCompleted() &&
      !stateMachine.doesGuildWantToDelayToEnd() &&
      stateMachine.getCurrentFactionIndex() > 0
    ) {
      return true;
    }

    return false;
  }

  /**
   * Finalize Guild - handle Guild going last
   */
  finalizeGuild(
    state: GameState,
    events: PhaseEvent[],
    stateMachine: ShipmentMovementStateMachine,
    requestBuilder: RequestBuilder
  ): PhaseStepResult {
    // Check if Guild explicitly delayed to end (HOLDING PATTERN - Rule 2.06.12.02)
    // When Guild chooses DELAY_TO_END, guildCompleted is set to true as a flag
    // We reset it here to allow Guild to act
    if (
      stateMachine.doesGuildWantToDelayToEnd() &&
      stateMachine.isGuildCompleted()
    ) {
      console.log(`\n🕰️  HOLDING PATTERN: Guild goes last\n`);
      stateMachine.setGuildCompleted(false); // Reset to allow Guild to act
      stateMachine.setGuildWantsToDelayToEnd(false);
      return this.startGuildShipment(state, events, stateMachine, requestBuilder);
    }

    // BUG FIX: Check if Guild chose LATER and kept waiting - they must act now
    if (
      stateMachine.isGuildInGame() &&
      !stateMachine.isGuildCompleted() &&
      !stateMachine.doesGuildWantToDelayToEnd() &&
      stateMachine.getCurrentFactionIndex() > 0
    ) {
      console.log(
        `\n🕰️  Guild chose LATER but hasn't acted yet - must act now before phase ends\n`
      );
      return this.startGuildShipment(state, events, stateMachine, requestBuilder);
    }

    // Shouldn't reach here, but return a safe default
    return {
      state,
      phaseComplete: false,
      pendingRequests: [],
      actions: [],
      events,
    };
  }
}

