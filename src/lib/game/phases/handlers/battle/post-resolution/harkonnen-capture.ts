/**
 * Harkonnen Capture
 *
 * Handles Harkonnen's choice to kill or capture a leader after winning a battle.
 */

import { Faction, BattleSubPhase } from "../../../../types";
import { getLeaderDefinition } from "../../../../data";
import { captureLeader, killCapturedLeader } from "../../../../state";
import { updatePendingBattlesAfterBattle } from "../pending-battles";
import type { GameState } from "../../../../types";
import type {
  AgentRequest,
  AgentResponse,
  BattlePhaseContext,
  PhaseEvent,
  PhaseStepResult,
} from "../../../types";

/**
 * Request Harkonnen's choice to kill or capture a leader.
 */
export function requestCaptureChoice(
  context: BattlePhaseContext,
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
export function processHarkonnenCapture(
  context: BattlePhaseContext,
  state: GameState,
  responses: AgentResponse[],
  events: PhaseEvent[],
  callbacks: {
    endBattlePhase: (
      state: GameState,
      events: PhaseEvent[]
    ) => PhaseStepResult;
    requestBattleChoice: (
      state: GameState,
      events: PhaseEvent[]
    ) => PhaseStepResult;
  }
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
      // @rule 2.05.10.02 - KILL: Place face-down in tanks, Harkonnen gains 2 spice
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
      // @rule 2.05.10.03 - CAPTURE: Add to Harkonnen's leader pool
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
  const battle = context.currentBattle!;
  context.pendingBattles = updatePendingBattlesAfterBattle(
    context.pendingBattles,
    newState,
    battle.territoryId,
    battle.sector
  );

  // Check for more battles
  context.currentBattle = null;
  context.subPhase = BattleSubPhase.AGGRESSOR_CHOOSING;

  if (context.pendingBattles.length === 0) {
    return callbacks.endBattlePhase(newState, events);
  }

  return callbacks.requestBattleChoice(newState, events);
}

