# Revival Phase Test Plan

## Test Scenarios

### Scenario 1: Basic Force Revival
**Goal**: Test basic force revival mechanics (free and paid)
**Setup**:
- Factions: Atreides, Harkonnen
- Forces in tanks: Atreides (10), Harkonnen (5)
- Spice: Atreides (20), Harkonnen (10)
- Special cards: None
- Special abilities: None
- Expected flow: 
  - Atreides revives 2 free + 1 paid (costs 2 spice)
  - Harkonnen revives 2 free only

### Scenario 2: Fremen Fedaykin Revival
**Goal**: Test Fremen Fedaykin elite force revival limit
**Setup**:
- Factions: Fremen, Atreides
- Forces in tanks: Fremen (5 regular + 3 Fedaykin), Atreides (5)
- Spice: Fremen (15), Atreides (20)
- Special cards: None
- Special abilities: Fremen Fedaykin
- Expected flow:
  - Fremen revives 3 free (including 1 Fedaykin)
  - Only 1 Fedaykin can be revived per turn
  - Fedaykin count as 1 force in revival

### Scenario 3: Fremen Alliance Boost (Granted)
**Goal**: Test Fremen granting 3 free revivals to ally
**Setup**:
- Factions: Fremen (allied with Atreides)
- Forces in tanks: Fremen (3), Atreides (8)
- Spice: Fremen (10), Atreides (20)
- Special cards: None
- Special abilities: Fremen alliance boost
- Expected flow:
  - Fremen is asked first if they want to grant boost
  - Fremen grants boost
  - Atreides gets 3 free revivals (instead of 2)
  - Both factions complete revival

### Scenario 4: Fremen Alliance Boost (Denied)
**Goal**: Test Fremen denying the boost to ally
**Setup**:
- Factions: Fremen (allied with Atreides)
- Forces in tanks: Fremen (3), Atreides (8)
- Spice: Fremen (10), Atreides (20)
- Special cards: None
- Special abilities: Fremen alliance boost
- Expected flow:
  - Fremen is asked first
  - Fremen denies boost
  - Atreides gets normal 2 free revivals
  - Both factions complete revival

### Scenario 5: Emperor Ally Revival Bonus
**Goal**: Test Emperor paying for extra ally revivals
**Setup**:
- Factions: Emperor (allied with Atreides)
- Forces in tanks: Emperor (5), Atreides (10)
- Spice: Emperor (30), Atreides (20)
- Special cards: None
- Special abilities: Emperor alliance bonus
- Expected flow:
  - Atreides revives normal 3 (2 free + 1 paid)
  - Emperor can pay for up to 3 extra Atreides revivals
  - Emperor pays 2 spice per force
  - Tracking shows remaining bonus

### Scenario 6: Leader Revival
**Goal**: Test leader revival mechanics
**Setup**:
- Factions: Atreides, Harkonnen
- Forces in tanks: Atreides (5), Harkonnen (5)
- Leaders in tanks: Atreides (Duke Leto - face up)
- Spice: Atreides (20), Harkonnen (15)
- Special cards: None
- Special abilities: None
- Special states: All Atreides leaders have died once
- Expected flow:
  - Atreides can revive leader (all leaders dead once)
  - Cost is leader's strength in spice
  - Leader goes to leader pool

### Scenario 7: Leader Revival Cannot Revive
**Goal**: Test leader revival restrictions
**Setup**:
- Factions: Atreides
- Forces in tanks: Atreides (5)
- Leaders in tanks: Atreides (Duke Leto - face up)
- Spice: Atreides (20)
- Special cards: None
- Special abilities: None
- Special states: Atreides has active leaders
- Expected flow:
  - Atreides cannot revive leader (active leaders exist)
  - Only force revival available

### Scenario 8: Kwisatz Haderach Revival
**Goal**: Test Atreides Kwisatz Haderach revival
**Setup**:
- Factions: Atreides, Harkonnen
- Forces in tanks: Atreides (5), Harkonnen (5)
- Spice: Atreides (20), Harkonnen (15)
- Special cards: None
- Special abilities: Kwisatz Haderach
- Special states: KH dead, all leaders have died once
- Expected flow:
  - Atreides can revive KH (all leaders dead once)
  - Cost is 2 spice (KH strength is +2)
  - KH is revived

### Scenario 9: Kwisatz Haderach Cannot Revive
**Goal**: Test Kwisatz Haderach revival restrictions
**Setup**:
- Factions: Atreides
- Forces in tanks: Atreides (5)
- Spice: Atreides (20)
- Special cards: None
- Special abilities: Kwisatz Haderach
- Special states: KH dead, but active leaders exist
- Expected flow:
  - Atreides cannot revive KH (active leaders exist)
  - Must wait until all leaders dead once

### Scenario 10: Tleilaxu Ghola Force Revival
**Goal**: Test Tleilaxu Ghola card for force revival
**Setup**:
- Factions: Atreides, Harkonnen
- Forces in tanks: Atreides (10), Harkonnen (5)
- Spice: Atreides (20), Harkonnen (15)
- Special cards: Atreides (Tleilaxu Ghola)
- Special abilities: None
- Expected flow:
  - Atreides can use Ghola to revive 5 forces for free
  - This is in addition to normal revival
  - Card is discarded after use

### Scenario 11: Tleilaxu Ghola Leader Revival
**Goal**: Test Tleilaxu Ghola card for leader revival
**Setup**:
- Factions: Atreides
- Forces in tanks: Atreides (5)
- Leaders in tanks: Atreides (Duke Leto - face up)
- Spice: Atreides (20)
- Special cards: Atreides (Tleilaxu Ghola)
- Special abilities: None
- Special states: Atreides has active leaders (normally can't revive)
- Expected flow:
  - Atreides can use Ghola to revive leader (bypasses normal rule)
  - This is in addition to normal revival
  - Card is discarded after use

### Scenario 12: Complex Multi-Faction Revival
**Goal**: Test complex interactions with multiple factions
**Setup**:
- Factions: Atreides, Fremen, Emperor, Harkonnen
- Forces in tanks: 
  - Atreides (8 regular)
  - Fremen (5 regular + 2 Fedaykin)
  - Emperor (6 regular + 1 Sardaukar)
  - Harkonnen (4 regular)
- Spice: Atreides (15), Fremen (5), Emperor (30), Harkonnen (1)
- Leaders in tanks: Atreides (Duke Leto)
- Special cards: None
- Special abilities: Various
- Special states: All Atreides leaders dead once
- Expected flow:
  - All factions revive simultaneously (no storm order)
  - Different revival amounts and costs
  - Mix of force and leader revivals
  - Elite force limits enforced

### Scenario 13: Insufficient Spice Revival
**Goal**: Test handling of insufficient spice
**Setup**:
- Factions: Atreides, Harkonnen
- Forces in tanks: Atreides (10), Harkonnen (5)
- Spice: Atreides (1), Harkonnen (15)
- Special cards: None
- Special abilities: None
- Expected flow:
  - Atreides wants 3 but only has 1 spice
  - Handler clamps to 2 free only (can't afford paid)
  - Harkonnen revives normally

## Test Execution Order

1. Basic scenarios first (force revival, leader revival)
2. Faction-specific abilities (Fremen, Emperor)
3. Special cards (Tleilaxu Ghola)
4. Complex multi-faction scenarios
5. Edge cases (insufficient spice, restrictions)

## Validation Checklist

For each scenario, validate in log files:
- [ ] Revival limits are correct (free revivals, max per turn)
- [ ] Spice costs are calculated correctly
- [ ] Elite force limits are enforced (1 per turn)
- [ ] Alliance abilities work correctly
- [ ] Leader revival conditions are checked
- [ ] State changes are correct (forces moved, spice deducted)
- [ ] Events fire in correct order
- [ ] Edge cases are handled gracefully

