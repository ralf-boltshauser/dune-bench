# Spice Blow Phase Test Plan

## Test Scenarios

### Scenario 1: Turn 1 Multiple Worms
**Goal**: Test Turn 1 special rules - worms set aside, no Nexus, reshuffled
**Setup**:
- Factions: Atreides, Fremen, Harkonnen
- Turn: 1
- Spice Deck A: [Shai-Hulud, Shai-Hulud, Territory Card (Cielago North, 8 spice)]
- Storm Sector: 5
- Forces: None in territories (clean slate)
- Expected flow:
  1. Reveal Shai-Hulud #1 - set aside
  2. Reveal Shai-Hulud #2 - set aside
  3. Reveal Territory Card - place 8 spice in Cielago North
  4. Phase completes, no Nexus
  5. Worms reshuffled into both decks

### Scenario 2: Multiple Worms Devouring
**Goal**: Test multiple worms in sequence, correct devour locations
**Setup**:
- Factions: Atreides, Harkonnen, Emperor
- Turn: 2
- Spice Deck A: [Territory Card (South Mesa, 10), Shai-Hulud, Territory Card (Red Chasm, 8), Shai-Hulud, Territory Card (Basin, 8)]
- Forces:
  - Atreides: 5 in South Mesa
  - Harkonnen: 3 in South Mesa
  - Emperor: 2 in Red Chasm
- Territory Spice: 10 in South Mesa, 8 in Red Chasm
- Expected flow:
  1. Reveal Territory Card (South Mesa) - place 10 spice
  2. Reveal Shai-Hulud #1 - devours in South Mesa (topmost Territory Card)
  3. Reveal Territory Card (Red Chasm) - place 8 spice
  4. Reveal Shai-Hulud #2 - devours in Red Chasm (topmost Territory Card)
  5. Reveal Territory Card (Basin) - place 8 spice
  6. Nexus triggered

### Scenario 3: Fremen Worm Immunity
**Goal**: Test Fremen forces immune to worms
**Setup**:
- Factions: Fremen, Atreides, Harkonnen
- Turn: 2
- Spice Deck A: [Territory Card (Habbanya Erg, 8), Shai-Hulud, Territory Card (Basin, 8)]
- Forces:
  - Fremen: 5 in Habbanya Erg
  - Atreides: 3 in Habbanya Erg
  - Harkonnen: 2 in Habbanya Erg
- Territory Spice: 8 in Habbanya Erg
- Expected flow:
  1. Reveal Territory Card - place 8 spice
  2. Reveal Shai-Hulud - devours in Habbanya Erg
  3. Atreides and Harkonnen forces devoured
  4. Fremen forces immune
  5. Spice destroyed
  6. Nexus triggered

### Scenario 4: Fremen Ally Protection
**Goal**: Test Fremen protecting ally from worm
**Setup**:
- Factions: Fremen, Atreides (allied)
- Turn: 2
- Spice Deck A: [Territory Card (South Mesa, 10), Shai-Hulud, Territory Card (Basin, 8)]
- Forces:
  - Fremen: 3 in South Mesa
  - Atreides: 4 in South Mesa (ally)
- Territory Spice: 10 in South Mesa
- Alliance: Fremen ↔ Atreides
- Expected flow:
  1. Reveal Territory Card - place 10 spice
  2. Reveal Shai-Hulud - ask Fremen to protect ally
  3. Fremen chooses to protect
  4. Atreides forces protected, Fremen immune
  5. Spice destroyed
  6. Nexus triggered

### Scenario 5: Fremen Worm Riding Choice
**Goal**: Test Fremen choosing to ride vs devour
**Setup**:
- Factions: Fremen, Atreides, Harkonnen
- Turn: 2
- Spice Deck A: [Territory Card (Habbanya Erg, 8), Shai-Hulud, Territory Card (Basin, 8)]
- Forces:
  - Fremen: 5 in Habbanya Erg
  - Atreides: 3 in Habbanya Erg
- Territory Spice: 8 in Habbanya Erg
- Expected flow:
  1. Reveal Territory Card - place 8 spice
  2. Reveal Shai-Hulud - devour forces
  3. Reveal Territory Card (Basin) - place 8 spice
  4. Ask Fremen: ride or devour
  5. Fremen chooses to ride
  6. Nexus triggered

### Scenario 6: Spice in Storm
**Goal**: Test spice not placed when sector in storm
**Setup**:
- Factions: Atreides, Harkonnen
- Turn: 2
- Spice Deck A: [Territory Card (Cielago North, 8 spice, sector 0)]
- Storm Sector: 0 (same as spice blow sector)
- Expected flow:
  1. Reveal Territory Card
  2. Check sector 0 in storm
  3. No spice placed
  4. Card discarded
  5. Phase completes

### Scenario 7: Two-Pile System
**Goal**: Test advanced rules two-pile system
**Setup**:
- Factions: Atreides, Fremen, Harkonnen
- Turn: 2
- Advanced Rules: true
- Spice Deck A: [Territory Card (South Mesa, 10), Shai-Hulud, Territory Card (Red Chasm, 8)]
- Spice Deck B: [Territory Card (Basin, 8), Shai-Hulud, Territory Card (Habbanya Erg, 8)]
- Forces:
  - Atreides: 3 in South Mesa
  - Harkonnen: 2 in Basin
- Territory Spice: 10 in South Mesa, 8 in Basin
- Expected flow:
  1. Reveal Card A (South Mesa) - place 10 spice
  2. Reveal Shai-Hulud on A - devours in South Mesa (from pile A discard)
  3. Reveal Card A (Red Chasm) - place 8 spice
  4. Reveal Card B (Basin) - place 8 spice
  5. Reveal Shai-Hulud on B - devours in Basin (from pile B discard)
  6. Reveal Card B (Habbanya Erg) - place 8 spice
  7. Nexus triggered (after first Territory Card after worm)

### Scenario 8: Nexus Alliance Negotiations
**Goal**: Test Nexus with multiple factions forming/breaking alliances
**Setup**:
- Factions: Atreides, Fremen, Harkonnen, Emperor
- Turn: 2
- Spice Deck A: [Territory Card (South Mesa, 10), Shai-Hulud, Territory Card (Basin, 8)]
- Existing Alliance: Fremen ↔ Atreides
- Expected flow:
  1. Reveal Territory Card - place 10 spice
  2. Reveal Shai-Hulud - devour forces
  3. Reveal Territory Card (Basin) - place 8 spice
  4. Nexus triggered
  5. Atreides breaks alliance with Fremen
  6. Harkonnen forms alliance with Emperor
  7. Fremen passes
  8. Nexus ends

### Scenario 9: Protected Leaders
**Goal**: Test protected leaders survive worm devouring
**Setup**:
- Factions: Atreides, Harkonnen
- Turn: 2
- Spice Deck A: [Territory Card (South Mesa, 10), Shai-Hulud, Territory Card (Basin, 8)]
- Forces:
  - Atreides: 3 in South Mesa
  - Atreides Leader: Duke Leto in South Mesa (protected from previous battle)
- Territory Spice: 10 in South Mesa
- Expected flow:
  1. Reveal Territory Card - place 10 spice
  2. Reveal Shai-Hulud - devour forces
  3. Atreides forces devoured
  4. Duke Leto protected (survives)
  5. Spice destroyed
  6. Nexus triggered

### Scenario 10: Complex Multi-Faction Devouring
**Goal**: Test multiple factions, Fremen immunity, protected ally
**Setup**:
- Factions: Fremen, Atreides (allied), Harkonnen, Emperor
- Turn: 2
- Spice Deck A: [Territory Card (Habbanya Erg, 8), Shai-Hulud, Territory Card (Basin, 8)]
- Forces:
  - Fremen: 5 in Habbanya Erg
  - Atreides: 4 in Habbanya Erg (ally)
  - Harkonnen: 3 in Habbanya Erg
  - Emperor: 2 in Habbanya Erg
- Territory Spice: 8 in Habbanya Erg
- Alliance: Fremen ↔ Atreides
- Expected flow:
  1. Reveal Territory Card - place 8 spice
  2. Reveal Shai-Hulud - ask Fremen to protect ally
  3. Fremen chooses to protect
  4. Fremen forces immune
  5. Atreides forces protected
  6. Harkonnen and Emperor forces devoured
  7. Spice destroyed
  8. Nexus triggered

