/**
 * Victory condition checks.
 * Determines if any faction has won the game.
 */

import {
  Faction,
  TerritoryId,
  WinCondition,
  AllianceStatus,
  type GameState,
  type WinResult,
} from '../types';
import {
  getFactionState,
  getControlledStrongholds,
  getFactionsInTerritory,
  checkStrongholdVictory,
  isEarlierInStormOrder,
} from '../state';
import { GAME_CONSTANTS } from '../data';
import { FACTION_NAMES } from '../types';

// =============================================================================
// MAIN VICTORY CHECK
// =============================================================================

/**
 * Check all victory conditions and return the winner(s) if any.
 * Called during Mentat Pause phase.
 */
export function checkVictoryConditions(state: GameState): WinResult | null {
  // 1. Check Bene Gesserit prediction (takes priority)
  const bgPrediction = checkBeneGesseritPrediction(state);
  if (bgPrediction) return bgPrediction;

  // 2. Check stronghold victories (may have multiple candidates)
  const strongholdWinners = getStrongholdVictoryCandidates(state);

  if (strongholdWinners.length > 0) {
    // If multiple candidates, first in storm order wins
    const winner = resolveMultipleWinners(state, strongholdWinners);
    return winner;
  }

  // 3. Check if game has ended (last turn)
  if (state.turn >= state.config.maxTurns) {
    return checkEndGameVictory(state);
  }

  return null;
}

// =============================================================================
// STRONGHOLD VICTORY
// =============================================================================

interface StrongholdVictoryCandidate {
  factions: Faction[];
  strongholds: TerritoryId[];
  isAlliance: boolean;
}

/**
 * Get all factions/alliances that meet stronghold victory conditions.
 */
function getStrongholdVictoryCandidates(state: GameState): StrongholdVictoryCandidate[] {
  const candidates: StrongholdVictoryCandidate[] = [];
  const checkedAlliances = new Set<string>();

  for (const [faction, factionState] of state.factions) {
    // Check alliance victory
    if (factionState.allianceStatus === AllianceStatus.ALLIED && factionState.allyId) {
      const allianceKey = [faction, factionState.allyId].sort().join('-');
      if (checkedAlliances.has(allianceKey)) continue;
      checkedAlliances.add(allianceKey);

      const result = checkStrongholdVictory(state, faction);
      if (result.wins) {
        candidates.push({
          factions: [faction, factionState.allyId],
          strongholds: result.strongholds,
          isAlliance: true,
        });
      }
    } else {
      // Check solo victory
      const result = checkStrongholdVictory(state, faction);
      if (result.wins) {
        candidates.push({
          factions: [faction],
          strongholds: result.strongholds,
          isAlliance: false,
        });
      }
    }
  }

  return candidates;
}

/**
 * Resolve multiple victory candidates - first in storm order wins.
 */
function resolveMultipleWinners(
  state: GameState,
  candidates: StrongholdVictoryCandidate[]
): WinResult {
  if (candidates.length === 1) {
    const winner = candidates[0];
    return {
      condition: WinCondition.STRONGHOLD_VICTORY,
      winners: winner.factions,
      turn: state.turn,
      details: `${winner.factions.map((f) => FACTION_NAMES[f]).join(' & ')} control${winner.isAlliance ? '' : 's'} ${winner.strongholds.length} strongholds: ${winner.strongholds.join(', ')}`,
    };
  }

  // Multiple candidates - find earliest in storm order
  let earliest = candidates[0];

  for (const candidate of candidates.slice(1)) {
    const earliestFaction = earliest.factions[0];
    const candidateFaction = candidate.factions[0];

    if (isEarlierInStormOrder(state, candidateFaction, earliestFaction)) {
      earliest = candidate;
    }
  }

  return {
    condition: WinCondition.STRONGHOLD_VICTORY,
    winners: earliest.factions,
    turn: state.turn,
    details: `${earliest.factions.map((f) => FACTION_NAMES[f]).join(' & ')} win (first in storm order among ${candidates.length} candidates)`,
  };
}

// =============================================================================
// BENE GESSERIT PREDICTION
// =============================================================================

/**
 * Check if Bene Gesserit prediction is fulfilled.
 * BG wins alone if they correctly predicted which faction wins on which turn.
 */
function checkBeneGesseritPrediction(state: GameState): WinResult | null {
  const bgState = state.factions.get(Faction.BENE_GESSERIT);
  if (!bgState || !bgState.beneGesseritPrediction) return null;

  const prediction = bgState.beneGesseritPrediction;

  // Check if this is the predicted turn
  if (prediction.turn !== state.turn) return null;

  // Check if the predicted faction wins this turn (via stronghold)
  const predictedResult = checkStrongholdVictory(state, prediction.faction);
  if (!predictedResult.wins) return null;

  // BG prediction fulfilled - BG wins alone!
  return {
    condition: WinCondition.BENE_GESSERIT_PREDICTION,
    winners: [Faction.BENE_GESSERIT],
    turn: state.turn,
    details: `Bene Gesserit correctly predicted ${FACTION_NAMES[prediction.faction]} would achieve victory on turn ${prediction.turn}`,
  };
}

// =============================================================================
// SPECIAL VICTORY CONDITIONS
// =============================================================================

/**
 * Check Fremen special victory condition.
 * Fremen win if Guild is in game, no one else wins, and:
 * - Only Fremen (or no one) occupies Sietch Tabr and Habbanya Sietch
 * - Neither Harkonnen, Atreides, nor Emperor occupies Tuek's Sietch
 */
export function checkFremenSpecialVictory(state: GameState): WinResult | null {
  // Only applies if Guild is in game
  if (!state.factions.has(Faction.SPACING_GUILD)) return null;
  if (!state.factions.has(Faction.FREMEN)) return null;

  const fremenState = getFactionState(state, Faction.FREMEN);

  // Check Sietch Tabr
  const sietchTabrOccupants = getFactionsInTerritory(state, TerritoryId.SIETCH_TABR);
  if (sietchTabrOccupants.length > 0 && !sietchTabrOccupants.every((f) => f === Faction.FREMEN)) {
    return null;
  }

  // Check Habbanya Sietch
  const habbanyaOccupants = getFactionsInTerritory(state, TerritoryId.HABBANYA_SIETCH);
  if (habbanyaOccupants.length > 0 && !habbanyaOccupants.every((f) => f === Faction.FREMEN)) {
    return null;
  }

  // Check Tuek's Sietch - cannot have Harkonnen, Atreides, or Emperor
  const tueksOccupants = getFactionsInTerritory(state, TerritoryId.TUEKS_SIETCH);
  const forbiddenInTueks = [Faction.HARKONNEN, Faction.ATREIDES, Faction.EMPEROR];
  if (tueksOccupants.some((f) => forbiddenInTueks.includes(f))) {
    return null;
  }

  // Fremen win! Include ally if allied
  const winners = [Faction.FREMEN];
  if (fremenState.allianceStatus === AllianceStatus.ALLIED && fremenState.allyId) {
    winners.push(fremenState.allyId);
  }

  return {
    condition: WinCondition.FREMEN_SPECIAL,
    winners,
    turn: state.turn,
    details: 'Fremen special victory: Protected native sietches and kept great houses from Tuek\'s Sietch',
  };
}

/**
 * Check Guild special victory condition.
 * Guild wins if no one achieves stronghold victory by end of game.
 */
export function checkGuildSpecialVictory(state: GameState): WinResult | null {
  if (!state.factions.has(Faction.SPACING_GUILD)) return null;

  const guildState = getFactionState(state, Faction.SPACING_GUILD);
  const winners = [Faction.SPACING_GUILD];

  if (guildState.allianceStatus === AllianceStatus.ALLIED && guildState.allyId) {
    winners.push(guildState.allyId);
  }

  return {
    condition: WinCondition.GUILD_SPECIAL,
    winners,
    turn: state.turn,
    details: 'Spacing Guild special victory: Prevented any faction from controlling Dune',
  };
}

// =============================================================================
// END GAME / DEFAULT VICTORY
// =============================================================================

/**
 * Determine winner at end of game when no stronghold victory.
 */
function checkEndGameVictory(state: GameState): WinResult {
  // Check Fremen special first (if Guild in game)
  const fremenSpecial = checkFremenSpecialVictory(state);
  if (fremenSpecial) return fremenSpecial;

  // Check Guild special (if in game)
  const guildSpecial = checkGuildSpecialVictory(state);
  if (guildSpecial) return guildSpecial;

  // Default: Most strongholds wins
  return determineDefaultWinner(state);
}

/**
 * Determine default winner based on stronghold count.
 */
function determineDefaultWinner(state: GameState): WinResult {
  const strongholdCounts: { faction: Faction; count: number }[] = [];

  for (const [faction] of state.factions) {
    const controlled = getControlledStrongholds(state, faction);
    strongholdCounts.push({ faction, count: controlled.length });
  }

  // Sort by count descending
  strongholdCounts.sort((a, b) => b.count - a.count);

  const maxCount = strongholdCounts[0].count;
  const winners = strongholdCounts
    .filter((s) => s.count === maxCount)
    .map((s) => s.faction);

  return {
    condition: WinCondition.DEFAULT_VICTORY,
    winners,
    turn: state.turn,
    details: winners.length === 1
      ? `${FACTION_NAMES[winners[0]]} wins by controlling ${maxCount} strongholds`
      : `Tie: ${winners.map((f) => FACTION_NAMES[f]).join(', ')} each control ${maxCount} strongholds`,
  };
}

// =============================================================================
// VICTORY CONTEXT FOR AGENTS
// =============================================================================

/**
 * Get victory status information for agents to understand their position.
 */
export function getVictoryContext(state: GameState, faction: Faction): {
  strongholdsControlled: number;
  strongholdsNeeded: number;
  closestCompetitors: { faction: Faction; strongholds: number }[];
  turnsRemaining: number;
  specialVictoryPossible: boolean;
  specialVictoryType: string | null;
} {
  const factionState = getFactionState(state, faction);
  const controlled = getControlledStrongholds(state, faction);

  const isAllied = factionState.allianceStatus === AllianceStatus.ALLIED;
  const needed = isAllied
    ? GAME_CONSTANTS.STRONGHOLDS_TO_WIN_ALLIED
    : GAME_CONSTANTS.STRONGHOLDS_TO_WIN_SOLO;

  // Get competitor stronghold counts
  const competitors: { faction: Faction; strongholds: number }[] = [];
  for (const [f] of state.factions) {
    if (f !== faction && f !== factionState.allyId) {
      competitors.push({
        faction: f,
        strongholds: getControlledStrongholds(state, f).length,
      });
    }
  }
  competitors.sort((a, b) => b.strongholds - a.strongholds);

  // Check special victory possibilities
  let specialVictoryPossible = false;
  let specialVictoryType: string | null = null;

  if (faction === Faction.FREMEN && state.factions.has(Faction.SPACING_GUILD)) {
    const fremenSpecial = checkFremenSpecialVictory(state);
    if (fremenSpecial || state.turn >= state.config.maxTurns - 2) {
      specialVictoryPossible = true;
      specialVictoryType = 'Fremen Special';
    }
  }

  if (faction === Faction.SPACING_GUILD) {
    specialVictoryPossible = true;
    specialVictoryType = 'Guild Special (prevent others from winning)';
  }

  if (faction === Faction.BENE_GESSERIT && factionState.beneGesseritPrediction) {
    specialVictoryPossible = true;
    specialVictoryType = `Prediction: ${FACTION_NAMES[factionState.beneGesseritPrediction.faction]} on turn ${factionState.beneGesseritPrediction.turn}`;
  }

  return {
    strongholdsControlled: controlled.length,
    strongholdsNeeded: needed,
    closestCompetitors: competitors.slice(0, 3),
    turnsRemaining: state.config.maxTurns - state.turn,
    specialVictoryPossible,
    specialVictoryType,
  };
}
