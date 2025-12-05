/**
 * Shipment & Movement Phase Handler
 *
 * Phase 1.06: Shipment & Movement
 * CRITICAL ARCHITECTURE (Rule 1.06.12.01):
 * - Each faction does BOTH ship AND move before next faction acts
 * - NOT separate sub-phases! Process sequentially by faction
 * - Spacing Guild can act out of storm order (SHIP AS IT PLEASES YOU)
 * - Alliance constraint applied AFTER EACH faction completes
 *
 * GUILD HANDLING (Rule 2.06.12):
 * - Guild is NOT in normal storm order iteration
 * - Ask Guild ONCE at phase start: "When do you want to act?"
 * - Options: NOW (act immediately) / LATER (ask before each faction) / DELAY_TO_END (go last)
 * - Once Guild acts (ship+move), they are DONE
 * - Never iterate Guild in storm order loop
 */

import { Faction, Phase, TerritoryId, type GameState } from "@/lib/game/types";
import { FACTION_NAMES } from "@/lib/game/types";
import { setActiveFactions } from "@/lib/game/state";
import {
  type AgentResponse,
  type PhaseEvent,
  type PhaseHandler,
  type PhaseStepResult,
} from "../../types";
import { normalizeTerritoryIds } from "./helpers";
import { ShipmentMovementStateMachine } from "./state-machine";
import { GuildHandler } from "./handlers/guild-handler";
import { BGSpiritualAdvisorHandler } from "./handlers/bg-abilities/bg-advisors";
import { BGIntrusionHandler } from "./handlers/bg-abilities/bg-intrusion";
import { BGWartimeHandler } from "./handlers/bg-abilities/bg-wartime";
import { BGTakeUpArmsHandler } from "./handlers/bg-abilities/bg-take-up-arms";
import { AllianceConstraintHandler } from "./handlers/alliance-constraints";
import { ShipmentProcessor } from "./processors/shipment-processing";
import { MovementProcessor } from "./processors/movement-processing";
import { RequestBuilder } from "./builders/request-builders";
import { SHIPMENT_ACTION_TYPES, isShipmentActionType } from "./constants";
import { extractIntrusionTerritory, extractSpiritualAdvisorTerritory } from "./utils/territory-extraction";
import { ResponseParser } from "./utils/response-parser";
import { PhaseLogger } from "./services/logging";
import { FlowCoordinator } from "./coordination/flow-coordinator";

// =============================================================================
// SHIPMENT & MOVEMENT PHASE HANDLER - MODULAR ARCHITECTURE
// =============================================================================

export class ShipmentMovementPhaseHandler implements PhaseHandler {
  readonly phase = Phase.SHIPMENT_MOVEMENT;

  // Module instances
  private stateMachine: ShipmentMovementStateMachine;
  private guildHandler: GuildHandler;
  private bgAdvisors: BGSpiritualAdvisorHandler;
  private bgIntrusion: BGIntrusionHandler;
  private bgWartime: BGWartimeHandler;
  private bgTakeUpArms: BGTakeUpArmsHandler;
  private allianceHandler: AllianceConstraintHandler;
  private shipmentProcessor: ShipmentProcessor;
  private movementProcessor: MovementProcessor;
  private requestBuilder: RequestBuilder;
  private responseParser: ResponseParser;
  private logger: PhaseLogger;
  private flowCoordinator: FlowCoordinator;

  constructor() {
    this.stateMachine = new ShipmentMovementStateMachine();
    this.guildHandler = new GuildHandler();
    this.bgAdvisors = new BGSpiritualAdvisorHandler();
    this.bgIntrusion = new BGIntrusionHandler();
    this.bgWartime = new BGWartimeHandler();
    this.bgTakeUpArms = new BGTakeUpArmsHandler();
    this.allianceHandler = new AllianceConstraintHandler();
    this.shipmentProcessor = new ShipmentProcessor();
    this.movementProcessor = new MovementProcessor(this.bgTakeUpArms);
    this.requestBuilder = new RequestBuilder();
    this.responseParser = new ResponseParser();
    this.logger = new PhaseLogger();
    this.flowCoordinator = new FlowCoordinator(this.bgIntrusion, this.bgAdvisors);
  }

  initialize(state: GameState): PhaseStepResult {
    // @rule 1.06.00 This is the sixth Phase of the Turn. All players are allowed to Ship and/or Move Forces during this Phase,
    // placing their Forces onto the planet or moving Forces across the board.
    // Initialize state machine
    this.stateMachine.initialize(state);

    const events: PhaseEvent[] = [];

    // Log phase start
    this.logger.logPhaseStart(state, state.stormOrder);

    // Log ornithopter access
    const ornithopterAccess = this.stateMachine.getOrnithopterAccess();
    this.logger.logOrnithopterAccess(Array.from(ornithopterAccess));

    // Rule 2.02.18 - WARTIME: Before Shipment and Movement phase starts,
    // Bene Gesserit may flip all advisors to fighters in each territory
    if (
      state.factions.has(Faction.BENE_GESSERIT) &&
      state.config.advancedRules
    ) {
      const wartimeResult = this.bgWartime.checkAndRequest(state, events);
      if (wartimeResult) {
        console.log(`   🔍 DEBUG: Handler.initialize - WARTIME requested, pendingRequests count=${wartimeResult.pendingRequests.length}`);
        // Extract territories from context to store in state machine
        const territories = (wartimeResult.pendingRequests[0]?.context as any)?.territories as Array<{
          territoryId: TerritoryId;
          sector: number;
          advisorCount: number;
        }> | undefined;
        if (territories) {
          console.log(`   🔍 DEBUG: Handler.initialize - Setting WARTIME waiting with ${territories.length} territories`);
          this.stateMachine.setWaitingForWartime(true, territories);
        } else {
          console.log(`   🔍 DEBUG: Handler.initialize - Setting WARTIME waiting with empty territories array`);
          this.stateMachine.setWaitingForWartime(true, []);
        }
        return wartimeResult;
      } else {
        console.log(`   🔍 DEBUG: Handler.initialize - WARTIME checkAndRequest returned null (no eligible territories)`);
      }
    }

    if (this.stateMachine.isGuildInGame()) {
      this.logger.logGuildTimingOptions();

      // Ask Guild ONCE: "When do you want to act?"
      return this.guildHandler.askInitialTiming(state, events);
    }

    this.logger.logPhaseSeparator();

    // No Guild in game - start with first faction
    return this.startNextFaction(state, events);
  }

  processStep(state: GameState, responses: AgentResponse[]): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;

    // 1. Handle BG WARTIME (Rule 2.02.18) - must happen before phase starts
    if (this.stateMachine.isWaitingForWartime()) {
      console.log(`   🔍 DEBUG: Handler.processStep - isWaitingForWartime=true, responses count=${responses.length}, response actionTypes=${responses.map(r => r.actionType).join(', ')}`);
      const territories = this.stateMachine.getWartimeTerritories();
      console.log(`   🔍 DEBUG: Handler.processStep - WARTIME territories count=${territories.length}`);
      const result = this.bgWartime.processDecision(newState, responses, territories);
      newState = result.state;
      events.push(...result.events);
      console.log(`   🔍 DEBUG: Handler.processStep - WARTIME result events count=${result.events.length}`);
      this.stateMachine.setWaitingForWartime(false, []);

      // After WARTIME, continue with phase initialization (check Guild or start first faction)
      if (this.stateMachine.isGuildInGame()) {
        return this.guildHandler.askInitialTiming(newState, events);
      }
      return this.startNextFaction(newState, events);
    }

    // 2. Handle BG TAKE UP ARMS (Rule 2.02.17) - must happen after movement
    if (this.stateMachine.isWaitingForTakeUpArms()) {
      console.log(`   🔍 DEBUG: Handler.processStep - isWaitingForTakeUpArms=true, responses count=${responses.length}, response actionTypes=${responses.map(r => r.actionType).join(', ')}`);
      const trigger = this.stateMachine.getBGTakeUpArmsTrigger();
      console.log(`   🔍 DEBUG: Handler.processStep - TAKE_UP_ARMS trigger: territory=${trigger?.territory}, sector=${trigger?.sector}, advisorCount=${trigger?.advisorCount}`);
      const result = this.bgTakeUpArms.processDecision(
        newState,
        responses,
        trigger
      );
      newState = result.state;
      events.push(...result.events);
      console.log(`   🔍 DEBUG: Handler.processStep - TAKE_UP_ARMS result events count=${result.events.length}`);
      this.stateMachine.setWaitingForTakeUpArms(false, null);

      // After TAKE UP ARMS, continue with current faction's completion
      return this.advanceToNextFaction(newState, events);
    }

    // 3. Handle BG INTRUSION (Rule 2.02.16) - must happen before other actions
    if (this.stateMachine.isWaitingForBGIntrusion()) {
      const trigger = this.stateMachine.getBGIntrusionTrigger();
      const result = this.bgIntrusion.processDecision(newState, responses, trigger);
      newState = result.state;
      events.push(...result.events);
      this.stateMachine.setWaitingForBGIntrusion(false, null);

      // After BG responds, continue with the action that triggered INTRUSION
      // If it was during shipment, continue to movement; if during movement, continue to next faction
      if (this.stateMachine.getCurrentPhase() === "SHIP") {
        this.stateMachine.setCurrentPhase("MOVE");
        return this.requestMovementDecision(newState, events);
      } else {
        // Movement phase - faction completed
        const currentFaction = this.stateMachine.getCurrentFaction();
        if (currentFaction) {
          const allianceResult = this.allianceHandler.applyForFaction(
            newState,
            currentFaction,
            events
          );
          newState = allianceResult.state;
          events.push(...allianceResult.events);
        }
        this.stateMachine.setCurrentPhase("DONE");
        return this.advanceToNextFaction(newState, events);
      }
    }

    // 4. Handle BG Spiritual Advisor (side quest)
    if (this.stateMachine.isWaitingForBGAdvisor()) {
      const trigger = this.stateMachine.getBGSpiritualAdvisorTrigger();
      const result = this.bgAdvisors.processDecision(newState, responses, trigger);
      newState = result.state;
      events.push(...result.events);
      this.stateMachine.setWaitingForBGAdvisor(false, null);

      // After BG responds, continue to current faction's movement
      // Set phase to MOVE so the next response is processed correctly
      this.stateMachine.setCurrentPhase("MOVE");
      return this.requestMovementDecision(newState, events);
    }

    // 5. Handle Guild asking before next faction (if Guild said "LATER")
    // IMPORTANT: Check this BEFORE initial timing decision to avoid condition overlap
    if (
      this.stateMachine.shouldAskGuildBeforeNextFaction() &&
      !this.stateMachine.isGuildCompleted()
    ) {
      const guildResponse = responses.find(
        (r) => r.factionId === Faction.SPACING_GUILD
      );
      if (guildResponse) {
        return this.guildHandler.processBeforeFactionDecision(
          newState,
          guildResponse,
          events,
          this.stateMachine,
          this.requestBuilder,
          this.stateMachine.getNonGuildStormOrder(),
          this.stateMachine.getCurrentFactionIndex()
        );
      }
    }

    // 6. Handle Guild initial timing decision
    // Only check if we're waiting for a timing decision (not if Guild is already acting)
    if (
      this.stateMachine.isGuildInGame() &&
      !this.stateMachine.isGuildCompleted() &&
      this.stateMachine.getCurrentFaction() !== Faction.SPACING_GUILD && // Don't check if Guild is already acting
      responses.some(
        (r) =>
          r.factionId === Faction.SPACING_GUILD &&
          (r.actionType === "GUILD_TIMING_DECISION" ||
            r.actionType === "GUILD_ACT_NOW" ||
            r.actionType === "GUILD_WAIT_LATER" ||
            r.actionType === "GUILD_DELAY_TO_END")
      )
    ) {
      return this.guildHandler.processTimingDecision(
        newState,
        responses,
        events,
        this.stateMachine,
        this.requestBuilder,
        (state, events) => this.startNextFaction(state, events)
      );
    }

    // 7. Get current faction from non-Guild storm order (or Guild if they're acting)
    const currentFaction = this.stateMachine.getCurrentFaction();
    if (!currentFaction) {
      // Check if we've actually processed all non-Guild factions
      // Only call finalizePhase if we've gone through all factions, not at phase start
      if (this.stateMachine.isAllFactionsDone()) {
        // All factions done - check if Guild needs to go last
        return this.finalizePhase(newState, events);
      }
      // We're at phase start and no faction is set yet - start the first faction
      // This can happen if Guild chose LATER and we need to ask them before first faction
      if (
        this.stateMachine.shouldAskGuildBeforeNextFaction() &&
        !this.stateMachine.isGuildCompleted() &&
        this.stateMachine.getCurrentFactionIndex() <
          this.stateMachine.getNonGuildStormOrder().length
      ) {
        const nextFaction =
          this.stateMachine.getNonGuildStormOrder()[
            this.stateMachine.getCurrentFactionIndex()
          ];
        return this.guildHandler.askBeforeFaction(newState, events, nextFaction);
      }
      // Otherwise, start the next faction normally
      return this.startNextFaction(newState, events);
    }

    const currentResponse = responses.find(
      (r) => r.factionId === currentFaction
    );
    if (!currentResponse) {
      this.logger.logError(`No response from ${FACTION_NAMES[currentFaction]}`);
      return this.advanceToNextFaction(newState, events);
    }

    // Debug: Log response details for Guild shipments
    if (currentFaction === Faction.SPACING_GUILD && this.stateMachine.getCurrentPhase() === "SHIP") {
      console.log(`   🔍 DEBUG: Handler.processStep - currentFaction=${currentFaction}, currentResponse.actionType=${currentResponse.actionType}`);
      console.log(`   🔍 DEBUG: Handler.processStep - All responses in array: ${responses.map(r => `${r.factionId}:${r.actionType}`).join(', ')}`);
    }

    // 8. Process current faction's action based on phase
    // Use flow coordinator to check action type
    const isShipmentAction = this.flowCoordinator.isShipmentAction(currentResponse);

    if (this.stateMachine.getCurrentPhase() === "SHIP") {
      // @rule 1.06.02 ONE FORCE SHIPMENT: Each player may make only one Force Shipment action per Turn.
      // Enforced by architecture: each faction processes SHIP phase once before moving to MOVE phase
      // Process shipment - check for valid shipment action types
      if (isShipmentAction) {
        const result = this.shipmentProcessor.process(
          newState,
          currentResponse,
          events
        );
        newState = result.state;
        events.push(...result.events);

        // Check for BG ability triggers after shipment
        const bgTriggers = this.flowCoordinator.checkShipmentBGTriggers(
          newState,
          currentResponse,
          currentFaction,
          this.stateMachine
        );

        // Handle INTRUSION first (higher priority)
        if (bgTriggers.intrusion) {
          this.stateMachine.setWaitingForBGIntrusion(true, {
            territory: bgTriggers.intrusion.territoryId as any,
            sector: bgTriggers.intrusion.sector,
            enteringFaction: currentFaction,
          });
          return this.bgIntrusion.requestDecision(newState, events, {
            territory: bgTriggers.intrusion.territoryId as any,
            sector: bgTriggers.intrusion.sector,
            enteringFaction: currentFaction,
          });
        }

        // Handle Spiritual Advisor
        if (bgTriggers.spiritualAdvisor) {
          const triggeringShipment = {
            territory: bgTriggers.spiritualAdvisor.territoryId as any,
            sector: bgTriggers.spiritualAdvisor.sector,
          };
          this.stateMachine.setWaitingForBGAdvisor(true, triggeringShipment);
          // Store in game state for tool validation (Rule 2.02.11)
          newState = {
            ...newState,
            bgSpiritualAdvisorTrigger: triggeringShipment,
          };
          return this.bgAdvisors.requestDecision(newState, events, triggeringShipment);
        }
      } else if (
        this.flowCoordinator.wantsToSkipShipment(
          currentResponse,
          this.stateMachine.getCurrentPhase()
        )
      ) {
        // BUG FIX: Agent responded with MOVE during SHIP phase - this means they want to skip shipment
        this.logger.logPass(currentFaction, "shipment (MOVE_FORCES during SHIP phase)");
        // Process the move now instead of requesting it again
        const ornithopterAccess = this.stateMachine.getOrnithopterAccess();
        const result = this.movementProcessor.process(
          newState,
          currentResponse,
          ornithopterAccess
        );
        newState = result.state;
        events.push(...result.events);

        // Faction completed - apply alliance constraint
        console.log(
          `\n   ✅ ${FACTION_NAMES[currentFaction]} completed ship + move`
        );
        const allianceResult = this.allianceHandler.applyForFaction(
          newState,
          currentFaction,
          events
        );
        newState = allianceResult.state;
        events.push(...allianceResult.events);

        // Move to next faction
        this.stateMachine.setCurrentPhase("DONE");
        return this.advanceToNextFaction(newState, events);
      } else {
        this.logger.logPass(currentFaction, "shipment");
      }

      // Move to movement phase only if we haven't already processed movement
      if (this.stateMachine.getCurrentPhase() === "SHIP") {
        this.stateMachine.setCurrentPhase("MOVE");
        return this.requestMovementDecision(newState, events);
      }
    } else if (this.stateMachine.getCurrentPhase() === "MOVE") {
      // @rule 1.06.05.01 ONE FORCE MOVE: Each player may make only one Force movement action per Turn.
      // Enforced by architecture: each faction processes MOVE phase once before moving to next faction
      // Process movement
      let movementSucceeded = false;
      if (
        !currentResponse.passed &&
        currentResponse.actionType === "MOVE_FORCES"
      ) {
        const ornithopterAccess = this.stateMachine.getOrnithopterAccess();
        const result = this.movementProcessor.process(
          newState,
          currentResponse,
          ornithopterAccess
        );
        newState = result.state;
        events.push(...result.events);
        // Check if movement actually succeeded (events were generated)
        movementSucceeded = result.events.length > 0;

        // Check for TAKE UP ARMS trigger
        // Note: Trigger was already validated in movement-processing.ts BEFORE movement was applied
        // The trigger detection checks the state before movement to see if destination is eligible
        if (result.takeUpArmsTrigger) {
          console.log(`   🔍 DEBUG: Handler - TAKE_UP_ARMS trigger detected: territory=${result.takeUpArmsTrigger.territory}, sector=${result.takeUpArmsTrigger.sector}, advisorCount=${result.takeUpArmsTrigger.advisorCount}`);
          this.stateMachine.setWaitingForTakeUpArms(
            true,
            result.takeUpArmsTrigger
          );
          return this.bgTakeUpArms.requestDecision(
            newState,
            events,
            result.takeUpArmsTrigger
          );
        }

        // Check for BG ability triggers after movement
        if (movementSucceeded) {
          const bgTriggers = this.flowCoordinator.checkMovementBGTriggers(
            newState,
            currentResponse,
            currentFaction
          );

          if (bgTriggers.intrusion) {
            this.stateMachine.setWaitingForBGIntrusion(true, {
              territory: bgTriggers.intrusion.territoryId as any,
              sector: bgTriggers.intrusion.sector,
              enteringFaction: currentFaction,
            });
            return this.bgIntrusion.requestDecision(newState, events, {
              territory: bgTriggers.intrusion.territoryId as any,
              sector: bgTriggers.intrusion.sector,
              enteringFaction: currentFaction,
            });
          }
        }
      } else {
        this.logger.logPass(currentFaction, "movement");
        movementSucceeded = true; // Passing is considered success
      }

      // Only mark as completed if movement succeeded or was passed
      if (movementSucceeded) {
        // Check if we need to ask BG about INTRUSION (Rule 2.02.16)
        if (this.stateMachine.isWaitingForBGIntrusion()) {
          const trigger = this.stateMachine.getBGIntrusionTrigger();
          if (trigger) {
            return this.bgIntrusion.requestDecision(newState, events, trigger);
          }
        }

        // Faction completed - apply alliance constraint
        this.logger.logCompletion(currentFaction);
        const allianceResult = this.allianceHandler.applyForFaction(
          newState,
          currentFaction,
          events
        );
        newState = allianceResult.state;
        events.push(...allianceResult.events);

        // Move to next faction
        this.stateMachine.setCurrentPhase("DONE");
        return this.advanceToNextFaction(newState, events);
      } else {
        // Movement failed - don't mark as completed, but still advance to avoid infinite loop
        this.logger.logWarning(
          `${FACTION_NAMES[currentFaction]} movement failed, but continuing to next faction`
        );
        this.stateMachine.setCurrentPhase("DONE");
        return this.advanceToNextFaction(newState, events);
      }
    }

    // Shouldn't reach here
    return this.advanceToNextFaction(newState, events);
  }

  cleanup(state: GameState): GameState {
    // All alliance constraints applied during processStep
    return state;
  }

  // ===========================================================================
  // FACTION SEQUENCING
  // ===========================================================================

  /**
   * Start the next faction's turn (ship + move).
   *
   * @rule 1.06.01 The First Player conducts their Force Shipment action and then Force Movement action.
   * Play proceeds in Storm Order until all players have completed this Phase or indicated they will not use their actions.
   */
  private startNextFaction(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    // Get next faction from non-Guild storm order
    if (this.stateMachine.isAllFactionsDone()) {
      // All non-Guild factions done
      return this.finalizePhase(state, events);
    }

    const faction =
      this.stateMachine.getNonGuildStormOrder()[
        this.stateMachine.getCurrentFactionIndex()
      ];

    // Check if Guild wants to act before this faction
    if (
      this.stateMachine.shouldAskGuildBeforeNextFaction() &&
      !this.stateMachine.isGuildCompleted()
    ) {
      return this.guildHandler.askBeforeFaction(state, events, faction);
    }

    // Start this faction's shipment
    this.stateMachine.setCurrentFaction(faction);
    this.stateMachine.setCurrentPhase("SHIP");
    const stateWithActive = setActiveFactions(state, [faction]);
    return this.requestBuilder.buildShipmentRequest(
      stateWithActive,
      faction,
      events
    );
  }

  /**
   * Advance to next faction in storm order
   */
  private advanceToNextFaction(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    // If we just completed Guild's turn, mark them as done
    const currentFaction = this.stateMachine.getCurrentFaction();
    if (currentFaction === Faction.SPACING_GUILD && !this.stateMachine.isGuildCompleted()) {
      this.stateMachine.setGuildCompleted(true);
      this.logger.logCompletion(Faction.SPACING_GUILD);
    }

    // Move to next faction in non-Guild storm order (only if not Guild)
    if (currentFaction !== Faction.SPACING_GUILD) {
      this.stateMachine.advanceFactionIndex();

      // BUG FIX: Re-enable Guild check for the NEXT faction
      // (if Guild previously chose "LATER" and hasn't acted yet)
      if (
        this.stateMachine.isGuildInGame() &&
        !this.stateMachine.isGuildCompleted() &&
        !this.stateMachine.doesGuildWantToDelayToEnd()
      ) {
        this.stateMachine.setAskGuildBeforeNextFaction(true);
      }
    }

    this.stateMachine.setCurrentFaction(null);
    return this.startNextFaction(state, events);
  }

  /**
   * Finalize phase - check if Guild needs to go last
   */
  private finalizePhase(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    // Check if Guild needs to go last
    if (this.guildHandler.shouldFinalizeGuild(state, this.stateMachine)) {
      return this.guildHandler.finalizeGuild(
        state,
        events,
        this.stateMachine,
        this.requestBuilder
      );
    }

    // Phase complete!
    this.logger.logPhaseComplete();

    const finalState = setActiveFactions(state, []);

    return {
      state: finalState,
      phaseComplete: true,
      nextPhase: Phase.BATTLE,
      pendingRequests: [],
      actions: [],
      events,
    };
  }

  /**
   * Request movement decision for current faction
   */
  private requestMovementDecision(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    // Get current faction
    const faction = this.stateMachine.getCurrentFaction();
    if (!faction) {
      return this.finalizePhase(state, events);
    }

    const ornithopterAccess = this.stateMachine.getOrnithopterAccess();
    return this.requestBuilder.buildMovementRequest(
      state,
      faction,
      events,
      ornithopterAccess
    );
  }
}

