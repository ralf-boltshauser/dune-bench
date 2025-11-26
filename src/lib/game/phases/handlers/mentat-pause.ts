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
  WinCondition,
  TerritoryType,
  type GameState,
  type WinResult,
  TERRITORY_DEFINITIONS,
} from '../../types';
import {
  addSpice,
  getFactionState,
  logAction,
} from '../../state';
import { getVictoryContext } from '../../rules';
import { GAME_CONSTANTS } from '../../data';
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

    // Check victory conditions
    const victoryResult = this.checkVictoryConditions(newState, events);

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

    // Check if this is the last turn
    if (state.turn >= state.config.maxTurns) {
      // Game ends - check for special endgame victories
      const endgameResult = this.checkEndgameVictory(newState, events);

      newState = {
        ...newState,
        winner: endgameResult,
      };

      events.push({
        type: 'GAME_ENDED',
        data: endgameResult ? { ...endgameResult } as Record<string, unknown> : { noWinner: true },
        message: endgameResult
          ? `Game Over! ${endgameResult.winners.join(' & ')} win!`
          : 'Game Over! No winner.',
      });

      return {
        state: newState,
        phaseComplete: true,
        pendingRequests: [],
        actions: [],
        events,
      };
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

  private checkVictoryConditions(
    state: GameState,
    events: PhaseEvent[]
  ): WinResult | null {
    // Check standard victory (stronghold control)
    const standardVictory = this.checkStandardVictory(state);
    if (standardVictory) {
      return standardVictory;
    }

    // Check special victories
    // Fremen special (if Guild is in game and certain conditions)
    const fremenSpecial = this.checkFremenSpecialVictory(state);
    if (fremenSpecial) {
      return fremenSpecial;
    }

    // Guild special (game goes to last turn)
    // Checked in endgame

    return null;
  }

  private checkStandardVictory(state: GameState): WinResult | null {
    // Find strongholds
    const strongholds = Object.entries(TERRITORY_DEFINITIONS)
      .filter(([_, t]) => t.type === TerritoryType.STRONGHOLD)
      .map(([id]) => id);

    // First, determine which faction/alliance SOLELY controls each stronghold
    // A stronghold is only controlled if ONE faction (or allied pair) has forces there
    // If multiple non-allied factions have forces, NO ONE controls it
    const strongholdController = new Map<string, string>(); // strongholdId -> controlling key

    for (const strongholdId of strongholds) {
      // Find all factions with forces in this stronghold
      const factionsPresent: Faction[] = [];
      for (const [faction, factionState] of state.factions) {
        const hasForces = factionState.forces.onBoard.some(
          (f) => f.territoryId === strongholdId
        );
        if (hasForces) {
          factionsPresent.push(faction);
        }
      }

      if (factionsPresent.length === 0) {
        continue; // No one controls this stronghold
      }

      // Group by alliance - factions in the same alliance count as one
      const allianceGroups = this.groupByAlliance(state, factionsPresent);

      if (allianceGroups.length === 1) {
        // Only one faction/alliance has forces here - they control it
        const controllerKey = allianceGroups[0];
        strongholdController.set(strongholdId, controllerKey);
      }
      // If multiple non-allied groups have forces, no one controls it
    }

    // Count strongholds controlled by each faction/alliance
    const strongholdControl = new Map<string, string[]>();
    for (const [strongholdId, controllerKey] of strongholdController) {
      const controlled = strongholdControl.get(controllerKey) ?? [];
      controlled.push(strongholdId);
      strongholdControl.set(controllerKey, controlled);
    }

    // Check for victory (3 strongholds for solo, 4 for alliance)
    for (const [key, controlled] of strongholdControl) {
      const factions = key.split('-') as Faction[];
      const isAlliance = factions.length === 2;
      const threshold = isAlliance
        ? GAME_CONSTANTS.ALLIED_STRONGHOLDS_FOR_WIN
        : GAME_CONSTANTS.STRONGHOLDS_FOR_WIN;

      if (controlled.length >= threshold) {
        return {
          condition: WinCondition.STRONGHOLD_VICTORY,
          winners: factions,
          turn: state.turn,
          details: `Controls ${controlled.length} strongholds: ${controlled.join(', ')}`,
        };
      }
    }

    return null;
  }

  /**
   * Group factions by their alliance.
   * Returns an array of "keys" where allied factions share a key.
   */
  private groupByAlliance(state: GameState, factions: Faction[]): string[] {
    const seen = new Set<Faction>();
    const groups: string[] = [];

    for (const faction of factions) {
      if (seen.has(faction)) continue;
      seen.add(faction);

      const factionState = getFactionState(state, faction);
      const ally = factionState.allyId;

      if (ally && factions.includes(ally)) {
        // Both allies are present - create combined key
        const key = [faction, ally].sort().join('-');
        seen.add(ally);
        groups.push(key);
      } else {
        // Solo faction
        groups.push(faction);
      }
    }

    return groups;
  }

  private checkFremenSpecialVictory(state: GameState): WinResult | null {
    // Fremen special victory: If Guild is in game and no one has won by turn 10,
    // Fremen wins if they control Sietch Tabr, Habbanya Sietch, and Tuek's Sietch
    if (!state.factions.has(Faction.FREMEN)) return null;
    if (!state.factions.has(Faction.SPACING_GUILD)) return null;

    // Only at end of game
    if (state.turn < state.config.maxTurns) return null;

    const fremenState = getFactionState(state, Faction.FREMEN);
    const requiredSietches = ['SIETCH_TABR', 'HABBANYA_SIETCH', 'TUEKS_SIETCH'];

    const controlledSietches = requiredSietches.filter((sietch) =>
      fremenState.forces.onBoard.some((f) => f.territoryId === sietch)
    );

    if (controlledSietches.length === requiredSietches.length) {
      return {
        condition: WinCondition.FREMEN_SPECIAL,
        winners: [Faction.FREMEN],
        turn: state.turn,
        details: 'Fremen controls all sietches when Guild is in game',
      };
    }

    return null;
  }

  private checkEndgameVictory(state: GameState, events: PhaseEvent[]): WinResult | null {
    // Check Fremen special first
    const fremenSpecial = this.checkFremenSpecialVictory(state);
    if (fremenSpecial) return fremenSpecial;

    // Check Guild special victory (coexistence with other factions)
    if (state.factions.has(Faction.SPACING_GUILD)) {
      // Guild wins if they have forces on Dune and no one else won
      const guildState = getFactionState(state, Faction.SPACING_GUILD);
      if (guildState.forces.onBoard.length > 0) {
        return {
          condition: WinCondition.GUILD_SPECIAL,
          winners: [Faction.SPACING_GUILD],
          turn: state.turn,
          details: 'Guild maintains presence on Dune when no one else wins',
        };
      }
    }

    // Check Bene Gesserit prediction
    if (state.factions.has(Faction.BENE_GESSERIT)) {
      const bgState = getFactionState(state, Faction.BENE_GESSERIT);
      if (bgState.beneGesseritPrediction) {
        const prediction = bgState.beneGesseritPrediction;

        // Check if predicted faction won on predicted turn
        // This is complex - for now, simplified check
        events.push({
          type: 'BG_PREDICTION_REVEALED',
          data: {
            bgPrediction: prediction,
            revealed: true,
          },
          message: `Bene Gesserit prediction: ${prediction.faction} on turn ${prediction.turn}`,
        });
      }
    }

    // Default: Most strongholds wins, or most spice as tiebreaker
    return this.determineEndgameWinner(state);
  }

  private determineEndgameWinner(state: GameState): WinResult | null {
    // Find all strongholds
    const strongholds = Object.entries(TERRITORY_DEFINITIONS)
      .filter(([_, t]) => t.type === TerritoryType.STRONGHOLD)
      .map(([id]) => id);

    // Determine SOLE control of each stronghold (contested strongholds don't count)
    const strongholdController = new Map<string, string>(); // strongholdId -> controller key

    for (const strongholdId of strongholds) {
      const factionsPresent: Faction[] = [];
      for (const [faction, factionState] of state.factions) {
        const hasForces = factionState.forces.onBoard.some(
          (f) => f.territoryId === strongholdId
        );
        if (hasForces) {
          factionsPresent.push(faction);
        }
      }

      if (factionsPresent.length === 0) {
        continue;
      }

      const allianceGroups = this.groupByAlliance(state, factionsPresent);
      if (allianceGroups.length === 1) {
        strongholdController.set(strongholdId, allianceGroups[0]);
      }
    }

    // Count strongholds per faction/alliance
    const controlCounts = new Map<string, number>();
    for (const controllerKey of strongholdController.values()) {
      controlCounts.set(controllerKey, (controlCounts.get(controllerKey) ?? 0) + 1);
    }

    // Find max strongholds
    let maxStrongholds = 0;
    for (const count of controlCounts.values()) {
      if (count > maxStrongholds) maxStrongholds = count;
    }

    if (maxStrongholds === 0) {
      // No one controls any strongholds
      return null;
    }

    // Find factions with max strongholds
    const leaders = Array.from(controlCounts.entries())
      .filter(([_, count]) => count === maxStrongholds)
      .map(([key]) => key.split('-') as Faction[]);

    if (leaders.length === 1) {
      return {
        condition: WinCondition.STRONGHOLD_VICTORY,
        winners: leaders[0],
        turn: state.turn,
        details: `Most strongholds (${maxStrongholds}) at game end`,
      };
    }

    // Tiebreaker: Most spice (sum for alliances)
    let maxSpice = 0;
    let spiceWinner: Faction[] | null = null;

    for (const factionGroup of leaders) {
      let totalSpice = 0;
      for (const faction of factionGroup) {
        totalSpice += getFactionState(state, faction).spice;
      }
      if (totalSpice > maxSpice) {
        maxSpice = totalSpice;
        spiceWinner = factionGroup;
      }
    }

    if (spiceWinner) {
      return {
        condition: WinCondition.STRONGHOLD_VICTORY,
        winners: spiceWinner,
        turn: state.turn,
        details: `Tied for strongholds (${maxStrongholds}), won by spice (${maxSpice})`,
      };
    }

    // Still tied - return first in storm order
    const firstInOrder = state.stormOrder.find((f) =>
      leaders.some((group) => group.includes(f))
    );
    if (firstInOrder) {
      const winningGroup = leaders.find((group) => group.includes(firstInOrder));
      return {
        condition: WinCondition.STRONGHOLD_VICTORY,
        winners: winningGroup ?? [firstInOrder],
        turn: state.turn,
        details: `Tied for strongholds and spice, won by storm order`,
      };
    }

    return null;
  }
}
