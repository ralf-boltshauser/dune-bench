# Aggressor Rule Verification

## Rule Reference

From `handwritten-rules/battle.md` lines 7-8:

> **FIRST PLAYER**: When resolving battles, the First Player is named the Aggressor until all their battles, if any, have been fought. The Aggressor chooses the order in which they wish to fight their battles. Then the player next in Storm Order becomes the Aggressor and so on, until all battles are resolved. -3.03.05.01
>
> **MULTIPLE BATTLES**: When there are three or more players in the same Territory, the Aggressor picks who they will battle first, second, etc. for as long as they have Forces in that Territory.

## Implementation Location

- **File**: `src/lib/game/phases/handlers/battle.ts`
- **Key Components**:
  - `BattlePhaseContext.aggressorOrder` (line 323)
  - `BattlePhaseContext.currentAggressorIndex` (line 324)
  - `initialize()` method (lines 76-118)
  - `requestBattleChoice()` method (lines 253-296)
  - `processResolution()` method (lines 1132-1231)

## Verification Results

### ✅ 1. First Player Named as Aggressor

**Status**: **CORRECT**

**Implementation**:
```83:84:src/lib/game/phases/handlers/battle.ts
      aggressorOrder: [...state.stormOrder],
      currentAggressorIndex: 0,
```

The `aggressorOrder` is initialized from `state.stormOrder`, and `currentAggressorIndex` starts at 0. This means the first player in storm order (which is the First Player) becomes the first aggressor.

**Verification**: ✅ The First Player is correctly named as the initial Aggressor.

---

### ✅ 2. Aggressor Chooses Battle Order

**Status**: **CORRECT**

**Implementation**:
```257:289:src/lib/game/phases/handlers/battle.ts
    // Find next aggressor in storm order who has pending battles
    while (this.context.currentAggressorIndex < this.context.aggressorOrder.length) {
      const aggressor = this.context.aggressorOrder[this.context.currentAggressorIndex];

      const availableBattles = this.context.pendingBattles.filter((b) =>
        b.factions.includes(aggressor)
      );

      if (availableBattles.length > 0) {
        const pendingRequests: AgentRequest[] = [
          {
            factionId: aggressor,
            requestType: 'CHOOSE_BATTLE',
            prompt: `You are the aggressor. Choose which battle to fight or pass.`,
            context: {
              availableBattles: availableBattles.map((b) => ({
                territory: b.territoryId,
                sector: b.sector,
                enemies: b.factions.filter((f) => f !== aggressor),
              })),
            },
            availableActions: ['CHOOSE_BATTLE', 'PASS'],
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

      this.context.currentAggressorIndex++;
    }
```

The aggressor is presented with all available battles where they are involved and can choose which one to fight or pass.

**Verification**: ✅ The Aggressor correctly chooses the order in which to fight their battles.

---

### ✅ 3. Next Player in Storm Order Becomes Aggressor

**Status**: **MOSTLY CORRECT** (with one observation)

**Implementation**:
```1211:1230:src/lib/game/phases/handlers/battle.ts
    // Remove this battle from pending
    this.context.pendingBattles = this.context.pendingBattles.filter(
      (b) =>
        !(
          b.territoryId === battle.territoryId &&
          b.sector === battle.sector &&
          b.factions.includes(battle.aggressor) &&
          b.factions.includes(battle.defender)
        )
    );

    // Check for more battles
    this.context.currentBattle = null;
    this.context.subPhase = BattleSubPhase.AGGRESSOR_CHOOSING;

    if (this.context.pendingBattles.length === 0) {
      return this.endBattlePhase(newState, events);
    }

    return this.requestBattleChoice(newState, events);
```

After a battle resolves:
1. The battle is removed from `pendingBattles`
2. `requestBattleChoice()` is called again
3. The `requestBattleChoice()` function checks if the current aggressor still has available battles
4. If the current aggressor has no more battles, `currentAggressorIndex` is incremented (line 291), moving to the next player in storm order

**Observation**: The `currentAggressorIndex` is NOT incremented immediately after a battle completes. Instead, it remains the same, allowing the same aggressor to continue fighting if they still have battles available. This is correct per the rule: "until all their battles, if any, have been fought."

**Verification**: ✅ Players in Storm Order correctly become Aggressor in sequence after each aggressor completes all their battles.

---

### ⚠️ 4. Multiple Battles in Same Territory (3+ Players)

**Status**: **PARTIALLY CORRECT** (potential issue identified)

**Implementation**:

**Battle Identification**:
```208:247:src/lib/game/phases/handlers/battle.ts
  private identifyBattles(state: GameState): PendingBattle[] {
    const battles: PendingBattle[] = [];
    const checkedLocations = new Set<string>();

    for (const [faction, factionState] of state.factions) {
      for (const forceStack of factionState.forces.onBoard) {
        // NEUTRAL ZONE: Players cannot battle in the Polar Sink
        if (forceStack.territoryId === TerritoryId.POLAR_SINK) continue;

        const locationKey = `${forceStack.territoryId}-${forceStack.sector}`;
        if (checkedLocations.has(locationKey)) continue;
        checkedLocations.add(locationKey);

        // Use sector-aware query to get all factions in this specific location
        const factionsHere = getFactionsInTerritoryAndSector(
          state,
          forceStack.territoryId,
          forceStack.sector
        );

        // Exclude BG advisors (they can't battle)
        const battleFactions = factionsHere.filter((f: Faction) => {
          if (f === Faction.BENE_GESSERIT) {
            return getBGFightersInSector(state, forceStack.territoryId, forceStack.sector) > 0;
          }
          return true;
        });

        if (battleFactions.length >= 2) {
          battles.push({
            territoryId: forceStack.territoryId,
            sector: forceStack.sector,
            factions: battleFactions,
          });
        }
      }
    }

    return battles;
  }
```

When 3+ factions are in the same territory/sector, a single `PendingBattle` is created with all factions in the `factions` array.

**Battle Removal After Resolution**:
```1212:1220:src/lib/game/phases/handlers/battle.ts
    // Remove this battle from pending
    this.context.pendingBattles = this.context.pendingBattles.filter(
      (b) =>
        !(
          b.territoryId === battle.territoryId &&
          b.sector === battle.sector &&
          b.factions.includes(battle.aggressor) &&
          b.factions.includes(battle.defender)
        )
    );
```

**Issue Identified**:

When there are 3+ factions in the same territory (e.g., A, B, C), the system creates one `PendingBattle` with `factions: [A, B, C]`. When A battles B:

1. ✅ The aggressor (A) can correctly choose to battle B from the available enemies list
2. ✅ After the battle resolves, the loser's forces are removed from the territory
3. ⚠️ **POTENTIAL ISSUE**: The code removes the entire `PendingBattle` entry if it includes both aggressor and defender, even if other factions (C) are still present

**Example Scenario**:
- Territory X has factions A, B, C
- `PendingBattle` created: `{territoryId: X, sector: 1, factions: [A, B, C]}`
- A (aggressor) chooses to battle B
- A wins, B's forces are removed
- The filter removes the entire `PendingBattle` because it includes both A and B
- **Result**: The battle between A and C might be lost, even though both still have forces in the territory

**However**, the code does call `requestBattleChoice()` again after each battle, which will check if A still has available battles. If A still has forces and C still has forces in the same location, the `identifyBattles()` function would need to be called again to re-identify battles, but it's not.

**Current Behavior**: The system relies on the initial `pendingBattles` list and removes battles as they complete. If a faction is eliminated from a territory, the battle removal logic might work correctly if the loser is completely removed. However, if the aggressor wins and still has forces, and another faction (C) is still present, the battle between A and C should still be available but might not be if the entire `PendingBattle` was removed.

**Recommendation**: After each battle resolution, the system should either:
1. Re-identify battles by calling `identifyBattles()` again with the updated state, OR
2. Update the `PendingBattle` to remove only the loser's faction instead of removing the entire battle entry

**Verification**: ⚠️ **PARTIALLY CORRECT** - The aggressor can choose which enemy to battle first in a multi-faction territory, but there may be an issue with battle tracking after the first battle completes if the aggressor still has forces remaining.

---

## Summary

| Rule Component | Status | Notes |
|---------------|--------|-------|
| First Player as Aggressor | ✅ CORRECT | First player in storm order correctly becomes first aggressor |
| Aggressor chooses battle order | ✅ CORRECT | Aggressor can choose which battle to fight |
| Next player becomes Aggressor | ✅ CORRECT | Players advance in storm order after completing all their battles |
| Multiple battles (3+ players) | ⚠️ PARTIALLY CORRECT | Aggressor can choose enemy, but battle tracking after first battle may have issues |

## Recommendations

1. **Re-identify battles after each resolution**: Consider calling `identifyBattles(newState)` after each battle completes to ensure all remaining battles are properly tracked, especially in multi-faction territories.

2. **Update pending battles more precisely**: Instead of removing entire `PendingBattle` entries, update the `factions` array to remove only the eliminated faction, preserving battles between remaining factions.

3. **Add test cases**: Create test cases specifically for 3+ faction scenarios to verify that all battles are properly resolved in sequence.

## Code References

- Battle Phase Handler: `src/lib/game/phases/handlers/battle.ts`
- Battle Identification: Lines 208-247
- Aggressor Selection: Lines 253-296
- Battle Resolution: Lines 1132-1231
- Battle Removal: Lines 1212-1220


