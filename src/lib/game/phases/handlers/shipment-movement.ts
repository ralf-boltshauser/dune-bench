/**
 * Shipment & Movement Phase Handler
 *
 * Phase 1.06: Shipment & Movement
 *
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
 *
 * Rule references:
 * - 1.06.12.01: "First Player conducts Force Shipment action and then Force Movement action"
 * - 2.06.12.01: "SHIP AND MOVE AHEAD OF SCHEDULE" (Guild acts before turn)
 * - 2.06.12.02: "HOLDING PATTERN" (Guild delays to go last)
 * - 1.06.03.08: "CONSTRAINT: At the end of your Shipment and Movement actions..."
 */

import { GAME_CONSTANTS } from "../../data";
import {
  checkOrnithopterAccess,
  validateAdvisorFlipToFighters,
  validateMovement,
} from "../../rules";
import {
  addSpice,
  areAllied,
  convertBGAdvisorsToFighters,
  getBGAdvisorsInTerritory,
  getBGFightersInSector,
  getFactionsInTerritory,
  getFactionState,
  logAction,
  moveForces,
  removeSpice,
  sendForcesToReserves,
  sendForcesToTanks,
  setActiveFactions,
  shipForces,
  validateStrongholdOccupancy,
} from "../../state";
import {
  Faction,
  FACTION_NAMES,
  Phase,
  TERRITORY_DEFINITIONS,
  TerritoryId,
  TerritoryType,
  type GameState,
} from "../../types";
import { normalizeTerritoryIdsInResponse } from "../../utils/normalize-agent-response";
import {
  type AgentRequest,
  type AgentResponse,
  type PhaseEvent,
  type PhaseHandler,
  type PhaseStepResult,
} from "../types";
import { buildMovementContext } from "./shipment-movement/movement-context";
import { buildShipmentContext } from "./shipment-movement/shipment-context";

// =============================================================================
// SHIPMENT & MOVEMENT PHASE HANDLER - SIMPLIFIED ARCHITECTURE
// =============================================================================

/**
 * Current faction's phase within their turn
 */
type FactionPhase = "SHIP" | "MOVE" | "DONE";

export class ShipmentMovementPhaseHandler implements PhaseHandler {
  readonly phase = Phase.SHIPMENT_MOVEMENT;

  // ===== STATE MACHINE - SIMPLIFIED =====

  // Track position in NON-GUILD storm order (Guild handled separately)
  private currentFactionIndex = 0;
  private nonGuildStormOrder: Faction[] = [];
  private currentFactionPhase: FactionPhase = "SHIP";
  private currentFaction: Faction | null = null; // Track who is currently acting

  // Guild-specific state
  private guildInGame = false;
  private guildCompleted = false;
  private guildWantsToDelayToEnd = false;
  private askGuildBeforeNextFaction = false; // True if Guild said "LATER"

  // BG Spiritual Advisor tracking (Rule 2.02.05)
  private waitingForBGAdvisor = false;
  private bgTriggeringShipment: {
    territory: TerritoryId;
    sector: number;
  } | null = null;

  // BG INTRUSION tracking (Rule 2.02.16)
  private waitingForBGIntrusion = false;
  private bgIntrusionTrigger: {
    territory: TerritoryId;
    sector: number;
    enteringFaction: Faction;
  } | null = null;

  // BG WARTIME tracking (Rule 2.02.18)
  private waitingForWartime = false;
  private wartimeTerritories: Array<{
    territoryId: TerritoryId;
    sector: number;
    advisorCount: number;
  }> = [];

  // BG TAKE UP ARMS tracking (Rule 2.02.17)
  private waitingForTakeUpArms = false;
  private takeUpArmsTrigger: {
    territory: TerritoryId;
    sector: number;
    advisorCount: number;
  } | null = null;

  // Ornithopter access tracking (determined at phase START, not dynamically)
  // Rule: Ornithopter access (3-territory movement) requires forces in Arrakeen/Carthag at phase START
  private ornithopterAccessAtPhaseStart: Set<Faction> = new Set();

  initialize(state: GameState): PhaseStepResult {
    // Reset all state
    this.currentFactionIndex = 0;
    this.currentFactionPhase = "SHIP";
    this.currentFaction = null;
    this.waitingForBGAdvisor = false;
    this.bgTriggeringShipment = null;
    this.waitingForBGIntrusion = false;
    this.bgIntrusionTrigger = null;
    this.waitingForWartime = false;
    this.wartimeTerritories = [];
    this.waitingForTakeUpArms = false;
    this.takeUpArmsTrigger = null;

    // Build storm order WITHOUT Guild (Guild handled separately)
    this.nonGuildStormOrder = state.stormOrder.filter(
      (f) => f !== Faction.SPACING_GUILD
    );

    // Guild state
    this.guildInGame = state.factions.has(Faction.SPACING_GUILD);
    this.guildCompleted = !this.guildInGame; // If not in game, mark as "completed" (skip)
    this.guildWantsToDelayToEnd = false;
    this.askGuildBeforeNextFaction = false;

    // CRITICAL: Record ornithopter access at phase START (not dynamically during phase)
    // Rule: Ornithopter access requires forces in Arrakeen/Carthag at the BEGINNING of this phase
    // Even if you ship into Arrakeen/Carthag during this phase, you don't get ornithopters until NEXT phase
    this.ornithopterAccessAtPhaseStart = new Set();
    for (const faction of state.factions.keys()) {
      if (checkOrnithopterAccess(state, faction)) {
        this.ornithopterAccessAtPhaseStart.add(faction);
        console.log(
          `   🚁 ${FACTION_NAMES[faction]} has ornithopter access (forces in Arrakeen/Carthag at phase start)`
        );
      }
    }

    const events: PhaseEvent[] = [];

    console.log("\n" + "=".repeat(80));
    console.log("🚢 SHIPMENT & MOVEMENT PHASE (Turn " + state.turn + ")");
    console.log("=".repeat(80));
    console.log(`\n📍 Storm Sector: ${state.stormSector}`);
    console.log(
      `📋 Storm Order: ${state.stormOrder
        .map((f) => FACTION_NAMES[f])
        .join(" → ")}`
    );
    console.log(
      `\n  Rule 1.06.12.01: Each faction does SHIPMENT then MOVEMENT sequentially.`
    );
    console.log(`  Play proceeds in Storm Order until all players complete.\n`);

    // Rule 2.02.18 - WARTIME: Before Shipment and Movement phase starts,
    // Bene Gesserit may flip all advisors to fighters in each territory
    if (
      state.factions.has(Faction.BENE_GESSERIT) &&
      state.config.advancedRules
    ) {
      const wartimeResult = this.checkAndRequestWartime(state, events);
      if (wartimeResult) {
        return wartimeResult;
      }
    }

    if (this.guildInGame) {
      console.log(
        `  ⚠️  Spacing Guild: Can act out of order (SHIP AS IT PLEASES YOU)`
      );
      console.log(`     - NOW: Act immediately before all others`);
      console.log(`     - LATER: Ask before each faction until Guild acts`);
      console.log(`     - DELAY_TO_END: Go after all other factions\n`);
      console.log("=".repeat(80) + "\n");

      // Ask Guild ONCE: "When do you want to act?"
      return this.askGuildInitialTiming(state, events);
    }

    console.log("=".repeat(80) + "\n");

    // No Guild in game - start with first faction
    return this.startNextFaction(state, events);
  }

  processStep(state: GameState, responses: AgentResponse[]): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;

    // 1. Handle BG WARTIME (Rule 2.02.18) - must happen before phase starts
    if (this.waitingForWartime) {
      const result = this.processWartimeFlip(newState, responses, events);
      newState = result.state;
      events.push(...result.events);

      // After WARTIME, continue with phase initialization (check Guild or start first faction)
      if (this.guildInGame) {
        return this.askGuildInitialTiming(newState, events);
      }
      return this.startNextFaction(newState, events);
    }

    // 2. Handle BG TAKE UP ARMS (Rule 2.02.17) - must happen after movement
    if (this.waitingForTakeUpArms) {
      const result = this.processTakeUpArmsDecision(
        newState,
        responses,
        events
      );
      newState = result.state;
      events.push(...result.events);

      // After TAKE UP ARMS, continue with current faction's completion
      return this.advanceToNextFaction(newState, events);
    }

    // 3. Handle BG INTRUSION (Rule 2.02.16) - must happen before other actions
    if (this.waitingForBGIntrusion) {
      const result = this.processBGIntrusionDecision(
        newState,
        responses,
        events
      );
      newState = result.state;
      events.push(...result.events);

      // After BG responds, continue with the action that triggered INTRUSION
      // If it was during shipment, continue to movement; if during movement, continue to next faction
      if (this.currentFactionPhase === "SHIP") {
        this.currentFactionPhase = "MOVE";
        return this.requestMovementDecision(newState, events);
      } else {
        // Movement phase - faction completed
        const allianceResult = this.applyAllianceConstraintForFaction(
          newState,
          this.currentFaction!,
          events
        );
        newState = allianceResult.state;
        events.push(...allianceResult.events);
        this.currentFactionPhase = "DONE";
        return this.advanceToNextFaction(newState, events);
      }
    }

    // 3. Handle BG Spiritual Advisor (side quest)
    if (this.waitingForBGAdvisor) {
      const result = this.processBGSpiritualAdvisorDecision(
        newState,
        responses,
        events
      );
      newState = result.state;
      events.push(...result.events);

      // After BG responds, continue to current faction's movement
      // Set phase to MOVE so the next response is processed correctly
      this.currentFactionPhase = "MOVE";
      return this.requestMovementDecision(newState, events);
    }

    // 3. Handle Guild asking before next faction (if Guild said "LATER")
    // IMPORTANT: Check this BEFORE initial timing decision to avoid condition overlap
    if (this.askGuildBeforeNextFaction && !this.guildCompleted) {
      const guildResponse = responses.find(
        (r) => r.factionId === Faction.SPACING_GUILD
      );
      if (guildResponse) {
        return this.processGuildBeforeFactionDecision(
          newState,
          guildResponse,
          events
        );
      }
    }

    // 4. Handle Guild initial timing decision
    if (
      this.guildInGame &&
      !this.guildCompleted &&
      responses.some(
        (r) =>
          r.factionId === Faction.SPACING_GUILD &&
          (r.actionType === "GUILD_TIMING_DECISION" ||
            r.actionType?.startsWith("GUILD_"))
      )
    ) {
      return this.processGuildTimingDecision(newState, responses, events);
    }

    // 5. Get current faction from non-Guild storm order (or Guild if they're acting)
    const currentFaction = this.getCurrentFaction(state);
    if (!currentFaction) {
      // Check if we've actually processed all non-Guild factions
      // Only call finalizePhase if we've gone through all factions, not at phase start
      if (this.currentFactionIndex >= this.nonGuildStormOrder.length) {
        // All factions done - check if Guild needs to go last
        return this.finalizePhase(newState, events);
      }
      // We're at phase start and no faction is set yet - start the first faction
      // This can happen if Guild chose LATER and we need to ask them before first faction
      if (
        this.askGuildBeforeNextFaction &&
        !this.guildCompleted &&
        this.currentFactionIndex < this.nonGuildStormOrder.length
      ) {
        const nextFaction = this.nonGuildStormOrder[this.currentFactionIndex];
        return this.askGuildBeforeFaction(newState, events, nextFaction);
      }
      // Otherwise, start the next faction normally
      return this.startNextFaction(newState, events);
    }

    const currentResponse = responses.find(
      (r) => r.factionId === currentFaction
    );
    if (!currentResponse) {
      console.error(`⚠️  No response from ${FACTION_NAMES[currentFaction]}`);
      return this.advanceToNextFaction(newState, events);
    }

    // 6. Process current faction's action based on phase
    // Valid shipment action types (different factions use different tools)
    const SHIPMENT_ACTION_TYPES = [
      "SHIP_FORCES", // Normal shipment
      "FREMEN_SEND_FORCES", // Fremen native reserves (Rule 2.04.05)
      "GUILD_CROSS_SHIP", // Guild cross-ship (Rule 2.06.05.01)
      "GUILD_SHIP_OFF_PLANET", // Guild off-planet (Rule 2.06.05.02)
    ];
    const isShipmentAction =
      !currentResponse.passed &&
      SHIPMENT_ACTION_TYPES.includes(currentResponse.actionType || "");

    if (this.currentFactionPhase === "SHIP") {
      // Process shipment - check for valid shipment action types
      if (isShipmentAction) {
        const result = this.processShipment(newState, currentResponse, events);
        newState = result.state;
        events.push(...result.events);

        // Check if we need to ask BG about INTRUSION (Rule 2.02.16)
        // Must check BEFORE spiritual advisor, as INTRUSION happens when forces enter
        const normalized = normalizeTerritoryIdsInResponse(
          currentResponse.data
        );
        const territoryId = normalized.normalized
          ? (normalized.data.territoryId as TerritoryId)
          : (currentResponse.data.territoryId as TerritoryId);
        const sector = currentResponse.data.sector as number | undefined;

        if (
          territoryId &&
          sector !== undefined &&
          this.shouldAskBGIntrusion(
            newState,
            currentFaction,
            territoryId,
            sector
          )
        ) {
          this.waitingForBGIntrusion = true;
          this.bgIntrusionTrigger = {
            territory: territoryId,
            sector,
            enteringFaction: currentFaction,
          };
          return this.requestBGIntrusion(newState, events);
        }

        // Check if we need to ask BG about spiritual advisor
        // Rule 2.02.05: Only triggers for off-planet shipments (not Guild cross-ship or Guild off-planet)
        if (
          this.shouldAskBGSpiritualAdvisor(
            newState,
            currentFaction,
            currentResponse.actionType
          )
        ) {
          this.waitingForBGAdvisor = true;
          // Normalize territory ID from response (agent responses aren't validated by Zod)
          const normalized = normalizeTerritoryIdsInResponse(
            currentResponse.data
          );
          const territoryId = normalized.normalized
            ? (normalized.data.territoryId as TerritoryId)
            : (currentResponse.data.territoryId as TerritoryId); // Fallback if normalization fails
          const triggeringShipment = {
            territory: territoryId,
            sector: currentResponse.data.sector as number,
          };
          this.bgTriggeringShipment = triggeringShipment;
          // Store in game state for tool validation (Rule 2.02.11)
          newState = {
            ...newState,
            bgSpiritualAdvisorTrigger: triggeringShipment,
          };
          return this.requestBGSpiritualAdvisor(newState, events);
        }
      } else if (
        !currentResponse.passed &&
        currentResponse.actionType === "MOVE_FORCES"
      ) {
        // BUG FIX: Agent responded with MOVE during SHIP phase - this means they want to skip shipment
        console.log(
          `   ⏭️  ${FACTION_NAMES[currentFaction]} passed on shipment (MOVE_FORCES during SHIP phase)\n`
        );
        // Process the move now instead of requesting it again
        const result = this.processMovement(newState, currentResponse, events);
        newState = result.state;
        events.push(...result.events);

        // Faction completed - apply alliance constraint
        console.log(
          `\n   ✅ ${FACTION_NAMES[currentFaction]} completed ship + move`
        );
        const allianceResult = this.applyAllianceConstraintForFaction(
          newState,
          currentFaction,
          events
        );
        newState = allianceResult.state;
        events.push(...allianceResult.events);

        // Move to next faction
        this.currentFactionPhase = "DONE";
        return this.advanceToNextFaction(newState, events);
      } else {
        console.log(
          `   ⏭️  ${FACTION_NAMES[currentFaction]} passes on shipment\n`
        );
      }

      // Move to movement phase only if we haven't already processed movement
      if (this.currentFactionPhase === "SHIP") {
        this.currentFactionPhase = "MOVE";
        return this.requestMovementDecision(newState, events);
      }
    } else if (this.currentFactionPhase === "MOVE") {
      // Process movement
      let movementSucceeded = false;
      if (
        !currentResponse.passed &&
        currentResponse.actionType === "MOVE_FORCES"
      ) {
        const result = this.processMovement(newState, currentResponse, events);
        newState = result.state;
        events.push(...result.events);
        // Check if movement actually succeeded (events were generated)
        movementSucceeded = result.events.length > 0;

        // Check if we need to ask BG about INTRUSION (Rule 2.02.16)
        if (movementSucceeded) {
          const normalized = normalizeTerritoryIdsInResponse(
            currentResponse.data
          );
          const toTerritoryId = normalized.normalized
            ? (normalized.data.toTerritoryId as TerritoryId | undefined)
            : ((currentResponse.data.to as { territory?: TerritoryId })
                ?.territory as TerritoryId | undefined);
          const toSector = normalized.normalized
            ? (normalized.data.toSector as number | undefined)
            : ((currentResponse.data.to as { sector?: number })?.sector as
                | number
                | undefined);

          if (
            toTerritoryId &&
            toSector !== undefined &&
            this.shouldAskBGIntrusion(
              newState,
              currentFaction,
              toTerritoryId,
              toSector
            )
          ) {
            this.waitingForBGIntrusion = true;
            this.bgIntrusionTrigger = {
              territory: toTerritoryId,
              sector: toSector,
              enteringFaction: currentFaction,
            };
            return this.requestBGIntrusion(newState, events);
          }
        }
      } else {
        console.log(
          `   ⏭️  ${FACTION_NAMES[currentFaction]} passes on movement\n`
        );
        movementSucceeded = true; // Passing is considered success
      }

      // Only mark as completed if movement succeeded or was passed
      if (movementSucceeded) {
        // Check if we need to ask BG about INTRUSION (Rule 2.02.16)
        if (this.waitingForBGIntrusion && this.bgIntrusionTrigger) {
          return this.requestBGIntrusion(newState, events);
        }

        // Faction completed - apply alliance constraint
        console.log(
          `\n   ✅ ${FACTION_NAMES[currentFaction]} completed ship + move`
        );
        const allianceResult = this.applyAllianceConstraintForFaction(
          newState,
          currentFaction,
          events
        );
        newState = allianceResult.state;
        events.push(...allianceResult.events);

        // Move to next faction
        this.currentFactionPhase = "DONE";
        return this.advanceToNextFaction(newState, events);
      } else {
        // Movement failed - don't mark as completed, but still advance to avoid infinite loop
        console.log(
          `\n   ⚠️  ${FACTION_NAMES[currentFaction]} movement failed, but continuing to next faction\n`
        );
        this.currentFactionPhase = "DONE";
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
  // GUILD TIMING - SIMPLIFIED FLOW
  // ===========================================================================

  /**
   * Ask Guild ONCE at phase start: "When do you want to act?"
   */
  private askGuildInitialTiming(
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
  private processGuildTimingDecision(
    state: GameState,
    responses: AgentResponse[],
    events: PhaseEvent[]
  ): PhaseStepResult {
    const guildResponse = responses.find(
      (r) => r.factionId === Faction.SPACING_GUILD
    );
    if (!guildResponse) {
      // Default to LATER if no response
      console.log(`\n   ⏸️  Guild: No response, defaulting to LATER\n`);
      this.askGuildBeforeNextFaction = true;
      return this.startNextFaction(state, events);
    }

    const decision = guildResponse.data?.decision as string | undefined;
    const actionType = guildResponse.actionType;

    // Check if Guild wants to act NOW
    if (decision === "act_now" || actionType === "GUILD_ACT_NOW") {
      console.log(`\n   ✅ Guild chooses: ACT NOW (ship + move immediately)\n`);
      // Guild will ship and move, then mark as completed
      return this.startGuildShipment(state, events);
    }
    // Check if Guild wants to delay to end
    else if (
      decision === "delay_to_end" ||
      actionType === "GUILD_DELAY_TO_END"
    ) {
      console.log(
        `\n   ⏸️  Guild chooses: DELAY TO END (will go after all other factions)\n`
      );
      this.guildWantsToDelayToEnd = true;
      this.guildCompleted = true; // Mark as "done" for now, will reset later
      return this.startNextFaction(state, events);
    }
    // Guild wants to be asked LATER
    else {
      console.log(
        `\n   ⏸️  Guild chooses: LATER (will be asked before each faction)\n`
      );
      this.askGuildBeforeNextFaction = true;
      return this.startNextFaction(state, events);
    }
  }

  /**
   * Ask Guild before each faction: "Do you want to act now?"
   */
  private askGuildBeforeFaction(
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
  private processGuildBeforeFactionDecision(
    state: GameState,
    guildResponse: AgentResponse,
    events: PhaseEvent[]
  ): PhaseStepResult {
    const decision = guildResponse.data?.decision as string | undefined;
    const actionType = guildResponse.actionType;

    if (decision === "act_now" || actionType === "GUILD_ACT_NOW") {
      console.log(`\n   ✅ Guild chooses: ACT NOW\n`);
      this.askGuildBeforeNextFaction = false; // Don't ask again
      return this.startGuildShipment(state, events);
    } else {
      console.log(
        `\n   ⏸️  Guild chooses: WAIT (continue to current faction)\n`
      );
      // BUG FIX: Temporarily disable Guild check for THIS faction
      // We'll ask Guild again before the NEXT faction
      this.askGuildBeforeNextFaction = false;

      // Get the current faction we're about to start
      const faction = this.nonGuildStormOrder[this.currentFactionIndex];
      this.currentFaction = faction;
      this.currentFactionPhase = "SHIP";

      return this.requestShipmentDecisionForFaction(state, events, faction);
    }
  }

  /**
   * Start Guild's shipment phase
   */
  private startGuildShipment(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    this.currentFaction = Faction.SPACING_GUILD;
    this.currentFactionPhase = "SHIP";
    this.askGuildBeforeNextFaction = false; // Don't ask Guild again
    const stateWithActive = setActiveFactions(state, [Faction.SPACING_GUILD]);
    return this.requestShipmentDecisionForFaction(
      stateWithActive,
      events,
      Faction.SPACING_GUILD
    );
  }

  // ===========================================================================
  // FACTION SEQUENCING
  // ===========================================================================

  /**
   * Get current faction (tracked explicitly)
   */
  private getCurrentFaction(_state: GameState): Faction | null {
    return this.currentFaction;
  }

  /**
   * Start the next faction's turn (ship + move)
   */
  private startNextFaction(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    // Get next faction from non-Guild storm order
    if (this.currentFactionIndex >= this.nonGuildStormOrder.length) {
      // All non-Guild factions done
      return this.finalizePhase(state, events);
    }

    const faction = this.nonGuildStormOrder[this.currentFactionIndex];

    // Check if Guild wants to act before this faction
    if (this.askGuildBeforeNextFaction && !this.guildCompleted) {
      return this.askGuildBeforeFaction(state, events, faction);
    }

    // Start this faction's shipment
    this.currentFaction = faction;
    this.currentFactionPhase = "SHIP";
    const stateWithActive = setActiveFactions(state, [faction]);
    return this.requestShipmentDecisionForFaction(
      stateWithActive,
      events,
      faction
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
    if (this.currentFaction === Faction.SPACING_GUILD && !this.guildCompleted) {
      this.guildCompleted = true;
      console.log(`\n   ✅ Guild completed\n`);
    }

    // Move to next faction in non-Guild storm order (only if not Guild)
    if (this.currentFaction !== Faction.SPACING_GUILD) {
      this.currentFactionIndex++;

      // BUG FIX: Re-enable Guild check for the NEXT faction
      // (if Guild previously chose "LATER" and hasn't acted yet)
      if (
        this.guildInGame &&
        !this.guildCompleted &&
        !this.guildWantsToDelayToEnd
      ) {
        this.askGuildBeforeNextFaction = true;
      }
    }

    this.currentFaction = null;
    return this.startNextFaction(state, events);
  }

  /**
   * Finalize phase - check if Guild needs to go last
   *
   * This method is called when all non-Guild factions have completed their actions.
   * It ensures Guild gets a chance to act if they haven't already:
   * - If Guild explicitly chose DELAY_TO_END (HOLDING PATTERN)
   * - If Guild chose LATER but kept choosing WAIT (must act now, can't wait anymore)
   */
  private finalizePhase(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    // Check if Guild explicitly delayed to end (HOLDING PATTERN - Rule 2.06.12.02)
    // When Guild chooses DELAY_TO_END, guildCompleted is set to true as a flag
    // We reset it here to allow Guild to act
    if (this.guildWantsToDelayToEnd && this.guildCompleted) {
      console.log(`\n🕰️  HOLDING PATTERN: Guild goes last\n`);
      this.guildCompleted = false; // Reset to allow Guild to act
      this.guildWantsToDelayToEnd = false;
      return this.startGuildShipment(state, events);
    }

    // BUG FIX: Check if Guild chose LATER and kept waiting - they must act now
    // When Guild chooses LATER, they're asked before each faction. If they keep
    // choosing WAIT for all factions, we must force them to act before phase ends
    // since there are no more factions to wait for.
    //
    // CRITICAL: Only force Guild if we've actually processed at least one faction.
    // If currentFactionIndex is still 0, we haven't processed any factions yet,
    // so we shouldn't force Guild - they should be asked before the first faction.
    //
    // Condition breakdown:
    // - guildInGame: Guild is in the game
    // - !guildCompleted: Guild hasn't acted yet
    // - !guildWantsToDelayToEnd: Guild chose LATER, not DELAY_TO_END (already handled above)
    // - currentFactionIndex > 0: We've processed at least one faction (safety check)
    if (
      this.guildInGame &&
      !this.guildCompleted &&
      !this.guildWantsToDelayToEnd &&
      this.currentFactionIndex > 0
    ) {
      console.log(
        `\n🕰️  Guild chose LATER but hasn't acted yet - must act now before phase ends\n`
      );
      return this.startGuildShipment(state, events);
    }

    // Phase complete!
    console.log(`\n✅ All factions have completed Shipment & Movement\n`);
    console.log("=".repeat(80) + "\n");

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

  // ===========================================================================
  // REQUEST METHODS
  // ===========================================================================

  private requestShipmentDecisionForFaction(
    state: GameState,
    events: PhaseEvent[],
    faction: Faction
  ): PhaseStepResult {
    const factionState = getFactionState(state, faction);
    const reserves = factionState.forces.reserves;
    const totalReserves = reserves.regular + reserves.elite;

    const isGuild = faction === Faction.SPACING_GUILD;
    const isFremen = faction === Faction.FREMEN;
    const hasGuild = state.factions.has(Faction.SPACING_GUILD);
    const baseShippingCost = GAME_CONSTANTS.SHIPMENT_COST;

    // Calculate costs
    let costToStronghold: number = baseShippingCost;
    let costElsewhere: number = baseShippingCost * 2;
    if (isGuild) {
      // Guild pays half price (Rule 2.06.07: HALF PRICE SHIPPING)
      costToStronghold = Math.ceil(costToStronghold / 2);
      costElsewhere = Math.ceil(costElsewhere / 2);
    }

    console.log(`\n🚢 SHIPMENT: ${FACTION_NAMES[faction]}`);
    console.log(
      `   Reserves: ${totalReserves} forces (${reserves.regular} regular, ${reserves.elite} elite)`
    );
    console.log(`   Spice: ${factionState.spice}`);

    // Fremen have special shipment display
    if (isFremen) {
      console.log(`   Cost: FREE (Fremen native reserves - Rule 2.04.05)`);
      console.log(
        `   Valid Destinations: Great Flat or within 2 territories of Great Flat`
      );
      console.log(`   Use 'fremen_send_forces' tool for shipment`);
    } else {
      console.log(
        `   Cost: ${costToStronghold}/force (strongholds), ${costElsewhere}/force (elsewhere)`
      );
    }

    const validDestinations = this.getValidShippingDestinations(state, faction);

    // Build shipment context: where our forces are and stronghold states
    const shipmentContext = buildShipmentContext(state, faction);

    // Build prompt based on faction
    let prompt: string;
    let availableActions: string[];

    if (isFremen) {
      // Build list of available territories for Fremen
      const fremenTerritories =
        shipmentContext.fremenAvailableTerritories || [];
      const territoryList = fremenTerritories
        .map((t) => {
          const parts: string[] = [];
          parts.push(t.name);

          // Add distance indicator
          if (t.distance === 0) {
            parts.push("(Great Flat)");
          } else {
            parts.push(`(distance ${t.distance})`);
          }

          // Add storm status
          if (t.hasAnySectorInStorm) {
            if (t.safeSectors.length === 0) {
              parts.push(
                "[ALL SECTORS IN STORM - use storm migration for half loss]"
              );
            } else {
              parts.push(`[${t.inStormSectors.length} sector(s) in storm]`);
            }
          }

          // Add occupancy info
          if (
            t.isStronghold &&
            t.occupancyCount >= 2 &&
            !t.occupants.includes(faction)
          ) {
            parts.push(`[OCCUPANCY LIMIT: ${t.occupancyCount} factions]`);
          } else if (t.occupancyCount > 0) {
            const occupantNames = t.occupants
              .map((f) => FACTION_NAMES[f])
              .join(", ");
            parts.push(`[occupied by: ${occupantNames}]`);
          }

          // Add spice info
          if (t.spice > 0) {
            parts.push(`(${t.spice} spice)`);
          }

          // Add my forces if present
          if (t.myForces > 0) {
            parts.push(`(you have ${t.myForces} forces here)`);
          }

          // Add canShipHere status
          if (!t.canShipHere && t.reasonCannotShip) {
            parts.push(`[CANNOT SHIP: ${t.reasonCannotShip}]`);
          }

          return parts.join(" ");
        })
        .join("\n- ");

      const ownForceSummary = shipmentContext.ownForces
        .map((loc) => `${loc.name}: ${loc.totalForces} forces`)
        .join(", ");

      prompt = `Shipment: You have ${totalReserves} forces in reserves. As Fremen, you ship for FREE to Great Flat or territories within 2 of Great Flat. Use 'fremen_send_forces' tool (NOT 'ship_forces').

Available destinations:
- ${territoryList || "none available"}

${
  ownForceSummary
    ? `Current board presence: ${ownForceSummary}`
    : "No forces on board yet"
}`;
      availableActions = ["fremen_send_forces", "pass_shipment"];
    } else {
      // Enhance prompt with brief summary of board presence and strongholds
      const strongholdSummary = shipmentContext.strongholds
        .map((s) => {
          const myPresence = s.myForces > 0 ? " (you have forces here)" : "";
          const storm = s.inStorm ? " [IN STORM]" : "";
          return `${s.name}${storm}${myPresence}`;
        })
        .join(", ");

      const ownForceSummary = shipmentContext.ownForces
        .map((loc) => `${loc.name}: ${loc.totalForces} forces`)
        .join(", ");

      prompt = `Shipment: You have ${totalReserves} forces in reserves. Cost: ${costToStronghold} spice per force to strongholds, ${costElsewhere} elsewhere.

Current board presence:
- Your forces: ${ownForceSummary || "none on board"}
- Strongholds: ${strongholdSummary || "none occupied yet"}

Do you want to ship forces, and if so, where?`;
      availableActions = ["ship_forces", "pass_shipment"];

      // Guild has additional options
      if (isGuild) {
        availableActions.push("guild_cross_ship", "guild_ship_off_planet");
      }
    }

    const pendingRequests: AgentRequest[] = [
      {
        factionId: faction,
        requestType: "SHIP_FORCES",
        prompt,
        context: {
          reservesRegular: reserves.regular,
          reservesElite: reserves.elite,
          totalReserves,
          spiceAvailable: factionState.spice,
          shippingCostToStronghold: isFremen ? 0 : costToStronghold,
          shippingCostElsewhere: isFremen ? 0 : costElsewhere,
          isGuild,
          isFremen,
          guildInGame: hasGuild,
          validDestinations,
          phase: "shipment",
          willMoveAfter: true,
          shipmentContext, // NEW: where our forces are and stronghold states
        },
        availableActions,
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

  private requestMovementDecision(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    // Get current faction
    const faction = this.getCurrentFaction(state);
    if (!faction) {
      return this.finalizePhase(state, events);
    }

    // CRITICAL: Use ornithopter access from phase START, not current state
    // This prevents factions from gaining ornithopter access by shipping into Arrakeen/Carthag first
    const hasOrnithopters = this.ornithopterAccessAtPhaseStart.has(faction);
    const movementRange = this.getMovementRangeForFaction(
      faction,
      hasOrnithopters
    );

    console.log(`\n🚶 MOVEMENT: ${FACTION_NAMES[faction]}`);
    console.log(
      `   Movement Range: ${movementRange} territory${
        movementRange !== 1 ? "ies" : ""
      }${hasOrnithopters ? " (Ornithopters)" : ""}`
    );

    // Build detailed movement context for informed decision-making
    const movementContext = buildMovementContext(
      state,
      faction,
      movementRange,
      hasOrnithopters
    );

    // Build prompt with detailed context information
    let prompt = `Movement: You have ${
      movementContext.forceStacks.length
    } force stack${
      movementContext.forceStacks.length !== 1 ? "s" : ""
    }. Movement range: ${movementRange} territories${
      hasOrnithopters ? " (ornithopters)" : ""
    }.\n\n`;

    prompt += `IMPORTANT: You can move a SUBGROUP of forces from any territory - you don't have to move all forces. For example, if you have 10 forces in Arrakeen and want to collect spice nearby, you can move just 3 forces out, leaving 7 behind to keep control of the stronghold.\n\n`;

    if (movementContext.forceStacks.length > 0) {
      prompt += `Current Situation:\n`;
      for (const stack of movementContext.forceStacks) {
        prompt += `- ${stack.fromTerritory.name} (sector ${stack.myForces.sector}): You have ${stack.myForces.total} forces`;
        if (stack.fromTerritory.spice > 0) {
          prompt += `, territory has ${stack.fromTerritory.spice} spice`;
        }
        if (stack.fromTerritory.allForces.length > 1) {
          const otherForces = stack.fromTerritory.allForces.filter(
            (f) => f.faction !== faction
          );
          if (otherForces.length > 0) {
            prompt += `, ${otherForces.length} other faction${
              otherForces.length !== 1 ? "s" : ""
            } present`;
          }
        }
        prompt += `\n`;

        if (stack.reachableTerritories.length > 0) {
          prompt += `  Can reach ${stack.reachableTerritories.length} territories: `;
          const topDestinations = stack.reachableTerritories.slice(0, 5);
          prompt += topDestinations
            .map((t) => {
              let desc = t.territory.name;
              if (t.territory.spice > 0)
                desc += ` (${t.territory.spice} spice)`;
              if (t.territory.isStronghold) desc += ` [Stronghold]`;
              return desc;
            })
            .join(", ");
          if (stack.reachableTerritories.length > 5) {
            prompt += `, and ${stack.reachableTerritories.length - 5} more`;
          }
          prompt += `\n`;
        } else {
          prompt += `  No reachable territories (blocked by storm or full strongholds)\n`;
        }
      }
      prompt += `\nReview the movementContext below for full details about territories, forces, spice, and reachable destinations.\n`;
      prompt += `Strategic opportunities: Look for territories with spice to enable collection in the next phase.`;
    }

    const pendingRequests: AgentRequest[] = [
      {
        factionId: faction,
        requestType: "MOVE_FORCES",
        prompt,
        context: {
          movementContext, // Full detailed context
          movementRange,
          hasOrnithopters,
          hasOrnithoptersFromPhaseStart: hasOrnithopters, // Pass phase-start ornithopter access
          stormSector: state.stormSector,
          phase: "movement",
          // Keep backwards compatibility
          movableForces: movementContext.forceStacks.map((stack) => ({
            territoryId: stack.fromTerritory.territoryId,
            sector: stack.myForces.sector,
            regular: stack.myForces.regular,
            elite: stack.myForces.elite,
            total: stack.myForces.total,
          })),
        },
        availableActions: ["MOVE_FORCES", "PASS"],
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
   * Calculate movement range for a faction based on ornithopter access (from phase start).
   * Fremen get 2 territories base, all others get 1. Ornithopters add +2 (making it 3).
   */
  private getMovementRangeForFaction(
    faction: Faction,
    hasOrnithopters: boolean
  ): number {
    // Ornithopters grant 3 territories to ANY faction (including Fremen)
    if (hasOrnithopters) return 3;

    // Fremen base movement is 2 territories (without ornithopters)
    if (faction === Faction.FREMEN) return 2;

    // All other factions: 1 territory without ornithopters
    return 1;
  }

  // ===========================================================================
  // PROCESSING METHODS
  // ===========================================================================

  private processShipment(
    state: GameState,
    response: AgentResponse,
    _events: PhaseEvent[]
  ): { state: GameState; events: PhaseEvent[] } {
    const newEvents: PhaseEvent[] = [];
    const faction = response.factionId;
    const actionType = response.actionType;

    let newState = state;

    // Handle different shipment types
    if (actionType === "GUILD_CROSS_SHIP") {
      // Guild cross-ship: Move forces between territories (Rule 2.06.05.01)
      // Normalize territory IDs from agent response (not validated by Zod)
      const normalized = normalizeTerritoryIdsInResponse(response.data);
      const normalizedData = normalized.normalized
        ? normalized.data
        : response.data;
      const fromTerritoryId = normalizedData.fromTerritoryId as
        | TerritoryId
        | undefined;
      const fromSector = normalizedData.fromSector as number | undefined;
      const toTerritoryId = normalizedData.toTerritoryId as
        | TerritoryId
        | undefined;
      const toSector = response.data.toSector as number | undefined;
      const count = response.data.count as number | undefined;
      const useElite = response.data.useElite as boolean | undefined;
      const cost = response.data.cost as number | undefined;

      if (
        fromTerritoryId &&
        toTerritoryId &&
        count !== undefined &&
        fromSector !== undefined &&
        toSector !== undefined
      ) {
        newState = moveForces(
          state,
          faction,
          fromTerritoryId,
          fromSector,
          toTerritoryId,
          toSector,
          count,
          useElite ?? false
        );

        // Handle spice cost
        if (cost !== undefined && cost > 0) {
          newState = removeSpice(newState, faction, cost);
        }

        console.log(
          `   ✅ Cross-shipped ${count} forces from ${fromTerritoryId} to ${toTerritoryId} for ${
            cost ?? 0
          } spice\n`
        );

        newEvents.push({
          type: "FORCES_SHIPPED",
          data: {
            faction,
            from: fromTerritoryId,
            to: toTerritoryId,
            count,
            cost,
          },
          message: `${
            FACTION_NAMES[faction]
          } cross-ships ${count} forces from ${fromTerritoryId} to ${toTerritoryId} for ${
            cost ?? 0
          } spice`,
        });

        // Check for BG INTRUSION (Rule 2.02.16) - after cross-ship completes
        if (
          this.shouldAskBGIntrusion(newState, faction, toTerritoryId, toSector)
        ) {
          this.waitingForBGIntrusion = true;
          this.bgIntrusionTrigger = {
            territory: toTerritoryId,
            sector: toSector,
            enteringFaction: faction,
          };
          // Will be handled in next processStep call
        }
      }
    } else if (actionType === "GUILD_SHIP_OFF_PLANET") {
      // Guild off-planet: Ship forces from board back to reserves (Rule 2.06.05.02)
      // Normalize territory IDs from agent response (not validated by Zod)
      const normalized = normalizeTerritoryIdsInResponse(response.data);
      const normalizedData = normalized.normalized
        ? normalized.data
        : response.data;
      const fromTerritoryId = normalizedData.fromTerritoryId as
        | TerritoryId
        | undefined;
      const fromSector = response.data.fromSector as number | undefined;
      const count = response.data.count as number | undefined;
      const useElite = response.data.useElite as boolean | undefined;
      const cost = response.data.cost as number | undefined;

      if (fromTerritoryId && count !== undefined && fromSector !== undefined) {
        newState = sendForcesToReserves(
          state,
          faction,
          fromTerritoryId,
          fromSector,
          count,
          useElite ?? false
        );

        // Handle spice cost
        if (cost !== undefined && cost > 0) {
          newState = removeSpice(newState, faction, cost);
        }

        console.log(
          `   ✅ Shipped ${count} forces off-planet from ${fromTerritoryId} for ${
            cost ?? 0
          } spice\n`
        );

        newEvents.push({
          type: "FORCES_SHIPPED",
          data: { faction, from: fromTerritoryId, count, cost },
          message: `${
            FACTION_NAMES[faction]
          } ships ${count} forces off-planet from ${fromTerritoryId} for ${
            cost ?? 0
          } spice`,
        });
      }
    } else {
      // Normal shipment or Fremen shipment: Ship from reserves to board
      // Normalize territory IDs from agent response (not validated by Zod)
      const normalized = normalizeTerritoryIdsInResponse(response.data);
      const territoryId = normalized.normalized
        ? (normalized.data.territoryId as TerritoryId | undefined)
        : (response.data.territoryId as TerritoryId | undefined);
      const sector = response.data.sector as number | undefined;
      const count = response.data.count as number | undefined;
      const cost = response.data.cost as number | undefined;
      const useElite = response.data.useElite as boolean | undefined;

      if (territoryId && count !== undefined && sector !== undefined) {
        // Check if the tool already applied the shipment.
        // Tools that mutate state (like ship_forces) MUST set response.data.appliedByTool = true.
        const toolAlreadyApplied = response.data.appliedByTool === true;

        if (toolAlreadyApplied) {
          // State has already been updated by tool - don't apply again.
          console.log(
            `   ℹ️  Shipment already applied by tool for ${FACTION_NAMES[faction]} to ${territoryId} (sector ${sector}), emitting event without additional mutation\n`
          );
        } else {
          // Actually mutate state - call the state mutation function
          // This is needed because in tests, tools aren't called, so state isn't updated
          try {
            newState = shipForces(
              state,
              faction,
              territoryId,
              sector,
              count,
              useElite ?? false
            );
          } catch (error) {
            // Handle defensive validation errors from shipForces()
            if (
              error instanceof Error &&
              error.message.includes("Stronghold occupancy violation")
            ) {
              console.error(`❌ ${error.message}`);
              // Return error event instead of crashing
              newEvents.push({
                type: "STRONGHOLD_OCCUPANCY_VIOLATION",
                data: {
                  faction,
                  territory: territoryId,
                  reason: "OCCUPANCY_LIMIT_EXCEEDED",
                },
                message: `Shipment rejected: ${error.message}`,
              });
              // Don't apply the shipment - return original state
              return { state, events: newEvents };
            }
            // Re-throw other errors
            throw error;
          }

          // Handle spice cost (if any) ONLY when handler is applying shipment itself.
          if (cost !== undefined && cost > 0) {
            // Check if Guild is in game - they receive payment
            const hasGuild = newState.factions.has(Faction.SPACING_GUILD);
            if (hasGuild && faction !== Faction.SPACING_GUILD) {
              // Guild receives payment (Rule 2.06.04)
              newState = removeSpice(newState, faction, cost);
              newState = addSpice(newState, Faction.SPACING_GUILD, cost);
            } else {
              // Spice goes to bank
              newState = removeSpice(newState, faction, cost);
            }
          }
        }

        console.log(
          `   ✅ Shipped ${count} forces to ${territoryId} (sector ${sector}) for ${
            cost ?? 0
          } spice${toolAlreadyApplied ? " (applied by tool)" : ""}\n`
        );

        newEvents.push({
          type: "FORCES_SHIPPED",
          data: { faction, territory: territoryId, sector, count, cost },
          message: `${
            FACTION_NAMES[faction]
          } ships ${count} forces to ${territoryId} (sector ${sector}) for ${
            cost ?? 0
          } spice`,
        });
      }
    }

    // Log action for all shipment types
    if (newState !== state) {
      newState = logAction(newState, "FORCES_SHIPPED", faction, response.data);

      // CRITICAL: Validate stronghold occupancy after shipment
      // This catches violations even if pre-validation was bypassed or used stale state
      const violations = validateStrongholdOccupancy(newState);
      if (violations.length > 0) {
        // Log and create error event
        for (const violation of violations) {
          console.error(
            `❌ STRONGHOLD OCCUPANCY VIOLATION after shipment: ${
              violation.territoryId
            } has ${violation.count} factions: ${violation.factions.join(", ")}`
          );
          newEvents.push({
            type: "STRONGHOLD_OCCUPANCY_VIOLATION",
            data: {
              territoryId: violation.territoryId,
              factions: violation.factions,
              count: violation.count,
            },
            message: `⚠️ CRITICAL ERROR: After shipment, ${
              violation.territoryId
            } has ${
              violation.count
            } factions (max 2 allowed): ${violation.factions.join(", ")}`,
          });
        }
        // Revert to previous state to prevent invalid game state
        console.error(`❌ Reverting shipment to prevent invalid game state`);
        return { state, events: newEvents };
      }
    }

    return { state: newState, events: newEvents };
  }

  private processMovement(
    state: GameState,
    response: AgentResponse,
    events: PhaseEvent[]
  ): { state: GameState; events: PhaseEvent[] } {
    const newEvents: PhaseEvent[] = [];
    const faction = response.factionId;

    // Tool returns: { fromTerritoryId, fromSector, toTerritoryId, toSector, count, useElite }
    // OR legacy format: { from: { territory, sector }, to: { territory, sector }, count }
    let fromTerritoryId: TerritoryId | undefined;
    let fromSector: number | undefined;
    let toTerritoryId: TerritoryId | undefined;
    let toSector: number | undefined;
    let count: number | undefined;
    let useElite: boolean | undefined;

    // Normalize territory IDs from agent response (not validated by Zod)
    const normalized = normalizeTerritoryIdsInResponse(response.data);
    const normalizedData = normalized.normalized
      ? normalized.data
      : response.data;

    // Check for new format first
    if (normalizedData.fromTerritoryId && normalizedData.toTerritoryId) {
      fromTerritoryId = normalizedData.fromTerritoryId as TerritoryId;
      fromSector = normalizedData.fromSector as number | undefined;
      toTerritoryId = normalizedData.toTerritoryId as TerritoryId;
      toSector = normalizedData.toSector as number | undefined;
      count = normalizedData.count as number | undefined;
      useElite = normalizedData.useElite as boolean | undefined;
    } else {
      // Legacy format
      const fromData = normalizedData.from as
        | { territory?: TerritoryId; sector?: number }
        | undefined;
      const toData = normalizedData.to as
        | { territory?: TerritoryId; sector?: number }
        | undefined;
      count = normalizedData.count as number | undefined;

      if (fromData?.territory && toData?.territory) {
        fromTerritoryId = fromData.territory;
        fromSector = fromData.sector;
        toTerritoryId = toData.territory;
        toSector = toData.sector;
      }
    }

    if (
      !fromTerritoryId ||
      !toTerritoryId ||
      count === undefined ||
      fromSector === undefined ||
      toSector === undefined
    ) {
      return { state, events: newEvents };
    }

    // Check if the tool already applied the movement.
    // Tools that mutate state (like move_forces) MUST set response.data.appliedByTool = true.
    const toolAlreadyApplied = response.data.appliedByTool === true;

    if (toolAlreadyApplied) {
      console.log(
        `   ℹ️  Movement already applied by tool for ${FACTION_NAMES[faction]} from ${fromTerritoryId} to ${toTerritoryId}, emitting event without additional mutation\n`
      );
      // Still create event to indicate movement happened (tool already applied state change)
      newEvents.push({
        type: "FORCES_MOVED",
        data: {
          faction,
          from: fromTerritoryId,
          fromSector,
          to: toTerritoryId,
          toSector,
          count,
        },
        message: `${FACTION_NAMES[faction]} moves ${count} forces from ${fromTerritoryId} to ${toTerritoryId}`,
      });
      const newState = logAction(state, "FORCES_MOVED", faction, {
        from: fromTerritoryId,
        fromSector,
        to: toTerritoryId,
        toSector,
        count,
      });
      return { state: newState, events: newEvents };
    }

    // Validate movement before executing (since tools aren't called in tests)
    // Use ornithopter access override if available (from phase start)
    const hasOrnithoptersOverride =
      this.ornithopterAccessAtPhaseStart.has(faction);
    const validation = validateMovement(
      state,
      faction,
      fromTerritoryId,
      fromSector,
      toTerritoryId,
      toSector,
      count,
      hasOrnithoptersOverride
    );

    if (!validation.valid) {
      const error = validation.errors[0];
      console.error(`   ❌ Movement rejected: ${error.message}\n`);
      // Still return state (no mutation), but log the error
      // IMPORTANT: Return empty events so caller knows movement failed
      return { state, events: [] };
    }

    // Check if TAKE UP ARMS should trigger (Rule 2.02.17)
    // Must check BEFORE movement to see if advisors are being moved and if destination is eligible
    let takeUpArmsTrigger: {
      territory: TerritoryId;
      sector: number;
      advisorCount: number;
    } | null = null;
    if (faction === Faction.BENE_GESSERIT) {
      // Check source stack to see if advisors are being moved
      const bgState = getFactionState(state, Faction.BENE_GESSERIT);
      const sourceStack = bgState.forces.onBoard.find(
        (s) => s.territoryId === fromTerritoryId && s.sector === fromSector
      );

      if (sourceStack && (sourceStack.advisors ?? 0) > 0) {
        const sourceAdvisors = sourceStack.advisors ?? 0;
        // removeFromStackForFaction removes advisors first, so advisors being moved = min(count, sourceAdvisors)
        const advisorsToMove = Math.min(count, sourceAdvisors);

        if (advisorsToMove > 0) {
          // Need to check if the destination stack (if it exists) is in the same sector
          const destStack = bgState.forces.onBoard.find(
            (s) => s.territoryId === toTerritoryId && s.sector === toSector
          );
          const destAdvisors = destStack ? destStack.advisors ?? 0 : 0;

          // Rule: "if you do not already have advisors present"
          // This means BEFORE the move, so check existing advisors (excluding the ones being moved)
          if (
            destAdvisors === 0 &&
            this.shouldAskTakeUpArms(state, toTerritoryId, toSector)
          ) {
            takeUpArmsTrigger = {
              territory: toTerritoryId,
              sector: toSector,
              advisorCount: advisorsToMove,
            };
          }
        }
      }
    }

    // Actually apply the movement (tool didn't apply it, so we need to)
    // Actually mutate state - call the state mutation function
    // This is needed because in tests, tools aren't called, so state isn't updated
    let newState = moveForces(
      state,
      faction,
      fromTerritoryId,
      fromSector,
      toTerritoryId,
      toSector,
      count,
      useElite ?? false
    );

    console.log(
      `   ✅ Moved ${count} forces from ${fromTerritoryId} to ${toTerritoryId}\n`
    );

    newEvents.push({
      type: "FORCES_MOVED",
      data: {
        faction,
        from: fromTerritoryId,
        fromSector,
        to: toTerritoryId,
        toSector,
        count,
      },
      message: `${FACTION_NAMES[faction]} moves ${count} forces from ${fromTerritoryId} to ${toTerritoryId}`,
    });

    newState = logAction(newState, "FORCES_MOVED", faction, {
      from: fromTerritoryId,
      fromSector,
      to: toTerritoryId,
      toSector,
      count,
    });

    // Trigger TAKE UP ARMS if conditions were met
    if (takeUpArmsTrigger) {
      this.waitingForTakeUpArms = true;
      this.takeUpArmsTrigger = takeUpArmsTrigger;
      return this.requestTakeUpArms(newState, events);
    }

    // Note: INTRUSION check is now handled in processStep after movement completes
    // This ensures proper flow control and request handling

    return { state: newState, events: newEvents };
  }

  // ===========================================================================
  // ALLIANCE CONSTRAINT (Rule 1.06.03.08)
  // ===========================================================================

  /**
   * Apply alliance constraint for a specific faction that just completed actions.
   *
   * Rule 1.06.03.08: "At the end of your Shipment and Movement actions,
   * Place all your Forces that are in the same Territory (except the Polar Sink)
   * as your Ally's Forces in the Tleilaxu Tanks."
   *
   * CRITICAL: Applied AFTER EACH faction completes, not at end of phase!
   */
  private applyAllianceConstraintForFaction(
    state: GameState,
    faction: Faction,
    _events: PhaseEvent[]
  ): { state: GameState; events: PhaseEvent[] } {
    const newEvents: PhaseEvent[] = [];
    let newState = state;

    const factionState = state.factions.get(faction);
    if (!factionState) return { state, events: newEvents };

    const allyId = factionState.allyId;
    if (!allyId) {
      // No ally, no constraint
      return { state, events: newEvents };
    }

    const allyState = state.factions.get(allyId);
    if (!allyState) return { state, events: newEvents };

    // Get all territories where this faction has forces
    const factionTerritories = new Set<TerritoryId>();
    for (const stack of factionState.forces.onBoard) {
      factionTerritories.add(stack.territoryId);
    }

    // Check each territory for ally presence
    for (const territoryId of Array.from(factionTerritories)) {
      // Rule: Except Polar Sink
      if (territoryId === TerritoryId.POLAR_SINK) continue;

      const occupants = getFactionsInTerritory(newState, territoryId);
      if (occupants.includes(allyId)) {
        // Ally is in this territory - send all forces to tanks
        const forcesInTerritory = factionState.forces.onBoard.filter(
          (s) => s.territoryId === territoryId
        );

        let totalForces = 0;
        for (const stack of forcesInTerritory) {
          totalForces += stack.forces.regular + stack.forces.elite;
        }

        if (totalForces > 0) {
          console.log(
            `\n   ⚠️  ALLIANCE CONSTRAINT: ${FACTION_NAMES[faction]} has ${totalForces} forces in ${territoryId} with ally ${FACTION_NAMES[allyId]}`
          );
          console.log(
            `   🗑️  Sending ${totalForces} forces to Tleilaxu Tanks (Rule 1.06.03.08)\n`
          );

          // Send all forces in this territory to tanks
          for (const stack of forcesInTerritory) {
            const count = stack.forces.regular + stack.forces.elite;
            newState = sendForcesToTanks(
              newState,
              faction,
              territoryId,
              stack.sector,
              count
            );
          }

          newEvents.push({
            type: "FORCES_SHIPPED",
            data: {
              faction,
              territory: territoryId,
              count: totalForces,
              reason: "alliance_constraint",
            },
            message: `${FACTION_NAMES[faction]} sends ${totalForces} forces to tanks (alliance constraint: same territory as ${FACTION_NAMES[allyId]})`,
          });

          newState = logAction(newState, "FORCES_SHIPPED", faction, {
            territory: territoryId,
            count: totalForces,
            reason: "alliance_constraint",
          });
        }
      }
    }

    return { state: newState, events: newEvents };
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private getValidShippingDestinations(
    state: GameState,
    _faction: Faction
  ): {
    territoryId: TerritoryId;
    sector: number;
    isStronghold: boolean;
    costMultiplier: number;
  }[] {
    const destinations: {
      territoryId: TerritoryId;
      sector: number;
      isStronghold: boolean;
      costMultiplier: number;
    }[] = [];

    for (const [id, territory] of Object.entries(TERRITORY_DEFINITIONS)) {
      const territoryId = id as TerritoryId;

      // Can't ship to polar sink
      if (territory.type === TerritoryType.POLAR_SINK) continue;

      // Check each sector (can't ship into storm)
      for (const sector of territory.sectors) {
        if (sector === state.stormSector) continue;

        destinations.push({
          territoryId,
          sector,
          isStronghold: territory.type === TerritoryType.STRONGHOLD,
          costMultiplier: territory.type === TerritoryType.STRONGHOLD ? 1 : 2,
        });
      }
    }

    return destinations;
  }

  // ===========================================================================
  // BG SPIRITUAL ADVISOR (Rule 2.02.05)
  // ===========================================================================

  /**
   * Check if we should ask BG about spiritual advisor after a shipment
   *
   * Rule 2.02.05: "Whenever any other faction Ships Forces onto Dune from off-planet"
   * Rule 2.04.03: Fremen reserves are "on Dune (the far side)" - NOT off-planet
   *
   * CRITICAL:
   * - Fremen "Send" forces (not "Ship from off-planet") - does NOT trigger BG
   * - Guild cross-ship (board to board) - does NOT trigger (no off-planet involved)
   * - Guild off-planet (board to reserves) - does NOT trigger (going TO reserves, not FROM)
   */
  private shouldAskBGSpiritualAdvisor(
    state: GameState,
    shippingFaction: Faction,
    actionType?: string
  ): boolean {
    // Only trigger for normal off-planet shipments (SHIP_FORCES)
    // Rule 2.02.05: "Ships Forces onto Dune from off-planet"
    // NOT triggered by:
    // - GUILD_CROSS_SHIP (no off-planet involved)
    // - GUILD_SHIP_OFF_PLANET (going TO reserves, not FROM)
    // - FREMEN_SEND_FORCES (on-planet reserves, not off-planet)
    if (
      actionType === "GUILD_CROSS_SHIP" ||
      actionType === "GUILD_SHIP_OFF_PLANET" ||
      actionType === "FREMEN_SEND_FORCES"
    ) {
      return false;
    }

    // Only trigger for SHIP_FORCES (normal off-planet shipments)
    if (actionType !== "SHIP_FORCES") {
      return false;
    }

    // Only trigger for non-BG factions
    if (shippingFaction === Faction.BENE_GESSERIT) return false;

    // BG must be in game and have reserves
    if (!state.factions.has(Faction.BENE_GESSERIT)) return false;

    const bgState = getFactionState(state, Faction.BENE_GESSERIT);
    const reserves =
      bgState.forces.reserves.regular + bgState.forces.reserves.elite;
    if (reserves === 0) return false;

    return true;
  }

  /**
   * Request BG spiritual advisor decision after another faction ships.
   * Rule 2.02.05: BG may send 1 force for free when any other faction ships.
   */
  private requestBGSpiritualAdvisor(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    if (!this.bgTriggeringShipment) {
      // Shouldn't happen, but handle gracefully
      this.waitingForBGAdvisor = false;
      return this.requestMovementDecision(state, events);
    }

    const { territory, sector } = this.bgTriggeringShipment;
    const bgState = getFactionState(state, Faction.BENE_GESSERIT);
    const reserves =
      bgState.forces.reserves.regular + bgState.forces.reserves.elite;

    // Check if BG has any fighters in the triggering territory (for advanced rules)
    const forcesInTerritory = bgState.forces.onBoard.filter(
      (s) => s.territoryId === territory
    );
    const hasFightersInTerritory = forcesInTerritory.length > 0;

    console.log(
      `\n🧘 BG SPIRITUAL ADVISORS: Another faction shipped to ${territory}`
    );
    console.log(
      `   You may send 1 force for FREE to Polar Sink or same territory\n`
    );

    const pendingRequests: AgentRequest[] = [
      {
        factionId: Faction.BENE_GESSERIT,
        requestType: "SEND_ADVISOR",
        prompt: `Spiritual Advisors: Another faction just shipped to ${territory} (sector ${sector}). You may send 1 force for FREE. Options: (1) Send to Polar Sink (basic), (2) Send to same territory ${
          hasFightersInTerritory
            ? "(NOT AVAILABLE - you have fighters there)"
            : "(advanced)"
        }, (3) Pass.`,
        context: {
          reserves,
          triggeringTerritory: territory,
          triggeringSector: sector,
          canUseSameTerritory: !hasFightersInTerritory,
          advancedRulesEnabled: state.config.advancedRules,
        },
        availableActions: ["bg_send_spiritual_advisor", "pass"],
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

  // ===========================================================================
  // BG INTRUSION (Rule 2.02.16)
  // ===========================================================================

  /**
   * Check if BG INTRUSION should be triggered (Rule 2.02.16).
   *
   * Rule: "When a Force of another faction that you are not allied to enters a Territory
   * where you have fighters, you may flip them to advisors.✷"
   *
   * Requirements:
   * - Advanced rules must be enabled
   * - BG must be in game
   * - Entering faction must NOT be allied to BG
   * - BG must have fighters (not just advisors) in the territory/sector
   * - "Enters" includes: ship, move, send, worm ride
   */
  private shouldAskBGIntrusion(
    state: GameState,
    enteringFaction: Faction,
    territoryId: TerritoryId,
    sector: number
  ): boolean {
    // Only in advanced rules
    if (!state.config.advancedRules) return false;

    // BG must be in game
    if (!state.factions.has(Faction.BENE_GESSERIT)) return false;

    // Cannot trigger for BG's own actions
    if (enteringFaction === Faction.BENE_GESSERIT) return false;

    // Must NOT be allied
    if (areAllied(state, Faction.BENE_GESSERIT, enteringFaction)) return false;

    // BG must have fighters (not just advisors) in this territory/sector
    const fighters = getBGFightersInSector(state, territoryId, sector);
    if (fighters === 0) return false;

    return true;
  }

  /**
   * Request BG INTRUSION decision (Rule 2.02.16).
   * When a non-ally enters a territory where BG has fighters, BG may flip them to advisors.
   */
  private requestBGIntrusion(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    if (!this.bgIntrusionTrigger) {
      // Shouldn't happen, but handle gracefully
      this.waitingForBGIntrusion = false;
      return this.requestMovementDecision(state, events);
    }

    const { territory, sector, enteringFaction } = this.bgIntrusionTrigger;
    const fightersInSector = getBGFightersInSector(state, territory, sector);

    console.log(
      `\n⚔️  BG INTRUSION: ${FACTION_NAMES[enteringFaction]} entered ${territory} (sector ${sector})`
    );
    console.log(
      `   You have ${fightersInSector} fighter${
        fightersInSector !== 1 ? "s" : ""
      } here. You may flip them to advisors.\n`
    );

    const pendingRequests: AgentRequest[] = [
      {
        factionId: Faction.BENE_GESSERIT,
        requestType: "BG_INTRUSION",
        prompt: `INTRUSION (Rule 2.02.16): ${
          FACTION_NAMES[enteringFaction]
        } entered ${territory} (sector ${sector}) where you have ${fightersInSector} fighter${
          fightersInSector !== 1 ? "s" : ""
        }. You may flip them to advisors (optional). This can be cancelled by Karama (✷).`,
        context: {
          territory,
          sector,
          enteringFaction,
          fightersInSector,
          advancedRulesEnabled: state.config.advancedRules,
        },
        availableActions: ["bg_intrusion", "pass"],
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
   * Process BG's INTRUSION decision.
   */
  private processBGIntrusionDecision(
    state: GameState,
    responses: AgentResponse[],
    _events: PhaseEvent[]
  ): { state: GameState; events: PhaseEvent[] } {
    this.waitingForBGIntrusion = false;
    const bgResponse = responses.find(
      (r) => r.factionId === Faction.BENE_GESSERIT
    );

    const newEvents: PhaseEvent[] = [];
    const newState = state;

    if (!this.bgIntrusionTrigger) {
      // Shouldn't happen, but handle gracefully
      return { state, events: newEvents };
    }

    const { territory, sector, enteringFaction } = this.bgIntrusionTrigger;

    if (
      bgResponse &&
      !bgResponse.passed &&
      bgResponse.actionType === "BG_INTRUSION"
    ) {
      // BG used the ability - state was already updated by the tool
      const choice = bgResponse.data.choice as string;
      const count =
        (bgResponse.data.count as number) ||
        getBGFightersInSector(state, territory, sector);

      if (choice === "flip") {
        console.log(
          `   ✅ Bene Gesserit flips ${count} fighter${
            count !== 1 ? "s" : ""
          } to advisor${
            count !== 1 ? "s" : ""
          } in ${territory} (sector ${sector})\n`
        );

        newEvents.push({
          type: "FORCES_CONVERTED",
          data: {
            faction: Faction.BENE_GESSERIT,
            territory,
            sector,
            count,
            conversion: "fighters_to_advisors",
            reason: "intrusion",
            enteringFaction,
          },
          message: `Bene Gesserit flips ${count} fighter${
            count !== 1 ? "s" : ""
          } to advisor${
            count !== 1 ? "s" : ""
          } in ${territory} (INTRUSION - Rule 2.02.16)`,
        });
      }
    } else {
      console.log(`   ⏭️  Bene Gesserit passes on INTRUSION\n`);
    }

    // Clear trigger
    this.bgIntrusionTrigger = null;

    return { state: newState, events: newEvents };
  }

  /**
   * Process BG's spiritual advisor decision.
   */
  private processBGSpiritualAdvisorDecision(
    state: GameState,
    responses: AgentResponse[],
    _events: PhaseEvent[]
  ): { state: GameState; events: PhaseEvent[] } {
    this.waitingForBGAdvisor = false;
    const bgResponse = responses.find(
      (r) => r.factionId === Faction.BENE_GESSERIT
    );

    const newEvents: PhaseEvent[] = [];
    let newState = state;

    if (
      bgResponse &&
      !bgResponse.passed &&
      bgResponse.actionType === "BG_SEND_SPIRITUAL_ADVISOR"
    ) {
      // BG used the ability - state was already updated by the tool
      const count = (bgResponse.data.count as number) || 1;
      const territory = (bgResponse.data.territoryId ||
        (bgResponse.data.choice === "polar_sink"
          ? "POLAR_SINK"
          : this.bgTriggeringShipment?.territory)) as TerritoryId;

      console.log(
        `   ✅ Bene Gesserit sends 1 spiritual advisor to ${territory} for FREE\n`
      );

      newEvents.push({
        type: "FORCES_SHIPPED",
        data: {
          faction: Faction.BENE_GESSERIT,
          territory,
          count,
          cost: 0,
          reason: "spiritual_advisor",
        },
        message: `Bene Gesserit sends 1 spiritual advisor to ${territory} for FREE (Rule 2.02.05)`,
      });
    } else {
      console.log(`   ⏭️  Bene Gesserit passes on spiritual advisor\n`);
    }

    // Clear tracking
    this.bgTriggeringShipment = null;
    // Clear game state tracking (Rule 2.02.11)
    newState = {
      ...newState,
      bgSpiritualAdvisorTrigger: null,
    };

    return { state: newState, events: newEvents };
  }

  // ===========================================================================
  // BG WARTIME (Rule 2.02.18)
  // ===========================================================================

  /**
   * Check if BG has advisors and request WARTIME decision.
   * Rule 2.02.18: "Before Shipment and Movement [1.06.00], in each Territory that you have advisors,
   * you may flip all of those advisors to fighters. This change must be publicly announced.✷"
   */
  private checkAndRequestWartime(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult | null {
    const bgState = getFactionState(state, Faction.BENE_GESSERIT);

    // Find all territories where BG has advisors
    const territoriesWithAdvisors: Array<{
      territoryId: TerritoryId;
      sector: number;
      advisorCount: number;
    }> = [];

    for (const stack of bgState.forces.onBoard) {
      const advisorCount = stack.advisors ?? 0;
      if (advisorCount > 0) {
        territoriesWithAdvisors.push({
          territoryId: stack.territoryId,
          sector: stack.sector,
          advisorCount,
        });
      }
    }

    // If no advisors, no WARTIME needed
    if (territoriesWithAdvisors.length === 0) {
      return null;
    }

    // Filter out territories that can't flip due to restrictions
    const eligibleTerritories = territoriesWithAdvisors.filter(
      ({ territoryId, sector }) => {
        return this.canFlipAdvisorsToFighters(state, territoryId, sector);
      }
    );

    // If no eligible territories, no WARTIME needed
    if (eligibleTerritories.length === 0) {
      console.log(
        `\n⚔️  WARTIME: Bene Gesserit has advisors but cannot flip (PEACETIME or STORMED IN restrictions)\n`
      );
      return null;
    }

    // Store eligible territories for processing
    this.wartimeTerritories = eligibleTerritories;
    this.waitingForWartime = true;

    console.log(
      `\n⚔️  WARTIME (Rule 2.02.18): Bene Gesserit may flip advisors to fighters before phase starts`
    );
    console.log(
      `   Territories with advisors: ${eligibleTerritories
        .map((t) => `${t.territoryId} (${t.advisorCount} advisors)`)
        .join(", ")}\n`
    );

    const territoryList = eligibleTerritories
      .map(
        (t, i) =>
          `  ${i + 1}. ${t.territoryId} (sector ${t.sector}) - ${
            t.advisorCount
          } advisors`
      )
      .join("\n");

    const prompt = `WARTIME (Rule 2.02.18): Before Shipment and Movement phase starts, you may flip all advisors to fighters in each territory where you have advisors. This change must be publicly announced.

Territories with advisors:
${territoryList}

You may choose to flip advisors in any or all of these territories. Each territory is flipped independently.

Options:
- Specify territories to flip (e.g., ["ARRAKEEN", "CARTHAG"])
- Pass to skip WARTIME`;

    const pendingRequests: AgentRequest[] = [
      {
        factionId: Faction.BENE_GESSERIT,
        requestType: "FLIP_ADVISORS",
        prompt,
        context: {
          territories: eligibleTerritories.map((t) => ({
            territoryId: t.territoryId,
            sector: t.sector,
            advisorCount: t.advisorCount,
          })),
        },
        availableActions: ["flip_advisors", "pass"],
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
   * Check if advisors can be flipped to fighters in a territory.
   * Validates PEACETIME (Rule 2.02.19) and STORMED IN (Rule 2.02.20) restrictions.
   * Uses centralized validation function for consistency.
   */
  private canFlipAdvisorsToFighters(
    state: GameState,
    territoryId: TerritoryId,
    sector: number
  ): boolean {
    const validation = validateAdvisorFlipToFighters(
      state,
      Faction.BENE_GESSERIT,
      territoryId,
      sector
    );
    return validation.canFlip;
  }

  /**
   * Process WARTIME flip decision from Bene Gesserit.
   */
  private processWartimeFlip(
    state: GameState,
    responses: AgentResponse[],
    _events: PhaseEvent[]
  ): { state: GameState; events: PhaseEvent[] } {
    this.waitingForWartime = false;
    const bgResponse = responses.find(
      (r) => r.factionId === Faction.BENE_GESSERIT
    );

    let newState = state;
    const newEvents: PhaseEvent[] = [];

    if (
      !bgResponse ||
      bgResponse.passed ||
      bgResponse.actionType !== "FLIP_ADVISORS"
    ) {
      console.log(
        `   ⏭️  Bene Gesserit passes on WARTIME (no advisors flipped)\n`
      );
      return { state: newState, events: newEvents };
    }

    // Get territories to flip from response - normalize territory IDs
    let territoriesToFlip: Array<{ territoryId: TerritoryId; sector: number }> =
      [];

    if (bgResponse.data?.territories) {
      const normalized = normalizeTerritoryIdsInResponse(bgResponse.data);
      if (normalized.normalized && normalized.data.territories) {
        territoriesToFlip = normalized.data.territories as Array<{
          territoryId: TerritoryId;
          sector: number;
        }>;
      } else if (bgResponse.data.territories) {
        // Fallback: try to use original data and normalize manually
        const rawTerritories = bgResponse.data.territories as Array<{
          territoryId: TerritoryId | string;
          sector: number;
        }>;
        territoriesToFlip = rawTerritories.map((t) => {
          const normalized = normalizeTerritoryIdsInResponse({
            territoryId: t.territoryId,
          });
          const territoryId = normalized.normalized
            ? (normalized.data.territoryId as TerritoryId | undefined)
            : (t.territoryId as TerritoryId | undefined);
          return {
            territoryId: (territoryId || t.territoryId) as TerritoryId,
            sector: t.sector,
          };
        });
      }
    }

    if (territoriesToFlip.length === 0) {
      console.log(
        `   ⏭️  Bene Gesserit passes on WARTIME (no territories specified)\n`
      );
      return { state: newState, events: newEvents };
    }

    // Flip advisors in each specified territory
    for (const { territoryId, sector } of territoriesToFlip) {
      // Find the territory info
      const territoryInfo = this.wartimeTerritories.find(
        (t) => t.territoryId === territoryId && t.sector === sector
      );

      if (!territoryInfo) {
        console.log(
          `   ⚠️  WARTIME: Territory ${territoryId} (sector ${sector}) not found or not eligible, skipping\n`
        );
        continue;
      }

      // Double-check restrictions (in case state changed)
      if (!this.canFlipAdvisorsToFighters(newState, territoryId, sector)) {
        console.log(
          `   ⚠️  WARTIME: Cannot flip advisors in ${territoryId} (sector ${sector}) - PEACETIME or STORMED IN restriction\n`
        );
        continue;
      }

      // Flip all advisors in this territory
      const advisorCount = territoryInfo.advisorCount;
      newState = convertBGAdvisorsToFighters(
        newState,
        territoryId,
        sector,
        advisorCount
      );

      console.log(
        `   ⚔️  WARTIME: Bene Gesserit flips ${advisorCount} advisors to fighters in ${territoryId} (sector ${sector})\n`
      );

      // Emit public announcement event
      newEvents.push({
        type: "ADVISORS_FLIPPED",
        data: {
          faction: Faction.BENE_GESSERIT,
          territoryId,
          sector,
          advisorCount,
          reason: "WARTIME",
        },
        message: `Bene Gesserit declares WARTIME: ${advisorCount} advisors flipped to fighters in ${territoryId} (sector ${sector})`,
      });
    }

    // Clear the territories list
    this.wartimeTerritories = [];

    return { state: newState, events: newEvents };
  }

  // ===========================================================================
  // BG TAKE UP ARMS (Rule 2.02.17)
  // ===========================================================================

  /**
   * Check if TAKE UP ARMS should be triggered (Rule 2.02.17).
   * Rule: "When you Move advisors into an occupied Territory, you may flip them to fighters
   * following occupancy limit if you do not already have advisors present.✷"
   *
   * @param state Game state (should be BEFORE movement to check existing advisors)
   * @param territoryId Destination territory
   * @param sector Destination sector
   */
  private shouldAskTakeUpArms(
    state: GameState,
    territoryId: TerritoryId,
    sector: number
  ): boolean {
    // Only in advanced rules
    if (!state.config.advancedRules) return false;

    // BG must be in game
    if (!state.factions.has(Faction.BENE_GESSERIT)) return false;

    // Territory must be occupied (other factions present)
    const occupants = getFactionsInTerritory(state, territoryId);
    // Remove BG from occupants to check if OTHER factions are present
    const otherFactions = occupants.filter((f) => f !== Faction.BENE_GESSERIT);
    if (otherFactions.length === 0) {
      // Unoccupied - ENLISTMENT applies instead, not TAKE UP ARMS
      return false;
    }

    // BG must NOT already have advisors in this territory (BEFORE the move)
    // (Rule: "if you do not already have advisors present")
    const existingAdvisors = getBGAdvisorsInTerritory(state, territoryId);
    if (existingAdvisors > 0) {
      // Already has advisors - TAKE UP ARMS doesn't apply
      return false;
    }

    // Check restrictions - if blocked, don't offer the option
    const validation = validateAdvisorFlipToFighters(
      state,
      Faction.BENE_GESSERIT,
      territoryId,
      sector
    );
    if (!validation.canFlip) {
      // Restrictions block it - don't offer
      return false;
    }

    // Check occupancy limit for strongholds
    const territory = TERRITORY_DEFINITIONS[territoryId];
    if (territory.type === TerritoryType.STRONGHOLD) {
      // Stronghold occupancy limit: max 2 other factions
      // If already at limit, can't flip (would exceed limit)
      if (otherFactions.length >= 2) {
        // At occupancy limit - can't flip (would exceed)
        return false;
      }
    }

    return true;
  }

  /**
   * Request BG TAKE UP ARMS decision after moving advisors to occupied territory.
   * Rule 2.02.17: BG may flip advisors to fighters when moving to occupied territory.
   */
  private requestTakeUpArms(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    if (!this.takeUpArmsTrigger) {
      // Shouldn't happen, but handle gracefully
      this.waitingForTakeUpArms = false;
      return this.advanceToNextFaction(state, events);
    }

    const { territory, sector, advisorCount } = this.takeUpArmsTrigger;
    const territoryName = TERRITORY_DEFINITIONS[territory].name;

    console.log(
      `\n⚔️  BG TAKE UP ARMS: You moved ${advisorCount} advisor(s) to ${territoryName} (sector ${sector})`
    );
    console.log(
      `   This territory is occupied. You may flip them to fighters.\n`
    );

    const pendingRequests: AgentRequest[] = [
      {
        factionId: Faction.BENE_GESSERIT,
        requestType: "TAKE_UP_ARMS",
        prompt: `TAKE UP ARMS (Rule 2.02.17): You moved ${advisorCount} advisor(s) to ${territoryName} (sector ${sector}), which is occupied by other factions. You may flip them to fighters (optional). This can be cancelled by Karama (✷).`,
        context: {
          territory,
          sector,
          advisorCount,
          reason: "take_up_arms",
          advancedRulesEnabled: state.config.advancedRules,
        },
        availableActions: ["bg_take_up_arms", "pass"],
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
   * Process BG's TAKE UP ARMS decision.
   */
  private processTakeUpArmsDecision(
    state: GameState,
    responses: AgentResponse[],
    _events: PhaseEvent[]
  ): { state: GameState; events: PhaseEvent[] } {
    this.waitingForTakeUpArms = false;
    const bgResponse = responses.find(
      (r) => r.factionId === Faction.BENE_GESSERIT
    );

    const newEvents: PhaseEvent[] = [];
    let newState = state;

    if (!this.takeUpArmsTrigger) {
      // Shouldn't happen, but handle gracefully
      return { state, events: newEvents };
    }

    const { territory, sector, advisorCount } = this.takeUpArmsTrigger;
    const territoryName = TERRITORY_DEFINITIONS[territory].name;

    if (
      bgResponse &&
      !bgResponse.passed &&
      bgResponse.actionType === "BG_TAKE_UP_ARMS"
    ) {
      // BG chose to flip advisors to fighters
      // Double-check restrictions (in case state changed)
      const validation = validateAdvisorFlipToFighters(
        newState,
        Faction.BENE_GESSERIT,
        territory,
        sector
      );

      if (!validation.canFlip) {
        console.log(
          `   ⚠️  TAKE UP ARMS: Cannot flip advisors in ${territoryName} (sector ${sector}) - ${validation.reason}\n`
        );
      } else {
        // Flip advisors to fighters
        newState = convertBGAdvisorsToFighters(
          newState,
          territory,
          sector,
          advisorCount
        );

        console.log(
          `   ✅ TAKE UP ARMS: Bene Gesserit flips ${advisorCount} advisor(s) to fighter(s) in ${territoryName} (sector ${sector})\n`
        );

        newEvents.push({
          type: "ADVISORS_FLIPPED",
          data: {
            faction: Faction.BENE_GESSERIT,
            territoryId: territory,
            sector,
            count: advisorCount,
            reason: "take_up_arms",
          },
          message: `Bene Gesserit flips ${advisorCount} advisor(s) to fighter(s) in ${territoryName} (TAKE UP ARMS, Rule 2.02.17)`,
        });
      }
    } else {
      console.log(
        `   ⏭️  Bene Gesserit passes on TAKE UP ARMS (keeps advisors as advisors)\n`
      );
    }

    // Clear tracking
    this.takeUpArmsTrigger = null;

    return { state: newState, events: newEvents };
  }
}
