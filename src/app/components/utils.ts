/**
 * Utility functions for faction panel components
 */

import { LeaderLocation } from "@/lib/game/types/entities";
import { FactionState } from "@/lib/game/types/state";

// =============================================================================
// LEADER UTILITIES
// =============================================================================

/**
 * Get human-readable display text for leader location
 */
export function getLeaderLocationDisplay(location: LeaderLocation): string {
  switch (location) {
    case LeaderLocation.LEADER_POOL:
      return "Available";
    case LeaderLocation.TANKS_FACE_UP:
      return "Tanks (Face Up)";
    case LeaderLocation.TANKS_FACE_DOWN:
      return "Tanks (Face Down)";
    case LeaderLocation.IN_BATTLE:
      return "In Battle";
    case LeaderLocation.ON_BOARD:
      return "On Board";
    case LeaderLocation.CAPTURED:
      return "Captured";
    default:
      return String(location);
  }
}

// =============================================================================
// FORCE UTILITIES
// =============================================================================

/**
 * Calculate total forces in reserves
 */
export function getTotalReserves(state: FactionState): number {
  return state.forces.reserves.regular + state.forces.reserves.elite;
}

/**
 * Calculate total forces in tanks
 */
export function getTotalTanks(state: FactionState): number {
  return state.forces.tanks.regular + state.forces.tanks.elite;
}

/**
 * Format force breakdown string (e.g., "5R + 2E")
 */
export function formatForceBreakdown(regular: number, elite: number): string {
  if (elite === 0) {
    return `${regular}R`;
  }
  return `${regular}R + ${elite}E`;
}

