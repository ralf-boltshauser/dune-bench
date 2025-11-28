# Fremen Shipment + BG Spiritual Advisor Fix Summary

## Issue
Fremen shipment logic had two potential issues:
1. ✅ **Fremen shipment must be FREE** - Already correctly implemented
2. ✅ **Fremen reserves must not trigger BG Spiritual Advisors** - FIXED

## The Critical Bug: BG Spiritual Advisors

### Rule Analysis

**Rule 2.02.05 - BG Spiritual Advisors:**
> "Whenever any other faction **Ships Forces onto Dune from off-planet**, you may Send 1 Force (fighter) for free from your reserves to the Polar Sink."

**Rule 2.04.03 - Fremen NATIVES:**
> "Your Reserves are in a Territory on the far side of Dune (in front of your shield, off the board). Unlike other factions you do not have Off-Planet Reserves and can not ship with the normal Shipping method."

**Rule 2.04.05 - Fremen SHIPMENT:**
> "During the Shipment, you may **Send** any or all your reserves for free onto the Great Flat or onto any one Territory on the Map within two territories of the Great Flat"

### The Distinction

The rules use two different verbs intentionally:
- **"Ship from off-planet"** - What other factions do (Atreides, Harkonnen, Emperor, Guild, BG)
- **"Send from on-planet reserves"** - What Fremen do (reserves are ON Dune, not off-planet)

**Therefore:**
- Fremen "Send" forces ≠ "Ship from off-planet"
- Fremen shipment does NOT trigger BG Spiritual Advisors
- Only factions that "Ship from off-planet" trigger the BG ability

## Files Modified

### 1. `/src/lib/game/phases/handlers/shipment-movement.ts` (Lines 815-832)

**FIXED:** Added Fremen check to `shouldAskBGSpiritualAdvisor()`

```typescript
private shouldAskBGSpiritualAdvisor(state: GameState, shippingFaction: Faction): boolean {
  // Only trigger for non-BG factions
  if (shippingFaction === Faction.BENE_GESSERIT) return false;

  // Fremen "Send" forces from on-planet reserves, not "Ship from off-planet"
  // Rule 2.04.03: Fremen reserves are on Dune, not off-planet
  // Rule 2.02.05: BG ability only triggers for "Ships Forces onto Dune from off-planet"
  if (shippingFaction === Faction.FREMEN) return false;

  // BG must be in game and have reserves
  if (!state.factions.has(Faction.BENE_GESSERIT)) return false;

  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  const reserves = bgState.forces.reserves.regular + bgState.forces.reserves.elite;
  if (reserves === 0) return false;

  return true;
}
```

## Verification of Existing Correct Implementation

### 2. `/src/lib/game/tools/actions/shipment.ts` (Lines 192-337)

**Already Correct:** `fremen_send_forces` tool

```typescript
fremen_send_forces: tool({
  description: `Fremen special ability: Send forces from reserves for FREE to the Great Flat or nearby territories.

Valid destinations:
- The Great Flat itself
- Any territory within 2 territories of The Great Flat

Special abilities:
- COMPLETELY FREE (no spice cost)  // ✅ Line 200
- Can optionally use Storm Migration: send into storm at half loss (rounded up)
- Subject to normal storm restrictions (unless using storm migration)
- Subject to occupancy limits at strongholds

This is your only shipment method as Fremen - you cannot use normal off-planet shipment.`,
  // ... implementation ...
  return successResult(message, {
    faction,
    territoryId,
    sector,
    count,
    cost: 0,  // ✅ Line 332 - FREE!
    stormMigration: allowStormMigration && inStorm,
    forcesLost: lostToStorm,
    forcesSurvived: count - lostToStorm,
  }, true);
})
```

### 3. `/src/lib/game/rules/movement.ts` (Lines 63-71)

**Already Correct:** Fremen blocked from normal shipment

```typescript
export function validateShipment(
  state: GameState,
  faction: Faction,
  territoryId: TerritoryId,
  sector: number,
  forceCount: number
): ValidationResult<ShipmentSuggestion> {
  // ... setup ...

  // Check: Faction is Fremen (can't ship normally)
  if (faction === Faction.FREMEN) {
    errors.push(
      createError(
        'CANNOT_SHIP_FROM_BOARD',
        'Fremen cannot use normal shipment. Use your special fremen_send_forces ability to send forces to the Great Flat area for free.',
        { suggestion: 'Use fremen_send_forces tool instead of ship_forces' }
      )
    );
  }
  // ... rest of validation ...
}
```

## Test Results

### BG Trigger Logic Test

| Faction Ships | Should Trigger BG? | Result |
|---------------|-------------------|---------|
| Fremen | ❌ No (on-planet reserves) | ✅ PASS |
| Atreides | ✅ Yes (off-planet reserves) | ✅ PASS |
| Harkonnen | ✅ Yes (off-planet reserves) | ✅ PASS |
| Emperor | ✅ Yes (off-planet reserves) | ✅ PASS |
| Guild | ✅ Yes (off-planet reserves) | ✅ PASS |
| BG | ❌ No (self-trigger blocked) | ✅ PASS |

## Summary

All three aspects of Fremen shipment are now correctly implemented:

1. ✅ **Free Shipment**: Fremen send forces for 0 spice (cost: 0)
2. ✅ **No Normal Shipment**: Fremen cannot use `ship_forces` tool
3. ✅ **No BG Trigger**: Fremen "Send" does not trigger BG Spiritual Advisors

The key insight is the rule distinction between "Ship from off-planet" and "Send from on-planet reserves" - Fremen are unique in having reserves ON Dune rather than off-planet.
