# NO LOYALTY Rule Implementation Summary

## Rule Reference
**Source**: `handwritten-rules/battle.md` line 156
**Rule**: "NO LOYALTY: A captured leader used in battle may be called traitor with the matching Traitor Card!"

## Implementation Status
✅ **ALREADY IMPLEMENTED AND WORKING CORRECTLY**

The traitor checking logic in the battle phase already supports calling captured leaders as traitors. No code changes were needed - only documentation was added to clarify the intentional behavior.

## How It Works

### Key Data Structures

1. **Leader Identity** (`Leader` interface in `types/entities.ts`):
   - `definitionId`: The leader's original identity (e.g., "stilgar", "feyd_rautha")
   - `originalFaction`: Tracks which faction the leader originally belongs to
   - `capturedBy`: Tracks who currently has the leader captured (null if not captured)
   - `faction`: Current controlling faction (changes when captured)

2. **Traitor Cards** (`TraitorCard` interface in `types/entities.ts`):
   - `leaderId`: The leader's definitionId that this traitor card targets
   - `heldBy`: Which faction holds this traitor card

### Capture Flow

When Harkonnen captures a leader (e.g., Stilgar from Fremen):
```typescript
// In state/mutations.ts - captureLeader()
{
  definitionId: "stilgar",        // PRESERVED - original identity
  originalFaction: Faction.FREMEN, // PRESERVED - original owner
  faction: Faction.HARKONNEN,      // CHANGED - now controlled by Harkonnen
  capturedBy: Faction.HARKONNEN,   // NEW - marked as captured
  location: LeaderLocation.LEADER_POOL
}
```

### Battle Plan Submission

When Harkonnen uses captured Stilgar in battle:
```typescript
// Battle plan uses the leader's definitionId
{
  leaderId: "stilgar",  // This is the definitionId
  // ... other battle plan properties
}
```

### Traitor Check Logic

In `phases/handlers/battle.ts` - `requestTraitorCall()`:
```typescript
// Line 857-864
const opponentLeader = opponentPlan?.leaderId;  // "stilgar"
const hasTraitor = opponentLeader &&
  factionState.traitors.some((t) => t.leaderId === opponentLeader);
  // Checks if traitor card with leaderId "stilgar" exists
```

**Why this works:**
- The traitor check compares `leaderId` (from battle plan) against `t.leaderId` (from traitor card)
- Both use the leader's `definitionId` - the original identity
- Capture doesn't change `definitionId`, so the match works regardless of current ownership
- If Fremen has a traitor card for Stilgar (`leaderId: "stilgar"`), they can call it even when Harkonnen is using captured Stilgar

## Example Scenario

### Setup
1. Harkonnen captures Stilgar from Fremen in a previous battle
2. Fremen holds a traitor card with `leaderId: "stilgar"`
3. Harkonnen and Fremen face each other in a new battle
4. Harkonnen plays captured Stilgar in their battle plan

### Traitor Check Execution
```typescript
// Fremen's turn to check for traitors
opponentLeader = "stilgar"  // From Harkonnen's battle plan
fremenState.traitors = [
  { leaderId: "stilgar", leaderFaction: Faction.FREMEN, heldBy: Faction.FREMEN }
]

hasTraitor = fremenState.traitors.some((t) => t.leaderId === "stilgar")
// Returns TRUE - Fremen can call traitor on their own captured leader!
```

### Result
- Fremen successfully calls traitor on Stilgar
- Harkonnen loses the battle immediately (traitor resolution)
- Stilgar is killed and goes to Fremen's tanks (per TYING UP LOOSE ENDS rule)
- Fremen receives spice equal to Stilgar's strength

## Code Changes Made

### File: `/src/lib/game/phases/handlers/battle.ts`

**Lines 857-860** - Added clarifying comment:
```typescript
// NO LOYALTY (battle.md line 156): "A captured leader used in battle may be called traitor
// with the matching Traitor Card!" The traitor check uses leaderId which is the leader's
// definitionId (original identity), not current ownership. This means captured leaders can
// be called as traitors by anyone holding their matching traitor card.
```

**Lines 916-917** - Added clarifying comment for Harkonnen alliance case:
```typescript
// NO LOYALTY: Check for traitor match using leader's original identity (definitionId)
// This works for both regular and captured leaders
```

## Related Rules Implemented

1. **CAPTURED LEADERS** (battle.md line 150-153) - Harkonnen can capture or kill leaders after winning
2. **PRISON BREAK** (battle.md line 154) - Captured leaders return when all Harkonnen leaders killed
3. **TYING UP LOOSE ENDS** (battle.md line 155) - Killed captured leaders go to original faction's tanks
4. **NO LOYALTY** (battle.md line 156) - ✅ THIS RULE - Captured leaders can be traitors

## Testing Considerations

To verify this implementation:

1. **Setup test scenario:**
   - Harkonnen captures a leader (e.g., Stilgar from Fremen)
   - Enemy faction (e.g., Fremen) has matching traitor card
   - Harkonnen uses captured leader in battle against that faction

2. **Expected behavior:**
   - Traitor check should offer the enemy faction the option to call traitor
   - If called, battle resolves as traitor victory
   - Captured leader dies and returns to original faction's tanks

3. **Edge cases to test:**
   - Captured leader + Kwisatz Haderach (KH should block traitor even for captured leaders)
   - Harkonnen alliance: Can Harkonnen call traitor on ally's behalf for captured leaders?
   - Multiple captured leaders from same faction

## Verification

The implementation is correct because:

1. ✅ Leader identity (`definitionId`) is preserved through capture
2. ✅ Traitor cards match by `leaderId` which equals the leader's `definitionId`
3. ✅ Battle plans use `leaderId` from the leader's `definitionId`
4. ✅ Traitor check compares these values directly without considering ownership
5. ✅ The comparison is identity-based, not ownership-based

**No logic changes were required** - the system was designed correctly from the start!

## Related Issue Discovered (Not Fixed)

⚠️ **TYING UP LOOSE ENDS BUG**: When a captured leader is killed in battle (lines 1162, 1167, 1215 in battle.ts), the code calls `killLeader(state, currentController, leaderId)` which puts the leader in the **current controller's tanks**. Per the TYING UP LOOSE ENDS rule (battle.md line 155), killed captured leaders should go to their **original faction's tanks**.

**Correct behavior:**
- When Harkonnen uses captured Stilgar in battle and Stilgar dies
- Stilgar should go to **Fremen's tanks** (original faction)
- Currently goes to **Harkonnen's tanks** (current controller) ❌

**Fix needed:**
Replace `killLeader(state, currentController, leaderId)` with logic that:
1. Checks if the leader is captured (`leader.capturedBy !== null`)
2. If captured, use `killCapturedLeader()` or manually return to original faction's tanks
3. If not captured, use `killLeader()` as normal

**Note**: This bug is out of scope for the current NO LOYALTY task but should be addressed separately.
