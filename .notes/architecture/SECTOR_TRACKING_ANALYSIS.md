# Sector Tracking Analysis & Implementation Plan

## Current Status ✅

### What's Already Working:

1. **Data Structure** ✅
   - `ForceStack` interface includes `sector: number` field
   - Forces are stored with both `territoryId` and `sector`
   - State mutations (`shipForces`, `moveForces`) accept sector parameters

2. **Validation** ✅
   - `validateShipment()` checks if sector is valid for territory (line 100 in `movement.ts`)
   - `validateMovement()` validates both from and to sectors
   - Storm checks verify sector is not in storm
   - Error messages include expected sectors when invalid

3. **Tool Schemas** ✅
   - `ShipForcesSchema` requires `sector` parameter
   - `MoveForcesSchema` requires both `fromSector` and `toSector`
   - Sector schema validates 0-17 range

4. **Territory Definitions** ✅
   - All territories have `sectors: number[]` array
   - Correctly updated with accurate sector mappings

## Issues Identified ⚠️

### 1. **Tool Descriptions Don't Emphasize Sector Selection**
   - Current description: "Sector within the territory to land in"
   - **Problem**: Doesn't explain that territories can span multiple sectors
   - **Problem**: Doesn't guide agent to choose strategically (avoid storm, etc.)

### 2. **Information Tools Show Sectors But Not Per-Sector Storm Status**
   - ✅ `view_territory` DOES show `sectors: number[]` array
   - ✅ `occupants` array includes `sector: number` for each force stack
   - ⚠️ `inStorm` is a boolean for the whole territory, not per-sector
   - ⚠️ Doesn't show which specific sectors are in storm vs safe
   - **Problem**: Agent can't see which sectors are safe to ship/move to

### 3. **Suggestion Generation Only Finds One Sector**
   - `generateShipmentSuggestions()` only finds first safe sector (line 270)
   - `generateMovementSuggestions()` only finds first safe sector (line 566)
   - **Problem**: Doesn't show all available options to agent

### 4. **Default Sector Logic May Be Outdated**
   - `getDefaultSector()` in `factory.ts` has hardcoded sector map
   - May not match updated territory definitions
   - Used for starting forces placement

## Implementation Plan

### Phase 1: Enhance Tool Descriptions 📝

**File**: `src/lib/game/tools/actions/shipment.ts`
- Update `ship_forces` description to explain:
  - Territories can span multiple sectors (0-17)
  - Must choose a specific sector within the territory
  - Sector choice matters for storm protection
  - Use `view_territory` to see available sectors

**File**: `src/lib/game/tools/actions/movement.ts`
- Update `move_forces` description similarly
- Emphasize that forces in different sectors of same territory can be affected differently by storm

**File**: `src/lib/game/tools/schemas.ts`
- Enhance `SectorSchema` description:
  ```typescript
  .describe('Sector number (0-17, counterclockwise from storm start). Territories can span multiple sectors - you must choose which sector within the territory. Use view_territory to see available sectors for a territory.')
  ```

### Phase 2: Enhance Information Tools 🔍

**File**: `src/lib/game/tools/information/tools.ts`

**Enhance `view_territory` tool:**
- ✅ Already shows `sectors: number[]` array
- ✅ Already shows `occupants` with sector info
- **Add**: Per-sector storm status
- **Add**: Per-sector spice locations
- **Add**: Strategic guidance showing safe sectors

**Update `TerritoryInfo` interface:**
```typescript
export interface TerritoryInfo {
  // ... existing fields ...
  sectors: number[];
  sectorDetails: Array<{
    sector: number;
    inStorm: boolean;
    forces: Array<{ faction: Faction; regular: number; elite: number }>;
    spice: number;
  }>;
  safeSectors: number[]; // Sectors not in storm
  inStormSectors: number[]; // Sectors currently in storm
}
```

**Update `getTerritoryInfo()` method:**
- Calculate per-sector storm status
- Group forces by sector
- Group spice by sector
- Provide `safeSectors` and `inStormSectors` arrays

### Phase 3: Enhance Suggestion Generation 💡

**File**: `src/lib/game/rules/movement.ts`

**Update `generateShipmentSuggestions()`:**
- Instead of finding just one safe sector, find ALL safe sectors
- Return multiple suggestions (one per safe sector) if territory spans multiple sectors
- Include sector information in suggestion

**Update `generateMovementSuggestions()`:**
- Similarly, provide options for all safe sectors in destination territory
- Show which sectors are in storm vs safe

### Phase 4: Fix Default Sector Logic 🔧

**File**: `src/lib/game/state/factory.ts`

**Update `getDefaultSector()`:**
- Use `TERRITORY_DEFINITIONS` to get first sector of territory
- Remove hardcoded map (or update it to match current definitions)
- Ensure it uses the first sector from territory definition

### Phase 5: Add Sector Validation Helper 🛡️

**File**: `src/lib/game/rules/movement.ts` (or new helper file)

**Add helper function:**
```typescript
/**
 * Get all valid sectors for a territory that are not in storm
 */
export function getSafeSectorsForTerritory(
  state: GameState,
  territoryId: TerritoryId
): number[] {
  const territory = TERRITORY_DEFINITIONS[territoryId];
  if (!territory || territory.sectors.length === 0) return [];
  
  return territory.sectors.filter(s => !isSectorInStorm(state, s));
}

/**
 * Get all sectors for a territory (including those in storm)
 */
export function getAllSectorsForTerritory(
  territoryId: TerritoryId
): number[] {
  const territory = TERRITORY_DEFINITIONS[territoryId];
  return territory?.sectors ?? [];
}
```

### Phase 6: Update Context Information 📊

**File**: `src/lib/game/tools/context.ts`

**Enhance context for shipment/movement requests:**
- Include available sectors for target territory
- Include storm information for each sector
- Provide guidance on sector selection

## Testing Checklist

- [ ] Agent can see all available sectors when viewing a territory
- [ ] Agent receives helpful error if sector is invalid
- [ ] Agent can choose different sectors within same territory
- [ ] Storm correctly affects only forces in storm sectors
- [ ] Forces in different sectors of same territory are tracked separately
- [ ] Movement between sectors within same territory works
- [ ] Suggestions show multiple sector options when available

## Example Scenarios to Test

1. **Multi-Sector Territory Shipment**
   - Territory: Meridian (sectors 0, 1)
   - Storm in sector 0
   - Agent should be able to ship to sector 1
   - Agent should receive error if trying to ship to sector 0

2. **Sector Selection in Movement**
   - Forces in Meridian sector 0
   - Move to Imperial Basin (sectors 8, 9, 10)
   - Agent should be able to choose which sector (8, 9, or 10)
   - System should validate choice

3. **Storm Protection**
   - Forces in Meridian sector 0 (in storm)
   - Forces in Meridian sector 1 (not in storm)
   - Only sector 0 forces should be destroyed

## Files to Modify

1. `src/lib/game/tools/actions/shipment.ts` - Enhance descriptions
2. `src/lib/game/tools/actions/movement.ts` - Enhance descriptions
3. `src/lib/game/tools/schemas.ts` - Enhance sector schema description
4. `src/lib/game/tools/information/tools.ts` - Show sector details
5. `src/lib/game/rules/movement.ts` - Enhance suggestions, add helpers
6. `src/lib/game/state/factory.ts` - Fix default sector logic
7. `src/lib/game/tools/context.ts` - Add sector context to requests

## Priority

**High Priority:**
- Phase 1: Tool descriptions (quick win, helps agents understand)
- Phase 2: Information tools (critical for agent decision-making)
- Phase 4: Default sector fix (prevents bugs)

**Medium Priority:**
- Phase 3: Suggestion enhancement (nice to have)
- Phase 5: Helper functions (code quality)

**Low Priority:**
- Phase 6: Context enhancement (optimization)

---

*Last Updated: After sector mapping corrections*

