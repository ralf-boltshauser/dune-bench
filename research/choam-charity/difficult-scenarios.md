# CHOAM Charity Phase - Difficult Scenarios

## Overview

The CHOAM Charity phase is relatively straightforward, but there are several edge cases and special abilities that need thorough testing.

## Key Mechanics

1. **Eligibility**: Factions with 0 or 1 spice are eligible
2. **Standard Charity**: Brings total to 2 spice (0→2, 1→1)
3. **Bene Gesserit Advanced Ability**: Always eligible, always receives at least 2 spice
4. **Fraud Safeguards**: Can only claim once per turn
5. **Optional**: Factions can decline charity even if eligible

## Difficult Scenarios to Test

### 1. Standard Charity - Multiple Spice Levels
**What makes it difficult**: Testing both 0 spice and 1 spice cases
- **Faction with 0 spice**: Should receive 2 spice (0 → 2)
- **Faction with 1 spice**: Should receive 1 spice (1 → 2)
- **Faction with 2+ spice**: Not eligible

### 2. Bene Gesserit Advanced Ability
**What makes it difficult**: Special rule that overrides standard eligibility
- **BG with 0 spice**: Should receive 2 spice (standard behavior)
- **BG with 1 spice**: Should receive 2 spice (bringing total to 3, not 2!)
- **BG with 2+ spice**: Still eligible and receives 2 spice
- **BG in Basic Rules**: Should follow standard rules (only eligible with 0-1 spice)

### 3. Multiple Factions Claiming Simultaneously
**What makes it difficult**: All eligible factions are asked simultaneously
- Multiple factions with different spice levels (0, 1, 2+)
- Some claim, some decline
- Verify all claims processed correctly
- Verify spice amounts are correct for each

### 4. Factions Declining Charity
**What makes it difficult**: Charity is optional
- Eligible faction chooses not to claim
- Verify no spice is added
- Verify no event is logged for declining

### 5. Fraud Safeguards
**What makes it difficult**: Preventing double-claiming
- Faction tries to claim twice in same turn
- Verify second claim is rejected
- Verify only first claim is processed

### 6. No Eligible Factions
**What makes it difficult**: Phase should skip if no one is eligible
- All factions have 2+ spice
- Phase should complete immediately
- No agent requests should be made

### 7. Mixed Scenarios
**What makes it difficult**: Combining multiple edge cases
- BG (advanced) with high spice + standard factions with 0-1 spice
- Some claim, some decline
- Verify all amounts correct

## Special Considerations

### Karama Cards
- Karama can cancel Bene Gesserit CHARITY ability (marked with ✷)
- If cancelled, BG must follow standard eligibility rules
- **Note**: This is not implemented in current handler, but should be tested if added

### Homeworld Variant
- Low Threshold factions receive +1 extra spice
- **Note**: This is marked as TODO in handler, not yet implemented

## Test Priorities

1. **High Priority**:
   - Standard charity (0 and 1 spice)
   - Bene Gesserit advanced ability
   - Multiple factions claiming simultaneously
   - Fraud safeguards

2. **Medium Priority**:
   - Factions declining charity
   - No eligible factions
   - Mixed scenarios

3. **Low Priority** (Future):
   - Karama cancellation of BG ability
   - Homeworld variant bonuses

