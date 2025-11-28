# Mentat Pause Phase Test Plan

## Test Scenarios

### Scenario 1: Bribe Collection
**Goal**: Test that bribes are collected correctly from all factions
**Setup**:
- Factions: Atreides, Harkonnen, Emperor
- Special states: Multiple factions have spiceBribes > 0
- Expected flow: 
  1. All bribes collected
  2. Spice added to reserves
  3. Bribes reset to 0
  4. No victory (turn 1)

### Scenario 2: Solo Stronghold Victory (3 Strongholds)
**Goal**: Test unallied player wins with 3 strongholds
**Setup**:
- Factions: Atreides, Harkonnen
- Forces: Atreides controls Arrakeen, Carthag, Sietch Tabr (sole control)
- Turn: 2
- Expected flow:
  1. Bribes collected (if any)
  2. Victory check: Atreides has 3 strongholds
  3. Victory achieved: Atreides wins

### Scenario 3: Alliance Stronghold Victory (4 Strongholds)
**Goal**: Test allied players win with 4 combined strongholds
**Setup**:
- Factions: Atreides, Fremen (allied)
- Forces: 
  - Atreides controls Arrakeen, Carthag
  - Fremen controls Sietch Tabr, Habbanya Sietch
- Turn: 2
- Expected flow:
  1. Bribes collected
  2. Victory check: Alliance has 4 strongholds combined
  3. Victory achieved: Atreides & Fremen win

### Scenario 4: Contested Stronghold (No Victory)
**Goal**: Test that contested strongholds don't count for victory
**Setup**:
- Factions: Atreides, Harkonnen (not allied)
- Forces:
  - Atreides in Arrakeen, Carthag, Sietch Tabr
  - Harkonnen also in Sietch Tabr (contested)
- Turn: 2
- Expected flow:
  1. Bribes collected
  2. Victory check: Atreides only controls 2 strongholds (Sietch Tabr contested)
  3. No victory

### Scenario 5: Multiple Winners (Storm Order Resolution)
**Goal**: Test that first in storm order wins when multiple meet conditions
**Setup**:
- Factions: Atreides, Harkonnen, Emperor
- Storm order: [Atreides, Harkonnen, Emperor]
- Forces:
  - Atreides controls Arrakeen, Carthag, Sietch Tabr
  - Harkonnen controls Habbanya Sietch, Tuek's Sietch, Arrakeen (wait, this would be contested)
  - Actually: Atreides has 3, Harkonnen has 3 (different strongholds)
- Turn: 2
- Expected flow:
  1. Bribes collected
  2. Victory check: Both have 3 strongholds
  3. Storm order resolution: Atreides wins (first in order)

### Scenario 6: Fremen Special Victory (Endgame)
**Goal**: Test Fremen special victory when Guild is in game
**Setup**:
- Factions: Fremen, Spacing Guild, Atreides, Harkonnen
- Turn: 10 (last turn)
- Forces:
  - Fremen in Sietch Tabr, Habbanya Sietch (sole control)
  - No Harkonnen/Atreides/Emperor in Tuek's Sietch
  - Fremen has < 3 strongholds (so no standard victory)
- Expected flow:
  1. Bribes collected
  2. Standard victory check: No winner
  3. Endgame check: Fremen special victory conditions met
  4. Fremen wins

### Scenario 7: Guild Special Victory (Endgame)
**Goal**: Test Guild wins if no one else wins by endgame
**Setup**:
- Factions: Spacing Guild, Atreides, Harkonnen
- Turn: 10 (last turn)
- Forces:
  - No faction has 3+ strongholds
  - Guild has forces on Dune
- Expected flow:
  1. Bribes collected
  2. Standard victory check: No winner
  3. Endgame check: Guild special victory
  4. Guild wins

### Scenario 8: Endgame Default Victory (Most Strongholds)
**Goal**: Test default victory by most strongholds
**Setup**:
- Factions: Atreides, Harkonnen, Emperor
- Turn: 10 (last turn)
- Forces:
  - Atreides controls 2 strongholds
  - Harkonnen controls 1 stronghold
  - Emperor controls 0 strongholds
- Expected flow:
  1. Bribes collected
  2. Standard victory check: No winner (no one has 3+)
  3. Endgame check: Atreides has most (2)
  4. Atreides wins

### Scenario 9: Endgame Tiebreaker (Spice)
**Goal**: Test spice tiebreaker when strongholds are tied
**Setup**:
- Factions: Atreides, Harkonnen
- Turn: 10 (last turn)
- Forces:
  - Both control 2 strongholds (tied)
- Spice:
  - Atreides: 10 spice
  - Harkonnen: 15 spice
- Expected flow:
  1. Bribes collected
  2. Standard victory check: No winner
  3. Endgame check: Tied on strongholds
  4. Spice tiebreaker: Harkonnen wins (more spice)

### Scenario 10: Endgame Tiebreaker (Storm Order)
**Goal**: Test storm order tiebreaker when strongholds and spice are tied
**Setup**:
- Factions: Atreides, Harkonnen
- Storm order: [Atreides, Harkonnen]
- Turn: 10 (last turn)
- Forces:
  - Both control 2 strongholds
- Spice:
  - Both have 10 spice
- Expected flow:
  1. Bribes collected
  2. Standard victory check: No winner
  3. Endgame check: Tied on strongholds and spice
  4. Storm order tiebreaker: Atreides wins (first in order)

### Scenario 11: Complex Alliance Scenario
**Goal**: Test multiple alliances and solo factions
**Setup**:
- Factions: Atreides, Fremen (allied), Harkonnen, Emperor (allied)
- Forces:
  - Atreides controls Arrakeen, Carthag
  - Fremen controls Sietch Tabr
  - Harkonnen controls Habbanya Sietch
  - Emperor controls Tuek's Sietch
- Turn: 2
- Expected flow:
  1. Bribes collected
  2. Victory check:
     - Atreides-Fremen alliance: 3 strongholds (need 4) - no win
     - Harkonnen-Emperor alliance: 2 strongholds (need 4) - no win
     - Harkonnen solo: 1 stronghold (need 3) - no win
  3. No victory

### Scenario 12: Alliance Victory with Mixed Control
**Goal**: Test alliance where one ally has more strongholds
**Setup**:
- Factions: Atreides, Fremen (allied)
- Forces:
  - Atreides controls Arrakeen, Carthag, Sietch Tabr (3)
  - Fremen controls Habbanya Sietch (1)
  - Combined: 4 strongholds
- Turn: 2
- Expected flow:
  1. Bribes collected
  2. Victory check: Alliance has 4 strongholds
  3. Victory achieved: Atreides & Fremen win

### Scenario 13: Bene Gesserit Prediction Victory
**Goal**: Test BG prediction override
**Setup**:
- Factions: Bene Gesserit, Atreides, Harkonnen
- Special states:
  - BG predicted Atreides on turn 2
- Forces:
  - Atreides controls 3 strongholds (would normally win)
- Turn: 2
- Expected flow:
  1. Bribes collected
  2. Victory check: Atreides has 3 strongholds
  3. BG prediction check: Predicted Atreides on turn 2
  4. BG wins instead (prediction override)

### Scenario 14: Exactly 3 Strongholds Boundary
**Goal**: Test boundary condition of exactly 3 strongholds
**Setup**:
- Factions: Atreides
- Forces:
  - Atreides controls exactly 3 strongholds (Arrakeen, Carthag, Sietch Tabr)
- Turn: 2
- Expected flow:
  1. Bribes collected
  2. Victory check: Exactly 3 strongholds (meets threshold)
  3. Victory achieved

### Scenario 15: Exactly 2 Strongholds (No Victory)
**Goal**: Test that 2 strongholds is not enough
**Setup**:
- Factions: Atreides
- Forces:
  - Atreides controls exactly 2 strongholds
- Turn: 2
- Expected flow:
  1. Bribes collected
  2. Victory check: Only 2 strongholds (below threshold)
  3. No victory

