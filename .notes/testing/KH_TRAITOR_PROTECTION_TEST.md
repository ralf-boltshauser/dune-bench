# Kwisatz Haderach Traitor Protection - Implementation Summary

## Overview
Implemented the Atreides Loyalty rule: **A leader accompanied by Kwisatz Haderach cannot turn traitor** (battle.md line 61).

## Changes Made

### 1. Updated `/src/lib/game/phases/handlers/battle.ts`

Modified the `requestTraitorCall` method (lines 623-676) to check if the opponent is using Kwisatz Haderach:

```typescript
// ATREIDES LOYALTY: A leader accompanied by Kwisatz Haderach cannot turn traitor
// (battle.md line 61: "A leader accompanied by Kwisatz Haderach can not turn traitor.")
const opponentUsedKH =
  opponent === Faction.ATREIDES &&
  opponentPlan?.kwisatzHaderachUsed === true;

if (opponentUsedKH) {
  // Kwisatz Haderach protects the leader from being called as traitor
  events.push({
    type: 'TRAITOR_BLOCKED',
    data: {
      faction,
      opponent,
      opponentLeader,
      reason: 'kwisatz_haderach_protection',
    },
    message: `${faction} cannot call traitor on ${opponent}'s leader: protected by Kwisatz Haderach`,
  });
  continue; // Skip this traitor opportunity
}
```

### 2. Updated `/src/lib/game/phases/types.ts`

Added new event type `TRAITOR_BLOCKED` to the `PhaseEventType` union (line 227):

```typescript
// Battle
| 'BATTLE_STARTED'
| 'NO_BATTLES'
| 'BATTLES_COMPLETE'
| 'BATTLE_PLAN_SUBMITTED'
| 'PRESCIENCE_USED'
| 'VOICE_USED'
| 'TRAITOR_REVEALED'
| 'TRAITOR_BLOCKED'  // <-- NEW
| 'BATTLE_RESOLVED'
| 'LEADER_KILLED'
| 'LEADER_CAPTURED'
| 'LASGUN_SHIELD_EXPLOSION'
| 'KWISATZ_HADERACH_ACTIVATED'
```

## How It Works

1. **During battle plan reveal phase**: After both sides submit their battle plans, the system checks for traitor opportunities.

2. **Traitor check logic**: For each faction that has a traitor matching the opponent's leader:
   - First checks if opponent is Atreides AND used Kwisatz Haderach
   - If YES: Emits `TRAITOR_BLOCKED` event and skips the traitor call opportunity
   - If NO: Proceeds with normal traitor call request

3. **Event logging**: When KH protection blocks a traitor call, a clear message is logged:
   `"[Faction] cannot call traitor on ATREIDES's leader: protected by Kwisatz Haderach"`

## Example Scenario

**Setup:**
- Harkonnen has an Atreides leader as their traitor
- Battle occurs between Harkonnen (attacker) vs Atreides (defender)
- Atreides uses Kwisatz Haderach with their leader in the battle plan

**Result:**
- When plans are revealed, Harkonnen would normally get a "Call Traitor?" prompt
- With this fix, the system detects KH usage
- Harkonnen does NOT get the traitor call opportunity
- A `TRAITOR_BLOCKED` event is logged explaining why

**Without KH:**
- If Atreides doesn't use KH, the traitor call proceeds normally
- Harkonnen gets the "Call Traitor?" prompt as expected

## Rule Reference

From `dune-rules/battle.md` line 61:
> **ATREIDES LOYALTY:** A leader accompanied by Kwisatz Haderach can not turn traitor.

## Code Comments

The implementation includes clear comments referencing the rule source, making it easy for future developers to understand why this check exists.
