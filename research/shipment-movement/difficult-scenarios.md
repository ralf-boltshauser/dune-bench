# Shipment & Movement Phase - Difficult Scenarios

## Overview

This document identifies the complex scenarios and edge cases that need comprehensive testing in the Shipment & Movement phase.

## Key Difficulties

### 1. Extra Movement Cards (HAJR)

**What makes it difficult:**
- HAJR grants an extra movement action during the movement phase
- Can be used to move the same group twice OR different groups
- Must be played during FORCE MOVEMENT [1.06.05]
- Discards after use
- Overrides the normal "one movement per turn" rule

**Rules involved:**
- Rule 3.01.09: HAJR card grants extra movement action
- Rule 1.06.05: Force Movement phase
- Normal movement rules still apply (storm, occupancy, ornithopters)

**What to test:**
- Playing HAJR to move same group twice
- Playing HAJR to move different groups
- HAJR with ornithopter access
- HAJR with Fremen (2-territory movement)
- HAJR with storm restrictions
- HAJR timing (must be during movement, not shipment)

### 2. Fremen Abilities

**What makes it difficult:**
- **Free Shipment**: Can send reserves for free to Great Flat or within 2 territories (subject to storm/occupancy)
- **2-Territory Movement**: Base movement is 2 territories (not 1)
- **Storm Migration**: Can send reserves into storm at half loss
- **No Off-Planet Reserves**: Reserves are on-planet, different from other factions

**Rules involved:**
- Rule 2.04.01-2.04.21: Fremen faction abilities
- Rule 1.06.03: Shipment phase
- Rule 1.06.05: Movement phase

**What to test:**
- Free shipment to Great Flat
- Free shipment within 2 territories of Great Flat
- 2-territory movement (without ornithopters)
- 2-territory movement with ornithopters (should be 3?)
- Storm migration (half loss calculation)
- Storm restrictions on shipment
- Occupancy limits on shipment

### 3. Spacing Guild Abilities

**What makes it difficult:**
- **Act Out of Order**: Can act before/after any faction (SHIP AS IT PLEASES YOU)
- **Cross-Ship**: Move forces between territories (not normal shipment)
- **Off-Planet Shipment**: Ship forces from board back to reserves
- **Half-Price Shipping**: Pay half normal cost (rounded up)
- **Receive Payment**: Other factions pay Guild instead of bank

**Rules involved:**
- Rule 2.06.12: SHIP AS IT PLEASES YOU
- Rule 2.06.05.01: CROSS-SHIP
- Rule 2.06.05.02: OFF-PLANET
- Rule 2.06.06: HALF PRICE SHIPPING
- Rule 2.06.04: PAYMENT FOR SHIPMENT

**What to test:**
- Guild acting first (before storm order)
- Guild acting in middle of phase
- Guild acting last (delaying)
- Cross-ship between territories
- Off-planet shipment (board to reserves)
- Half-price calculation (rounded up)
- Guild receiving payment from other factions
- Alliance benefits (ally gets half-price, cross-ship)

### 4. Bene Gesserit Spiritual Advisors

**What makes it difficult:**
- **Spiritual Advisors**: When another faction ships, BG can send 1 force for free to Polar Sink OR to same territory as shipment
- **Advisor vs Fighter**: Advisors coexist, fighters don't
- **Timing**: Must happen when another faction ships

**Rules involved:**
- Rule 2.02.05: SPIRITUAL ADVISORS
- Rule 2.02.11: ADVISORS (coexistence rules)

**What to test:**
- BG advisor to Polar Sink when faction ships
- BG advisor to same territory as shipment
- Advisor vs fighter distinction
- Multiple shipments triggering multiple advisors
- Advisor placement restrictions

### 5. Ornithopter Access

**What makes it difficult:**
- **Determined at Phase Start**: Ornithopter access is based on forces in Arrakeen/Carthag at the START of the phase
- **Not Dynamic**: Shipping into Arrakeen/Carthag during the phase doesn't grant ornithopters
- **3-Territory Movement**: With ornithopters, can move through up to 3 adjacent territories

**Rules involved:**
- Rule 1.06.05: Movement phase
- Ornithopter rules (forces in Arrakeen/Carthag)

**What to test:**
- Ornithopter access determined at phase start
- Shipping into Arrakeen/Carthag doesn't grant ornithopters
- 3-territory movement with ornithopters
- 1-territory movement without ornithopters
- Fremen with ornithopters (2 base + ornithopters = ?)

### 6. Storm Restrictions

**What makes it difficult:**
- **Cannot Ship Into Storm**: No shipment into storm sectors
- **Cannot Move Through Storm**: Forces cannot move through storm sectors
- **Multi-Sector Territories**: Can move into/out of territory if avoiding storm sectors
- **Polar Sink**: Never in storm (safe haven)

**Rules involved:**
- Rule 1.06.03: Shipment restrictions
- Rule 1.06.05: Movement restrictions
- Storm phase rules

**What to test:**
- Shipment blocked by storm
- Movement blocked by storm
- Multi-sector territory movement (avoiding storm)
- Polar Sink always accessible
- Fremen storm migration (half loss)

### 7. Occupancy Limits

**What makes it difficult:**
- **Stronghold Limit**: Cannot ship/move into stronghold with 2+ other factions
- **Alliance Exception**: Allies don't count toward limit
- **Applies to Both**: Both shipment and movement

**Rules involved:**
- Rule 2.02.11: Occupancy limit
- Rule 2.02.20: Movement occupancy limit

**What to test:**
- Shipment blocked by occupancy
- Movement blocked by occupancy
- Alliance forces don't count
- Multiple factions in stronghold

### 8. Alliance Constraints

**What makes it difficult:**
- **After Each Faction**: Alliance constraint applied after each faction completes (ship + move)
- **Tleilaxu Tanks**: Forces in same territory as ally (except Polar Sink) go to tanks
- **Timing**: Applied immediately after faction's actions

**Rules involved:**
- Rule 1.06.03.08: Alliance constraint

**What to test:**
- Forces sent to tanks after faction completes
- Polar Sink exception
- Multiple territories with allies
- Forces moved into ally territory during movement

### 9. Complex Movement Scenarios

**What makes it difficult:**
- **Repositioning**: Moving within same territory (different sector)
- **Multi-Group Movement**: Moving multiple groups from same territory
- **Path Planning**: 3-territory movement with ornithopters
- **Storm Avoidance**: Planning routes around storm

**What to test:**
- Repositioning within territory
- Multiple groups from same territory
- Complex 3-territory paths
- Storm avoidance routing
- Combining shipment and movement strategically

### 10. Sequential Processing

**What makes it difficult:**
- **Per-Faction Sequential**: Each faction does ship THEN move before next faction
- **Not Sub-Phases**: Not all factions ship, then all move
- **Guild Interruption**: Guild can interrupt at any point

**Rules involved:**
- Rule 1.06.12.01: Sequential processing

**What to test:**
- Faction 1: Ship → Move
- Faction 2: Ship → Move
- Guild interrupting between factions
- Alliance constraint after each faction

