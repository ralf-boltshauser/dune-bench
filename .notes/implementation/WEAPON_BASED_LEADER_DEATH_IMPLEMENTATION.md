# Weapon-Based Leader Death Implementation

## Summary

Implemented proper weapon-based leader death handling in the battle resolution system, fixing the incorrect behavior where the loser's leader would always die.

## Changes Made

### File Modified
- `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/src/lib/game/phases/handlers/battle.ts`

### What Was Fixed

**Previous (Incorrect) Behavior:**
- The `applyBattleResult` method had code that automatically killed the loser's leader in every battle (lines 1312-1325)
- This violated Dune rules: leaders can ONLY die from weapons or lasgun-shield explosions, NOT from losing battles

**New (Correct) Behavior:**
- Removed the buggy "loser's leader always dies" code
- Added proper weapon-based leader death handling using the `leaderKilled` flags from `resolveBattle`
- Both sides' leaders can now die from weapons, regardless of who won the battle
- Clear documentation explains the correct rule

### Implementation Details

The new code (lines 1300-1340):

```typescript
// ===========================================================================
// LEADER DEATHS FROM WEAPONS
// ===========================================================================
// IMPORTANT: Leaders can ONLY die from weapons (or lasgun-shield explosion),
// NOT from losing the battle.
// The resolveBattle function in combat.ts correctly calculates leaderKilled
// flags based on weapon/defense resolution. We handle both sides' leader
// deaths here, regardless of who won.
// Dead leaders don't contribute to battle strength (already accounted for in resolveBattle).

// Handle aggressor's leader death from weapons
if (result.aggressorResult.leaderKilled && battle.aggressorPlan?.leaderId) {
  newState = killLeader(newState, battle.aggressor, battle.aggressorPlan.leaderId);
  events.push({
    type: 'LEADER_KILLED',
    data: {
      faction: battle.aggressor,
      leaderId: battle.aggressorPlan.leaderId,
      killedBy: 'weapon'
    },
    message: `${battle.aggressor}'s leader ${battle.aggressorPlan.leaderId} killed by weapon`,
  });

  // Check for Prison Break after leader death
  newState = this.checkPrisonBreak(newState, battle.aggressor, events);
}

// Handle defender's leader death from weapons
if (result.defenderResult.leaderKilled && battle.defenderPlan?.leaderId) {
  newState = killLeader(newState, battle.defender, battle.defenderPlan.leaderId);
  events.push({
    type: 'LEADER_KILLED',
    data: {
      faction: battle.defender,
      leaderId: battle.defenderPlan.leaderId,
      killedBy: 'weapon'
    },
    message: `${battle.defender}'s leader ${battle.defenderPlan.leaderId} killed by weapon`,
  });

  // Check for Prison Break after leader death
  newState = this.checkPrisonBreak(newState, battle.defender, events);
}
```

### Key Features

1. **Rule Compliance**: Leaders only die from weapons (poison, projectile) or lasgun-shield explosions, never from losing
2. **Symmetric Handling**: Both aggressor and defender leaders are checked for weapon deaths
3. **Proper Integration**: Uses the `leaderKilled` flags from `resolveBattle` in `combat.ts`
4. **Prison Break Support**: Checks for Prison Break rule after each leader death
5. **Event Tracking**: Emits `LEADER_KILLED` events with `killedBy: 'weapon'` for clarity
6. **Correct Ordering**: Leader deaths are handled BEFORE force loss calculations

### How It Works

1. The `resolveBattle` function in `combat.ts` determines weapon effectiveness:
   - Calculates `aggressorWeaponResult.leaderKilled` and `defenderWeaponResult.leaderKilled`
   - Based on weapon type (poison/projectile) and defense effectiveness
   - Sets leader strength to 0 if killed by weapon

2. The `applyBattleResult` method in `battle.ts` applies the deaths:
   - Checks `result.aggressorResult.leaderKilled` flag
   - Checks `result.defenderResult.leaderKilled` flag
   - Kills leaders using `killLeader` mutation
   - Emits events and checks for Prison Break

3. Force losses are calculated separately:
   - Loser's forces still all go to tanks
   - Winner's forces are reduced by the dial amount
   - Leader deaths don't affect force calculations

### Testing

- No new TypeScript errors introduced
- Pre-existing errors in battle.ts are unrelated to this change
- Changes are in lines 1300-1340, which have no compilation errors

### Related Code

- `src/lib/game/rules/combat.ts`: Contains weapon/defense resolution logic
- `src/lib/game/state/mutations.ts`: Contains `killLeader` function
- `src/lib/game/phases/handlers/battle.ts`: Battle phase handler (this file)

## Verification

Run type check:
```bash
npx tsc --noEmit
```

Check git diff:
```bash
git diff src/lib/game/phases/handlers/battle.ts
```
