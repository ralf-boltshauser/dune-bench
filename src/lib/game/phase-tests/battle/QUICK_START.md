# Battle Phase Tests - Quick Start

## Philosophy

**Tests write detailed log files for manual review.** The goal is NOT automated assertions, but to capture everything that happens so you can manually validate correctness.

## Running Tests

```bash
# Run all battle phase tests
pnpm test:battle

# Run specific scenario
pnpm test:battle:stronghold    # Atreides vs Bene Gesserit
pnpm test:battle:multi         # Fremen vs Harkonnen vs Emperor
```

## Log Files

After running, check:
```
test-logs/battle/
├── stronghold-battle-YYYY-MM-DDTHH-MM-SS.log
└── multi-faction-battle-YYYY-MM-DDTHH-MM-SS.log
```

Each log contains:
- Every agent request and response
- All phase events with full data
- State snapshots at key points
- Step-by-step execution flow
- Final state summary

## Reviewing Logs

When reviewing a log file, manually check:

1. ✅ **Battle Identification**: Correctly identified?
2. ✅ **Agent Requests**: Proper format and context?
3. ✅ **Agent Responses**: Match requests correctly?
4. ✅ **State Changes**: Mutations are correct?
5. ✅ **Event Ordering**: Events fire in right sequence?
6. ✅ **Rule Compliance**: Game rules followed?
7. ✅ **Edge Cases**: Special cases handled?

## Test Scenarios

### 1. Stronghold Battle
- **Factions**: Atreides vs Bene Gesserit
- **Location**: Arrakeen (stronghold)
- **Check in logs**:
  - Prescience usage and reveals
  - Voice commands
  - Battle plan submission
  - Winner determination
  - Card discard choices

### 2. Multi-Faction Battle
- **Factions**: Fremen vs Harkonnen vs Emperor
- **Location**: Great Flat (sand territory)
- **Check in logs**:
  - Elite forces (Fedaykin) handling
  - Battle Hardened (no spice needed)
  - Leader capture mechanics
  - Multiple battles processing
  - Aggressor battle choices

## Adding New Tests

1. **Create scenario file** in `scenarios/`:
   ```typescript
   export async function testMyScenario() {
     const state = buildTestState({ /* ... */ });
     const responses = new AgentResponseBuilder();
     responses.queueBattlePlan(Faction.ATREIDES, { /* ... */ });
     
     // Log file automatically created with this name
     return await runBattleScenario(
       state,
       responses,
       'My Test Scenario'
     );
   }
   ```

2. **Run and review log**:
   ```bash
   pnpm test:battle:my
   # Check test-logs/battle/my-test-scenario-*.log
   ```

3. **Manually validate** the log file for correctness

## Example

```typescript
import { buildTestState } from '../helpers/test-state-builder';
import { AgentResponseBuilder } from '../helpers/agent-response-builder';
import { runBattleScenario } from './base-scenario';

export async function testMyScenario() {
  // Build test state
  const state = buildTestState({
    factions: [Faction.ATREIDES, Faction.HARKONNEN],
    forces: [/* ... */],
    spice: getDefaultSpice(),
  });

  // Queue agent responses
  const responses = new AgentResponseBuilder();
  responses.queueBattleChoice(Faction.ATREIDES, TerritoryId.ARRAKEEN, Faction.HARKONNEN, 9);
  responses.queueBattlePlan(Faction.ATREIDES, {
    leaderId: 'paul-atreides',
    forcesDialed: 5,
    // ...
  });

  // Run - log file automatically written
  return await runBattleScenario(
    state,
    responses,
    'My Test Scenario' // Used for log filename
  );
}
```

## What Gets Logged

- ✅ All agent requests (prompt, context, available actions)
- ✅ All agent responses (action type, data, passed status)
- ✅ All phase events (type, message, data)
- ✅ State snapshots (factions, forces, leaders, spice, etc.)
- ✅ Step information (sub-phase, pending requests)
- ✅ Errors (with stack traces and context)
