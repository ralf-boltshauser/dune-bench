# Bene Gesserit Advisor/Fighter Implementation

## Overview

Implemented full tracking of Bene Gesserit force tokens with two sides: **Advisors** (spiritual, striped side) and **Fighters** (battle side). This distinction is critical because advisors are non-combatants and cannot participate in battles.

## Rules Implemented

From the Landsraad rules:
- Line 76: "NONCOMBATANTS: Your Force tokens have two sides, the spiritual, striped side (advisor) and the battle side (fighter)."
- Line 79: "Here is a list of things they CANNOT do: ...be involved in combat..."

## Changes Made

### 1. Type System (`src/lib/game/types/entities.ts`)

Updated `ForceStack` interface to track BG advisors:

```typescript
export interface ForceStack {
  factionId: Faction;
  territoryId: TerritoryId;
  sector: number;
  forces: ForceCount;
  // BG-specific: track advisor vs fighter count (only used for Bene Gesserit)
  advisors?: number; // Number of forces in advisor form (spiritual, striped side)
}
```

The `advisors` field is optional and only used for BG forces. For other factions, it remains `undefined`.

### 2. State Initialization (`src/lib/game/state/factory.ts`)

Modified `createForces()` to initialize BG forces with all tokens starting as advisors:

```typescript
// BG-specific: Initialize all forces as advisors (spiritual side) by default
if (faction === Faction.BENE_GESSERIT) {
  const totalCount = startPos.count;
  stack.advisors = totalCount; // All BG forces start as advisors
}
```

### 3. Query Functions (`src/lib/game/state/queries.ts`)

Added BG-specific query functions:

```typescript
/**
 * Get BG fighters (battle-capable forces) in a territory.
 * Fighters = total forces - advisors
 */
export function getBGFightersInTerritory(state: GameState, territoryId: TerritoryId): number

/**
 * Get BG advisors (non-combatants) in a territory.
 */
export function getBGAdvisorsInTerritory(state: GameState, territoryId: TerritoryId): number
```

Updated `getFactionsInTerritory()` to exclude BG when they only have advisors:

```typescript
// BG special case: advisors don't count for battle purposes
if (faction === Faction.BENE_GESSERIT) {
  const fighters = getBGFightersInTerritory(state, territoryId);
  if (fighters === 0) {
    // Only advisors present - can't battle
    continue;
  }
}
```

This ensures that:
- BG forces with only advisors don't trigger battles
- BG is excluded from battle identification when only advisors are present
- Stronghold occupancy doesn't count BG-advisor-only presence

### 4. Force Utilities (`src/lib/game/state/force-utils.ts`)

#### Updated `addToStack()`
- When creating a new stack for BG, all forces start as advisors
- When adding to existing BG stack, new forces also start as advisors

#### Updated `removeFromStack()`
- Prioritizes removing advisors first, then fighters
- Maintains the advisor/fighter distinction during force removal

#### Added Conversion Functions
```typescript
/**
 * Convert BG advisors to fighters at a location.
 */
export function convertAdvisorsToFighters(
  stacks: ForceStack[],
  territoryId: TerritoryId,
  sector: number,
  count: number
): ForceStack[]

/**
 * Convert BG fighters to advisors at a location.
 */
export function convertFightersToAdvisors(
  stacks: ForceStack[],
  territoryId: TerritoryId,
  sector: number,
  count: number
): ForceStack[]
```

### 5. Mutation Functions (`src/lib/game/state/mutations.ts`)

Added high-level mutation functions:

```typescript
/**
 * Convert BG advisors to fighters (flip tokens to battle side).
 */
export function convertBGAdvisorsToFighters(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  count: number
): GameState

/**
 * Convert BG fighters to advisors (flip tokens to spiritual side).
 */
export function convertBGFightersToAdvisors(
  state: GameState,
  territoryId: TerritoryId,
  sector: number,
  count: number
): GameState
```

### 6. Battle Phase (`src/lib/game/phases/handlers/battle.ts`)

Updated `identifyBattles()` with clarifying comment:

```typescript
// getFactionsInTerritory automatically excludes BG if they only have advisors
// (since advisors are non-combatants and cannot battle)
const factionsHere = getFactionsInTerritory(state, forceStack.territoryId);
```

No logic change needed - the battle phase automatically benefits from the updated `getFactionsInTerritory()` function.

### 7. Public API (`src/lib/game/state/index.ts`)

Exported new functions:
- `getBGFightersInTerritory`
- `getBGAdvisorsInTerritory`
- `convertBGAdvisorsToFighters` (mutation)
- `convertBGFightersToAdvisors` (mutation)
- `convertAdvisorsToFighters` (utility)
- `convertFightersToAdvisors` (utility)

## How It Works

### Force Token Lifecycle

1. **Initial State**: All BG forces start as advisors (spiritual side)
   ```typescript
   { forces: { regular: 10, elite: 0 }, advisors: 10 }
   // 10 forces total, all 10 are advisors, 0 are fighters
   ```

2. **Converting to Fighters**: BG can flip advisors to fighters before battle
   ```typescript
   convertBGAdvisorsToFighters(state, territoryId, sector, 5)
   // Result: { forces: { regular: 10, elite: 0 }, advisors: 5 }
   // 10 forces total, 5 advisors, 5 fighters
   ```

3. **Battle Eligibility**: Only fighters count for battles
   ```typescript
   // With 10 advisors, 0 fighters: BG NOT in battle
   getFactionsInTerritory(state, territoryId) // excludes BG

   // With 5 advisors, 5 fighters: BG IS in battle
   getFactionsInTerritory(state, territoryId) // includes BG
   ```

4. **Force Removal**: Advisors are removed first (non-combatants die first)
   ```typescript
   sendForcesToTanks(state, Faction.BENE_GESSERIT, territoryId, sector, 3)
   // If stack has 5 advisors, 5 fighters:
   // Result: 2 advisors, 5 fighters (3 advisors removed)
   ```

### Battle Mechanics

The battle phase now correctly:
- Excludes BG from battles when they only have advisors
- Allows BG to participate when they have any fighters
- Prevents battles from being identified in territories where BG only has advisors

### Stronghold Control

BG advisors don't count for:
- Battle initiation
- Stronghold occupancy limits (when only advisors present)
- Victory conditions (advisors can't "control" a territory in combat sense)

However, advisors DO still occupy the territory for:
- Spice collection (they can collect spice)
- Movement restrictions
- Any non-combat activities

## Testing

Created test suite in `src/lib/game/test-bg-advisors.ts` covering:
1. ✓ Initial BG forces are all advisors
2. ✓ Shipped forces start as advisors
3. ✓ Converting advisors to fighters
4. ✓ BG with only advisors excluded from battles
5. ✓ BG with fighters included in battles

All tests pass successfully.

## Future Enhancements

To make the BG advisor/fighter system fully playable, consider adding:

1. **AI Tools**: Create tools for BG agents to flip advisors/fighters
   ```typescript
   // In src/lib/game/tools/actions/bene-gesserit.ts
   createTool({
     name: 'flip_advisors_to_fighters',
     description: 'Convert BG advisors to fighters before battle',
     parameters: z.object({
       territoryId: z.string(),
       sector: z.number(),
       count: z.number(),
     }),
     execute: (state, params, manager) => {
       // Validate and convert
       manager.setState(
         convertBGAdvisorsToFighters(state, params.territoryId, params.sector, params.count)
       );
     }
   })
   ```

2. **Battle Phase Integration**: Add a pre-battle sub-phase for BG to convert advisors
   - Before battle plans are submitted
   - Allow BG to flip tokens based on strategic needs

3. **Movement Restrictions**: Clarify if advisors can move separately from fighters
   - Current implementation treats them as a unified stack
   - Could add separate movement rules if needed

4. **UI Representation**: Show advisor vs fighter counts in game UI
   - Visual distinction between the two sides
   - Clear indication of battle-capable forces

## Compatibility

All changes are:
- ✓ Backward compatible (advisors field is optional)
- ✓ Type-safe (full TypeScript support)
- ✓ Immutable (state mutations follow existing patterns)
- ✓ Extensible (easy to add more BG-specific rules)

The system gracefully handles:
- Non-BG factions (advisors field remains undefined)
- Existing game states (advisors default to 0, meaning all are fighters)
- Mixed stacks (advisors + fighters working together)
