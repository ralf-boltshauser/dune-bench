/**
 * Mentat Pause Phase Handler
 *
 * Phase 1.09: Mentat Pause
 * - Players collect bribes from the turn
 * - Victory conditions are checked
 * - Special victories (Fremen, Guild, BG prediction) evaluated
 * - If no winner, game proceeds to next turn
 */

import {
  Faction,
  Phase,
  type GameState,
} from '../../types';
import {
  addSpice,
  getFactionState,
  logAction,
} from '../../state';
import { checkVictoryConditions } from '../../rules';
import {
  type PhaseHandler,
  type PhaseStepResult,
  type PhaseEvent,
  type AgentResponse,
} from '../types';

// =============================================================================
// MENTAT PAUSE PHASE HANDLER
// =============================================================================

export class MentatPausePhaseHandler implements PhaseHandler {
  readonly phase = Phase.MENTAT_PAUSE;

  initialize(state: GameState): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;
    // Note: PhaseManager emits PHASE_STARTED event, so we don't emit it here

    // Collect bribes (spice placed in front of shield during the turn)
    for (const [faction, factionState] of state.factions) {
      if (factionState.spiceBribes > 0) {
        newState = this.collectBribes(newState, faction, events);
      }
    }

    // Check victory conditions (uses correct implementation from rules/victory.ts)
    const victoryResult = checkVictoryConditions(newState);

    if (victoryResult) {
      newState = {
        ...newState,
        winner: victoryResult,
      };

      events.push({
        type: 'VICTORY_ACHIEVED',
        data: { ...victoryResult } as Record<string, unknown>,
        message: `Victory! ${victoryResult.winners.join(' & ')} win by ${victoryResult.condition}`,
      });

      newState = logAction(newState, 'VICTORY_CHECK', null, {
        winner: victoryResult.winners,
        condition: victoryResult.condition,
      });

      return {
        state: newState,
        phaseComplete: true,
        pendingRequests: [],
        actions: [],
        events,
      };
    }

    // Note: checkVictoryConditions already handles endgame (Fremen special, Guild special, default)
    // So if we reach here with no victory and it's the last turn, the game just ends
    if (state.turn >= state.config.maxTurns && !victoryResult) {
      events.push({
        type: 'GAME_ENDED',
        data: { noWinner: true },
        message: 'Game Over! No winner.',
      });
    }

    // No winner yet, proceed to next turn
    events.push({
      type: 'TURN_ENDED',
      data: { turn: state.turn, nextTurn: state.turn + 1 },
      message: `Turn ${state.turn} complete. Proceeding to turn ${state.turn + 1}`,
    });

    return {
      state: newState,
      phaseComplete: true,
      pendingRequests: [],
      actions: [],
      events,
    };
  }

  processStep(state: GameState, _responses: AgentResponse[]): PhaseStepResult {
    // Mentat Pause doesn't require agent input
    return {
      state,
      phaseComplete: true,
      pendingRequests: [],
      actions: [],
      events: [],
    };
  }

  cleanup(state: GameState): GameState {
    // Reset turn-specific state
    return {
      ...state,
      nexusOccurring: false,
    };
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Collect spice bribes for a faction.
   * Bribes are spice placed in front of the shield during the turn.
   */
  private collectBribes(
    state: GameState,
    faction: Faction,
    events: PhaseEvent[]
  ): GameState {
    const factionState = getFactionState(state, faction);
    const bribes = factionState.spiceBribes;

    if (bribes === 0) return state;

    // Add bribes to main spice pool
    let newState = addSpice(state, faction, bribes);

    // Reset bribes
    const newFactions = new Map(newState.factions);
    const updatedFactionState = { ...newFactions.get(faction)!, spiceBribes: 0 };
    newFactions.set(faction, updatedFactionState);
    newState = { ...newState, factions: newFactions };

    events.push({
      type: 'BRIBE_COLLECTED',
      data: { faction, amount: bribes },
      message: `${faction} collects ${bribes} spice in bribes`,
    });

    newState = logAction(newState, 'BRIBE_COLLECTED', faction, { amount: bribes });

    return newState;
  }
}
