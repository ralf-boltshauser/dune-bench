# Rule 08: Battle Resolution Verification

## Rule Reference

**Source**: `handwritten-rules/battle.md` lines 18-19

```
BATTLE RESOLUTION: The winner is the player with the higher total of number dialed on the Battle Wheel, plus their leader's fighting strength if applicable. -1.14.11
NO TIES: In the case of a tie, the Aggressor wins the battle.
```

## Implementation Location

**File**: `src/lib/game/rules/combat.ts`  
**Function**: `resolveBattle()` (lines 493-629)

## Verification Results

### ✅ Winner Determination: Forces Dialed + Leader Strength

**Rule Requirement**: Winner is determined by "higher total of number dialed on the Battle Wheel, plus their leader's fighting strength if applicable."

**Implementation** (lines 542-584):

```542:584:src/lib/game/rules/combat.ts
  // Calculate totals
  const aggressorLeaderStrength = aggressorWeaponResult.leaderKilled
    ? 0
    : getLeaderStrength(aggressorPlan);
  const defenderLeaderStrength = defenderWeaponResult.leaderKilled
    ? 0
    : getLeaderStrength(defenderPlan);

  // Calculate effective force strength (accounts for elite forces worth 2x)
  const aggressorBaseForceStrength = calculateForcesDialedStrength(
    state,
    aggressor,
    territoryId,
    aggressorPlan.forcesDialed,
    defender
  );
  const defenderBaseForceStrength = calculateForcesDialedStrength(
    state,
    defender,
    territoryId,
    defenderPlan.forcesDialed,
    aggressor
  );

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

  const aggressorTotal = aggressorForceStrength + aggressorLeaderStrength +
    (aggressorPlan.kwisatzHaderachUsed && !aggressorWeaponResult.leaderKilled ? 2 : 0);
  const defenderTotal = defenderForceStrength + defenderLeaderStrength;
```

**Analysis**:
- ✅ Forces dialed strength is calculated via `calculateForcesDialedStrength()` which accounts for:
  - Base force count from `forcesDialed`
  - Elite forces (Sardaukar/Fedaykin) worth 2x in battle
  - Special case: Sardaukar vs Fremen (only 1x)
- ✅ Spice dialing (advanced rules) is applied via `calculateSpicedForceStrength()`:
  - Unspiced forces count at half strength (0.5x)
  - Fremen forces always count at full strength (Battle Hardened ability)
- ✅ Leader strength is added via `getLeaderStrength()`:
  - Returns 0 if leader was killed by weapon (`aggressorWeaponResult.leaderKilled`)
  - Returns 0 if Cheap Hero was used
  - Returns leader's actual strength otherwise
- ✅ Total calculation: `forceStrength + leaderStrength` matches the rule requirement

**Status**: ✅ **CORRECT** - Implementation correctly calculates total as forces dialed (with modifiers) plus leader strength.

### ✅ Tie-Breaking: Aggressor Wins Ties

**Rule Requirement**: "In the case of a tie, the Aggressor wins the battle."

**Implementation** (lines 586-589):

```586:589:src/lib/game/rules/combat.ts
  // Determine winner (aggressor wins ties)
  const aggressorWins = aggressorTotal >= defenderTotal;
  const winner = aggressorWins ? aggressor : defender;
  const loser = aggressorWins ? defender : aggressor;
```

**Analysis**:
- ✅ The comparison uses `>=` (greater than or equal), which means:
  - If `aggressorTotal > defenderTotal`: Aggressor wins ✅
  - If `aggressorTotal == defenderTotal`: Aggressor wins (tie goes to aggressor) ✅
  - If `aggressorTotal < defenderTotal`: Defender wins ✅
- ✅ Comment explicitly states "aggressor wins ties"
- ✅ Winner/loser assignment correctly follows the comparison

**Status**: ✅ **CORRECT** - Implementation correctly gives ties to the aggressor.

## Additional Implementation Details

### Leader Strength Calculation

The `getLeaderStrength()` function (lines 634-638) handles:
- Cheap Hero: Returns 0 (Cheap Hero has zero strength)
- No leader: Returns 0
- Valid leader: Returns the leader's strength from definition

### Forces Dialed Strength Calculation

The `calculateForcesDialedStrength()` function (lines 646-674) handles:
- Elite forces (Sardaukar/Fedaykin) count as 2x
- Special case: Emperor Sardaukar vs Fremen count as 1x
- Regular forces count as 1x
- Assumes elite forces are dialed first (most valuable)

### Spice Dialing (Advanced Rules)

The `calculateSpicedForceStrength()` function (lines 694-724) handles:
- Basic rules: No spice dialing, returns base strength
- Advanced rules: Unspiced forces count at half strength
- Fremen exception: Always full strength (Battle Hardened)

### Special Cases Handled

1. **Kwisatz Haderach Bonus**: Atreides can add +2 to their total if Kwisatz Haderach is used and leader survives (line 583)
2. **Weapon Kills**: Leader strength is set to 0 if killed by weapon (lines 543-548)
3. **Cheap Hero**: Returns 0 strength (line 635)

## Edge Cases Verified

1. ✅ **Equal totals**: Aggressor wins (tie-breaking works)
2. ✅ **Leader killed by weapon**: Leader strength correctly set to 0
3. ✅ **No leader**: Leader strength correctly set to 0
4. ✅ **Cheap Hero**: Leader strength correctly set to 0
5. ✅ **Elite forces**: Correctly counted as 2x (or 1x for Sardaukar vs Fremen)
6. ✅ **Spice dialing**: Unspiced forces count at half strength (advanced rules)
7. ✅ **Fremen Battle Hardened**: Always full strength without spice

## Summary

| Aspect | Rule Requirement | Implementation | Status |
|--------|------------------|----------------|--------|
| Winner calculation | Forces dialed + leader strength | `forceStrength + leaderStrength` | ✅ Correct |
| Tie-breaking | Aggressor wins ties | `aggressorTotal >= defenderTotal` | ✅ Correct |
| Leader killed by weapon | Leader strength = 0 | `leaderKilled ? 0 : getLeaderStrength()` | ✅ Correct |
| Elite forces | Count as 2x (or 1x vs Fremen) | `calculateForcesDialedStrength()` | ✅ Correct |
| Spice dialing | Unspiced = half strength | `calculateSpicedForceStrength()` | ✅ Correct |

## Conclusion

**✅ VERIFIED**: The implementation correctly implements Battle Resolution from `handwritten-rules/battle.md` lines 18-19:

1. ✅ Winner is determined by higher total of forces dialed plus leader strength
2. ✅ Aggressor wins ties (using `>=` comparison operator)

The implementation properly accounts for:
- Elite force multipliers
- Spice dialing (advanced rules)
- Weapon/defense interactions that kill leaders
- Special faction abilities (Kwisatz Haderach, Battle Hardened)
- Edge cases (no leader, Cheap Hero, etc.)

**No issues found** - Implementation matches the rule requirements.


