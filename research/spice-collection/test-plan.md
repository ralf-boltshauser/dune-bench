# Spice Collection Phase Test Plan

## Test Scenarios

### Scenario 1: City Bonus Global Application
**Goal**: Verify that city bonus (Arrakeen/Carthag) applies to ALL collection, not just in those cities

**Setup**:
- Factions: Atreides, Harkonnen
- Atreides: 5 forces in Arrakeen (gives city bonus), 3 forces in Hagga Basin (sector 8) with 15 spice
- Harkonnen: 4 forces in Rock Outcroppings (sector 10) with 12 spice (no city bonus)
- Expected: Atreides collects 9 spice (3 forces × 3 spice/force) from Hagga Basin despite not being in a city
- Expected: Harkonnen collects 8 spice (4 forces × 2 spice/force) from Rock Outcroppings

### Scenario 2: Multiple Sectors Same Territory
**Goal**: Test per-sector collection within the same territory

**Setup**:
- Factions: Fremen, Emperor
- Fremen: 2 forces in Rock Outcroppings (sector 10) with 8 spice, 3 forces in Rock Outcroppings (sector 11) with 10 spice
- Emperor: 1 force in Rock Outcroppings (sector 12) with 5 spice
- Expected: Fremen collects 4 spice from sector 10 + 6 spice from sector 11 = 10 total
- Expected: Emperor collects 2 spice from sector 12

### Scenario 3: Limited Spice Availability
**Goal**: Verify collection is capped at available spice amount

**Setup**:
- Factions: Bene Gesserit, Spacing Guild
- Bene Gesserit: 10 forces in Hagga Basin (sector 8) with only 5 spice available
- Spacing Guild: 8 forces in South Mesa (sector 2) with 3 spice available
- Expected: Bene Gesserit collects 5 spice (not 20)
- Expected: Spacing Guild collects 3 spice (not 16)

### Scenario 4: Multiple Factions Competing
**Goal**: Test multiple factions collecting from same territory but different sectors

**Setup**:
- Factions: Atreides, Harkonnen, Fremen, Emperor
- All in Rock Outcroppings but different sectors:
  - Atreides: 3 forces in sector 10 with 12 spice (has city bonus via Arrakeen)
  - Harkonnen: 2 forces in sector 11 with 8 spice (has city bonus via Carthag)
  - Fremen: 4 forces in sector 12 with 10 spice (no city bonus)
  - Emperor: 1 force in sector 13 with 4 spice (no city bonus)
- Expected: Atreides collects 9 spice (3 × 3), Harkonnen collects 6 spice (2 × 3), Fremen collects 8 spice (4 × 2), Emperor collects 2 spice (1 × 2)

### Scenario 5: Elite vs Regular Forces
**Goal**: Verify elite and regular forces count equally

**Setup**:
- Factions: Harkonnen, Fremen
- Harkonnen: 2 regular + 3 elite = 5 total forces in Hagga Basin (sector 8) with 20 spice (has city bonus)
- Fremen: 4 elite forces in South Mesa (sector 2) with 12 spice (no city bonus)
- Expected: Harkonnen collects 15 spice (5 forces × 3 spice/force)
- Expected: Fremen collects 8 spice (4 forces × 2 spice/force)

### Scenario 6: No Spice Scenarios
**Goal**: Verify no collection events fire when no spice is available

**Setup**:
- Factions: Atreides, Harkonnen
- Atreides: 5 forces in Tuek's Sietch (sector 15) with 0 spice
- Harkonnen: 3 forces in Polar Sink (if applicable) with 0 spice
- Expected: No collection events for these territories
- Also include: Atreides with 2 forces in Hagga Basin (sector 8) with 6 spice (should collect)
- Expected: Only 1 collection event (Hagga Basin)

### Scenario 7: Large Scale Collection
**Goal**: Stress test with all factions and multiple territories

**Setup**:
- Factions: All 6 factions
- Multiple force stacks across multiple territories
- Mix of city bonus and no city bonus
- Mix of limited and abundant spice
- Expected: All collections happen correctly, all events fire, state updates correctly

### Scenario 8: City Stronghold Collection
**Goal**: Test collection from Arrakeen and Carthag themselves

**Setup**:
- Factions: Atreides, Harkonnen
- Atreides: 4 forces in Arrakeen (sector 16) with 15 spice
- Harkonnen: 3 forces in Carthag (sector 5) with 12 spice
- Expected: Atreides collects 12 spice (4 × 3) from Arrakeen
- Expected: Harkonnen collects 9 spice (3 × 3) from Carthag
- Both get city bonus because they're in the cities

### Scenario 9: Spice in Storm Sector
**Goal**: Test if forces can collect spice when both forces and spice are in a storm sector

**Setup**:
- Factions: Atreides, Harkonnen
- Storm is in sector 10
- Atreides: 5 forces in Rock Outcroppings (sector 10) with 15 spice - both in storm sector
- Harkonnen: 3 forces in Hagga Basin (sector 8) with 10 spice - not in storm
- Expected: Atreides collects 10 spice (5 × 2) - can collect even in storm sector (rock territory protected)
- Expected: Harkonnen collects 6 spice (3 × 2) - normal collection

