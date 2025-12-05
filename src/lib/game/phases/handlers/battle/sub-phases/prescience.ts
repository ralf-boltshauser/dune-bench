/**
 * Prescience Sub-Phase (Atreides)
 *
 * Handles Atreides prescience ability to see one element of opponent's battle plan.
 *
 * @rule 2.01.08 PRESCIENCE: Before Battle Wheel, before any elements of the Battle Plan are determined,
 * you may force your opponent to Reveal your choice of one of these elements they intend to use in their
 * Battle Plan against you: the leader, the weapon, the defense, or the number dialed.
 *
 * @rule 2.01.09 ALLIANCE: In your ally's battle you may use ability Prescience [2.01.08] on your ally's opponent.
 */

import { Faction, BattleSubPhase, LeaderLocation } from "../../../../types";
import { getLeaderDefinition, getTreacheryCardDefinition } from "../../../../data";
import { getAlly, getFactionState } from "../../../../state";
import { countForcesInBattle } from "../utils";
import type { GameState } from "../../../../types";
import type {
  AgentRequest,
  AgentResponse,
  BattlePhaseContext,
  PhaseEvent,
  PhaseStepResult,
} from "../../../types";

/**
 * Request prescience from Atreides.
 */
export function requestPrescience(
  context: BattlePhaseContext,
  state: GameState,
  events: PhaseEvent[],
  prescienceTarget: Faction
): PhaseStepResult {
  const battle = context.currentBattle!;
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

/**
 * Process prescience response from Atreides.
 */
export function processPrescience(
  context: BattlePhaseContext,
  state: GameState,
  responses: AgentResponse[],
  events: PhaseEvent[],
  callbacks: {
    requestPrescienceReveal: (
      state: GameState,
      events: PhaseEvent[]
    ) => PhaseStepResult;
    requestBattlePlans: (
      state: GameState,
      events: PhaseEvent[]
    ) => PhaseStepResult;
  }
): PhaseStepResult {
  const response = responses.find((r) => r.factionId === Faction.ATREIDES);
  const battle = context.currentBattle!;

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
    context.subPhase = BattleSubPhase.PRESCIENCE_REVEAL;
    return callbacks.requestPrescienceReveal(state, events);
  }

  // Atreides passed prescience, move to battle plans
  context.subPhase = BattleSubPhase.CREATING_BATTLE_PLANS;
  return callbacks.requestBattlePlans(state, events);
}

/**
 * Request prescience reveal from opponent.
 */
export function requestPrescienceReveal(
  context: BattlePhaseContext,
  state: GameState,
  events: PhaseEvent[]
): PhaseStepResult {
  const battle = context.currentBattle!;
  const opponent = battle.prescienceOpponent!;
  const target = battle.prescienceTarget!;

  const factionState = getFactionState(state, opponent);

  // Build context based on what's being revealed
  const contextData: Record<string, unknown> = {
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
    contextData.availableLeaders = availableLeaders;
  } else if (target === "weapon" || target === "defense") {
    const availableCards = factionState.hand.map((c) => {
      const def = getTreacheryCardDefinition(c.definitionId);
      return {
        id: c.definitionId,
        name: def?.name,
        type: def?.type,
      };
    });
    contextData.availableCards = availableCards;
  } else if (target === "number") {
    // Get battle-capable forces (for BG, excludes advisors)
    const totalForces = countForcesInBattle(state, opponent, battle);
    contextData.totalForces = totalForces;
    contextData.spiceAvailable = factionState.spice;
  }

  const pendingRequests: AgentRequest[] = [
    {
      factionId: opponent,
      requestType: "REVEAL_PRESCIENCE_ELEMENT",
      prompt: `Atreides prescience: Pre-commit your ${target} for this battle.`,
      context: contextData,
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

/**
 * Process prescience reveal response from opponent.
 */
export function processPrescienceReveal(
  context: BattlePhaseContext,
  state: GameState,
  responses: AgentResponse[],
  events: PhaseEvent[],
  callbacks: {
    requestBattlePlans: (
      state: GameState,
      events: PhaseEvent[]
    ) => PhaseStepResult;
  }
): PhaseStepResult {
  const battle = context.currentBattle!;
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
  context.subPhase = BattleSubPhase.CREATING_BATTLE_PLANS;
  return callbacks.requestBattlePlans(state, events);
}

