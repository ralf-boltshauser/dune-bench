/**
 * Rule test: 1.07.01 BATTLE DETERMINATION
 * @rule-test 1.07.01
 * @rule-test 1.07.01.01
 * @rule-test 1.07.01.02
 * @rule-test 1.07.01.03
 *
 * Rule text (numbered_rules/1.md):
 * "Battle Determination: Wherever two or more players' Forces occupy the same Territory, battles must occur between those players. Battles continue until just one player's Forces, or no Forces remain in all territories on the Board."
 * 
 * Sub-rules:
 * - 1.07.01.01: Players can not battle one another in a Territory if their Forces are separated by a Sector in storm.
 * - 1.07.01.02: BATTLING BLIND: Whenever two or more players' Forces are in the same Territory and in the same Sector under storm players still battle.
 * - 1.07.01.03: NEUTRAL ZONE: Players can not battle in the Polar Sink. It is a safe haven for everyone.
 *
 * This rule establishes when battles must occur:
 * - Battles occur when two or more players' forces occupy the same territory
 * - Forces in the same sector always battle (even in storm - "Battling Blind")
 * - Forces in different sectors battle if NOT separated by storm
 * - Forces separated by storm cannot battle but can remain in same territory
 * - Polar Sink is a neutral zone - no battles occur there
 * - BG advisors-only cannot battle (only fighters)
 *
 * These tests verify:
 * - Battles identified when two factions in same territory
 * - Battles identified when three+ factions in same territory
 * - Forces in same sector always battle (even in storm)
 * - Forces in different sectors battle if not separated by storm
 * - Forces separated by storm do NOT battle
 * - Polar Sink is neutral zone (no battles)
 * - BG advisors-only do not create battles
 * - BG fighters do create battles
 * - No battles when only one faction in territory
 *
 * Run with:
 *   pnpm test
 */

import { Faction, Phase, TerritoryId, type GameState } from "../../types";
import { createGameState } from "../../state/factory";
import { getFactionState } from "../../state";
import { identifyBattles } from "../../phases/handlers/battle/identification";
import { type PendingBattle } from "../../phases/types";

// =============================================================================
// Minimal test harness (console-based)
// =============================================================================

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passCount++;
  } else {
    console.log(`  ✗ ${message}`);
    failCount++;
  }
}

function section(name: string): void {
  console.log(`\n=== ${name} ===`);
}

// =============================================================================
// Helpers
// =============================================================================

function buildBaseState(factions: Faction[] = [Faction.ATREIDES, Faction.HARKONNEN]): GameState {
  const state = createGameState({
    factions,
    turn: 1,
    phase: Phase.BATTLE,
  });
  return {
    ...state,
    stormOrder: factions,
    stormSector: 0, // Safe sector for testing
  };
}

function hasBattleForTerritory(battles: PendingBattle[], territoryId: TerritoryId): boolean {
  return battles.some(b => b.territoryId === territoryId);
}

function getBattleForTerritory(battles: PendingBattle[], territoryId: TerritoryId): PendingBattle | null {
  return battles.find(b => b.territoryId === territoryId) || null;
}

function hasFactionInBattle(battle: PendingBattle, faction: Faction): boolean {
  return battle.factions.includes(faction);
}

// =============================================================================
// Tests
// =============================================================================

function testBattleDetermination_TwoFactionsInSameTerritory(): void {
  section("Two Factions in Same Territory - Battle Identified");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.ARRAKEEN;
  const sector = 9;
  
  const initialState = {
    ...state,
    stormSector: 0, // Safe sector
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
        ...atreidesState,
        forces: {
          ...atreidesState.forces,
          onBoard: [{ 
            factionId: Faction.ATREIDES, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 5, elite: 0 } 
          }],
        },
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 3, elite: 0 } 
          }],
        },
      })
    ),
  };

  const battles = identifyBattles(initialState);
  
  assert(
    battles.length === 1,
    `Should identify 1 battle when two factions in same territory, got ${battles.length}`
  );
  
  const battle = battles[0];
  assert(
    battle.territoryId === territory,
    `Battle should be in ${territory}, got ${battle.territoryId}`
  );
  assert(
    battle.sector === sector,
    `Battle should be in sector ${sector}, got ${battle.sector}`
  );
  assert(
    battle.factions.length === 2,
    `Battle should have 2 factions, got ${battle.factions.length}`
  );
  assert(
    hasFactionInBattle(battle, Faction.ATREIDES),
    `Battle should include Atreides`
  );
  assert(
    hasFactionInBattle(battle, Faction.HARKONNEN),
    `Battle should include Harkonnen`
  );
}

function testBattleDetermination_ThreeFactionsInSameTerritory(): void {
  section("Three Factions in Same Territory - Battle Identified");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN, Faction.EMPEROR]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  const emperorState = getFactionState(state, Faction.EMPEROR);
  
  const territory = TerritoryId.IMPERIAL_BASIN; // Non-stronghold (has sectors 8, 9, 10)
  const sector = 9; // Use sector 9 for Imperial Basin
  
  const initialState = {
    ...state,
    stormSector: 0, // Safe sector
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
        ...atreidesState,
        forces: {
          ...atreidesState.forces,
          onBoard: [{ 
            factionId: Faction.ATREIDES, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 5, elite: 0 } 
          }],
        },
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 3, elite: 0 } 
          }],
        },
      })
      .set(Faction.EMPEROR, {
        ...emperorState,
        forces: {
          ...emperorState.forces,
          onBoard: [{ 
            factionId: Faction.EMPEROR, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 2, elite: 0 } 
          }],
        },
      })
    ),
  };

  const battles = identifyBattles(initialState);
  
  assert(
    battles.length === 1,
    `Should identify 1 battle when three factions in same territory, got ${battles.length}`
  );
  
  const battle = battles[0];
  assert(
    battle.territoryId === territory,
    `Battle should be in ${territory}, got ${battle.territoryId}`
  );
  assert(
    battle.factions.length === 3,
    `Battle should have 3 factions, got ${battle.factions.length}`
  );
  assert(
    hasFactionInBattle(battle, Faction.ATREIDES),
    `Battle should include Atreides`
  );
  assert(
    hasFactionInBattle(battle, Faction.HARKONNEN),
    `Battle should include Harkonnen`
  );
  assert(
    hasFactionInBattle(battle, Faction.EMPEROR),
    `Battle should include Emperor`
  );
}

function testBattleDetermination_ForcesInSameSectorAlwaysBattle(): void {
  section("Forces in Same Sector Always Battle (Even in Storm - Battling Blind)");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const territory = TerritoryId.ARRAKEEN;
  const sector = 9;
  const stormSector = sector; // Storm is on the same sector
  
  const initialState = {
    ...state,
    stormSector,
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
        ...atreidesState,
        forces: {
          ...atreidesState.forces,
          onBoard: [{ 
            factionId: Faction.ATREIDES, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 5, elite: 0 } 
          }],
        },
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 3, elite: 0 } 
          }],
        },
      })
    ),
  };

  const battles = identifyBattles(initialState);
  
  // Rule 1.07.01.02: BATTLING BLIND - forces in same sector under storm still battle
  assert(
    battles.length === 1,
    `Should identify battle even when forces in same sector under storm (Battling Blind), got ${battles.length}`
  );
  
  const battle = battles[0];
  assert(
    battle.territoryId === territory,
    `Battle should be in ${territory}, got ${battle.territoryId}`
  );
  assert(
    battle.sector === sector,
    `Battle should be in sector ${sector} (storm sector), got ${battle.sector}`
  );
  assert(
    battle.factions.length === 2,
    `Battle should have 2 factions, got ${battle.factions.length}`
  );
}

function testBattleDetermination_ForcesInDifferentSectorsBattleIfNotSeparatedByStorm(): void {
  section("Forces in Different Sectors Battle If Not Separated By Storm");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  // Use a territory with multiple sectors
  const territory = TerritoryId.IMPERIAL_BASIN; // Has sectors 8, 9, 10
  const sector1 = 8;
  const sector2 = 10;
  const stormSector = 9; // Storm is between sectors 8 and 10, but not on them
  
  const initialState = {
    ...state,
    stormSector,
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
        ...atreidesState,
        forces: {
          ...atreidesState.forces,
          onBoard: [{ 
            factionId: Faction.ATREIDES, 
            territoryId: territory, 
            sector: sector1, 
            forces: { regular: 5, elite: 0 } 
          }],
        },
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: territory, 
            sector: sector2, 
            forces: { regular: 3, elite: 0 } 
          }],
        },
      })
    ),
  };

  const battles = identifyBattles(initialState);
  
  // Sectors 8 and 10 are not separated by storm (storm is on 9, but that's between them)
  // Actually, wait - let me check the logic. If storm is on sector 9, and forces are in 8 and 10,
  // are they separated? The rule says "separated by a Sector in storm" - so if sector 9 is in storm,
  // and forces are in 8 and 10, they might be considered separated.
  // But actually, the rule 1.01.04 says "separated by a sector in storm" - so if there's a storm sector
  // between them, they are separated. But if the storm is just on a different sector that's not between them,
  // they might not be separated.
  // Let me check: if forces are in sector 8 and sector 10, and storm is on sector 9, then sector 9
  // is between them, so they ARE separated by storm.
  // So this test should NOT have a battle.
  
  // Actually, I need to reconsider. The rule says "separated by a Sector in storm" - if storm is on 9,
  // and forces are in 8 and 10, then sector 9 (which is in storm) is between them, so they are separated.
  // So this should NOT create a battle.
  
  // Let me change the test to have storm on a sector that's NOT between them, or have no storm between them.
  // Actually, for Imperial Basin, sectors are 8, 9, 10. If storm is on 9, and forces are in 8 and 10,
  // then sector 9 is between them and is in storm, so they ARE separated.
  
  // Let me use a different setup: forces in sectors that are adjacent and not separated by storm.
  // Or, I can test with storm on a different sector that's not between them.
  
  // Actually, let me just test with storm on a safe sector (not 8, 9, or 10), so sectors 8 and 10 are not separated.
  const safeState = {
    ...initialState,
    stormSector: 0, // Safe sector (not in territory)
  };
  
  const safeBattles = identifyBattles(safeState);
  
  assert(
    safeBattles.length === 1,
    `Should identify battle when forces in different sectors not separated by storm, got ${safeBattles.length}`
  );
  
  const battle = safeBattles[0];
  assert(
    battle.territoryId === territory,
    `Battle should be in ${territory}, got ${battle.territoryId}`
  );
  assert(
    battle.factions.length === 2,
    `Battle should have 2 factions, got ${battle.factions.length}`
  );
}

function testBattleDetermination_ForcesSeparatedByStormDoNotBattle(): void {
  section("Forces Separated By Storm Do NOT Battle");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  // Use a territory with multiple sectors
  const territory = TerritoryId.IMPERIAL_BASIN; // Has sectors 8, 9, 10
  const sector1 = 8;
  const sector2 = 10;
  const stormSector = 9; // Storm is on sector 9, which is between sectors 8 and 10
  
  const initialState = {
    ...state,
    stormSector,
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
        ...atreidesState,
        forces: {
          ...atreidesState.forces,
          onBoard: [{ 
            factionId: Faction.ATREIDES, 
            territoryId: territory, 
            sector: sector1, 
            forces: { regular: 5, elite: 0 } 
          }],
        },
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: territory, 
            sector: sector2, 
            forces: { regular: 3, elite: 0 } 
          }],
        },
      })
    ),
  };

  const battles = identifyBattles(initialState);
  
  // Rule 1.07.01.01: Forces separated by storm cannot battle
  assert(
    battles.length === 0,
    `Should NOT identify battle when forces separated by storm, got ${battles.length}`
  );
}

function testBattleDetermination_PolarSinkIsNeutralZone(): void {
  section("Polar Sink is Neutral Zone - No Battles");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const harkonnenState = getFactionState(state, Faction.HARKONNEN);
  
  const polarSink = TerritoryId.POLAR_SINK;
  const sector = 0; // Polar Sink uses sector 0 as placeholder
  
  const initialState = {
    ...state,
    stormSector: 0,
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
        ...atreidesState,
        forces: {
          ...atreidesState.forces,
          onBoard: [{ 
            factionId: Faction.ATREIDES, 
            territoryId: polarSink, 
            sector: sector, 
            forces: { regular: 5, elite: 0 } 
          }],
        },
      })
      .set(Faction.HARKONNEN, {
        ...harkonnenState,
        forces: {
          ...harkonnenState.forces,
          onBoard: [{ 
            factionId: Faction.HARKONNEN, 
            territoryId: polarSink, 
            sector: sector, 
            forces: { regular: 3, elite: 0 } 
          }],
        },
      })
    ),
  };

  const battles = identifyBattles(initialState);
  
  // Rule 1.07.01.03: NEUTRAL ZONE - Players cannot battle in Polar Sink
  assert(
    battles.length === 0,
    `Should NOT identify battle in Polar Sink (neutral zone), got ${battles.length}`
  );
}

function testBattleDetermination_NoBattleWhenOnlyOneFaction(): void {
  section("No Battle When Only One Faction in Territory");

  const state = buildBaseState([Faction.ATREIDES, Faction.HARKONNEN]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  
  const territory = TerritoryId.ARRAKEEN;
  const sector = 9;
  
  const initialState = {
    ...state,
    stormSector: 0,
    factions: new Map(state.factions.set(Faction.ATREIDES, {
      ...atreidesState,
      forces: {
        ...atreidesState.forces,
        onBoard: [{ 
          factionId: Faction.ATREIDES, 
          territoryId: territory, 
          sector: sector, 
          forces: { regular: 5, elite: 0 } 
        }],
      },
    })),
  };

  const battles = identifyBattles(initialState);
  
  assert(
    battles.length === 0,
    `Should NOT identify battle when only one faction in territory, got ${battles.length}`
  );
}

function testBattleDetermination_BGAdvisorsOnlyDoNotCreateBattles(): void {
  section("BG Advisors-Only Do Not Create Battles");

  const state = buildBaseState([Faction.ATREIDES, Faction.BENE_GESSERIT]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  
  const territory = TerritoryId.ARRAKEEN;
  const sector = 9;
  
  const initialState = {
    ...state,
    stormSector: 0,
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
        ...atreidesState,
        forces: {
          ...atreidesState.forces,
          onBoard: [{ 
            factionId: Faction.ATREIDES, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 5, elite: 0 } 
          }],
        },
      })
      .set(Faction.BENE_GESSERIT, {
        ...bgState,
        forces: {
          ...bgState.forces,
          onBoard: [{ 
            factionId: Faction.BENE_GESSERIT, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 0, elite: 0 }, // No fighters
            advisors: 3 // Only advisors
          }],
        },
      })
    ),
  };

  const battles = identifyBattles(initialState);
  
  // Rule 2.02.12: BG advisors cannot battle
  assert(
    battles.length === 0,
    `Should NOT identify battle when BG only has advisors (no fighters), got ${battles.length}`
  );
}

function testBattleDetermination_BGFightersDoCreateBattles(): void {
  section("BG Fighters Do Create Battles");

  const state = buildBaseState([Faction.ATREIDES, Faction.BENE_GESSERIT]);
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  
  const territory = TerritoryId.ARRAKEEN;
  const sector = 9;
  
  const initialState = {
    ...state,
    stormSector: 0,
    factions: new Map(state.factions
      .set(Faction.ATREIDES, {
        ...atreidesState,
        forces: {
          ...atreidesState.forces,
          onBoard: [{ 
            factionId: Faction.ATREIDES, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 5, elite: 0 } 
          }],
        },
      })
      .set(Faction.BENE_GESSERIT, {
        ...bgState,
        forces: {
          ...bgState.forces,
          onBoard: [{ 
            factionId: Faction.BENE_GESSERIT, 
            territoryId: territory, 
            sector: sector, 
            forces: { regular: 3, elite: 0 }, // Has fighters
            advisors: 2 // Also has advisors, but fighters count
          }],
        },
      })
    ),
  };

  const battles = identifyBattles(initialState);
  
  // BG has fighters, so they can battle
  assert(
    battles.length === 1,
    `Should identify battle when BG has fighters, got ${battles.length}`
  );
  
  const battle = battles[0];
  assert(
    hasFactionInBattle(battle, Faction.ATREIDES),
    `Battle should include Atreides`
  );
  assert(
    hasFactionInBattle(battle, Faction.BENE_GESSERIT),
    `Battle should include Bene Gesserit (has fighters)`
  );
}

// =============================================================================
// Test Runner
// =============================================================================

function runTests(): void {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 Testing Rule 1.07.01: BATTLE DETERMINATION");
  console.log("=".repeat(80));

  testBattleDetermination_TwoFactionsInSameTerritory();
  testBattleDetermination_ThreeFactionsInSameTerritory();
  testBattleDetermination_ForcesInSameSectorAlwaysBattle();
  testBattleDetermination_ForcesInDifferentSectorsBattleIfNotSeparatedByStorm();
  testBattleDetermination_ForcesSeparatedByStormDoNotBattle();
  testBattleDetermination_PolarSinkIsNeutralZone();
  testBattleDetermination_NoBattleWhenOnlyOneFaction();
  testBattleDetermination_BGAdvisorsOnlyDoNotCreateBattles();
  testBattleDetermination_BGFightersDoCreateBattles();

  console.log("\n" + "=".repeat(80));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();

