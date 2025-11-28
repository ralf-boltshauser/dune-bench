# Storm Phase Test Plan

## Test Scenarios

### Scenario 1: Turn 1 Initial Storm Placement
**Goal**: Test initial storm placement mechanics
**Setup**:
- Factions: Atreides, Harkonnen, Bene Gesserit, Fremen
- Turn: 1
- Player positions: Various positions around sector 0
- Forces: None (Turn 1 setup)
**Expected flow**:
1. Determine two players nearest Storm Start Sector (0) on either side
2. Request dials (0-20 range)
3. Calculate total movement
4. Move storm from sector 0
5. Determine storm order
6. No destruction (Turn 1, no forces on board yet)

### Scenario 2: Standard Storm Movement (Turn 2)
**Goal**: Test normal storm movement and destruction
**Setup**:
- Factions: Atreides, Harkonnen, Emperor
- Turn: 2
- Storm sector: 5
- Player positions: Various
- Forces: 
  - Atreides: 10 forces in Meridian (sand, sector 6)
  - Harkonnen: 5 forces in Cielago North (sand, sector 7)
  - Emperor: 3 forces in Imperial Basin (protected, sector 8)
- Spice: 5 spice in Meridian (sector 6)
**Expected flow**:
1. Determine dialers (two players nearest storm on either side)
2. Request dials (1-3 range)
3. Calculate total movement
4. Move storm
5. Destroy forces in sand territories
6. Destroy spice in storm path
7. Imperial Basin forces protected
8. Determine storm order

### Scenario 3: Weather Control Card
**Goal**: Test Weather Control overrides normal movement
**Setup**:
- Factions: Atreides, Harkonnen, Bene Gesserit
- Turn: 2
- Storm sector: 3
- Atreides has Weather Control card
- Forces: Atreides forces in sector 4, enemy forces in sector 5
**Expected flow**:
1. Atreides plays Weather Control (before dialing)
2. Normal dialing skipped
3. Atreides chooses movement (e.g., 5 sectors to protect own forces)
4. Storm moves based on choice
5. Destruction occurs
6. Storm order determined

### Scenario 4: Family Atomics Card
**Goal**: Test Family Atomics destroys Shield Wall and removes city protection
**Setup**:
- Factions: Atreides, Harkonnen, Emperor
- Turn: 2
- Storm sector: 10
- Atreides has Family Atomics card
- Forces: 
  - Atreides: 5 forces on Shield Wall
  - Harkonnen: 10 forces in Imperial Basin
  - Emperor: 8 forces in Arrakeen
**Expected flow**:
1. Storm movement calculated (e.g., 4 sectors)
2. Atreides plays Family Atomics (after calculation, before movement)
3. All Shield Wall forces destroyed
4. Destroyed Shield Wall token placed
5. Imperial Basin, Arrakeen, Carthag lose protection
6. Storm moves normally
7. Future turns: Cities no longer protected

### Scenario 5: Fremen Half Losses
**Goal**: Test Fremen only lose half forces (rounded up)
**Setup**:
- Factions: Fremen, Atreides
- Turn: 2
- Storm sector: 8
- Forces:
  - Fremen: 5 forces in sand territory (sector 9) - should lose 3 (half rounded up)
  - Atreides: 5 forces in same territory (sector 9) - should lose all 5
**Expected flow**:
1. Storm moves over sector 9
2. Fremen lose 3 forces (5/2 = 2.5, rounded up = 3)
3. Atreides lose all 5 forces
4. Verify correct losses

### Scenario 6: Complex Multi-Faction Destruction
**Goal**: Test destruction of multiple factions across multiple sectors
**Setup**:
- Factions: All 6 factions
- Turn: 3
- Storm sector: 12
- Forces spread across sectors 13-16:
  - Atreides: 10 in sector 13 (sand)
  - Harkonnen: 8 in sector 14 (sand)
  - Bene Gesserit: 6 in sector 15 (sand)
  - Fremen: 7 in sector 16 (sand) - half losses
  - Emperor: 5 in Rock territory (protected)
  - Guild: 4 in Imperial Basin (protected)
- Spice: Multiple spice deposits in sectors 13-16
**Expected flow**:
1. Storm moves 4 sectors (13-16)
2. Destroy forces in sand territories (sectors 13-16)
3. Fremen lose half (rounded up)
4. Protected territories safe
5. Destroy spice in path
6. Verify all destructions correct

### Scenario 7: Storm Wraps Around Board
**Goal**: Test storm movement wrapping from sector 17 to 0+
**Setup**:
- Factions: Atreides, Harkonnen
- Turn: 2
- Storm sector: 17
- Forces: Atreides in sector 0, Harkonnen in sector 1
**Expected flow**:
1. Storm at sector 17
2. Large movement (e.g., 4 sectors)
3. Storm wraps: 17 → 0 → 1 → 2 → 3
4. Forces in sectors 0-3 destroyed
5. Verify wrapping calculation

### Scenario 8: Protected Territories
**Goal**: Test that protected territories are safe
**Setup**:
- Factions: Atreides, Harkonnen, Emperor
- Turn: 2
- Storm sector: 7
- Forces:
  - Atreides: 10 in Rock territory (protected)
  - Harkonnen: 8 in Imperial Basin (protected)
  - Emperor: 6 in Polar Sink (never in storm)
- Spice: 5 in Imperial Basin
**Expected flow**:
1. Storm moves over protected territories
2. No forces destroyed
3. Spice in Imperial Basin protected
4. Verify protection works

### Scenario 9: Family Atomics Removes Protection
**Goal**: Test that Family Atomics removes city protection permanently
**Setup**:
- Factions: Atreides, Harkonnen
- Turn: 2
- Atreides plays Family Atomics
- Turn: 3
- Storm moves over Imperial Basin
- Forces: Harkonnen has 10 forces in Imperial Basin
**Expected flow**:
1. Turn 2: Family Atomics played, cities lose protection
2. Turn 3: Storm moves over Imperial Basin
3. Forces in Imperial Basin now destroyed (protection lost)
4. Verify permanent effect

### Scenario 10: Minimal and Maximum Movement
**Goal**: Test edge cases of movement range
**Setup**:
- Factions: Atreides, Harkonnen
- Turn: 2
- Scenario A: Both dial 1 (minimum: 2 sectors)
- Scenario B: Both dial 3 (maximum: 6 sectors)
- Scenario C: Weather Control chooses 10 (maximum)
- Scenario D: Weather Control chooses 0 (no movement)
**Expected flow**:
1. Test minimum movement (2 sectors)
2. Test maximum standard movement (6 sectors)
3. Test Weather Control maximum (10 sectors)
4. Test Weather Control no movement (0)
5. Verify correct destruction based on movement

### Scenario 11: Player on Storm (Goes Last)
**Goal**: Test that player marker on storm goes last in order
**Setup**:
- Factions: Atreides, Harkonnen, Bene Gesserit
- Turn: 2
- Storm sector: 5
- Player positions: Atreides at 5 (on storm), others at 6, 7
**Expected flow**:
1. Storm at sector 5
2. Atreides marker at sector 5 (on storm)
3. Storm order: Harkonnen (6) first, Bene Gesserit (7) second, Atreides (5) last
4. Verify order correct

### Scenario 12: Spice Destruction Rules
**Goal**: Test spice destroyed only in path, not starting sector
**Setup**:
- Factions: Atreides
- Turn: 2
- Storm sector: 5
- Spice: 
  - 5 spice in sector 5 (starting - should NOT be destroyed)
  - 10 spice in sector 6 (path - should be destroyed)
  - 8 spice in sector 7 (ending - should be destroyed)
**Expected flow**:
1. Storm starts at sector 5
2. Moves 2 sectors (to sector 7)
3. Spice in sector 5 NOT destroyed (starting sector)
4. Spice in sectors 6-7 destroyed (path and ending)
5. Verify correct spice destruction

