# Battle Phase Test Definition

Comprehensive test definition for the refactored battle phase handler, covering all functionality, edge cases, and negative scenarios.

## Test Categories

### 1. Battle Identification Tests

#### 1.1 Basic Battle Detection
- ✅ **Test**: Identify battles in territories with 2+ factions
- ✅ **Test**: Exclude territories with only one faction
- ✅ **Test**: Exclude Polar Sink (neutral zone)
- ✅ **Test**: Identify battles in same sector under storm (BATTLING BLIND)
- ✅ **Test**: Exclude forces separated by storm in different sectors
- ✅ **Test**: Include forces in different sectors not separated by storm

#### 1.2 Storm Separation Edge Cases
- ✅ **Test**: Forces in same sector under storm still battle
- ✅ **Test**: Forces in different sectors separated by storm don't battle
- ✅ **Test**: Multiple sectors connected (not separated by storm) all battle together
- ✅ **Test**: Complex storm patterns with multiple sectors

#### 1.3 Stronghold Occupancy
- ✅ **Test**: Validate max 2 factions per stronghold (Rule 2.02.11)
- ✅ **Test**: Error handling for stronghold violations
- ✅ **Test**: Non-stronghold territories allow 3+ factions

#### 1.4 Multiple Battles in Same Territory
- ✅ **Test**: Identify all possible battle pairs in 3-faction territory
- ✅ **Test**: Identify all possible battle pairs in 4-faction territory
- ✅ **Test**: Correct battle ordering in multi-faction scenarios

#### 1.5 Negative Test Cases
- ❌ **Test**: No battles when only one faction in territory
- ❌ **Test**: No battles in Polar Sink even with multiple factions
- ❌ **Test**: No battles when forces separated by storm
- ❌ **Test**: Error when stronghold has 3+ factions

#### 1.6 Universal Stewards Rule (Rule 2.02.22)
- ✅ **Test**: Advisors alone in territory auto-flip to fighters before battle identification
- ✅ **Test**: Universal Stewards only applies when advanced rules enabled
- ✅ **Test**: Universal Stewards only applies when BG is in game
- ✅ **Test**: PEACETIME restriction: advisors cannot flip if ally present in territory
- ✅ **Test**: STORMED IN restriction: advisors cannot flip if in storm sector
- ✅ **Test**: ADVISORS_FLIPPED event emitted when auto-flip occurs
- ✅ **Test**: Universal Stewards blocked by PEACETIME (ally present)
- ✅ **Test**: Universal Stewards blocked by STORMED IN (storm sector)
- ✅ **Test**: Universal Stewards applies when alone and no restrictions

---

### 2. Battle Sub-Phase Execution Order Tests

#### 2.1 Standard Sub-Phase Sequence
- ✅ **Test**: AGGRESSOR_CHOOSING → VOICE_OPPORTUNITY → PRESCIENCE_OPPORTUNITY → CREATING_BATTLE_PLANS → REVEALING_PLANS → TRAITOR_CALL → BATTLE_RESOLUTION
- ✅ **Test**: Sub-phase transitions without Voice (skip VOICE_OPPORTUNITY)
- ✅ **Test**: Sub-phase transitions without Prescience (skip PRESCIENCE_OPPORTUNITY)
- ✅ **Test**: Sub-phase transitions with neither Voice nor Prescience

#### 2.2 Voice Sub-Phase
- ✅ **Test**: Voice occurs BEFORE battle plans (implementation order - note: rules say "After Battle Plans" but code implements before)
- ✅ **Test**: Voice can be used in ally's battle
- ✅ **Test**: Voice target is correct (opponent of BG or BG's ally)
- ✅ **Test**: Voice command is stored and validated during reveal
- ✅ **Test**: Voice can command: poison weapon, projectile weapon, poison defense, projectile defense, worthless card, Cheap Hero, specific special weapon/defense

#### 2.3 Prescience Sub-Phase
- ✅ **Test**: Prescience occurs AFTER Voice, BEFORE battle plans
- ✅ **Test**: Prescience can be used in ally's battle
- ✅ **Test**: Prescience target is correct (opponent of Atreides or Atreides' ally)
- ✅ **Test**: Prescience reveal sub-phase (PRESCIENCE_REVEAL)
- ✅ **Test**: Prescience blocking rule (if opponent says "not playing", can't ask different element)

#### 2.4 Battle Plans Sub-Phase
- ✅ **Test**: Battle plans requested from both factions simultaneously
- ✅ **Test**: Default plans used when agent doesn't respond
- ✅ **Test**: Plan validation (forces, leader, cards)
- ✅ **Test**: Prescience commitment validation

#### 2.5 Reveal Sub-Phase
- ✅ **Test**: Plans revealed simultaneously
- ✅ **Test**: Voice command compliance checked
- ✅ **Test**: Transition to traitor call after reveal

#### 2.6 Traitor Call Sub-Phase
- ✅ **Test**: Traitor call opportunity identified
- ✅ **Test**: Traitor call processed correctly
- ✅ **Test**: Transition to resolution after traitor call (or skip if no traitor)

#### 2.7 Resolution Sub-Phase
- ✅ **Test**: Battle resolution calculates winner correctly
- ✅ **Test**: Transition to winner card discard if applicable
- ✅ **Test**: Transition to Harkonnen capture if applicable
- ✅ **Test**: Transition to next battle or end phase

#### 2.8 Post-Resolution Sub-Phases
- ✅ **Test**: WINNER_CARD_DISCARD_CHOICE when winner has cards to keep
- ✅ **Test**: HARKONNEN_CAPTURE when Harkonnen wins
- ✅ **Test**: Skip post-resolution sub-phases when not applicable

#### 2.9 Negative Test Cases
- ❌ **Test**: Invalid sub-phase transition (should error)
- ❌ **Test**: Missing required sub-phase (should error)
- ❌ **Test**: Sub-phase executed out of order (should error)

---

### 3. Battle Plans Validation and Processing Tests

#### 3.1 Forces Dialed Validation
- ✅ **Test**: Forces dialed >= 0
- ✅ **Test**: Forces dialed <= forces in territory
- ✅ **Test**: Forces dialed is integer (basic rules)
- ✅ **Test**: Forces dialed can be half-increment (advanced rules with spice dialing)
- ✅ **Test**: Error when forces dialed exceeds available forces
- ✅ **Test**: Error when forces dialed is negative

#### 3.2 Leader/Cheap Hero Validation
- ✅ **Test**: Leader must be available (not in Tanks, not used elsewhere)
- ✅ **Test**: Cheap Hero can be played in lieu of leader
- ✅ **Test**: NO_LEADER_ANNOUNCED when no leader/Cheap Hero available
- ✅ **Test**: Dedicated Leader: can fight multiple times in same territory
- ✅ **Test**: Dedicated Leader: cannot fight in multiple territories same phase
- ✅ **Test**: Leader announcement required when possible

#### 3.3 Treachery Cards Validation
- ✅ **Test**: Weapon cards require leader/Cheap Hero
- ✅ **Test**: Defense cards require leader/Cheap Hero
- ✅ **Test**: Cannot play cards without leader/Cheap Hero (NO TREACHERY)
- ✅ **Test**: Can play weapon, defense, or both
- ✅ **Test**: Can choose not to play any cards
- ✅ **Test**: Invalid card type rejected

#### 3.4 Spice Dialing (Advanced Rules)
- ✅ **Test**: Spice dialing: forces supported by spice count at full strength
- ✅ **Test**: Spice dialing: unsupported forces count at half strength
- ✅ **Test**: Spice dialing: all spice paid goes to Spice Bank
- ✅ **Test**: Fremen Battle Hardened: forces always count at full strength (no spice needed)
- ✅ **Test**: Half-increment dialing with spice

#### 3.5 Prescience Commitment Validation
- ✅ **Test**: Prescience commitment must be honored
- ✅ **Test**: Error when prescience commitment violated
- ✅ **Test**: Prescience blocking: can't ask different element if opponent says "not playing"

#### 3.6 Voice Command Validation
- ✅ **Test**: Voice command must be complied with
- ✅ **Test**: Error when voice command violated
- ✅ **Test**: Voice can command: poison weapon, projectile weapon, poison defense, projectile defense, worthless card, Cheap Hero, specific special weapon/defense

#### 3.7 Default Battle Plans
- ✅ **Test**: Default plan created when agent doesn't respond
- ✅ **Test**: Default plan uses available leader if possible
- ✅ **Test**: Default plan uses 0 forces if no leader available
- ✅ **Test**: Default plan uses 0 forces if no forces available

#### 3.8 Negative Test Cases
- ❌ **Test**: Invalid forces dialed (negative, exceeds available)
- ❌ **Test**: Invalid leader (not available, used elsewhere)
- ❌ **Test**: Cards played without leader/Cheap Hero
- ❌ **Test**: Invalid card type
- ❌ **Test**: Prescience commitment violation
- ❌ **Test**: Voice command violation

---

### 4. Battle Resolution Winner Calculation Tests

#### 4.1 Basic Resolution
- ✅ **Test**: Winner = higher total (forces dialed + leader strength)
- ✅ **Test**: Aggressor wins ties (NO TIES rule)
- ✅ **Test**: Leader strength added when leader survives
- ✅ **Test**: Leader strength NOT added when leader killed by weapon

#### 4.2 Weapon/Defense Interactions
- ✅ **Test**: Weapon kills leader if no proper defense
- ✅ **Test**: Defense protects leader from weapon
- ✅ **Test**: Poison weapon requires poison defense
- ✅ **Test**: Projectile weapon requires projectile defense
- ✅ **Test**: Lasgun has no defense
- ✅ **Test**: Weapon affects own leader if not defended

#### 4.3 Elite Forces
- ✅ **Test**: Sardaukar worth 2 forces (except against Fremen)
- ✅ **Test**: Sardaukar worth 1 force against Fremen
- ✅ **Test**: Fedaykin worth 2 forces
- ✅ **Test**: Elite forces count correctly in resolution

#### 4.4 Spice Dialing in Resolution
- ✅ **Test**: Spiced forces count at full strength
- ✅ **Test**: Unspiced forces count at half strength
- ✅ **Test**: Fremen forces always full strength (Battle Hardened)

#### 4.5 Traitor Resolution
- ✅ **Test**: Traitor reveal: traitor caller wins immediately
- ✅ **Test**: Traitor reveal: traitor caller loses nothing
- ✅ **Test**: Traitor reveal: traitor caller gets leader back to pool
- ✅ **Test**: Traitor reveal: traitorous leader to Tanks
- ✅ **Test**: Traitor reveal: traitor caller gets spice (leader strength)
- ✅ **Test**: TWO TRAITORS: both lose, no spice awarded
- ✅ **Test**: TWO TRAITORS: all forces, cards, leaders lost

#### 4.6 Lasgun-Shield Explosion
- ✅ **Test**: Lasgun + Shield = explosion
- ✅ **Test**: Explosion: both players lose
- ✅ **Test**: Explosion: all forces destroyed
- ✅ **Test**: Explosion: both leaders killed
- ✅ **Test**: Explosion: no spice awarded
- ✅ **Test**: Explosion: all cards discarded
- ✅ **Test**: Explosion: Kwisatz Haderach killed if used

#### 4.7 Kwisatz Haderach
- ✅ **Test**: KH adds +2 strength when active
- ✅ **Test**: KH cannot turn traitor when used
- ✅ **Test**: KH killed only by lasgun/shield explosion
- ✅ **Test**: KH must be revived like other leaders

#### 4.8 Negative Test Cases
- ❌ **Test**: Invalid resolution calculation (should error)
- ❌ **Test**: Missing required data for resolution (should error)

---

### 5. Battle Events Emission Tests

#### 5.1 Phase Start Events
- ✅ **Test**: PHASE_STARTED event (by PhaseManager)
- ✅ **Test**: BATTLE_STARTED event when battles exist (with totalBattles count)
- ✅ **Test**: NO_BATTLES event when no battles
- ✅ **Test**: ADVISORS_FLIPPED event (Universal Stewards) with correct data (faction, territoryId, sector, count, reason)
- ✅ **Test**: STRONGHOLD_OCCUPANCY_VIOLATION event when violations detected

#### 5.2 Battle Flow Events
- ✅ **Test**: BATTLE_STARTED event for each battle
- ✅ **Test**: VOICE_USED event
- ✅ **Test**: PRESCIENCE_USED event
- ✅ **Test**: PRESCIENCE_REVEALED event
- ✅ **Test**: BATTLE_PLAN_CREATED event
- ✅ **Test**: BATTLE_PLANS_REVEALED event
- ✅ **Test**: TRAITOR_CALLED event
- ✅ **Test**: TRAITOR_REVEALED event
- ✅ **Test**: BATTLE_RESOLVED event
- ✅ **Test**: LEADER_KILLED event
- ✅ **Test**: LEADER_USED event
- ✅ **Test**: FORCES_LOST event
- ✅ **Test**: SPICE_PAID event (spice dialing)
- ✅ **Test**: SPICE_AWARDED event (killed leaders)
- ✅ **Test**: LASGUN_SHIELD_EXPLOSION event
- ✅ **Test**: NO_LEADER_ANNOUNCED event

#### 5.3 Post-Resolution Events
- ✅ **Test**: WINNER_CARD_DISCARD_CHOICE_REQUESTED event
- ✅ **Test**: CARD_DISCARDED event
- ✅ **Test**: HARKONNEN_CAPTURE_CHOICE_REQUESTED event
- ✅ **Test**: LEADER_CAPTURED event
- ✅ **Test**: LEADER_KILLED_FOR_SPICE event

#### 5.4 Phase End Events
- ✅ **Test**: BATTLES_COMPLETE event
- ✅ **Test**: LEADER_RETURNED event (cleanup)
- ✅ **Test**: PHASE_ENDED event (by PhaseManager)

#### 5.5 Event Data Validation
- ✅ **Test**: All events have correct type
- ✅ **Test**: All events have correct data structure
- ✅ **Test**: Events emitted in correct order
- ✅ **Test**: No duplicate events

#### 5.6 Negative Test Cases
- ❌ **Test**: Missing required events (should fail)
- ❌ **Test**: Events with invalid data (should error)

---

### 6. Agent Requests/Responses Handling Tests

#### 6.1 Battle Choice Request
- ✅ **Test**: Request sent to current aggressor
- ✅ **Test**: Request includes all available battles
- ✅ **Test**: Request includes correct battle details (territory, sector, factions)
- ✅ **Test**: Response processed correctly
- ✅ **Test**: Invalid battle choice rejected
- ✅ **Test**: Default behavior when no response

#### 6.2 Voice Request
- ✅ **Test**: Request sent to Bene Gesserit (or ally)
- ✅ **Test**: Request includes available commands
- ✅ **Test**: Response processed correctly
- ✅ **Test**: Voice command stored in battle context

#### 6.3 Prescience Request
- ✅ **Test**: Request sent to Atreides (or ally)
- ✅ **Test**: Request includes available elements to view
- ✅ **Test**: Response processed correctly
- ✅ **Test**: Prescience commitment stored
- ✅ **Test**: Prescience reveal request sent to opponent
- ✅ **Test**: Prescience reveal response processed

#### 6.4 Battle Plans Request
- ✅ **Test**: Request sent to both factions simultaneously
- ✅ **Test**: Request includes available leaders
- ✅ **Test**: Request includes available cards
- ✅ **Test**: Request includes forces in territory
- ✅ **Test**: Response processed correctly for both factions
- ✅ **Test**: Default plans used when no response
- ✅ **Test**: Invalid plan rejected with error

#### 6.5 Traitor Call Request
- ✅ **Test**: Request sent when traitor opportunity exists
- ✅ **Test**: Request includes traitor card details
- ✅ **Test**: Response processed correctly
- ✅ **Test**: No request when no traitor opportunity

#### 6.6 Winner Card Discard Request
- ✅ **Test**: Request sent when winner has cards to keep
- ✅ **Test**: Request includes cards that can be kept
- ✅ **Test**: Response processed correctly
- ✅ **Test**: Invalid discard choice rejected
- ✅ **Test**: No request when winner has no cards to keep

#### 6.7 Harkonnen Capture Request
- ✅ **Test**: Request sent when Harkonnen wins
- ✅ **Test**: Request includes captured leader details
- ✅ **Test**: Response processed correctly (kill or capture)
- ✅ **Test**: No request when Harkonnen doesn't win

#### 6.8 Response Validation
- ✅ **Test**: Response faction matches request faction
- ✅ **Test**: Response requestId matches request
- ✅ **Test**: Invalid response rejected
- ✅ **Test**: Missing response handled gracefully

#### 6.9 Negative Test Cases
- ❌ **Test**: Response from wrong faction (should error)
- ❌ **Test**: Response with invalid requestId (should error)
- ❌ **Test**: Response with invalid data structure (should error)
- ❌ **Test**: Multiple responses for same request (should error)

---

### 7. Module-Specific Tests (Refactored Code)

#### 7.1 Initialization Module
- ✅ **Test**: `initializeBattlePhase` resets context correctly
- ✅ **Test**: `initializeBattlePhase` sets aggressor order from storm order
- ✅ **Test**: `applyUniversalStewards` flips advisors correctly when alone
- ✅ **Test**: `applyUniversalStewards` respects PEACETIME restriction
- ✅ **Test**: `applyUniversalStewards` respects STORMED IN restriction
- ✅ **Test**: `applyUniversalStewards` only applies with advanced rules
- ✅ **Test**: `applyUniversalStewards` only applies when BG in game
- ✅ **Test**: Stronghold occupancy validated before battle identification
- ✅ **Test**: STRONGHOLD_OCCUPANCY_VIOLATION events emitted for violations
- ✅ **Test**: Battles identified correctly after Universal Stewards
- ✅ **Test**: First aggressor determined from storm order
- ✅ **Test**: NO_BATTLES event when no battles found

#### 7.2 Sub-Phase Modules
- ✅ **Test**: `transitionToBattleSubPhases` routes correctly
- ✅ **Test**: `requestVoice` / `processVoice` work correctly
- ✅ **Test**: `requestPrescience` / `processPrescience` work correctly
- ✅ **Test**: `requestPrescienceReveal` / `processPrescienceReveal` work correctly
- ✅ **Test**: `requestBattlePlans` / `processBattlePlans` work correctly
- ✅ **Test**: `processReveal` validates and transitions correctly
- ✅ **Test**: `requestTraitorCall` / `processTraitor` work correctly

#### 7.3 Resolution Module
- ✅ **Test**: `processResolution` orchestrates correctly
- ✅ **Test**: `applyBattleResult` applies all results
- ✅ **Test**: `applyForceLosses` calculates correctly
- ✅ **Test**: `applySpiceHandling` processes spice correctly
- ✅ **Test**: `applyLeaderHandling` processes leaders correctly
- ✅ **Test**: `applyLasgunExplosion` handles explosion correctly
- ✅ **Test**: `finishCardDiscarding` discards cards correctly

#### 7.4 Post-Resolution Module
- ✅ **Test**: `requestWinnerCardDiscard` / `processWinnerCardDiscard` work correctly
- ✅ **Test**: `requestCaptureChoice` / `processHarkonnenCapture` work correctly

#### 7.5 Helpers Module
- ✅ **Test**: `checkPrisonBreak` triggers correctly
- ✅ **Test**: `endBattlePhase` ends phase correctly

#### 7.6 Cleanup Module
- ✅ **Test**: `cleanupBattlePhase` resets leader turn states
- ✅ **Test**: `cleanupBattlePhase` returns captured leaders
- ✅ **Test**: `cleanupBattlePhase` performs final Prison Break check

---

### 8. Edge Cases and Special Scenarios

#### 8.1 Multiple Battles
- ✅ **Test**: Aggressor fights all battles in order
- ✅ **Test**: Pending battles updated after each battle
- ✅ **Test**: Factions removed from pending when no forces remain
- ✅ **Test**: Multiple battles in same territory handled correctly
- ✅ **Test**: Aggressor continues until all battles resolved

#### 8.2 Alliances
- ✅ **Test**: Allies don't battle each other
- ✅ **Test**: Prescience can be used in ally's battle
- ✅ **Test**: Voice can be used in ally's battle
- ✅ **Test**: Harkonnen can use traitor cards in ally's battle

#### 8.3 No Leaders Available
- ✅ **Test**: Battle still occurs without leader
- ✅ **Test**: NO_LEADER_ANNOUNCED event emitted
- ✅ **Test**: No treachery cards can be played
- ✅ **Test**: Forces dialed still required

#### 8.4 Prison Break
- ✅ **Test**: Prison Break triggers when Harkonnen leader killed
- ✅ **Test**: Prison Break triggers when all Harkonnen's own leaders are dead
- ✅ **Test**: All captured leaders returned to original owners
- ✅ **Test**: PRISON_BREAK event emitted
- ✅ **Test**: Prison Break checked after each leader death (in leader handling)
- ✅ **Test**: Prison Break checked after lasgun explosion (if leaders killed)
- ✅ **Test**: Prison Break checked in cleanup phase
- ✅ **Test**: Prison Break only triggers for Harkonnen faction

#### 8.5 Dedicated Leader
- ✅ **Test**: Leader can fight multiple times in same territory
- ✅ **Test**: Leader cannot fight in multiple territories same phase
- ✅ **Test**: Leader returned to pool after all battles in territory

#### 8.6 Stronghold Occupancy
- ✅ **Test**: Max 2 factions per stronghold enforced
- ✅ **Test**: Violations detected and logged
- ✅ **Test**: Non-stronghold territories allow 3+ factions

#### 8.7 Spice Dialing Edge Cases
- ✅ **Test**: Half-increment dialing with spice
- ✅ **Test**: Winner keeps spice on traitor reveal
- ✅ **Test**: All spice paid goes to bank

#### 8.8 Negative Edge Cases
- ❌ **Test**: Battle with no forces (should error)
- ❌ **Test**: Battle with invalid territory (should error)
- ❌ **Test**: Battle with invalid sector (should error)
- ❌ **Test**: Battle with same faction as aggressor and defender (should error)

---

### 9. Integration Tests

#### 9.1 Full Battle Flow
- ✅ **Test**: Complete battle from identification to cleanup
- ✅ **Test**: Multiple battles in sequence
- ✅ **Test**: Battle with all sub-phases (Voice, Prescience, Traitor)
- ✅ **Test**: Battle with no special abilities
- ✅ **Test**: Battle with lasgun-shield explosion

#### 9.2 Context Management
- ✅ **Test**: Context maintained correctly across sub-phases
- ✅ **Test**: Context reset between battles
- ✅ **Test**: Context reset on phase initialization

#### 9.3 State Consistency
- ✅ **Test**: Game state consistent after each step
- ✅ **Test**: Forces correctly updated
- ✅ **Test**: Leaders correctly updated
- ✅ **Test**: Spice correctly updated
- ✅ **Test**: Cards correctly updated

---

### 10. Performance and Stress Tests

#### 10.1 Large Scale
- ✅ **Test**: Many battles in single phase
- ✅ **Test**: Many factions in single territory
- ✅ **Test**: Complex storm patterns

#### 10.2 Response Handling
- ✅ **Test**: Many agent responses processed correctly
- ✅ **Test**: Missing responses handled gracefully
- ✅ **Test**: Invalid responses rejected correctly

---

## Test Implementation Strategy

### Phase 1: Core Functionality
1. Battle identification tests
2. Basic sub-phase execution tests
3. Basic battle resolution tests
4. Basic event emission tests

### Phase 2: Advanced Features
1. Faction abilities (Voice, Prescience)
2. Traitor mechanics
3. Elite forces
4. Spice dialing

### Phase 3: Edge Cases
1. Multiple battles
2. Alliances
3. Special scenarios (Prison Break, Dedicated Leader, etc.)

### Phase 4: Module-Specific
1. Test each refactored module in isolation
2. Test module interactions
3. Test callback patterns

### Phase 5: Integration
1. Full battle flow tests
2. Context management tests
3. State consistency tests

---

## Test Data Requirements

### Test State Builders
- Build game state with specific factions
- Build game state with specific forces
- Build game state with specific leaders
- Build game state with specific cards
- Build game state with specific spice
- Build game state with storm patterns

### Agent Response Builders
- Queue battle choice responses
- Queue voice responses
- Queue prescience responses
- Queue battle plan responses
- Queue traitor call responses
- Queue winner discard responses
- Queue capture choice responses

### Assertion Helpers
- Assert faction spice
- Assert forces in territory
- Assert leader state
- Assert event occurred
- Assert event data
- Assert battle result
- Assert sub-phase transition

---

## Success Criteria

All tests must:
1. ✅ Pass after refactoring
2. ✅ Cover all 6 required areas
3. ✅ Include negative test cases
4. ✅ Test all edge cases from rules
5. ✅ Test all refactored modules
6. ✅ Maintain test coverage >= 80%
7. ✅ Have clear, descriptive names
8. ✅ Have helpful error messages

