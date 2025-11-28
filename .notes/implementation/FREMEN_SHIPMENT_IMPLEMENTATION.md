# Fremen Special Shipment Implementation

## Summary

Implemented BUG-04 (Fremen Free Shipment) and BUG-10 (Fremen Storm Migration) according to the GF9 Dune rules.

## Features Implemented

### 1. Free Shipment (BUG-04)
**Rule**: "SHIPMENT: During the Shipment, you may Send any or all your reserves for free onto the Great Flat or onto any one Territory on the Map within two territories of the Great Flat (subject to storm and Occupancy Limit). This ability costs 1 shipment action to use."

**Implementation**:
- Created `fremen_send_forces` tool that allows Fremen to send forces from reserves for **FREE** (0 spice cost)
- Valid destinations: The Great Flat OR any territory within 2 territories of The Great Flat
- Uses breadth-first search to calculate territory distance (ignoring storm)
- Subject to normal occupancy limits for strongholds
- Subject to storm restrictions (unless using storm migration)

### 2. Storm Migration (BUG-10)
**Rule**: "STORM MIGRATION: You may Send your reserves into a storm at half loss."

**Implementation**:
- Added `allowStormMigration` parameter to `fremen_send_forces` tool
- When true, allows Fremen to send forces into sectors that are in storm
- **Half of the forces are destroyed upon arrival (rounded up)**
- Example: Send 10 forces → 5 lost to storm, 5 survive
- Forces are shipped first, then immediately sent to Tleilaxu Tanks for the lost amount

### 3. Validation Updates
- Updated `validateShipment()` in movement.ts to provide clear error message directing Fremen to use `fremen_send_forces` instead of `ship_forces`
- Normal shipment tool (`ship_forces`) blocks Fremen with helpful error message

## Files Modified

### Core Implementation
1. **`/src/lib/game/rules/movement.ts`**
   - Added `getTerritoriesWithinDistance()` helper function for distance calculation
   - Updated Fremen shipment validation error message

2. **`/src/lib/game/tools/schemas.ts`**
   - Added `FremenSendForcesSchema` with validation for:
     - Territory ID (must be Great Flat or within 2)
     - Sector number
     - Force count
     - Elite forces (Fedaykin)
     - Storm migration flag

3. **`/src/lib/game/tools/actions/shipment.ts`**
   - Created `fremen_send_forces` tool with:
     - Faction validation (Fremen-only)
     - Territory distance validation
     - Storm migration logic
     - Force destruction calculation
   - Added to `SHIPMENT_TOOL_NAMES` array for automatic registration

4. **`/src/lib/game/tools/registry.ts`**
   - Automatically includes `fremen_send_forces` via `SHIPMENT_TOOL_NAMES`

### Test File
5. **`/src/lib/game/test-fremen-shipment.ts`**
   - Comprehensive test suite covering:
     - Free shipment to Great Flat
     - Free shipment to adjacent territory
     - Rejection of too-distant territories
     - Storm migration with correct loss calculation
     - Rejection of storm shipment without migration flag

## Test Results

All tests pass successfully:

```
✓ Send 5 forces to Great Flat - FREE (0 spice)
✓ Send 3 forces to Habbanya Erg (adjacent) - FREE (0 spice)
✓ Reject shipment to Carthag (too far)
✓ Storm migration: 10 forces → 5 lost, 5 survived
✓ Reject storm shipment without migration flag
```

## Usage

### For Fremen Agents

The `fremen_send_forces` tool is available during the SHIPMENT_MOVEMENT phase:

```typescript
// Send to Great Flat
fremen_send_forces({
  territoryId: "the_great_flat",
  sector: 14,
  count: 5,
  useElite: false,
  allowStormMigration: false
})

// Storm migration
fremen_send_forces({
  territoryId: "the_great_flat",
  sector: 14,  // Sector in storm
  count: 10,
  useElite: false,
  allowStormMigration: true  // Half will be lost
})
```

## Valid Destinations from Great Flat

Territories within 2 distance of The Great Flat:
- **Distance 0**: The Great Flat (itself)
- **Distance 1**: Funeral Plain, The Greater Flat, Habbanya Erg, False Wall West
- **Distance 2**: Cielago South, South Mesa, Wind Pass, Habbanya Ridge Flat, Habbanya Sietch, Cielago East, Cielago West

## Rules Compliance

✅ **Rule 2.04.05** - Free shipment to Great Flat area
✅ **Rule 2.04.07** - Subject to occupancy limits
✅ **Rule 2.04.19** - Storm migration at half loss
✅ **Rule 2.04.01** - Fremen reserves are local (not off-planet)
✅ Storm restriction bypass only with storm migration flag

## Future Considerations

- Fremen special movement (2 territories instead of 1) - already implemented
- Sandworm immunity - already implemented
- Beast of Burden (sandworm riding) - future enhancement
- Fedaykin special abilities - already implemented (worth 2 forces in battle)
