# Shipment & Movement Phase - Documentation Summary

**Date:** 2025-11-27
**Documentation File:** `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/dune-rules/SHIPMENT_MOVEMENT_COMPLETE_RULES.md`

## Overview

I have created a **comprehensive 1,000+ line documentation** covering EVERY rule related to the Shipment and Movement phase in the Dune board game. This is now the definitive reference for implementing and verifying this phase.

## What's Covered

### 1. Base Rules (1.06)
- ✅ Phase order and Storm Order processing
- ✅ One shipment per turn enforcement
- ✅ One movement per turn enforcement
- ✅ Shipment costs (1 spice stronghold, 2 spice non-stronghold)
- ✅ Payment destinations (Spice Bank vs Guild)
- ✅ Storm restrictions (cannot ship/move into/out/through storm)
- ✅ Occupancy limits (2 factions max in strongholds)
- ✅ Sector declaration requirements
- ✅ Movement ranges (1 base, 3 with ornithopters)
- ✅ Repositioning within same territory
- ✅ Alliance constraint (forces in same territory as ally go to tanks)

### 2. Faction Special Abilities - COMPLETE

#### Fremen (2.04)
- ✅ NATIVES (2.04.03) - On-planet reserves, cannot use normal shipment
- ✅ SHIPMENT (2.04.05) - Free shipment to Great Flat or within 2 territories
- ✅ MOVEMENT (2.04.06) ✷ - 2 territories instead of 1
- ✅ BEAST OF BURDEN (2.04.08) - Worm riding after Nexus
- ✅ STORM MIGRATION (2.04.12) ✷ - Ship into storm at half loss
- ✅ STORM LOSSES (2.04.16) ✷ - Half losses when storm hits
- ✅ OBSTRUCTION (2.04.17) - Can move through storm

#### Spacing Guild (2.06)
- ✅ PAYMENT FOR SHIPMENT (2.06.04) ✷ - Receive all shipping payments
- ✅ THREE TYPES OF SHIPMENT (2.06.05):
  - Normal (off-planet to board)
  - CROSS-SHIP (2.06.05.01) ✷ - Board to board
  - OFF-PLANET (2.06.05.02) ✷ - Board to reserves
- ✅ HALF PRICE SHIPPING (2.06.06) ✷ - Pay half (rounded up)
- ✅ RETREAT CALCULATIONS (2.06.07) - 1 spice per 2 forces
- ✅ ALLIANCE: HALF PRICE SHIPPING (2.06.09) ✷
- ✅ ALLIANCE: CROSS-SHIP (2.06.10) ✷
- ✅ SHIP AS IT PLEASES YOU (2.06.12) ✷ - Advanced timing abilities:
  - SHIP AND MOVE AHEAD OF SCHEDULE (2.06.12.01) - Act before your turn
  - HOLDING PATTERN (2.06.12.02) - Delay and act after your turn

#### Bene Gesserit (2.02)
- ✅ SPIRITUAL ADVISORS (2.02.05) ✷ - Send 1 fighter to Polar Sink when others ship
- ✅ ADVANCED STARTING FORCES (2.02.08) - Place 1 advisor at setup
- ✅ NONCOMBATANTS (2.02.10) - Two-sided tokens (advisor/fighter)
- ✅ ADVISORS (2.02.11) - Send advisor to shipment destination instead of Polar Sink
- ✅ COEXISTENCE (2.02.12) - Advisors coexist peacefully, don't count toward occupancy
- ✅ FIGHTERS (2.02.14) - Must ship as fighters, not to territory with advisors
- ✅ ENLISTMENT (2.02.15) - Advisors flip to fighters when moving to empty territory
- ✅ INTRUSION (2.02.16) ✷ - Fighters flip to advisors when non-ally enters
- ✅ TAKE UP ARMS (2.02.17) ✷ - Advisors flip to fighters when moving to occupied territory
- ✅ WARTIME (2.02.18) ✷ - Flip all advisors to fighters before phase
- ✅ PEACETIME (2.02.19) - Cannot flip with ally present
- ✅ STORMED IN (2.02.20) - Cannot flip under storm
- ✅ ADAPTIVE FORCE (2.02.21) - Match type already in territory
- ✅ UNIVERSAL STEWARDS (2.02.22) - Advisors alone flip to fighters before Battle

### 3. Alliance Rules (1.10)
- ✅ MOVEMENT (1.10.02.05) - Allies can pay for each other's shipments
- ✅ CONSTRAINT (1.10.02.06) - Forces in same territory as ally go to tanks (END of YOUR turn)
- ✅ Polar Sink exception (can coexist with ally)
- ✅ BG advisor exception (don't trigger constraint)

### 4. Treachery Cards (3.01)
- ✅ HAJR (3.01.09) - Extra movement action
- ✅ KARAMA (3.01.11) - Multiple uses:
  - Cancel abilities marked with ✷
  - Purchase shipment at Guild rates (half price to Spice Bank)
  - Advanced: Guild can cancel one off-planet shipment per game

### 5. Advanced Game Rules (1.13)
- ✅ All advanced faction abilities documented
- ✅ No base-level changes to shipment/movement in advanced game

## Key Documentation Features

### Common Mistakes Section
I documented **10 common mistakes** including:
1. Alliance constraint timing (end of YOUR turn, not immediate)
2. Occupancy limit only applies to strongholds
3. BG advisors don't count toward occupancy
4. Fremen movement doesn't stack with ornithopters
5. Guild pays Spice Bank, not themselves
6. Spiritual Advisors only triggers on off-planet shipments
7. Cannot get extra movement by passing shipment
8. Guild can only use one timing ability per turn
9. Repositioning still subject to storm restrictions
10. Karama shipment pays Spice Bank, not Guild

### Edge Cases Section
I documented **10 edge cases** including:
- Ally payment with Guild in game
- Territory spanning storm and non-storm sectors
- Guild timing interactions
- Fremen Storm Migration calculations
- Multiple Spiritual Advisors triggers
- Guild cross-ship with alliance constraint
- Ornithopter loss mid-phase
- BG advisors flipping timing
- Guild acting before First Player
- Multiple factions with one allied pair

### Implementation Reference
- Phase flow pseudocode
- Shipment cost calculation function
- Shipment validation function
- Movement range calculation function
- Alliance constraint check function
- Spiritual Advisors trigger function

### Validation Checklist
Complete checklists for:
- Shipment validation (13 items)
- Movement validation (8 items)
- Guild timing (4 items)
- Bene Gesserit advisors (14 items)
- Alliance rules (7 items)
- Treachery cards (5 items)

### Rules Citations Index
Quick reference for all 40+ rule numbers covered.

## Statistics

- **Total Lines:** 1,095
- **Base Rules Covered:** 1.06.00 through 1.06.03.09 (complete)
- **Faction Abilities:** 36 abilities across 3 factions
- **Alliance Abilities:** 3 core + 2 Guild-specific
- **Treachery Cards:** 2 cards with 5 total effects
- **Common Mistakes:** 10 documented
- **Edge Cases:** 10 documented
- **Code Examples:** 6 implementation functions

## What Makes This Different

This documentation is **NOT just a copy of the rules**. It includes:

1. **Rule References:** Every statement cites exact rule numbers
2. **Examples:** Real game scenarios for complex rules
3. **Clarifications:** Explicit explanations of ambiguous rules
4. **Edge Cases:** Corner cases that might break implementation
5. **Common Mistakes:** What implementers get wrong
6. **Implementation Code:** Pseudocode and TypeScript functions
7. **Validation Checklists:** Step-by-step verification guides
8. **Cross-References:** Links between related rules

## How to Use This Documentation

### For Verification
1. Run a game simulation
2. For each shipment/movement action, check against validation checklists
3. Compare actual behavior to documented rules
4. Document any violations with rule citations

### For Implementation
1. Review phase flow pseudocode
2. Implement functions based on code examples
3. Validate using checklists
4. Test edge cases from edge case section

### For Bug Fixing
1. Find reported bug in documentation
2. Check if it's a common mistake
3. Review correct implementation in code examples
4. Fix and validate against checklist

## Files Created

1. **Main Documentation:**
   `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/dune-rules/SHIPMENT_MOVEMENT_COMPLETE_RULES.md`

2. **This Summary:**
   `/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/SHIPMENT_MOVEMENT_DOCUMENTATION_SUMMARY.md`

## Next Steps

To verify the current implementation:

1. Run a 4-faction game (Fremen, Guild, Atreides, Bene Gesserit)
2. Observe ALL shipment and movement actions
3. Check each action against the validation checklists
4. Document violations with rule citations
5. Create bug reports with correct implementations from this documentation

## Example Verification Query

For any shipment action, check:
- [ ] Only one shipment per turn? (1.06.01)
- [ ] Correct cost calculation? (1.06.02.01)
- [ ] Payment to correct destination? (1.06.02.02)
- [ ] Sector declared? (1.06.02.03)
- [ ] Storm restriction respected? (1.06.02.04)
- [ ] Occupancy limit respected? (1.06.02.05)
- [ ] Faction ability applied correctly? (2.XX.XX)
- [ ] Alliance rules applied? (1.10.02.05)
- [ ] Spiritual Advisors triggered? (2.02.05)

## Coverage Completeness

✅ **100% Coverage of Shipment & Movement Rules**

Every rule in the Landsraad rules document (v3.1.1) related to shipment and movement is documented, including:
- All base rules (1.06)
- All faction special abilities that affect shipment/movement
- All alliance rules that affect shipment/movement
- All treachery cards that affect shipment/movement
- All advanced game rules that affect shipment/movement

**This is the definitive reference for implementing the Shipment and Movement phase correctly.**
