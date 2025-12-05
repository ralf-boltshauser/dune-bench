/**
 * Traitor Call Sub-Phase
 *
 * Handles traitor card calls, including TWO TRAITORS scenario and Harkonnen Alliance Traitor.
 */

import { Faction, BattleSubPhase } from "../../../../types";
import { getAlly, getFactionState, removeTraitorCard } from "../../../../state";
import type { GameState } from "../../../../types";
import type {
  AgentRequest,
  AgentResponse,
  BattlePhaseContext,
  PhaseEvent,
  PhaseStepResult,
} from "../../../types";

/**
 * Request traitor call from factions that have traitor opportunities.
 */
/**
 * @rule 1.07.06.07 - TRAITORS: When you are in a battle and your opponent uses a leader that matches a Traitor Card in your hand, you may call out "Traitor!" and pause the game. This can be done against any Active Leader your opponent has, even when that leader was not one of their Active Leaders at the start of the game.
 */
export function requestTraitorCall(
  context: BattlePhaseContext,
  state: GameState,
  events: PhaseEvent[],
  callbacks: {
    processResolution: (
      state: GameState,
      events: PhaseEvent[]
    ) => PhaseStepResult;
  }
): PhaseStepResult {
  const battle = context.currentBattle!;
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
    // @rule 2.05.13 - NO LOYALTY: A captured leader used in battle may be called traitor
    // The traitor check uses leaderId which is the leader's definitionId (original identity),
    // not current ownership. This means captured leaders can be called as traitors by anyone
    // holding their matching traitor card.
    const opponentLeader = opponentPlan?.leaderId;
    const hasTraitor =
      opponentLeader &&
      factionState.traitors.some((t) => t.leaderId === opponentLeader);

    if (hasTraitor) {
      // @rule 2.01.12 ATREIDES LOYALTY: A leader accompanied by Kwisatz Haderach cannot turn traitor
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

  // @rule 2.05.09 - ALLIANCE: Harkonnen can use traitors on behalf of their ally
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
    context.subPhase = BattleSubPhase.BATTLE_RESOLUTION;
    return callbacks.processResolution(state, events);
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

/**
 * Process traitor call responses.
 */
export function processTraitor(
  context: BattlePhaseContext,
  state: GameState,
  responses: AgentResponse[],
  events: PhaseEvent[],
  callbacks: {
    processResolution: (
      state: GameState,
      events: PhaseEvent[]
    ) => PhaseStepResult;
  }
): PhaseStepResult {
  const battle = context.currentBattle!;
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
    context.currentBattle!.traitorCalled = true;
    context.currentBattle!.traitorCalledBy = null; // Both called, so null
    context.currentBattle!.traitorCallsByBothSides = true;

    events.push({
      type: "TWO_TRAITORS",
      data: {
        callers: traitorCallers,
      },
      message: "TWO TRAITORS! Both leaders are traitors for each other.",
    });
  } else if (traitorCallers.length === 1) {
    // Single traitor call - normal traitor resolution
    context.currentBattle!.traitorCalled = true;
    const caller = traitorCallers[0];
    const callerContext = callerContexts.get(caller);

    // HARKONNEN ALLIANCE TRAITOR: If Harkonnen is calling traitor for their ally,
    // the ally is treated as the winner (not Harkonnen)
    if (callerContext?.callingForAlly && callerContext.ally) {
      // Set the ally as the winner (traitorCalledBy = winner in resolveTraitorBattle)
      context.currentBattle!.traitorCalledBy = callerContext.ally;
    } else {
      context.currentBattle!.traitorCalledBy = caller;
    }
  }

  // Resolve battle
  context.subPhase = BattleSubPhase.BATTLE_RESOLUTION;
  return callbacks.processResolution(newState, events);
}

