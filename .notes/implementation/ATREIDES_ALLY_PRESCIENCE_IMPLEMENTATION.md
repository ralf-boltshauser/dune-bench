# Atreides Ally Prescience Implementation

## Summary
Implemented the ability for Atreides to use prescience in their ally's battles, as per the official rules.

## Rule Reference
From `battle.md` line 58:
> "ALLIANCE: In your ally's battle you may use ability Prescience [2.01.08] on your ally's opponent."

## Files Modified

### 1. `/src/lib/game/phases/types.ts`
- **Added field**: `prescienceOpponent: Faction | null` to `CurrentBattle` interface
- **Purpose**: Track which faction's battle plan is being viewed with prescience (could be Atreides' direct opponent OR their ally's opponent)

### 2. `/src/lib/game/phases/handlers/battle.ts`

#### Import Updates
- Added `getAlly` import from `'../../state'`

#### Battle Initialization (lines 277-292)
- Added `prescienceOpponent: null` field initialization in currentBattle object

#### Prescience Check Logic (lines 310-329)
**Before**: Only checked if Atreides was directly in battle
```typescript
const atreidesInBattle = aggressor === Faction.ATREIDES || defender === Faction.ATREIDES;
if (atreidesInBattle) {
  return this.requestPrescience(state, events);
}
```

**After**: Now checks for both direct participation AND ally participation
```typescript
const atreidesInBattle = aggressor === Faction.ATREIDES || defender === Faction.ATREIDES;
const atreidesAlly = getAlly(state, Faction.ATREIDES);
const allyInBattle = atreidesAlly && (aggressor === atreidesAlly || defender === atreidesAlly);

if (atreidesInBattle || allyInBattle) {
  // Determine opponent to use prescience against
  let prescienceTarget: Faction;
  if (atreidesInBattle) {
    prescienceTarget = aggressor === Faction.ATREIDES ? defender : aggressor;
  } else {
    // Ally's battle - target is ally's opponent
    prescienceTarget = aggressor === atreidesAlly ? defender : aggressor;
  }
  
  this.context.subPhase = BattleSubPhase.PRESCIENCE_OPPORTUNITY;
  return this.requestPrescience(state, events, prescienceTarget);
}
```

#### requestPrescience Method (lines 340-376)
- **Added parameter**: `prescienceTarget: Faction` to explicitly pass the opponent
- **Enhanced prompt**: Different message for ally battles vs. direct battles
```typescript
let promptMessage = `Use prescience to see one element of ${prescienceTarget}'s battle plan?`;
if (isAllyBattle && !atreidesInBattle) {
  promptMessage = `Your ally ${atreidesAlly} is in battle against ${prescienceTarget}. Use prescience on your ally's opponent?`;
}
```
- **Added context**: `allyBattle` and `ally` fields to help the AI agent understand the situation

#### processPrescience Method (lines 385-415)
**Before**: Simple logic assuming Atreides is in battle
```typescript
const isAggressor = battle.aggressor === Faction.ATREIDES;
battle.prescienceOpponent = isAggressor ? battle.defender : battle.aggressor;
```

**After**: Handles both direct and ally battles
```typescript
const atreidesInBattle = battle.aggressor === Faction.ATREIDES || battle.defender === Faction.ATREIDES;
if (atreidesInBattle) {
  // Atreides is in battle, viewing their opponent
  battle.prescienceOpponent = battle.aggressor === Faction.ATREIDES ? battle.defender : battle.aggressor;
} else {
  // Atreides' ally is in battle, viewing ally's opponent
  const atreidesAlly = getAlly(state, Faction.ATREIDES);
  battle.prescienceOpponent = battle.aggressor === atreidesAlly ? battle.defender : battle.aggressor;
}
```

- **Improved message**: Now includes the opponent's name: `Atreides uses prescience to see ${battle.prescienceOpponent}'s ${response.data.target}`

## How It Works

1. **Battle Start**: When a battle is initiated, the system checks if Atreides can use prescience
2. **Ally Check**: If Atreides isn't in the battle, check if their ally is
3. **Target Identification**: Determine which faction's plan to view (ally's opponent)
4. **Request**: Prompt Atreides with appropriate context about the ally battle
5. **Process**: When Atreides uses prescience, store the correct opponent faction
6. **Reveal**: The existing prescience reveal mechanism shows the chosen element from the correct opponent's plan

## Testing Scenario

To test this feature:
1. Form an alliance between Atreides and another faction (e.g., Fremen)
2. Have Fremen engage in a battle (without Atreides forces present)
3. Atreides should be offered the opportunity to use prescience on Fremen's opponent
4. If Atreides chooses to use prescience, they should see one element of the opponent's battle plan
5. The prescience result should correctly identify which faction's plan was viewed

## Edge Cases Handled

- ✅ Atreides in battle directly (original functionality preserved)
- ✅ Atreides' ally in battle (new functionality)
- ✅ No alliance (prescience only offered if Atreides is in battle)
- ✅ Multiple factions in battle (prescience targets the ally's specific opponent)
- ✅ Proper opponent identification for prescience reveal phase

## Compatibility

This implementation:
- Preserves all existing prescience functionality
- Adds no breaking changes
- Maintains type safety
- Follows the existing code patterns and architecture
