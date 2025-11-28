# Phase Test Creation Guide

## Overview

Your goal is to create comprehensive test suites for a specific game phase. Tests should write detailed log files for manual review (NOT automated assertions). The logs capture all agent requests, responses, events, state changes, and tool calls so you can manually validate correctness.

**IMPORTANT**: Always start by reading the handwritten rules for your phase in `handwritten-rules/{your-phase}.md`. This is the source of truth for how the phase should work.

## Your Task

1. **Investigate your assigned phase** - Find the nitty-gritty difficulties:
   - Special cards (Karama cards, special treachery cards)
   - Faction abilities
   - Edge cases
   - Complex interactions
   - Rule nuances

2. **Design test scenarios** - Create scenarios that force difficult situations to play out

3. **Write a test plan document** - Document what you want to test and why

4. **Implement tests** - Use the battle phase test infrastructure as a template

5. **Run and validate** - Ensure tests run correctly and produce useful logs

## Phase Assignment

You will be assigned one of these phases:
- `STORM` - Storm movement and player positioning
- `BIDDING` - Treachery card bidding (Karama cards, special abilities)
- `SPICE_BLOW` - Spice blow and collection
- `SHIPMENT_MOVEMENT` - Force shipment and movement (extra movement cards, special abilities)
- `BATTLE` - Battle phase (already done, use as reference)
- `SPICE_COLLECTION` - Spice collection from territories
- `REVIVAL` - Leader and force revival
- `CHOAM_CHARITY` - CHOAM charity phase
- `MENTAT_PAUSE` - Mentat pause phase

## Step-by-Step Instructions

### Step 1: Investigate Your Phase

1. **Read the handwritten rules for your phase**:
   - **CRITICAL**: Read the handwritten rules file for your phase:
     - `STORM` → `handwritten-rules/1_storm.md`
     - `SPICE_BLOW` → `handwritten-rules/2_spice-blow.md`
     - `CHOAM_CHARITY` → `handwritten-rules/3_choam.md`
     - `BIDDING` → `handwritten-rules/4_bidding.md`
     - `REVIVAL` → `handwritten-rules/5_revival.md`
     - `SHIPMENT_MOVEMENT` → `handwritten-rules/6_shipment-movement.md`
     - `BATTLE` → `handwritten-rules/7_battle.md`
     - `SPICE_COLLECTION` → `handwritten-rules/8_spice-collection.md`
     - `MENTAT_PAUSE` → `handwritten-rules/9_mentat-pause.md`
   - This contains the official game rules for your phase
   - Look for special cards, faction abilities, edge cases, rule nuances
   - Understand all the mechanics and interactions
   - Also check `handwritten-rules/treachery-cards.md` for card-specific rules

2. **Read the phase handler**:
   - Location: `src/lib/game/phases/handlers/{your-phase}.ts`
   - Understand how the rules are implemented
   - Understand the flow, sub-phases, agent requests
   - Compare implementation with handwritten rules

3. **Read other relevant rules**:
   - Check `handwritten-rules/` directory for related rules
   - Look for cross-phase interactions
   - Check for variant rules or special cases

4. **Identify difficult scenarios**:
   - Special cards (e.g., Karama cards in bidding)
   - Faction abilities (e.g., Fremen extra movement)
   - Edge cases (e.g., multiple factions, alliances)
   - Complex interactions (e.g., card combos, ability chains)

4. **Document your findings**:
   - Create `research/{your-phase}/difficult-scenarios.md`
   - List each difficult scenario with:
     - What makes it difficult
     - What rules/cards/abilities are involved
     - What you want to test

### Step 2: Write Test Plan

Create `research/{your-phase}/test-plan.md` with:

```markdown
# {Phase Name} Test Plan

## Test Scenarios

### Scenario 1: {Name}
**Goal**: Test {specific difficulty}
**Setup**:
- Factions: {list}
- Special cards: {list}
- Special abilities: {list}
- Expected flow: {describe}

### Scenario 2: {Name}
...
```

### Step 3: Set Up Test Infrastructure

1. **Create test directory**:
   ```
   src/lib/game/phase-tests/{your-phase}/
   ├── README.md
   ├── test-{your-phase}.ts
   ├── helpers/
   │   ├── test-state-builder.ts (can reuse from battle)
   │   └── agent-response-builder.ts (phase-specific)
   └── scenarios/
       ├── base-scenario.ts
       └── {scenario-name}.ts
   ```

2. **Use global test logger**:
   ```typescript
   import { TestLogger } from '../helpers/test-logger';
   
   const logger = new TestLogger(
     'My Test Scenario',
     'bidding', // phase name for log directory
   );
   ```

3. **Follow battle phase pattern**:
   - Look at `src/lib/game/phase-tests/battle/` as reference
   - Adapt the structure for your phase

### Step 4: Implement Test Scenarios

For each scenario in your test plan:

1. **Create scenario file** in `scenarios/`:
   ```typescript
   import { buildTestState } from '../helpers/test-state-builder';
   import { AgentResponseBuilder } from '../helpers/agent-response-builder';
   import { runPhaseScenario } from './base-scenario';
   
   export async function testMyScenario() {
     // Build test state with specific setup
     const state = buildTestState({
       factions: [Faction.ATREIDES, Faction.HARKONNEN],
       // ... force difficult scenario
     });
     
     // Queue agent responses
     const responses = new AgentResponseBuilder();
     responses.queueBid(Faction.ATREIDES, 5);
     // ...
     
     // Run scenario - log file automatically created
     return await runPhaseScenario(
       state,
       responses,
       'My Test Scenario',
       'bidding' // phase name
     );
   }
   ```

2. **Use test state builder**:
   - Reuse `TestStateBuilder` from battle tests or create phase-specific version
   - Set up state to force your difficult scenario

3. **Create agent response builder**:
   - Create phase-specific methods (e.g., `queueBid`, `queueShipment`)
   - Queue responses in the order they'll be requested

### Step 5: Create Base Scenario Runner

Create `scenarios/base-scenario.ts`:

```typescript
import { YourPhaseHandler } from '../../../phases/handlers/{your-phase}';
import { MockAgentProvider } from '../../../phases/phase-manager';
import { TestLogger } from '../../helpers/test-logger';
import type { GameState } from '../../../types';
import type { AgentResponse } from '../../../phases/types';

export interface ScenarioResult {
  state: GameState;
  events: Array<{ type: string; message: string }>;
  stepCount: number;
  completed: boolean;
  error?: Error;
}

export async function runPhaseScenario(
  state: GameState,
  responseBuilder: AgentResponseBuilder,
  scenarioName: string,
  phaseName: string,
  maxSteps: number = 100
): Promise<ScenarioResult> {
  const handler = new YourPhaseHandler();
  const provider = new MockAgentProvider('pass');
  const logger = new TestLogger(scenarioName, phaseName);
  
  // Log initial state
  logger.logState(0, 'Initial State', state);
  
  // Load responses into provider
  const responses = responseBuilder.getResponses();
  for (const [requestType, responseList] of responses.entries()) {
    for (const response of responseList) {
      provider.queueResponse(requestType, response);
    }
  }

  // Initialize phase
  const initResult = handler.initialize(state);
  
  // Log initialization events
  initResult.events.forEach(event => {
    logger.logEvent(0, {
      type: event.type,
      message: event.message,
      data: event.data,
    });
  });
  
  const events: Array<{ type: string; message: string }> = [];
  let currentState = initResult.state;
  let responsesQueue: AgentResponse[] = [];
  let stepCount = 0;
  let phaseComplete = initResult.phaseComplete;

  // Process steps
  while (!phaseComplete && stepCount < maxSteps) {
    stepCount++;
    
    // Log pending requests
    if (stepCount === 1 && initResult.pendingRequests.length > 0) {
      initResult.pendingRequests.forEach(req => {
        logger.logRequest(stepCount, handler['context']?.subPhase, {
          factionId: req.factionId,
          requestType: req.requestType,
          prompt: req.prompt,
          context: req.context,
          availableActions: req.availableActions,
        });
      });
    }
    
    const stepResult = handler.processStep(currentState, responsesQueue);
    currentState = stepResult.state;
    phaseComplete = stepResult.phaseComplete;

    // Log responses
    responsesQueue.forEach(response => {
      logger.logResponse(stepCount, {
        factionId: response.factionId,
        actionType: response.actionType,
        data: response.data,
        passed: response.passed,
      });
    });

    // Log events
    stepResult.events.forEach(event => {
      events.push({
        type: event.type,
        message: event.message,
      });
      logger.logEvent(stepCount, {
        type: event.type,
        message: event.message,
        data: event.data,
      });
    });

    // Log pending requests for next step
    if (stepResult.pendingRequests.length > 0) {
      stepResult.pendingRequests.forEach(req => {
        logger.logRequest(stepCount + 1, handler['context']?.subPhase, {
          factionId: req.factionId,
          requestType: req.requestType,
          prompt: req.prompt,
          context: req.context,
          availableActions: req.availableActions,
        });
      });
    }

    // Log state snapshot periodically
    if (stepCount % 5 === 0 || phaseComplete) {
      logger.logState(stepCount, `After step ${stepCount}`, currentState);
    }

    if (phaseComplete) {
      logger.logState(stepCount, 'Final State', currentState);
      logger.logInfo(stepCount, 'Phase completed successfully');
      
      const result = {
        state: currentState,
        events,
        stepCount,
        completed: true,
      };
      
      logger.writeLog(result);
      return result;
    }

    if (stepResult.pendingRequests.length > 0) {
      responsesQueue = await provider.getResponses(
        stepResult.pendingRequests,
        stepResult.simultaneousRequests || false
      );
    } else {
      responsesQueue = [];
    }
  }

  const result = {
    state: currentState,
    events,
    stepCount,
    completed: stepCount < maxSteps,
    error: stepCount >= maxSteps ? new Error('Max steps reached') : undefined,
  };

  if (stepCount >= maxSteps) {
    logger.logError(stepCount, 'Max steps reached', { maxSteps });
  }

  logger.writeLog(result);
  return result;
}
```

### Step 6: Create Main Test Runner

Create `test-{your-phase}.ts`:

```typescript
import { testScenario1 } from './scenarios/scenario1';
import { testScenario2 } from './scenarios/scenario2';

async function runAllTests() {
  console.log('='.repeat(80));
  console.log('{PHASE NAME} PHASE TEST SUITE');
  console.log('='.repeat(80));
  
  try {
    await testScenario1();
  } catch (error) {
    console.error('Scenario 1 failed:', error);
  }
  
  try {
    await testScenario2();
  } catch (error) {
    console.error('Scenario 2 failed:', error);
  }
  
  console.log('\n✅ All tests completed. Check test-logs/{your-phase}/ for log files.');
}

if (require.main === module) {
  runAllTests().catch(console.error);
}
```

### Step 7: Add npm Script

Add to `package.json`:
```json
"test:{your-phase}": "tsx src/lib/game/phase-tests/{your-phase}/test-{your-phase}.ts"
```

### Step 8: Run and Validate

1. **Run your tests**:
   ```bash
   pnpm test:{your-phase}
   ```

2. **Check log files**:
   - Location: `test-logs/{your-phase}/`
   - Review each log file manually
   - Validate that:
     - Difficult scenarios are actually triggered
     - Special cards/abilities work correctly
     - State changes are correct
     - Events fire in right order
     - Rules are followed

3. **Fix issues**:
   - If tests don't run: Fix setup/response queueing
   - If scenarios don't trigger: Adjust state setup
   - If logs are incomplete: Add more logging

## Example: Bidding Phase

**First step**: Read `handwritten-rules/4_bidding.md` to understand:
- Official bidding rules
- Karama card mechanics
- Faction abilities
- Edge cases

**Difficult scenarios to test**:
1. Karama card to buy treachery card at any time
2. Multiple factions bidding on same card
3. Faction abilities affecting bidding
4. Passing and re-entering bidding

**Test setup**:
- Create state with multiple factions
- Give one faction a Karama card
- Queue responses for bidding, Karama usage, etc.

## Reference Files

- **Handwritten rules** (READ THIS FIRST!):
  - Your phase file: See Step 1 above for exact filename
  - `handwritten-rules/treachery-cards.md` - Card-specific rules
- Battle phase tests: `src/lib/game/phase-tests/battle/` (use as template)
- Test logger: `src/lib/game/phase-tests/helpers/test-logger.ts` (global, use this)
- Test state builder: `src/lib/game/phase-tests/battle/helpers/test-state-builder.ts`
- Phase handlers: `src/lib/game/phases/handlers/`

## Deliverables

1. ✅ `research/{your-phase}/difficult-scenarios.md` - Investigation results
2. ✅ `research/{your-phase}/test-plan.md` - Test plan document
3. ✅ `src/lib/game/phase-tests/{your-phase}/` - Complete test infrastructure
4. ✅ Working tests that produce log files
5. ✅ `package.json` script to run tests

## Communication & Reporting

### When You're Done

Create a completion report at `research/{your-phase}/completion-report.md`:

```markdown
# {Phase Name} Test Suite - Completion Report

## Status
✅ Complete / ⚠️ Partial / ❌ Blocked

## What Was Created
- [ ] Investigation document (`difficult-scenarios.md`)
- [ ] Test plan (`test-plan.md`)
- [ ] Test infrastructure (`src/lib/game/phase-tests/{your-phase}/`)
- [ ] npm script in `package.json`
- [ ] Working tests that produce log files

## Test Scenarios Implemented
1. {Scenario name} - {Brief description}
2. {Scenario name} - {Brief description}
...

## Log Files Generated
- `test-logs/{your-phase}/{scenario-name}-{timestamp}.log`
- ...

## Issues Encountered
- {Any problems you ran into}
- {What you couldn't complete and why}

## Questions or Help Needed
- {Any questions for the main agent}
- {Areas where you need clarification}

## Validation Notes
- {Notes about what to check in the log files}
- {What makes each scenario difficult}
```

### If You Get Stuck

1. **Document the issue** in your completion report
2. **Explain what you tried** and where you're blocked
3. **Ask specific questions** about what you need help with
4. **Continue with what you can** - partial completion is better than nothing

### File Locations Summary

All your work should be in:
- Investigation: `research/{your-phase}/`
- Tests: `src/lib/game/phase-tests/{your-phase}/`
- Logs: `test-logs/{your-phase}/` (auto-generated)
- Scripts: `package.json` (add test script)

## Questions to Answer

- What makes your phase difficult to test?
- What special cards/abilities need testing?
- What edge cases exist?
- How do you force difficult scenarios to occur?
- Are your log files comprehensive enough for manual review?

Good luck! 🚀

