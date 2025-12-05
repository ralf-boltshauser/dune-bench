/**
 * Voice Sub-Phase (Bene Gesserit)
 * @rule 2.02.06
 *
 * Handles Bene Gesserit Voice ability to command opponent's battle plan.
 */

import { Faction, BattleSubPhase } from "../../../../types";
import { getAlly } from "../../../../state";
import type { GameState } from "../../../../types";
import type {
  AgentRequest,
  AgentResponse,
  BattlePhaseContext,
  PhaseEvent,
  PhaseStepResult,
} from "../../../types";

/**
 * Request Voice from Bene Gesserit.
 */
export function requestVoice(
  context: BattlePhaseContext,
  state: GameState,
  events: PhaseEvent[],
  voiceTarget: Faction
): PhaseStepResult {
  const battle = context.currentBattle!;
  const bgInBattle =
    battle.aggressor === Faction.BENE_GESSERIT ||
    battle.defender === Faction.BENE_GESSERIT;
  const bgAlly = getAlly(state, Faction.BENE_GESSERIT);
  const isAllyBattle =
    bgAlly && (battle.aggressor === bgAlly || battle.defender === bgAlly);

  let promptMessage = `Use Voice to command ${voiceTarget}?`;
  // @rule 2.02.07 ALLIANCE: In your ally's battle you may use ability Voice on your ally's opponent
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

/**
 * Process Voice response from Bene Gesserit.
 */
export function processVoice(
  context: BattlePhaseContext,
  state: GameState,
  responses: AgentResponse[],
  events: PhaseEvent[],
  callbacks: {
    requestPrescience: (
      state: GameState,
      events: PhaseEvent[],
      prescienceTarget: Faction
    ) => PhaseStepResult;
    requestBattlePlans: (
      state: GameState,
      events: PhaseEvent[]
    ) => PhaseStepResult;
  }
): PhaseStepResult {
  const response = responses.find(
    (r) => r.factionId === Faction.BENE_GESSERIT
  );

  if (response && !response.passed && response.actionType === "USE_VOICE") {
    context.currentBattle!.voiceUsed = true;
    context.currentBattle!.voiceCommand = response.data.command as {
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
    const battle = context.currentBattle!;
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

      context.subPhase = BattleSubPhase.PRESCIENCE_OPPORTUNITY;
      return callbacks.requestPrescience(state, events, prescienceTarget);
    }
  }

  // No prescience - move to battle plans
  context.subPhase = BattleSubPhase.CREATING_BATTLE_PLANS;
  return callbacks.requestBattlePlans(state, events);
}

