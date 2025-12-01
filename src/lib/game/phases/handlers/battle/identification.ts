/**
 * Battle Identification Module
 *
 * Identifies all battles that need to be resolved based on game state.
 *
 * Rules:
 * - Forces in the SAME sector always battle (even in storm - "Battling Blind")
 * - Forces in DIFFERENT sectors battle if NOT separated by storm
 * - Forces separated by storm cannot battle but can remain in same territory
 * - Polar Sink is a neutral zone - no battles occur there
 */

import {
  areSectorsSeparatedByStorm,
  getBGFightersInSector,
  validateStrongholdOccupancy,
} from "../../../state";
import {
  Faction,
  STRONGHOLD_TERRITORIES,
  TerritoryId,
  type GameState,
} from "../../../types";
import { type PendingBattle } from "../../types";

/**
 * Identify all battles on the board.
 * Battles occur when multiple factions occupy the same territory.
 *
 * IMPORTANT: Validates stronghold occupancy limits. If more than 2 factions
 * are found in a stronghold, this is a game state violation that should
 * be logged and handled.
 */
export function identifyBattles(state: GameState): PendingBattle[] {
  // First, validate stronghold occupancy limits (Rule 2.02.11: max 2 factions per stronghold)
  const violations = validateStrongholdOccupancy(state);
  if (violations.length > 0) {
    // CRITICAL: Fail-fast on stronghold occupancy violations
    // This should never happen if validation is working correctly
    for (const violation of violations) {
      console.error(
        `⚠️ STRONGHOLD OCCUPANCY VIOLATION: ${violation.territoryId} has ${
          violation.count
        } factions: ${violation.factions.join(", ")}`
      );
    }
    // Throw error to prevent invalid game state from continuing
    throw new Error(
      `CRITICAL: Stronghold occupancy violation detected. ` +
        `Territories with 3+ factions: ${violations
          .map(
            (v) =>
              `${v.territoryId} (${v.count} factions: ${v.factions.join(", ")})`
          )
          .join(", ")}. ` +
        `Maximum 2 factions allowed per stronghold (Rule 2.02.11). ` +
        `This indicates a bug in shipment/movement validation.`
    );
  }

  const battles: PendingBattle[] = [];
  const checkedTerritories = new Set<TerritoryId>();

  // Group all force stacks by territory
  const territoryForces = new Map<TerritoryId, Map<number, Set<Faction>>>();

  for (const [faction, factionState] of state.factions) {
    for (const forceStack of factionState.forces.onBoard) {
      // NEUTRAL ZONE: Players cannot battle in the Polar Sink
      if (forceStack.territoryId === TerritoryId.POLAR_SINK) continue;

      // Check if this faction has forces at this location that should trigger battle identification.
      // IMPORTANT BG RULE: Advisors cannot be involved in combat or prevent challenges/occupancy.
      // That means BG **advisors-only** stacks must NOT create or join battles at all
      // (they coexist peacefully and have no battle impact).
      //
      // Therefore:
      // - For BENE_GESSERIT we only consider **fighters** here.
      // - Advisors-only stacks are ignored for battle identification.
      // - If advisors later flip to fighters (WARTIME, UNIVERSAL STEWARDS, etc.),
      //   getBGFightersInSector() will see fighters > 0 and they will then be
      //   included as battle-capable forces.
      let hasBattleForces = false;
      if (faction === Faction.BENE_GESSERIT) {
        // BG: Only fighters (not advisors) can ever be in battles.
        // Use getBGFightersInSector so we correctly respect advisor/fighter state.
        const fightersInSector = getBGFightersInSector(
          state,
          forceStack.territoryId,
          forceStack.sector
        );
        hasBattleForces = fightersInSector > 0;
      } else {
        // Other factions: Any forces can battle
        const totalForces = forceStack.forces.regular + forceStack.forces.elite;
        hasBattleForces = totalForces > 0;
      }

      if (hasBattleForces) {
        if (!territoryForces.has(forceStack.territoryId)) {
          territoryForces.set(
            forceStack.territoryId,
            new Map<number, Set<Faction>>()
          );
        }
        const sectorMap = territoryForces.get(forceStack.territoryId)!;
        if (!sectorMap.has(forceStack.sector)) {
          sectorMap.set(forceStack.sector, new Set<Faction>());
        }
        sectorMap.get(forceStack.sector)!.add(faction);
      }
    }
  }

  // For each territory, find connected sector groups that can battle
  for (const [territoryId, sectorMap] of territoryForces) {
    if (checkedTerritories.has(territoryId)) continue;
    checkedTerritories.add(territoryId);

    const sectors = Array.from(sectorMap.keys()).sort((a, b) => a - b);

    // Find connected components: sectors that can all battle with each other
    // Use union-find approach to group sectors that can reach each other
    const sectorGroups: Set<number>[] = [];

    for (let i = 0; i < sectors.length; i++) {
      const sector1 = sectors[i];
      let foundGroup = false;

      // Check if this sector can connect to any existing group
      for (const group of sectorGroups) {
        // Check if sector1 can battle with any sector in this group
        for (const sector2 of group) {
          let canBattle: boolean;
          if (sector1 === sector2) {
            canBattle = true; // Same sector always battles
          } else {
            canBattle = !areSectorsSeparatedByStorm(state, sector1, sector2);
          }

          if (canBattle) {
            // This sector can connect to this group
            group.add(sector1);
            foundGroup = true;
            break;
          }
        }

        if (foundGroup) break;
      }

      // If no group found, create a new group
      if (!foundGroup) {
        sectorGroups.push(new Set([sector1]));
      }
    }

    // Merge groups that can connect to each other
    // (This handles transitive connections: if A connects to B and B connects to C, all connect)
    let merged = true;
    while (merged) {
      merged = false;
      for (let i = 0; i < sectorGroups.length; i++) {
        for (let j = i + 1; j < sectorGroups.length; j++) {
          const group1 = sectorGroups[i];
          const group2 = sectorGroups[j];

          // Check if any sector in group1 can battle with any sector in group2
          let canConnect = false;
          for (const sector1 of group1) {
            for (const sector2 of group2) {
              let canBattle: boolean;
              if (sector1 === sector2) {
                canBattle = true;
              } else {
                canBattle = !areSectorsSeparatedByStorm(
                  state,
                  sector1,
                  sector2
                );
              }

              if (canBattle) {
                canConnect = true;
                break;
              }
            }
            if (canConnect) break;
          }

          if (canConnect) {
            // Merge group2 into group1
            for (const sector of group2) {
              group1.add(sector);
            }
            sectorGroups.splice(j, 1);
            merged = true;
            break;
          }
        }
        if (merged) break;
      }
    }

    // Create one battle per connected sector group
    for (const sectorGroup of sectorGroups) {
      // Collect all factions from all sectors in this group
      const allFactions = new Set<Faction>();
      for (const sector of sectorGroup) {
        const factionsInSector = sectorMap.get(sector) || new Set<Faction>();
        for (const faction of factionsInSector) {
          allFactions.add(faction);
        }
      }

      // Filter out BG if they only have advisors (not fighters) in this sector group
      // This must be done for ALL territories, not just strongholds
      // BG advisors cannot participate in battles (Rule 2.02.12)
      //
      // NOTE: Lines 84-92 already filter BG advisors-only when building territoryForces,
      // so BG should not be in allFactions if they only have advisors. However, this
      // provides a critical double-check for edge cases:
      // 1. BG might have fighters in one sector but advisors in another sector of the same group
      // 2. Ensures we sum fighters across ALL sectors in the group (not just one sector)
      // 3. Provides defense-in-depth against any bugs in the first filter
      const battleCapableFactions: Faction[] = [];

      for (const faction of allFactions) {
        if (faction === Faction.BENE_GESSERIT) {
          // Sum BG fighters across all sectors in this group
          // This is important because sectors can be grouped together if they can battle
          // (e.g., if not separated by storm), and BG might have fighters in one sector
          // but advisors in another sector of the same group
          let fightersInGroup = 0;
          for (const sector of sectorGroup) {
            fightersInGroup += getBGFightersInSector(
              state,
              territoryId,
              sector
            );
          }

          // If BG only has advisors in this territory/sector group, they cannot battle
          // Advisors are non-combatants and cannot participate in combat (Rule 2.02.12)
          if (fightersInGroup === 0) {
            continue; // Skip BG - they only have advisors, cannot battle
          }
        }

        battleCapableFactions.push(faction);
      }

      // Only create battle if 2+ battle-capable factions
      if (battleCapableFactions.length >= 2) {
        // VALIDATION: For strongholds, ensure we don't have more than 2 factions (Rule 2.02.11)
        // IMPORTANT: BG advisors-only already filtered out above, so battleCapableFactions
        // only contains factions with actual fighters.
        if (STRONGHOLD_TERRITORIES.includes(territoryId)) {
          if (battleCapableFactions.length > 2) {
            // CRITICAL: Fail-fast - do not create battle with 3+ battle-capable factions
            throw new Error(
              `CRITICAL: Cannot create battle in stronghold ${territoryId} with ${
                battleCapableFactions.length
              } battle-capable factions: ${battleCapableFactions.join(
                ", "
              )}. ` +
                `Maximum 2 factions allowed per stronghold (Rule 2.02.11). ` +
                `This indicates a bug in shipment/movement validation.`
            );
          }
        }

        // Use the first sector as the battle location
        const primarySector = Math.min(...Array.from(sectorGroup));
        battles.push({
          territoryId,
          sector: primarySector,
          factions: battleCapableFactions, // Use battle-capable factions, not allFactions
        });
      }
    }
  }

  return battles;
}
