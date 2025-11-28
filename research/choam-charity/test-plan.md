# CHOAM Charity Phase Test Plan

## Test Scenarios

### Scenario 1: Standard Charity - Zero Spice
**Goal**: Test standard charity for faction with 0 spice
**Setup**:
- Factions: Atreides (0 spice), Harkonnen (5 spice - not eligible)
- Expected flow:
  1. Atreides is eligible (0 spice)
  2. Harkonnen is not eligible (5 spice)
  3. Atreides claims charity
  4. Atreides receives 2 spice (0 → 2)
  5. Harkonnen receives nothing

### Scenario 2: Standard Charity - One Spice
**Goal**: Test standard charity for faction with 1 spice
**Setup**:
- Factions: Fremen (1 spice), Emperor (3 spice - not eligible)
- Expected flow:
  1. Fremen is eligible (1 spice)
  2. Emperor is not eligible (3 spice)
  3. Fremen claims charity
  4. Fremen receives 1 spice (1 → 2)
  5. Emperor receives nothing

### Scenario 3: Bene Gesserit Advanced Ability - High Spice
**Goal**: Test BG advanced ability when they have high spice
**Setup**:
- Factions: Bene Gesserit (5 spice), Atreides (0 spice)
- Advanced Rules: true
- Expected flow:
  1. Both are eligible (BG due to advanced ability, Atreides due to 0 spice)
  2. Both claim charity
  3. BG receives 2 spice (5 → 7) - always gets 2, not bringing to 2
  4. Atreides receives 2 spice (0 → 2) - standard behavior

### Scenario 4: Bene Gesserit Advanced Ability - One Spice
**Goal**: Test BG advanced ability when they have 1 spice
**Setup**:
- Factions: Bene Gesserit (1 spice)
- Advanced Rules: true
- Expected flow:
  1. BG is eligible (advanced ability)
  2. BG claims charity
  3. BG receives 2 spice (1 → 3) - always gets 2, not bringing to 2

### Scenario 5: Bene Gesserit Basic Rules
**Goal**: Test BG follows standard rules in basic game
**Setup**:
- Factions: Bene Gesserit (1 spice), Bene Gesserit (5 spice)
- Advanced Rules: false
- Expected flow:
  1. BG with 1 spice is eligible
  2. BG with 5 spice is NOT eligible
  3. Only BG with 1 spice can claim

### Scenario 6: Multiple Factions Simultaneous
**Goal**: Test multiple factions claiming at once
**Setup**:
- Factions: Atreides (0 spice), Fremen (1 spice), Harkonnen (0 spice), Emperor (4 spice - not eligible)
- Expected flow:
  1. Atreides, Fremen, Harkonnen are eligible
  2. Emperor is not eligible
  3. All three eligible factions claim simultaneously
  4. Atreides receives 2 spice (0 → 2)
  5. Fremen receives 1 spice (1 → 2)
  6. Harkonnen receives 2 spice (0 → 2)
  7. Emperor receives nothing

### Scenario 7: Mixed Claim and Decline
**Goal**: Test some factions claiming, others declining
**Setup**:
- Factions: Atreides (0 spice), Fremen (1 spice), Harkonnen (0 spice)
- Expected flow:
  1. All three are eligible
  2. Atreides claims charity
  3. Fremen declines charity
  4. Harkonnen claims charity
  5. Atreides receives 2 spice (0 → 2)
  6. Fremen receives nothing (1 spice remains)
  7. Harkonnen receives 2 spice (0 → 2)

### Scenario 8: Fraud Safeguards
**Goal**: Test that factions can only claim once per turn
**Setup**:
- Factions: Atreides (0 spice)
- Expected flow:
  1. Atreides is eligible
  2. Atreides claims charity (receives 2 spice)
  3. System attempts to process second claim
  4. Second claim is rejected (fraud safeguard)
  5. Atreides still has 2 spice (only first claim processed)

### Scenario 9: No Eligible Factions
**Goal**: Test phase skip when no one is eligible
**Setup**:
- Factions: Atreides (5 spice), Fremen (3 spice), Harkonnen (4 spice)
- Expected flow:
  1. No factions are eligible (all have 2+ spice)
  2. Phase completes immediately
  3. No agent requests are made
  4. No spice changes

### Scenario 10: Complex Mixed Scenario
**Goal**: Test complex scenario with BG advanced + standard factions
**Setup**:
- Factions: Bene Gesserit (3 spice), Atreides (0 spice), Fremen (1 spice), Harkonnen (5 spice - not eligible)
- Advanced Rules: true
- Expected flow:
  1. BG, Atreides, Fremen are eligible
  2. Harkonnen is not eligible
  3. BG claims charity
  4. Atreides declines charity
  5. Fremen claims charity
  6. BG receives 2 spice (3 → 5)
  7. Atreides receives nothing (0 spice remains)
  8. Fremen receives 1 spice (1 → 2)
  9. Harkonnen receives nothing

## Validation Checklist

For each scenario, verify in logs:
- [ ] Correct eligibility determination
- [ ] Correct spice amounts received
- [ ] Correct final spice totals
- [ ] Events logged correctly
- [ ] State changes are correct
- [ ] Agent requests are formatted correctly
- [ ] Agent responses are processed correctly
- [ ] Fraud safeguards work (if applicable)
- [ ] Phase completes correctly

