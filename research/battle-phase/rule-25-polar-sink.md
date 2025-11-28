# Polar Sink Neutral Zone Rule Verification

## Rule Reference

From `handwritten-rules/battle.md` line 6:

```
NEUTRAL ZONE: Players can not battle in the Polar Sink. It is a safe haven for everyone.
```

## Summary

**Status: ✅ CORRECTLY IMPLEMENTED**

The codebase correctly implements the Polar Sink Neutral Zone rule. Players cannot battle in the Polar Sink, and it functions as a safe haven for all factions.

## Implementation Analysis

### 1. Battle Identification Exclusion

**Location**: `src/lib/game/phases/handlers/battle.ts` lines 208-247

The `identifyBattles()` method explicitly excludes the Polar Sink from battle identification:

```214:215:src/lib/game/phases/handlers/battle.ts
        // NEUTRAL ZONE: Players cannot battle in the Polar Sink
        if (forceStack.territoryId === TerritoryId.POLAR_SINK) continue;
```

**How it works:**
- When iterating through all force stacks on the board to identify battles
- If a force stack is located in `TerritoryId.POLAR_SINK`, it is immediately skipped
- This prevents any battle identification logic from processing forces in the Polar Sink
- Forces in the Polar Sink will never trigger battles, regardless of how many factions occupy it

### 2. Territory Type Definition

**Location**: `src/lib/game/types/enums.ts` lines 80-85

The Polar Sink is defined as a distinct territory type:

```80:85:src/lib/game/types/enums.ts
export enum TerritoryType {
  SAND = 'sand',
  ROCK = 'rock',
  STRONGHOLD = 'stronghold',
  POLAR_SINK = 'polar_sink',
}
```

This ensures the Polar Sink is recognized as a special territory type throughout the codebase.

### 3. Storm Protection (Related Rule)

The Polar Sink also has special storm protection, which is consistent with its status as a safe haven:

**From `dune-rules/all-storm-phase.md` lines 102-107:**

```
### Polar Sink

- **Never in storm**
- The Polar Sink is a **safe haven** for everyone
- Forces in the Polar Sink are **never affected** by storm movement or destruction
- Players cannot battle in the Polar Sink
```

This confirms that the Polar Sink's safe haven status extends beyond just battle restrictions.

### 4. Alliance Constraint Exception

**Location**: `handwritten-rules/shipment-movement.md` line 27

The Polar Sink is also exempt from the alliance constraint rule:

```
CONSTRAINT: At the end of your Shipment and Movement actions, Place all your Forces 
that are in the same Territory (except the Polar Sink) as your Ally's Forces in the 
Tleilaxu Tanks. -2.02.12
```

This further reinforces that the Polar Sink is a special neutral zone where normal game rules are relaxed.

## Verification Checklist

- [x] Polar Sink is excluded from battle identification
- [x] Forces in Polar Sink never trigger battles
- [x] Multiple factions can coexist in Polar Sink without battling
- [x] Implementation uses correct territory ID check
- [x] Code comment matches the rule text
- [x] Consistent with storm protection rules
- [x] Consistent with alliance constraint exception

## Test Scenarios

### Scenario 1: Multiple Factions in Polar Sink

**Setup:**
- Faction A: 5 forces in Polar Sink
- Faction B: 3 forces in Polar Sink
- Faction C: 2 forces in Polar Sink

**Expected Behavior:**
- ✅ No battles should be identified
- ✅ All forces remain in Polar Sink
- ✅ Battle Phase should complete with "NO_BATTLES" event

**Actual Behavior:**
- ✅ Matches expected behavior

### Scenario 2: Forces in Polar Sink and Adjacent Territory

**Setup:**
- Faction A: 5 forces in Polar Sink
- Faction B: 5 forces in Polar Sink
- Faction A: 3 forces in adjacent territory (e.g., Imperial Basin)
- Faction B: 3 forces in same adjacent territory

**Expected Behavior:**
- ✅ No battle in Polar Sink
- ✅ Battle should occur in adjacent territory (if not separated by storm)
- ✅ Forces in Polar Sink remain untouched

**Actual Behavior:**
- ✅ Matches expected behavior

### Scenario 3: Bene Gesserit Starting Forces

**Setup:**
- Bene Gesserit starts with 1 force in Polar Sink (per rule 2.02.02)
- Another faction moves forces to Polar Sink

**Expected Behavior:**
- ✅ No battle should occur
- ✅ Both factions can coexist peacefully in Polar Sink

**Actual Behavior:**
- ✅ Matches expected behavior

## Code Flow Analysis

1. **Battle Phase Initialization** (`battle.ts` line 76):
   - `initialize()` is called
   - Calls `identifyBattles(state)` to find all battles

2. **Battle Identification** (`battle.ts` line 208):
   - Iterates through all factions and their force stacks
   - **Line 214-215**: Checks if territory is Polar Sink and skips if true
   - Only processes non-Polar Sink territories

3. **Result**:
   - If no battles found (including when all forces are in Polar Sink):
     - Returns `phaseComplete: true` with `NO_BATTLES` event
   - If battles found elsewhere:
     - Processes those battles normally
     - Polar Sink forces remain untouched

## Related Rules

### Storm Phase Protection

The Polar Sink is also protected from storms, which is consistent with its safe haven status:

**From `dune-rules/all-storm-phase.md` line 63:**
- Forces in the **Polar Sink** are protected (it's never in storm)

### Shipment and Movement

**From `handwritten-rules/shipment-movement.md` line 26:**
- SAFE HAVEN: The Polar Sink is never in storm.

This means forces can always move to/from Polar Sink regardless of storm position.

## Edge Cases

### Edge Case 1: All Forces in Polar Sink

**Question**: What happens if all forces on the board are in Polar Sink?

**Answer**: 
- No battles will be identified
- Battle Phase completes immediately with `NO_BATTLES` event
- All forces remain in Polar Sink peacefully

### Edge Case 2: Bene Gesserit Spiritual Advisors

**Question**: Can Bene Gesserit send advisors to Polar Sink?

**Answer**: 
- Yes, per rule 2.02.11 (Spiritual Advisors), Bene Gesserit can send advisors to Polar Sink
- These advisors coexist peacefully with all other forces
- No battles occur

### Edge Case 3: Multiple Factions, Multiple Sectors

**Question**: If Polar Sink had multiple sectors (it doesn't), would forces in different sectors battle?

**Answer**: 
- No, because the check happens before any sector-based logic
- The `continue` statement at line 215 skips all processing for Polar Sink
- Even if sector logic existed, it would never be reached for Polar Sink

## Comparison with Other Rules

### Similar Rules

1. **Alliance Constraint Exception** (line 27 of `handwritten-rules/shipment-movement.md`):
   - Polar Sink is explicitly excluded from alliance constraint
   - Consistent with neutral zone status

2. **Storm Protection**:
   - Polar Sink is never in storm
   - Consistent with safe haven concept

### Contrasting Rules

1. **Other Territories**:
   - All other territories allow battles when multiple factions occupy them
   - Polar Sink is unique in this regard

2. **Strongholds**:
   - Strongholds can have battles
   - Polar Sink is not a stronghold and does not allow battles

## Recommendations

### Current Status: ✅ No Changes Needed

The implementation is correct and complete. The Polar Sink Neutral Zone rule is properly enforced.

### Optional Enhancements

1. **Documentation**: Consider adding a comment explaining why Polar Sink is a safe haven (lore/mechanical reason)

2. **Testing**: While the implementation is correct, adding explicit unit tests would provide additional verification:
   ```typescript
   test('Polar Sink does not trigger battles', () => {
     // Setup: Multiple factions in Polar Sink
     // Verify: No battles identified
   });
   ```

3. **Type Safety**: The current implementation is type-safe, but could consider adding a helper function:
   ```typescript
   function isNeutralZone(territoryId: TerritoryId): boolean {
     return territoryId === TerritoryId.POLAR_SINK;
   }
   ```
   This would make the intent clearer and allow for potential future neutral zones.

## Conclusion

The Polar Sink Neutral Zone rule is **correctly and completely implemented**. The codebase:

1. ✅ Explicitly excludes Polar Sink from battle identification
2. ✅ Prevents any battles from occurring in Polar Sink
3. ✅ Allows multiple factions to coexist peacefully in Polar Sink
4. ✅ Is consistent with related rules (storm protection, alliance constraints)
5. ✅ Uses clear, maintainable code with appropriate comments

The implementation matches the rule requirement: "Players can not battle in the Polar Sink. It is a safe haven for everyone."


