/**
 * Reveal Sub-Phase
 *
 * Handles battle plan reveal and Voice compliance validation.
 */

import { Faction, BattleSubPhase, type BattlePlan } from "../../../../types";
import { getAlly, getFactionState } from "../../../../state";
import { validateVoiceCompliance } from "../../../../rules";
import type { GameState } from "../../../../types";
import type {
  BattlePhaseContext,
  PhaseEvent,
  PhaseStepResult,
} from "../../../types";

/**
 * Process battle plan reveal.
 *
 * @rule 1.07.05 - REVEALING WHEELS: When both players are ready, the Battle Plans are Revealed simultaneously.
 */
export function processReveal(
  context: BattlePhaseContext,
  state: GameState,
  events: PhaseEvent[],
  callbacks: {
    requestTraitorCall: (
      state: GameState,
      events: PhaseEvent[]
    ) => PhaseStepResult;
  }
): PhaseStepResult {
  // Plans are revealed simultaneously
  const battle = context.currentBattle!;

  // Emit full battle plans (no redaction - battle is resolved, plans are public)
  events.push({
    type: "BATTLE_PLAN_SUBMITTED",
    data: {
      aggressor: battle.aggressor,
      aggressorPlan: battle.aggressorPlan,
      defender: battle.defender,
      defenderPlan: battle.defenderPlan,
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
  context.subPhase = BattleSubPhase.TRAITOR_CALL;
  return callbacks.requestTraitorCall(state, events);
}

