/**
 * Battle Phase Handler
 *
 * Phase 1.07: Battle
 * - Identify territories with multiple factions
 * - Battles occur in storm order
 * - Sub-phases: Choose battle, battle plans, prescience, voice, reveal, traitor, resolution
 */

import { getLeaderDefinition, getTreacheryCardDefinition } from "../../data";
import {
  resolveBattle,
  resolveTwoTraitorsBattle,
  validateAdvisorFlipToFighters,
  validateBattlePlan,
  validateVoiceCompliance,
  type BattleResult,
} from "../../rules";
import { createError } from "../../rules/types";
import {
  addSpice,
  calculateLossDistribution,
  captureLeader,
  convertBGAdvisorsToFighters,
  discardTreacheryCard,
  getAlly,
  getAvailableLeadersForCapture,
  getFactionState,
  getFactionsInTerritory,
  getTargetFactionForLeaderKill,
  killCapturedLeader,
  killKwisatzHaderach,
  killLeader,
  logAction,
  markKwisatzHaderachUsed,
  markLeaderUsed,
  removeSpice,
  removeTraitorCard,
  resetLeaderTurnState,
  returnAllCapturedLeaders,
  returnCapturedLeader,
  returnLeaderToPool,
  sendForcesToTanks,
  setActiveFactions,
  shouldTriggerPrisonBreak,
  updateKwisatzHaderach,
} from "../../state";
import {
  getBGFightersInSector,
  validateStrongholdOccupancy,
} from "../../state/queries";
import {
  BattleSubPhase,
  Faction,
  LeaderLocation,
  Phase,
  TerritoryId,
  type BattlePlan,
  type GameState,
} from "../../types";
import {
  type AgentRequest,
  type AgentResponse,
  type BattlePhaseContext,
  type CurrentBattle,
  type PhaseEvent,
  type PhaseHandler,
  type PhaseStepResult,
} from "../types";
import {
  createDefaultBattlePlan,
  identifyBattles,
  processChooseBattle,
  requestBattleChoice,
  sanitizePlanForLog,
  updatePendingBattlesAfterBattle,
} from "./battle/index";

// =============================================================================
// BATTLE PHASE HANDLER
// =============================================================================

export class BattlePhaseHandler implements PhaseHandler {
  readonly phase = Phase.BATTLE;

  private context: BattlePhaseContext = {
    pendingBattles: [],
    currentBattleIndex: 0,
    currentBattle: null,
    subPhase: BattleSubPhase.AGGRESSOR_CHOOSING,
    aggressorOrder: [],
    currentAggressorIndex: 0,
  };

  initialize(state: GameState): PhaseStepResult {
    // Reset context
    this.context = {
      pendingBattles: [],
      currentBattleIndex: 0,
      currentBattle: null,
      subPhase: BattleSubPhase.AGGRESSOR_CHOOSING,
      aggressorOrder: [...state.stormOrder],
      currentAggressorIndex: 0,
    };

    const events: PhaseEvent[] = [];
    // Note: PhaseManager emits PHASE_STARTED event, so we don't emit it here

    // Rule 2.02.22 - UNIVERSAL STEWARDS: Before Battle Phase, advisors alone in a territory
    // automatically flip to fighters (subject to PEACETIME and STORMED IN restrictions)
    const newState = this.applyUniversalStewards(state, events);

    // VALIDATION: Check for stronghold occupancy violations before identifying battles
    const violations = validateStrongholdOccupancy(newState);
    if (violations.length > 0) {
      for (const violation of violations) {
        events.push({
          type: "STRONGHOLD_OCCUPANCY_VIOLATION",
          data: {
            territoryId: violation.territoryId,
            factions: violation.factions,
            count: violation.count,
          },
          message: `⚠️ ILLEGAL STATE: ${violation.territoryId} has ${
            violation.count
          } factions (max 2 allowed): ${violation.factions.join(", ")}`,
        });
        console.error(
          `⚠️ STRONGHOLD OCCUPANCY VIOLATION at battle phase start: ${
            violation.territoryId
          } has ${violation.count} factions: ${violation.factions.join(", ")}`
        );
      }
    }

    // Identify all territories with multiple factions
    this.context.pendingBattles = identifyBattles(newState);

    if (this.context.pendingBattles.length === 0) {
      events.push({
        type: "NO_BATTLES",
        data: { phase: Phase.BATTLE },
        message: "No battles this turn",
      });

      return {
        state,
        phaseComplete: true,
        nextPhase: Phase.SPICE_COLLECTION,
        pendingRequests: [],
        actions: [],
        events,
      };
    }

    events.push({
      type: "BATTLE_STARTED",
      data: { totalBattles: this.context.pendingBattles.length },
      message: `${this.context.pendingBattles.length} potential battles identified`,
    });

    // Start first battle selection
    return requestBattleChoice(
      this.context,
      newState,
      events,
      (s, e) => this.endBattlePhase(s, e),
      (s, e) => this.processReveal(s, e),
      (s, e) => this.processResolution(s, e),
      (s, e) => this.transitionToBattleSubPhases(s, e)
    );
  }

  /**
   * Apply UNIVERSAL STEWARDS rule (Rule 2.02.22).
   * "When advisors are ever alone in a Territory before Battle Phase [1.07],
   * they automatically flip to fighters."
   *
   * Subject to PEACETIME and STORMED IN restrictions.
   */
  private applyUniversalStewards(
    state: GameState,
    events: PhaseEvent[]
  ): GameState {
    // Only applies if BG is in game and advanced rules are enabled
    if (
      !state.factions.has(Faction.BENE_GESSERIT) ||
      !state.config.advancedRules
    ) {
      return state;
    }

    const bgState = getFactionState(state, Faction.BENE_GESSERIT);
    let newState = state;
    const newEvents: PhaseEvent[] = [];

    // Find all territories where BG has advisors
    for (const stack of bgState.forces.onBoard) {
      if (stack.advisors === undefined || stack.advisors === 0) {
        continue; // No advisors in this stack
      }

      const { territoryId, sector } = stack;

      // Check if advisors are alone (no other faction forces in territory)
      // getFactionsInTerritory excludes BG advisors-only, so if it's empty or only BG, advisors are alone
      const occupants = getFactionsInTerritory(newState, territoryId);
      const isAlone =
        occupants.length === 0 ||
        (occupants.length === 1 && occupants[0] === Faction.BENE_GESSERIT);

      if (isAlone) {
        // Validate restrictions
        const validation = validateAdvisorFlipToFighters(
          newState,
          Faction.BENE_GESSERIT,
          territoryId,
          sector
        );

        if (validation.canFlip) {
          // Auto-flip advisors to fighters
          try {
            newState = convertBGAdvisorsToFighters(
              newState,
              territoryId,
              sector,
              stack.advisors
            );

            console.log(
              `   ✅ UNIVERSAL STEWARDS: Auto-flipped ${stack.advisors} advisors to fighters in ${territoryId} (sector ${sector})\n`
            );

            newEvents.push({
              type: "ADVISORS_FLIPPED",
              data: {
                faction: Faction.BENE_GESSERIT,
                territoryId,
                sector,
                count: stack.advisors,
                reason: "universal_stewards",
              },
              message: `Bene Gesserit auto-flips ${stack.advisors} advisors to fighters in ${territoryId} (UNIVERSAL STEWARDS, Rule 2.02.22)`,
            });
          } catch (error) {
            console.error(
              `   ❌ Error in UNIVERSAL STEWARDS for ${territoryId}: ${error}\n`
            );
          }
        } else {
          // Restrictions prevent flipping
          console.log(
            `   ⚠️  UNIVERSAL STEWARDS blocked in ${territoryId} (sector ${sector}): ${validation.reason}\n`
          );
        }
      }
    }

    events.push(...newEvents);
    return newState;
  }

  processStep(state: GameState, responses: AgentResponse[]): PhaseStepResult {
    const events: PhaseEvent[] = [];
    const newState = state;

    switch (this.context.subPhase) {
      case BattleSubPhase.AGGRESSOR_CHOOSING:
        return processChooseBattle(
          this.context,
          newState,
          responses,
          events,
          () =>
            requestBattleChoice(
              this.context,
              newState,
              events,
              (s, e) => this.endBattlePhase(s, e),
              (s, e) => this.processReveal(s, e),
              (s, e) => this.processResolution(s, e),
              (s, e) => this.transitionToBattleSubPhases(s, e)
            ),
          (s, e) => this.processReveal(s, e),
          (s, e) => this.transitionToBattleSubPhases(s, e)
        );

      case BattleSubPhase.PRESCIENCE_OPPORTUNITY:
        return this.processPrescience(newState, responses, events);

      case BattleSubPhase.PRESCIENCE_REVEAL:
        return this.processPrescienceReveal(newState, responses, events);

      case BattleSubPhase.CREATING_BATTLE_PLANS:
        return this.processBattlePlans(newState, responses, events);

      case BattleSubPhase.VOICE_OPPORTUNITY:
        return this.processVoice(newState, responses, events);

      case BattleSubPhase.REVEALING_PLANS:
        return this.processReveal(newState, events);

      case BattleSubPhase.TRAITOR_CALL:
        return this.processTraitor(newState, responses, events);

      case BattleSubPhase.BATTLE_RESOLUTION:
        return this.processResolution(newState, events);

      case BattleSubPhase.WINNER_CARD_DISCARD_CHOICE:
        return this.processWinnerCardDiscard(newState, responses, events);

      case BattleSubPhase.HARKONNEN_CAPTURE:
        return this.processHarkonnenCapture(newState, responses, events);

      default:
        return {
          state: newState,
          phaseComplete: true,
          nextPhase: Phase.SPICE_COLLECTION,
          pendingRequests: [],
          actions: [],
          events,
        };
    }
  }

  cleanup(state: GameState): GameState {
    // Reset all leaders' used state
    let newState = state;
    for (const faction of state.factions.keys()) {
      newState = resetLeaderTurnState(newState, faction);
    }

    // Return captured leaders that were used in battle this turn
    // Per rules: "After it is used in a battle, if it wasn't killed during that battle,
    // the leader is returned to the Active Leader Pool of the player who last had it."
    if (newState.factions.has(Faction.HARKONNEN)) {
      const harkonnenState = getFactionState(newState, Faction.HARKONNEN);
      const capturedLeadersUsed = harkonnenState.leaders.filter(
        (l) =>
          l.capturedBy !== null &&
          l.usedThisTurn &&
          l.location !== LeaderLocation.TANKS_FACE_UP &&
          l.location !== LeaderLocation.TANKS_FACE_DOWN
      );

      for (const leader of capturedLeadersUsed) {
        newState = returnCapturedLeader(newState, leader.definitionId);
      }
    }

    // Check for Prison Break
    // Per rules: "When all your own leaders have been killed, you must return all
    // captured leaders immediately to the players who last had them as an Active Leader."
    if (newState.factions.has(Faction.HARKONNEN)) {
      if (shouldTriggerPrisonBreak(newState, Faction.HARKONNEN)) {
        newState = returnAllCapturedLeaders(newState, Faction.HARKONNEN);
      }
    }

    return newState;
  }

  // ===========================================================================
  // BATTLE IDENTIFICATION
  // ===========================================================================
  // Battle identification logic has been moved to battle/identification.ts
  // Use the exported identifyBattles() function from that module.

  // Pending battles management moved to battle/pending-battles.ts
  private updatePendingBattlesAfterBattle(
    state: GameState,
    territoryId: TerritoryId,
    sector: number
  ): void {
    this.context.pendingBattles = updatePendingBattlesAfterBattle(
      this.context.pendingBattles,
      state,
      territoryId,
      sector
    );
  }

  // ===========================================================================
  // BATTLE CHOICE
  // ===========================================================================

  // Battle choice methods moved to battle/aggressor-selection.ts
  // These are now thin wrappers that call the module functions
  private requestBattleChoice(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    return requestBattleChoice(
      this.context,
      state,
      events,
      (s, e) => this.endBattlePhase(s, e),
      (s, e) => this.processReveal(s, e),
      (s, e) => this.processResolution(s, e),
      (s, e) => this.transitionToBattleSubPhases(s, e)
    );
  }

  private processChooseBattle(
    state: GameState,
    responses: AgentResponse[],
    events: PhaseEvent[]
  ): PhaseStepResult {
    const result = processChooseBattle(
      this.context,
      state,
      responses,
      events,
      () => this.requestBattleChoice(state, events),
      (s, e) => this.processReveal(s, e),
      (s, e) => this.transitionToBattleSubPhases(s, e)
    );

    // After battle is set up, transition to Voice/Prescience/Battle Plans sequence
    if (this.context.currentBattle && result.pendingRequests.length === 0) {
      return this.transitionToBattleSubPhases(state, events);
    }

    return result;
  }

  /**
   * Transition to the appropriate battle sub-phase after a battle is set up.
   * Sequence: Voice -> Prescience -> Battle Plans -> Reveal
   */
  private transitionToBattleSubPhases(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    const battle = this.context.currentBattle!;
    const aggressor = battle.aggressor;
    const defender = battle.defender;

    // Step 1: Check for BG Voice (BEFORE battle plans)
    if (state.factions.has(Faction.BENE_GESSERIT)) {
      const bgInBattle =
        aggressor === Faction.BENE_GESSERIT ||
        defender === Faction.BENE_GESSERIT;
      const bgAlly = getAlly(state, Faction.BENE_GESSERIT);
      const allyInBattle =
        bgAlly && (aggressor === bgAlly || defender === bgAlly);

      if (bgInBattle || allyInBattle) {
        // Determine opponent to use Voice against
        let voiceTarget: Faction;
        if (bgInBattle) {
          voiceTarget =
            aggressor === Faction.BENE_GESSERIT ? defender : aggressor;
        } else {
          // Ally's battle - target is ally's opponent
          voiceTarget = aggressor === bgAlly! ? defender : aggressor;
        }

        this.context.subPhase = BattleSubPhase.VOICE_OPPORTUNITY;
        return this.requestVoice(state, events, voiceTarget);
      }
    }

    // Step 2: Check for Atreides prescience (AFTER Voice, BEFORE battle plans)
    if (state.factions.has(Faction.ATREIDES)) {
      const atreidesInBattle =
        aggressor === Faction.ATREIDES || defender === Faction.ATREIDES;
      const atreidesAlly = getAlly(state, Faction.ATREIDES);
      const allyInBattle =
        atreidesAlly &&
        (aggressor === atreidesAlly || defender === atreidesAlly);

      if (atreidesInBattle || allyInBattle) {
        // Determine opponent to use prescience against
        let prescienceTarget: Faction;
        if (atreidesInBattle) {
          prescienceTarget =
            aggressor === Faction.ATREIDES ? defender : aggressor;
        } else {
          // Ally's battle - target is ally's opponent
          prescienceTarget = aggressor === atreidesAlly ? defender : aggressor;
        }

        this.context.subPhase = BattleSubPhase.PRESCIENCE_OPPORTUNITY;
        return this.requestPrescience(state, events, prescienceTarget);
      }
    }

    // Step 3: Battle plans (AFTER Voice and Prescience)
    this.context.subPhase = BattleSubPhase.CREATING_BATTLE_PLANS;
    return this.requestBattlePlans(state, events);
  }

  // ===========================================================================
  // PRESCIENCE (Atreides)
  // ===========================================================================

  private requestPrescience(
    state: GameState,
    events: PhaseEvent[],
    prescienceTarget: Faction
  ): PhaseStepResult {
    const battle = this.context.currentBattle!;
    const atreidesInBattle =
      battle.aggressor === Faction.ATREIDES ||
      battle.defender === Faction.ATREIDES;
    const atreidesAlly = getAlly(state, Faction.ATREIDES);
    const isAllyBattle =
      atreidesAlly &&
      (battle.aggressor === atreidesAlly || battle.defender === atreidesAlly);

    let promptMessage = `Use prescience to see one element of ${prescienceTarget}'s battle plan?`;
    if (isAllyBattle && !atreidesInBattle) {
      promptMessage = `Your ally ${atreidesAlly} is in battle against ${prescienceTarget}. Use prescience on your ally's opponent?`;
    }

    const pendingRequests: AgentRequest[] = [
      {
        factionId: Faction.ATREIDES,
        requestType: "USE_PRESCIENCE",
        prompt: promptMessage,
        context: {
          opponent: prescienceTarget,
          allyBattle: isAllyBattle && !atreidesInBattle,
          ally: atreidesAlly,
          options: ["leader", "weapon", "defense", "number"],
        },
        availableActions: ["USE_PRESCIENCE", "PASS"],
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

  private processPrescience(
    state: GameState,
    responses: AgentResponse[],
    events: PhaseEvent[]
  ): PhaseStepResult {
    const response = responses.find((r) => r.factionId === Faction.ATREIDES);
    const battle = this.context.currentBattle!;

    if (
      response &&
      !response.passed &&
      response.actionType === "USE_PRESCIENCE"
    ) {
      battle.prescienceUsed = true;
      battle.prescienceTarget = response.data.target as
        | "leader"
        | "weapon"
        | "defense"
        | "number";

      // Determine who the prescience is used against
      const atreidesInBattle =
        battle.aggressor === Faction.ATREIDES ||
        battle.defender === Faction.ATREIDES;
      if (atreidesInBattle) {
        // Atreides is in battle, viewing their opponent
        battle.prescienceOpponent =
          battle.aggressor === Faction.ATREIDES
            ? battle.defender
            : battle.aggressor;
      } else {
        // Atreides' ally is in battle, viewing ally's opponent
        const atreidesAlly = getAlly(state, Faction.ATREIDES);
        battle.prescienceOpponent =
          battle.aggressor === atreidesAlly
            ? battle.defender
            : battle.aggressor;
      }

      events.push({
        type: "PRESCIENCE_USED",
        data: {
          target: response.data.target,
          opponent: battle.prescienceOpponent,
        },
        message: `Atreides uses prescience to see ${battle.prescienceOpponent}'s ${response.data.target}`,
      });

      // Move to reveal phase to get opponent's pre-committed element
      this.context.subPhase = BattleSubPhase.PRESCIENCE_REVEAL;
      return this.requestPrescienceReveal(state, events);
    }

    // Atreides passed prescience, move to battle plans
    this.context.subPhase = BattleSubPhase.CREATING_BATTLE_PLANS;
    return this.requestBattlePlans(state, events);
  }

  // ===========================================================================
  // PRESCIENCE REVEAL
  // ===========================================================================

  private requestPrescienceReveal(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    const battle = this.context.currentBattle!;
    const opponent = battle.prescienceOpponent!;
    const target = battle.prescienceTarget!;

    const factionState = getFactionState(state, opponent);

    // Build context based on what's being revealed
    const context: Record<string, unknown> = {
      prescienceTarget: target,
      territory: battle.territoryId,
      sector: battle.sector,
    };

    // Provide information about what the opponent can choose from
    if (target === "leader") {
      const availableLeaders = factionState.leaders
        .filter((l) => l.location === LeaderLocation.LEADER_POOL)
        .map((l) => {
          const def = getLeaderDefinition(l.definitionId);
          return {
            id: l.definitionId,
            name: def?.name,
            strength: def?.strength,
          };
        });
      context.availableLeaders = availableLeaders;
    } else if (target === "weapon" || target === "defense") {
      const availableCards = factionState.hand.map((c) => {
        const def = getTreacheryCardDefinition(c.definitionId);
        return {
          id: c.definitionId,
          name: def?.name,
          type: def?.type,
        };
      });
      context.availableCards = availableCards;
    } else if (target === "number") {
      // IMPORTANT: For Bene Gesserit, use getBGFightersInSector to exclude advisors
      // Advisors are non-combatants and shouldn't be counted as available forces
      const totalForces =
        opponent === Faction.BENE_GESSERIT
          ? getBGFightersInSector(state, battle.territoryId, battle.sector)
          : (() => {
              const forces = factionState.forces.onBoard.find(
                (f) =>
                  f.territoryId === battle.territoryId &&
                  f.sector === battle.sector
              );
              return forces ? forces.forces.regular + forces.forces.elite : 0;
            })();
      context.totalForces = totalForces;
      context.spiceAvailable = factionState.spice;
    }

    const pendingRequests: AgentRequest[] = [
      {
        factionId: opponent,
        requestType: "REVEAL_PRESCIENCE_ELEMENT",
        prompt: `Atreides prescience: Pre-commit your ${target} for this battle.`,
        context,
        availableActions: ["REVEAL_PRESCIENCE_ELEMENT"],
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

  private processPrescienceReveal(
    state: GameState,
    responses: AgentResponse[],
    events: PhaseEvent[]
  ): PhaseStepResult {
    const battle = this.context.currentBattle!;
    const response = responses.find(
      (r) => r.factionId === battle.prescienceOpponent
    );

    if (response && response.actionType === "REVEAL_PRESCIENCE_ELEMENT") {
      const target = battle.prescienceTarget!;
      let revealedValue: string | number | null;

      // Extract the revealed value based on the target type
      if (target === "leader") {
        revealedValue = (response.data.leaderId as string) || null;
      } else if (target === "weapon") {
        revealedValue = (response.data.weaponCardId as string) || null;
      } else if (target === "defense") {
        revealedValue = (response.data.defenseCardId as string) || null;
      } else if (target === "number") {
        // Number could be forces or spice (we store both)
        const forces = response.data.forcesDialed as number;
        const spice = response.data.spiceDialed as number;
        if (forces !== undefined || spice !== undefined) {
          revealedValue = {
            forces: forces ?? 0,
            spice: spice ?? 0,
          } as unknown as string;
        } else {
          revealedValue = null;
        }
      } else {
        revealedValue = "unknown";
      }

      // Rule: If asking about weapon/defense and opponent says "not playing",
      // cannot ask about a different element
      if (
        (target === "weapon" || target === "defense") &&
        revealedValue === null
      ) {
        battle.prescienceBlocked = true;
        // Note: This is not an error - prescience worked, but Atreides cannot
        // ask about a different element per the rules
      }

      battle.prescienceResult = {
        type: target,
        value: revealedValue,
      };

      const revealedMessage =
        revealedValue === null
          ? `not playing ${target}`
          : JSON.stringify(revealedValue);

      // Build message explaining the prescience result
      let prescienceMessage = `Atreides sees opponent's ${target}: ${revealedMessage}`;
      if (
        (target === "weapon" || target === "defense") &&
        revealedValue === null
      ) {
        prescienceMessage += ` (Atreides cannot ask about a different element per the rules)`;
      }

      events.push({
        type: "PRESCIENCE_USED",
        data: {
          target,
          revealed: revealedValue,
          opponent: battle.prescienceOpponent,
          cannotAskDifferent: battle.prescienceBlocked,
        },
        message: prescienceMessage,
      });
    }

    // Move to battle plans
    this.context.subPhase = BattleSubPhase.CREATING_BATTLE_PLANS;
    return this.requestBattlePlans(state, events);
  }

  // ===========================================================================
  // BATTLE PLANS
  // ===========================================================================

  private requestBattlePlans(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    const battle = this.context.currentBattle!;
    const pendingRequests: AgentRequest[] = [];

    for (const faction of [battle.aggressor, battle.defender]) {
      const factionState = getFactionState(state, faction);
      const isAggressor = faction === battle.aggressor;

      // Get available leaders
      const availableLeaders = factionState.leaders
        .filter((l) => l.location === LeaderLocation.LEADER_POOL)
        .map((l) => {
          const def = getLeaderDefinition(l.definitionId);
          return {
            id: l.definitionId,
            name: def?.name,
            strength: def?.strength,
          };
        });

      // Get available cards
      const availableCards = factionState.hand.map((c) => {
        const def = getTreacheryCardDefinition(c.definitionId);
        return {
          id: c.definitionId,
          name: def?.name,
          type: def?.type,
        };
      });

      // Get forces in battle
      // IMPORTANT: For Bene Gesserit, use getBGFightersInSector to exclude advisors
      // Advisors are non-combatants and shouldn't be counted as available forces
      const totalForces =
        faction === Faction.BENE_GESSERIT
          ? getBGFightersInSector(state, battle.territoryId, battle.sector)
          : (() => {
              const forces = factionState.forces.onBoard.find(
                (f) =>
                  f.territoryId === battle.territoryId &&
                  f.sector === battle.sector
              );
              return forces ? forces.forces.regular + forces.forces.elite : 0;
            })();

      // Prescience info for Atreides
      let prescienceInfo = null;
      if (
        faction === Faction.ATREIDES &&
        this.context.currentBattle!.prescienceUsed
      ) {
        prescienceInfo = {
          target: this.context.currentBattle!.prescienceTarget,
          opponent: this.context.currentBattle!.prescienceOpponent,
          result: this.context.currentBattle!.prescienceResult,
        };
      }

      // Voice command info (if Voice was used on this faction)
      let voiceCommand = null;
      if (battle.voiceUsed && battle.voiceCommand) {
        // Determine who Voice was used on
        const bgInBattle =
          battle.aggressor === Faction.BENE_GESSERIT ||
          battle.defender === Faction.BENE_GESSERIT;
        const bgAlly = getAlly(state, Faction.BENE_GESSERIT);
        const isAllyBattle =
          bgAlly && (battle.aggressor === bgAlly || battle.defender === bgAlly);

        let voiceTarget: Faction;
        if (bgInBattle) {
          voiceTarget =
            battle.aggressor === Faction.BENE_GESSERIT
              ? battle.defender
              : battle.aggressor;
        } else if (isAllyBattle) {
          voiceTarget =
            battle.aggressor === bgAlly! ? battle.defender : battle.aggressor;
        } else {
          voiceTarget = battle.aggressor; // Fallback (shouldn't happen)
        }

        // If this faction is the Voice target, include the command
        if (voiceTarget === faction) {
          voiceCommand = battle.voiceCommand;
        }
      }

      pendingRequests.push({
        factionId: faction,
        requestType: "CREATE_BATTLE_PLAN",
        prompt: `Create your battle plan for the battle in ${battle.territoryId}.`,
        context: {
          isAggressor,
          opponent: isAggressor ? battle.defender : battle.aggressor,
          territory: battle.territoryId,
          sector: battle.sector,
          forcesAvailable: totalForces,
          availableLeaders,
          availableCards,
          spiceAvailable: factionState.spice,
          prescienceInfo,
          voiceCommand, // Include Voice command if applicable
        },
        availableActions: ["CREATE_BATTLE_PLAN"],
      });
    }

    return {
      state,
      phaseComplete: false,
      pendingRequests,
      simultaneousRequests: true, // Both submit at same time
      actions: [],
      events,
    };
  }

  private processBattlePlans(
    state: GameState,
    responses: AgentResponse[],
    events: PhaseEvent[]
  ): PhaseStepResult {
    const battle = this.context.currentBattle!;

    for (const response of responses) {
      // Handle both tool response format (data.plan) and test mock format (data directly)
      let plan: BattlePlan | null = null;
      if (response.data.plan) {
        plan = response.data.plan as BattlePlan;
      } else {
        // Test mock format - construct plan from data fields
        plan = {
          factionId: response.factionId,
          leaderId: (response.data.leaderId as string | null) ?? null,
          forcesDialed: (response.data.forcesDialed as number) ?? 0,
          weaponCardId: (response.data.weaponCardId as string | null) ?? null,
          defenseCardId: (response.data.defenseCardId as string | null) ?? null,
          kwisatzHaderachUsed:
            (response.data.useKwisatzHaderach as boolean) ?? false,
          cheapHeroUsed: (response.data.useCheapHero as boolean) ?? false,
          spiceDialed: (response.data.spiceDialed as number) ?? 0,
          announcedNoLeader: false,
        };
      }

      if (!plan) continue;

      // Validate prescience commitment if applicable
      if (
        battle.prescienceUsed &&
        battle.prescienceResult &&
        battle.prescienceOpponent === response.factionId
      ) {
        const prescienceTarget = battle.prescienceResult.type;
        const prescienceValue = battle.prescienceResult.value;

        // Check if submitted plan matches prescience commitment
        let commitmentViolated = false;
        let violationMessage = "";

        if (prescienceTarget === "leader") {
          // For leader, check if the committed leader matches
          if (prescienceValue !== null) {
            // If a specific leader was committed, must use that leader (or Cheap Hero if leader was null)
            if (
              prescienceValue !== plan.leaderId &&
              !(prescienceValue === null && plan.cheapHeroUsed)
            ) {
              commitmentViolated = true;
              violationMessage = `Prescience commitment: You revealed you would use leader ${prescienceValue}, but your plan uses ${
                plan.leaderId || "Cheap Hero"
              }`;
            }
          } else {
            // If committed to "not playing leader", must not play leader or Cheap Hero
            if (plan.leaderId || plan.cheapHeroUsed) {
              commitmentViolated = true;
              violationMessage =
                "Prescience commitment: You revealed you would not play a leader, but your plan includes a leader or Cheap Hero";
            }
          }
        } else if (prescienceTarget === "weapon") {
          // For weapon, check if the committed weapon matches
          if (prescienceValue !== null) {
            // If a specific weapon was committed, must use that weapon
            if (plan.weaponCardId !== prescienceValue) {
              commitmentViolated = true;
              violationMessage = `Prescience commitment: You revealed you would use weapon ${prescienceValue}, but your plan uses ${
                plan.weaponCardId || "no weapon"
              }`;
            }
          } else {
            // If committed to "not playing weapon", must not play weapon
            if (plan.weaponCardId) {
              commitmentViolated = true;
              violationMessage =
                "Prescience commitment: You revealed you would not play a weapon, but your plan includes a weapon";
            }
          }
        } else if (prescienceTarget === "defense") {
          // For defense, check if the committed defense matches
          if (prescienceValue !== null) {
            // If a specific defense was committed, must use that defense
            if (plan.defenseCardId !== prescienceValue) {
              commitmentViolated = true;
              violationMessage = `Prescience commitment: You revealed you would use defense ${prescienceValue}, but your plan uses ${
                plan.defenseCardId || "no defense"
              }`;
            }
          } else {
            // If committed to "not playing defense", must not play defense
            if (plan.defenseCardId) {
              commitmentViolated = true;
              violationMessage =
                "Prescience commitment: You revealed you would not play a defense, but your plan includes a defense";
            }
          }
        } else if (prescienceTarget === "number") {
          // For number, check if the committed forces/spice match
          if (
            prescienceValue !== null &&
            typeof prescienceValue === "object" &&
            !Array.isArray(prescienceValue)
          ) {
            const committed = prescienceValue as {
              forces: number;
              spice: number;
            };
            if (
              plan.forcesDialed !== committed.forces ||
              plan.spiceDialed !== committed.spice
            ) {
              commitmentViolated = true;
              violationMessage = `Prescience commitment: You revealed you would dial ${committed.forces} forces and ${committed.spice} spice, but your plan dials ${plan.forcesDialed} forces and ${plan.spiceDialed} spice`;
            }
          }
        }

        if (commitmentViolated) {
          const error = createError(
            "PRESCIENCE_COMMITMENT_VIOLATION",
            violationMessage,
            { field: prescienceTarget }
          );
          events.push({
            type: "BATTLE_PLAN_SUBMITTED",
            data: {
              faction: response.factionId,
              invalid: true,
              errors: [error],
            },
            message: `${response.factionId} battle plan violates prescience commitment: ${violationMessage}`,
          });
          // Use default plan (with smart force calculation)
          const defaultPlan = createDefaultBattlePlan(
            response.factionId,
            state,
            battle.territoryId,
            battle.sector
          );
          if (response.factionId === battle.aggressor) {
            battle.aggressorPlan = defaultPlan;
          } else {
            battle.defenderPlan = defaultPlan;
          }
          continue;
        }
      }

      // Validate plan (pass sector for accurate force counting, especially for Bene Gesserit)
      const validation = validateBattlePlan(
        state,
        response.factionId,
        battle.territoryId,
        plan,
        battle.sector
      );
      if (!validation.valid) {
        events.push({
          type: "BATTLE_PLAN_SUBMITTED",
          data: {
            faction: response.factionId,
            invalid: true,
            errors: validation.errors,
          },
          message: `${response.factionId} battle plan invalid: ${validation.errors[0]?.message}`,
        });
        // Use default plan (with smart force calculation)
        const defaultPlan = createDefaultBattlePlan(
          response.factionId,
          state,
          battle.territoryId,
          battle.sector
        );
        if (response.factionId === battle.aggressor) {
          battle.aggressorPlan = defaultPlan;
        } else {
          battle.defenderPlan = defaultPlan;
        }
        continue;
      }

      if (response.factionId === battle.aggressor) {
        battle.aggressorPlan = plan;
      } else {
        battle.defenderPlan = plan;
      }

      events.push({
        type: "BATTLE_PLAN_SUBMITTED",
        data: { faction: response.factionId },
        message: `${response.factionId} submits battle plan`,
      });

      // Log leader announcement if applicable
      // Rule from battle.md line 14: Player must announce when they cannot play a leader or Cheap Hero
      if (plan.announcedNoLeader) {
        events.push({
          type: "NO_LEADER_ANNOUNCED",
          data: { faction: response.factionId },
          message: `${response.factionId} announces they cannot play a leader or Cheap Hero`,
        });
      }
    }

    // Handle factions that didn't respond - use default plans
    const respondedFactions = new Set(responses.map((r) => r.factionId));
    for (const faction of [battle.aggressor, battle.defender]) {
      if (!respondedFactions.has(faction)) {
        // Agent didn't respond - use default plan
        const defaultPlan = createDefaultBattlePlan(
          faction,
          state,
          battle.territoryId,
          battle.sector
        );
        if (faction === battle.aggressor) {
          battle.aggressorPlan = defaultPlan;
        } else {
          battle.defenderPlan = defaultPlan;
        }
        events.push({
          type: "BATTLE_PLAN_SUBMITTED",
          data: {
            faction,
            default: true,
          },
          message: `${faction} did not respond, using default battle plan`,
        });
      }
    }

    // Ensure both plans are set (fallback if somehow still null)
    if (!battle.aggressorPlan) {
      battle.aggressorPlan = createDefaultBattlePlan(
        battle.aggressor,
        state,
        battle.territoryId,
        battle.sector
      );
    }
    if (!battle.defenderPlan) {
      battle.defenderPlan = createDefaultBattlePlan(
        battle.defender,
        state,
        battle.territoryId,
        battle.sector
      );
    }

    // Battle plans are submitted - move directly to reveal
    // (Voice and Prescience already happened before battle plans)
    this.context.subPhase = BattleSubPhase.REVEALING_PLANS;
    return this.processReveal(state, events);
  }

  // ===========================================================================
  // VOICE (Bene Gesserit)
  // ===========================================================================

  private requestVoice(
    state: GameState,
    events: PhaseEvent[],
    voiceTarget: Faction
  ): PhaseStepResult {
    const battle = this.context.currentBattle!;
    const bgInBattle =
      battle.aggressor === Faction.BENE_GESSERIT ||
      battle.defender === Faction.BENE_GESSERIT;
    const bgAlly = getAlly(state, Faction.BENE_GESSERIT);
    const isAllyBattle =
      bgAlly && (battle.aggressor === bgAlly || battle.defender === bgAlly);

    let promptMessage = `Use Voice to command ${voiceTarget}?`;
    if (isAllyBattle && !bgInBattle) {
      promptMessage = `Your ally ${bgAlly} is in battle against ${voiceTarget}. Use Voice on your ally's opponent?`;
    }

    const pendingRequests: AgentRequest[] = [
      {
        factionId: Faction.BENE_GESSERIT,
        requestType: "USE_VOICE",
        prompt: promptMessage,
        context: {
          opponent: voiceTarget,
          allyBattle: isAllyBattle && !bgInBattle,
          ally: bgAlly,
          options: [
            "play_poison_weapon",
            "not_play_poison_weapon",
            "play_projectile_weapon",
            "not_play_projectile_weapon",
            "play_poison_defense",
            "not_play_poison_defense",
            "play_projectile_defense",
            "not_play_projectile_defense",
          ],
        },
        availableActions: ["USE_VOICE", "PASS"],
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

  private processVoice(
    state: GameState,
    responses: AgentResponse[],
    events: PhaseEvent[]
  ): PhaseStepResult {
    const response = responses.find(
      (r) => r.factionId === Faction.BENE_GESSERIT
    );

    if (response && !response.passed && response.actionType === "USE_VOICE") {
      this.context.currentBattle!.voiceUsed = true;
      this.context.currentBattle!.voiceCommand = response.data.command as {
        type: "play" | "not_play";
        cardType: string;
        specificCardName?: string;
      } | null;

      const voiceCommand = response.data.command as {
        type: "play" | "not_play";
        cardType: string;
        specificCardName?: string;
      };
      events.push({
        type: "VOICE_USED",
        data: { command: voiceCommand },
        message: `Bene Gesserit uses Voice: ${JSON.stringify(voiceCommand)}`,
      });
    }

    // Voice processed - move to Prescience (if Atreides in battle) or Battle Plans
    if (state.factions.has(Faction.ATREIDES)) {
      const battle = this.context.currentBattle!;
      const atreidesInBattle =
        battle.aggressor === Faction.ATREIDES ||
        battle.defender === Faction.ATREIDES;
      const atreidesAlly = getAlly(state, Faction.ATREIDES);
      const allyInBattle =
        atreidesAlly &&
        (battle.aggressor === atreidesAlly || battle.defender === atreidesAlly);

      if (atreidesInBattle || allyInBattle) {
        // Determine opponent to use prescience against
        let prescienceTarget: Faction;
        if (atreidesInBattle) {
          prescienceTarget =
            battle.aggressor === Faction.ATREIDES
              ? battle.defender
              : battle.aggressor;
        } else {
          // Ally's battle - target is ally's opponent
          prescienceTarget =
            battle.aggressor === atreidesAlly
              ? battle.defender
              : battle.aggressor;
        }

        this.context.subPhase = BattleSubPhase.PRESCIENCE_OPPORTUNITY;
        return this.requestPrescience(state, events, prescienceTarget);
      }
    }

    // No prescience - move to battle plans
    this.context.subPhase = BattleSubPhase.CREATING_BATTLE_PLANS;
    return this.requestBattlePlans(state, events);
  }

  // ===========================================================================
  // REVEAL AND RESOLUTION
  // ===========================================================================

  private processReveal(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    // Plans are revealed simultaneously
    const battle = this.context.currentBattle!;

    events.push({
      type: "BATTLE_PLAN_SUBMITTED",
      data: {
        aggressor: battle.aggressor,
        aggressorPlan: this.sanitizePlanForLog(battle.aggressorPlan),
        defender: battle.defender,
        defenderPlan: this.sanitizePlanForLog(battle.defenderPlan),
      },
      message: "Battle plans revealed!",
    });

    // Validate Voice compliance if Voice was used
    if (battle.voiceUsed && battle.voiceCommand) {
      // Determine which faction was targeted by Voice
      // If BG is in battle, target is their opponent; if ally is in battle, target is ally's opponent
      const bgInBattle =
        battle.aggressor === Faction.BENE_GESSERIT ||
        battle.defender === Faction.BENE_GESSERIT;
      let opponentFaction: Faction;
      let opponentPlan: BattlePlan | null;

      if (bgInBattle) {
        opponentFaction =
          battle.aggressor === Faction.BENE_GESSERIT
            ? battle.defender
            : battle.aggressor;
        opponentPlan =
          battle.aggressor === Faction.BENE_GESSERIT
            ? battle.defenderPlan
            : battle.aggressorPlan;
      } else {
        // BG's ally is in battle - Voice targets the ally's opponent
        const bgAlly = getAlly(state, Faction.BENE_GESSERIT);
        if (bgAlly) {
          opponentFaction =
            battle.aggressor === bgAlly ? battle.defender : battle.aggressor;
          opponentPlan =
            battle.aggressor === bgAlly
              ? battle.defenderPlan
              : battle.aggressorPlan;
        } else {
          // Should not happen, but handle gracefully
          opponentFaction = battle.aggressor;
          opponentPlan = battle.aggressorPlan;
        }
      }

      if (opponentPlan) {
        const voiceErrors = validateVoiceCompliance(
          state,
          opponentPlan,
          battle.voiceCommand
        );

        if (voiceErrors.length > 0) {
          // Opponent violated Voice command
          events.push({
            type: "VOICE_VIOLATION",
            data: {
              faction: opponentFaction,
              command: battle.voiceCommand,
              errors: voiceErrors,
            },
            message: `${opponentFaction} violated Voice command: ${voiceErrors[0].message}`,
          });

          // Note: In the actual game, Voice violations are handled by house rules.
          // For AI simulation, we log the violation but continue with the battle.
          // A stricter implementation could force the plan to be resubmitted.
        } else {
          events.push({
            type: "VOICE_COMPLIED",
            data: { faction: opponentFaction },
            message: `${opponentFaction} complies with Voice command`,
          });
        }
      }
    }

    // Check for traitor opportunity
    this.context.subPhase = BattleSubPhase.TRAITOR_CALL;
    return this.requestTraitorCall(state, events);
  }

  private requestTraitorCall(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    const battle = this.context.currentBattle!;
    const pendingRequests: AgentRequest[] = [];

    // Both sides can potentially call traitor
    for (const faction of [battle.aggressor, battle.defender]) {
      const factionState = getFactionState(state, faction);
      const opponent =
        faction === battle.aggressor ? battle.defender : battle.aggressor;
      const opponentPlan =
        faction === battle.aggressor
          ? battle.defenderPlan
          : battle.aggressorPlan;

      // Check if opponent's leader is in this faction's traitor cards
      // NO LOYALTY (battle.md line 156): "A captured leader used in battle may be called traitor
      // with the matching Traitor Card!" The traitor check uses leaderId which is the leader's
      // definitionId (original identity), not current ownership. This means captured leaders can
      // be called as traitors by anyone holding their matching traitor card.
      const opponentLeader = opponentPlan?.leaderId;
      const hasTraitor =
        opponentLeader &&
        factionState.traitors.some((t) => t.leaderId === opponentLeader);

      if (hasTraitor) {
        // ATREIDES LOYALTY: A leader accompanied by Kwisatz Haderach cannot turn traitor
        // (battle.md line 61: "A leader accompanied by Kwisatz Haderach can not turn traitor.")
        const opponentUsedKH =
          opponent === Faction.ATREIDES &&
          opponentPlan?.kwisatzHaderachUsed === true;

        if (opponentUsedKH) {
          // Kwisatz Haderach protects the leader from being called as traitor
          events.push({
            type: "TRAITOR_BLOCKED",
            data: {
              faction,
              opponent,
              opponentLeader,
              reason: "kwisatz_haderach_protection",
            },
            message: `${faction} cannot call traitor on ${opponent}'s leader: protected by Kwisatz Haderach`,
          });
          continue; // Skip this traitor opportunity
        }

        pendingRequests.push({
          factionId: faction,
          requestType: "CALL_TRAITOR",
          prompt: `${opponent}'s leader ${opponentLeader} is your traitor! Call traitor?`,
          context: {
            opponentLeader,
            opponent,
          },
          availableActions: ["CALL_TRAITOR", "PASS"],
        });
      }
    }

    // HARKONNEN ALLIANCE TRAITOR: Check if Harkonnen can use traitors on behalf of their ally
    // (battle.md line 149: "ALLIANCE: In your ally's battle you may use your Traitor Cards on
    // your ally's opponent. This is Treated as if your ally played the Traitor Card.")
    const harkonnenState = state.factions.get(Faction.HARKONNEN);
    const harkonnenInBattle =
      battle.aggressor === Faction.HARKONNEN ||
      battle.defender === Faction.HARKONNEN;

    if (harkonnenState && !harkonnenInBattle) {
      const harkonnenAlly = getAlly(state, Faction.HARKONNEN);

      // Check if Harkonnen's ally is in this battle
      if (
        harkonnenAlly &&
        (battle.aggressor === harkonnenAlly ||
          battle.defender === harkonnenAlly)
      ) {
        // Determine the ally's opponent
        const allyOpponent =
          battle.aggressor === harkonnenAlly
            ? battle.defender
            : battle.aggressor;
        const opponentPlan =
          battle.aggressor === harkonnenAlly
            ? battle.defenderPlan
            : battle.aggressorPlan;

        // NO LOYALTY: Check for traitor match using leader's original identity (definitionId)
        // This works for both regular and captured leaders
        const opponentLeader = opponentPlan?.leaderId;
        const hasTraitor =
          opponentLeader &&
          harkonnenState.traitors.some((t) => t.leaderId === opponentLeader);

        if (hasTraitor) {
          // Check if opponent's leader is protected by Kwisatz Haderach
          const opponentUsedKH =
            allyOpponent === Faction.ATREIDES &&
            opponentPlan?.kwisatzHaderachUsed === true;

          if (opponentUsedKH) {
            events.push({
              type: "TRAITOR_BLOCKED",
              data: {
                faction: Faction.HARKONNEN,
                opponent: allyOpponent,
                opponentLeader,
                reason: "kwisatz_haderach_protection",
              },
              message: `${Faction.HARKONNEN} cannot call traitor on ${allyOpponent}'s leader for ally: protected by Kwisatz Haderach`,
            });
          } else {
            // Harkonnen can use traitor on behalf of their ally
            pendingRequests.push({
              factionId: Faction.HARKONNEN,
              requestType: "CALL_TRAITOR",
              prompt: `${allyOpponent}'s leader ${opponentLeader} is your traitor! Call traitor on behalf of your ally ${harkonnenAlly}?`,
              context: {
                opponentLeader,
                opponent: allyOpponent,
                callingForAlly: true,
                ally: harkonnenAlly,
              },
              availableActions: ["CALL_TRAITOR", "PASS"],
            });
          }
        }
      }
    }

    if (pendingRequests.length === 0) {
      // No traitor opportunities, resolve battle
      this.context.subPhase = BattleSubPhase.BATTLE_RESOLUTION;
      return this.processResolution(state, events);
    }

    return {
      state,
      phaseComplete: false,
      pendingRequests,
      simultaneousRequests: true,
      actions: [],
      events,
    };
  }

  private processTraitor(
    state: GameState,
    responses: AgentResponse[],
    events: PhaseEvent[]
  ): PhaseStepResult {
    const battle = this.context.currentBattle!;
    let newState = state;

    // Count how many sides called traitor
    const traitorCallers: Faction[] = [];
    const callerContexts = new Map<
      Faction,
      { callingForAlly: boolean; ally?: Faction; leaderId: string }
    >();

    for (const response of responses) {
      if (!response.passed && response.actionType === "CALL_TRAITOR") {
        traitorCallers.push(response.factionId);

        const traitorLeaderId = response.data.leaderId as string;

        // Remove the traitor card from the faction that called it
        newState = removeTraitorCard(
          newState,
          response.factionId,
          traitorLeaderId
        );

        // Check if this is Harkonnen calling traitor for their ally
        // (Harkonnen is not in the battle, but their ally is)
        const callerInBattle =
          response.factionId === battle.aggressor ||
          response.factionId === battle.defender;

        if (!callerInBattle && response.factionId === Faction.HARKONNEN) {
          // Harkonnen is calling for their ally
          const ally = getAlly(newState, Faction.HARKONNEN);
          if (ally && (ally === battle.aggressor || ally === battle.defender)) {
            callerContexts.set(response.factionId, {
              callingForAlly: true,
              ally,
              leaderId: traitorLeaderId,
            });
            events.push({
              type: "TRAITOR_REVEALED",
              data: {
                caller: response.factionId,
                traitor: traitorLeaderId,
                callingForAlly: true,
                ally,
              },
              message: `${response.factionId} calls traitor on behalf of ally ${ally}!`,
            });
          } else {
            // Shouldn't happen, but handle gracefully
            callerContexts.set(response.factionId, {
              callingForAlly: false,
              leaderId: traitorLeaderId,
            });
            events.push({
              type: "TRAITOR_REVEALED",
              data: {
                caller: response.factionId,
                traitor: traitorLeaderId,
              },
              message: `${response.factionId} calls traitor!`,
            });
          }
        } else {
          // Normal traitor call by a combatant
          callerContexts.set(response.factionId, {
            callingForAlly: false,
            leaderId: traitorLeaderId,
          });
          events.push({
            type: "TRAITOR_REVEALED",
            data: {
              caller: response.factionId,
              traitor: traitorLeaderId,
            },
            message: `${response.factionId} calls traitor!`,
          });
        }
      }
    }

    // Check for TWO TRAITORS scenario
    if (traitorCallers.length === 2) {
      // Both sides called traitor - TWO TRAITORS rule applies
      this.context.currentBattle!.traitorCalled = true;
      this.context.currentBattle!.traitorCalledBy = null; // Both called, so null
      this.context.currentBattle!.traitorCallsByBothSides = true;

      events.push({
        type: "TWO_TRAITORS",
        data: {
          callers: traitorCallers,
        },
        message: "TWO TRAITORS! Both leaders are traitors for each other.",
      });
    } else if (traitorCallers.length === 1) {
      // Single traitor call - normal traitor resolution
      this.context.currentBattle!.traitorCalled = true;
      const caller = traitorCallers[0];
      const context = callerContexts.get(caller);

      // HARKONNEN ALLIANCE TRAITOR: If Harkonnen is calling traitor for their ally,
      // the ally is treated as the winner (not Harkonnen)
      if (context?.callingForAlly && context.ally) {
        // Set the ally as the winner (traitorCalledBy = winner in resolveTraitorBattle)
        this.context.currentBattle!.traitorCalledBy = context.ally;
      } else {
        this.context.currentBattle!.traitorCalledBy = caller;
      }
    }

    // Resolve battle
    this.context.subPhase = BattleSubPhase.BATTLE_RESOLUTION;
    return this.processResolution(newState, events);
  }

  private processResolution(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    const battle = this.context.currentBattle!;
    let newState = state;

    // Ensure we have valid plans
    const aggressorPlan =
      battle.aggressorPlan ??
      createDefaultBattlePlan(
        battle.aggressor,
        state,
        battle.territoryId,
        battle.sector
      );
    const defenderPlan =
      battle.defenderPlan ??
      createDefaultBattlePlan(
        battle.defender,
        state,
        battle.territoryId,
        battle.sector
      );

    // Check for TWO TRAITORS scenario first
    let result: BattleResult;
    if (battle.traitorCallsByBothSides) {
      // Use the TWO TRAITORS resolution
      result = resolveTwoTraitorsBattle(
        state,
        battle.territoryId,
        battle.aggressor,
        battle.defender,
        aggressorPlan,
        defenderPlan
      );
    } else {
      // Normal battle resolution (including single traitor)
      const traitorTarget = battle.traitorCalled
        ? battle.traitorCalledBy === battle.aggressor
          ? defenderPlan.leaderId
          : aggressorPlan.leaderId
        : null;

      result = resolveBattle(
        state,
        battle.territoryId,
        battle.sector,
        battle.aggressor,
        battle.defender,
        aggressorPlan,
        defenderPlan,
        battle.traitorCalled ? battle.traitorCalledBy : null,
        traitorTarget
      );
    }

    // Store battle result temporarily for winner card discard choice
    battle.battleResult = result;

    // Apply battle results (but don't discard winner's cards yet - they get to choose)
    newState = this.applyBattleResult(newState, battle, result, events);

    // Check if winner has cards they can choose to discard
    const winner = result.winner;
    if (winner && !result.lasgunjShieldExplosion) {
      const winnerResult =
        winner === battle.aggressor
          ? result.aggressorResult
          : result.defenderResult;

      // If winner has cards in cardsToKeep, they get to choose which to discard
      if (winnerResult.cardsToKeep.length > 0) {
        this.context.subPhase = BattleSubPhase.WINNER_CARD_DISCARD_CHOICE;
        return this.requestWinnerCardDiscard(
          newState,
          events,
          winner,
          winnerResult.cardsToKeep
        );
      }
    }

    // No choice needed - continue with normal flow
    // Discard winner's cards (if any were automatically marked for discard)
    newState = this.finishCardDiscarding(newState, battle, result, events);

    // HARKONNEN CAPTURED LEADERS: Check if Harkonnen won and can capture a leader
    if (
      result.winner === Faction.HARKONNEN &&
      result.loser !== null &&
      !result.lasgunjShieldExplosion &&
      state.factions.has(Faction.HARKONNEN)
    ) {
      const availableLeaders = getAvailableLeadersForCapture(
        newState,
        result.loser,
        battle.territoryId
      );

      if (availableLeaders.length > 0) {
        // Randomly select one leader from the available pool
        const captureTarget =
          availableLeaders[Math.floor(Math.random() * availableLeaders.length)];

        events.push({
          type: "HARKONNEN_CAPTURE_OPPORTUNITY",
          data: {
            winner: result.winner,
            loser: result.loser,
            captureTarget: captureTarget.definitionId,
          },
          message: `Harkonnen can capture ${result.loser}'s leader!`,
        });

        // Move to capture sub-phase
        this.context.subPhase = BattleSubPhase.HARKONNEN_CAPTURE;
        return this.requestCaptureChoice(
          newState,
          events,
          captureTarget.definitionId,
          result.loser!
        );
      }
    }

    // Update pending battles: remove factions that no longer have forces
    // This allows the aggressor to continue fighting in the same territory
    // if other enemies remain (MULTIPLE BATTLES rule)
    this.updatePendingBattlesAfterBattle(
      newState,
      battle.territoryId,
      battle.sector
    );

    // VALIDATION: After battle resolution, ensure stronghold occupancy limits are respected
    // If a stronghold has more than 2 factions, this is a critical error
    const violations = validateStrongholdOccupancy(newState);
    if (violations.length > 0) {
      for (const violation of violations) {
        // Check if this violation is in the territory where the battle just occurred
        if (violation.territoryId === battle.territoryId) {
          events.push({
            type: "STRONGHOLD_OCCUPANCY_VIOLATION",
            data: {
              territoryId: violation.territoryId,
              factions: violation.factions,
              count: violation.count,
            },
            message: `⚠️ CRITICAL ERROR: After battle in ${
              violation.territoryId
            }, ${
              violation.count
            } factions remain (max 2 allowed): ${violation.factions.join(
              ", "
            )}. This should never happen!`,
          });
          console.error(
            `⚠️ CRITICAL: After battle in ${violation.territoryId}, ${
              violation.count
            } factions remain: ${violation.factions.join(", ")}`
          );

          // This is a critical error - the game state is invalid
          // In a production system, we might want to throw an error or auto-fix
          // For now, we log it and continue, but this indicates a bug
        }
      }
    }

    // Check for more battles
    this.context.currentBattle = null;
    this.context.subPhase = BattleSubPhase.AGGRESSOR_CHOOSING;

    if (this.context.pendingBattles.length === 0) {
      return this.endBattlePhase(newState, events);
    }

    return this.requestBattleChoice(newState, events);
  }

  private applyBattleResult(
    state: GameState,
    battle: CurrentBattle,
    result: BattleResult,
    events: PhaseEvent[]
  ): GameState {
    let newState = state;

    // Handle lasgun-shield explosion
    if (result.lasgunjShieldExplosion) {
      events.push({
        type: "LASGUN_SHIELD_EXPLOSION",
        data: { territory: battle.territoryId, sector: battle.sector },
        message: "Lasgun-Shield explosion! All forces in territory destroyed!",
      });

      // Kill all forces in territory (explosion kills everything, no elite bonus)
      for (const faction of [battle.aggressor, battle.defender]) {
        const factionState = getFactionState(newState, faction);
        const forces = factionState.forces.onBoard.find(
          (f) =>
            f.territoryId === battle.territoryId && f.sector === battle.sector
        );
        if (forces) {
          // Explosion destroys all forces - send them separately to maintain counts
          const { regular, elite } = forces.forces;
          if (regular > 0 || elite > 0) {
            newState = sendForcesToTanks(
              newState,
              faction,
              battle.territoryId,
              battle.sector,
              regular,
              elite
            );
          }
        }
      }

      // Kill both leaders
      // TYING UP LOOSE ENDS (battle.md line 155): Killed captured leaders go to original faction's tanks
      if (battle.aggressorPlan?.leaderId) {
        const targetFaction = getTargetFactionForLeaderKill(
          newState,
          battle.aggressor,
          battle.aggressorPlan.leaderId
        );
        newState = killLeader(
          newState,
          targetFaction,
          battle.aggressorPlan.leaderId
        );
        // Check for Prison Break after leader death
        newState = this.checkPrisonBreak(newState, battle.aggressor, events);
      }
      if (battle.defenderPlan?.leaderId) {
        const targetFaction = getTargetFactionForLeaderKill(
          newState,
          battle.defender,
          battle.defenderPlan.leaderId
        );
        newState = killLeader(
          newState,
          targetFaction,
          battle.defenderPlan.leaderId
        );
        // Check for Prison Break after leader death
        newState = this.checkPrisonBreak(newState, battle.defender, events);
      }

      // Kill Kwisatz Haderach if Atreides used it (PROPHECY BLINDED)
      // Rule: "The Kwisatz Haderach token can only be killed if blown up by a lasgun/shield explosion."
      if (
        battle.aggressor === Faction.ATREIDES &&
        battle.aggressorPlan?.kwisatzHaderachUsed
      ) {
        const wasDead =
          getFactionState(newState, Faction.ATREIDES).kwisatzHaderach?.isDead ??
          false;
        newState = killKwisatzHaderach(newState);
        const nowDead =
          getFactionState(newState, Faction.ATREIDES).kwisatzHaderach?.isDead ??
          false;
        if (nowDead && !wasDead) {
          events.push({
            type: "KWISATZ_HADERACH_KILLED",
            data: {
              faction: Faction.ATREIDES,
              reason: "lasgun_shield_explosion",
            },
            message: "Kwisatz Haderach killed by lasgun-shield explosion",
          });
        }
      }
      if (
        battle.defender === Faction.ATREIDES &&
        battle.defenderPlan?.kwisatzHaderachUsed
      ) {
        const wasDead =
          getFactionState(newState, Faction.ATREIDES).kwisatzHaderach?.isDead ??
          false;
        newState = killKwisatzHaderach(newState);
        const nowDead =
          getFactionState(newState, Faction.ATREIDES).kwisatzHaderach?.isDead ??
          false;
        if (nowDead && !wasDead) {
          events.push({
            type: "KWISATZ_HADERACH_KILLED",
            data: {
              faction: Faction.ATREIDES,
              reason: "lasgun_shield_explosion",
            },
            message: "Kwisatz Haderach killed by lasgun-shield explosion",
          });
        }
      }

      return newState;
    }

    // Normal battle resolution
    events.push({
      type: "BATTLE_RESOLVED",
      data: {
        winner: result.winner,
        loser: result.loser,
        winnerTotal: result.winnerTotal,
        loserTotal: result.loserTotal,
        traitorRevealed: result.traitorRevealed,
      },
      message: `${result.winner} wins the battle (${result.winnerTotal} vs ${result.loserTotal})`,
    });

    // ===========================================================================
    // LEADER DEATHS FROM WEAPONS
    // ===========================================================================
    // IMPORTANT: Leaders can ONLY die from weapons (or lasgun-shield explosion), NOT from losing the battle.
    // The resolveBattle function in combat.ts correctly calculates leaderKilled flags based on
    // weapon/defense resolution. We handle both sides' leader deaths here, regardless of who won.
    // Dead leaders don't contribute to battle strength (already accounted for in resolveBattle).

    // Handle aggressor's leader death from weapons
    if (result.aggressorResult.leaderKilled && battle.aggressorPlan?.leaderId) {
      // TYING UP LOOSE ENDS (battle.md line 155): Killed captured leaders go to original faction's tanks
      const targetFaction = getTargetFactionForLeaderKill(
        newState,
        battle.aggressor,
        battle.aggressorPlan.leaderId
      );
      newState = killLeader(
        newState,
        targetFaction,
        battle.aggressorPlan.leaderId
      );
      events.push({
        type: "LEADER_KILLED",
        data: {
          faction: battle.aggressor,
          leaderId: battle.aggressorPlan.leaderId,
          killedBy: "weapon",
        },
        message: `${battle.aggressor}'s leader ${battle.aggressorPlan.leaderId} killed by weapon`,
      });

      // Check for Prison Break after leader death
      newState = this.checkPrisonBreak(newState, battle.aggressor, events);
    }

    // Handle defender's leader death from weapons
    if (result.defenderResult.leaderKilled && battle.defenderPlan?.leaderId) {
      // TYING UP LOOSE ENDS (battle.md line 155): Killed captured leaders go to original faction's tanks
      const targetFaction = getTargetFactionForLeaderKill(
        newState,
        battle.defender,
        battle.defenderPlan.leaderId
      );
      newState = killLeader(
        newState,
        targetFaction,
        battle.defenderPlan.leaderId
      );
      events.push({
        type: "LEADER_KILLED",
        data: {
          faction: battle.defender,
          leaderId: battle.defenderPlan.leaderId,
          killedBy: "weapon",
        },
        message: `${battle.defender}'s leader ${battle.defenderPlan.leaderId} killed by weapon`,
      });

      // Check for Prison Break after leader death
      newState = this.checkPrisonBreak(newState, battle.defender, events);
    }

    // ===========================================================================
    // FORCE LOSSES
    // ===========================================================================
    // Loser loses all forces (send separately to maintain force type counts)
    const loser = result.loser;
    if (!loser) {
      // TWO TRAITORS case already handled, safety check
      return newState;
    }
    const loserForces = getFactionState(newState, loser).forces.onBoard.find(
      (f) => f.territoryId === battle.territoryId && f.sector === battle.sector
    );
    if (loserForces) {
      const { regular, elite } = loserForces.forces;
      if (regular > 0 || elite > 0) {
        newState = sendForcesToTanks(
          newState,
          loser,
          battle.territoryId,
          battle.sector,
          regular,
          elite
        );

        // Track force losses for Kwisatz Haderach activation (THE SLEEPER HAS AWAKENED)
        if (loser === Faction.ATREIDES) {
          const totalLost = regular + elite;
          const wasActive =
            getFactionState(newState, Faction.ATREIDES).kwisatzHaderach
              ?.isActive ?? false;
          newState = updateKwisatzHaderach(newState, totalLost);
          const nowActive =
            getFactionState(newState, Faction.ATREIDES).kwisatzHaderach
              ?.isActive ?? false;
          if (nowActive && !wasActive) {
            events.push({
              type: "KWISATZ_HADERACH_ACTIVATED",
              data: { faction: Faction.ATREIDES },
              message: "Kwisatz Haderach has awakened!",
            });
          }
        }
      }
    }

    // Winner loses forces equal to the number they dialed on the Battle Wheel
    // Elite forces worth 2x when taking losses (except Sardaukar vs Fremen)
    const winner = result.winner;
    if (!winner) {
      // TWO TRAITORS case already handled, safety check
      return newState;
    }
    const winnerPlan =
      winner === battle.aggressor ? battle.aggressorPlan : battle.defenderPlan;
    const winnerLosses = winnerPlan?.forcesDialed ?? 0;
    if (winnerLosses > 0) {
      const winnerForces = getFactionState(
        newState,
        winner
      ).forces.onBoard.find(
        (f) =>
          f.territoryId === battle.territoryId && f.sector === battle.sector
      );
      if (winnerForces) {
        // Calculate loss distribution: elite forces absorb 2 losses each (or 1 for Sardaukar vs Fremen)
        const opponent =
          winner === battle.aggressor ? battle.defender : battle.aggressor;
        const distribution = calculateLossDistribution(
          winnerForces.forces,
          winnerLosses,
          winner,
          opponent
        );

        if (distribution.regularLost > 0 || distribution.eliteLost > 0) {
          newState = sendForcesToTanks(
            newState,
            winner,
            battle.territoryId,
            battle.sector,
            distribution.regularLost,
            distribution.eliteLost
          );

          // Track force losses for Kwisatz Haderach activation (THE SLEEPER HAS AWAKENED)
          if (winner === Faction.ATREIDES) {
            const totalLost = distribution.regularLost + distribution.eliteLost;
            const wasActive =
              getFactionState(newState, Faction.ATREIDES).kwisatzHaderach
                ?.isActive ?? false;
            newState = updateKwisatzHaderach(newState, totalLost);
            const nowActive =
              getFactionState(newState, Faction.ATREIDES).kwisatzHaderach
                ?.isActive ?? false;
            if (nowActive && !wasActive) {
              events.push({
                type: "KWISATZ_HADERACH_ACTIVATED",
                data: { faction: Faction.ATREIDES },
                message: "Kwisatz Haderach has awakened!",
              });
            }
          }

          // Log the loss distribution for clarity
          events.push({
            type: "BATTLE_RESOLVED",
            data: {
              faction: winner,
              lossesDialed: winnerLosses,
              regularLost: distribution.regularLost,
              eliteLost: distribution.eliteLost,
            },
            message: `${winner} loses ${distribution.regularLost} regular + ${distribution.eliteLost} elite forces (${winnerLosses} losses)`,
          });
        }
      }
    }

    // Deduct spice for spice dialing (advanced rules)
    // Rule from battle.md line 45-46: "PAYMENT: All spice paid for Spice Dialing is Placed in the Spice Bank."
    // "LOSING NOTHING: When a traitor card is played, the winner keeps all spice paid to support their Forces."
    if (state.config.advancedRules) {
      const aggressorSpice = battle.aggressorPlan?.spiceDialed ?? 0;
      const defenderSpice = battle.defenderPlan?.spiceDialed ?? 0;

      // Winner keeps spice if traitor was revealed
      if (!result.traitorRevealed) {
        // Normal battle - both sides pay spice to bank
        if (aggressorSpice > 0) {
          newState = removeSpice(newState, battle.aggressor, aggressorSpice);
          events.push({
            type: "SPICE_COLLECTED",
            data: {
              faction: battle.aggressor,
              amount: -aggressorSpice,
              reason: "Spice dialing payment to bank",
            },
            message: `${battle.aggressor} pays ${aggressorSpice} spice to bank for spice dialing`,
          });
        }
        if (defenderSpice > 0) {
          newState = removeSpice(newState, battle.defender, defenderSpice);
          events.push({
            type: "SPICE_COLLECTED",
            data: {
              faction: battle.defender,
              amount: -defenderSpice,
              reason: "Spice dialing payment to bank",
            },
            message: `${battle.defender} pays ${defenderSpice} spice to bank for spice dialing`,
          });
        }
      } else {
        // Traitor revealed - winner keeps spice, loser pays
        const winnerSpice =
          winner === battle.aggressor ? aggressorSpice : defenderSpice;
        const loserSpice =
          winner === battle.aggressor ? defenderSpice : aggressorSpice;

        if (loserSpice > 0) {
          newState = removeSpice(newState, loser, loserSpice);
          events.push({
            type: "SPICE_COLLECTED",
            data: {
              faction: loser,
              amount: -loserSpice,
              reason: "Spice dialing payment (loser pays, winner keeps)",
            },
            message: `${loser} pays ${loserSpice} spice to bank. ${winner} keeps their ${winnerSpice} spice (traitor rule).`,
          });
        }
      }
    }

    // Mark leaders as used (unless traitor was revealed - winner's leader returns to pool)
    if (winnerPlan?.leaderId) {
      if (result.traitorRevealed) {
        // Winner's leader returns to pool immediately per traitor rules
        newState = returnLeaderToPool(newState, winner, winnerPlan.leaderId);
        events.push({
          type: "LEADER_RETURNED",
          data: { faction: winner, leaderId: winnerPlan.leaderId },
          message: `${winner}'s leader returns to pool after traitor reveal`,
        });
      } else {
        newState = markLeaderUsed(
          newState,
          winner,
          winnerPlan.leaderId,
          battle.territoryId
        );
      }
    }

    // Mark Kwisatz Haderach as used if applicable
    // Rule: "One time use abilities may be considered not used for this instance (Ex: Kwisatz Haderach, Captured leaders)."
    // When traitor is revealed, one-time abilities are NOT used.
    if (
      winnerPlan?.kwisatzHaderachUsed &&
      winner === Faction.ATREIDES &&
      !result.traitorRevealed
    ) {
      newState = markKwisatzHaderachUsed(newState, battle.territoryId);
      events.push({
        type: "KWISATZ_HADERACH_USED",
        data: { territory: battle.territoryId },
        message: "Atreides uses Kwisatz Haderach (+2 strength)",
      });
    }

    // Apply spice payouts for killed leaders
    // Winner receives spice equal to the strength of all killed leaders
    for (const payout of result.spicePayouts) {
      newState = addSpice(newState, payout.faction, payout.amount);
      events.push({
        type: "SPICE_COLLECTED",
        data: {
          faction: payout.faction,
          amount: payout.amount,
          reason: payout.reason,
        },
        message: `${payout.faction} receives ${payout.amount} spice: ${payout.reason}`,
      });
    }

    // Don't discard cards here - that happens in finishCardDiscarding
    // This allows the winner to choose which cards to discard first

    newState = logAction(newState, "BATTLE_RESOLVED", null, {
      territory: battle.territoryId,
      sector: battle.sector,
      aggressor: battle.aggressor,
      defender: battle.defender,
      winner: result.winner,
      loser: result.loser,
    });

    return newState;
  }

  /**
   * Finish discarding cards after winner has made their choice (or if no choice was needed).
   */
  private finishCardDiscarding(
    state: GameState,
    battle: CurrentBattle,
    result: BattleResult,
    events: PhaseEvent[]
  ): GameState {
    let newState = state;

    // Discard used treachery cards
    const discardCards = (faction: Faction, cardIds: string[]) => {
      for (const cardId of cardIds) {
        newState = discardTreacheryCard(newState, faction, cardId);
        const cardDef = getTreacheryCardDefinition(cardId);
        events.push({
          type: "CARD_DISCARDED",
          data: { faction, cardId, cardName: cardDef?.name },
          message: `${faction} discards ${cardDef?.name || cardId}`,
        });
      }
    };

    discardCards(battle.aggressor, result.aggressorResult.cardsToDiscard);
    discardCards(battle.defender, result.defenderResult.cardsToDiscard);

    return newState;
  }

  private endBattlePhase(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    // Note: PhaseManager emits PHASE_ENDED event, so we just signal completion
    events.push({
      type: "BATTLES_COMPLETE",
      data: { phase: Phase.BATTLE },
      message: "All battles resolved",
    });

    const finalState = setActiveFactions(state, []);

    return {
      state: finalState,
      phaseComplete: true,
      nextPhase: Phase.SPICE_COLLECTION,
      pendingRequests: [],
      actions: [],
      events,
    };
  }

  // ===========================================================================
  // PRISON BREAK
  // ===========================================================================

  /**
   * Check if a faction should trigger Prison Break after a leader death.
   * Per rules: "When all your own leaders have been killed, you must return all
   * captured leaders immediately to the players who last had them as an Active Leader."
   */
  private checkPrisonBreak(
    state: GameState,
    faction: Faction,
    events: PhaseEvent[]
  ): GameState {
    // Only check if this faction is in the game
    if (!state.factions.has(faction)) {
      return state;
    }

    // Check if Prison Break should trigger
    if (!shouldTriggerPrisonBreak(state, faction)) {
      return state;
    }

    // Trigger Prison Break - return all captured leaders
    const newState = returnAllCapturedLeaders(state, faction);

    events.push({
      type: "PRISON_BREAK",
      data: { faction },
      message: `Prison Break! All of ${faction}'s own leaders are dead. All captured leaders are returned to their original owners.`,
    });

    return newState;
  }

  // ===========================================================================
  // WINNER CARD DISCARD CHOICE
  // ===========================================================================

  /**
   * Request winner's choice of which cards to discard after winning.
   * Rule: "The winning player may discard any of the cards they played"
   */
  private requestWinnerCardDiscard(
    state: GameState,
    events: PhaseEvent[],
    winner: Faction,
    cardsToKeep: string[]
  ): PhaseStepResult {
    const battle = this.context.currentBattle!;
    const result = battle.battleResult!;

    // Get card names for the prompt
    const cardNames = cardsToKeep.map((cardId) => {
      const cardDef = getTreacheryCardDefinition(cardId);
      return cardDef?.name || cardId;
    });

    const pendingRequests: AgentRequest[] = [
      {
        factionId: winner,
        requestType: "CHOOSE_CARDS_TO_DISCARD",
        prompt: `You won the battle! You played: ${cardNames.join(
          ", "
        )}. Which cards would you like to discard? (You may keep any that don't say "Discard after use". You can discard all, some, or none.)`,
        context: {
          cardsToKeep,
          cardNames,
          cardsToDiscard: result.aggressorResult.cardsToDiscard.concat(
            result.defenderResult.cardsToDiscard
          ),
        },
        availableActions: ["CHOOSE_CARDS_TO_DISCARD"],
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
   * Process winner's choice of which cards to discard.
   */
  private processWinnerCardDiscard(
    state: GameState,
    responses: AgentResponse[],
    events: PhaseEvent[]
  ): PhaseStepResult {
    const battle = this.context.currentBattle!;
    const result = battle.battleResult!;
    const winner = result.winner!;

    const response = responses.find((r) => r.factionId === winner);
    let newState = state;

    if (response && response.actionType === "CHOOSE_CARDS_TO_DISCARD") {
      const cardsToDiscard = (response.data.cardsToDiscard as string[]) || [];

      // Validate that all discarded cards are in the winner's cardsToKeep
      const winnerResult =
        winner === battle.aggressor
          ? result.aggressorResult
          : result.defenderResult;

      // Update the result: move chosen cards from cardsToKeep to cardsToDiscard
      for (const cardId of cardsToDiscard) {
        if (winnerResult.cardsToKeep.includes(cardId)) {
          // Remove from cardsToKeep and add to cardsToDiscard
          const index = winnerResult.cardsToKeep.indexOf(cardId);
          winnerResult.cardsToKeep.splice(index, 1);
          winnerResult.cardsToDiscard.push(cardId);
        }
      }

      // Log the choice
      if (cardsToDiscard.length > 0) {
        const cardNames = cardsToDiscard.map((cardId) => {
          const cardDef = getTreacheryCardDefinition(cardId);
          return cardDef?.name || cardId;
        });
        events.push({
          type: "CARD_DISCARDED",
          data: {
            faction: winner,
            cardsDiscarded: cardsToDiscard,
            cardNames,
          },
          message: `${winner} chooses to discard: ${cardNames.join(", ")}`,
        });
      } else {
        events.push({
          type: "CARD_DISCARDED",
          data: {
            faction: winner,
            cardsDiscarded: [],
          },
          message: `${winner} chooses to keep all cards`,
        });
      }
    }

    // Now finish discarding cards (including winner's choice)
    newState = this.finishCardDiscarding(newState, battle, result, events);

    // Clear the stored battle result
    battle.battleResult = undefined;

    // HARKONNEN CAPTURED LEADERS: Check if Harkonnen won and can capture a leader
    if (
      result.winner === Faction.HARKONNEN &&
      !result.lasgunjShieldExplosion &&
      state.factions.has(Faction.HARKONNEN)
    ) {
      const availableLeaders = getAvailableLeadersForCapture(
        newState,
        result.loser!,
        battle.territoryId
      );

      if (availableLeaders.length > 0) {
        // Randomly select one leader from the available pool
        const captureTarget =
          availableLeaders[Math.floor(Math.random() * availableLeaders.length)];

        events.push({
          type: "HARKONNEN_CAPTURE_OPPORTUNITY",
          data: {
            winner: result.winner,
            loser: result.loser,
            captureTarget: captureTarget.definitionId,
          },
          message: `Harkonnen can capture ${result.loser}'s leader!`,
        });

        // Move to capture sub-phase
        this.context.subPhase = BattleSubPhase.HARKONNEN_CAPTURE;
        return this.requestCaptureChoice(
          newState,
          events,
          captureTarget.definitionId,
          result.loser!
        );
      }
    }

    // Update pending battles: remove factions that no longer have forces
    // This allows the aggressor to continue fighting in the same territory
    // if other enemies remain (MULTIPLE BATTLES rule)
    this.updatePendingBattlesAfterBattle(
      newState,
      battle.territoryId,
      battle.sector
    );

    // Check for more battles
    this.context.currentBattle = null;
    this.context.subPhase = BattleSubPhase.AGGRESSOR_CHOOSING;

    if (this.context.pendingBattles.length === 0) {
      return this.endBattlePhase(newState, events);
    }

    return this.requestBattleChoice(newState, events);
  }

  // ===========================================================================
  // HARKONNEN CAPTURED LEADERS
  // ===========================================================================

  /**
   * Request Harkonnen's choice to kill or capture a leader.
   */
  private requestCaptureChoice(
    state: GameState,
    events: PhaseEvent[],
    leaderId: string,
    victim: Faction
  ): PhaseStepResult {
    const leaderDef = getLeaderDefinition(leaderId);
    const leaderName = leaderDef?.name || leaderId;

    const pendingRequests: AgentRequest[] = [
      {
        factionId: Faction.HARKONNEN,
        requestType: "CAPTURE_LEADER_CHOICE",
        prompt: `You have captured ${victim}'s leader ${leaderName}. Choose KILL (gain 2 spice, leader goes to tanks face-down) or CAPTURE (add to your leader pool, returns to owner after use).`,
        context: {
          leaderId,
          leaderName,
          victim,
          options: ["kill", "capture"],
        },
        availableActions: ["CAPTURE_LEADER_CHOICE"],
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
   * Process Harkonnen's capture/kill choice.
   */
  private processHarkonnenCapture(
    state: GameState,
    responses: AgentResponse[],
    events: PhaseEvent[]
  ): PhaseStepResult {
    const response = responses.find((r) => r.factionId === Faction.HARKONNEN);
    let newState = state;

    if (response && response.actionType === "CAPTURE_LEADER_CHOICE") {
      const leaderId = response.data.leaderId as string;
      const victim = response.data.victim as Faction;
      const choice = response.data.choice as "kill" | "capture";

      const leaderDef = getLeaderDefinition(leaderId);
      const leaderName = leaderDef?.name || leaderId;

      if (choice === "kill") {
        // KILL: Place face-down in tanks, Harkonnen gains 2 spice
        // We need to temporarily give the leader to Harkonnen first so killCapturedLeader can find it
        newState = captureLeader(newState, Faction.HARKONNEN, victim, leaderId);
        newState = killCapturedLeader(newState, Faction.HARKONNEN, leaderId);

        events.push({
          type: "LEADER_CAPTURED_AND_KILLED",
          data: {
            captor: Faction.HARKONNEN,
            victim,
            leaderId,
            leaderName,
            spiceGained: 2,
          },
          message: `Harkonnen kills captured leader ${leaderName} for 2 spice`,
        });
      } else {
        // CAPTURE: Add to Harkonnen's leader pool
        newState = captureLeader(newState, Faction.HARKONNEN, victim, leaderId);

        events.push({
          type: "LEADER_CAPTURED",
          data: {
            captor: Faction.HARKONNEN,
            victim,
            leaderId,
            leaderName,
          },
          message: `Harkonnen captures ${leaderName} from ${victim}`,
        });
      }
    }

    // Update pending battles: remove factions that no longer have forces
    // This allows the aggressor to continue fighting in the same territory
    // if other enemies remain (MULTIPLE BATTLES rule)
    const battle = this.context.currentBattle!;
    this.updatePendingBattlesAfterBattle(
      newState,
      battle.territoryId,
      battle.sector
    );

    // Check for more battles
    this.context.currentBattle = null;
    this.context.subPhase = BattleSubPhase.AGGRESSOR_CHOOSING;

    if (this.context.pendingBattles.length === 0) {
      return this.endBattlePhase(newState, events);
    }

    return this.requestBattleChoice(newState, events);
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  /**
   * Create a default battle plan (used when a player fails to submit a valid plan).
   * @deprecated Use createDefaultBattlePlan from battle/plans.ts directly with state/territory info
   */
  // Battle plan utilities moved to battle/plans.ts
  private createDefaultPlan(faction: Faction): BattlePlan {
    // Legacy method - returns plan with 0 forces (should be updated to pass state/territory)
    return createDefaultBattlePlan(faction);
  }

  private sanitizePlanForLog(
    plan: BattlePlan | null
  ): Record<string, unknown> | null {
    return sanitizePlanForLog(plan);
  }
}
