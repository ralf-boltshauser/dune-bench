# Battle Phase Validation

Comprehensive validation checklist for the Battle Phase implementation.

## Overview

The Battle Phase (Phase 1.07) is one of the most complex phases, involving:
- Battle identification and ordering
- Battle plan creation
- Faction abilities (Prescience, Voice)
- Battle resolution
- Leader management
- Traitor mechanics
- Faction-specific rules

## Validation Categories

### 1. Battle Identification

#### 1.1 Battle Detection
- [ ] All territories with 2+ factions are identified
- [ ] Territories with only one faction are excluded
- [ ] Polar Sink is excluded (neutral zone)
- [ ] Forces separated by storm in same territory are excluded
- [ ] Forces in same sector under storm still battle (BATTLING BLIND)

#### 1.2 Battle Ordering
- [ ] Battles occur in storm order
- [ ] First player in storm order becomes first aggressor
- [ ] Aggressor order follows storm order
- [ ] Aggressor chooses which battle to fight first
- [ ] Multiple battles in same territory handled correctly

### 2. Battle Plan Validation

#### 2.1 Forces Dialed
- [ ] Forces dialed >= 0
- [ ] Forces dialed <= forces in territory
- [ ] Forces dialed is an integer (or half-increment in advanced)
- [ ] Spice dialing: forces supported by spice count at full strength
- [ ] Spice dialing: unsupported forces count at half strength
- [ ] Spice dialing: all spice paid goes to Spice Bank
- [ ] Fremen Battle Hardened: forces always count at full strength

#### 2.2 Leader/Cheap Hero
- [ ] Leader or Cheap Hero played when available
- [ ] NO_LEADER_ANNOUNCED event when no leader/Cheap Hero available
- [ ] Cheap Hero can be played in lieu of Leader Disc
- [ ] Leader must be available (not in Tanks, not used in another territory)
- [ ] Dedicated Leader: leader can fight multiple times in same territory
- [ ] Dedicated Leader: leader cannot fight in multiple territories same phase

#### 2.3 Treachery Cards
- [ ] Weapon cards can only be played with leader/Cheap Hero
- [ ] Defense cards can only be played with leader/Cheap Hero
- [ ] NO TREACHERY: no cards if no leader/Cheap Hero
- [ ] Cards are optional (player may choose not to play)
- [ ] Cards are validated (weapon/defense types match)

#### 2.4 Battle Plan Events
- [ ] BATTLE_PLAN_SUBMITTED event for each faction
- [ ] NO_LEADER_ANNOUNCED event when appropriate
- [ ] Plan data includes all components (forces, leader, cards, spice)

### 3. Faction Abilities

#### 3.1 Atreides Prescience
- [ ] Prescience occurs BEFORE battle plans
- [ ] Prescience can target: leader, weapon, defense, or number dialed
- [ ] Prescience can be used in ally's battle
- [ ] PRESCIENCE_USED event emitted
- [ ] Prescience target must reveal chosen element
- [ ] If weapon/defense not played, cannot ask for different element

#### 3.2 Bene Gesserit Voice
- [ ] Voice occurs AFTER battle plans, BEFORE reveal
- [ ] Voice can command: play/not_play poison weapon, projectile weapon, poison defense, projectile defense, worthless card, Cheap Hero, specific weapon by name, specific defense by name
- [ ] Voice can be used in ally's battle
- [ ] VOICE_USED event emitted
- [ ] VOICE_COMPLIED event when opponent complies
- [ ] VOICE_VIOLATION event when opponent cannot comply
- [ ] Opponent must comply as well as able

#### 3.3 Atreides Kwisatz Haderach
- [ ] KH activates after 7+ force losses in battle(s)
- [ ] KWISATZ_HADERACH_ACTIVATED event
- [ ] KH adds +2 to leader strength when used
- [ ] KWISATZ_HADERACH_USED event
- [ ] KH does not add strength if leader killed
- [ ] KH cannot turn traitor when with leader
- [ ] KH can only be killed by lasgun/shield explosion
- [ ] KWISATZ_HADERACH_KILLED event
- [ ] KWISATZ_HADERACH_REVIVED event

#### 3.4 Emperor Sardaukar
- [ ] Sardaukar (starred forces) worth 2x in battle
- [ ] Sardaukar worth 1x against Fremen
- [ ] Sardaukar treated as 1 force in revival
- [ ] Only 1 Sardaukar can be revived per turn

#### 3.5 Fremen Fedaykin
- [ ] Fedaykin (starred forces) worth 2x in battle
- [ ] Fedaykin treated as 1 force in revival
- [ ] Only 1 Fedaykin can be revived per turn

#### 3.6 Harkonnen Captured Leaders
- [ ] Harkonnen can capture after winning battle
- [ ] HARKONNEN_CAPTURE_OPPORTUNITY event
- [ ] Random selection from available leaders
- [ ] KILL option: gain 2 spice, leader to Tanks
- [ ] CAPTURE option: leader joins Harkonnen pool
- [ ] Captured leader returns to original owner after use (if not killed)
- [ ] PRISON_BREAK: all captured leaders returned when all Harkonnen leaders killed
- [ ] Captured leaders can be called traitor
- [ ] LEADER_CAPTURED event
- [ ] LEADER_CAPTURED_AND_KILLED event

### 4. Battle Resolution

#### 4.1 Reveal Phase
- [ ] Battle plans revealed simultaneously
- [ ] REVEALING_PLANS sub-phase occurs
- [ ] Both plans visible before resolution

#### 4.2 Traitor Mechanics
- [ ] Traitor can be called when opponent uses matching leader
- [ ] TRAITOR_REVEALED event
- [ ] Traitor caller immediately wins battle
- [ ] Traitor caller loses nothing
- [ ] Traitor caller adds leader back to pool
- [ ] Traitor leader placed in Tanks
- [ ] Traitor caller receives leader value in spice
- [ ] SPICE_AWARDED event for traitor value
- [ ] Traitor victim loses all forces and discards all cards
- [ ] TWO_TRAITORS: both leaders traitors, both lose everything, no spice
- [ ] TWO_TRAITORS event emitted

#### 4.3 Winner Calculation
- [ ] Winner = higher total (forces dialed + leader strength)
- [ ] Aggressor wins ties
- [ ] Leader strength excluded if killed by weapon
- [ ] Leader strength excluded if weapon not defended
- [ ] Weapon/defense interactions checked correctly
- [ ] Lasgun kills leader (no defense)
- [ ] Lasgun + Shield = explosion (LASGUN_SHIELD_EXPLOSION event)
- [ ] Explosion: both lose, all forces destroyed, no spice

#### 4.4 Force Losses
- [ ] Winner loses only dialed forces
- [ ] Loser loses all forces in territory
- [ ] Forces sent to Tleilaxu Tanks
- [ ] Elite forces (Sardaukar/Fedaykin) counted correctly in losses

#### 4.5 Leader Outcomes
- [ ] Killed leaders placed face up in Tanks
- [ ] LEADER_KILLED event
- [ ] Winner receives killed leader value in spice (including own if killed)
- [ ] SPICE_AWARDED event for each killed leader
- [ ] Surviving leaders remain in territory
- [ ] Surviving leaders not in Leader Pool until Leader Return
- [ ] Surviving leaders protected from game effects

#### 4.6 Card Discarding
- [ ] Loser discards all cards played
- [ ] CARD_DISCARDED events for loser
- [ ] Winner may discard cards (optional choice)
- [ ] Winner keeps cards without "discard after use"
- [ ] Winner discards cards with "discard after use"
- [ ] WINNER_CARD_DISCARD_CHOICE sub-phase when winner has keepable cards

#### 4.7 Battle Resolution Events
- [ ] BATTLE_RESOLVED event emitted
- [ ] Event includes winner, loser, territory, sector
- [ ] Event includes force losses
- [ ] Event includes leader outcomes
- [ ] Event includes spice awarded

### 5. State Consistency

#### 5.1 Force Counts
- [ ] Total forces (start) = forces (end) + forces lost
- [ ] Forces in territory match actual placement
- [ ] Forces in Tanks increased by losses
- [ ] Forces on board decreased by losses

#### 5.2 Spice Counts
- [ ] Spice paid for dialing goes to Spice Bank
- [ ] Spice awarded for killed leaders comes from Spice Bank
- [ ] Faction spice increased by leader values
- [ ] Spice Bank decreased by leader values
- [ ] Traitor winner keeps spice paid (doesn't lose it)

#### 5.3 Leader States
- [ ] Leaders used marked as used
- [ ] Leaders killed moved to Tanks
- [ ] Leaders surviving remain in territory
- [ ] Leaders in territory have correct location
- [ ] Leader Pool excludes used/killed leaders
- [ ] Captured leaders in correct pool

#### 5.4 Card States
- [ ] Cards played removed from hand
- [ ] Cards discarded removed from hand
- [ ] Cards kept remain in hand
- [ ] Hand size limits respected

### 6. Event Sequence

#### 6.1 Phase Start
- [ ] PHASE_STARTED event (by PhaseManager)
- [ ] BATTLE_STARTED event if battles exist
- [ ] NO_BATTLES event if no battles

#### 6.2 Battle Flow
- [ ] AGGRESSOR_CHOOSING sub-phase
- [ ] Battle choice made
- [ ] PRESCIENCE_OPPORTUNITY (if Atreides)
- [ ] CREATING_BATTLE_PLANS
- [ ] VOICE_OPPORTUNITY (if BG)
- [ ] REVEALING_PLANS
- [ ] TRAITOR_CALL (if traitor called)
- [ ] BATTLE_RESOLUTION
- [ ] WINNER_CARD_DISCARD_CHOICE (if applicable)
- [ ] HARKONNEN_CAPTURE (if applicable)

#### 6.3 Phase End
- [ ] All battles resolved
- [ ] BATTLES_COMPLETE event
- [ ] Leader Return occurs (surviving leaders to pool)
- [ ] LEADER_RETURNED events
- [ ] PHASE_ENDED event

### 7. Edge Cases

#### 7.1 Multiple Battles
- [ ] Aggressor can fight multiple battles in same territory
- [ ] Pending battles updated after each battle
- [ ] Factions removed from pending when no forces remain
- [ ] Aggressor continues until all battles resolved

#### 7.2 Storm Separation
- [ ] Forces in different sectors separated by storm don't battle
- [ ] Forces in same sector under storm do battle
- [ ] areSectorsSeparatedByStorm() used correctly

#### 7.3 Polar Sink
- [ ] No battles in Polar Sink
- [ ] Multiple factions can coexist in Polar Sink

#### 7.4 No Leaders Available
- [ ] Battle still occurs
- [ ] NO_LEADER_ANNOUNCED event
- [ ] No treachery cards can be played
- [ ] Forces dialed still required

#### 7.5 Alliances
- [ ] Allies don't battle each other
- [ ] Prescience can be used in ally's battle
- [ ] Voice can be used in ally's battle
- [ ] Harkonnen can use traitor cards in ally's battle

#### 7.6 Lasgun-Shield Explosion
- [ ] Both players lose
- [ ] All forces destroyed
- [ ] Both leaders killed
- [ ] No spice awarded
- [ ] All cards discarded
- [ ] LASGUN_SHIELD_EXPLOSION event

### 8. Implementation-Specific Checks

#### 8.1 Context Management
- [ ] BattlePhaseContext initialized correctly
- [ ] pendingBattles array maintained
- [ ] currentBattle set correctly
- [ ] subPhase transitions correctly
- [ ] aggressorOrder follows storm order
- [ ] currentAggressorIndex advances correctly

#### 8.2 State Mutations
- [ ] State mutations are immutable
- [ ] New state objects created, not mutated
- [ ] All state changes through proper functions
- [ ] No direct state property mutations

#### 8.3 Error Handling
- [ ] Invalid battle plans rejected
- [ ] Validation errors returned
- [ ] Error messages are clear
- [ ] Invalid agent responses handled

### 9. Current Implementation Status

Based on `research/battle-phase/SUMMARY.md`:

**Fully Implemented**: 23/27 rules ✅
**Partially Implemented**: 2/27 rules ⚠️
**Issues Found**: 2/27 rules ❌

#### Known Issues

1. **Voice Options Missing** ❌
   - Missing: worthless card, Cheap Hero, specific weapon/defense by name
   - Impact: Medium
   - Status: Needs implementation

2. **Winner Card Discard Choice** ⚠️
   - Current: Automatic keep/discard
   - Rule: Winner may choose
   - Impact: Low (functionally correct)
   - Status: Optional enhancement

3. **Spice on Battle Wheel** ⚠️
   - Current: Tracked separately
   - Rule: "Add to Battle Wheel"
   - Impact: None (functionally correct)
   - Status: Documentation clarification needed

## Validation Function

Current `validateBattle` function in `test-full-game.ts`:

```typescript
function validateBattle(
  validation: PhaseValidation,
  startState: GameState,
  endState: GameState
): void {
  // Check that battles were identified
  const battles = validation.events.filter(
    (e) => e.type === "BATTLE_STARTED"
  ).length;

  // Check that battles were resolved
  const resolved = validation.events.filter(
    (e) => e.type === "BATTLE_RESOLVED"
  ).length;

  if (battles !== resolved) {
    validation.errors.push(
      `Battles started: ${battles}, resolved: ${resolved}`
    );
  }
}
```

## Recommended Enhancements

### Priority 1: Basic Validation
- [ ] Validate battle count matches pending battles
- [ ] Validate all battles have BATTLE_RESOLVED events
- [ ] Validate force counts are consistent
- [ ] Validate spice counts are consistent

### Priority 2: Event Sequence
- [ ] Validate event sequence for each battle
- [ ] Validate sub-phase transitions
- [ ] Validate all required events present

### Priority 3: State Consistency
- [ ] Validate leader states
- [ ] Validate card states
- [ ] Validate territory forces

### Priority 4: Rule Compliance
- [ ] Validate battle plan rules
- [ ] Validate faction abilities
- [ ] Validate traitor mechanics
- [ ] Validate edge cases

## Testing Recommendations

1. **Unit Tests**: Test each validation check independently
2. **Integration Tests**: Test full battle phase flows
3. **Edge Case Tests**: Test storm separation, multiple battles, etc.
4. **Faction Ability Tests**: Test each faction's battle abilities
5. **State Consistency Tests**: Verify state before/after battles

## References

- Battle Phase Handler: `src/lib/game/phases/handlers/battle.ts`
- Battle Rules: `handwritten-rules/7_battle.md`
- Battle Research: `research/battle-phase/`
- Battle Summary: `research/battle-phase/SUMMARY.md`
- Validation Function: `src/lib/game/test-full-game.ts:494`

