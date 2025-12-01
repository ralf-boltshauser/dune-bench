# Rule 09: Weapons and Defense Interaction

## Source Rule

From `handwritten-rules/battle.md` lines 20-21:

> **WEAPONS**: Check to see if your opponent protected their leader from your weapon with the proper Defense, if they did not, do not add their leader's fighting strength to their number dialed. Next, see if your weapon affects your leader, if it does check to see if you played the proper Defense, if not do not add your leader's fighting strength to your number dialed.
>
> **Note**: Some weapons may not kill leaders but still make the leader's fighting strength nonapplicable.

## Verification Checklist

### 1. Weapons Kill Leaders Unless Proper Defense is Played

**Rule Requirement**: If a weapon is played and the opponent does not have the proper defense, the leader is killed.

**Implementation Location**: `src/lib/game/rules/combat.ts` - `resolveWeaponDefense()` function (lines 735-777)

**Code Analysis**:

```735:777:src/lib/game/rules/combat.ts
function resolveWeaponDefense(
  weaponCardId: string | null,
  defenseCardId: string | null,
  targetLeaderId: string | null
): WeaponDefenseResult {
  if (!weaponCardId || !targetLeaderId) {
    return { leaderKilled: false, weaponEffective: false, defenseEffective: false };
  }

  const weapon = getTreacheryCardDefinition(weaponCardId);
  const defense = defenseCardId ? getTreacheryCardDefinition(defenseCardId) : null;

  if (!weapon || isWorthless(weapon)) {
    return { leaderKilled: false, weaponEffective: false, defenseEffective: false };
  }

  // Lasgun has no defense (except causes explosion with shield)
  if (weapon.type === TreacheryCardType.WEAPON_SPECIAL) {
    return { leaderKilled: true, weaponEffective: true, defenseEffective: false };
  }

  // Check if defense matches weapon type
  // Special case: Ellaca Drug is a poison weapon but defended by projectile defense
  const isEllacaDrug = weaponCardId === 'ellaca_drug';
  const isProjectileWeapon = weapon.type === TreacheryCardType.WEAPON_PROJECTILE || isEllacaDrug;
  const isPoisonWeapon = weapon.type === TreacheryCardType.WEAPON_POISON && !isEllacaDrug;

  let defenseEffective = false;
  if (defense && !isWorthless(defense)) {
    if (isProjectileWeapon && defense.type === TreacheryCardType.DEFENSE_PROJECTILE) {
      defenseEffective = true;
    }
    if (isPoisonWeapon && defense.type === TreacheryCardType.DEFENSE_POISON) {
      defenseEffective = true;
    }
  }

  return {
    leaderKilled: !defenseEffective,
    weaponEffective: !defenseEffective,
    defenseEffective,
  };
}
```

**Verification**: ✅ **CORRECT**

- The function correctly checks if a proper defense is played (matching weapon type)
- If defense is effective, `leaderKilled = false`
- If defense is not effective (or not played), `leaderKilled = true`
- Special case: Lasgun (WEAPON_SPECIAL) always kills (no defense possible, except explosion)
- Special case: Ellaca Drug (poison weapon) is correctly defended by projectile defense

**Weapon/Defense Matching**:
- Projectile weapons (Crysknife, Maula Pistol, Slip Tip, Stunner) → Projectile Defense (Shield)
- Poison weapons (Chaumas, Chaumurky, Gom Jabbar) → Poison Defense (Snooper)
- Ellaca Drug (poison weapon) → Projectile Defense (Shield) - special case
- Lasgun (special weapon) → No defense (always kills, except causes explosion with Shield)

---

### 2. Leader Strength Not Added When Leader is Killed or Affected by Weapon

**Rule Requirement**: When a leader is killed by a weapon (or affected by a weapon that makes strength nonapplicable), their fighting strength should not be added to the battle total.

**Implementation Location**: `src/lib/game/rules/combat.ts` - `resolveBattle()` function (lines 542-548)

**Code Analysis**:

```542:548:src/lib/game/rules/combat.ts
  // Calculate totals
  const aggressorLeaderStrength = aggressorWeaponResult.leaderKilled
    ? 0
    : getLeaderStrength(aggressorPlan);
  const defenderLeaderStrength = defenderWeaponResult.leaderKilled
    ? 0
    : getLeaderStrength(defenderPlan);
```

**Verification**: ✅ **CORRECT**

- If `leaderKilled` is true, leader strength is set to 0
- If `leaderKilled` is false, leader strength is calculated normally via `getLeaderStrength()`
- This applies to both aggressor and defender symmetrically
- The leader strength is excluded from the battle total calculation (lines 582-584)

**Battle Total Calculation**:

```582:584:src/lib/game/rules/combat.ts
  const aggressorTotal = aggressorForceStrength + aggressorLeaderStrength +
    (aggressorPlan.kwisatzHaderachUsed && !aggressorWeaponResult.leaderKilled ? 2 : 0);
  const defenderTotal = defenderForceStrength + defenderLeaderStrength;
```

- Dead leaders contribute 0 to the total
- Kwisatz Haderach bonus (+2) is also correctly excluded when leader is killed

---

### 3. Some Weapons Make Leader Strength Nonapplicable Without Killing

**Rule Requirement**: The rule note states "Some weapons may not kill leaders but still make the leader's fighting strength nonapplicable."

**Implementation Analysis**:

Looking at the current implementation:

```772:776:src/lib/game/rules/combat.ts
  return {
    leaderKilled: !defenseEffective,
    weaponEffective: !defenseEffective,
    defenseEffective,
  };
```

**Current Behavior**: 
- `weaponEffective` and `leaderKilled` are always the same value (`!defenseEffective`)
- If a weapon is effective, the leader is killed
- There is no case where a weapon is effective but doesn't kill the leader

**Weapon Definitions Check**:

All weapons in `src/lib/game/data/treachery-cards.ts` are defined as:
- Projectile weapons: "Kills opponent's leader. Opponent may protect with Projectile Defense."
- Poison weapons: "Kills opponent's leader. Opponent may protect with Poison Defense."
- Lasgun: "Kills opponent's leader. No defense."

**Verification**: ⚠️ **NOT IMPLEMENTED** (but no such weapon exists in base game)

**Analysis**:
- The rule note suggests there might be weapons that make leader strength nonapplicable without killing
- However, no such weapon exists in the base game (all weapons kill leaders)
- The current implementation only checks `leaderKilled` to determine if strength should be 0
- If such a weapon were added in the future, the code would need to be updated to check `weaponEffective` separately from `leaderKilled`

**Potential Future Implementation**:

If a weapon that makes strength nonapplicable without killing were to be added, the code would need to be updated:

```typescript
// Hypothetical future implementation
const aggressorLeaderStrength = 
  (aggressorWeaponResult.leaderKilled || aggressorWeaponResult.weaponEffective)
    ? 0
    : getLeaderStrength(aggressorPlan);
```

However, since no such weapon exists in the current game, this is not a bug - it's simply not applicable to the current rule set.

---

## Additional Verification: Bidirectional Weapon Resolution

**Rule Requirement**: The rule states "Check to see if your opponent protected their leader from your weapon" AND "see if your weapon affects your leader" - weapons can affect both sides.

**Implementation Location**: `src/lib/game/rules/combat.ts` - `resolveBattle()` function (lines 517-527)

**Code Analysis**:

```517:527:src/lib/game/rules/combat.ts
  // Resolve weapon/defense for each side
  const aggressorWeaponResult = resolveWeaponDefense(
    aggressorPlan.weaponCardId,
    defenderPlan.defenseCardId,
    defenderPlan.leaderId
  );
  const defenderWeaponResult = resolveWeaponDefense(
    defenderPlan.weaponCardId,
    aggressorPlan.defenseCardId,
    aggressorPlan.leaderId
  );
```

**Verification**: ✅ **CORRECT**

- Aggressor's weapon is checked against defender's leader and defense
- Defender's weapon is checked against aggressor's leader and defense
- Both sides can have their leaders killed by the opponent's weapon
- Both sides' leader strengths are correctly excluded if killed

---

## Summary

| Requirement | Status | Notes |
|------------|--------|-------|
| Weapons kill leaders unless proper defense is played | ✅ **CORRECT** | Properly implemented with correct weapon/defense matching |
| Leader strength not added when killed by weapon | ✅ **CORRECT** | Leader strength set to 0 when `leaderKilled = true` |
| Leader strength not added when affected by weapon | ✅ **CORRECT** | Currently same as killed (no distinction needed) |
| Some weapons make strength nonapplicable without killing | ⚠️ **N/A** | No such weapon exists in base game; would need code update if added |
| Bidirectional weapon resolution | ✅ **CORRECT** | Both sides' weapons checked against opponent's leader |

## Conclusion

The implementation correctly handles weapon and defense interactions according to the rules. The only note about weapons making strength nonapplicable without killing is not applicable to the current game, as all weapons in the base game kill leaders when effective. If such a weapon were added in a variant or expansion, the code would need to be updated to distinguish between `weaponEffective` and `leaderKilled`.





