# Leader Death Scenarios - Implementation Verification

## Overview
This document verifies that the weapon-based leader death implementation correctly handles all battle scenarios.

## Scenarios Covered

### 1. Normal Battle (No Traitors)
**Rule**: Leaders can only die from weapons, not from losing.

**Implementation in `combat.ts`** (lines 516-548):
- Calculates `aggressorWeaponResult.leaderKilled` based on weapon/defense
- Calculates `defenderWeaponResult.leaderKilled` based on weapon/defense
- Sets leader strength to 0 if killed by weapon

**Implementation in `battle.ts`** (lines 1308-1340):
- Checks `result.aggressorResult.leaderKilled` flag
- Checks `result.defenderResult.leaderKilled` flag
- Kills leaders using `killLeader` only if flag is true
- Works for both winner and loser

**Verification**: ✅ Correct - leaders only die if killed by weapons, regardless of battle outcome

---

### 2. Single Traitor Battle
**Rule**: When a traitor is revealed, the traitor leader is killed.

**Implementation in `combat.ts`** (line 910):
```typescript
leaderKilled: true, // Traitor leader is killed
```

**Implementation in `battle.ts`** (lines 1308-1340):
- Uses the `leaderKilled` flag from battle result
- Will correctly kill the traitor leader
- Winner's leader survives (leaderKilled: false)

**Verification**: ✅ Correct - traitor leader death is handled through the leaderKilled flag

---

### 3. Two Traitors Battle
**Rule**: Both leaders are traitors for each other - both leaders die.

**Implementation in `combat.ts`** (line 971, 990):
```typescript
leaderKilled: !!aggressorPlan.leaderId, // Both leaders are killed
// ...
leaderKilled: !!defenderPlan.leaderId, // Both leaders are killed
```

**Implementation in `battle.ts`** (lines 1308-1340):
- Checks both `aggressorResult.leaderKilled` and `defenderResult.leaderKilled`
- Will kill both leaders if both flags are true
- Handles symmetric case correctly

**Verification**: ✅ Correct - both leaders die through their respective leaderKilled flags

---

### 4. Lasgun-Shield Explosion
**Rule**: Explosion kills all forces and both leaders.

**Implementation in `battle.ts`** (lines 1262-1284):
- Separate code path for lasgun-shield explosions
- Already correctly kills both leaders
- Happens before weapon-based leader death checks

**Verification**: ✅ Correct - handled separately before normal resolution

---

### 5. Weapon Kills Winner's Leader
**Rule**: Even the winner's leader can die from weapons.

**Example**: Atreides attacks with Duke Leto and a poison defense. Harkonnen attacks with poison weapon. Duke Leto dies even if Atreides wins.

**Implementation in `combat.ts`** (lines 523-527):
```typescript
const defenderWeaponResult = resolveWeaponDefense(
  defenderPlan.weaponCardId,  // Harkonnen's poison weapon
  aggressorPlan.defenseCardId, // Atreides' poison defense (ineffective)
  aggressorPlan.leaderId       // Duke Leto
);
```

**Implementation in `battle.ts`** (lines 1308-1323):
- Explicitly checks aggressor's leaderKilled flag
- Not dependent on battle outcome
- Will kill leader even if aggressor won

**Verification**: ✅ Correct - winner's leader can die from weapons

---

### 6. No Leader Used
**Rule**: If no leader is used, no leader can die.

**Implementation in `battle.ts`** (lines 1309, 1326):
```typescript
if (result.aggressorResult.leaderKilled && battle.aggressorPlan?.leaderId) {
  // Only executes if leader exists
}
```

**Verification**: ✅ Correct - checks for leaderId existence before killing

---

### 7. Cheap Hero
**Rule**: Cheap Hero (worthless card) doesn't count as a leader.

**Implementation in `combat.ts`** (line 726):
```typescript
// No leader played - nothing to kill
return { leaderKilled: false, weaponEffective: false, defenseEffective: false };
```

**Implementation in `battle.ts`** (lines 1309, 1326):
- Will not kill if no leaderId in plan
- Cheap Hero doesn't set leaderId

**Verification**: ✅ Correct - Cheap Hero is not affected by weapon deaths

---

### 8. Prison Break
**Rule**: When all your own leaders are killed, return all captured leaders.

**Implementation in `battle.ts`** (lines 1322, 1339):
```typescript
// Check for Prison Break after leader death
newState = this.checkPrisonBreak(newState, battle.aggressor, events);
```

**Verification**: ✅ Correct - Prison Break is checked after each leader death

---

## Edge Cases Covered

### Defense Blocks Weapon
- Weapon doesn't kill leader if defense is effective
- `leaderKilled: false` in weapon result
- Leader survives

### Both Sides Use Weapons
- Each side's weapon/defense is resolved independently
- Both leaders could die, one could die, or neither could die
- Depends on weapon/defense effectiveness

### Kwisatz Haderach Protection
- KH protects leader from being called as traitor
- Not related to weapon deaths
- Handled separately in traitor calling phase

## Summary

The implementation correctly handles all battle scenarios by:

1. **Using flags from combat.ts**: The `leaderKilled` flags are calculated correctly in `resolveBattle`
2. **Symmetric handling**: Both aggressor and defender are checked equally
3. **Order independence**: Leader deaths happen before force calculations
4. **Rule compliance**: Leaders only die from weapons/traitors/explosions, never from losing
5. **Prison Break integration**: Checked after each leader death

✅ **All scenarios verified correct**
