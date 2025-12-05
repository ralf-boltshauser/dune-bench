/**
 * Aggressor Selection Module
 *
 * Handles aggressor selection and battle choice according to rules:
 * - "FIRST PLAYER: When resolving battles, the First Player is named the Aggressor
 *   until all their battles, if any, have been fought."
 * - Aggressors MUST fight all their battles - battles cannot be skipped
 */

import { setActiveFactions } from "../../../state";
import {
  Faction,
  FACTION_NAMES,
  TerritoryId,
  type GameState,
} from "../../../types";
import {
  type AgentRequest,
  type AgentResponse,
  type BattlePhaseContext,
  type PhaseEvent,
  type PhaseStepResult,
} from "../../types";
import { isBattleCapable, createBattleContext } from "./utils";

/**
 * Request battle choice from the current aggressor.
 * Returns a PhaseStepResult with a request to choose a battle, or forces resolution if needed.
 *
 * @rule 1.07.02 - FIRST PLAYER: When resolving battles, the First Player is named the Aggressor until all their battles, if any, have been fought. The Aggressor chooses the order in which they wish to fight their battles. Then the player next in Storm Order becomes the Aggressor and so on, until all battles are resolved.
 * @rule 1.07.03 - MULTIPLE BATTLES: When there are three or more players in the same Territory, the Aggressor picks who they will battle first, second, etc. for as long as they have Forces in that Territory.
 */
export function requestBattleChoice(
  context: BattlePhaseContext,
  state: GameState,
  events: PhaseEvent[],
  endBattlePhase: (state: GameState, events: PhaseEvent[]) => PhaseStepResult,
  processReveal: (state: GameState, events: PhaseEvent[]) => PhaseStepResult,
  processResolution: (
    state: GameState,
    events: PhaseEvent[]
  ) => PhaseStepResult,
  requestBattlePlans: (
    state: GameState,
    events: PhaseEvent[]
  ) => PhaseStepResult
): PhaseStepResult {
  // If there are no pending battles, end the phase
  if (context.pendingBattles.length === 0) {
    return endBattlePhase(state, events);
  }

  // Find next aggressor in storm order who has pending battles
  while (context.currentAggressorIndex < context.aggressorOrder.length) {
    const aggressor = context.aggressorOrder[context.currentAggressorIndex];

    const availableBattles = context.pendingBattles.filter((b) => {
      if (!b.factions.includes(aggressor)) return false;

      // Only include battles where aggressor has battle-capable forces
      return isBattleCapable(state, aggressor, b.territoryId, b.sector);
    });

    if (availableBattles.length > 0) {
      const pendingRequests: AgentRequest[] = [
        {
          factionId: aggressor,
          requestType: "CHOOSE_BATTLE",
          prompt: `You are the aggressor. You must fight all your battles. Choose which battle to fight first.`,
          context: {
            availableBattles: availableBattles.map((b) => ({
              territory: b.territoryId,
              sector: b.sector,
              enemies: b.factions.filter((f) => f !== aggressor),
            })),
          },
          availableActions: ["CHOOSE_BATTLE"],
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

    context.currentAggressorIndex++;
  }

  // All aggressors exhausted but battles still pending - this shouldn't happen
  // Force resolve the first pending battle with default plans
  if (context.pendingBattles.length > 0) {
    console.error(
      `[BattlePhase] All aggressors exhausted but ${context.pendingBattles.length} battles still pending. ` +
        `This indicates a bug - forcing resolution of first battle.`
    );

    return forceResolveBattle(
      context,
      state,
      events,
      processReveal,
      processResolution,
      requestBattlePlans
    );
  }

  // No more battles
  return endBattlePhase(state, events);
}

/**
 * Process battle choice response from aggressor.
 * CRITICAL: If aggressor doesn't respond or passes, we MUST force the battle to proceed.
 * Battles cannot be skipped according to rules.
 */
export function processChooseBattle(
  context: BattlePhaseContext,
  state: GameState,
  responses: AgentResponse[],
  events: PhaseEvent[],
  requestBattleChoice: () => PhaseStepResult,
  processReveal: (state: GameState, events: PhaseEvent[]) => PhaseStepResult,
  requestBattlePlans: (
    state: GameState,
    events: PhaseEvent[]
  ) => PhaseStepResult
): PhaseStepResult {
  const response = responses[0];

  // CRITICAL: According to rules, aggressors MUST fight all their battles
  // If they don't respond or pass, we cannot skip the battle - we must force it
  // Rule: "FIRST PLAYER: When resolving battles, the First Player is named the Aggressor
  // until all their battles, if any, have been fought."
  if (!response || response.passed) {
    // Get the current aggressor (who was asked to choose)
    const currentAggressor =
      context.aggressorOrder[context.currentAggressorIndex];

    // Find their first available battle
    const availableBattles = context.pendingBattles.filter((b) => {
      if (!b.factions.includes(currentAggressor)) return false;

      // Only include battles where aggressor has battle-capable forces
      return isBattleCapable(state, currentAggressor, b.territoryId, b.sector);
    });

    if (availableBattles.length > 0) {
      // Force resolve the first battle with default plans
      // This ensures battles are never skipped per rules
      console.warn(
        `[BattlePhase] ${FACTION_NAMES[currentAggressor]} did not respond or passed, but aggressors must fight all their battles. ` +
          `Forcing resolution of first battle with default plans.`
      );

      const firstBattle = availableBattles[0];
      const defender = firstBattle.factions.find((f) => f !== currentAggressor);

      if (!defender) {
        console.error(
          `[BattlePhase] processChooseBattle: Battle has only one faction (${currentAggressor}), this should not happen. ` +
            `Battle: ${firstBattle.territoryId} sector ${
              firstBattle.sector
            }, factions: ${firstBattle.factions.join(", ")}`
        );
        // Move to next aggressor as fallback
        context.currentAggressorIndex++;
        return requestBattleChoice();
      }

      // Set up current battle (but don't create default plans yet - ask agents first)
      context.currentBattle = createBattleContext(
        firstBattle.territoryId,
        firstBattle.sector,
        currentAggressor,
        defender
      );

      events.push({
        type: "BATTLE_STARTED",
        data: {
          territory: firstBattle.territoryId,
          sector: firstBattle.sector,
          aggressor: currentAggressor,
          defender,
        },
        message: `Battle: ${FACTION_NAMES[currentAggressor]} attacks ${FACTION_NAMES[defender]} in ${firstBattle.territoryId} (aggressor didn't respond to battle choice, proceeding to battle plans)`,
      });

      // Proceed to battle plans - ask agents for their plans
      // This will handle Voice/Prescience if needed, then request battle plans
      // If agents don't respond, default plans will be used in processBattlePlans
      return requestBattlePlans(state, events);
    } else {
      // No battles for this aggressor - move to next
      context.currentAggressorIndex++;
      return requestBattleChoice();
    }
  }

  // Valid response - set up the battle
  const territoryId = response.data.territoryId as TerritoryId;
  const sector = response.data.sector as number;
  const defender = response.data.defender as Faction;
  const aggressor = response.factionId;

  // Find this battle in pending
  const battleIndex = context.pendingBattles.findIndex(
    (b) =>
      b.territoryId === territoryId &&
      b.sector === sector &&
      b.factions.includes(aggressor) &&
      b.factions.includes(defender)
  );

  // Validate that aggressor has battle-capable forces
  if (!isBattleCapable(state, aggressor, territoryId, sector)) {
    // Invalid choice - aggressor doesn't have battle-capable forces
    console.warn(
      `[BattlePhase] ${FACTION_NAMES[aggressor]} chose battle in ${territoryId} but has no battle-capable forces. ` +
        `Forcing resolution of first available battle.`
    );

    // Find first available battle where aggressor has battle-capable forces
    const availableBattles = context.pendingBattles.filter((b) => {
      if (!b.factions.includes(aggressor)) return false;
      return isBattleCapable(state, aggressor, b.territoryId, b.sector);
    });

      if (availableBattles.length > 0) {
        const firstBattle = availableBattles[0];
        const validDefender = firstBattle.factions.find((f) => f !== aggressor);

        if (!validDefender) {
          console.error(
            `[BattlePhase] processChooseBattle: Available battle has only one faction (${aggressor}), this should not happen. ` +
              `Battle: ${firstBattle.territoryId} sector ${
                firstBattle.sector
              }, factions: ${firstBattle.factions.join(", ")}`
          );
          // Move to next aggressor as fallback
          context.currentAggressorIndex++;
          return requestBattleChoice();
        }

        context.currentBattle = createBattleContext(
          firstBattle.territoryId,
          firstBattle.sector,
          aggressor,
          validDefender
        );

        events.push({
          type: "BATTLE_STARTED",
          data: {
            territory: firstBattle.territoryId,
            sector: firstBattle.sector,
            aggressor,
            defender: validDefender,
          },
          message: `Battle: ${FACTION_NAMES[aggressor]} attacks ${FACTION_NAMES[validDefender]} in ${firstBattle.territoryId} (chosen battle had no fighters, proceeding to battle plans)`,
        });

        // Proceed to battle plans - ask agents for their plans
        const stateWithActive = setActiveFactions(state, [
          ...firstBattle.factions,
        ]);
        return requestBattlePlans(stateWithActive, events);
      } else {
        // No battles with fighters - move to next aggressor
        context.currentAggressorIndex++;
        return requestBattleChoice();
      }
    }

  if (battleIndex === -1) {
    // Invalid battle choice - try to force resolve instead of moving to next aggressor
    console.warn(
      `[BattlePhase] ${FACTION_NAMES[aggressor]} chose invalid battle. Forcing resolution of first available battle.`
    );

    const availableBattles = context.pendingBattles.filter((b) => {
      if (!b.factions.includes(aggressor)) return false;

      // Only include battles where aggressor has battle-capable forces
      return isBattleCapable(state, aggressor, b.territoryId, b.sector);
    });

    if (availableBattles.length > 0) {
      const firstBattle = availableBattles[0];
      const validDefender = firstBattle.factions.find((f) => f !== aggressor);

      if (!validDefender) {
        console.error(
          `[BattlePhase] processChooseBattle: Invalid battle choice - battle has only one faction (${aggressor}), this should not happen. ` +
            `Battle: ${firstBattle.territoryId} sector ${
              firstBattle.sector
            }, factions: ${firstBattle.factions.join(", ")}`
        );
        // Move to next aggressor as fallback
        context.currentAggressorIndex++;
        return requestBattleChoice();
      }

      context.currentBattle = createBattleContext(
        firstBattle.territoryId,
        firstBattle.sector,
        aggressor,
        validDefender
      );

      events.push({
        type: "BATTLE_STARTED",
        data: {
          territory: firstBattle.territoryId,
          sector: firstBattle.sector,
          aggressor,
          defender: validDefender,
        },
        message: `Battle: ${FACTION_NAMES[aggressor]} attacks ${FACTION_NAMES[validDefender]} in ${firstBattle.territoryId} (invalid choice, proceeding to battle plans)`,
      });

      // Proceed to battle plans - ask agents for their plans
      const stateWithActive = setActiveFactions(state, [
        ...firstBattle.factions,
      ]);
      return requestBattlePlans(stateWithActive, events);
    }

    // No valid battles - move to next aggressor
    context.currentAggressorIndex++;
    return requestBattleChoice();
  }

  // Set up current battle
  context.currentBattle = createBattleContext(territoryId, sector, aggressor, defender);

  events.push({
    type: "BATTLE_STARTED",
    data: {
      territory: territoryId,
      sector,
      aggressor,
      defender,
    },
    message: `Battle: ${FACTION_NAMES[aggressor]} attacks ${FACTION_NAMES[defender]} in ${territoryId}`,
  });

  // Return success - battle setup complete, ready for next sub-phase
  const pending = context.pendingBattles[battleIndex];
  const stateWithActive = setActiveFactions(state, [...pending.factions]);
  return {
    state: stateWithActive,
    phaseComplete: false,
    pendingRequests: [],
    actions: [],
    events,
  };
}

/**
 * Force resolve a battle with default plans.
 * Used when all aggressors are exhausted but battles remain.
 * This is a fallback case that shouldn't normally happen.
 */
function forceResolveBattle(
  context: BattlePhaseContext,
  state: GameState,
  events: PhaseEvent[],
  processReveal: (state: GameState, events: PhaseEvent[]) => PhaseStepResult,
  processResolution: (
    state: GameState,
    events: PhaseEvent[]
  ) => PhaseStepResult,
  requestBattlePlans: (
    state: GameState,
    events: PhaseEvent[]
  ) => PhaseStepResult
): PhaseStepResult {
  const firstBattle = context.pendingBattles[0];

  // Pick the first faction in storm order that's in this battle as aggressor
  // This respects storm order even in the fallback case
  let aggressor: Faction | undefined;
  for (const faction of context.aggressorOrder) {
    if (firstBattle.factions.includes(faction)) {
      aggressor = faction;
      break;
    }
  }

  // Fallback: if no faction in storm order is in the battle (shouldn't happen),
  // use the first faction in the battle
  if (!aggressor) {
    aggressor = firstBattle.factions[0];
  }

  // Find defender (should always exist since battles have >= 2 factions)
  const defender = firstBattle.factions.find((f) => f !== aggressor);
  if (!defender) {
    console.error(
      `[BattlePhase] forceResolveBattle: Battle has only one faction, this should not happen. ` +
        `Battle: ${firstBattle.territoryId} sector ${
          firstBattle.sector
        }, factions: ${firstBattle.factions.join(", ")}`
    );
    // This is a critical error - end the phase to prevent infinite loop
    return {
      state,
      phaseComplete: true,
      pendingRequests: [],
      actions: [],
      events: [
        ...events,
        {
          type: "BATTLE_RESOLVED",
          data: {
            winner: aggressor,
            loser: aggressor, // Invalid state
            winnerTotal: 0,
            loserTotal: 0,
            traitorRevealed: false,
          },
          message: `Battle phase error: Battle with only one faction found. Phase terminated.`,
        },
      ],
    };
  }

  // Set up current battle (but don't create default plans yet - ask agents first)
  context.currentBattle = createBattleContext(
    firstBattle.territoryId,
    firstBattle.sector,
    aggressor,
    defender
  );

  // Proceed to battle plans - ask agents for their plans
  return requestBattlePlans(state, events);
}
