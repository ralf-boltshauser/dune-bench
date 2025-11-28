# Karama Card System Architecture

## Overview

The Karama card system implements interrupt-based ability cancellation, one of the most complex mechanics in Dune. Karama cards allow players to cancel or prevent faction abilities marked with ✷ symbols in the rules.

## Core Concepts

### 1. **Two Types of Interrupts**

- **Cancel (✷ after ability)**: Cancel an ability *after* it was used
  - Example: Cancel Atreides PRESCIENCE after they see your battle plan
  - The faction may recalculate and retake their action without the ability

- **Prevent (✷ before and after ability)**: Prevent an ability *before* it is used
  - Example: Prevent Emperor SARDAUKAR before battle
  - Must be declared before the ability takes effect

### 2. **Additional Karama Uses**

Beyond interrupts, Karama can be used proactively:
- Purchase shipment at Guild rates (1 spice per 2 forces)
- Bid without having enough spice
- Use faction-specific Karama powers (Advanced rules)

### 3. **Bene Gesserit Special**

The Bene Gesserit can use any **worthless card** (Baliset, Jubba Cloak, Kulon, La La La, Trip to Gamont) as if it were a Karama card. This is their faction ability marked with ✷.

## State Management

### KaramaInterruptState

Located in `src/lib/game/types/state.ts`:

```typescript
interface KaramaInterruptState {
  interruptType: 'cancel' | 'prevent';
  targetFaction: Faction;           // Who used the ability
  abilityName: string;               // What ability was used
  abilityContext: Record<string, unknown>; // Context for rollback
  eligibleFactions: Faction[];       // All factions except target
  responses: Map<Faction, KaramaResponse>; // Collected responses
  interrupted: boolean;              // Did anyone interrupt?
  interruptor: Faction | null;      // Who interrupted (first wins)
  turn: number;
  phase: Phase;
}
```

### State Lifecycle

1. **Create Interrupt**: When a cancellable ability is used
   ```typescript
   state = createKaramaInterrupt(
     state,
     'cancel',
     Faction.ATREIDES,
     'PRESCIENCE',
     { battleId, elementRevealed: 'weapon' }
   );
   ```

2. **Collect Responses**: Each eligible faction responds
   ```typescript
   // Via respond_to_karama_opportunity tool
   // Responses are collected in state.karamaState.responses
   ```

3. **Check Completion**: After each response
   ```typescript
   if (allKaramaResponsesReceived(state)) {
     const interruptor = getKaramaInterruptor(state);
     if (interruptor) {
       // Rollback the ability
       // Notify factions
     }
     state = clearKaramaInterrupt(state);
   }
   ```

## Tools

Located in `src/lib/game/tools/actions/karama.ts`:

### 1. **respond_to_karama_opportunity**

Used when another faction uses an ability that can be cancelled/prevented.

**Parameters:**
- `useKarama: boolean` - Whether to use Karama
- `karamaCardId?: string` - The Karama card (or worthless for BG)

**Validation:**
- Checks if there's an active interrupt opportunity
- Verifies faction is eligible to respond
- Validates card is Karama (or worthless for BG)
- Ensures faction hasn't already responded

**Effect:**
- Records response in state
- If useKarama=true: Discards card, marks interrupted
- First faction to interrupt wins (subsequent responses ignored)

### 2. **use_karama_guild_shipment**

Proactive use: Purchase next shipment at Guild rates.

**Parameters:**
- `karamaCardId: string` - The Karama card

**Effect:**
- Sets `karamaGuildShipmentActive` flag on faction state
- Next shipment pays 1 spice per 2 forces instead of normal rates
- Flag is cleared after shipment

### 3. **use_karama_bid_over_spice**

Proactive use: Bid more than you have during bidding phase.

**Parameters:**
- `bidAmount: number` - Amount to bid (can exceed spice)
- `karamaCardId: string` - The Karama card

**Effect:**
- Sets `karamaBiddingActive` flag on faction state
- Bidding tool checks this flag to allow overbidding
- Flag is cleared after bid resolves

## Integration with Phase Handlers

### Pattern for Cancellable Abilities

When a faction uses an ability marked with ✷ after it:

```typescript
// 1. Execute the ability
state = executeAbility(state, faction, params);

// 2. Create Karama interrupt opportunity
state = createKaramaInterrupt(
  state,
  'cancel',
  faction,
  'ABILITY_NAME',
  { rollbackData: /* data needed to undo */ }
);

// 3. Collect responses from other factions
// This happens via agent responses to respond_to_karama_opportunity

// 4. Check if interrupted
if (state.karamaState?.interrupted) {
  const interruptor = state.karamaState.interruptor;

  // Rollback the ability using abilityContext
  state = rollbackAbility(state, state.karamaState.abilityContext);

  // Notify agents
  logAction(state, 'KARAMA_USED', interruptor, {
    targetFaction: faction,
    abilityName: 'ABILITY_NAME',
    result: 'cancelled'
  });
}

// 5. Clear interrupt state
state = clearKaramaInterrupt(state);
```

### Pattern for Preventable Abilities

When a faction *intends* to use an ability marked with ✷ before and after:

```typescript
// 1. Create Karama prevent opportunity BEFORE executing
state = createKaramaInterrupt(
  state,
  'prevent',
  faction,
  'ABILITY_NAME',
  { /* ability parameters */ }
);

// 2. Collect responses
// (same as above)

// 3. Check if prevented
if (state.karamaState?.interrupted) {
  // Don't execute the ability
  state = clearKaramaInterrupt(state);

  // Notify faction they must act without the ability
  logAction(state, 'KARAMA_USED', interruptor, {
    targetFaction: faction,
    abilityName: 'ABILITY_NAME',
    result: 'prevented'
  });

  return; // Skip ability execution
}

// 4. Clear interrupt and execute normally
state = clearKaramaInterrupt(state);
state = executeAbility(state, faction, params);
```

## Ability Metadata

Located in `src/lib/game/tools/actions/karama.ts`:

### KARAMA_CANCELLABLE_ABILITIES

Lists all abilities that can be cancelled or prevented:

**CANCEL_ONLY** (✷ after):
- BIDDING (Atreides: look at card)
- WORMSIGN (Atreides: look at spice deck)
- PRESCIENCE (Atreides: see battle plan element)
- VOICE (Bene Gesserit: command battle plan)
- PAYMENT_FOR_TREACHERY (Emperor: receive card payments)
- SARDAUKAR (Emperor: elite forces worth 2x) *Note: Actually preventable*
- MOVEMENT (Fremen: move 2 territories)
- SHAI_HULUD (Fremen: protected from sandworms)
- PAYMENT_FOR_SHIPMENT (Guild: receive shipment payments)
- CROSS_SHIP (Guild: ship between territories)
- OFF_PLANET_SHIPMENT (Guild: ship to reserves)
- HALF_PRICE_SHIPPING (Guild: pay half for shipment)
- CAPTURE_LEADER (Harkonnen: capture leaders)
- SPIRITUAL_ADVISORS (BG: free forces when others ship)
- INTRUSION (BG: flip to advisors on intrusion)
- TAKE_UP_ARMS (BG: flip to fighters when moving)
- WARTIME (BG: flip all advisors to fighters)

**PREVENT** (✷ before and after):
- KWISATZ_HADERACH (Atreides: +2 to leader)
- ALLIANCE_PRESCIENCE (Atreides ally: use prescience)
- ALLIANCE_VOICE (BG ally: use voice)
- CHARITY (BG: always get 2 spice minimum)
- ALLIANCE_REVIVAL (Emperor ally: revive 3 extra)
- ALLIANCE_PROTECT_FROM_WORMS (Fremen ally: protect from worms)
- ALLIANCE_HALF_PRICE (Guild ally: half price shipping)
- ALLIANCE_CROSS_SHIP (Guild ally: cross-ship)
- KARAMA_AS_WORTHLESS (BG: use worthless as Karama)

## Example Flow: Cancelling Atreides PRESCIENCE

### Step 1: Atreides Uses PRESCIENCE

```typescript
// In battle phase, before battle plans
const battle = state.battlePhase.currentBattle;
const atreidesPlayer = Faction.ATREIDES;

// Atreides uses prescience to see opponent's weapon
const revealed = opponentBattlePlan.weaponCardId;

// Create cancel opportunity
state = createKaramaInterrupt(
  state,
  'cancel',
  atreidesPlayer,
  'PRESCIENCE',
  {
    battleId: battle.territoryId,
    elementRevealed: 'weapon',
    revealedValue: revealed
  }
);
```

### Step 2: Collect Responses

```typescript
// Harkonnen (opponent) can respond
// Via agent tool: respond_to_karama_opportunity
{
  useKarama: true,
  karamaCardId: 'karama_1'
}

// Tool execution:
// 1. Validates Harkonnen has karama_1 in hand
// 2. Discards karama_1
// 3. Sets state.karamaState.interrupted = true
// 4. Sets state.karamaState.interruptor = Faction.HARKONNEN
```

### Step 3: Handle Interrupt

```typescript
// After all responses collected
if (state.karamaState?.interrupted) {
  // Atreides doesn't get to see the weapon
  // They must submit their battle plan without that knowledge

  // Log the event
  state = logAction(state, 'KARAMA_USED', Faction.HARKONNEN, {
    targetFaction: Faction.ATREIDES,
    abilityName: 'PRESCIENCE',
    elementHidden: 'weapon'
  });

  // Clear and continue
  state = clearKaramaInterrupt(state);
}
```

## Implementation Status

### ✅ Completed

1. **State Types**: KaramaInterruptState, KaramaResponse
2. **Mutations**: createKaramaInterrupt, clearKaramaInterrupt, helpers
3. **Tools**: All 3 Karama tools with validation
4. **Registry**: Karama tools available in all phases
5. **Factory**: karamaState initialized to null
6. **Metadata**: KARAMA_CANCELLABLE_ABILITIES lists

### ⚠️ To Do (Phase Handler Integration)

1. **Identify all ✷ abilities** in existing phase handlers
2. **Add interrupt opportunities** after cancellable abilities
3. **Add prevent opportunities** before preventable abilities
4. **Implement rollback logic** for cancelled abilities
5. **Update prompts** to inform agents about Karama opportunities
6. **Test interrupt flow** with AI agents

## Design Principles

### 1. **Explicit Over Implicit**

Karama opportunities are explicitly created in phase handlers, not automatically detected. This gives precise control over when interrupts can occur.

### 2. **First Interrupt Wins**

Once one faction uses Karama, subsequent responses are ignored. The `interrupted` flag short-circuits further processing.

### 3. **Context for Rollback**

Each interrupt carries `abilityContext` with data needed to undo the ability. This keeps rollback logic flexible.

### 4. **Tool-Based Responses**

Responses use the standard tool system, allowing AI agents to decide whether to interrupt just like any other action.

### 5. **Phase-Agnostic**

Karama tools are available in all phases because interrupts can happen at any time. The `karamaState` is phase-independent.

## Future Enhancements

### Advanced Rules

- **Faction Karama Powers**: Once-per-game special abilities
  - Atreides: Look at entire battle plan
  - Emperor: Free revival of 3 forces or 1 leader
  - Fremen: Place sandworm anywhere
  - Harkonnen: Swap hands with another player
  - Guild: Cancel one opponent's shipment
  - BG: Already has worthless-as-Karama

### UI Considerations

In a UI version, Karama interrupts would trigger:
1. A popup for all eligible factions
2. A timer (10-30 seconds to respond)
3. Simultaneous response collection
4. First response processed immediately

### Agent Considerations

AI agents should:
1. Evaluate the value of the ability being interrupted
2. Consider their Karama/worthless card availability
3. Weigh opportunity cost (Karama might be more valuable later)
4. Factor in faction relationships (ally vs enemy)

## References

- **Rules Source**: `/landsraad-rules.md` lines 66, 200-220
- **Card Definition**: `src/lib/game/data/treachery-cards.ts`
- **State Types**: `src/lib/game/types/state.ts`
- **Mutations**: `src/lib/game/state/mutations.ts`
- **Tools**: `src/lib/game/tools/actions/karama.ts`
- **Registry**: `src/lib/game/tools/registry.ts`
