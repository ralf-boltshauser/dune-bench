# Fremen Ally Revival Boost Implementation

## Overview

Implemented the Fremen alliance ability to grant their ally 3 free revivals per turn at Fremen's discretion. This is based on the rule from `handwritten-rules/battle.md` line 128:

> "ALLIANCE: At your discretion, your ally's free revival is 3.✷"

## Rule Summary

- **Ability**: Fremen can grant their ally 3 free revivals (instead of the ally's normal free revival count)
- **Discretionary**: Fremen chooses each turn whether to grant the boost
- **Cost**: Free (no spice cost to Fremen)
- **Timing**: Decision made at the start of Revival phase, before ally revives
- **Effect**: Ally's `freeForces` count becomes 3 for that turn only

## Difference from Emperor Ability

The Fremen ability is different from the Emperor ally revival ability:
- **Emperor**: Pays 2 spice per force to revive **additional** forces for ally (beyond ally's normal revival)
- **Fremen**: Grants 3 free revivals to ally **instead of** their normal count (no cost)

## Files Modified

### 1. `/src/lib/game/types/state.ts`

Added tracking field to `FactionState`:
```typescript
fremenRevivalBoostGranted?: boolean; // Track if Fremen granted 3 free revivals to ally this turn
```

### 2. `/src/lib/game/rules/revival.ts`

Updated `RevivalLimits` interface:
```typescript
export interface RevivalLimits {
  // ... existing fields
  fremenBoostAvailable: boolean;  // NEW: Whether Fremen ally can grant boost
  fremenBoostGranted: boolean;    // NEW: Whether boost was granted this turn
}
```

Updated `getRevivalLimits()` function:
```typescript
// Check if Fremen is ally and can grant 3 free revivals
const fremenState = state.factions.get(Faction.FREMEN);
const isFremenAlly = fremenState?.allyId === faction;
const fremenBoostGranted = factionState.fremenRevivalBoostGranted ?? false;

// If Fremen granted the boost, override the faction's normal free revival count
let freeForces = config.freeRevival;
if (isFremenAlly && fremenBoostGranted) {
  freeForces = 3;
}

return {
  freeForces,
  // ... other fields
  fremenBoostAvailable: isFremenAlly,
  fremenBoostGranted,
};
```

### 3. `/src/lib/game/phases/types.ts`

Added new agent request type:
```typescript
export type AgentRequestType =
  // ... existing types
  | 'GRANT_FREMEN_REVIVAL_BOOST'  // NEW
```

### 4. `/src/lib/game/tools/schemas.ts`

Added two new schemas:
```typescript
export const GrantFremenRevivalBoostSchema = z.object({});
export const DenyFremenRevivalBoostSchema = z.object({});
```

Updated `RevivalSchemas`:
```typescript
export const RevivalSchemas = {
  reviveForces: ReviveForcesSchema,
  reviveLeader: ReviveLeaderSchema,
  emperorPayAllyRevival: EmperorPayAllyRevivalSchema,
  grantFremenRevivalBoost: GrantFremenRevivalBoostSchema,  // NEW
  denyFremenRevivalBoost: DenyFremenRevivalBoostSchema,    // NEW
  pass: PassActionSchema,
};
```

### 5. `/src/lib/game/tools/actions/revival.ts`

Added two new tools:

```typescript
grant_fremen_revival_boost: tool({
  description: `Grant your ally 3 free revivals this turn (Fremen alliance ability).

Rules:
- Only available when Fremen has an ally
- This is a discretionary decision each turn
- Replaces ally's normal free revival count with 3
- Does not cost the Fremen anything

Use this to help your ally rebuild their forces after losses.`,
  inputSchema: GrantFremenRevivalBoostSchema,
  execute: async (params, options) => {
    // Validates Fremen has an ally
    // Returns success result (state updated in phase handler)
  }
})

deny_fremen_revival_boost: tool({
  description: `Decline to grant your ally the revival boost (Fremen alliance ability).

Your ally will use their normal free revival count instead.`,
  inputSchema: DenyFremenRevivalBoostSchema,
  execute: async (params, options) => {
    // Returns success result
  }
})
```

Updated tool names export:
```typescript
export const REVIVAL_TOOL_NAMES = [
  'revive_forces',
  'revive_leader',
  'emperor_pay_ally_revival',
  'grant_fremen_revival_boost',  // NEW
  'deny_fremen_revival_boost',   // NEW
  'pass_revival'
] as const;
```

### 6. `/src/lib/game/tools/index.ts`

Added exports:
```typescript
export {
  // ... existing exports
  GrantFremenRevivalBoostSchema,  // NEW
  DenyFremenRevivalBoostSchema,   // NEW
} from './schemas';
```

### 7. `/src/lib/game/phases/handlers/revival.ts`

#### Added state tracking:
```typescript
export class RevivalPhaseHandler implements PhaseHandler {
  readonly phase = Phase.REVIVAL;

  private processedFactions: Set<Faction> = new Set();
  private fremenBoostAsked: boolean = false;  // NEW
```

#### Updated `initialize()` method:
- Resets `fremenRevivalBoostGranted` to `false` for all factions at start of revival phase (alongside `emperorAllyRevivalsUsed`)

```typescript
// Reset Emperor ally revival bonus and Fremen boost tracking for all factions
for (const [faction, factionState] of state.factions) {
  const needsReset =
    (factionState.emperorAllyRevivalsUsed !== undefined && factionState.emperorAllyRevivalsUsed > 0) ||
    (factionState.fremenRevivalBoostGranted === true);

  if (needsReset) {
    newFactions.set(faction, {
      ...factionState,
      emperorAllyRevivalsUsed: 0,
      fremenRevivalBoostGranted: false,
    });
  }
}
```

#### Updated `processStep()` method:
- Handles Fremen boost decision first (before other revival actions)
- Sets `fremenRevivalBoostGranted` flag on ally's state

```typescript
// Process Fremen revival boost decision first
const fremenBoostResponse = responses.find(
  (r) => r.actionType === 'GRANT_FREMEN_REVIVAL_BOOST' || r.actionType === 'DENY_FREMEN_REVIVAL_BOOST'
);

if (fremenBoostResponse) {
  const fremenState = getFactionState(newState, Faction.FREMEN);
  const allyId = fremenState.allyId;

  if (allyId && fremenBoostResponse.actionType === 'GRANT_FREMEN_REVIVAL_BOOST') {
    // Grant the boost to the ally
    const allyState = getFactionState(newState, allyId);
    const newFactions = new Map(newState.factions);
    newFactions.set(allyId, {
      ...allyState,
      fremenRevivalBoostGranted: true,
    });
    newState = { ...newState, factions: newFactions };

    // Log event
  }

  this.fremenBoostAsked = true;
}
```

#### Updated `requestRevivalDecisions()` method:
- Checks if Fremen has an ally at the start of the phase
- If yes, asks Fremen first (before other factions revive)
- Returns early with Fremen's request (not simultaneous)

```typescript
// Check if Fremen has an ally and hasn't been asked yet
const fremenState = state.factions.get(Faction.FREMEN);
if (fremenState && fremenState.allyId && !this.fremenBoostAsked) {
  const allyId = fremenState.allyId;
  const allyLimits = getRevivalLimits(state, allyId);

  // Only ask if ally has forces in tanks
  if (allyLimits.forcesInTanks > 0) {
    pendingRequests.push({
      factionId: Faction.FREMEN,
      requestType: 'GRANT_FREMEN_REVIVAL_BOOST',
      prompt: `Your ally ${allyId} has ${allyLimits.forcesInTanks} forces in tanks...`,
      availableActions: ['GRANT_FREMEN_REVIVAL_BOOST', 'DENY_FREMEN_REVIVAL_BOOST'],
    });

    // Return early to get Fremen's decision first
    return {
      state,
      phaseComplete: false,
      pendingRequests,
      simultaneousRequests: false,  // Process Fremen's decision first
      actions: [],
      events,
    };
  }
}
```

- Updated ally's revival prompt to show Fremen boost if granted

```typescript
// Check if this faction received Fremen revival boost
let fremenBoostInfo = '';
if (limits.fremenBoostGranted) {
  fremenBoostInfo = ` FREMEN ALLIANCE BONUS: Your Fremen ally has granted you 3 free revivals this turn!`;
}
```

## How It Works

### Phase Flow

1. **Revival Phase Starts** (`initialize`)
   - All factions' `fremenRevivalBoostGranted` flags are reset to `false`
   - `fremenBoostAsked` tracker is reset to `false`

2. **Check for Fremen Alliance** (`requestRevivalDecisions`)
   - If Fremen has an ally with forces in tanks:
     - Ask Fremen to grant or deny the boost (non-simultaneous request)
     - Wait for Fremen's response

3. **Fremen Decides** (via tools)
   - Fremen uses `grant_fremen_revival_boost` or `deny_fremen_revival_boost`
   - Response processed in `processStep()`:
     - If granted: Set `fremenRevivalBoostGranted = true` on ally's state
     - Log appropriate event

4. **Ally's Revival Turn** (`requestRevivalDecisions`, after Fremen's decision)
   - Call `getRevivalLimits()` for ally
   - If `fremenRevivalBoostGranted = true`:
     - `freeForces` is set to 3 (overriding faction's normal count)
   - Ally sees updated free revival count in prompt

5. **All Factions Revive** (simultaneous)
   - Each faction revives based on their `freeForces` value
   - Ally benefits from boost if Fremen granted it

## Example Scenario

**Faction**: Atreides (normally gets 2 free revivals)
**Ally**: Fremen

### Turn N, Revival Phase:

1. Atreides has 5 forces in tanks
2. System asks Fremen: "Grant ally 3 free revivals?"
3. Fremen chooses: `grant_fremen_revival_boost`
4. Atreides state updated: `fremenRevivalBoostGranted = true`
5. Atreides is prompted: "You get 3 forces for FREE" (instead of 2)
6. Atreides revives 3 forces at no cost

### Turn N+1, Revival Phase:

1. Reset: `fremenRevivalBoostGranted = false` for all factions
2. Fremen asked again (fresh decision each turn)
3. Fremen chooses: `deny_fremen_revival_boost`
4. Atreides is prompted: "You get 2 forces for FREE" (normal count)

## Testing

Test file: `test-fremen-revival-boost.ts`

Verified:
- ✓ Atreides normally gets 2 free revivals
- ✓ When Fremen grants boost, Atreides gets 3 free revivals
- ✓ Fremen keeps their own 3 free revivals
- ✓ Boost only works when allied with Fremen
- ✓ Boost is discretionary (controlled by `fremenRevivalBoostGranted` flag)
- ✓ State is reset at start of each revival phase

All tests pass successfully.

## Key Design Decisions

1. **Discretionary per turn**: The boost decision is made fresh each revival phase. Fremen can choose to grant or deny it each turn.

2. **Override, not addition**: The boost replaces the ally's normal free revival count (sets to 3), rather than adding to it. This matches the rule wording "your ally's free revival is 3."

3. **Sequential flow**: Fremen is asked first (before simultaneous revival), ensuring the decision is made before the ally needs to revive.

4. **State tracking**: Used `fremenRevivalBoostGranted` flag on the **ally's** state (not Fremen's), making it clear which faction received the boost.

5. **Graceful skipping**: If ally has no forces in tanks, Fremen is not asked (no need for decision).

## Related Rules

- Rule 1.05: Revival Phase (general revival rules)
- Rule 2.04.11: Fremen free revival (3 forces)
- Battle.md line 128: Fremen alliance revival ability
