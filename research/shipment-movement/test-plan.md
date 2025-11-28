# Shipment & Movement Phase Test Plan

## Test Scenarios

### Scenario 1: HAJR Extra Movement Card
**Goal**: Test HAJR card granting extra movement action
**Setup**:
- Factions: Atreides, Harkonnen
- Atreides has HAJR card in hand
- Atreides has forces in multiple territories
- Atreides has forces in Arrakeen (ornithopter access)
**Expected flow**:
1. Atreides ships forces (normal)
2. Atreides moves forces (normal movement)
3. Atreides plays HAJR
4. Atreides moves forces again (extra movement)
**What to check**:
- HAJR can be played during movement
- Extra movement action granted
- Can move same group or different group
- Ornithopter access applies to both movements
- HAJR discarded after use

### Scenario 2: Fremen Free Shipment and 2-Territory Movement
**Goal**: Test Fremen special shipment and movement abilities
**Setup**:
- Factions: Fremen, Atreides
- Fremen has reserves (on-planet, not off-planet)
- Storm in some sectors
- Great Flat accessible
**Expected flow**:
1. Fremen ships reserves for free to Great Flat (or within 2 territories)
2. Fremen moves forces 2 territories (not 1)
3. Test storm migration (half loss)
**What to check**:
- Free shipment to Great Flat
- Free shipment within 2 territories of Great Flat
- 2-territory movement (base)
- Storm migration calculation (half loss, rounded up)
- Storm restrictions apply

### Scenario 3: Spacing Guild Act Out of Order
**Goal**: Test Guild's ability to act before/after any faction
**Setup**:
- Factions: Atreides, Harkonnen, Spacing Guild
- Guild wants to act first
**Expected flow**:
1. Phase starts, Guild asked when to act
2. Guild chooses "NOW" (act immediately)
3. Guild ships and moves
4. Then Atreides (storm order)
5. Then Harkonnen
**What to check**:
- Guild can act first
- Guild can act in middle
- Guild can delay to end
- Normal storm order continues after Guild acts
- Guild receives payment from other factions

### Scenario 4: Spacing Guild Cross-Ship and Off-Planet
**Goal**: Test Guild's special shipment abilities
**Setup**:
- Factions: Spacing Guild, Atreides
- Guild has forces on board
- Guild has forces in reserves
**Expected flow**:
1. Guild cross-ships forces between territories
2. Guild ships forces off-planet (board to reserves)
3. Guild ships normally (half-price)
**What to check**:
- Cross-ship works (territory to territory)
- Off-planet shipment works (board to reserves)
- Half-price calculation (rounded up)
- Cost calculations correct

### Scenario 5: Bene Gesserit Spiritual Advisors
**Goal**: Test BG advisor placement when other factions ship
**Setup**:
- Factions: Atreides, Bene Gesserit
- Atreides has reserves
- BG has reserves
**Expected flow**:
1. Atreides ships forces to territory X
2. BG sends advisor to Polar Sink OR same territory
3. Multiple shipments trigger multiple advisors
**What to check**:
- Advisor sent to Polar Sink option
- Advisor sent to same territory option
- Advisor vs fighter distinction
- Multiple advisors from multiple shipments

### Scenario 6: Ornithopter Access at Phase Start
**Goal**: Test ornithopter access determined at phase start
**Setup**:
- Factions: Atreides, Harkonnen
- Atreides has forces in Arrakeen at phase start
- Harkonnen does not
**Expected flow**:
1. Atreides ships forces (doesn't matter where)
2. Atreides moves with ornithopters (3 territories)
3. Harkonnen ships into Arrakeen
4. Harkonnen moves without ornithopters (1 territory)
**What to check**:
- Atreides has ornithopters (forces in Arrakeen at start)
- Harkonnen doesn't have ornithopters (shipped in during phase)
- 3-territory movement for Atreides
- 1-territory movement for Harkonnen

### Scenario 7: Storm Restrictions
**Goal**: Test storm blocking shipment and movement
**Setup**:
- Factions: Atreides, Harkonnen
- Storm in specific sectors
- Territories with multiple sectors
**Expected flow**:
1. Attempt shipment into storm (should fail)
2. Attempt movement through storm (should fail)
3. Move around storm (multi-sector territory)
4. Ship to Polar Sink (never in storm)
**What to check**:
- Shipment blocked by storm
- Movement blocked by storm
- Multi-sector territory movement (avoiding storm)
- Polar Sink always accessible

### Scenario 8: Occupancy Limits
**Goal**: Test stronghold occupancy limits
**Setup**:
- Factions: Atreides, Harkonnen, Emperor
- All want to ship/move into same stronghold
**Expected flow**:
1. Atreides ships to stronghold
2. Harkonnen ships to stronghold
3. Emperor attempts to ship (should fail - 2 other factions)
4. Emperor attempts to move (should fail)
**What to check**:
- Occupancy limit enforced (2 other factions max)
- Applies to both shipment and movement
- Alliance forces don't count

### Scenario 9: Alliance Constraints
**Goal**: Test forces sent to tanks when in same territory as ally
**Setup**:
- Factions: Atreides, Harkonnen (allied)
- Forces in same territory
- Forces in Polar Sink (exception)
**Expected flow**:
1. Atreides ships and moves
2. Alliance constraint applied (forces in same territory as Harkonnen → tanks)
3. Polar Sink forces stay (exception)
**What to check**:
- Forces sent to tanks after faction completes
- Polar Sink exception
- Applied after each faction (not at phase end)

### Scenario 10: Complex Multi-Faction Scenario
**Goal**: Test complex scenario with multiple factions and abilities
**Setup**:
- Factions: Atreides, Fremen, Spacing Guild, Bene Gesserit
- Multiple abilities in play
- Complex board state
**Expected flow**:
1. Guild acts first (out of order)
2. Atreides ships and moves (with ornithopters)
3. Fremen ships for free and moves 2 territories
4. BG sends advisors
5. Alliance constraints applied
**What to check**:
- All abilities work together
- Sequential processing correct
- Alliance constraints applied correctly
- Complex interactions handled

### Scenario 11: Fremen with Ornithopters
**Goal**: Test Fremen 2-territory movement with ornithopter access
**Setup**:
- Factions: Fremen
- Fremen has forces in Arrakeen at phase start
**Expected flow**:
1. Fremen moves with ornithopter access
2. Test movement range (2 base + ornithopters = ?)
**What to check**:
- Fremen base movement is 2 territories
- Ornithopter access grants 3 territories?
- Or does Fremen get 2 + 2 = 4 territories?
- Need to verify rule interpretation

### Scenario 12: HAJR with Fremen
**Goal**: Test HAJR card with Fremen 2-territory movement
**Setup**:
- Factions: Fremen
- Fremen has HAJR card
**Expected flow**:
1. Fremen moves normally (2 territories)
2. Fremen plays HAJR
3. Fremen moves again (2 territories)
**What to check**:
- HAJR works with Fremen
- Both movements use 2-territory range
- Can move same group or different group

