/**
 * Battle Phase Handler
 *
 * Phase 1.07: Battle
 * - Identify territories with multiple factions
 * - Battles occur in storm order
 * - Sub-phases: Choose battle, battle plans, prescience, voice, reveal, traitor, resolution
 */

import {
  Faction,
  Phase,
  BattleSubPhase,
  TerritoryId,
  LeaderLocation,
  type GameState,
  type BattlePlan,
} from '../../types';
import {
  sendForcesToTanks,
  killLeader,
  markLeaderUsed,
  resetLeaderTurnState,
  getFactionState,
  logAction,
  getFactionsInTerritory,
} from '../../state';
import { resolveBattle, validateBattlePlan, type BattleResult } from '../../rules';
import { getLeaderDefinition, getTreacheryCardDefinition } from '../../data';
import {
  type PhaseHandler,
  type PhaseStepResult,
  type AgentRequest,
  type AgentResponse,
  type PhaseEvent,
  type BattlePhaseContext,
  type PendingBattle,
  type CurrentBattle,
} from '../types';

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

    events.push({
      type: 'PHASE_STARTED',
      data: { phase: Phase.BATTLE },
      message: 'Battle phase started',
    });

    // Identify all territories with multiple factions
    this.context.pendingBattles = this.identifyBattles(state);

    if (this.context.pendingBattles.length === 0) {
      events.push({
        type: 'PHASE_ENDED',
        data: { phase: Phase.BATTLE, noBattles: true },
        message: 'No battles this turn',
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
      type: 'BATTLE_STARTED',
      data: { totalBattles: this.context.pendingBattles.length },
      message: `${this.context.pendingBattles.length} potential battles identified`,
    });

    // Start first battle selection
    return this.requestBattleChoice(state, events);
  }

  processStep(state: GameState, responses: AgentResponse[]): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;

    switch (this.context.subPhase) {
      case BattleSubPhase.AGGRESSOR_CHOOSING:
        return this.processChooseBattle(newState, responses, events);

      case BattleSubPhase.PRESCIENCE_OPPORTUNITY:
        return this.processPrescience(newState, responses, events);

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
    return newState;
  }

  // ===========================================================================
  // BATTLE IDENTIFICATION
  // ===========================================================================

  private identifyBattles(state: GameState): PendingBattle[] {
    const battles: PendingBattle[] = [];
    const checkedLocations = new Set<string>();

    for (const [faction, factionState] of state.factions) {
      for (const forceStack of factionState.forces.onBoard) {
        const locationKey = `${forceStack.territoryId}-${forceStack.sector}`;
        if (checkedLocations.has(locationKey)) continue;
        checkedLocations.add(locationKey);

        const factionsHere = getFactionsInTerritory(
          state,
          forceStack.territoryId
        );

        if (factionsHere.length >= 2) {
          battles.push({
            territoryId: forceStack.territoryId,
            sector: forceStack.sector,
            factions: factionsHere,
          });
        }
      }
    }

    return battles;
  }

  // ===========================================================================
  // BATTLE CHOICE
  // ===========================================================================

  private requestBattleChoice(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    // Find next aggressor in storm order who has pending battles
    while (this.context.currentAggressorIndex < this.context.aggressorOrder.length) {
      const aggressor = this.context.aggressorOrder[this.context.currentAggressorIndex];

      const availableBattles = this.context.pendingBattles.filter((b) =>
        b.factions.includes(aggressor)
      );

      if (availableBattles.length > 0) {
        const pendingRequests: AgentRequest[] = [
          {
            factionId: aggressor,
            requestType: 'CHOOSE_BATTLE',
            prompt: `You are the aggressor. Choose which battle to fight or pass.`,
            context: {
              availableBattles: availableBattles.map((b) => ({
                territory: b.territoryId,
                sector: b.sector,
                enemies: b.factions.filter((f) => f !== aggressor),
              })),
            },
            availableActions: ['CHOOSE_BATTLE', 'PASS'],
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

      this.context.currentAggressorIndex++;
    }

    // No more battles
    return this.endBattlePhase(state, events);
  }

  private processChooseBattle(
    state: GameState,
    responses: AgentResponse[],
    events: PhaseEvent[]
  ): PhaseStepResult {
    const response = responses[0];
    if (!response) {
      this.context.currentAggressorIndex++;
      return this.requestBattleChoice(state, events);
    }

    if (response.passed) {
      this.context.currentAggressorIndex++;
      return this.requestBattleChoice(state, events);
    }

    // Set up the battle
    const territoryId = response.data.territoryId as TerritoryId;
    const sector = response.data.sector as number;
    const defender = response.data.defender as Faction;
    const aggressor = response.factionId;

    // Find this battle in pending
    const battleIndex = this.context.pendingBattles.findIndex(
      (b) =>
        b.territoryId === territoryId &&
        b.sector === sector &&
        b.factions.includes(aggressor) &&
        b.factions.includes(defender)
    );

    if (battleIndex === -1) {
      // Invalid battle choice
      this.context.currentAggressorIndex++;
      return this.requestBattleChoice(state, events);
    }

    // Set up current battle
    this.context.currentBattle = {
      territoryId,
      sector,
      aggressor,
      defender,
      aggressorPlan: null,
      defenderPlan: null,
      prescienceUsed: false,
      prescienceTarget: null,
      prescienceResult: null,
      voiceUsed: false,
      voiceCommand: null,
      traitorCalled: false,
      traitorCalledBy: null,
    };

    events.push({
      type: 'BATTLE_STARTED',
      data: {
        territory: territoryId,
        sector,
        aggressor,
        defender,
      },
      message: `Battle: ${aggressor} attacks ${defender} in ${territoryId}`,
    });

    // Check for Atreides prescience
    if (state.factions.has(Faction.ATREIDES)) {
      const atreidesInBattle =
        aggressor === Faction.ATREIDES || defender === Faction.ATREIDES;

      if (atreidesInBattle) {
        this.context.subPhase = BattleSubPhase.PRESCIENCE_OPPORTUNITY;
        return this.requestPrescience(state, events);
      }
    }

    // Skip to battle plans
    this.context.subPhase = BattleSubPhase.CREATING_BATTLE_PLANS;
    return this.requestBattlePlans(state, events);
  }

  // ===========================================================================
  // PRESCIENCE (Atreides)
  // ===========================================================================

  private requestPrescience(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    const battle = this.context.currentBattle!;
    const isAggressor = battle.aggressor === Faction.ATREIDES;
    const opponent = isAggressor ? battle.defender : battle.aggressor;

    const pendingRequests: AgentRequest[] = [
      {
        factionId: Faction.ATREIDES,
        requestType: 'USE_PRESCIENCE',
        prompt: `Use prescience to see one element of ${opponent}'s battle plan?`,
        context: {
          opponent,
          options: ['leader', 'weapon', 'defense', 'number'],
        },
        availableActions: ['USE_PRESCIENCE', 'PASS'],
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

    if (response && !response.passed && response.actionType === 'USE_PRESCIENCE') {
      this.context.currentBattle!.prescienceUsed = true;
      this.context.currentBattle!.prescienceTarget = response.data.target as string;

      events.push({
        type: 'PRESCIENCE_USED',
        data: { target: response.data.target },
        message: `Atreides uses prescience to see opponent's ${response.data.target}`,
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
      const forces = factionState.forces.onBoard.find(
        (f) => f.territoryId === battle.territoryId && f.sector === battle.sector
      );
      const totalForces = forces
        ? forces.forces.regular + forces.forces.elite
        : 0;

      // Prescience info for Atreides
      let prescienceInfo = null;
      if (
        faction === Faction.ATREIDES &&
        this.context.currentBattle!.prescienceUsed
      ) {
        prescienceInfo = {
          target: this.context.currentBattle!.prescienceTarget,
          // Will be filled after opponent submits
        };
      }

      pendingRequests.push({
        factionId: faction,
        requestType: 'CREATE_BATTLE_PLAN',
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
        },
        availableActions: ['CREATE_BATTLE_PLAN'],
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
      const plan = response.data.plan as BattlePlan;
      if (!plan) continue;

      // Validate plan
      const validation = validateBattlePlan(state, response.factionId, battle.territoryId, plan);
      if (!validation.valid) {
        events.push({
          type: 'BATTLE_PLAN_SUBMITTED',
          data: {
            faction: response.factionId,
            invalid: true,
            errors: validation.errors,
          },
          message: `${response.factionId} battle plan invalid: ${validation.errors[0]?.message}`,
        });
        // Use default plan
        const defaultPlan: BattlePlan = {
          factionId: response.factionId,
          leaderId: null,
          forcesDialed: 0,
          spiceDialed: 0,
          weaponCardId: null,
          defenseCardId: null,
          kwisatzHaderachUsed: false,
          cheapHeroUsed: false,
        };
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
        type: 'BATTLE_PLAN_SUBMITTED',
        data: { faction: response.factionId },
        message: `${response.factionId} submits battle plan`,
      });
    }

    // Check for BG voice
    if (state.factions.has(Faction.BENE_GESSERIT)) {
      const bgInBattle =
        battle.aggressor === Faction.BENE_GESSERIT ||
        battle.defender === Faction.BENE_GESSERIT;

      if (bgInBattle) {
        this.context.subPhase = BattleSubPhase.VOICE_OPPORTUNITY;
        return this.requestVoice(state, events);
      }
    }

    // Skip to reveal
    this.context.subPhase = BattleSubPhase.REVEALING_PLANS;
    return this.processReveal(state, events);
  }

  // ===========================================================================
  // VOICE (Bene Gesserit)
  // ===========================================================================

  private requestVoice(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    const battle = this.context.currentBattle!;
    const opponent =
      battle.aggressor === Faction.BENE_GESSERIT
        ? battle.defender
        : battle.aggressor;

    const pendingRequests: AgentRequest[] = [
      {
        factionId: Faction.BENE_GESSERIT,
        requestType: 'USE_VOICE',
        prompt: `Use Voice to command ${opponent}?`,
        context: {
          opponent,
          options: [
            'play_poison_weapon',
            'not_play_poison_weapon',
            'play_projectile_weapon',
            'not_play_projectile_weapon',
            'play_poison_defense',
            'not_play_poison_defense',
            'play_projectile_defense',
            'not_play_projectile_defense',
          ],
        },
        availableActions: ['USE_VOICE', 'PASS'],
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
    const response = responses.find((r) => r.factionId === Faction.BENE_GESSERIT);

    if (response && !response.passed && response.actionType === 'USE_VOICE') {
      this.context.currentBattle!.voiceUsed = true;
      this.context.currentBattle!.voiceCommand = response.data.command;

      events.push({
        type: 'VOICE_USED',
        data: { command: response.data.command },
        message: `Bene Gesserit uses Voice: ${response.data.command}`,
      });
    }

    // Move to reveal
    this.context.subPhase = BattleSubPhase.REVEALING_PLANS;
    return this.processReveal(state, events);
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
      type: 'BATTLE_PLAN_SUBMITTED',
      data: {
        aggressor: battle.aggressor,
        aggressorPlan: this.sanitizePlanForLog(battle.aggressorPlan),
        defender: battle.defender,
        defenderPlan: this.sanitizePlanForLog(battle.defenderPlan),
      },
      message: 'Battle plans revealed!',
    });

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
      const opponent = faction === battle.aggressor ? battle.defender : battle.aggressor;
      const opponentPlan =
        faction === battle.aggressor ? battle.defenderPlan : battle.aggressorPlan;

      // Check if opponent's leader is in this faction's traitor cards
      const opponentLeader = opponentPlan?.leaderId;
      const hasTraitor =
        opponentLeader &&
        factionState.traitors.some((t) => t.leaderId === opponentLeader);

      if (hasTraitor) {
        pendingRequests.push({
          factionId: faction,
          requestType: 'CALL_TRAITOR',
          prompt: `${opponent}'s leader ${opponentLeader} is your traitor! Call traitor?`,
          context: {
            opponentLeader,
            opponent,
          },
          availableActions: ['CALL_TRAITOR', 'PASS'],
        });
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
    for (const response of responses) {
      if (!response.passed && response.actionType === 'CALL_TRAITOR') {
        this.context.currentBattle!.traitorCalled = true;
        this.context.currentBattle!.traitorCalledBy = response.factionId;

        events.push({
          type: 'TRAITOR_REVEALED',
          data: {
            caller: response.factionId,
            traitor: response.data.leaderId,
          },
          message: `${response.factionId} calls traitor!`,
        });

        break; // Only one traitor can be called
      }
    }

    // Resolve battle
    this.context.subPhase = BattleSubPhase.BATTLE_RESOLUTION;
    return this.processResolution(state, events);
  }

  private processResolution(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    const battle = this.context.currentBattle!;
    let newState = state;

    // Ensure we have valid plans
    const aggressorPlan = battle.aggressorPlan ?? this.createDefaultPlan(battle.aggressor);
    const defenderPlan = battle.defenderPlan ?? this.createDefaultPlan(battle.defender);

    // Resolve the battle
    const traitorTarget = battle.traitorCalled
      ? (battle.traitorCalledBy === battle.aggressor
          ? defenderPlan.leaderId
          : aggressorPlan.leaderId)
      : null;

    const result = resolveBattle(
      state,
      battle.territoryId,
      battle.aggressor,
      battle.defender,
      aggressorPlan,
      defenderPlan,
      battle.traitorCalled ? battle.traitorCalledBy : null,
      traitorTarget
    );

    // Apply battle results
    newState = this.applyBattleResult(newState, battle, result, events);

    // Remove this battle from pending
    this.context.pendingBattles = this.context.pendingBattles.filter(
      (b) =>
        !(
          b.territoryId === battle.territoryId &&
          b.sector === battle.sector &&
          b.factions.includes(battle.aggressor) &&
          b.factions.includes(battle.defender)
        )
    );

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
        type: 'LASGUN_SHIELD_EXPLOSION',
        data: { territory: battle.territoryId, sector: battle.sector },
        message: 'Lasgun-Shield explosion! All forces in territory destroyed!',
      });

      // Kill all forces in territory
      for (const faction of [battle.aggressor, battle.defender]) {
        const factionState = getFactionState(newState, faction);
        const forces = factionState.forces.onBoard.find(
          (f) =>
            f.territoryId === battle.territoryId && f.sector === battle.sector
        );
        if (forces) {
          const total = forces.forces.regular + forces.forces.elite;
          newState = sendForcesToTanks(
            newState,
            faction,
            battle.territoryId,
            battle.sector,
            total
          );
        }
      }

      // Kill both leaders
      if (battle.aggressorPlan?.leaderId) {
        newState = killLeader(newState, battle.aggressor, battle.aggressorPlan.leaderId);
      }
      if (battle.defenderPlan?.leaderId) {
        newState = killLeader(newState, battle.defender, battle.defenderPlan.leaderId);
      }

      return newState;
    }

    // Normal battle resolution
    events.push({
      type: 'BATTLE_RESOLVED',
      data: {
        winner: result.winner,
        loser: result.loser,
        winnerTotal: result.winnerTotal,
        loserTotal: result.loserTotal,
        traitorRevealed: result.traitorRevealed,
      },
      message: `${result.winner} wins the battle (${result.winnerTotal} vs ${result.loserTotal})`,
    });

    // Loser loses all forces
    const loser = result.loser;
    const loserForces = getFactionState(newState, loser).forces.onBoard.find(
      (f) => f.territoryId === battle.territoryId && f.sector === battle.sector
    );
    if (loserForces) {
      const total = loserForces.forces.regular + loserForces.forces.elite;
      newState = sendForcesToTanks(
        newState,
        loser,
        battle.territoryId,
        battle.sector,
        total
      );
    }

    // Loser's leader dies (if used)
    const loserPlan =
      loser === battle.aggressor ? battle.aggressorPlan : battle.defenderPlan;
    if (loserPlan?.leaderId) {
      newState = killLeader(newState, loser, loserPlan.leaderId);
      events.push({
        type: 'LEADER_KILLED',
        data: { faction: loser, leaderId: loserPlan.leaderId },
        message: `${loser}'s leader killed in battle`,
      });
    }

    // Winner loses forces equal to opponent's strength minus defense
    const winner = result.winner;
    const winnerLosses = Math.max(0, result.loserTotal);
    if (winnerLosses > 0) {
      const winnerForces = getFactionState(newState, winner).forces.onBoard.find(
        (f) =>
          f.territoryId === battle.territoryId && f.sector === battle.sector
      );
      if (winnerForces) {
        const actualLosses = Math.min(
          winnerLosses,
          winnerForces.forces.regular + winnerForces.forces.elite
        );
        newState = sendForcesToTanks(
          newState,
          winner,
          battle.territoryId,
          battle.sector,
          actualLosses
        );
      }
    }

    // Mark leaders as used
    const winnerPlan =
      winner === battle.aggressor ? battle.aggressorPlan : battle.defenderPlan;
    if (winnerPlan?.leaderId) {
      newState = markLeaderUsed(
        newState,
        winner,
        winnerPlan.leaderId,
        battle.territoryId
      );
    }

    newState = logAction(newState, 'BATTLE_RESOLVED', null, {
      territory: battle.territoryId,
      sector: battle.sector,
      aggressor: battle.aggressor,
      defender: battle.defender,
      winner: result.winner,
      loser: result.loser,
    });

    return newState;
  }

  private endBattlePhase(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    events.push({
      type: 'PHASE_ENDED',
      data: { phase: Phase.BATTLE },
      message: 'Battle phase ended',
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

  private createDefaultPlan(faction: Faction): BattlePlan {
    return {
      factionId: faction,
      leaderId: null,
      forcesDialed: 0,
      spiceDialed: 0,
      weaponCardId: null,
      defenseCardId: null,
      kwisatzHaderachUsed: false,
      cheapHeroUsed: false,
    };
  }

  private sanitizePlanForLog(plan: BattlePlan | null): Record<string, unknown> {
    if (!plan) return { empty: true };
    return {
      leader: plan.leaderId,
      forces: plan.forcesDialed,
      spice: plan.spiceDialed,
      weapon: plan.weaponCardId ? '***' : null,
      defense: plan.defenseCardId ? '***' : null,
    };
  }
}
