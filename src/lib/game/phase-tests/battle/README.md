# Battle Phase Test Suite

Comprehensive test suite for the refactored battle phase handler.

## Structure

```
battle/
├── fixtures/              # Reusable test data and configurations
│   ├── test-data.ts       # Shared constants (leaders, cards, territories)
│   ├── battle-scenarios.ts # Common battle setups
│   ├── faction-setups.ts  # Faction-specific configurations
│   └── storm-patterns.ts  # Storm pattern configurations
│
├── builders/              # Composable state builders
│   └── battle-state-builder.ts  # Battle-specific state builder
│
├── assertions/            # Assertion library
│   ├── battle-assertions.ts    # Core assertions (existing)
│   ├── state-assertions.ts     # State validation assertions
│   └── event-assertions.ts     # Event-specific assertions
│
├── helpers/               # Test utilities (existing)
│   ├── test-state-builder.ts   # Base state builder
│   ├── agent-response-builder.ts # Response mocking
│   └── decision-agent-provider.ts # Agent provider
│
├── scenarios/             # Scenario runners (existing)
│   └── base-scenario.ts   # Base scenario runner
│
└── suites/                # Organized test suites
    ├── 01-identification/     # Battle identification tests
    ├── 02-sub-phases/         # Sub-phase execution tests
    ├── 03-battle-plans/       # Battle plan validation tests
    ├── 04-resolution/         # Battle resolution tests
    ├── 05-events/             # Event emission tests
    └── 06-agent-handling/      # Agent request/response tests
```

## Usage

### Running Tests

```bash
# Run all battle tests
npm test -- battle

# Run specific suite
npm test -- battle/suites/01-identification

# Run specific test file
npm test -- battle/suites/01-identification/test-basic-detection
```

### Writing New Tests

#### 1. Use Fixtures for Test Data

```typescript
import { BattleScenarios } from '../fixtures/battle-scenarios';

const scenario = BattleScenarios.twoFaction.basic(
  Faction.ATREIDES,
  Faction.HARKONNEN
);
```

#### 2. Use Builders for State Creation

```typescript
import { BattleStateBuilder } from '../builders/battle-state-builder';

const state = new BattleStateBuilder()
  .twoFactionBattle(Faction.ATREIDES, Faction.HARKONNEN)
  .withDefaultSpice()
  .withAlliance(Faction.ATREIDES, Faction.BENE_GESSERIT)
  .build();
```

#### 3. Use Assertions Library

```typescript
import {
  assertEventOccurred,
  assertForcesCount,
  assertFactionSpice,
} from '../assertions';

const assertions = [
  assertEventOccurred('BATTLE_RESOLVED'),
  assertForcesCount(Faction.ATREIDES, TerritoryId.ARRAKEEN, 5, 0),
  assertFactionSpice(Faction.ATREIDES, 25),
];
```

## Test Categories

### Suite 01: Battle Identification
- Basic battle detection
- Storm separation
- Stronghold occupancy
- Multiple battles
- Universal Stewards rule

### Suite 02: Sub-Phase Execution
- Sub-phase sequence
- Voice sub-phase
- Prescience sub-phase
- Battle plans sub-phase
- Reveal sub-phase
- Traitor call sub-phase
- Resolution sub-phase

### Suite 03: Battle Plans Validation
- Forces dialed validation
- Leader/Cheap Hero validation
- Treachery cards validation
- Spice dialing
- Prescience commitment
- Voice command

### Suite 04: Battle Resolution
- Basic resolution
- Weapon/defense interactions
- Elite forces
- Traitor resolution
- Lasgun-shield explosion
- Kwisatz Haderach

### Suite 05: Event Emission
- Phase start events
- Battle flow events
- Post-resolution events
- Phase end events

### Suite 06: Agent Handling
- Battle choice requests
- Voice requests
- Prescience requests
- Battle plans requests
- Traitor call requests
- Response validation

## Best Practices

1. **Use Fixtures**: Don't duplicate test data
2. **Compose Builders**: Chain builder methods for complex states
3. **Reuse Assertions**: Use assertion library, don't write custom checks
4. **Organize by Category**: Put tests in appropriate suite
5. **Document Test Intent**: Clear test names and comments

## Adding New Tests

1. Identify the appropriate suite
2. Create or update test file in that suite
3. Use fixtures and builders
4. Use assertion library
5. Import test file in suite's `index.ts`

## Test Coverage Goals

- ✅ Core functionality: 100%
- ✅ Edge cases: 95%+
- ✅ Module-specific: 100%
- ✅ Negative tests: 90%+
