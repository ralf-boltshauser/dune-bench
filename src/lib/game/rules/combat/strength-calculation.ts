/**
 * Battle strength calculations.
 * Pure functions for calculating force and leader strength in battles.
 */

import { getLeaderDefinition } from "../../data";
import { Faction } from "../../types";
import type { BattlePlan, GameState, TerritoryId } from "../../types";

/**
 * Get leader strength from a battle plan.
 */
export function getLeaderStrength(plan: BattlePlan): number {
  if (plan.cheapHeroUsed) return 0;
  if (!plan.leaderId) return 0;
  return getLeaderDefinition(plan.leaderId)?.strength ?? 0;
}

/**
 * @rule 2.03.08
 * @rule 2.03.09
 * @rule 2.04.18 FEDAYKIN: Your three starred Forces, Fedaykin, have a special fighting capability. They are worth two normal Forces in battle and in taking losses.
 * Calculate effective battle strength for forces dialed.
 * Elite forces (Sardaukar/Fedaykin) count as 2x in battle, except Sardaukar vs Fremen.
 *
 * Assumes elite forces are dialed first (they're more valuable), then regular forces.
 *
 * This function is intentionally defensive: malformed force data (e.g. missing
 * elite counts) must never propagate NaN into battle resolution.
 */
export function calculateForcesDialedStrength(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  sector: number,
  forcesDialed: number,
  opponentFaction: Faction
): number {
  // Normalize dialed forces to a safe, non-negative finite number
  const safeForcesDialed = Number.isFinite(forcesDialed)
    ? Math.max(0, forcesDialed)
    : 0;

  // Get the force stack in this specific territory AND sector.
  // This is important for multi-sector territories so elite counts
  // are taken from the exact stack that is actually in the battle.
  const forceStack = state.factions
    .get(faction)
    ?.forces.onBoard.find(
      (f) => f.territoryId === territoryId && f.sector === sector
    );

  if (!forceStack || safeForcesDialed === 0) return safeForcesDialed;

  // Normalize elite count; malformed force data must not produce NaN
  const eliteRaw = forceStack.forces?.elite;
  const elite =
    Number.isFinite(eliteRaw) && (eliteRaw as number) > 0
      ? (eliteRaw as number)
      : 0;

  // If no elite forces, all dialed forces are regular (1x each)
  if (elite === 0) return safeForcesDialed;

  // Assume elite forces are dialed first
  const eliteDialed = Math.min(safeForcesDialed, elite);
  const regularDialed = safeForcesDialed - eliteDialed;

  // Check for special case: Emperor Sardaukar vs Fremen (only worth 1x)
  const isSardaukarVsFremen =
    faction === Faction.EMPEROR && opponentFaction === Faction.FREMEN;
  const eliteMultiplier = isSardaukarVsFremen ? 1 : 2;

  return regularDialed + eliteDialed * eliteMultiplier;
}

/**
 * Calculate effective battle strength considering spice dialing (advanced rules).
 *
 * @rule 1.13.04 - SPICE DIALING: Each Force used in a battle is valued at its full strength if 1 spice is paid to support it.
 * @rule 1.13.04.02 - UNSPICED FORCES: A Force used in a battle that is not supported by 1 spice is valued at half strength.
 *
 * FREMEN EXCEPTION (battle.md line 138): "BATTLE HARDENED: Your Forces do not require
 * spice to count at full strength in battles." Fremen forces always count at full
 * strength without requiring spice payment.
 *
 * @param faction The faction whose forces are being calculated
 * @param baseForceStrength The force strength before spice dialing (accounts for elite forces)
 * @param forcesDialed Number of forces dialed into battle
 * @param spiceDialed Amount of spice paid to support forces
 * @param advancedRules Whether advanced rules with spice dialing are enabled
 * @returns Effective force strength after applying spice dialing rules
 */
export function calculateSpicedForceStrength(
  faction: Faction,
  baseForceStrength: number,
  forcesDialed: number,
  spiceDialed: number,
  advancedRules: boolean
): number {
  // Normalize inputs to avoid propagating NaN from any upstream bug
  const safeBaseStrength = Number.isFinite(baseForceStrength)
    ? baseForceStrength
    : 0;
  const safeForcesDialed = Number.isFinite(forcesDialed)
    ? Math.max(0, forcesDialed)
    : 0;
  const safeSpiceDialed = Number.isFinite(spiceDialed)
    ? Math.max(0, spiceDialed)
    : 0;

  // If advanced rules are not enabled, spice dialing doesn't apply
  if (!advancedRules) return safeBaseStrength;

  // @rule 2.04.21 BATTLE HARDENED: Fremen don't need spice for full strength
  // Their forces always count at full value
  if (faction === Faction.FREMEN) {
    return safeBaseStrength; // Full strength always, no spice needed
  }

  // Other factions: Calculate spiced vs unspiced forces
  // Each force can be supported by 1 spice to count at full strength
  const spicedForces = Math.min(safeSpiceDialed, safeForcesDialed);
  const unspicedForces = safeForcesDialed - spicedForces;

  // Unspiced forces count at half strength (0.5x)
  // This is a simplified calculation that assumes regular forces
  // Note: Elite force multipliers are already applied in baseForceStrength
  // So we need to work backwards to separate regular and elite contributions
  // For simplicity, we'll apply the half-strength penalty proportionally
  const spicedProportion =
    safeForcesDialed > 0 ? spicedForces / safeForcesDialed : 0;
  const unspicedProportion =
    safeForcesDialed > 0 ? unspicedForces / safeForcesDialed : 0;

  return (
    safeBaseStrength * spicedProportion +
    safeBaseStrength * unspicedProportion * 0.5
  );
}

