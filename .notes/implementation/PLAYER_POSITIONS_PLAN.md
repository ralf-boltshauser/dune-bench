# Player Token Positions - Implementation Plan

## Overview
Add persistent player token positions to game state. These tokens are placed around the board edge (18 sectors) and determine storm order, bidding order, and other phase orders.

## Requirements

### Distribution Rules
- **6 players**: Every 3rd sector (18/6 = 3)
  - Positions: 0, 3, 6, 9, 12, 15
- **Other player counts**: Evenly distributed (18 / numFactions)
  - 5 players: ~3.6 spacing → 0, 3, 7, 10, 14 (or similar)
  - 4 players: 4.5 spacing → 0, 4, 9, 13 (or similar)
  - 3 players: 6 spacing → 0, 6, 12
- **2 players**: Across from each other (9 sectors apart)
  - Positions: 0, 9

### Current State
- `getDefaultPlayerPositions()` calculates positions on-the-fly
- Called every time storm order is recalculated
- Not stored in game state
- Used in `calculateStormOrder()` and storm phase handler

## Implementation Steps

### 1. Extend GameState Type
**File**: `src/lib/game/types/state.ts`

Add to `GameState` interface:
```typescript
playerPositions: Map<Faction, number>; // Sector positions (0-17) around board edge
```

### 2. Update Factory Function
**File**: `src/lib/game/state/factory.ts`

**Changes**:
- Update `getDefaultPlayerPositions()` to handle all cases correctly:
  - 2 players: 9 sectors apart
  - 6 players: 3 sectors apart (every 3rd)
  - Other: Evenly distributed
- Initialize `playerPositions` in `createGameState()`
- Store the Map in state (handle serialization)

### 3. Update Storm Order Calculation
**File**: `src/lib/game/state/factory.ts`

**Changes**:
- `calculateStormOrder()` should use `state.playerPositions` instead of parameter
- Remove `playerPositions` parameter (get from state)

### 4. Update Storm Phase Handler
**File**: `src/lib/game/phases/handlers/storm.ts`

**Changes**:
- Remove call to `getDefaultPlayerPositions()`
- Use `state.playerPositions` directly
- Update `calculateStormOrder()` call signature

### 5. Handle Serialization
**File**: `src/lib/game/state/serialize.ts`

**Changes**:
- Ensure `Map<Faction, number>` serializes/deserializes correctly
- Already handled for other Maps, but verify

### 6. Add Query Functions
**File**: `src/lib/game/state/queries.ts`

**New functions**:
- `getPlayerPosition(state, faction): number` - Get position for a faction
- `getPlayerPositions(state): Map<Faction, number>` - Get all positions
- `getFactionAtPosition(state, sector): Faction | null` - Find faction at sector

### 7. Add Mutation Functions (if needed)
**File**: `src/lib/game/state/mutations.ts`

**New functions** (if positions can change):
- `setPlayerPosition(state, faction, sector): GameState` - Update position
- Probably not needed for base game, but useful for variants

### 8. Update Setup Phase
**File**: `src/lib/game/phases/handlers/setup.ts`

**Changes**:
- Log player positions during setup
- Verify positions are set correctly

### 9. Update Tests
- Test position calculation for 2, 3, 4, 5, 6 players
- Test storm order calculation with positions
- Test serialization/deserialization

## Implementation Details

### Position Calculation Algorithm

```typescript
function calculatePlayerPositions(factions: Faction[]): Map<Faction, number> {
  const positions = new Map<Faction, number>();
  const numFactions = factions.length;
  const totalSectors = 18;

  if (numFactions === 2) {
    // Across from each other
    positions.set(factions[0], 0);
    positions.set(factions[1], 9);
  } else if (numFactions === 6) {
    // Every 3rd sector
    factions.forEach((faction, index) => {
      positions.set(faction, index * 3);
    });
  } else {
    // Evenly distributed
    const spacing = totalSectors / numFactions;
    factions.forEach((faction, index) => {
      positions.set(faction, Math.floor(index * spacing));
    });
  }

  return positions;
}
```

### Storm Order Calculation Update

```typescript
export function calculateStormOrder(
  state: GameState
): Faction[] {
  const factions = Array.from(state.factions.keys());
  const stormSector = state.stormSector;
  const playerPositions = state.playerPositions;

  return factions.sort((a, b) => {
    const posA = playerPositions.get(a) ?? 0;
    const posB = playerPositions.get(b) ?? 0;

    // Calculate distance counterclockwise from storm
    const distA = (posA - stormSector + GAME_CONSTANTS.TOTAL_SECTORS) % GAME_CONSTANTS.TOTAL_SECTORS;
    const distB = (posB - stormSector + GAME_CONSTANTS.TOTAL_SECTORS) % GAME_CONSTANTS.TOTAL_SECTORS;

    return distA - distB;
  });
}
```

## Files to Modify

1. ✅ `src/lib/game/types/state.ts` - Add `playerPositions` to GameState
2. ✅ `src/lib/game/state/factory.ts` - Initialize positions, update calculation
3. ✅ `src/lib/game/phases/handlers/storm.ts` - Use stored positions
4. ✅ `src/lib/game/state/queries.ts` - Add query functions
5. ✅ `src/lib/game/state/mutations.ts` - Add mutation functions (optional)
6. ✅ `src/lib/game/state/index.ts` - Export new functions
7. ✅ `src/lib/game/phases/handlers/setup.ts` - Log positions

## Testing Checklist

- [ ] 2 players: Positions 0 and 9
- [ ] 3 players: Evenly distributed (0, 6, 12)
- [ ] 4 players: Evenly distributed
- [ ] 5 players: Evenly distributed
- [ ] 6 players: Every 3rd sector (0, 3, 6, 9, 12, 15)
- [ ] Storm order calculated correctly from positions
- [ ] Positions persist through serialization
- [ ] Bidding order uses storm order (which uses positions)

## Benefits

1. **Persistent**: Positions stored in state, not recalculated
2. **Accurate**: Follows rules for different player counts
3. **Extensible**: Can be modified for variants if needed
4. **Clear**: Explicit tracking of where players sit around board
5. **Correct**: Storm order and bidding order will be accurate

