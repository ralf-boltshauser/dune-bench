# SHIPMENT AND MOVEMENT PHASE - COMPLETE RULES REFERENCE

**Version:** Complete - Based on Landsraad Rules (Updated)
**Purpose:** Definitive reference for implementing Shipment & Movement Phase correctly
**Last Updated:** 2025-11-27

---

## TABLE OF CONTENTS

1. [Phase Overview](#phase-overview)
2. [Phase Flow and Storm Order](#phase-flow-and-storm-order)
3. [Base Shipment Rules](#base-shipment-rules)
4. [Base Movement Rules](#base-movement-rules)
5. [Faction Special Abilities](#faction-special-abilities)
6. [Alliance Rules](#alliance-rules)
7. [Treachery Cards](#treachery-cards)
8. [Advanced Game Rules](#advanced-game-rules)
9. [Edge Cases and Clarifications](#edge-cases-and-clarifications)
10. [Common Mistakes](#common-mistakes)
11. [Implementation Checklist](#implementation-checklist)

---

## PHASE OVERVIEW

**Rule Reference:** 1.06
**Phase Position:** Sixth phase of each turn
**Purpose:** Players ship forces from reserves onto the board and/or move forces already on the board

### Key Principles

1. Each player gets **ONE shipment action** per turn (1.06.01)
2. Each player gets **ONE movement action** per turn (1.06.03.01)
3. Actions proceed in **Storm Order** (1.06.00)
4. **Spacing Guild can interrupt** normal storm order (2.06.12)
5. Players can **ship OR move OR both** (each once)
6. Allies can pay for each other's shipments (1.10.02.05)

---

## PHASE FLOW AND STORM ORDER

### Rule 1.06.00 - Phase Execution Order

> "The First Player conducts their Force Shipment action and then Force Movement action. Play proceeds in Storm Order until all players have completed this Phase or indicated they will not use their actions." -2.06.12.01 -3.03.05.02 -3.03.05.03

**Normal Flow:**
1. First Player (determined by Storm Phase) acts
2. Each player in Storm Order:
   - Announces and executes their shipment action (or passes)
   - Announces and executes their movement action (or passes)
3. Continue until all players have acted or passed

**Spacing Guild Exception:**
- Guild can use "SHIP AS IT PLEASES YOU" ability (2.06.12)
- Can act **before** or **after** their normal storm order position
- See [Spacing Guild Timing](#spacing-guild-timing) for details

### First Player Definition

**Rule Reference:** Glossary - "First Player"

> "The player whose Player Marker the Storm next approaches counterclockwise is the First Player for the Storm Phase, Bidding Phase, Shipment and Movement Phase, Battle Phase, and Mentat Pause Phase."

---

## BASE SHIPMENT RULES

### Rule 1.06.01 - ONE FORCE SHIPMENT

> "Each player may make only one Force Shipment action per Turn."

**Critical:** This is ONE shipment action total, not one per territory or one per type.

### Rule 1.06.02 - Shipment of Reserves

> "A player with off-planet reserves may use one shipment action to Ship any number of Forces from their reserves to any one Territory on the board." -1.14.05 +2.06.05 +2.06.09

**Key Points:**
- Any number of forces
- To exactly ONE territory
- From off-planet reserves only
- Cannot ship forces from board back to reserves (except Guild - see 2.06.05.02)

### Rule 1.06.02.01 - COST

> "The cost of shipping off-planet reserves is 1 spice per Force shipped into any Stronghold and 2 spice per Force shipped into any Non-Stronghold Territory." -2.06.06 -2.06.09 -3.01.11.03

**Base Costs:**
- **Stronghold:** 1 spice per force
- **Non-Stronghold:** 2 spice per force

**Modifications:**
- **Spacing Guild:** Pays half price (rounded up) - see 2.06.06
- **Guild Ally:** Pays half price (rounded up) - see 2.06.09
- **Karama Card:** Can purchase at Guild rates (half price) - see 3.01.11.03
- **Fremen:** Ships for FREE to specific territories - see 2.04.05

### Rule 1.06.02.02 - PAYMENT

> "All spice paid for Shipment is Placed in the Spice Bank." -2.06.04

**Exception:**

> "PAYMENT FOR SHIPMENT: When another faction ships Forces onto Dune, they pay the spice to you instead of to the Spice Bank.✷" -2.06.04 (Spacing Guild ability)

**Payment Destination:**
- **No Guild in game:** Pay to Spice Bank
- **Guild in game:** Pay to Guild player (unless it's Guild shipping)
- **Guild shipping:** Pay to Spice Bank (at half price)

### Rule 1.06.02.03 - SECTORS

> "When shipping into a Territory lying in several Sectors, a player must make clear in which Sector of the Territory they choose to leave their Forces."

**Important:** Forces must be placed in a specific sector of multi-sector territories.

### Rule 1.06.02.04 - RESTRICTION (Storm)

> "No player may Ship into or out of a Sector in Storm." -2.04.17

**Storm Rule Reference (1.01.03):**

> "OBSTRUCTION: Forces may not Ship/Send/Move into, out of, or through a Sector in Storm."

**Fremen Exception:** Can ship into storm with half loss (2.04.17)

### Rule 1.06.02.05 - OCCUPANCY LIMIT

> "No player may Ship into a stronghold already occupied by two other player's Forces." -2.02.11

**Clarification:**
- Strongholds can have at most **3 factions** total
- If 2 factions already present, 3rd faction can ship in
- If 2 factions already present, NO 4th faction can ship in
- Non-strongholds have NO occupancy limit

**Bene Gesserit Advisors Exception:**
- Advisors don't count toward occupancy limit (2.02.12)
- Other factions treat territory as if advisors aren't there

### Rule 1.06.02.06 - Restriction (No Return Shipment)

> "No player may ship Forces from the board back to their reserves." -2.06.05.02

**Spacing Guild Exception:**
- Guild can use OFF-PLANET shipment type (2.06.05.02)
- Ships forces from board back to reserves
- Cost: 1 spice per 2 forces (2.06.07)

---

## BASE MOVEMENT RULES

### Rule 1.06.03 - FORCE MOVEMENT

> "Each player may Move, as a group, any number of their Forces from one Territory into one other Territory. Unless separated by Storm, that player may Move groups of Forces from different Sectors of the same Territory."

**Key Points:**
- ONE movement action per turn
- Move ANY NUMBER of forces
- From ONE territory to ONE other territory
- Can combine forces from different sectors of same territory (unless separated by storm)

### Rule 1.06.03.01 - ONE FORCE MOVE

> "Each player may make only one Force movement action per Turn." -3.01.09 -3.03.11.02

**Exception:**

> "HAJR: Special-Movement - Play during FORCE MOVEMENT [1.06.05]. You gain an extra Force movement action subject to normal movement rules." -3.01.10

### Rule 1.06.03.02 - ONE ADJACENT TERRITORY

> "A player without a Force in either Arrakeen or Carthag at the start of their movement can only Move their Forces to one adjacent Territory." -2.04.06 -3.03.11.01

**Base Movement:** 1 adjacent territory

**Fremen Exception:**

> "MOVEMENT: During movement you may Move your Forces two territories instead of one.✷" -2.04.06

Fremen always move 2 territories (unless Karama cancels)

### Rule 1.06.03.03 - ORNITHOPTERS

> "A player who starts a force move with one or more Forces in either Arrakeen, Carthag, or both, has access to ornithopters and may Move Forces through up to three adjacent territories. The Forces moved do not have to be in Arrakeen or Carthag to make the three Territory Move."

**Ornithopter Requirements:**
- Must have at least 1 force in Arrakeen OR Carthag (or both)
- Check at START of movement phase
- Forces being moved DON'T need to be in those cities

**Ornithopter Movement:**
- Move through **up to 3** adjacent territories
- Still subject to storm restrictions
- Still subject to occupancy limits

**Example:**

> "Thus, for example, a player with one or more Forces in Arrakeen would be able to move Forces starting in Tuek's Sietch through Pasty Mesa and Shield Wall to the Imperial Basin, where they must stop."

**Fremen + Ornithopters:**
- Fremen base movement: 2 territories
- With ornithopters: 3 territories (ornithopters override Fremen's 2-territory movement)
- Fremen benefit: Can move 2 territories WITHOUT needing ornithopters

### Rule 1.06.03.04 - SECTORS

> "Sectors have no effect on movement. Forces can Move into or through a Territory ignoring all Sectors. A Sector's only function is to regulate the movement and coverage of the storm and spice collection."

**Key:** Sectors only matter for storm and spice collection, NOT for movement distance.

### Rule 1.06.03.05 - STORM

> "As defined above in the Storm Phase section, no Force may Move into, out of, or through a Sector in storm."

> "Many territories occupy several Sectors, so that a player may Move into and out of a Territory that is partly in the storm, so long as the group does not pass through the part covered by the storm."

> "When ending a Move in a Territory lying in several Sectors, a player must make clear in which Sector of the Territory they choose to leave their Forces."

**Storm Movement Rules:**
- Cannot move INTO storm sector
- Cannot move OUT OF storm sector
- Cannot move THROUGH storm sector
- CAN move into/out of multi-sector territory if staying out of storm sectors

**Fremen Exception:**

> "OBSTRUCTION: Forces may not Ship/Send/Move into, out of, or through a Sector in Storm. -2.04.17"

The -2.04.17 notation indicates Fremen CAN move through storm (their ability supersedes the base rule).

### Rule 1.06.03.06 - Occupancy Limit

> "Like Shipment, Forces can not be moved into or through a Stronghold if Forces of two other players are already there." -2.02.20

**Key:** Cannot move THROUGH a stronghold with 2+ other factions.

**Bene Gesserit Exception:**

> "STORMED IN: Advisors can not flip to fighters under storm." -2.02.20

The -2.02.20 reference indicates advisors can move through full strongholds.

### Rule 1.06.03.07 - SAFE HAVEN

> "The Polar Sink is never in storm."

**Always safe** to move to/through Polar Sink.

### Rule 1.06.03.08 - CONSTRAINT (Alliance)

> "At the end of your Shipment and Movement actions, Place all your Forces that are in the same Territory (except the Polar Sink) as your Ally's Forces in the Tleilaxu Tanks." -2.02.12

**Critical Alliance Rule:**
- Checked at END of YOUR actions
- All forces in same territory as ally → Tanks
- Applies to ALL territories except Polar Sink
- Applies regardless of sector (same territory = go to tanks)

**Bene Gesserit Advisors Exception:**
- Advisors coexist with all forces (2.02.12)
- Allies' forces don't trigger advisor removal
- Advisors don't trigger ally force removal

### Rule 1.06.03.09 - Repositioning

> "A player may use their movement action to reposition their Forces to relocate to a different Sector within the same Territory. Storm limitations still apply."

**Repositioning:**
- Move forces to different sector of SAME territory
- Uses your ONE movement action
- Storm restrictions apply (can't reposition INTO storm sector)

---

## FACTION SPECIAL ABILITIES

### FREMEN

#### 2.04.03 - NATIVES

> "Your Reserves are in a Territory on the far side of Dune (in front of your shield, off the board). Unlike other factions you do not have Off-Planet Reserves and can not ship with the normal Shipping method."

**Fremen Reserves:**
- NOT off-planet (they're on Dune)
- Cannot use standard shipment rules (1.06.02)
- Must use special Fremen shipment (2.04.05)

#### 2.04.05 - SHIPMENT

> "During the Shipment [1.06.03], you may Send any or all your reserves for free onto the Great Flat or onto any one Territory on the Map within two territories of the Great Flat (subject to storm and Occupancy Limit). This ability costs 1 shipment action to use."

**Fremen Shipment Rules:**
- **Cost:** FREE (no spice)
- **Source:** Fremen reserves (on-planet)
- **Destination:** Great Flat OR any territory within 2 territories of Great Flat
- **Quantity:** Any or all reserves
- **Restrictions:** Storm and occupancy limit still apply
- **Action Cost:** Uses your 1 shipment action

**Territories Within 2 of Great Flat:**
- Adjacent to Great Flat (1 territory away)
- Adjacent to territories adjacent to Great Flat (2 territories away)

#### 2.04.06 - MOVEMENT

> "During movement you may Move your Forces two territories instead of one.✷"

**Fremen Movement:**
- Move through 2 adjacent territories (not 1)
- Can be cancelled by Karama (✷)
- Still subject to storm and occupancy restrictions

**Fremen + Ornithopters:**
- If Fremen have forces in Arrakeen/Carthag: 3 territories (ornithopters)
- If Fremen don't have forces in cities: 2 territories (Fremen ability)
- Ornithopters take precedence when available

#### 2.04.17 - STORM (Exception)

> "OBSTRUCTION: Forces may not Ship/Send/Move into, out of, or through a Sector in Storm. -2.04.17"

**The -2.04.17 notation means Fremen CAN move through storm.**

Fremen are NOT restricted by storm for movement (but shipment still restricted - see Storm Migration below).

#### 2.04.17 - STORM MIGRATION (Advanced)

> "You may Send your reserves into a storm at half loss.✷"

**Storm Migration Rules:**
- Can ship into storm sectors
- Half forces destroyed (rounded up)
- Example: Ship 10 forces into storm = 5 destroyed, 5 placed
- Can be cancelled by Karama (✷)
- Uses your 1 shipment action

**Calculation:** If shipping N forces, ceil(N/2) destroyed, floor(N/2) placed.

#### 2.04.08 - BEAST OF BURDEN

> "Upon conclusion of the Nexus you may ride the sandworm and Move some or all the Forces in the Territory, as long as they are not in Storm, to any Territory without allied Forces subject to storm and occupancy limits."

**NOT A SHIPMENT/MOVEMENT PHASE ABILITY** - Occurs during Spice Blow & Nexus Phase.

**Included for completeness:**
- After Shai-Hulud appears (causing Nexus)
- Can move forces from worm's territory
- Can't move forces currently in storm
- Destination must not have allied forces
- Subject to storm and occupancy limits
- Does NOT use shipment or movement action

---

### SPACING GUILD

#### 2.06.04 - PAYMENT FOR SHIPMENT

> "When another faction ships Forces onto Dune, they pay the spice to you instead of to the Spice Bank.✷ -3.01.11.03"

**Payment Collection:**
- All other factions pay YOU (not Spice Bank)
- Can be cancelled by Karama (✷)
- You still pay Spice Bank for your own shipments (at half price)

**Exception - Karama:**

> "Purchase a shipment of Forces onto the board at Guild Rates (1/2 normal) paid to the Spice Bank for any faction." -3.01.11.03

When Karama used for shipment, payment goes to Spice Bank (not Guild).

#### 2.06.05 - THREE TYPES OF SHIPMENT

> "You are capable of making one of three types of shipments each Turn."

**Must choose ONE of three types per turn:**

##### 2.06.05.00 - NORMAL SHIPMENT

> "You may ship normally from off-planet reserves to Dune."

Standard shipment rules apply (at half price).

##### 2.06.05.01 - CROSS-SHIP

> "You may ship any number of Forces from any one Territory to any other Territory on the board.✷"

**Cross-Ship Rules:**
- From any ONE territory on board
- To any ONE territory on board
- Any number of forces
- Costs spice (at half price for Guild)
- Subject to storm and occupancy restrictions
- Can be cancelled by Karama (✷)

**Cost Calculation:**
- If destination is stronghold: 1 spice per force (half = 0.5, rounded up)
- If destination is non-stronghold: 2 spice per force (half = 1)
- Guild pays half, rounded up

**Ally Access:**

> "ALLIANCE: Your ally may use the ability CROSS-SHIP [2.06.05.01].✷" -2.06.10

Guild's ally can cross-ship (but at full price unless also using Half Price Shipping).

##### 2.06.05.02 - OFF-PLANET

> "You may ship any number of Forces from any one Territory back to your reserves.✷"

**Off-Planet Shipment:**
- From any ONE territory on board
- To your off-planet reserves
- Any number of forces
- Cost: See RETREAT CALCULATIONS (2.06.07)
- Can be cancelled by Karama (✷)

> "Restriction: No player may ship Forces from the board back to their reserves. -2.06.05.02"

The -2.06.05.02 notation indicates Guild CAN ship back to reserves (supersedes base rule).

#### 2.06.06 - HALF PRICE SHIPPING

> "You pay only half the normal price (rounded up) when shipping your Forces.✷"

**Half Price Rules:**
- Applies to ALL Guild shipments (normal, cross-ship, off-planet)
- Round UP (e.g., 1.5 → 2)
- Can be cancelled by Karama (✷)

**Examples:**
- 1 force to stronghold: normally 1, Guild pays 1 (1/2 = 0.5 → 1)
- 2 forces to stronghold: normally 2, Guild pays 1 (2/2 = 1)
- 3 forces to stronghold: normally 3, Guild pays 2 (3/2 = 1.5 → 2)
- 1 force to non-stronghold: normally 2, Guild pays 1 (2/2 = 1)
- 3 forces to non-stronghold: normally 6, Guild pays 3 (6/2 = 3)

**Ally Access:**

> "ALLIANCE: Your ally may use the ability HALF PRICE SHIPPING [2.06.06].✷" -2.06.09

Guild's ally also pays half price.

#### 2.06.07 - RETREAT CALCULATIONS

> "The final price of your Forces shipped back to reserves is 1 spice for every 2 Forces."

**Off-Planet Cost Formula:**
- Cost = ceil(forces / 2)
- 1 force = 1 spice
- 2 forces = 1 spice
- 3 forces = 2 spice
- 4 forces = 2 spice
- 5 forces = 3 spice

**Note:** This is ALREADY the "half price" - it's the final cost for Guild.

#### 2.06.12 - SHIP AS IT PLEASES YOU (Advanced Rule)

> "During the Shipment and Movement Phase you may activate either ability SHIP AND MOVE AHEAD OF SCHEDULE [2.06.12.01] or HOLDING PATTERN [2.06.12.02].✷ -3.03.05.02"

> "The rest of the factions must make their shipments and movements in the proper sequence. You do not have to make known when you intend to make your shipment and movement action until the moment you wish to take it."

**Guild Timing Ability:**
- Can interrupt normal storm order
- Choose ONE: Ahead of Schedule OR Holding Pattern
- Don't declare timing until you actually act
- Can be cancelled by Karama (✷)

##### 2.06.12.01 - SHIP AND MOVE AHEAD OF SCHEDULE

> "You may take your shipment and move action before any player earlier in storm order than you. This would allow you to go first, or after any player has taken their complete Shipment and Movement action." -3.03.05.02

**Ahead of Schedule Rules:**
- Act BEFORE your normal storm order position
- Can act first (even before First Player)
- Can act after any player completes their actions
- Must complete BOTH shipment AND movement when you act

**Example:**
- Storm Order: Alice, Bob, Guild, David
- Guild can act: Before Alice, after Alice, after Bob, or normal position (after Bob)

##### 2.06.12.02 - HOLDING PATTERN

> "When you are up next in storm order you may announce, 'Delay'. You may take your shipment and move action after any player later in storm order than you. This would allow you to go last, or after any player has taken their complete Shipment and Movement action." -3.03.05.03

**Holding Pattern Rules:**
- Announce "Delay" when it's your turn in storm order
- Act AFTER your normal position
- Can act last (after all other players)
- Can act after any specific player later in storm order
- Must complete BOTH shipment AND movement when you act

**Example:**
- Storm Order: Alice, Bob, Guild, David
- Guild announces "Delay" when it's their turn (after Bob)
- Guild can act: After David (last) or immediately after David starts

**Important Clarification:**

> "The First Player conducts their Force Shipment action and then Force Movement action. Play proceeds in Storm Order until all players have completed this Phase or indicated they will not use their actions. -2.06.12.01 -3.03.05.02 -3.03.05.03"

The -2.06.12.01 -3.03.05.02 -3.03.05.03 notations indicate these Guild abilities modify the normal flow.

---

### BENE GESSERIT

#### 2.02.05 - SPIRITUAL ADVISORS

> "Whenever any other faction Ships Forces onto Dune from off-planet, you may Send 1 Force (fighter) for free from your reserves to the Polar Sink.✷ -2.02.11"

**Basic Spiritual Advisors:**
- Triggered when ANY other faction ships from off-planet
- Send 1 fighter to Polar Sink
- FREE (no spice cost)
- Not a "shipment action" (doesn't use your 1 shipment)
- Can be cancelled by Karama (✷)

**Clarifications:**
- Triggered by normal off-planet shipments only
- NOT triggered by Guild cross-ship (no off-planet involved)
- NOT triggered by Fremen shipment (not off-planet)
- NOT triggered by Guild off-planet shipment (going TO reserves, not FROM)

**Advanced Rule Modification:** See ADVISORS (2.02.11) below.

#### 2.02.11 - ADVISORS (Advanced Rule)

> "When using ability Spiritual Advisors [2.02.05], you may send 1 advisor for free from your reserves into the same Territory (and same Sector) that faction ships to, in place of sending a fighter to the Polar Sink. You may only do this when you do not have fighters already present in that Territory."

**Advanced Advisors:**
- Instead of fighter to Polar Sink, send advisor to shipment destination
- Same territory AND same sector as the shipment
- Only if you DON'T already have fighters there
- Can still send fighter to Polar Sink instead (your choice)

**Advisor vs Fighter Decision:**
- If territory has your fighters → Must send to Polar Sink
- If territory doesn't have your fighters → Choose: advisor there OR fighter to Polar Sink

#### 2.02.12 - COEXISTENCE (Advanced Rule)

> "Advisors coexist peacefully with other faction Forces in the same Territory, including allies. Advisors have no effect on the play of the other factions whatsoever."

**Advisors CANNOT:**
- Collect spice
- Be involved in combat
- Prevent another faction's Control of a Stronghold
- Prevent another faction from challenging a Stronghold (Occupancy Limit)
- Grant ornithopters to Forces
- Use ornithopter movement of three
- Play Family Atomics

**Advisors ARE subject to:**
- Storms
- Sandworms
- Lasgun/shield explosions
- Family Atomics

**Occupancy Limit Exemption:**

> "OCCUPANCY LIMIT: No player may Ship into a stronghold already occupied by two other player's Forces. -2.02.11"

The -2.02.11 notation indicates advisors DON'T count toward occupancy limit.

#### 2.02.14 - FIGHTERS (Advanced Rule)

> "When you use your normal shipment action [1.06.03] Forces must be shipped as fighters. Fighters may not be shipped to Territories already occupied by Advisors."

**Normal Bene Gesserit Shipment:**
- Uses standard shipment rules (1.06.02)
- Must ship as fighters (not advisors)
- Cannot ship to territories where you have advisors
- Costs normal spice (1 per force to stronghold, 2 to non-stronghold)

#### 2.02.15 - ENLISTMENT (Advanced Rule)

> "When you Move advisors to an unoccupied Territory, you must flip them to fighters."

**Auto-flip to fighters when:**
- Move advisors
- Destination territory is unoccupied (no other faction forces)

#### 2.02.16 - INTRUSION (Advanced Rule)

> "When a Force of another faction that you are not allied to enters a Territory where you have fighters, you may flip them to advisors.✷"

**Intrusion Rules:**
- When non-ally enters territory with your fighters
- You MAY flip your fighters to advisors
- "Enters" includes: ship, move, send, worm ride, etc.
- Can be cancelled by Karama (✷)
- Optional (your choice)

#### 2.02.17 - TAKE UP ARMS (Advanced Rule)

> "When you Move advisors into an occupied Territory, you may flip them to fighters following occupancy limit if you do not already have advisors present.✷"

**Take Up Arms Rules:**
- When you move advisors to occupied territory
- Can flip to fighters (if occupancy allows)
- Only if you DON'T already have advisors there
- Can be cancelled by Karama (✷)
- Optional (your choice)

#### 2.02.18 - WARTIME (Advanced Rule)

> "Before Shipment and Movement [1.06.00], in each Territory that you have advisors, you may flip all of those advisors to fighters. This change must be publicly announced.✷"

**Wartime Declaration:**
- BEFORE phase starts
- All advisors in a territory flip to fighters
- Must announce publicly
- Choose which territories (not forced to flip all advisors everywhere)
- Can be cancelled by Karama (✷)

#### 2.02.19 - PEACETIME (Advanced Rule)

> "Advisors can not flip to fighters with an ally present."

**Ally Restriction:**
- If your ally has forces in territory, advisors CANNOT flip to fighters
- Applies to all flip abilities (Enlistment, Take Up Arms, Wartime, Universal Stewards)

#### 2.02.20 - STORMED IN (Advanced Rule)

> "Advisors can not flip to fighters under storm."

**Storm Restriction:**
- If advisors are in storm sector, they CANNOT flip to fighters
- Applies to all flip abilities

**Movement Exception:**

> "Occupancy Limit: Like Shipment, Forces can not be moved into or through a Stronghold if Forces of two other players are already there. -2.02.20"

The -2.02.20 notation indicates advisors CAN move through full strongholds.

#### 2.02.21 - ADAPTIVE FORCE (Advanced Rule)

> "When you Move advisors or fighters into a Territory where you have the opposite type they flip to match the type already in the Territory."

**Auto-Conversion:**
- Move advisors to territory with your fighters → Flip to fighters
- Move fighters to territory with your advisors → Flip to advisors
- Ensures you never mix types in same territory
- Automatic (not optional)

#### 2.02.22 - UNIVERSAL STEWARDS (Advanced Rule)

> "When advisors are ever alone in a Territory before Battle Phase [1.07], they automatically flip to fighters."

**Auto-Flip to Fighters:**
- If advisors are alone (no other faction forces in territory)
- Checked before Battle Phase
- Automatic (not optional)
- Subject to PEACETIME and STORMED IN restrictions

---

### ATREIDES

No special shipment/movement abilities in basic or advanced rules.

**Standard rules apply.**

---

### EMPEROR

No special shipment/movement abilities in basic or advanced rules.

**Standard rules apply.**

---

### HARKONNEN

No special shipment/movement abilities in basic or advanced rules.

**Standard rules apply.**

---

## ALLIANCE RULES

### Rule 1.10 - Alliances

General alliance mechanics covered in Spice Blow & Nexus Phase.

### Rule 1.10.02.05 - MOVEMENT (Ally Payment)

> "During the Shipment and Movement Phase, allies may pay for each other's shipments."

**Ally Payment Rules:**
- Allies can pay spice for each other's shipments
- Covers any or all of the shipment cost
- Payment goes to normal destination (Guild or Spice Bank)
- Doesn't grant abilities (unless specific alliance ability says so)

**Example:**
- Alice (Atreides) allied with Bob (Emperor)
- Alice ships 5 forces to stronghold (5 spice cost)
- Bob can pay 0, 1, 2, 3, 4, or 5 of the cost
- Alice pays the remainder

### Rule 1.10.02.06 - CONSTRAINT (Alliance Collision)

> "At the end of your Shipment and Movement actions, Place all your Forces that are in the same Territory (except the Polar Sink) as your Ally's Forces in the Tleilaxu Tanks." -2.02.12

**Critical Alliance Constraint:**
- Checked at END of YOUR shipment and movement actions
- All YOUR forces in same territory as ally → Tanks
- Polar Sink exempt
- Applies regardless of sector (same territory = collision)
- Both players lose forces in tanks if both end in same territory

**Timing:**
- Checked after you complete your actions
- NOT checked during ally's actions
- Each player checked separately

**Bene Gesserit Advisors Exception:**

> "CONSTRAINT: At the end of your Shipment and Movement actions, Place all your Forces that are in the same Territory (except the Polar Sink) as your Ally's Forces in the Tleilaxu Tanks. -2.02.12"

The -2.02.12 notation references Bene Gesserit advisors, which coexist with allies (2.02.12).

**Clarification:**
- Advisors DON'T trigger ally constraint
- Ally forces DON'T trigger advisor removal
- Fighters DO trigger ally constraint (normal rule applies)

### Spacing Guild Alliance Abilities

#### Rule 2.06.09 - ALLIANCE: HALF PRICE SHIPPING

> "Your ally may use the ability HALF PRICE SHIPPING [2.06.06].✷"

**Guild Ally Benefit:**
- Ally pays half price for shipments (rounded up)
- Same calculation as Guild (see 2.06.06)
- Can be cancelled by Karama (✷)
- Applies to ally's normal shipments only (not cross-ship unless also granted)

#### Rule 2.06.10 - ALLIANCE: CROSS-SHIP

> "Your ally may use the ability CROSS-SHIP [2.06.05.01].✷"

**Guild Ally Benefit:**
- Ally can cross-ship (board to board)
- Pays full price (unless also using Half Price Shipping)
- Subject to same restrictions as Guild cross-ship
- Can be cancelled by Karama (✷)

**Important:** If Guild ally uses BOTH alliance abilities:
- Can cross-ship at half price
- Cost: (forces × destination cost) / 2, rounded up
- Stronghold destination: 0.5 per force → 1 spice per 2 forces
- Non-stronghold destination: 1 per force

### Emperor Alliance Abilities

#### Rule 2.03.06 - ALLIANCE: Spice Transfer

> "You may give spice to your ally at any time for any reason. Spice you give to your ally goes behind their shield and is now their spice."

**Relevant to Shipment/Movement:**
- Emperor can give ally spice to pay for shipments
- Spice goes behind ally's shield (not in front)
- Not a "bribe" (immediate transfer, not collected in Mentat Pause)

---

## TREACHERY CARDS

### Rule 3.01.09 - HAJR

> "Special-Movement - Play during FORCE MOVEMENT [1.06.05]. You gain an extra Force movement action subject to normal movement rules. The Forces you Move may be a group you've already moved this Phase or another group. Discard after use."

**Hajr Card:**
- Grants 1 extra movement action
- Can move same group again OR different group
- Subject to ALL normal movement rules:
  - Storm restrictions
  - Occupancy limits
  - Ornithopter rules (check for forces in cities)
  - Fremen 2-territory movement (if applicable)
- Discarded after use
- Can be played by any faction

**Examples:**
1. Move forces from A→B (normal movement), play Hajr, move those same forces B→C
2. Move forces from A→B (normal movement), play Hajr, move different forces from X→Y
3. Play Hajr, move forces from A→B (extra movement), then use normal movement for C→D

**Timing:** Play during FORCE MOVEMENT phase (after shipment, during movement).

**Reference Conflict:**

> "ONE FORCE MOVE: Each player may make only one Force movement action per Turn. -3.01.09 -3.03.11.02"

The -3.01.09 notation indicates Hajr overrides the one-movement limit.

### Rule 3.01.11 - KARAMA

> "Special: Play at anytime to do one of these options when appropriate, then discard."

**Option 1 - Cancel Ability:**

> "Cancel one use of a faction ability that has an ✷ after it when another player attempts to use it. The faction whose ability is cancelled may recalculate and retake that same action (ex: revival, shipment, movement) without the ability."

**Shipment/Movement Abilities with ✷:**
- Fremen MOVEMENT (2.04.06) - cancel 2-territory movement
- Fremen STORM MIGRATION (2.04.17) - cancel storm shipment
- Spacing Guild PAYMENT FOR SHIPMENT (2.06.04) - cancel payment collection
- Spacing Guild CROSS-SHIP (2.06.05.01) - cancel cross-ship
- Spacing Guild OFF-PLANET (2.06.05.02) - cancel off-planet shipment
- Spacing Guild HALF PRICE SHIPPING (2.06.06) - cancel half price
- Spacing Guild SHIP AS IT PLEASES YOU (2.06.12) - cancel timing interrupt
- Bene Gesserit SPIRITUAL ADVISORS (2.02.05) - cancel free advisor
- Bene Gesserit INTRUSION (2.02.16) - cancel fighter→advisor flip
- Bene Gesserit TAKE UP ARMS (2.02.17) - cancel advisor→fighter flip
- Bene Gesserit WARTIME (2.02.18) - cancel pre-phase flip
- Guild Ally HALF PRICE SHIPPING (2.06.09) - cancel ally half price
- Guild Ally CROSS-SHIP (2.06.10) - cancel ally cross-ship

**Option 3 - Purchase Shipment:**

> "Purchase a shipment of Forces onto the board at Guild Rates (1/2 normal) paid to the Spice Bank for any faction." -3.01.11.03

**Karama Shipment:**
- Any faction can use (not just Guild)
- Pay half price (rounded up)
- Pay to Spice Bank (NOT Guild, even if Guild in game)
- Subject to all normal shipment restrictions
- Uses your 1 shipment action

**Cost Examples:**
- 5 forces to stronghold: normally 5, with Karama: 3 (5/2 = 2.5 → 3)
- 6 forces to non-stronghold: normally 12, with Karama: 6 (12/2 = 6)

**Reference:**

> "COST: The cost of shipping off-planet reserves is 1 spice per Force shipped into any Stronghold and 2 spice per Force shipped into any Non-Stronghold Territory. -2.06.06 -2.06.09 -3.01.11.03"

The -3.01.11.03 notation indicates Karama modifies shipment cost.

**Option 5 - Special Karama Power (Advanced):**

> "In Advanced use a Once-a-game special Karama power (see 1.14)."

**Spacing Guild Special Karama (Advanced):**

> "During Shipment and Movement Phase [1.06] you may use a Karama Card to cancel one off-planet shipment of any one player."

**Guild Karama Power:**
- Cancel one off-planet shipment
- Any player (not just opponents)
- That player loses their shipment action (already used)
- No spice refunded (if already paid)
- Once per game

---

## ADVANCED GAME RULES

### Rule 1.13 - Advanced Game

> "For experienced players the game is changed by adding these rules: increasing the number of Spice Blows, adding a spice advantage for holding a city or Tuek's Sietch, (the smuggler stronghold), an enhanced Karama Card, an advanced battle system, and additional faction abilities (as stated in 2.xx.00)."

### Changes Affecting Shipment/Movement:

#### 1.13.01 - Increased Spice Flow (Not Direct)

> "During Collection Phase [1.08], each occupant of Carthag and Arrakeen collects 2 spice and the occupant of Tuek's Sietch collects 1 spice."

**Indirect Effect:** More spice available for shipments.

#### 1.13.05 - Enhanced Karama (Spacing Guild)

> "ONE TIME ULTIMATE: When playing a Karama Card [3.01.11], in addition to it's normal effects a player may now use it to implement their Faction's special Karama power once per game."

**Spacing Guild Karama Power (1.14.06):**

> "During Shipment and Movement Phase [1.06] you may use a Karama Card to cancel one off-planet shipment of any one player."

See Karama section above for details.

#### Advanced Faction Abilities

All advanced faction abilities (2.XX.00 and higher) are included in Faction Abilities section above.

**Key Advanced Abilities:**
- Fremen: Storm Migration, Storm Losses, Fedaykin, Battle Hardened
- Spacing Guild: Ship As It Pleases You (timing abilities)
- Bene Gesserit: Advisors, all advisor flip abilities
- Atreides: Kwisatz Haderach (not shipment/movement related)
- Emperor: Sardaukar (not shipment/movement related)
- Harkonnen: Captured Leaders (not shipment/movement related)

---

## EDGE CASES AND CLARIFICATIONS

### Multi-Sector Territories

**Issue:** Some territories span multiple sectors.

**Rules:**
1. When shipping/moving into multi-sector territory, must declare sector (1.06.02.03, 1.06.03.05)
2. Storm in one sector doesn't block access to other sectors of same territory (1.06.03.05)
3. Can move forces from different sectors of same territory (unless separated by storm) (1.06.03)

**Example:**
- Territory spans sectors 5, 6, 7
- Storm in sector 6
- Can ship/move into sectors 5 or 7 (not sector 6)
- Forces in sector 5 and sector 7 can be moved together (not separated by storm)
- Forces in sector 5 and forces in sector 6 cannot be moved together (separated by storm)

### Storm and Adjacent Territories

**Issue:** Can you move through a territory that's partially in storm?

**Rule:** Yes, as long as you don't pass through the storm sector (1.06.03.05).

**Example:**
- Moving from Territory A to Territory C
- Territory B is between A and C
- Territory B spans sectors 3, 4, 5
- Storm in sector 4
- Can move A→B→C if path goes through sector 3 or 5 (not 4)
- Cannot move A→B→C if only path is through sector 4

### Ornithopters and Force Location

**Issue:** Do forces need to be in Arrakeen/Carthag to use ornithopters?

**Rule:** No. Forces in Arrakeen/Carthag grant ornithopters, but forces being moved don't need to be there (1.06.03.03).

**Example:**
- Have 5 forces in Arrakeen
- Have 10 forces in Sietch Tabr
- Can move the 10 forces from Sietch Tabr up to 3 territories (ornithopters granted by Arrakeen forces)

### Fremen Movement + Ornithopters

**Issue:** Can Fremen move 2 territories AND use ornithopters for 5 total?

**Rule:** No. Ornithopters (3 territories) supersede Fremen movement (2 territories).

**Clarification:**
- Fremen with ornithopters: 3 territories
- Fremen without ornithopters: 2 territories
- Normal factions with ornithopters: 3 territories
- Normal factions without ornithopters: 1 territory

**Fremen Advantage:** Can move 2 territories without needing city control.

### Guild Cross-Ship and Spiritual Advisors

**Issue:** Does Guild cross-ship trigger Bene Gesserit Spiritual Advisors?

**Rule:** No. Spiritual Advisors only triggers on off-planet shipments (2.02.05).

**Clarification:**
- Normal off-planet shipment → Triggers Spiritual Advisors
- Guild cross-ship (board to board) → Does NOT trigger
- Fremen shipment (on-planet reserves) → Does NOT trigger
- Guild off-planet (board to reserves) → Does NOT trigger

### Guild Timing and Storm Order Changes

**Issue:** If Guild uses "Ahead of Schedule" and acts first, who's the "First Player"?

**Rule:** First Player doesn't change. Guild interrupts storm order but doesn't change First Player designation (2.06.12).

**Clarification:**
- First Player determined by Storm Phase (whose marker storm approaches)
- First Player status used for other phases (Bidding, Battle, etc.)
- Guild timing abilities only affect Shipment/Movement Phase order

### Alliance Constraint Timing

**Issue:** When exactly is the alliance constraint checked?

**Rule:** At the END of YOUR shipment and movement actions (1.06.03.08).

**Clarification:**
- You ship forces to Territory X (ally already there)
- Forces don't go to tanks yet
- You complete movement action
- NOW check: all your forces in same territory as ally → Tanks
- Checked separately for each player
- If both players end in same territory, both lose forces

**Exception:** Polar Sink exempt (1.06.03.08).

### Bene Gesserit Advisors and Occupancy

**Issue:** Do advisors count toward occupancy limit?

**Rule:** No. Advisors don't count (2.02.12, implied by -2.02.11 notation on 1.06.02.05).

**Clarification:**
- Stronghold has 2 factions (fighters)
- Bene Gesserit advisors also present
- 3rd faction CAN ship in (advisors don't count)
- 4th faction CANNOT ship in (2 fighter factions already there)

### Karama Shipment and Guild Payment

**Issue:** When using Karama to ship at half price, who gets paid?

**Rule:** Spice Bank (not Guild) (3.01.11.03).

**Reference:**

> "Purchase a shipment of Forces onto the board at Guild Rates (1/2 normal) paid to the Spice Bank for any faction." -3.01.11.03

**Clarification:**
- Normal shipment (Guild in game): Pay Guild
- Karama shipment (Guild in game): Pay Spice Bank
- Guild doesn't receive payment for Karama shipments

### Hajr and Movement Limits

**Issue:** Can Hajr grant more than 2 total movements?

**Rule:** No. Hajr grants "an extra Force movement action" = 1 extra (3.01.09).

**Clarification:**
- Normal: 1 movement action
- With Hajr: 2 movement actions total
- Multiple Hajr cards: Each grants +1 action

### Guild Off-Planet and Retreat Calculations

**Issue:** Does Half Price Shipping apply to off-planet shipments?

**Rule:** No. Retreat Calculations (2.06.07) is already the final price.

**Clarification:**
- Off-planet shipment cost: 1 spice per 2 forces (2.06.07)
- This IS the Guild price (already half)
- Half Price Shipping doesn't reduce it further
- Formula: ceil(forces / 2) = final cost

### Guild Ally Cross-Ship at Half Price

**Issue:** Can Guild ally cross-ship at half price?

**Rule:** Yes, if using both alliance abilities (2.06.09 + 2.06.10).

**Calculation:**
- Cross-ship normally costs same as regular shipment
- Guild ally can use Half Price Shipping (2.06.09)
- Guild ally can use Cross-Ship (2.06.10)
- Combined: Cross-ship at half price

**Example:**
- Guild ally cross-ships 10 forces to stronghold
- Normal cost: 10 spice
- With half price: 5 spice
- Pay to Spice Bank (Guild not involved in ally's shipment payment)

### Fremen Storm Migration and Sector Declaration

**Issue:** When shipping into storm, what sector are forces placed in?

**Rule:** Must declare sector (storm sector) (1.06.02.03).

**Clarification:**
- Fremen ship 10 forces into storm sector 5
- 5 forces destroyed (half, rounded up)
- 5 forces placed in sector 5
- If territory spans multiple sectors (some in storm), can only place in storm sector

### Advisor Flipping and Ally Presence

**Issue:** Can advisors flip to fighters if ally is in territory but different sector?

**Rule:** Yes. Same territory = peacetime restriction applies (2.02.19).

**Clarification:**
- Territory spans sectors 3, 4, 5
- BG advisors in sector 3
- Ally forces in sector 5
- Same territory → PEACETIME applies
- Advisors cannot flip to fighters

**Sector doesn't matter for this rule** - only territory.

### Repositioning and Storm

**Issue:** Can you reposition out of a storm sector to a non-storm sector in same territory?

**Rule:** No. Cannot move OUT OF storm sector (1.06.03.05).

**Clarification:**
- Territory spans sectors 3 (clear), 4 (storm), 5 (clear)
- Forces in sector 4 (storm)
- Cannot reposition to sector 3 or 5 (moving out of storm prohibited)
- Forces stuck in storm sector until storm moves

**But can reposition into same territory if source not in storm:**
- Forces in sector 3 (clear)
- Can reposition to sector 5 (clear)
- Cannot reposition to sector 4 (storm)

### Guild Acting Out of Order

**Issue:** If Guild acts first using "Ahead of Schedule", can they act again in normal storm order position?

**Rule:** No. Guild takes "shipment and move action" when they interrupt (2.06.12.01).

**Clarification:**
- Guild uses ONE shipment + ONE movement when acting
- Can't act twice in same phase
- "Ahead of Schedule" and "Holding Pattern" determine WHEN to act, not HOW MANY times

### Fremen Two-Territory Movement Path

**Issue:** For Fremen 2-territory movement, must both territories be adjacent to starting territory, or can second territory be adjacent to first?

**Rule:** Second territory is adjacent to first (chain movement).

**Clarification:**
- Fremen in Territory A
- Territory B adjacent to A
- Territory C adjacent to B (but not A)
- Fremen can move A→B→C
- This is "two territories" movement (through 2 adjacent territories)

**Same as ornithopters** - movement chains through adjacent territories.

---

## COMMON MISTAKES

### Mistake 1: Multiple Shipments Per Turn

**Wrong:** Player ships to one territory, then ships to another territory.

**Right:** ONE shipment action per turn (1.06.01). Player ships to one territory only.

**Exception:** Guild has three TYPES of shipment, but still only ONE shipment action (2.06.05).

### Mistake 2: Multiple Movements Per Turn

**Wrong:** Player moves forces from A→B, then moves different forces from C→D.

**Right:** ONE movement action per turn (1.06.03.01). Player moves one group (any number of forces from one territory to one other).

**Exception:** Hajr card grants one extra movement action (3.01.09).

### Mistake 3: Moving Multiple Groups

**Wrong:** Player moves 5 forces from A→B and 10 forces from C→D as "one movement action."

**Right:** One movement action = forces from ONE territory to ONE other territory (1.06.03).

**Clarification:** Can move forces from different sectors of SAME territory together (unless separated by storm).

### Mistake 4: Paying Guild Player Directly

**Wrong:** Player hands spice tokens to Guild player.

**Right:** Guild player receives spice (goes behind their shield), but follows normal payment procedure (2.06.04).

**Correct Flow:**
1. Player announces shipment and cost
2. Player removes spice from behind their shield
3. Spice goes to Guild player's shield (not Spice Bank)

### Mistake 5: Guild Pays Guild for Shipments

**Wrong:** Guild player pays themselves for their own shipments.

**Right:** Guild pays Spice Bank for their own shipments (at half price) (2.06.04).

**Rule:** "When ANOTHER faction ships..." - Guild is not "another faction" to themselves.

### Mistake 6: Alliance Forces Don't Battle

**Wrong:** Allies can be in same territory without forces going to tanks.

**Right:** At end of YOUR actions, forces in same territory as ally → Tanks (1.06.03.08).

**Exception:** Polar Sink exempt. Advisors exempt.

### Mistake 7: Occupancy Limit in Non-Strongholds

**Wrong:** Can't ship to non-stronghold with 2 other factions present.

**Right:** Occupancy limit only applies to strongholds (1.06.02.05).

**Non-strongholds:** Any number of factions can be present.

### Mistake 8: Storm Blocks All Access to Territory

**Wrong:** Can't move to a territory that's partially in storm.

**Right:** Can move to multi-sector territory as long as destination sector not in storm (1.06.03.05).

**Must:** Declare which sector forces are placed in.

### Mistake 9: Fremen Move 5 Territories (2 + 3)

**Wrong:** Fremen with ornithopters move 5 territories (2 Fremen + 3 ornithopters).

**Right:** Ornithopters (3) supersede Fremen movement (2). Max 3 territories (1.06.03.03).

**Fremen Advantage:** Can move 2 without needing cities (others need cities for 3).

### Mistake 10: Spiritual Advisors for All Shipments

**Wrong:** BG sends advisor when Guild cross-ships.

**Right:** Spiritual Advisors only triggers on OFF-PLANET shipments (2.02.05).

**Triggered by:** Normal off-planet shipments only.

**Not triggered by:** Guild cross-ship, Fremen shipment, Guild off-planet retreat.

### Mistake 11: Ornithopters from Any City

**Wrong:** Player with forces in Tuek's Sietch gets ornithopters.

**Right:** Only Arrakeen or Carthag grant ornithopters (1.06.03.03).

**Cities that grant ornithopters:** Arrakeen, Carthag.

**Cities that don't:** Tuek's Sietch, Sietch Tabr, Habbanya Sietch.

### Mistake 12: Karama Shipment Pays Guild

**Wrong:** Player uses Karama to ship at half price, pays Guild.

**Right:** Karama shipment pays Spice Bank (even if Guild in game) (3.01.11.03).

### Mistake 13: Guild Ally Gets Free Cross-Ship

**Wrong:** Guild ally cross-ships for free.

**Right:** Guild ally cross-ships at normal price (unless also using Half Price Shipping) (2.06.10).

**Both abilities:** Guild ally can cross-ship at half price (2.06.09 + 2.06.10).

### Mistake 14: Advisors Count for Ornithopters

**Wrong:** BG advisors in Arrakeen grant ornithopters to BG forces.

**Right:** Advisors don't grant ornithopters (2.02.12).

**Must:** Have fighters in Arrakeen/Carthag for ornithopters.

### Mistake 15: Storm Migration Costs Spice

**Wrong:** Fremen pay spice to ship into storm.

**Right:** Fremen shipment is FREE (including storm migration) (2.04.05, 2.04.17).

**Cost:** Half forces destroyed (not spice).

### Mistake 16: Guild Acts Twice with Timing Ability

**Wrong:** Guild uses "Ahead of Schedule" to act first, then acts again in normal position.

**Right:** Guild acts ONCE - timing ability determines WHEN, not how many times (2.06.12).

### Mistake 17: Repositioning Doesn't Use Movement Action

**Wrong:** Player repositions forces to different sector, then moves forces to different territory.

**Right:** Repositioning uses your ONE movement action (1.06.03.09).

**Cannot:** Reposition AND move in same turn (unless Hajr).

### Mistake 18: Fremen Ship from Off-Planet

**Wrong:** Fremen use standard shipment rules (1.06.02).

**Right:** Fremen have no off-planet reserves, use special shipment (2.04.03, 2.04.05).

**Fremen reserves:** On-planet (far side of Dune), not off-planet.

### Mistake 19: BG Ships Advisors with Normal Shipment

**Wrong:** BG uses normal shipment action to ship advisors.

**Right:** Normal shipment must be fighters (2.02.14).

**Advisors:** Only via Spiritual Advisors ability (2.02.05, 2.02.11).

### Mistake 20: Ally Pays with Ally's Spice in Front of Shield

**Wrong:** Ally pays for shipment using spice in front of their shield (bribe spice).

**Right:** Spice in front of shield can't be used until Mentat Pause (1.09.01).

**Must:** Use spice from behind shield to pay for ally's shipments (1.10.02.05).

---

## IMPLEMENTATION CHECKLIST

### Core Phase Flow

- [ ] Storm order determination (First Player from Storm Phase)
- [ ] Players act in storm order (shipment, then movement)
- [ ] Each player can pass shipment OR movement OR both
- [ ] Phase ends when all players acted or passed

### Shipment Rules

- [ ] ONE shipment action per player per turn
- [ ] Ship from reserves to ONE territory
- [ ] Cost: 1 spice per force to stronghold, 2 to non-stronghold
- [ ] Payment: To Guild (if in game) or Spice Bank
- [ ] Sector declaration for multi-sector territories
- [ ] Storm restriction: Cannot ship into/out of storm
- [ ] Occupancy limit: Cannot ship into stronghold with 2 other factions
- [ ] Cannot ship from board to reserves (except Guild)

### Movement Rules

- [ ] ONE movement action per player per turn
- [ ] Move ANY number of forces from ONE territory to ONE other territory
- [ ] Combine forces from different sectors of same territory (if not separated by storm)
- [ ] Base movement: 1 adjacent territory
- [ ] Ornithopters: 3 territories if forces in Arrakeen/Carthag
- [ ] Sectors don't affect movement (only storm)
- [ ] Storm restriction: Cannot move into/out of/through storm
- [ ] Occupancy limit: Cannot move into/through stronghold with 2 other factions
- [ ] Polar Sink never in storm
- [ ] Repositioning uses movement action

### Alliance Rules

- [ ] Allies can pay for each other's shipments
- [ ] Alliance constraint: Forces in same territory as ally → Tanks (except Polar Sink)
- [ ] Check constraint at END of each player's actions
- [ ] Advisors exempt from constraint

### Fremen Abilities

- [ ] NATIVES: No off-planet reserves, can't use normal shipment
- [ ] SHIPMENT: Free to Great Flat or within 2 territories, uses 1 action
- [ ] MOVEMENT: 2 territories instead of 1 (✷ Karama cancel)
- [ ] Can move through storm (exception to base rule)
- [ ] STORM MIGRATION (Advanced): Ship into storm at half loss (✷)

### Spacing Guild Abilities

- [ ] PAYMENT FOR SHIPMENT: Receive payment from other factions (✷)
- [ ] THREE TYPES: Normal, Cross-Ship, Off-Planet (choose one)
- [ ] NORMAL SHIPMENT: Standard rules at half price
- [ ] CROSS-SHIP: Board to board at half price (✷)
- [ ] OFF-PLANET: Board to reserves, 1 spice per 2 forces (✷)
- [ ] HALF PRICE SHIPPING: All shipments half price, rounded up (✷)
- [ ] SHIP AS IT PLEASES YOU (Advanced): Timing interrupt (✷)
- [ ] AHEAD OF SCHEDULE: Act before normal position (✷)
- [ ] HOLDING PATTERN: Announce delay, act after normal position (✷)
- [ ] ALLIANCE HALF PRICE: Ally gets half price (✷)
- [ ] ALLIANCE CROSS-SHIP: Ally can cross-ship (✷)

### Bene Gesserit Abilities

- [ ] SPIRITUAL ADVISORS: Send 1 fighter to Polar Sink when others ship off-planet (✷)
- [ ] ADVISORS (Advanced): Send 1 advisor to shipment destination instead (if no fighters there)
- [ ] COEXISTENCE: Advisors don't count for occupancy, can't do most actions
- [ ] FIGHTERS: Normal shipment must be fighters, can't ship to territories with advisors
- [ ] ENLISTMENT: Advisors moving to unoccupied territory flip to fighters
- [ ] INTRUSION: Flip fighters to advisors when non-ally enters (✷)
- [ ] TAKE UP ARMS: Flip advisors to fighters when moving to occupied territory (✷)
- [ ] WARTIME: Flip advisors to fighters before phase starts (✷)
- [ ] PEACETIME: Can't flip with ally present
- [ ] STORMED IN: Can't flip under storm
- [ ] ADAPTIVE FORCE: Auto-flip to match type in destination
- [ ] UNIVERSAL STEWARDS: Auto-flip to fighters if alone before Battle Phase

### Treachery Cards

- [ ] HAJR: Extra movement action, discard after use
- [ ] KARAMA: Cancel ✷ abilities, OR ship at half price to Spice Bank
- [ ] KARAMA (Advanced): Guild can cancel one off-planet shipment (once per game)

### Edge Cases

- [ ] Multi-sector territories: Declare sector, can avoid storm sectors
- [ ] Ornithopters: Check for forces in cities, forces moved don't need to be there
- [ ] Fremen + Ornithopters: Use ornithopters (3) not Fremen (2) if both apply
- [ ] Guild cross-ship doesn't trigger Spiritual Advisors
- [ ] Karama shipment pays Spice Bank, not Guild
- [ ] Guild off-planet cost already includes half price (1 per 2 forces)
- [ ] Guild ally can cross-ship at half price if using both abilities
- [ ] Advisors and ally presence: Same territory (any sector) = peacetime
- [ ] Repositioning out of storm: Cannot move out of storm sector

### Validation Checks

- [ ] Sufficient spice for shipment cost
- [ ] Sufficient forces in reserves (for shipment)
- [ ] Sufficient forces in territory (for movement)
- [ ] Destination not in storm (or Fremen storm migration)
- [ ] Destination respects occupancy limit (strongholds only)
- [ ] Movement path respects storm (can't go through)
- [ ] Movement distance valid (1, 2, or 3 territories)
- [ ] Alliance constraint at end of actions
- [ ] Spiritual Advisors triggered on appropriate shipments
- [ ] Karama cancellations applied correctly

### Payment Tracking

- [ ] Normal shipment: To Guild (if in game) or Spice Bank
- [ ] Guild shipment: To Spice Bank (at half price)
- [ ] Karama shipment: To Spice Bank (at half price)
- [ ] Alliance payment: Allies can contribute any amount
- [ ] Track who paid what for logging/verification

### Ability Tracking

- [ ] Track if player used shipment action
- [ ] Track if player used movement action
- [ ] Track if Hajr played (extra movement)
- [ ] Track if Karama used (cancel abilities or half-price ship)
- [ ] Track Guild timing choice (Ahead/Holding/Normal)
- [ ] Track BG advisor placements (Spiritual Advisors)
- [ ] Track advisor flips (Intrusion, Take Up Arms, Wartime, etc.)

---

## APPENDIX: QUICK REFERENCE TABLES

### Shipment Costs

| Destination Type | Base Cost per Force | Guild Cost | Guild Ally Cost | Karama Cost |
|------------------|---------------------|------------|-----------------|-------------|
| Stronghold | 1 spice | 1 spice per 2 forces* | 1 spice per 2 forces* | 1 spice per 2 forces* |
| Non-Stronghold | 2 spice | 1 spice | 1 spice | 1 spice |

*Rounded up. Example: 1 force = 1 spice, 2 forces = 1 spice, 3 forces = 2 spice.

### Movement Ranges

| Situation | Movement Distance |
|-----------|-------------------|
| Base (no cities) | 1 territory |
| With Arrakeen/Carthag | 3 territories (ornithopters) |
| Fremen (no cities) | 2 territories |
| Fremen with cities | 3 territories (ornithopters) |
| With Hajr | +1 extra movement action |

### Faction Shipment Special Rules

| Faction | Shipment Type | Cost | Notes |
|---------|---------------|------|-------|
| Normal | Off-planet to board | 1-2 spice per force | Standard rules |
| Fremen | Reserves to Great Flat area | FREE | Within 2 territories of Great Flat |
| Guild | Normal | Half price | Rounded up |
| Guild | Cross-Ship | Half price | Board to board |
| Guild | Off-Planet | 1 per 2 forces | Board to reserves |

### Abilities That Can Be Cancelled by Karama (✷)

**Shipment/Movement Related:**
- Fremen MOVEMENT (2 territories)
- Fremen STORM MIGRATION
- Guild PAYMENT FOR SHIPMENT
- Guild CROSS-SHIP
- Guild OFF-PLANET
- Guild HALF PRICE SHIPPING
- Guild SHIP AS IT PLEASES YOU
- Guild ALLIANCE: HALF PRICE SHIPPING
- Guild ALLIANCE: CROSS-SHIP
- BG SPIRITUAL ADVISORS
- BG INTRUSION
- BG TAKE UP ARMS
- BG WARTIME

### Storm Restrictions Summary

| Action | Restriction |
|--------|-------------|
| Ship into storm | Prohibited (except Fremen with half loss) |
| Ship out of storm | Prohibited |
| Move into storm | Prohibited (except Fremen) |
| Move out of storm | Prohibited |
| Move through storm | Prohibited (except Fremen) |
| Multi-sector territory | Can access non-storm sectors |
| Polar Sink | Never in storm |

### Occupancy Limits

| Territory Type | Max Factions | Notes |
|----------------|--------------|-------|
| Stronghold | 3 | Can't ship/move if 2 others present |
| Non-Stronghold | Unlimited | No limit |
| Polar Sink | Unlimited | Never in storm, allies can coexist |

**Exception:** BG Advisors don't count toward occupancy.

---

## REVISION HISTORY

**Version 1.0 (2025-11-27):**
- Initial comprehensive documentation
- Based on updated landsraad-rules.md
- Covers all base, faction, alliance, and advanced rules
- Includes edge cases and common mistakes
- Complete implementation checklist

---

**END OF DOCUMENT**
