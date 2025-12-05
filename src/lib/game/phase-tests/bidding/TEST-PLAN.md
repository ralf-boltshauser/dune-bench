# Bidding Phase Test Plan

Comprehensive test plan for the refactored bidding phase handler covering all modules, functionality, edge cases, and negative scenarios.

## Test Organization

Tests are organized by module and functionality area to ensure complete coverage of the refactored code.

---

## 1. INITIALIZATION MODULE TESTS (`bidding/initialization.ts`)

### 1.1 Hand Size Declarations (Rule 1.04.01)
- ✅ **Test**: All factions declare hand sizes correctly
- ✅ **Test**: Hand size categories are correct (0, 1-3, 4+)
- ✅ **Test**: Eligibility is correctly determined based on hand size
- ✅ **Test**: Harkonnen has max hand size of 8 (Rule 2.05.07 - TRAMENDOUSLY TREACHEROUS)
- ✅ **Test**: Other factions have max hand size of 4 (Rule 1.04.02)
- ✅ **Test**: HAND_SIZE_DECLARED event is emitted with correct data
- ✅ **Test**: Hand size transparency (Rule 1.04.10) - amount known upon request
- ❌ **Negative**: Invalid hand size data (should not occur, but defensive)

### 1.2 Card Dealing (Rule 1.04.04)
- ✅ **Test**: Correct number of cards dealt (1 per eligible bidder)
- ✅ **Test**: Cards are removed from deck correctly
- ✅ **Test**: Cards stored in context correctly (both IDs and objects)
- ✅ **Test**: Early exit when no cards to auction (all hands full)
- ✅ **Test**: Early exit when treachery deck is empty
- ❌ **Negative**: More eligible bidders than cards in deck
- ❌ **Negative**: Deck becomes empty mid-dealing

### 1.3 Context Initialization
- ✅ **Test**: Context is properly reset on initialize
- ✅ **Test**: Bidding order is set correctly from storm order
- ✅ **Test**: All context fields initialized to correct defaults

---

## 2. AUCTION MODULE TESTS (`bidding/auction.ts`)

### 2.1 Auction Start
- ✅ **Test**: Auction state is reset (bid, highBidder, passedFactions)
- ✅ **Test**: Atreides peek flag is reset for each auction
- ✅ **Test**: AUCTION_STARTED event is emitted correctly
- ✅ **Test**: Card identity is kept secret (not in public event)

### 2.2 Eligibility Checking
- ✅ **Test**: Correctly identifies eligible bidders (hand not full)
- ✅ **Test**: Correctly identifies ineligible bidders (hand full)
- ✅ **Test**: Hand size changes during phase are reflected
- ✅ **Test**: Early exit when no eligible bidders (all hands full)
- ✅ **Test**: Cards returned to deck when no eligible bidders
- ❌ **Negative**: Faction becomes ineligible mid-auction

### 2.3 Starting Bidder Determination
- ✅ **Test**: First card starts with First Player (Rule 1.04.06)
- ✅ **Test**: First Player skipped if ineligible, next eligible starts
- ✅ **Test**: Subsequent cards start with first eligible to right of previous opener (Rule 1.04.07)
- ✅ **Test**: Wraps around storm order correctly
- ✅ **Test**: Starting bidder tracked correctly in context
- ❌ **Negative**: No eligible bidders found (should not happen, but defensive)

### 2.4 Atreides Prescience (Rule 2.01.05)
- ✅ **Test**: Atreides receives PEEK_CARD request before bidding starts
- ✅ **Test**: Request includes correct card information
- ✅ **Test**: Request includes auction context (number, total, starting bidder)
- ✅ **Test**: Atreides peek flag is set correctly
- ✅ **Test**: No peek request when Atreides not in game
- ✅ **Test**: Bidding proceeds after peek acknowledgment
- ❌ **Negative**: Atreides tries to peek multiple times
- ❌ **Negative**: Invalid peek response

---

## 3. BID PROCESSING MODULE TESTS (`bidding/bid-processing.ts`)

### 3.1 Bid Request Creation
- ✅ **Test**: Correct bidder is requested (storm order)
- ✅ **Test**: Request includes current bid, high bidder, minimum bid
- ✅ **Test**: Request includes spice available
- ✅ **Test**: Request includes card description (hidden except Atreides)
- ✅ **Test**: Atreides sees card info in request (Prescience)
- ✅ **Test**: Other factions see "Treachery Card" only
- ✅ **Test**: Opening bid prompt is different from regular bid prompt

### 3.2 BOUGHT-IN Rule Detection (Rule 1.04.11)
- ✅ **Test**: Detects when all eligible bidders have passed
- ✅ **Test**: Returns all remaining cards to deck
- ✅ **Test**: CARD_BOUGHT_IN event is emitted
- ✅ **Test**: Phase ends immediately after BOUGHT-IN
- ✅ **Test**: Cards are shuffled when returned
- ❌ **Negative**: BOUGHT-IN triggered incorrectly (some eligible haven't passed)

### 3.3 Next Bidder Finding
- ✅ **Test**: Finds next eligible bidder in storm order
- ✅ **Test**: Skips passed factions
- ✅ **Test**: Skips ineligible factions (hand full)
- ✅ **Test**: Wraps around bidding order correctly
- ✅ **Test**: Handles case where all have passed (BOUGHT-IN)
- ❌ **Negative**: Infinite loop prevention (all passed/ineligible)

### 3.4 Auto-Skip Logic
- ✅ **Test**: Auto-skips faction with insufficient spice (no Karama)
- ✅ **Test**: Auto-skip event is emitted correctly
- ✅ **Test**: Does NOT auto-skip if has Karama card
- ✅ **Test**: Does NOT auto-skip if has Karama free card active
- ✅ **Test**: Continues to next bidder after auto-skip

### 3.5 Karama Free Card Short-Circuit
- ✅ **Test**: Karama free card immediately resolves auction
- ✅ **Test**: KARAMA_FREE_CARD event is emitted
- ✅ **Test**: High bidder set to Karama user
- ✅ **Test**: Current bid set to 0
- ✅ **Test**: Auction ends immediately (no further bidding)
- ❌ **Negative**: Karama free card used when hand full (should be prevented)

### 3.6 Bid Processing
- ✅ **Test**: Valid bid is accepted
- ✅ **Test**: Current bid and high bidder updated correctly
- ✅ **Test**: BID_PLACED event is emitted
- ✅ **Test**: Bidder index moves to next bidder
- ✅ **Test**: Invalid bid is rejected (uses validateBid)
- ✅ **Test**: BID_PASSED event on rejection
- ✅ **Test**: Faction added to passedFactions on rejection
- ❌ **Negative**: Bid validation failures:
  - Bid too low (< 1 or <= current bid)
  - Bid exceeds spice (without Karama)
  - Self-outbidding attempt
  - Hand full
  - Invalid bid amount (NaN, negative, etc.)

### 3.7 Pass Handling
- ✅ **Test**: Pass adds faction to passedFactions
- ✅ **Test**: BID_PASSED event is emitted
- ✅ **Test**: Atreides peek acknowledgment does NOT count as pass
- ✅ **Test**: Multiple pass action types handled (PASS, PASS_BID, passed flag)

---

## 4. RESOLUTION MODULE TESTS (`bidding/resolution.ts`)

### 4.1 Payment Processing
- ✅ **Test**: Winner pays correct amount
- ✅ **Test**: Spice is deducted from winner
- ✅ **Test**: Payment goes to Emperor if in game (Rule 2.03.04)
- ✅ **Test**: Payment goes to bank if Emperor not in game
- ✅ **Test**: Emperor does NOT receive payment when buying own card
- ✅ **Test**: Payment skipped for Karama free card
- ✅ **Test**: Payment skipped for Karama buy without paying
- ✅ **Test**: KARAMA_BUY_WITHOUT_PAYING event when payment skipped
- ❌ **Negative**: Payment attempted with insufficient spice (should not happen)

### 4.2 Karama Flag Clearing
- ✅ **Test**: karamaBiddingActive flag cleared after use
- ✅ **Test**: karamaFreeCardActive flag cleared after use
- ✅ **Test**: Both flags cleared if both were active
- ✅ **Test**: Flags persist if not used

### 4.3 Card Distribution
- ✅ **Test**: Winner receives the specific auction card (not random draw)
- ✅ **Test**: Card is added to winner's hand
- ✅ **Test**: Card location set to HAND
- ✅ **Test**: Card ownerId set to winner
- ✅ **Test**: CARD_WON event is emitted
- ✅ **Test**: CARD_PURCHASED action is logged
- ❌ **Negative**: Hand size exceeded (defensive check):
  - Card not added
  - Payment refunded
  - Card returned to deck
  - ERROR event emitted
  - SPICE_REFUNDED event emitted

### 4.4 Hand Size Validation
- ✅ **Test**: Hand size validated after card purchase
- ✅ **Test**: Hand size cannot exceed max (defensive)
- ✅ **Test**: Hand size validation uses correct max for faction

### 4.5 Harkonnen TOP CARD Ability (Rule 2.05.08)
- ✅ **Test**: Harkonnen draws free card when buying
- ✅ **Test**: Free card drawn only if hand < 8 (Harkonnen's max is 8, not 4)
- ✅ **Test**: Free card NOT drawn if hand is 7 (would exceed 8)
- ✅ **Test**: Free card NOT drawn if deck is empty
- ✅ **Test**: CARD_DRAWN_FREE event is emitted
- ✅ **Test**: Hand size validated after free card draw
- ✅ **Test**: Ability works per purchase (not just once)
- ✅ **Test**: Harkonnen can have up to 8 cards (TRAMENDOUSLY TREACHEROUS - Rule 2.05.07)
- ✅ **Test**: Harkonnen must pass when hand is 8 cards (Rule 1.04.03)
- ❌ **Negative**: Free card draw attempted when hand full (8 cards)

### 4.6 No Bidder Handling
- ✅ **Test**: No bids on card (all passed)
- ✅ **Test**: Card tracked for return to deck
- ✅ **Test**: CARD_RETURNED_TO_DECK event is emitted
- ✅ **Test**: Phase continues to next card

### 4.7 Auction Progression
- ✅ **Test**: Moves to next card after resolution
- ✅ **Test**: Starts next auction correctly
- ✅ **Test**: Ends phase when all cards auctioned
- ✅ **Test**: Handles multiple cards in sequence

---

## 5. EMPEROR MODULE TESTS (`bidding/emperor.ts`)

### 5.1 Payment to Emperor (Rule 2.03.04)
- ✅ **Test**: Emperor receives payment from other factions
- ✅ **Test**: Payment amount is correct
- ✅ **Test**: Spice added to Emperor correctly
- ✅ **Test**: Emperor does NOT receive payment when buying own card
- ✅ **Test**: Payment goes to bank if Emperor not in game
- ✅ **Test**: Multiple payments accumulate correctly
- ✅ **Test**: Full price must be paid (FAIR MARKET - Rule 2.03.05) - no discounts allowed
- ✅ **Test**: Payment occurs during "Buying A Card" (Rule 1.04.06.02)

### 5.2 Refund from Emperor
- ✅ **Test**: Refund processed when card purchase fails
- ✅ **Test**: Spice removed from Emperor correctly
- ✅ **Test**: Refund only if payment was made
- ✅ **Test**: No refund if Emperor not in game
- ✅ **Test**: No refund if winner is Emperor

---

## 6. HELPERS MODULE TESTS (`bidding/helpers.ts`)

### 6.1 canBid() Function
- ✅ **Test**: Returns true when hand not full and can afford minimum bid
- ✅ **Test**: Returns false when hand is full (4 for most, 8 for Harkonnen)
- ✅ **Test**: Returns false when cannot afford minimum bid (no Karama)
- ✅ **Test**: Returns true when cannot afford but has Karama
- ✅ **Test**: Returns true when cannot afford but has Karama free card active
- ✅ **Test**: Hand size validation called (defensive)
- ✅ **Test**: Minimum bid calculation correct (1 for opening, current+1 otherwise)
- ✅ **Test**: Correctly handles Harkonnen's max hand size of 8
- ✅ **Test**: Correctly handles other factions' max hand size of 4

### 6.2 getRemainingAuctionCards()
- ✅ **Test**: Returns all cards from current index onwards
- ✅ **Test**: Returns empty array when no remaining cards
- ✅ **Test**: Returns correct cards in order

### 6.3 returnCardsToDeckAndShuffle()
- ✅ **Test**: Cards added to deck correctly
- ✅ **Test**: Deck is shuffled after adding cards
- ✅ **Test**: Original deck cards preserved
- ✅ **Test**: Handles empty cards array
- ✅ **Test**: Handles empty deck

### 6.4 endBiddingPhase()
- ✅ **Test**: BIDDING_COMPLETE event is emitted
- ✅ **Test**: Phase marked as complete
- ✅ **Test**: Next phase set to REVIVAL
- ✅ **Test**: Active factions cleared
- ✅ **Test**: BIDDING_ENDED action is logged

### 6.5 handleBoughtIn()
- ✅ **Test**: All remaining cards returned to deck
- ✅ **Test**: Cards shuffled when returned
- ✅ **Test**: CARD_BOUGHT_IN event is emitted
- ✅ **Test**: CARDS_RETURNED_TO_DECK action is logged
- ✅ **Test**: Phase ends immediately
- ✅ **Test**: Correct card count in events

---

## 7. INTEGRATION TESTS (Main Handler Coordination)

### 7.1 Phase Flow
- ✅ **Test**: Complete phase flow: initialize → auction → bidding → resolution → next auction
- ✅ **Test**: Multiple auctions in sequence
- ✅ **Test**: Phase completes when all cards auctioned
- ✅ **Test**: Phase completes on BOUGHT-IN
- ✅ **Test**: Phase completes when no eligible bidders

### 7.2 Atreides Peek Flow
- ✅ **Test**: Peek → acknowledgment → bidding proceeds
- ✅ **Test**: Peek acknowledgment does not count as pass
- ✅ **Test**: Multiple peeks (one per auction)
- ✅ **Test**: Peek works even if Atreides not starting bidder

### 7.3 Response Processing
- ✅ **Test**: Bid responses processed correctly
- ✅ **Test**: Pass responses processed correctly
- ✅ **Test**: Multiple responses in same step
- ✅ **Test**: Invalid responses handled gracefully
- ✅ **Test**: Missing responses handled (should not occur in tests)

### 7.4 Auction Resolution Detection
- ✅ **Test**: Detects when high bidder wins (only they remain)
- ✅ **Test**: Detects when high bidder wins (all others passed)
- ✅ **Test**: Continues bidding when auction not resolved
- ✅ **Test**: Handles edge case: high bidder is only active bidder

### 7.5 Cleanup
- ✅ **Test**: Unbid cards returned to deck in cleanup
- ✅ **Test**: Cards shuffled in cleanup
- ✅ **Test**: CARDS_RETURNED_TO_DECK action logged
- ✅ **Test**: Cleanup handles empty cardsToReturnToDeck
- ✅ **Test**: Cleanup handles no unbid cards

---

## 8. EDGE CASES AND NEGATIVE TESTS

### 8.1 Edge Cases
- ✅ **Test**: Single eligible bidder (wins immediately)
- ✅ **Test**: All factions have full hands (no cards dealt)
- ✅ **Test**: Empty treachery deck at start
- ✅ **Test**: Deck becomes empty during dealing
- ✅ **Test**: Hand size changes during auction (becomes ineligible)
- ✅ **Test**: Spice changes during auction (becomes unable to bid)
- ✅ **Test**: Multiple cards, some with no bids
- ✅ **Test**: All cards passed (BOUGHT-IN on first card)
- ✅ **Test**: Starting bidder wraps around entire storm order
- ✅ **Test**: Atreides is starting bidder and peeks
- ✅ **Test**: Harkonnen with 7 cards buys card (gets to 8, then draws free card - but can't because at 8)
- ✅ **Test**: Harkonnen with 6 cards buys card (gets to 7, then draws free card to 8)
- ✅ **Test**: Harkonnen with 8 cards (must pass, cannot bid)
- ✅ **Test**: Mixed hand sizes (some at 4, Harkonnen at different levels)

### 8.2 Invalid Actions (Negative Tests)
- ❌ **Test**: Bid when hand is full (should be rejected) - 4 for most, 8 for Harkonnen
- ❌ **Test**: Bid 0 spice (should be rejected) - Rule 1.04.06.01 requires 1+ spice
- ❌ **Test**: Bid negative amount (should be rejected)
- ❌ **Test**: Bid NaN (should be rejected)
- ❌ **Test**: Bid less than current bid (should be rejected)
- ❌ **Test**: Bid equal to current bid (should be rejected)
- ❌ **Test**: Bid more than spice (without Karama, should be rejected) - Rule 1.04.06.03
- ❌ **Test**: Self-outbid (current high bidder tries to raise own bid)
- ❌ **Test**: Pass when not your turn (should be ignored or handled)
- ❌ **Test**: Invalid response action type
- ❌ **Test**: Attempt to discount price (FAIR MARKET - Rule 2.03.05) - full price must be paid
- ❌ **Test**: Harkonnen tries to bid with 8 cards (must pass per Rule 1.04.03)

### 8.3 State Corruption Prevention
- ❌ **Test**: Hand size exceeds max (defensive check prevents)
- ❌ **Test**: Negative spice (defensive check)
- ❌ **Test**: Invalid card distribution
- ❌ **Test**: Context corruption (defensive checks)

### 8.4 Race Conditions / Timing
- ✅ **Test**: Multiple rapid bids
- ✅ **Test**: Pass immediately after bid
- ✅ **Test**: Hand size changes between eligibility check and bid

---

## 9. EVENT EMISSION TESTS

### 9.1 Required Events
- ✅ **Test**: HAND_SIZE_DECLARED event (with correct data)
- ✅ **Test**: AUCTION_STARTED event (with correct data)
- ✅ **Test**: BID_PLACED event (with correct data)
- ✅ **Test**: BID_PASSED event (with correct data)
- ✅ **Test**: CARD_WON event (with correct data)
- ✅ **Test**: CARD_PURCHASED action logged
- ✅ **Test**: CARD_DRAWN_FREE event (Harkonnen)
- ✅ **Test**: KARAMA_FREE_CARD event
- ✅ **Test**: KARAMA_BUY_WITHOUT_PAYING event
- ✅ **Test**: CARD_BOUGHT_IN event
- ✅ **Test**: CARD_RETURNED_TO_DECK event
- ✅ **Test**: BIDDING_COMPLETE event
- ✅ **Test**: ERROR event (on hand size exceeded)
- ✅ **Test**: SPICE_REFUNDED event (on error)

### 9.2 Event Data Validation
- ✅ **Test**: All events have correct type
- ✅ **Test**: All events have message
- ✅ **Test**: Event data matches actual state
- ✅ **Test**: Events emitted in correct order

---

## 10. MODULE-SPECIFIC UNIT TESTS

### 10.1 Initialization Module
- ✅ **Test**: initializeBiddingPhase() returns correct structure
- ✅ **Test**: Context properly initialized
- ✅ **Test**: Handles edge cases (no cards, all hands full)

### 10.2 Auction Module
- ✅ **Test**: startNextAuction() returns correct structure
- ✅ **Test**: Eligibility checking logic
- ✅ **Test**: Starting bidder determination logic
- ✅ **Test**: Atreides peek request creation

### 10.3 Bid Processing Module
- ✅ **Test**: requestNextBid() returns correct structure
- ✅ **Test**: processBid() validates and processes correctly
- ✅ **Test**: createBidPassedEvent() creates correct event
- ✅ **Test**: BOUGHT-IN detection logic

### 10.4 Resolution Module
- ✅ **Test**: resolveAuction() handles all cases
- ✅ **Test**: Payment logic (normal, Karama, Emperor)
- ✅ **Test**: Card distribution logic
- ✅ **Test**: Harkonnen TOP CARD logic

### 10.5 Emperor Module
- ✅ **Test**: payEmperor() adds spice correctly
- ✅ **Test**: refundFromEmperor() removes spice correctly
- ✅ **Test**: Handles Emperor not in game

### 10.6 Helpers Module
- ✅ **Test**: All helper functions work independently
- ✅ **Test**: Helper functions handle edge cases
- ✅ **Test**: Helper functions maintain state correctly

---

## 11. REGRESSION TESTS (Ensure Refactoring Didn't Break)

### 11.1 Existing Scenarios
- ✅ **Test**: All 8 existing test scenarios still pass:
  1. Karama Buy Without Paying
  2. Multiple Factions Bidding War
  3. Atreides Prescience
  4. Emperor Payment
  5. Harkonnen Top Card
  6. Bought-In Rule
  7. Hand Size Changes
  8. Complex Multi-Card

### 11.2 Functionality Preservation
- ✅ **Test**: Same events emitted as before
- ✅ **Test**: Same state changes as before
- ✅ **Test**: Same agent requests as before
- ✅ **Test**: Same phase flow as before

---

## 12. PERFORMANCE AND STRESS TESTS

### 12.1 Large Scale
- ✅ **Test**: All 6 factions bidding
- ✅ **Test**: Many cards (10+ cards)
- ✅ **Test**: Long bidding wars (20+ bids)
- ✅ **Test**: Many auctions in sequence

### 12.2 Stress Cases
- ✅ **Test**: Rapid state changes
- ✅ **Test**: Maximum hand sizes
- ✅ **Test**: Maximum spice amounts
- ✅ **Test**: Edge case combinations

---

## Test Implementation Strategy

1. **Unit Tests**: Test each module function independently
2. **Integration Tests**: Test module coordination through main handler
3. **Scenario Tests**: Test complete bidding phase flows
4. **Regression Tests**: Ensure existing scenarios still pass
5. **Negative Tests**: Test invalid inputs and edge cases
6. **Event Tests**: Verify all events are emitted correctly

## Test Coverage Goals

- ✅ 100% of module functions tested
- ✅ 100% of edge cases covered
- ✅ 100% of negative scenarios tested
- ✅ 100% of events verified
- ✅ All rules from handwritten-rules/4_bidding.md covered
- ✅ All rules from dune-rules/bidding.md covered

## Rules Coverage Checklist

### Core Bidding Rules (1.04.xx)
- ✅ 1.04.01: DECLARATION - Hand size declarations
- ✅ 1.04.02: MAX HAND SIZE - 4 cards (8 for Harkonnen)
- ✅ 1.04.03: INELIGIBLE - Full hand must pass
- ✅ 1.04.04: DEALER - 1 card per eligible bidder
- ✅ 1.04.05: AUCTION - First card auctioned
- ✅ 1.04.06: BIDDING - First Player starts, procedure
- ✅ 1.04.06.01: Opening Bid - 1+ spice or pass
- ✅ 1.04.06.02: Buying A Card - Payment and distribution
- ✅ 1.04.06.03: Bid Limit - Cannot bid more than spice
- ✅ 1.04.07: NEXT STARTING BIDDER - First eligible to right
- ✅ 1.04.08: END OF BIDDING - Until all cards auctioned
- ✅ 1.04.09: BOUGHT-IN - All pass, return remaining cards
- ✅ 1.04.10: TRANSPARENCY - Hand size known upon request
- ⚠️ 1.04.06.04: Time Limit - UI/timing concern, not logic (excluded)

### Faction Abilities
- ✅ Atreides BIDDING (Rule 2.01.05) - Prescience peek
- ✅ Emperor PAYMENT FOR TREACHERY (Rule 2.03.04) - Receives payments
- ✅ Emperor FAIR MARKET (Rule 2.03.05) - Full price must be paid
- ✅ Harkonnen TRAMENDOUSLY TREACHEROUS (Rule 2.05.07) - 8 card hand
- ✅ Harkonnen TOP CARD (Rule 2.05.08) - Free card per purchase

### Special Rules
- ✅ Karama card exceptions (Rule 3.01.11) - Bid over limit, buy without paying
- ✅ Hand size validation - Defensive checks

