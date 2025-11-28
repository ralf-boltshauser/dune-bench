# Revival Phase - Difficult Scenarios Investigation

## Overview

This document identifies the difficult scenarios and edge cases in the Revival Phase that need comprehensive testing.

## Key Mechanics

### Force Revival
- **Free Revival**: Varies by faction (2 for most, 3 for Fremen)
- **Paid Revival**: 2 spice per force beyond free revival
- **Maximum**: 3 forces per turn (total of regular + elite)
- **Elite Forces**: Fedaykin/Sardaukar can only revive 1 per turn

### Leader Revival
- **Condition**: Can only revive when all leaders dead or all have died at least once
- **Cost**: Leader's strength in spice
- **Face-Down Leaders**: Cannot be revived until others die again

### Special Abilities
- **Fremen Alliance**: Can grant 3 free revivals to ally (at discretion)
- **Emperor Alliance**: Can pay for up to 3 extra ally revivals
- **Kwisatz Haderach**: Can be revived for 2 spice when conditions met
- **Tleilaxu Ghola**: Special card for extra revival

## Difficult Scenarios Identified

### 1. Fremen Fedaykin Revival Limit
**What makes it difficult**: 
- Elite forces (Fedaykin) can only revive 1 per turn
- Must track `eliteForcesRevivedThisTurn` counter
- Fedaykin count as 1 force in revival (not 2x like in battle)

**Rules involved**:
- FEDAYKIN REVIVAL: They are each treated as one Force in revival
- FEDAYKIN TRAINING: Only one Fedaykin Force can be revived per Turn

**What to test**:
- Fremen tries to revive 2 Fedaykin in one turn (should fail)
- Fremen revives 1 Fedaykin + 2 regular (should succeed)
- Counter resets at start of new turn

### 2. Fremen Alliance Boost Decision
**What makes it difficult**:
- Fremen is asked FIRST before other factions
- Decision is at Fremen's discretion each turn
- Ally gets 3 free revivals instead of normal amount
- Must check if ally has forces in tanks before asking

**Rules involved**:
- ALLIANCE: At your discretion, your ally's free revival is 3

**What to test**:
- Fremen grants boost → ally gets 3 free revivals
- Fremen denies boost → ally gets normal free revivals
- Ally has no forces in tanks → Fremen not asked
- Multiple turns → decision can change each turn

### 3. Emperor Ally Revival Bonus
**What makes it difficult**:
- Emperor can pay for up to 3 extra ally revivals
- This is BEYOND the ally's normal revival limit
- Must track `emperorAllyRevivalsUsed` per ally
- Cost is 2 spice per force (paid by Emperor)

**Rules involved**:
- ALLIANCE: You may pay spice for the revival of up to 3 extra of your ally's Forces beyond their current limit

**What to test**:
- Emperor pays for 1, 2, 3 extra ally revivals
- Tracking correctly shows remaining bonus
- Emperor doesn't have enough spice → partial revival
- Counter resets at start of new turn

### 4. Leader Revival Conditions
**What makes it difficult**:
- Can only revive when ALL leaders dead OR all have died at least once
- Face-down leaders (died twice) cannot be revived until others die again
- Must check leader pool for active leaders
- Cost varies by leader strength

**Rules involved**:
- When a player has no Active Leaders or all of there leaders have died at least once, they may revive 1 face up leader per Turn

**What to test**:
- All leaders dead → can revive
- All leaders have died once → can revive
- Some leaders active → cannot revive
- Face-down leader → cannot revive until others die again
- Insufficient spice → cannot revive

### 5. Kwisatz Haderach Revival
**What makes it difficult**:
- Special revival condition (all leaders dead once OR no active leaders)
- Costs 2 spice (KH strength is +2)
- Can be revived instead of a leader
- Must check if KH is dead

**Rules involved**:
- REAWAKEN: When all other leaders have died once and/or become unavailable you may use your one leader revival action to revive this token instead of a leader

**What to test**:
- All leaders dead once → can revive KH
- No active leaders → can revive KH
- Active leaders exist → cannot revive KH
- Insufficient spice → cannot revive KH

### 6. Tleilaxu Ghola Card
**What makes it difficult**:
- Can revive 1 leader REGARDLESS of leader status (bypasses normal rules)
- Can revive up to 5 forces for FREE
- This is IN ADDITION to normal revival
- Card must be discarded after use

**Rules involved**:
- TLEILAXU GHOLA: Play at any time to gain an extra Revival. You may immediately revive 1 of your Leaders regardless of how many leaders you have in the Tanks or up to 5 of your Forces from the Tleilaxu Tanks to your reserves at no cost in spice.

**What to test**:
- Revive leader even with active leaders (bypasses rule)
- Revive 5 forces for free (no spice cost)
- Card is discarded after use
- Can use normal revival + Ghola in same turn

### 7. Simultaneous Revival (No Storm Order)
**What makes it difficult**:
- All factions revive simultaneously (no storm order)
- Multiple factions making decisions at once
- State changes must be handled correctly
- Events must fire in correct order

**Rules involved**:
- Rule 1.05: "There is no Storm Order in this Phase."

**What to test**:
- All factions get requests simultaneously
- Responses processed correctly
- State updates don't interfere with each other
- Events fire for all factions

### 8. Insufficient Spice Edge Cases
**What makes it difficult**:
- Faction wants to revive more than they can afford
- Handler must clamp to affordable amount
- Free revivals still work even with 0 spice
- Partial paid revival if some spice available

**What to test**:
- 0 spice → only free revival
- 1 spice → only free revival (can't afford 2 spice)
- 2 spice → 2 free + 1 paid
- Wants 3 but only has 2 spice → clamps to 2 free + 1 paid

### 9. Complex Multi-Faction Interactions
**What makes it difficult**:
- Multiple factions with different situations
- Mix of force and leader revivals
- Alliance abilities interacting
- Elite forces mixed with regular

**What to test**:
- Multiple factions reviving simultaneously
- Different revival amounts and costs
- Alliance abilities working correctly
- Elite force limits enforced

## Edge Cases

1. **Faction has 0 forces in tanks** → Should not get revival request (or should pass)
2. **Faction has forces but 0 spice** → Only free revival available
3. **Elite forces already revived this turn** → Cannot revive more elite
4. **All leaders face-down** → Cannot revive any leaders
5. **Fremen ally has no forces in tanks** → Fremen not asked about boost
6. **Emperor ally has no forces in tanks** → Emperor cannot pay for ally revival
7. **Multiple alliances** → Each alliance ability works independently
8. **Revival limit exceeded** → Handler clamps to maximum

## Test Coverage Goals

- ✅ Basic force revival (free and paid)
- ✅ Leader revival conditions
- ✅ Fremen Fedaykin revival limit
- ✅ Fremen alliance boost (grant/deny)
- ✅ Emperor ally revival bonus
- ✅ Kwisatz Haderach revival
- ✅ Tleilaxu Ghola card usage
- ✅ Insufficient spice handling
- ✅ Complex multi-faction scenarios
- ✅ Edge cases and error conditions

