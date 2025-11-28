# Bidding Phase Test Plan

## Test Scenarios

### Scenario 1: Karama Card - Buy Without Paying
**Goal**: Test Karama card used to buy treachery card without paying spice
**Setup**:
- Factions: Atreides, Harkonnen, Emperor
- Atreides has Karama card in hand
- Atreides has 2 spice (not enough for competitive bid)
- 3 cards up for auction
- Other factions have more spice

**Expected flow**:
1. Hand size declarations
2. Cards dealt (3 cards)
3. First card auction starts
4. Atreides uses Karama to buy card without paying
5. Atreides receives card, no spice paid
6. Continue with remaining auctions

**What to validate**:
- Karama can be used during bidding
- Card is received without payment
- Spice not deducted from Atreides
- Hand size increases correctly
- Bidding continues normally

### Scenario 2: Karama Card - Bid Over Spice Limit
**Goal**: Test Karama card used to bid more spice than available
**Setup**:
- Factions: Atreides, Harkonnen, Emperor, Fremen
- Atreides has Karama card, only 3 spice
- Harkonnen has 10 spice
- 2 cards up for auction
- Competitive bidding expected

**Expected flow**:
1. Hand size declarations
2. Cards dealt (2 cards)
3. First card auction - bidding war
4. Atreides uses Karama to bid 8 spice (only has 3)
5. If Atreides wins, must still pay (Karama doesn't avoid payment)
6. Continue bidding

**What to validate**:
- Karama allows bidding over spice limit
- If wins, must still pay (or use another Karama to avoid payment)
- Bidding continues normally
- Other factions don't know about Karama usage

### Scenario 3: Multiple Factions Bidding War
**Goal**: Test 4+ factions all bidding on same card
**Setup**:
- Factions: All 6 factions
- All have sufficient spice (10+ each)
- All have room in hand (0-2 cards)
- 1 valuable card (e.g., Karama, Weapon)
- Competitive bidding expected

**Expected flow**:
1. Hand size declarations
2. Card dealt
3. Bidding war - all factions bid
4. Bids escalate (1, 2, 3, 4, 5, 6...)
5. Some factions pass, others continue
6. Highest bidder wins
7. Payment processed

**What to validate**:
- Bidding order follows storm order
- Bids must increase
- Passing works correctly
- Winner determination correct
- Payment processed correctly

### Scenario 4: Atreides Prescience - Sees Cards
**Goal**: Test Atreides ability to see cards before bidding
**Setup**:
- Factions: Atreides, Harkonnen, Emperor
- Atreides has room in hand
- 3 cards up for auction (mix of valuable and worthless)
- Other factions cannot see cards

**Expected flow**:
1. Hand size declarations
2. Cards dealt (3 cards)
3. First card - Atreides sees it, others don't
4. Atreides bids based on knowledge
5. Other factions bid blindly
6. Repeat for each card

**What to validate**:
- Atreides sees card info in request
- Other factions don't see card info
- Atreides can make informed decisions
- Bidding proceeds normally

### Scenario 5: Emperor Payment Collection
**Goal**: Test Emperor receives payment for all card purchases
**Setup**:
- Factions: Atreides, Harkonnen, Emperor, Fremen
- Emperor in game
- All factions have spice
- 4 cards up for auction
- Multiple factions will buy cards

**Expected flow**:
1. Hand size declarations
2. Cards dealt (4 cards)
3. Multiple auctions - different factions win
4. Each winner pays Emperor (not bank)
5. Emperor's spice increases

**What to validate**:
- Each purchase payment goes to Emperor
- Emperor's spice increases correctly
- Fair Market rule enforced (no discounts)
- Bank spice not increased

### Scenario 6: Harkonnen Top Card Ability
**Goal**: Test Harkonnen gets free card after each purchase
**Setup**:
- Factions: Harkonnen, Atreides, Emperor
- Harkonnen has room in hand (0-6 cards)
- 3 cards up for auction
- Harkonnen will win at least 2 auctions

**Expected flow**:
1. Hand size declarations
2. Cards dealt (3 cards)
3. Harkonnen wins first auction
4. Harkonnen receives purchased card
5. Harkonnen draws free card from deck
6. Repeat for second purchase

**What to validate**:
- Harkonnen receives purchased card
- Harkonnen draws free card from deck (not auction)
- Hand size increases by 2 per purchase
- Free card drawn even if at 7 cards (goes to 8)
- Cannot bid if at 8 cards

### Scenario 7: Bought-In Rule (All Pass)
**Goal**: Test bought-in rule when all eligible bidders pass
**Setup**:
- Factions: Atreides, Harkonnen, Emperor
- All have low spice (1-2 each)
- 3 cards up for auction
- First card is worthless (Baliset, etc.)
- All factions pass on first card

**Expected flow**:
1. Hand size declarations
2. Cards dealt (3 cards)
3. First card auction starts
4. All eligible bidders pass
5. Bought-in rule triggers
6. All remaining cards returned to deck
7. Bidding phase ends

**What to validate**:
- All pass detection works
- Bought-in rule triggers correctly
- All remaining cards returned to deck
- Cards returned in correct order
- Phase ends immediately

### Scenario 8: Hand Size Changes Mid-Auction
**Goal**: Test faction becomes ineligible during bidding
**Setup**:
- Factions: Atreides, Harkonnen, Emperor
- Atreides has 3 cards (1 away from full)
- 2 cards up for auction
- Atreides wins first card (now at 4, ineligible)
- Second card auction - Atreides cannot bid

**Expected flow**:
1. Hand size declarations
2. Cards dealt (2 cards)
3. First card auction - Atreides wins
4. Atreides hand size now 4 (ineligible)
5. Second card auction - Atreides skipped
6. Other factions bid

**What to validate**:
- Hand size updates after purchase
- Ineligible factions skipped in bidding
- Eligibility checked correctly
- Bidding continues with eligible factions

### Scenario 9: Complex Multi-Card with All Abilities
**Goal**: Test all faction abilities in complex scenario
**Setup**:
- Factions: All 6 factions
- Atreides has Karama card
- All have sufficient spice
- 5 cards up for auction
- Mix of valuable and worthless cards

**Expected flow**:
1. Hand size declarations
2. Cards dealt (5 cards)
3. Multiple auctions with:
   - Atreides sees cards
   - Atreides uses Karama
   - Harkonnen wins and gets free cards
   - Emperor receives payments
   - Starting bidder rotates
   - Eligibility changes

**What to validate**:
- All faction abilities work correctly
- Starting bidder rotation
- Eligibility tracking
- Payment processing
- Hand size management
- Complex interactions

### Scenario 10: Edge Cases
**Goal**: Test edge cases and error conditions
**Setup**:
- Various configurations for each edge case

**Edge cases to test**:
1. All hands full at start - phase ends immediately
2. Only one eligible bidder - gets card for 1 spice
3. Faction with 0 spice - must pass or use Karama
4. Karama when hand is full - should fail validation
5. Multiple Karama cards - can use multiple times
6. Harkonnen at 7 cards - can still buy (goes to 8)
7. Harkonnen at 8 cards - cannot bid

**What to validate**:
- Edge cases handled correctly
- Error conditions caught
- Validation works
- Phase completes successfully

