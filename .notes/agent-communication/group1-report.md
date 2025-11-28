# Group 1: Test State Builders Fix Report

## Summary
Fixed all TypeScript errors related to TreacheryCard, TraitorCard, and ForceStack type mismatches in test state builder files.

## Files Fixed

### 1. `src/lib/game/phase-tests/battle/helpers/test-state-builder.ts`

#### Issue 1: TreacheryCard creation (line 226)
**Problem**: Missing `location` and `ownerId` properties when creating TreacheryCard objects.

**Fix**: Added required properties:
- `location: CardLocation.HAND` - indicates card is in hand
- `ownerId: faction` - indicates which faction owns the card

**Changes**:
- Added `CardLocation` import
- Updated `addCardToHand` function to include all required TreacheryCard properties

#### Issue 2: TraitorCard creation (line 254)
**Problem**: 
- Used incorrect property name `faction` instead of `leaderFaction`
- Missing `leaderName` property
- Missing `heldBy` property

**Fix**: 
- Changed `faction` to `leaderFaction`
- Added `leaderName` by fetching leader definition using `getLeaderDefinition`
- Added `heldBy: faction` to indicate which faction holds the traitor card
- Added error handling if leader definition is not found

**Changes**:
- Added `getLeaderDefinition` import
- Updated `addTraitorCard` function to properly construct TraitorCard with all required properties

### 2. `src/lib/game/phase-tests/revival/helpers/test-state-builder.ts`

#### Issue 1: TreacheryCard creation (line 182)
**Problem**: Missing `location` and `ownerId` properties when creating TreacheryCard objects.

**Fix**: Added required properties:
- `location: CardLocation.HAND`
- `ownerId: faction`

**Changes**:
- Added `CardLocation` import
- Updated card creation in `buildTestState` function

#### Issue 2: ForceStack creation (line 86)
**Problem**: Missing `factionId` property when creating ForceStack objects.

**Fix**: Added `factionId: faction` property to the stack object.

**Changes**:
- Updated ForceStack creation to include `factionId`

#### Issue 3: ForceStack undefined handling (lines 91, 93, 95)
**Problem**: Code accessed `stack.forces` without checking if `stack` was defined after creation.

**Fix**: Added null check before accessing stack properties.

**Changes**:
- Wrapped force updates in `if (stack)` check to handle potential undefined cases

### 3. `src/lib/game/test-battle-phase-example.ts`

#### Issue: TraitorCard creation (line 113)
**Problem**: TraitorCard object missing required properties:
- Missing `leaderName`
- Missing `leaderFaction`
- Missing `heldBy`

**Fix**: 
- Added `getLeaderDefinition` import
- Fetched leader definition to get `leaderName`
- Added `leaderFaction: Faction.ATREIDES` (Paul Atreides is an Atreides leader)
- Added `heldBy: Faction.BENE_GESSERIT`
- Added null check for leader definition

**Changes**:
- Added `getLeaderDefinition` import
- Updated traitor card creation with all required properties

## Type Definitions Reference

### TreacheryCard
```typescript
interface TreacheryCard {
  definitionId: string;
  type: TreacheryCardType;
  location: CardLocation;      // Required
  ownerId: Faction | null;      // Required (null if in deck/discard)
}
```

### TraitorCard
```typescript
interface TraitorCard {
  leaderId: string;
  leaderName: string;           // Required
  leaderFaction: Faction;       // Required (not "faction")
  heldBy: Faction | null;       // Required
}
```

### ForceStack
```typescript
interface ForceStack {
  factionId: Faction;           // Required
  territoryId: TerritoryId;
  sector: number;
  forces: ForceCount;
  advisors?: number;            // Optional (BG-specific)
}
```

## Verification

Ran `tsc --noEmit` to verify all fixes. The three files fixed in this task have no TypeScript errors:
- ✅ `src/lib/game/phase-tests/battle/helpers/test-state-builder.ts`
- ✅ `src/lib/game/phase-tests/revival/helpers/test-state-builder.ts`
- ✅ `src/lib/game/test-battle-phase-example.ts`

## Notes

- All fixes maintain backward compatibility with existing test code
- Added proper error handling where leader definitions might not be found
- Used appropriate CardLocation enum values (HAND for cards in hand)
- All required properties are now properly set according to type definitions

