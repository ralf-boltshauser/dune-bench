# Test State Creation Guide

## Overview

**YES, this is absolutely possible!** You can:
- ✅ Create game states with specific factions
- ✅ Give factions specific cards, spice, forces
- ✅ Place forces in specific territories
- ✅ Run isolated phase tests
- ✅ Mock agent responses
- ✅ Skip setup phase and jump to any phase

---

## 1. Creating Test States

### Basic State Creation

```typescript
import { createGameState } from '@/lib/game/state';
import { Faction, Phase, TerritoryId } from '@/lib/game/types';

// Create a 4-faction game
let state = createGameState({
  factions: [
    Faction.ATREIDES,
    Faction.BENE_GESSERIT,
    Faction.FREMEN,
    Faction.HARKONNEN,
  ],
  maxTurns: 10,
  advancedRules: true, // Enable spice dialing, etc.
});
```

### What `createGameState` Gives You

- ✅ All factions with starting spice
- ✅ All leaders in pool
- ✅ Starting treachery cards dealt
- ✅ Forces in starting positions
- ✅ Empty traitor arrays (selected during setup)
- ✅ Game starts in `Phase.SETUP`

---

## 2. Manipulating State for Testing

### A. Setting Spice

```typescript
import { addSpice, removeSpice, getFactionState } from '@/lib/game/state';

// Give Atreides 20 spice
state = addSpice(state, Faction.ATREIDES, 20);

// Remove all spice from Harkonnen
const harkonnenState = getFactionState(state, Faction.HARKONNEN);
state = removeSpice(state, Faction.HARKONNEN, harkonnenState.spice);

// Set exact spice amount
state = removeSpice(state, Faction.FREMEN, getFactionState(state, Faction.FREMEN).spice);
state = addSpice(state, Faction.FREMEN, 15); // Now has exactly 15
```

### B. Adding Specific Cards to Hands

```typescript
import { drawTreacheryCard, getFactionState } from '@/lib/game/state';
import { getTreacheryCardDefinition } from '@/lib/game/data';

// Method 1: Draw from deck (random)
state = drawTreacheryCard(state, Faction.ATREIDES);

// Method 2: Direct manipulation (for specific cards)
const factionState = getFactionState(state, Faction.ATREIDES);
const cardDef = getTreacheryCardDefinition('crysknife'); // or any card ID
if (cardDef) {
  factionState.hand.push({
    definitionId: cardDef.id,
    type: cardDef.type,
  });
  // Remove from deck if needed
  const deckIndex = state.treacheryDeck.findIndex(c => c.definitionId === cardDef.id);
  if (deckIndex >= 0) {
    state.treacheryDeck.splice(deckIndex, 1);
  }
}
```

### C. Placing Forces in Territories

```typescript
import { shipForces, moveForces } from '@/lib/game/state';
import { TerritoryId } from '@/lib/game/types';

// Ship forces from reserves to territory
state = shipForces(
  state,
  Faction.ATREIDES,
  TerritoryId.ARRAKEEN, // Territory
  9,                    // Sector
  10,                    // Regular forces
  2                      // Elite forces (optional)
);

// Move forces between territories
state = moveForces(
  state,
  Faction.FREMEN,
  TerritoryId.ARRAKEEN,
  9,                     // From sector
  TerritoryId.CARTHAG,
  5,                     // To sector
  5                      // Count
);
```

### D. Setting Up Leaders

```typescript
import { getFactionState, markLeaderUsed, returnLeaderToPool } from '@/lib/game/state';
import { LeaderLocation } from '@/lib/game/types';

// Get a specific leader
const atreidesState = getFactionState(state, Faction.ATREIDES);
const leader = atreidesState.leaders.find(l => l.definitionId === 'paul-atreides');

// Mark leader as used (on board)
if (leader) {
  state = markLeaderUsed(state, Faction.ATREIDES, leader.definitionId, TerritoryId.ARRAKEEN);
}

// Return leader to pool
state = returnLeaderToPool(state, Faction.ATREIDES, leader.definitionId);
```

### E. Adding Traitor Cards

```typescript
import { getFactionState } from '@/lib/game/state';

// Give Atreides a traitor card for Harkonnen's leader
const atreidesState = getFactionState(state, Faction.ATREIDES);
atreidesState.traitors.push({
  leaderId: 'rabban-harkonnen', // Harkonnen leader ID
  faction: Faction.HARKONNEN,
});
```

### F. Setting Up Spice on Board

```typescript
import { addSpiceToTerritory } from '@/lib/game/state';

// Add 20 spice to Arrakeen sector 9
state = addSpiceToTerritory(state, TerritoryId.ARRAKEEN, 9, 20);
```

### G. Setting Up Alliances

```typescript
import { formAlliance } from '@/lib/game/state';

// Form alliance between Atreides and Fremen
state = formAlliance(state, Faction.ATREIDES, Faction.FREMEN);
```

### H. Setting Up Special Faction States

```typescript
import { getFactionState } from '@/lib/game/state';

// Activate Kwisatz Haderach (Atreides)
const atreidesState = getFactionState(state, Faction.ATREIDES);
if (atreidesState.kwisatzHaderach) {
  atreidesState.kwisatzHaderach.isActive = true;
  atreidesState.kwisatzHaderach.forcesLostCount = 15; // Needs 15+ to activate
}

// Set Bene Gesserit prediction
const bgState = getFactionState(state, Faction.BENE_GESSERIT);
if (bgState.beneGesseritPrediction) {
  bgState.beneGesseritPrediction.faction = Faction.ATREIDES;
  bgState.beneGesseritPrediction.turn = 5;
}
```

---

## 3. Running Isolated Phase Tests

### Using PhaseManager

```typescript
import { PhaseManager, MockAgentProvider } from '@/lib/game/phases';
import { BattlePhaseHandler } from '@/lib/game/phases/handlers/battle';
import { Phase } from '@/lib/game/types';

// Create mock agent provider
const agentProvider = new MockAgentProvider('pass'); // or 'first_valid'

// Create phase manager
const phaseManager = new PhaseManager(agentProvider);

// Register only the phase you want to test
phaseManager.registerHandlers([
  new BattlePhaseHandler(),
]);

// Set state to battle phase
state.phase = Phase.BATTLE;
state.turn = 1;

// Run the phase
const result = await phaseManager.runPhase(state);

// Check results
console.log('Phase complete:', result.phaseComplete);
console.log('Next phase:', result.nextPhase);
console.log('Events:', result.events);
```

### Direct Handler Testing

```typescript
import { BattlePhaseHandler } from '@/lib/game/phases/handlers/battle';
import { MockAgentProvider } from '@/lib/game/phases';

// Create handler
const handler = new BattlePhaseHandler();

// Initialize phase
const initResult = handler.initialize(state);

// Process steps manually
let currentState = state;
let responses: AgentResponse[] = [];

while (!initResult.phaseComplete) {
  // Get pending requests
  const stepResult = handler.processStep(currentState, responses);
  
  if (stepResult.pendingRequests.length > 0) {
    // Get agent responses (mocked)
    responses = await agentProvider.getResponses(
      stepResult.pendingRequests,
      stepResult.simultaneousRequests || false
    );
  } else {
    // Phase complete
    break;
  }
  
  currentState = stepResult.state;
}
```

---

## 4. Mocking Agent Responses

### Basic Mocking

```typescript
import { MockAgentProvider } from '@/lib/game/phases';

// Create provider with default behavior
const provider = new MockAgentProvider('pass'); // Always passes

// Or use 'first_valid' to pick first valid action
const provider2 = new MockAgentProvider('first_valid');
```

### Queueing Specific Responses

```typescript
// Queue specific responses for specific request types
provider.queueResponse('CREATE_BATTLE_PLAN', {
  factionId: Faction.ATREIDES,
  actionType: 'CREATE_BATTLE_PLAN',
  data: {
    leaderId: 'paul-atreides',
    forcesDialed: 5,
    weaponCardId: 'crysknife',
    defenseCardId: 'shield',
    spiceDialed: 5,
  },
  passed: false,
});

provider.queueResponse('USE_PRESCIENCE', {
  factionId: Faction.ATREIDES,
  actionType: 'USE_PRESCIENCE',
  data: {
    target: 'weapon',
  },
  passed: false,
});

provider.queueResponse('USE_VOICE', {
  factionId: Faction.BENE_GESSERIT,
  actionType: 'USE_VOICE',
  data: {
    command: {
      type: 'not_play',
      cardType: 'poison_weapon',
    },
  },
  passed: false,
});
```

---

## 5. Complete Battle Phase Test Example

```typescript
import { createGameState } from '@/lib/game/state';
import { 
  shipForces, 
  addSpice, 
  addSpiceToTerritory,
  getFactionState,
  formAlliance,
} from '@/lib/game/state';
import { BattlePhaseHandler } from '@/lib/game/phases/handlers/battle';
import { MockAgentProvider } from '@/lib/game/phases';
import { Faction, Phase, TerritoryId } from '@/lib/game/types';

async function testBattlePhaseAllFactions() {
  console.log('='.repeat(80));
  console.log('BATTLE PHASE TEST: All Factions with Special Abilities');
  console.log('='.repeat(80));

  // 1. Create game state
  let state = createGameState({
    factions: [
      Faction.ATREIDES,
      Faction.BENE_GESSERIT,
      Faction.FREMEN,
      Faction.HARKONNEN,
    ],
    advancedRules: true, // Enable spice dialing
  });

  // 2. Skip setup phase - set phase to BATTLE
  state.phase = Phase.BATTLE;
  state.turn = 1;
  state.setupComplete = true; // Mark setup as complete

  // 3. Set up spice
  state = addSpice(state, Faction.ATREIDES, 20);
  state = addSpice(state, Faction.BENE_GESSERIT, 15);
  state = addSpice(state, Faction.FREMEN, 10);
  state = addSpice(state, Faction.HARKONNEN, 25);

  // 4. Place forces in Arrakeen to create battles
  // Atreides vs Harkonnen
  state = shipForces(state, Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, 10, 0);
  state = shipForces(state, Faction.HARKONNEN, TerritoryId.ARRAKEEN, 9, 8, 2);
  
  // Bene Gesserit vs Fremen (in different sector)
  state = shipForces(state, Faction.BENE_GESSERIT, TerritoryId.ARRAKEEN, 10, 5, 0);
  state = shipForces(state, Faction.FREMEN, TerritoryId.ARRAKEEN, 10, 6, 3); // 3 Fedaykin

  // 5. Add spice to territories
  state = addSpiceToTerritory(state, TerritoryId.ARRAKEEN, 9, 15);
  state = addSpiceToTerritory(state, TerritoryId.ARRAKEEN, 10, 10);

  // 6. Give specific cards (simplified - would need deck manipulation)
  // For now, we'll let them draw from deck

  // 7. Activate Kwisatz Haderach (Atreides)
  const atreidesState = getFactionState(state, Faction.ATREIDES);
  if (atreidesState.kwisatzHaderach) {
    atreidesState.kwisatzHaderach.isActive = true;
  }

  // 8. Set up traitor cards
  const bgState = getFactionState(state, Faction.BENE_GESSERIT);
  bgState.traitors.push({
    leaderId: 'paul-atreides',
    faction: Faction.ATREIDES,
  });

  // 9. Create mock agent provider with responses
  const provider = new MockAgentProvider('pass');
  
  // Queue battle plan responses
  provider.queueResponse('CREATE_BATTLE_PLAN', {
    factionId: Faction.ATREIDES,
    actionType: 'CREATE_BATTLE_PLAN',
    data: {
      leaderId: 'paul-atreides',
      forcesDialed: 5,
      weaponCardId: null,
      defenseCardId: 'shield',
      useKwisatzHaderach: true,
      spiceDialed: 5,
    },
    passed: false,
  });

  provider.queueResponse('CREATE_BATTLE_PLAN', {
    factionId: Faction.HARKONNEN,
    actionType: 'CREATE_BATTLE_PLAN',
    data: {
      leaderId: 'rabban-harkonnen',
      forcesDialed: 4,
      weaponCardId: 'lasgun',
      defenseCardId: null,
      spiceDialed: 4,
    },
    passed: false,
  });

  // Queue prescience response
  provider.queueResponse('USE_PRESCIENCE', {
    factionId: Faction.ATREIDES,
    actionType: 'USE_PRESCIENCE',
    data: {
      target: 'weapon',
    },
    passed: false,
  });

  // Queue voice response
  provider.queueResponse('USE_VOICE', {
    factionId: Faction.BENE_GESSERIT,
    actionType: 'USE_VOICE',
    data: {
      command: {
        type: 'not_play',
        cardType: 'poison_weapon',
      },
    },
    passed: false,
  });

  // 10. Create battle phase handler
  const handler = new BattlePhaseHandler();

  // 11. Initialize phase
  console.log('\n--- Initializing Battle Phase ---');
  const initResult = handler.initialize(state);
  console.log('Pending battles:', initResult.events.find(e => e.type === 'BATTLES_IDENTIFIED'));

  // 12. Process phase steps
  let currentState = initResult.state;
  let responses: AgentResponse[] = [];
  let stepCount = 0;
  const maxSteps = 50; // Safety limit

  while (!initResult.phaseComplete && stepCount < maxSteps) {
    stepCount++;
    console.log(`\n--- Step ${stepCount} ---`);
    
    const stepResult = handler.processStep(currentState, responses);
    currentState = stepResult.state;

    // Log events
    stepResult.events.forEach(event => {
      console.log(`Event: ${event.type} - ${event.message}`);
    });

    if (stepResult.phaseComplete) {
      console.log('Phase complete!');
      break;
    }

    if (stepResult.pendingRequests.length > 0) {
      console.log(`Pending requests: ${stepResult.pendingRequests.length}`);
      stepResult.pendingRequests.forEach(req => {
        console.log(`  - ${req.factionId}: ${req.requestType}`);
      });

      // Get agent responses
      responses = await provider.getResponses(
        stepResult.pendingRequests,
        stepResult.simultaneousRequests || false
      );
    } else {
      responses = [];
    }
  }

  // 13. Verify results
  console.log('\n--- Final State ---');
  const finalAtreides = getFactionState(currentState, Faction.ATREIDES);
  const finalHarkonnen = getFactionState(currentState, Faction.HARKONNEN);
  
  console.log(`Atreides spice: ${finalAtreides.spice}`);
  console.log(`Harkonnen spice: ${finalHarkonnen.spice}`);
  console.log(`Atreides forces in Arrakeen:`, 
    finalAtreides.forces.onBoard.find(f => f.territoryId === TerritoryId.ARRAKEEN)?.forces
  );
  console.log(`Harkonnen forces in Arrakeen:`,
    finalHarkonnen.forces.onBoard.find(f => f.territoryId === TerritoryId.ARRAKEEN)?.forces
  );

  console.log('\n' + '='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));
}

// Run test
testBattlePhaseAllFactions().catch(console.error);
```

---

## 6. Helper Functions for Test State Creation

Create a test utilities file:

```typescript
// src/lib/game/test-utils.ts

import { GameState, Faction, TerritoryId, Phase } from './types';
import { 
  createGameState, 
  shipForces, 
  addSpice, 
  addSpiceToTerritory,
  getFactionState,
} from './state';

export interface TestBattleSetup {
  aggressor: Faction;
  defender: Faction;
  territory: TerritoryId;
  aggressorForces: number;
  defenderForces: number;
  aggressorElite?: number;
  defenderElite?: number;
  aggressorSpice?: number;
  defenderSpice?: number;
  territorySpice?: number;
}

export function createBattleTestState(
  setup: TestBattleSetup
): GameState {
  let state = createGameState({
    factions: [setup.aggressor, setup.defender],
    advancedRules: true,
  });

  // Set phase
  state.phase = Phase.BATTLE;
  state.turn = 1;
  state.setupComplete = true;

  // Set spice
  if (setup.aggressorSpice !== undefined) {
    state = addSpice(state, setup.aggressor, setup.aggressorSpice);
  }
  if (setup.defenderSpice !== undefined) {
    state = addSpice(state, setup.defender, setup.defenderSpice);
  }

  // Place forces
  state = shipForces(
    state,
    setup.aggressor,
    setup.territory,
    9, // Default sector
    setup.aggressorForces,
    setup.aggressorElite || 0
  );
  state = shipForces(
    state,
    setup.defender,
    setup.territory,
    9,
    setup.defenderForces,
    setup.defenderElite || 0
  );

  // Add territory spice
  if (setup.territorySpice !== undefined) {
    state = addSpiceToTerritory(state, setup.territory, 9, setup.territorySpice);
  }

  return state;
}

// Usage:
const testState = createBattleTestState({
  aggressor: Faction.ATREIDES,
  defender: Faction.HARKONNEN,
  territory: TerritoryId.ARRAKEEN,
  aggressorForces: 10,
  defenderForces: 8,
  aggressorElite: 0,
  defenderElite: 2,
  aggressorSpice: 20,
  defenderSpice: 15,
  territorySpice: 20,
});
```

---

## 7. Key Points

### ✅ What You CAN Do

1. **Create states with any factions** - `createGameState({ factions: [...] })`
2. **Manipulate spice** - `addSpice()`, `removeSpice()`
3. **Place forces** - `shipForces()`, `moveForces()`
4. **Add cards** - Direct manipulation of `factionState.hand`
5. **Set up leaders** - Direct manipulation of `factionState.leaders`
6. **Add traitors** - Direct manipulation of `factionState.traitors`
7. **Set special states** - Direct manipulation (KH, BG prediction, etc.)
8. **Run isolated phases** - Use `PhaseManager` or direct handler
9. **Mock agent responses** - `MockAgentProvider` with queued responses
10. **Skip setup** - Set `state.phase` and `state.setupComplete = true`

### ⚠️ Limitations

1. **Cards are dealt randomly** - You need to manually manipulate `hand` array for specific cards
2. **Traitors are selected during setup** - You need to manually add them for tests
3. **Some state requires setup phase** - But you can skip it and set things manually
4. **Agent responses need to be queued** - Can't dynamically generate complex responses

### 💡 Best Practices

1. **Create helper functions** - Wrap common test setups
2. **Use TypeScript** - Type safety for test states
3. **Log everything** - Use `console.log` to track state changes
4. **Verify assertions** - Check expected vs actual state
5. **Isolate tests** - Each test should be independent
6. **Use descriptive names** - Make test intent clear

---

## Summary

**YES, you can absolutely create test states!** The system is designed for it:

- ✅ State mutations are pure functions (easy to test)
- ✅ Phase handlers are isolated (can test individually)
- ✅ Mock agent provider exists (can simulate any response)
- ✅ State is fully mutable (can set up any scenario)

The key is using the mutation functions (`addSpice`, `shipForces`, etc.) to build up your test state, then running the phase handler directly with mocked agent responses.

