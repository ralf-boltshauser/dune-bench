# Player Positions Implementation - Complete

## ✅ Implementation Summary

Player token positions have been successfully added to the game state. This tracks where each faction's player token is placed around the board edge (18 sectors) and is used to determine storm order, which affects all phases.

## Changes Made

### 1. GameState Extension
**File**: `src/lib/game/types/state.ts`
- Added `playerPositions: Map<Faction, number>` to `GameState` interface
- Stores sector positions (0-17) for each faction

### 2. Position Calculation
**File**: `src/lib/game/state/factory.ts`
- Created `calculatePlayerPositions()` function with correct distribution:
  - **2 players**: Sectors 0 and 9 (across from each other)
  - **6 players**: Sectors 0, 3, 6, 9, 12, 15 (every 3rd sector)
  - **Other counts**: Evenly distributed (18 / numFactions)
- Positions are initialized during game creation
- `getDefaultPlayerPositions()` now calls `calculatePlayerPositions()` (deprecated but kept for compatibility)

### 3. Storm Order Calculation Fix
**File**: `src/lib/game/state/factory.ts`
- Updated `calculateStormOrder()` to:
  - Take `GameState` as parameter (instead of separate parameters)
  - Use `state.playerPositions` directly
  - **CRITICAL FIX**: If storm is exactly ON a player token (distance = 0), treat that player as "behind" the storm, making the NEXT player (counterclockwise) first

**Key Rule Implementation**:
```typescript
// If storm is ON a player token (distance = 0), treat it as if they're "behind" the storm
// This makes the NEXT player (counterclockwise) first
if (distA === 0) {
  distA = GAME_CONSTANTS.TOTAL_SECTORS; // Put them at the end
}
```

### 4. Updated Phase Handlers
**File**: `src/lib/game/phases/handlers/storm.ts`
- Removed call to `getDefaultPlayerPositions()`
- Now uses `calculateStormOrder(state)` which uses stored positions

### 5. Query Functions
**File**: `src/lib/game/state/queries.ts`
- Added `getPlayerPosition(state, faction): number` - Get position for a faction
- Added `getPlayerPositions(state): Map<Faction, number>` - Get all positions
- Added `getFactionAtPosition(state, sector): Faction | null` - Find faction at sector

### 6. Setup Phase Logging
**File**: `src/lib/game/phases/handlers/setup.ts`
- Added logging of player positions after setup completes
- Shows all faction positions sorted by sector
- Explains storm order rule

## Phases That Use Storm Order

All these phases now correctly use the stored player positions via `state.stormOrder`:

1. **Storm Phase** - Determines who dials the storm
2. **Bidding Phase** - Determines bidding order (uses `state.stormOrder[0]` as starting bidder)
3. **Revival Phase** - Processes factions in storm order
4. **Shipment/Movement Phase** - Processes factions in storm order
5. **Battle Phase** - Determines aggressor order
6. **Spice Collection Phase** - Processes factions in storm order
7. **Mentat Pause Phase** - Uses storm order for tiebreakers
8. **Spice Blow/Nexus Phase** - Uses storm order for alliance decisions

## Storm Order Rule

**Critical Rule**: If the storm is exactly ON a player token (storm sector = player position), the NEXT player (counterclockwise) is first, NOT the player at the storm position.

**Example**:
- Player A at sector 5
- Player B at sector 8
- Storm at sector 5 (ON Player A's token)
- **Result**: Player B is first (next counterclockwise), Player A goes last

This is implemented by treating distance = 0 as distance = 18 (putting them at the end of the order).

## Serialization

Player positions are automatically handled by existing Map serialization:
- `serializeGameState()` converts `Map<Faction, number>` to JSON
- `deserializeGameState()` restores the Map correctly

## Testing

To verify:
1. Run setup phase test: `npx tsx src/lib/game/test-setup-phase.ts`
2. Check that player positions are logged correctly
3. Verify storm order is calculated correctly after first storm movement
4. Verify bidding order matches storm order

## Benefits

1. **Persistent**: Positions stored in state, not recalculated
2. **Accurate**: Follows rules for all player counts (2-6)
3. **Correct**: Storm order rule properly implemented
4. **Extensible**: Can be modified for variants if needed
5. **Clear**: Explicit tracking of where players sit around board

