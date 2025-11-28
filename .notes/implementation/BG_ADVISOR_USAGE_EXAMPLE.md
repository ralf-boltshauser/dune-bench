# Bene Gesserit Advisor/Fighter Usage Examples

## Quick Reference

```typescript
import {
  Faction,
  TerritoryId,
  getBGAdvisorsInTerritory,
  getBGFightersInTerritory,
  getFactionsInTerritory,
  convertBGAdvisorsToFighters,
  convertBGFightersToAdvisors,
  shipForces,
} from '@/lib/game';
```

## Example 1: Shipping Forces (All Start as Advisors)

```typescript
// Ship 10 BG forces to Arrakeen
state = shipForces(state, Faction.BENE_GESSERIT, TerritoryId.ARRAKEEN, 9, 10);

// Check the distribution
const advisors = getBGAdvisorsInTerritory(state, TerritoryId.ARRAKEEN); // 10
const fighters = getBGFightersInTerritory(state, TerritoryId.ARRAKEEN); // 0

console.log(`BG has ${advisors} advisors and ${fighters} fighters`);
// Output: "BG has 10 advisors and 0 fighters"
```

## Example 2: Converting Advisors to Fighters Before Battle

```typescript
// BG has 10 advisors in Arrakeen
// Convert 6 to fighters before battle
state = convertBGAdvisorsToFighters(state, TerritoryId.ARRAKEEN, 9, 6);

// Now: 4 advisors, 6 fighters
const advisors = getBGAdvisorsInTerritory(state, TerritoryId.ARRAKEEN); // 4
const fighters = getBGFightersInTerritory(state, TerritoryId.ARRAKEEN); // 6
```

## Example 3: Battle Eligibility

```typescript
// Scenario A: BG only has advisors
state = shipForces(state, Faction.BENE_GESSERIT, TerritoryId.ARRAKEEN, 9, 10);
state = shipForces(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, 5);

let factions = getFactionsInTerritory(state, TerritoryId.ARRAKEEN);
console.log(factions); // ['atreides'] - NO BATTLE (BG excluded)

// Scenario B: BG has some fighters
state = convertBGAdvisorsToFighters(state, TerritoryId.ARRAKEEN, 9, 3);

factions = getFactionsInTerritory(state, TerritoryId.ARRAKEEN);
console.log(factions); // ['atreides', 'bene_gesserit'] - BATTLE OCCURS
```

## Example 4: Strategic Advisor Placement

```typescript
// BG can place advisors near enemy territory without triggering battle
state = shipForces(state, Faction.HARKONNEN, TerritoryId.CARTHAG, 11, 8);
state = shipForces(state, Faction.BENE_GESSERIT, TerritoryId.CARTHAG, 11, 5);

// Check if battle occurs
const factions = getFactionsInTerritory(state, TerritoryId.CARTHAG);
// Only Harkonnen - NO BATTLE (BG advisors don't count)

// Later, BG can flip to fighters when ready
state = convertBGAdvisorsToFighters(state, TerritoryId.CARTHAG, 11, 5);
// Now battle will occur
```

## Example 5: Converting Back to Advisors After Battle

```typescript
// After winning a battle, BG might want to flip back to advisors
// to avoid triggering new battles with other factions
state = convertBGFightersToAdvisors(state, TerritoryId.ARRAKEEN, 9, 3);

// This is useful when:
// 1. Avoiding unwanted battles
// 2. Protecting forces (advisors can't be used in combat)
// 3. Strategic positioning without aggression
```

## Example 6: Checking Force Status in Battle Phase

```typescript
// In battle handler or AI agent
const territoryId = TerritoryId.ARRAKEEN;
const bgAdvisors = getBGAdvisorsInTerritory(state, territoryId);
const bgFighters = getBGFightersInTerritory(state, territoryId);

if (bgFighters === 0) {
  console.log('BG cannot participate in battle (only advisors present)');
} else if (bgAdvisors > 0) {
  console.log(`BG has ${bgFighters} fighters available, ${bgAdvisors} advisors protected`);
} else {
  console.log(`All ${bgFighters} BG forces are fighters`);
}
```

## Example 7: AI Agent Tool Implementation

```typescript
// In src/lib/game/tools/actions/bene-gesserit.ts
export const flipAdvisorsToFightersTool = createTool({
  name: 'flip_advisors_to_fighters',
  description: `
    Convert Bene Gesserit advisors (spiritual side) to fighters (battle side).
    Use this before battle to make advisors combat-capable.

    IMPORTANT: Only fighters can participate in battle. Advisors are non-combatants.
  `,
  parameters: z.object({
    territoryId: z.string().describe('Territory where the forces are located'),
    sector: z.number().min(0).max(17).describe('Sector number within the territory'),
    count: z.number().min(1).describe('Number of advisors to convert to fighters'),
  }),
  execute: async (state, params, manager) => {
    const { territoryId, sector, count } = params;

    // Validate
    const advisors = getBGAdvisorsInTerritory(state, territoryId as TerritoryId);
    if (advisors < count) {
      return manager.failure(
        `Not enough advisors. Have ${advisors}, trying to convert ${count}`
      );
    }

    // Convert
    const newState = convertBGAdvisorsToFighters(
      state,
      territoryId as TerritoryId,
      sector,
      count
    );

    manager.setState(newState);

    return manager.success(
      `Converted ${count} BG advisors to fighters in ${territoryId}`,
      {
        advisorsRemaining: getBGAdvisorsInTerritory(newState, territoryId as TerritoryId),
        fightersNow: getBGFightersInTerritory(newState, territoryId as TerritoryId),
      }
    );
  },
});
```

## Example 8: Force Removal (Advisors Die First)

```typescript
// When BG loses forces, advisors are removed first (non-combatants)
state = shipForces(state, Faction.BENE_GESSERIT, TerritoryId.ARRAKEEN, 9, 10);
state = convertBGAdvisorsToFighters(state, TerritoryId.ARRAKEEN, 9, 5);

// Now: 5 advisors, 5 fighters

// Remove 7 forces (e.g., from storm or battle loss)
state = sendForcesToTanks(state, Faction.BENE_GESSERIT, TerritoryId.ARRAKEEN, 9, 7);

// Result: All 5 advisors removed first, then 2 fighters
// Remaining: 0 advisors, 3 fighters
```

## Battle Phase Integration Pattern

```typescript
// In BattlePhaseHandler, before battle plans:
if (battle.defender === Faction.BENE_GESSERIT ||
    battle.aggressor === Faction.BENE_GESSERIT) {

  const territoryId = battle.territoryId;
  const advisors = getBGAdvisorsInTerritory(state, territoryId);

  if (advisors > 0) {
    // Offer BG opportunity to convert advisors
    return {
      state,
      phaseComplete: false,
      pendingRequests: [{
        factionId: Faction.BENE_GESSERIT,
        requestType: 'FLIP_ADVISORS',
        prompt: `You have ${advisors} advisors in ${territoryId}. Convert any to fighters for battle?`,
        availableActions: ['FLIP_ADVISORS_TO_FIGHTERS', 'PROCEED_WITH_CURRENT_FORCES'],
      }],
    };
  }
}
```

## Common Patterns

### Pattern 1: Peaceful Occupation
```typescript
// BG can occupy territories without triggering battles
state = shipForces(state, Faction.BENE_GESSERIT, TerritoryId.ARRAKEEN, 9, 10);
// All advisors - no battle threat
```

### Pattern 2: Surprise Attack
```typescript
// BG has advisors in territory, then flips them all to attack
state = convertBGAdvisorsToFighters(state, TerritoryId.ARRAKEEN, 9, 10);
// Now all fighters - battle initiated
```

### Pattern 3: Protected Rear Guard
```typescript
// Keep some advisors as non-combatants
state = convertBGAdvisorsToFighters(state, TerritoryId.ARRAKEEN, 9, 7);
// 7 fighters, 3 advisors (advisors survive if fighters lose)
```

### Pattern 4: Spice Collection Without Battle
```typescript
// BG can collect spice with advisors without provoking fights
state = shipForces(state, Faction.BENE_GESSERIT, spiceTerritory, sector, 5);
// Collect spice with advisors, no battle risk
```

## API Summary

### Query Functions
- `getBGAdvisorsInTerritory(state, territoryId)` - Get advisor count
- `getBGFightersInTerritory(state, territoryId)` - Get fighter count
- `getFactionsInTerritory(state, territoryId)` - Auto-excludes BG if only advisors

### Mutation Functions
- `convertBGAdvisorsToFighters(state, territoryId, sector, count)` - Flip to battle side
- `convertBGFightersToAdvisors(state, territoryId, sector, count)` - Flip to spiritual side
- `shipForces(...)` - Forces start as advisors
- `sendForcesToTanks(...)` - Removes advisors first

### Utility Functions
- `convertAdvisorsToFighters(stacks, territoryId, sector, count)` - Low-level conversion
- `convertFightersToAdvisors(stacks, territoryId, sector, count)` - Low-level conversion

## Key Rules to Remember

1. **All BG forces start as advisors** when placed on the board
2. **Only fighters can battle** - advisors are excluded from combat
3. **Advisors die first** when forces are removed
4. **Conversions are instantaneous** - no cost or delay
5. **Battle detection** automatically excludes BG with only advisors
6. **Stronghold occupancy** doesn't count BG-advisor-only presence for battle limits
7. **Spice collection** works with advisors (they're not completely useless!)
