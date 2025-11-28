# Leader Rules Verification (battle.md lines 12-15)

## Rule Reference
From `handwritten-rules/battle.md`:
- **Line 12**: "LEADERS: One Leader Disc is selected and put face up in the slot on the wheel. A Cheap Hero Card may be played in lieu of a Leader Disc."
- **Line 13**: "DEDICATED LEADER: Leaders that survive battles may fight more than once in a single Territory if needed, but no leader may fight in more than one Territory during the same Phase. -1.07.06.06.00"
- **Line 14**: "LEADER ANNOUNCEMENT: A player must always play either a leader or a Cheap Hero card as part of their Battle Plan if possible. When it is not possible, a player must announce that they can not play a leader or Cheap Hero."
- **Line 15**: "NO TREACHERY: A player with no leader or Cheap Hero must still battle, but they can not play any Treachery Cards as part of their Battle Plan. (This situation can occur when a player does not have a Cheap Hero and all their leaders are in the Tleilaxu Tanks or have fought in another Territory in that Phase.)"

---

## 1. Cheap Hero in Lieu of Leader Disc

### Rule Requirement
"A Cheap Hero Card may be played in lieu of a Leader Disc."

### Implementation Status
✅ **CORRECTLY IMPLEMENTED**

**Location**: `src/lib/game/rules/combat.ts` lines 110-165

**Current Behavior**:
- When **both leaders and Cheap Hero are available** → Player can choose either (optional)
- When **only leaders are available** → Must play a leader
- When **only Cheap Hero is available** → Must play Cheap Hero
- When **neither is available** → Must announce inability

**Implementation**: The rule "may be played in lieu" is correctly interpreted as allowing Cheap Hero as an optional alternative to a leader when both are available. The validation enforces that at least one must be played when available, but allows player choice.

**Code Reference**:
```110:165:src/lib/game/rules/combat.ts
  // Check: Leader or Cheap Hero requirement
  // Rule from battle.md line 12: "A Cheap Hero Card may be played in lieu of a Leader Disc."
  // Rule from battle.md line 14: "A player must always play either a leader or a Cheap Hero card as part of their Battle Plan if possible."
  if (!plan.leaderId && !plan.cheapHeroUsed) {
    if (hasLeaders || hasCheapHeroCard) {
      // Has leaders OR Cheap Hero available - must play one (player's choice)
      if (hasLeaders && hasCheapHeroCard) {
        errors.push(
          createError(
            'MUST_PLAY_LEADER_OR_CHEAP_HERO',
            'You must play either a leader or Cheap Hero (your choice)',
            {
              field: 'leaderId',
              suggestion: `Play ${availableLeaders[0].definitionId} or set cheapHeroUsed to true`,
            }
          )
        );
      } else if (hasLeaders) {
        // Only leaders available - must play a leader
        errors.push(
          createError(
            'MUST_PLAY_LEADER',
            'You must play a leader when you have available leaders',
            {
              field: 'leaderId',
              suggestion: `Play ${availableLeaders[0].definitionId}`,
            }
          )
        );
      } else if (hasCheapHeroCard) {
        // Only Cheap Hero available - MUST play it (forced rule)
        errors.push(
          createError(
            'MUST_PLAY_CHEAP_HERO',
            'You must play Cheap Hero when you have no available leaders',
            {
              field: 'cheapHeroUsed',
              suggestion: 'Set cheapHeroUsed to true',
            }
          )
        );
      }
    } else {
      // No leaders AND no cheap hero - must announce inability
      // Rule from battle.md line 14: "When it is not possible, a player must
      // announce that they can not play a leader or Cheap Hero."
      if (!plan.announcedNoLeader) {
        errors.push(
          createError(
            'MUST_ANNOUNCE_NO_LEADER',
            'You must announce that you cannot play a leader or Cheap Hero',
            {
              field: 'announcedNoLeader',
              suggestion: 'Set announcedNoLeader to true',
            }
          )
        );
      }
    }
  }
```

**Verification**: ✅ Correct
- Allows Cheap Hero as optional choice when leaders are available
- Enforces playing at least one when available
- Maintains mandatory Cheap Hero when no leaders available

---

## 2. Dedicated Leader Rule

### Rule Requirement
"Leaders that survive battles may fight more than once in a single Territory if needed, but no leader may fight in more than one Territory during the same Phase."

### Implementation Status
✅ **CORRECTLY IMPLEMENTED**

**Location**: `src/lib/game/rules/combat.ts` lines 165-179

**Implementation Details**:
- Leaders with `LeaderLocation.ON_BOARD` status (surviving leaders) can fight multiple times in the **same territory**
- Leaders cannot fight in **different territories** in the same phase
- Validation checks `usedThisTurn` and `usedInTerritoryId` to enforce this

**Code Reference**:
```165:179:src/lib/game/rules/combat.ts
    } else if (leader.location === LeaderLocation.ON_BOARD) {
      // DEDICATED LEADER: Leaders ON_BOARD can fight multiple times in SAME territory
      if (leader.usedThisTurn && leader.usedInTerritoryId !== territoryId) {
        errors.push(
          createError(
            'LEADER_ALREADY_USED',
            `${plan.leaderId} already fought in another territory this turn`,
            {
              field: 'leaderId',
              suggestion: `Choose from: ${availableLeaders.map((l) => l.definitionId).join(', ')}`,
            }
          )
        );
      }
      // If usedInTerritoryId === territoryId, allow it (fighting again in same territory)
```

**Verification**: ✅ Correct
- Allows reusing leader in same territory (`usedInTerritoryId === territoryId`)
- Prevents using leader in different territory (`usedInTerritoryId !== territoryId`)

---

## 3. Leader Announcement Requirement

### Rule Requirement
"A player must always play either a leader or a Cheap Hero card as part of their Battle Plan if possible. When it is not possible, a player must announce that they can not play a leader or Cheap Hero."

### Implementation Status
✅ **CORRECTLY IMPLEMENTED**

**Location**: `src/lib/game/rules/combat.ts` lines 136-151

**Implementation Details**:
- When no leaders available AND no Cheap Hero card → Must set `announcedNoLeader: true`
- Validation error `MUST_ANNOUNCE_NO_LEADER` is raised if announcement is missing
- Event is logged in battle phase handler when announcement is made

**Code Reference**:
```136:151:src/lib/game/rules/combat.ts
    } else {
      // No leaders AND no cheap hero - must announce inability
      // Rule from battle.md line 14: "When it is not possible, a player must
      // announce that they can not play a leader or Cheap Hero."
      if (!plan.announcedNoLeader) {
        errors.push(
          createError(
            'MUST_ANNOUNCE_NO_LEADER',
            'You must announce that you cannot play a leader or Cheap Hero',
            {
              field: 'announcedNoLeader',
              suggestion: 'Set announcedNoLeader to true',
            }
          )
        );
      }
    }
```

**Event Logging** (in `src/lib/game/phases/handlers/battle.ts` lines 742-749):
```742:749:src/lib/game/phases/handlers/battle.ts
      // Log leader announcement if applicable
      // Rule from battle.md line 14: Player must announce when they cannot play a leader or Cheap Hero
      if (plan.announcedNoLeader) {
        events.push({
          type: 'NO_LEADER_ANNOUNCED',
          data: { faction: response.factionId },
          message: `${response.factionId} announces they cannot play a leader or Cheap Hero`,
        });
      }
```

**Verification**: ✅ Correct
- Enforces announcement when neither leader nor Cheap Hero is available
- Properly logs the announcement as a game event

---

## 4. NO TREACHERY Rule

### Rule Requirement
"A player with no leader or Cheap Hero must still battle, but they can not play any Treachery Cards as part of their Battle Plan."

### Implementation Status
✅ **CORRECTLY IMPLEMENTED**

**Location**: `src/lib/game/rules/combat.ts` lines 216-226

**Implementation Details**:
- Checks if player has leader OR Cheap Hero (`hasLeaderOrHero`)
- If neither is present, prevents playing weapon or defense cards
- Validation error `CANNOT_PLAY_TREACHERY_WITHOUT_LEADER` is raised

**Code Reference**:
```216:226:src/lib/game/rules/combat.ts
  // Check: Treachery cards require leader or cheap hero
  const hasLeaderOrHero = plan.leaderId || plan.cheapHeroUsed;
  if (!hasLeaderOrHero && (plan.weaponCardId || plan.defenseCardId)) {
    errors.push(
      createError(
        'CANNOT_PLAY_TREACHERY_WITHOUT_LEADER',
        'Cannot play weapon or defense cards without a leader or Cheap Hero',
        { suggestion: 'Add a leader or Cheap Hero to your battle plan' }
      )
    );
  }
```

**Verification**: ✅ Correct
- Prevents treachery cards when no leader and no Cheap Hero
- Still allows battle to proceed (forces dialed can still be set)
- Matches rule description: "must still battle, but they can not play any Treachery Cards"

---

## Summary

| Rule | Status | Notes |
|------|--------|-------|
| **Cheap Hero in lieu** | ✅ Correct | Allows Cheap Hero as optional choice when leaders available |
| **Dedicated Leader** | ✅ Correct | Allows multiple battles in same territory, prevents multiple territories |
| **Leader Announcement** | ✅ Correct | Enforces announcement when no leader/Cheap Hero available |
| **NO TREACHERY** | ✅ Correct | Prevents treachery cards when no leader/Cheap Hero, but battle still occurs |

---

## Recommendations

1. **Consider adding test cases**:
   - Test Cheap Hero usage when leaders are available (optional choice)
   - Test Dedicated Leader fighting multiple times in same territory
   - Test NO TREACHERY enforcement with various scenarios

