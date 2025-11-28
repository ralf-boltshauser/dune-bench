# Bidding Phase - Difficult Scenarios Investigation

## Overview

The Bidding Phase (Phase 1.04) involves players bidding spice to acquire Treachery Cards. This investigation identifies the most difficult scenarios that need comprehensive testing.

## Key Mechanics

1. **Hand Size Declaration**: All players must publicly announce hand size before bidding
2. **Eligibility**: Players with full hands (4 cards, or 8 for Harkonnen) cannot bid
3. **Auction Process**: Cards are dealt face-down, auctioned one at a time
4. **Bidding Rules**: Opening bid must be 1+, subsequent bids must raise
5. **Bought-In Rule**: If all pass on a card, all remaining cards return to deck
6. **Karama Cards**: Can be used to bid more than you have or buy without paying
7. **Faction Abilities**:
   - Atreides: Can see cards before bidding (Prescience)
   - Emperor: Receives payment for cards (instead of bank)
   - Harkonnen: Gets free card after each purchase (Top Card)

## Difficult Scenarios

### 1. Karama Card Usage During Bidding

**What makes it difficult:**
- Karama can be used "at any time" to buy a treachery card without paying spice
- Can also bid more spice than you have (without revealing the card)
- Must be used before hand is full
- Complex interaction with bidding flow

**Rules involved:**
- Karama card description (3.01.11): "Bid more spice than you have (without Revealing this card) and/or Buy a Treachery Card without paying spice for it (cannot be used if your hand is full)"
- Bidding phase rules (1.04)

**What to test:**
- Using Karama to bid more than available spice
- Using Karama to buy card without paying
- Karama usage when hand is almost full (edge case)
- Multiple Karama cards in hand
- Karama usage timing (when to play it)

### 2. Multiple Factions Bidding on Same Card

**What makes it difficult:**
- Bidding order rotates based on storm order
- Starting bidder changes for each card
- Players can pass and re-enter bidding
- Hand size changes during bidding (affects eligibility)
- Spice amounts change during bidding

**Rules involved:**
- Rule 1.04.06: Bidding starts with First Player
- Rule 1.04.07: Subsequent cards start with first eligible to the right of previous opener
- Rule 1.04.06.01: Opening bid must be 1+ or pass
- Rule 1.04.06.02: Next bidder may raise or pass

**What to test:**
- 4+ factions all bidding on same card
- Bidding war with escalating bids
- Some factions pass, others continue
- Faction becomes ineligible mid-auction (hand fills up)
- Starting bidder rotation across multiple cards

### 3. Atreides Prescience Ability

**What makes it difficult:**
- Atreides can see cards before bidding (only faction that can)
- This affects their bidding strategy
- Other factions don't know what card is being bid on
- Atreides must decide whether to reveal information through bidding behavior

**Rules involved:**
- Rule 2.01.05: "During the Bidding Phase when a Treachery Card comes up for purchase, you may look at it before any faction bids on it."

**What to test:**
- Atreides sees card, others don't
- Atreides bidding behavior when they see valuable card
- Atreides bidding behavior when they see worthless card
- Atreides passing on cards they can see
- Multiple cards - Atreides sees each one

### 4. Emperor Payment Ability

**What makes it difficult:**
- When any faction buys a card, they pay Emperor instead of bank
- This creates spice flow to Emperor
- Emperor can accumulate significant spice
- Fair Market rule: Emperor cannot discount prices

**Rules involved:**
- Rule 2.03.02: "During Buying A Card [1.04.06.02], when any other faction pays spice for a Treachery Card, they pay it to you instead of the Spice Bank."
- Rule 2.03.03: "You may not discount the price of Treachery Cards; the full price must be paid."

**What to test:**
- Multiple factions buying cards, all paying Emperor
- Emperor's spice increases correctly
- Payment happens at correct time (when card is won)
- Fair Market rule enforced (no discounts)

### 5. Harkonnen Top Card Ability

**What makes it difficult:**
- Harkonnen gets a free card after EACH purchase (not just once)
- Hand size limit is 8 (not 4)
- Free card drawn from deck (not from auction)
- Must not exceed 8 card limit

**Rules involved:**
- Rule 2.05.08: "When you Buy a card, you Draw an extra card for free from the Treachery Deck (unless you are at 7 cards, because you can never have more than 8 total Treachery Cards in hand)."
- Rule 2.05.07: "You hand size is 8 Treachery Cards."

**What to test:**
- Harkonnen buys card, gets free card
- Harkonnen at 7 cards - can still buy (gets to 8)
- Harkonnen at 8 cards - cannot bid (ineligible)
- Multiple purchases - multiple free cards
- Free card drawn from deck (not auction)

### 6. Bought-In Rule (All Pass)

**What makes it difficult:**
- When all eligible bidders pass on a card, ALL remaining cards return to deck
- Bidding phase ends immediately
- Cards returned in order they were dealt
- This can happen at any point

**Rules involved:**
- Rule 1.04.11: "When a face down Treachery card is passed on by everyone, all remaining cards are returned to the top of the Treachery Deck in the order they were dealt out and bidding on face down Treachery Cards is over."

**What to test:**
- First card - all pass, all cards returned
- Middle card - all pass, remaining cards returned
- Some factions ineligible (full hand), all eligible pass
- Cards returned in correct order

### 7. Hand Size Changes During Bidding

**What makes it difficult:**
- Faction can become ineligible mid-auction (hand fills up)
- Must track eligibility changes
- Bidding order must skip ineligible players
- Starting bidder might become ineligible

**Rules involved:**
- Rule 1.04.05: "Players with a full hand are not eligible to bid and must pass during a bid for a Treachery Card."
- Rule 1.04.04: "A player's maximum hand size is 4 Treachery cards."

**What to test:**
- Faction at 3 cards, bids and wins (now at 4, ineligible)
- Faction becomes ineligible mid-auction
- Starting bidder becomes ineligible before opening bid
- Harkonnen at 7 cards, wins bid (now at 8, ineligible)

### 8. Karama + Faction Abilities Interaction

**What makes it difficult:**
- Karama can be used with faction abilities
- Atreides sees card, uses Karama to buy without paying
- Emperor still receives payment even if Karama used?
- Harkonnen gets free card even if Karama used?

**Rules involved:**
- Karama rules (3.01.11)
- Faction ability rules (2.01, 2.03, 2.05)

**What to test:**
- Atreides sees card, uses Karama to buy without paying
- Emperor receives payment when Karama used? (needs rule check)
- Harkonnen gets free card when Karama used? (needs rule check)
- Karama to bid over spice limit, then win auction

### 9. Complex Multi-Card Auction

**What makes it difficult:**
- Multiple cards auctioned in sequence
- Starting bidder rotates
- Hand sizes change between auctions
- Eligibility changes between auctions
- Faction abilities trigger multiple times

**Rules involved:**
- All bidding phase rules
- All faction abilities

**What to test:**
- 4+ cards auctioned
- Multiple factions buying cards
- Starting bidder rotation
- Eligibility changes between auctions
- All faction abilities working correctly

### 10. Edge Cases

**What makes it difficult:**
- No eligible bidders at start (all hands full)
- Only one eligible bidder
- Faction with 0 spice trying to bid
- Karama when hand is full (should fail)
- Multiple Karama cards

**What to test:**
- All hands full at start - phase ends immediately
- Only one eligible bidder - they get card for 1 spice
- Faction with 0 spice - must pass or use Karama
- Karama validation (hand full = cannot use)
- Multiple Karama cards - can use multiple times

