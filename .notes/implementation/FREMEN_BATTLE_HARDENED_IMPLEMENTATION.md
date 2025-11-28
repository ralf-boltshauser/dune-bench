# Fremen Battle Hardened Implementation

## Summary

Implemented the Fremen **BATTLE HARDENED** ability for spice dialing in advanced rules. Fremen forces always count at full strength in battle without requiring spice payment.

## Rule Reference

From `handwritten-rules/battle.md` line 138:
```
✷BATTLE HARDENED: Your Forces do not require spice to count at full strength in battles.
```

From `handwritten-rules/battle.md` lines 40-42:
```
SPICE DIALING: Each Force used in a battle is valued at its full strength if 1 spice is paid to support it.
Spice now plays an important role in the combat procedure. When using spice dialing:
UNSPICED FORCES: A Force used in a battle that is not supported by 1 spice is valued at half strength.
```

## Implementation Details

### Files Modified

1. **`/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/rules/combat.ts`**
   - Added `calculateSpicedForceStrength()` function to handle spice dialing
   - Integrated into `resolveBattle()` to apply spice dialing when advanced rules are enabled
   - Fremen forces bypass spice requirement and always get full strength

2. **`/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/agent/prompts.ts`**
   - Added "Battle Hardened" to Fremen advantages list
   - Helps the AI agent understand this strategic advantage

### Code Structure

```typescript
/**
 * Calculate effective battle strength considering spice dialing (advanced rules).
 *
 * FREMEN EXCEPTION: Fremen forces always count at full strength without spice.
 */
export function calculateSpicedForceStrength(
  faction: Faction,
  baseForceStrength: number,
  forcesDialed: number,
  spiceDialed: number,
  advancedRules: boolean
): number {
  // If advanced rules are not enabled, spice dialing doesn't apply
  if (!advancedRules) return baseForceStrength;

  // BATTLE HARDENED: Fremen don't need spice for full strength
  if (faction === Faction.FREMEN) {
    return baseForceStrength; // Full strength always, no spice needed
  }

  // Other factions: spiced forces at 1x, unspiced at 0.5x
  const spicedForces = Math.min(spiceDialed, forcesDialed);
  const unspicedForces = forcesDialed - spicedForces;

  const spicedProportion = forcesDialed > 0 ? spicedForces / forcesDialed : 0;
  const unspicedProportion = forcesDialed > 0 ? unspicedForces / forcesDialed : 0;

  return (baseForceStrength * spicedProportion) + (baseForceStrength * unspicedProportion * 0.5);
}
```

### Integration

The function is called in `resolveBattle()` after calculating base force strength (which accounts for elite forces):

```typescript
// Calculate effective force strength (accounts for elite forces worth 2x)
const aggressorBaseForceStrength = calculateForcesDialedStrength(...);
const defenderBaseForceStrength = calculateForcesDialedStrength(...);

// Apply spice dialing (advanced rules) - Fremen always get full strength
const aggressorForceStrength = calculateSpicedForceStrength(
  aggressor,
  aggressorBaseForceStrength,
  aggressorPlan.forcesDialed,
  aggressorPlan.spiceDialed,
  state.config.advancedRules
);
const defenderForceStrength = calculateSpicedForceStrength(
  defender,
  defenderBaseForceStrength,
  defenderPlan.forcesDialed,
  defenderPlan.spiceDialed,
  state.config.advancedRules
);
```

## Test Results

Created comprehensive test suite in `src/lib/game/test-fremen-battle-hardened.ts`:

✅ **All 7 tests passed:**

1. Fremen with 10 forces, 0 spice → Full strength (10)
2. Atreides with 10 forces, 0 spice → Half strength (5)
3. Atreides with 10 forces, 10 spice → Full strength (10)
4. Harkonnen with 10 forces, 5 spice → Mixed strength (7.5)
5. Basic rules (no spice dialing) → Full strength (10)
6. Fremen elite forces, 0 spice → Full elite strength (20)
7. Emperor elite forces, 0 spice → Half elite strength (10)

## Strategic Impact

### For Fremen Players
- **Massive economic advantage** in battles - save all spice
- Can dial full forces without spice cost penalty
- Makes Fremen extremely strong in advanced rules
- Elite Fedaykin get full 2x strength without spice

### For Opponents
- Must spend 1 spice per force or suffer 50% penalty
- Fighting Fremen is expensive in advanced rules
- Cannot economically compete with Fremen in prolonged battles

## Future Considerations

### When Full Spice Dialing is Implemented
The current implementation is ready for full spice dialing. No changes needed when:
- Battle phase adds spice payment from reserves
- Spice is deducted and sent to the bank
- Battle tools enforce spice availability

### Related Abilities
Other faction abilities may interact with spice dialing:
- Emperor's Sardaukar (elite forces) still need spice for full strength
- Harkonnen's treachery doesn't affect spice requirements
- Guild may have shipping cost interactions (not battle-related)

## Verification

Run test suite:
```bash
npx tsx src/lib/game/test-fremen-battle-hardened.ts
```

All tests should pass with clear output showing:
- Fremen get full strength without spice
- Other factions need spice or suffer 50% penalty
- Elite forces work correctly with spice dialing
- Basic rules ignore spice dialing

## References

- Rule source: `handwritten-rules/battle.md` lines 40-42, 138
- Advanced rules config: `state.config.advancedRules`
- Spice dial constant: `GAME_CONSTANTS.ADVANCED_SPICE_DIAL_COST = 1`
- Battle plan type: `BattlePlan.spiceDialed` field already exists
