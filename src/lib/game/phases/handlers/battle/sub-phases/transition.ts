/**
 * Battle Sub-Phase Transition
 *
 * Determines the sequence of sub-phases after a battle is set up.
 * Sequence: Voice -> Prescience -> Battle Plans -> Reveal
 */

import { Faction, BattleSubPhase } from "../../../../types";
import { getAlly } from "../../../../state";
import type { GameState } from "../../../../types";
import type { BattlePhaseContext, PhaseEvent, PhaseStepResult } from "../../../types";

/**
 * Transition to the appropriate battle sub-phase after a battle is set up.
 */
export function transitionToBattleSubPhases(
  context: BattlePhaseContext,
  state: GameState,
  events: PhaseEvent[],
  callbacks: {
    requestVoice: (
      state: GameState,
      events: PhaseEvent[],
      voiceTarget: Faction
    ) => PhaseStepResult;
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
  const battle = context.currentBattle!;
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

      context.subPhase = BattleSubPhase.VOICE_OPPORTUNITY;
      return callbacks.requestVoice(state, events, voiceTarget);
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

      context.subPhase = BattleSubPhase.PRESCIENCE_OPPORTUNITY;
      return callbacks.requestPrescience(state, events, prescienceTarget);
    }
  }

  // Step 3: Battle plans (AFTER Voice and Prescience)
  context.subPhase = BattleSubPhase.CREATING_BATTLE_PLANS;
  return callbacks.requestBattlePlans(state, events);
}

