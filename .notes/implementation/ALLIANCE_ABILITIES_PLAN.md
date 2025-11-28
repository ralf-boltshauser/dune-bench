# Alliance Abilities Implementation Plan

## Research Summary

### Fremen Alliance Ability
**Rule 2.04.09 (ALLIANCE)**: "Your allies win with you when you win with the Fremen Special Victory Condition (ability 2.04.09)."

**Status**: ✅ Already implemented in `src/lib/game/rules/victory.ts` (lines 205-209)
- When Fremen wins special victory, their ally is included in winners array
- No additional implementation needed

### Emperor Alliance Abilities

#### 1. Give Spice to Ally
**Rule 2.03.08 (ALLIANCE)**: "You may give spice to your ally at any time for any reason. Spice you give to your ally goes behind their shield and is now their spice."

**Implementation Plan**:
- Add tool: `give_spice_to_ally` (Emperor only)
- Available during any phase (except maybe Mentat Pause per bribe rules)
- Transfer spice from Emperor to ally
- Update game state mutations

#### 2. Pay for Ally's Revival
**Rule 2.03.09 (ALLIANCE)**: "You may pay spice for the revival of up to 3 extra of your ally's Forces beyond their current limit from the Tleilaxu Tanks.✷"

**Implementation Plan**:
- During Revival Phase, if Emperor has an ally:
  - Ask Emperor if they want to pay for ally's extra revival
  - Can pay for up to 3 extra forces beyond ally's normal limit
  - Cost: 2 spice per force (normal paid revival cost)
  - Modify revival phase handler to support this

### Bene Gesserit Alliance Ability (Bonus)
**Rule 2.02.07 (ALLIANCE)**: "In your ally's battle you may use ability Voice [2.02.06] on your ally's opponent.✷"

**Implementation Plan**:
- During Battle Phase, if Bene Gesserit has an ally in battle:
  - Allow Bene Gesserit to use Voice on their ally's opponent
  - Modify battle phase handler to support this

## Implementation Priority

1. ✅ **Fremen Alliance** - Already implemented in victory check
2. ✅ **Bidding Phase BOUGHT-IN** - Fixed: When all pass, return all remaining cards and end bidding
3. ✅ **Revival Phase** - Fixed: Now asks for ADDITIONAL forces beyond free revival
4. **Emperor: Give Spice** - Add tool and state mutation (any phase)
5. **Emperor: Pay for Ally Revival** - Modify revival phase to allow Emperor to pay for ally's extra revival
6. **Bene Gesserit: Voice in Ally's Battle** - Modify battle phase (lower priority)

## Implementation Status

### ✅ Completed
- **Bidding Phase BOUGHT-IN Rule**: When all players pass on a card, all remaining cards are returned to deck and bidding ends immediately (Rule 1.04.11)
- **Revival Phase Prompt**: Now asks agents for ADDITIONAL forces to revive beyond their free revival, not total count
- **Fremen Alliance Victory**: Already implemented - allies win with Fremen special victory

### 🔄 To Implement
- **Emperor: Give Spice to Ally** (Rule 2.03.08)
- **Emperor: Pay for Ally Revival** (Rule 2.03.09)
- **Bene Gesserit: Voice in Ally's Battle** (Rule 2.02.07)

