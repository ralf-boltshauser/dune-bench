# Spice Blow Phase - Difficult Scenarios Investigation

## Overview

The Spice Blow phase involves:
- Drawing spice cards from two separate decks (A and B in advanced rules)
- Placing spice on territories (unless in storm)
- Handling Shai-Hulud (sandworm) appearances
- Devouring forces and spice
- Triggering Nexus for alliance negotiations
- Special Turn 1 rules
- Multiple faction abilities

## Difficult Scenarios Identified

### 1. Turn 1 Special Rules
**What makes it difficult:**
- Shai-Hulud cards are set aside (not discarded) on Turn 1
- No Nexus can occur on Turn 1
- Worms are reshuffled back into both decks after phase
- Must continue drawing until Territory Card appears

**Rules involved:**
- Rule 1.02.02: FIRST TURN - Shai-Hulud cards ignored, set aside, reshuffled
- Rule 1.02.03: NO NEXUS on Turn 1

**What to test:**
- Multiple worms on Turn 1
- Worms set aside correctly
- No Nexus triggered
- Worms reshuffled into both decks A and B

### 2. Multiple Worms in Sequence
**What makes it difficult:**
- Each worm devours at location of topmost Territory Card in its discard pile
- Must continue drawing until Territory Card appears
- Each worm increments worm count
- Shield Wall destruction at 4+ worms (variant)

**Rules involved:**
- Rule 1.02.05: Continue discarding until Territory Card appears
- Worm devouring uses topmost Territory Card in discard pile (not last spice location)

**What to test:**
- 2-3 worms in a row
- Each worm devours at correct location
- Forces and spice destroyed correctly
- Shield Wall destruction (if variant enabled)

### 3. Fremen Worm Immunity
**What makes it difficult:**
- Fremen forces are immune to worm devouring
- Different from storm (Fremen are NOT immune to storm)
- Leaders can be protected (surviving leaders)

**Rules involved:**
- Rule 2.04.07: SHAI-HULUD - Fremen forces not devoured

**What to test:**
- Fremen forces in territory with worm
- Other factions devoured, Fremen safe
- Protected leaders survive

### 4. Fremen Ally Protection Decision
**What makes it difficult:**
- Fremen can choose to protect or allow ally to be devoured
- Decision happens BEFORE devouring
- Only applies if ally has forces in territory

**Rules involved:**
- Rule 2.04.16: ALLIANCE - Fremen may protect allies from sandworms

**What to test:**
- Fremen with ally, ally has forces in territory
- Fremen chooses to protect
- Fremen chooses to allow devouring
- Multiple allies (shouldn't happen, but test edge case)

### 5. Fremen Worm Riding Choice
**What makes it difficult:**
- Happens AFTER Territory Card placed, BEFORE Nexus
- Fremen can choose to ride or let devour
- If ride, movement happens after Nexus

**Rules involved:**
- Rule 2.04.08: BEAST OF BURDEN - Ride sandworm after Nexus

**What to test:**
- Fremen chooses to ride
- Fremen chooses to let devour
- Movement happens after Nexus (separate phase)

### 6. Spice in Storm
**What makes it difficult:**
- Spice not placed if sector in storm
- Card still discarded
- No spice placed event

**Rules involved:**
- Rule 1.02.04: If Spice Blow icon in storm, no spice placed

**What to test:**
- Territory card with sector in storm
- No spice placed
- Card discarded correctly

### 7. Two-Pile System (Advanced Rules)
**What makes it difficult:**
- Deck A and Deck B are separate
- Each has its own discard pile
- Worm on pile A devours at location from pile A's discard
- Worm on pile B devours at location from pile B's discard

**Rules involved:**
- Advanced Rules: Double Spice Blow
- Two separate discard piles

**What to test:**
- Card A and Card B both revealed
- Worm on pile A uses pile A discard
- Worm on pile B uses pile B discard
- Independent tracking

### 8. Nexus Alliance Negotiations
**What makes it difficult:**
- All factions act in storm order
- Can form or break alliances
- Only one alliance per faction
- Must be transparent

**Rules involved:**
- Rule 1.02.06: Nexus - Alliances can be formed/broken
- Alliance rules from handwritten rules

**What to test:**
- Multiple factions form alliances
- Breaking existing alliances
- Passing (no action)
- Storm order respected

### 9. Protected Leaders
**What makes it difficult:**
- Leaders who survive battle are protected
- Protected from worms, storms, explosions
- Must check for protected leaders in territory

**Rules involved:**
- Battle rules: Surviving leaders protected

**What to test:**
- Protected leader in territory with worm
- Leader survives, forces devoured
- Multiple protected leaders

### 10. Multiple Factions in Territory
**What makes it difficult:**
- Multiple factions can have forces in same territory
- Each faction's forces handled separately
- Fremen immunity applies only to Fremen
- Protected allies handled separately

**Rules involved:**
- Rule 1.02.05: Destroy all forces in territory

**What to test:**
- 3+ factions in territory
- Fremen immune, others devoured
- Protected ally survives
- Spice destroyed

### 11. No Territory Card in Discard
**What makes it difficult:**
- First worm might appear before any Territory Card
- Fallback to lastSpiceLocation
- Edge case handling

**Rules involved:**
- Rule 1.02.05: Topmost Territory Card in discard pile

**What to test:**
- Worm appears first (no Territory Card in discard)
- Uses fallback location
- Subsequent worms use correct location

### 12. Fremen Additional Worm Placement (Advanced)
**What makes it difficult:**
- Fremen can place additional worms after first
- Any sand territory
- Devours all forces except Fremen

**Rules involved:**
- Rule 2.04.15: SANDWORMS - Place additional worms

**What to test:**
- Multiple worms, Fremen places additional
- Placement in chosen territory
- Forces devoured correctly

