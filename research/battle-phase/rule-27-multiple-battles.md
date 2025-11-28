# Rule 27: Multiple Battles Verification

## Rule Reference
**Source:** `handwritten-rules/battle.md` line 8

**Rule Text:**
> MULTIPLE BATTLES: When there are three or more players in the same Territory, the Aggressor picks who they will battle first, second, etc. for as long as they have Forces in that Territory.

## Implementation Analysis

### Current Implementation

The battle phase handler implements multiple battles through the following mechanism:

1. **Battle Identification** (`identifyBattles` method, lines 211-366):
   - Creates `PendingBattle` objects for each territory/sector with 2+ factions
   - Each `PendingBattle` contains: `territoryId`, `sector`, and `factions[]` (all factions present)
   - Example: If A, B, C are in a territory, creates ONE `PendingBattle` with `factions: [A, B, C]`

2. **Battle Choice** (`requestBattleChoice` method, lines 372-415):
   - Aggressor sees all available battles where they are involved (across all territories)
   - For each battle, they see the territory, sector, and list of enemies
   - The `ChooseBattleSchema` requires: `territoryId` and `opponentFaction` (defender)
   - **✅ CORRECT:** Aggressor can choose which territory to fight in
   - **✅ CORRECT:** Aggressor can choose which opponent to fight when multiple enemies are in a territory

3. **Battle Resolution** (`processResolution` method, lines 1330-1349):
   - After a battle is resolved, forces are removed (loser loses all, winner loses dialed amount)
   - The battle is removed from `pendingBattles` using this filter:
   ```typescript
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

### Verification of Initial Choice Mechanism

**✅ CORRECTLY IMPLEMENTED:** The aggressor can choose:
1. **Which territory to fight in** - When the aggressor has battles in multiple territories, they see all available battles and can choose `territoryId`
2. **Which opponent to fight** - When multiple enemies are in the same territory, the aggressor must specify `opponentFaction` (defender)

**Example Scenario:**
- Territory 1: A, B, C (three factions)
- Territory 2: A, D (two factions)
- Aggressor A sees both battles and can choose:
  - To fight in Territory 1 first, and choose to battle B or C
  - To fight in Territory 2 first, and battle D

**Code Evidence:**
- ```372:415:src/lib/game/phases/handlers/battle.ts``` - Shows all available battles with territory and enemies
- ```315:320:src/lib/game/tools/schemas.ts``` - `ChooseBattleSchema` requires both `territoryId` and `opponentFaction`
- ```417:509:src/lib/game/phases/handlers/battle.ts``` - Validates that the chosen territory and defender match a pending battle

### Issue Identified

**BUG:** The current implementation has a flaw when handling multiple battles in the same territory.

**Problem Scenario:**
1. Three factions (A, B, C) are in the same territory
2. `identifyBattles` creates ONE `PendingBattle` with `factions: [A, B, C]`
3. Aggressor A chooses to battle B
4. Battle is resolved (A wins, B loses all forces)
5. The removal logic removes the entire `PendingBattle` because it includes both A and B
6. **Result:** Even though A still has forces and C still has forces, the battle between A and C is also removed from `pendingBattles`

**Expected Behavior (per rule):**
- After A battles B, if A still has forces and C still has forces, A should be able to choose to battle C next
- The system should allow the aggressor to continue fighting in the same territory "for as long as they have Forces in that Territory"

**Root Cause:**
The removal logic removes the entire `PendingBattle` object when it should either:
1. **Update the `PendingBattle`** to remove factions that no longer have forces in that territory, OR
2. **Re-identify battles** after each battle to see which factions still remain

### Code Locations

- Battle identification: ```211:366:src/lib/game/phases/handlers/battle.ts```
- Battle choice: ```372:415:src/lib/game/phases/handlers/battle.ts```
- Battle processing: ```417:509:src/lib/game/phases/handlers/battle.ts```
- Battle removal: ```1330:1339:src/lib/game/phases/handlers/battle.ts```
- `ChooseBattleSchema`: ```315:320:src/lib/game/tools/schemas.ts```
- `PendingBattle` type: ```327:331:src/lib/game/phases/types.ts```

### Verification Status

✅ **FULLY IMPLEMENTED**

**What Works Correctly:**
- ✅ Aggressor can choose which territory to fight in (when multiple territories have battles)
- ✅ Aggressor can choose which opponent to fight (when multiple enemies are in the same territory)
- ✅ Aggressor can continue fighting in the same territory after the first battle (as long as they still have forces and other enemies remain)

**Implementation Fix:**
- Added `updatePendingBattlesAfterBattle()` method (lines 370-411) that:
  - Checks which factions still have forces in the territory/sector after a battle
  - Updates the `PendingBattle.factions` array to remove factions that no longer have forces
  - Only removes the `PendingBattle` entirely if fewer than 2 factions remain
- Updated both battle removal locations (lines 1545-1552 and 2073-2080) to use the new method

### Recommended Fix

The system should update `PendingBattle` objects after each battle to reflect which factions still have forces in the territory. Here's the recommended approach:

1. After a battle is resolved, check if the loser still has forces in that territory
2. If the loser has no forces, remove them from the `PendingBattle.factions` array
3. If the `PendingBattle` still has 2+ factions, keep it in `pendingBattles`
4. If the `PendingBattle` has fewer than 2 factions, remove it entirely
5. Additionally, check if the aggressor still has forces - if not, they should not be able to continue fighting in that territory

Alternatively, re-identify battles after each battle by calling `identifyBattles` again with the updated game state.

### Test Case

**Scenario:**
- Territory: ARRAKEEN
- Factions: Atreides (A), Harkonnen (B), Fremen (C)
- All have forces in the same sector
- Storm order: A, B, C

**Expected Flow:**
1. A (aggressor) chooses to battle B first
2. Battle resolves (A wins, B loses all forces)
3. A still has forces, C still has forces
4. A should be able to choose to battle C next
5. Battle resolves
6. Phase continues with next aggressor (B, if they have other battles)

**Current Behavior:**
- ✅ Steps 1-4 work correctly: A can choose to battle B first, and after winning, can continue to battle C
- ✅ The `PendingBattle` is updated (not removed) to reflect that B no longer has forces, leaving A and C to continue fighting

**Additional Test Case - Multiple Territories:**

**Scenario:**
- Territory 1: A, B, C
- Territory 2: A, D
- Storm order: A, B, C, D

**Expected Flow:**
1. A (aggressor) sees battles in both territories
2. A can choose to fight in Territory 1 first, and choose to battle B or C
3. OR A can choose to fight in Territory 2 first, and battle D
4. After completing battles in one territory, A should be able to continue to the other territory

**Current Behavior:**
- ✅ Steps 1-3 work correctly: A can choose territory and opponent
- ✅ Step 4 works correctly: After battles in one territory, A can fight in the other territory

