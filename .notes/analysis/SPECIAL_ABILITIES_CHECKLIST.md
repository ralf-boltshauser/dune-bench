# Special Abilities Implementation Checklist

This document tracks the implementation and verification status of all faction special abilities in the Dune game.

**Legend:**
- ✅ = Implemented and verified
- ⚠️ = Implemented but not fully tested
- ❌ = Not implemented
- 🔄 = In progress

---

## Setup Phase (0.00)

### Atreides (2.01)
- [x] **PROPER MANAGEMENT** - Manage Spice Deck and Treachery Deck
- [x] **Starting Spice** - 10 spice
- [x] **Starting Forces** - 10 in Arrakeen, 10 in reserves

### Bene Gesserit (2.02)
- [x] **PREDICTION** - Secretly predict when another faction will win
- [x] **Starting Spice** - 5 spice
- [x] **Starting Forces** - 1 in Polar Sink, 19 in reserves
- [ ] **ADVANCED STARTING FORCES** - Place 1 advisor in any Territory (Advanced rules)

### Emperor (2.03)
- [x] **Starting Spice** - 10 spice
- [x] **Starting Forces** - 20 in reserves

### Fremen (2.04)
- [x] **Starting Spice** - 3 spice
- [x] **Starting Forces** - 10 distributed on Sietch Tabr, False Wall South, False Wall West; 10 in reserves

### Harkonnen (2.05)
- [x] **TERRIBLY TRAITOROUS** - Keep all 4 Traitor cards
- [x] **MYSTERY CARD** - Draw extra Treachery Card after setup
- [x] **Starting Spice** - 10 spice
- [x] **Starting Forces** - 10 in Carthag, 10 in reserves

### Spacing Guild (2.06)
- [x] **Starting Spice** - 5 spice
- [x] **Starting Forces** - 5 in Tuek's Sietch, 15 in reserves

---

## Storm Phase (1.01)

### Fremen (2.04)
- [ ] **STORM RULE** - Use Storm Deck instead of Battle Wheels (Turn 2+) (Advanced)
- [ ] **✷THERE'S A STORM COMING** - Secretly look at Storm Card at end of phase (Advanced)
- [ ] **STORM LOSSES** - Only half forces destroyed (rounded up) (Advanced)
- [ ] **STORM MIGRATION** - Send reserves into storm at half loss (Advanced)

### General
- [x] **Storm Order Calculation** - Based on player positions
- [x] **Initial Storm** - Two players nearest Storm Start Sector dial (Turn 1)

---

## Spice Blow & Nexus Phase (1.02)

### Atreides (2.01)
- [ ] **✷WORMSIGN** - Look at top card of Spice Deck before anyone ships

### Fremen (2.04)
- [x] **SHAI-HULUD** - Forces not devoured by sandworms
- [ ] **BEAST OF BURDEN** - Ride sandworm after Nexus, move forces (Advanced)
- [ ] **SANDWORMS** - Place additional sandworms in any sand Territory (Advanced)
- [ ] **ALLIANCE: Protect Allies** - Decide to protect (or not) allies from sandworms (Advanced)

### General
- [x] **Turn 1 Shai-Hulud** - Set aside and reshuffle (no Nexus)
- [x] **Nexus Trigger** - Shai-Hulud after Turn 1 causes Nexus
- [x] **Recursive Drawing** - Continue until Territory Card found

---

## CHOAM Charity Phase (1.03)

### Bene Gesserit (2.02)
- [x] **CHARITY** - Always receive at least 2 spice (regardless of current holdings)
- [x] **Low Threshold Bonus** - +1 extra spice when on Low Threshold (Homeworlds variant)

### General
- [x] **Eligibility** - 0 or 1 spice
- [x] **Amount** - Bring total to 2 spice (or 2+ for BG/Low Threshold)

---

## Bidding Phase (1.04)

### Atreides (2.01)
- [ ] **✷BIDDING** - Look at Treachery Card before any faction bids
- [x] **FILAMENT BOOK** - Keep written records about Treachery cards (informational)

### Emperor (2.03)
- [ ] **PAYMENT FOR TREACHERY** - Other factions pay you instead of Spice Bank
- [x] **FAIR MARKET** - Cannot discount Treachery Cards

### Harkonnen (2.05)
- [x] **TRAMENDOUSLY TREACHEROUS** - Hand size is 8 cards (not 4)
- [x] **TOP CARD** - Draw extra card for free when buying (unless at 7 cards)
- [ ] **ALLIANCE: Traitor Cards** - Use Traitor Cards in ally's battle

### General
- [x] **Hand Size Declarations** - All players announce hand size
- [x] **Eligibility** - Full hand = not eligible
- [x] **Starting Bidder** - First Player (or next eligible)
- [x] **BOUGHT-IN Rule** - All pass = return cards to deck, end bidding

---

## Revival Phase (1.05)

### Atreides (2.01)
- [x] **FREE REVIVAL** - 2 Forces
- [ ] **REAWAKEN** - Revive Kwisatz Haderach instead of leader (Advanced)

### Bene Gesserit (2.02)
- [x] **FREE REVIVAL** - 1 Force

### Emperor (2.03)
- [x] **FREE REVIVAL** - 1 Force
- [ ] **ALLIANCE: Pay for Ally Revival** - Pay for up to 3 extra ally Forces
- [ ] **SARDAUKAR REVIVAL** - Only 1 Sardaukar per Turn (Advanced)
- [ ] **SARDAUKAR TRAINING** - Treated as 1 Force in revival (Advanced)

### Fremen (2.04)
- [x] **FREE REVIVAL** - 3 Forces
- [ ] **ALLIANCE: Ally Free Revival** - Set ally's free revival to 3 (Advanced)
- [ ] **FEDAYKIN REVIVAL** - Treated as 1 Force in revival (Advanced)
- [ ] **FEDAYKIN TRAINING** - Only 1 Fedaykin per Turn (Advanced)

### Harkonnen (2.05)
- [x] **FREE REVIVAL** - 2 Forces

### Spacing Guild (2.06)
- [x] **FREE REVIVAL** - 1 Force

### General
- [x] **Simultaneous Requests** - No storm order in Revival Phase
- [x] **Additional Forces** - Ask for additional beyond free revival
- [x] **Leader Revival** - Pay leader's strength in spice

---

## Shipment & Movement Phase (1.06)

### Atreides (2.01)
- [ ] **✷WORMSIGN** - Look at top card of Spice Deck before anyone ships

### Bene Gesserit (2.02)
- [ ] **SPIRITUAL ADVISORS** - Send 1 Force to Polar Sink when others ship
- [ ] **ADVISORS** - Send advisor to same Territory instead of Polar Sink (Advanced)
- [ ] **INTRUSION** - Flip fighters to advisors when enemy enters (Advanced)
- [ ] **TAKE UP ARMS** - Flip advisors to fighters when moving into occupied Territory (Advanced)
- [ ] **WARTIME** - Flip all advisors to fighters before Shipment/Movement (Advanced)
- [ ] **ADAPTIVE FORCE** - Forces flip to match type in Territory (Advanced)
- [ ] **UNIVERSAL STEWARDS** - Advisors alone flip to fighters before Battle (Advanced)
- [ ] **ALLIANCE: Voice in Ally's Battle** - Use Voice on ally's opponent (Advanced)

### Fremen (2.04)
- [ ] **SHIPMENT** - Send reserves for free to Great Flat or within 2 territories
- [x] **MOVEMENT** - Move 2 territories instead of 1
- [ ] **STORM MIGRATION** - Send reserves into storm at half loss (Advanced)

### Spacing Guild (2.06)
- [x] **PAYMENT FOR SHIPMENT** - Other factions pay you instead of Spice Bank
- [x] **HALF PRICE SHIPPING** - Pay half price (rounded up) for own shipments
- [x] **SHIP AS IT PLEASES YOU** - Act out of storm order (both shipment and movement)
- [ ] **CROSS-SHIP** - Ship from any Territory to any other Territory (Advanced)
- [ ] **OFF-PLANET** - Ship from board back to reserves (Advanced)
- [ ] **RETREAT CALCULATIONS** - 1 spice per 2 Forces when retreating (Advanced)
- [ ] **ALLIANCE: Half Price Shipping** - Ally pays half price (Advanced)
- [ ] **ALLIANCE: Cross-Ship** - Ally can use Cross-Ship (Advanced)

### General
- [x] **One Shipment Per Turn** - Enforced
- [x] **One Movement Per Turn** - Enforced
- [x] **Ornithopters** - 3 territories if in Arrakeen/Carthag
- [x] **Storm Restrictions** - Cannot ship/move into/through storm
- [x] **Occupancy Limits** - 2 factions max in strongholds
- [x] **Alliance Constraint** - Forces in same Territory as ally go to tanks

---

## Battle Phase (1.07)

### Atreides (2.01)
- [ ] **PRESCIENCE** - Force opponent to reveal one Battle Plan element
- [ ] **✷KWISATZ HADERACH** - Add +2 to leader strength (once per Turn) (Advanced)
- [ ] **ATREIDES LOYALTY** - Leader with Kwisatz Haderach cannot turn traitor (Advanced)
- [ ] **PROPHECY BLINDED** - Kwisatz Haderach only killed by lasgun/shield (Advanced)
- [ ] **ALLIANCE: Prescience** - Use Prescience in ally's battle

### Bene Gesserit (2.02)
- [ ] **VOICE** - Command opponent to play/not play specific cards
- [ ] **ALLIANCE: Voice** - Use Voice in ally's battle

### Emperor (2.03)
- [ ] **SARDAUKAR** - Elite forces worth 2 Forces in battle (except vs Fremen) (Advanced)
- [ ] **SARDAUKAR WEAKNESS** - Worth 1 Force vs Fremen (Advanced)

### Fremen (2.04)
- [ ] **FEDAYKIN** - Elite forces worth 2 Forces in battle (Advanced)
- [ ] **✷BATTLE HARDENED** - Forces don't need spice for full strength (Advanced)

### Harkonnen (2.05)
- [x] **TRAITORS** - All 4 Traitor cards can be used
- [ ] **CAPTURED LEADERS** - Capture or kill leader after winning battle (Advanced)
- [ ] **PRISON BREAK** - Return captured leaders when all own leaders killed (Advanced)
- [ ] **NO LOYALTY** - Captured leader can be called traitor (Advanced)
- [ ] **ALLIANCE: Traitor Cards** - Use Traitor Cards in ally's battle

### General
- [x] **Battle Resolution** - Higher total wins
- [x] **Traitor Calling** - Call traitor to win battle
- [x] **Leader Return** - Collect leaders after battles
- [ ] **Lasgun/Shield Explosion** - Both lose if both played

---

## Spice Collection Phase (1.08)

### General
- [x] **Collection Rate** - 2 spice per Force
- [x] **City Bonus** - 3 spice per Force if in Arrakeen/Carthag
- [ ] **Advanced: Tuek's Sietch Bonus** - 1 spice per Force (Advanced)
- [ ] **Advanced: City Income** - 2 spice per city occupied (Advanced)

---

## Mentat Pause Phase (1.09)

### Atreides (2.01)
- [ ] **THE SLEEPER HAS AWAKENED** - Track Force losses, activate at 7+ (Advanced)

### Fremen (2.04)
- [x] **FREMEN SPECIAL VICTORY** - Win if conditions met (Guild in game, no winner)
- [x] **ALLIANCE: Fremen Victory** - Allies win with Fremen

### Spacing Guild (2.06)
- [x] **SPACING GUILD SPECIAL VICTORY** - Win if no winner by end of game
- [x] **ALLIANCE: Guild Victory** - Allies win with Guild

### General
- [x] **Stronghold Victory** - 3 strongholds (unallied) or 4 (allied)
- [x] **Default Victory** - Most strongholds if no winner
- [x] **Bribe Collection** - Collect spice from in front of shield

---

## Alliance Abilities (1.10)

### General Alliance Rules
- [x] **Victory Condition** - 4 strongholds for alliance
- [x] **Alliance Constraint** - Forces in same Territory as ally go to tanks
- [ ] **Bidding Help** - Allies can pay for each other's Treachery Cards
- [ ] **Movement Help** - Allies can pay for each other's shipments

### Emperor (2.03)
- [ ] **Give Spice to Ally** - Transfer spice to ally at any time
- [ ] **Pay for Ally Revival** - Pay for up to 3 extra ally Forces

### Fremen (2.04)
- [x] **Allies Win with Fremen** - When Fremen wins special victory
- [ ] **Protect Allies from Sandworms** - Decide to protect (or not) (Advanced)
- [ ] **Set Ally Free Revival** - Set ally's free revival to 3 (Advanced)

### Spacing Guild (2.06)
- [x] **Allies Win with Guild** - When Guild wins special victory
- [ ] **Ally Half Price Shipping** - Ally pays half price (Advanced)
- [ ] **Ally Cross-Ship** - Ally can use Cross-Ship (Advanced)

### Atreides (2.01)
- [ ] **Prescience in Ally's Battle** - Use Prescience on ally's opponent

### Bene Gesserit (2.02)
- [ ] **Voice in Ally's Battle** - Use Voice on ally's opponent

### Harkonnen (2.05)
- [ ] **Traitor Cards in Ally's Battle** - Use Traitor Cards on ally's opponent

---

## Treachery Card Abilities

### Karama (3.01.11)
- [ ] **Cancel Ability** - Cancel one use of ✷ ability
- [ ] **Prevent Ability** - Prevent one use of ✷✷ ability
- [ ] **Guild Rates** - Purchase shipment at half price
- [ ] **Bid More Than You Have** - Bid without revealing card
- [ ] **Buy Without Paying** - Buy card without paying spice
- [ ] **Faction Karama Powers** - Use once-per-game faction power (Advanced)

### Hajr (3.01.10)
- [ ] **Extra Movement** - Gain extra Force movement action

### Tleilaxu Ghola (3.01.28)
- [ ] **Extra Revival** - Revive 1 leader or up to 5 Forces for free

### Truthtrance (3.01.30)
- [ ] **Ask Yes/No Question** - Publicly ask one player a question

### Family Atomics (3.01.07)
- [ ] **Destroy Shield Wall** - Destroy all Forces on Shield Wall
- [ ] **Remove Storm Protection** - Imperial Basin, Arrakeen, Carthag no longer protected

### Cheap Hero (3.01.04)
- [x] **Play as Leader** - Play as leader with 0 strength when no leaders available

---

## Advanced Game Abilities (1.13)

### Atreides (2.01)
- [ ] **KWISATZ HADERACH** - +2 to leader strength (once per Turn)
- [ ] **THE SLEEPER HAS AWAKENED** - Track losses, activate at 7+
- [ ] **ATREIDES LOYALTY** - Leader with KH cannot turn traitor
- [ ] **PROPHECY BLINDED** - KH only killed by lasgun/shield
- [ ] **REAWAKEN** - Revive KH instead of leader
- [ ] **ASCENSION** - KH doesn't prevent leader revival

### Bene Gesserit (2.02)
- [ ] **ADVISORS** - Send advisor to same Territory as shipment
- [ ] **INTRUSION** - Flip fighters to advisors
- [ ] **TAKE UP ARMS** - Flip advisors to fighters
- [ ] **WARTIME** - Flip all advisors to fighters
- [ ] **ADAPTIVE FORCE** - Forces flip to match type
- [ ] **UNIVERSAL STEWARDS** - Advisors alone flip to fighters
- [ ] **KARAMA** - Use worthless cards as Karama

### Emperor (2.03)
- [ ] **SARDAUKAR** - Elite forces worth 2 Forces (except vs Fremen)
- [ ] **SARDAUKAR WEAKNESS** - Worth 1 Force vs Fremen
- [ ] **SARDAUKAR REVIVAL** - Treated as 1 Force
- [ ] **SARDAUKAR TRAINING** - Only 1 per Turn

### Fremen (2.04)
- [ ] **STORM RULE** - Use Storm Deck (Turn 2+)
- [ ] **THERE'S A STORM COMING** - Look at Storm Card
- [ ] **STORM LOSSES** - Half forces destroyed (rounded up)
- [ ] **STORM MIGRATION** - Send into storm at half loss
- [ ] **FEDAYKIN** - Elite forces worth 2 Forces
- [ ] **FEDAYKIN REVIVAL** - Treated as 1 Force
- [ ] **FEDAYKIN TRAINING** - Only 1 per Turn
- [ ] **BATTLE HARDENED** - Forces don't need spice for full strength
- [ ] **BEAST OF BURDEN** - Ride sandworm after Nexus
- [ ] **SANDWORMS** - Place additional sandworms
- [ ] **ALLIANCE: Protect Allies** - Protect (or not) from sandworms
- [ ] **ALLIANCE: Set Ally Revival** - Set ally's free revival to 3

### Harkonnen (2.05)
- [ ] **CAPTURED LEADERS** - Capture or kill leader after battle
- [ ] **PRISON BREAK** - Return captured leaders
- [ ] **TYING UP LOOSE ENDS** - Killed captured leaders go to tanks
- [ ] **NO LOYALTY** - Captured leader can be traitor

### Spacing Guild (2.06)
- [ ] **CROSS-SHIP** - Ship from any Territory to any other
- [ ] **OFF-PLANET** - Ship from board back to reserves
- [ ] **RETREAT CALCULATIONS** - 1 spice per 2 Forces when retreating
- [ ] **ALLIANCE: Half Price Shipping** - Ally pays half price
- [ ] **ALLIANCE: Cross-Ship** - Ally can use Cross-Ship

---

## Faction Karama Powers (1.14) - Advanced Game

- [ ] **Atreides** - Look at any player's entire Battle Plan
- [ ] **Emperor** - Revive up to 3 Forces or 1 leader for free
- [ ] **Fremen** - Place sandworm token in any sand Territory
- [ ] **Harkonnen** - Take entire hand of another player
- [ ] **Spacing Guild** - Cancel one off-planet shipment
- [ ] **Bene Gesserit** - Use worthless cards as Karama (no limit)

---

## Summary Statistics

**Total Abilities:** ~150+
**Implemented:** ~30
**Verified:** ~15
**Remaining:** ~120+

---

## Notes

- ✷ indicates ability can be cancelled by Karama card
- Advanced abilities marked with "(Advanced)"
- Alliance abilities marked with "ALLIANCE:"
- Some abilities are informational only (e.g., FILAMENT BOOK)
- Victory conditions are implemented but may need testing

---

## Testing Priority

1. **High Priority** - Core gameplay abilities
   - Spacing Guild timing ✅
   - Fremen movement ✅
   - Ornithopters ✅
   - Alliance constraint ✅
   - Bidding phase rules ✅

2. **Medium Priority** - Faction-defining abilities
   - Atreides Prescience
   - Bene Gesserit Voice
   - Harkonnen Traitors
   - Emperor Payment for Treachery
   - Fremen Special Shipment

3. **Low Priority** - Advanced game and edge cases
   - All Advanced abilities
   - Karama powers
   - Complex alliance interactions

---

*Last Updated: After Spacing Guild timing implementation*

