# Storm Phase - Difficult Scenarios Investigation

## Overview

The Storm Phase is the first phase of each turn. It involves:
1. Determining which players dial the storm
2. Moving the storm marker
3. Destroying forces and spice in the storm path
4. Determining storm order (first player)

## Key Mechanics to Test

### 1. Turn 1 Initial Storm Placement
- **Difficulty**: Different rules for Turn 1
- **Rules**: Two players nearest Storm Start Sector (sector 0) on either side dial 0-20
- **What to test**:
  - Correct dialer selection (nearest on either side of sector 0)
  - Dial range 0-20 (not 1-3)
  - Storm starts at sector 0, then moves
  - Storm order determination after initial placement

### 2. Standard Storm Movement (Turn 2+)
- **Difficulty**: Determining correct dialers
- **Rules**: Two players who last used Battle Wheels (nearest to storm on either side)
- **What to test**:
  - Correct dialer selection based on player positions
  - Dial range 1-3 per player
  - Simultaneous dialing
  - Total movement (2-6 sectors)
  - Counterclockwise movement

### 3. Weather Control Card
- **Difficulty**: Overrides normal movement, timing critical
- **Rules**: 
  - Play during 1.01.02 before storm is moved
  - Cannot be played on Turn 1
  - Player controls movement (1-10 sectors or no movement)
  - Normal dialing is skipped
- **What to test**:
  - Card prevents normal dialing
  - Player chooses movement (1-10 or 0)
  - Cannot be played on Turn 1
  - Timing: before storm movement

### 4. Family Atomics Card
- **Difficulty**: Complex requirements and permanent effects
- **Rules**:
  - Play after movement calculated, before moved
  - Requires forces on/adjacent to Shield Wall
  - Destroys all forces on Shield Wall
  - Removes protection from Imperial Basin, Arrakeen, Carthag permanently
  - Cannot be played on Turn 1
- **What to test**:
  - Requirement checking (forces on/adjacent to Shield Wall)
  - Timing: after calculation, before movement
  - Shield Wall force destruction
  - Permanent loss of city protection
  - Cannot be played on Turn 1

### 5. Fremen Storm Control
- **Difficulty**: Different movement mechanism
- **Rules**:
  - Uses Storm Deck instead of dialing
  - Controls storm movement from Turn 2+
  - Can look at next turn's Storm Card
- **What to test**:
  - Storm Deck usage (if implemented)
  - Fremen controls movement
  - "There's a Storm Coming" ability timing

### 6. Storm Destruction - Forces
- **Difficulty**: Complex rules about what gets destroyed
- **Rules**:
  - Only in Sand Territories
  - Only in sectors storm starts, passes, or ends in
  - Imperial Basin protected (until Family Atomics)
  - Rock Territories protected
  - Polar Sink never in storm
  - Fremen lose half (rounded up)
- **What to test**:
  - Sand territories: forces destroyed
  - Rock territories: forces protected
  - Imperial Basin: protected (until Family Atomics)
  - Polar Sink: never affected
  - Multi-sector territories: only affected sectors
  - Fremen half losses (rounded up)
  - Protected leaders (from battle) survive

### 7. Storm Destruction - Spice
- **Difficulty**: Different from force destruction
- **Rules**:
  - Spice destroyed in sectors storm passes over or stops in
  - NOT where storm starts (only passes/ends)
  - Returned to Spice Bank
- **What to test**:
  - Spice destroyed in path (not starting sector)
  - Spice destroyed at ending sector
  - Spice in protected territories (Imperial Basin) not destroyed (until Family Atomics)

### 8. Storm Order Determination
- **Difficulty**: Correct first player calculation
- **Rules**:
  - Player marker storm next approaches is First Player
  - Counterclockwise from storm position
  - Player on storm goes last
- **What to test**:
  - Correct first player calculation
  - Player on storm goes last
  - Order based on counterclockwise distance

### 9. Complex Scenarios
- **Multiple factions in storm path**: Test destruction of multiple factions
- **Forces in protected vs unprotected sectors**: Same territory, different sectors
- **Spice and forces together**: Both destroyed correctly
- **Large storm movement**: Wraps around board (sector 17 → 0)
- **Minimal storm movement**: Only 2 sectors (minimum)
- **Maximum storm movement**: 6 sectors (standard) or 10 (Weather Control)

## Edge Cases

1. **Player marker exactly on storm**: Should go last in order
2. **Storm wraps around board**: Sector 17 → 0+ sectors
3. **Multiple forces in same sector**: All destroyed (except Fremen half)
4. **Forces in multi-sector territory**: Only affected sectors destroyed
5. **No forces in storm path**: Phase completes without destruction
6. **All forces in protected territories**: No destruction occurs
7. **Fremen with odd number of forces**: Half rounded up (e.g., 5 → 3 lost)

## Special Abilities

1. **Fremen "There's a Storm Coming"**: Look at next Storm Card (end of phase)
2. **Fremen half losses**: Only lose half forces (rounded up)
3. **Protected leaders**: Leaders from battle survive storm

## Card Interactions

1. **Weather Control + Family Atomics**: Can both be played in same turn?
2. **Karama cancelling Fremen ability**: Can cancel "There's a Storm Coming"
3. **Family Atomics permanent effect**: Cities lose protection for rest of game

