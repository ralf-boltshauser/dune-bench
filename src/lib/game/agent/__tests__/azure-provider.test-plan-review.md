# Azure Provider Test Plan Review

## Review Against Codebase and Requirements

### ✅ Well Covered Areas

1. **Agent Creation** - Comprehensive coverage of all factions
2. **Tool Provider Setup** - Good coverage of initialization and state management
3. **Response Processing** - Covers all response formats and parsing
4. **State Synchronization** - Covers both sequential and simultaneous modes
5. **Error Handling** - Comprehensive error scenarios
6. **Configuration** - Good coverage of defaults and overrides

### ⚠️ Areas Needing Enhancement

#### 1. Multi-Step Decision Making (Critical)

**Missing from test plan:**
- ✅ Verify `stopWhen: stepCountIs(10)` is passed to generateText
- ✅ Test that agents can make up to 10 tool calls in sequence
- ✅ Test that 11th step is stopped correctly
- ✅ Test multi-step workflow (view → analyze → action)
- ✅ Test that tool calls from multiple steps are all logged
- ✅ Test that last tool call is used for response (not first)

**Why important:** The system prompt explicitly mentions "up to 10 LLM calls" and the code uses `stopWhen: stepCountIs(10)`. This is a critical feature that must be tested.

#### 2. Phase-Specific Tool Availability

**Missing from test plan:**
- ✅ Verify `getToolsForCurrentPhase()` returns correct tools for each phase
- ✅ Test that tools change when phase changes
- ✅ Test that information tools are always available
- ✅ Test that Karama tools are available in all phases
- ✅ Test phase-specific tools (e.g., STORM tools only in STORM phase)

**Why important:** The codebase has `PHASE_TOOLS` mapping that determines which tools are available. This is critical for agent behavior.

#### 3. Faction-Specific Prompt Differences

**Partially covered, but needs enhancement:**
- ✅ Verify each faction gets correct faction-specific prompt
- ✅ Verify faction name is included correctly
- ✅ Test that prompts are different for each faction
- ❌ **MISSING:** Verify prompts include faction-specific abilities (e.g., Fremen free placement, Atreides prescience)
- ❌ **MISSING:** Verify prompts match faction prompt constants

**Why important:** Faction prompts contain critical strategic information that affects agent behavior.

#### 4. GameId Consistency

**Missing from test plan:**
- ✅ Verify gameId is stored at creation time
- ✅ Verify gameId is used for streaming configuration
- ✅ Verify gameId is used in event emission
- ✅ Test that gameId doesn't change after state updates
- ❌ **MISSING:** Test gameId consistency across multiple requests

**Why important:** The code explicitly stores gameId "to ensure consistency" - this should be verified.

#### 5. Console Warning Suppression

**Partially covered, but needs enhancement:**
- ✅ Verify warnings are suppressed during generateText
- ✅ Verify warnings are restored after generateText
- ❌ **MISSING:** Test that only schema warnings are suppressed (not all warnings)
- ❌ **MISSING:** Test that other warnings still appear
- ❌ **MISSING:** Test restore function is called even on error

**Why important:** The suppression is specific to schema warnings - other warnings should still work.

#### 6. Tool Call Logging

**Partially covered, but needs enhancement:**
- ✅ Verify tool calls are logged
- ❌ **MISSING:** Test that ALL tool calls are logged (not just last one)
- ❌ **MISSING:** Test logging with multiple steps
- ❌ **MISSING:** Test logging with no tool calls

**Why important:** The code logs each tool call in a loop - should verify all are logged.

#### 7. Event Emission Timing

**Needs enhancement:**
- ✅ AGENT_THINKING emitted before generateText
- ✅ AGENT_DECISION emitted after response parsed
- ❌ **MISSING:** Test event emission order (THINKING → DECISION)
- ❌ **MISSING:** Test events not emitted on error (or verify error handling)

**Why important:** Events are used for real-time updates - timing matters.

#### 8. Request Processing Edge Cases

**Missing:**
- ❌ Test with empty request array
- ❌ Test with duplicate faction requests
- ❌ Test with invalid requestType
- ❌ Test with missing context fields
- ❌ Test timeout handling (if implemented)
- ❌ Test urgent flag handling (if implemented)

#### 9. Refactored Module Integration

**Needs explicit testing:**
- ✅ Test that prompt-builder is used correctly
- ✅ Test that response-handler is used correctly
- ✅ Test that state-sync is used correctly
- ✅ Test that error-handler is used correctly
- ✅ Test that console-suppress is used correctly
- ✅ Test that faction-agent is used correctly
- ❌ **MISSING:** Test that all modules work together correctly
- ❌ **MISSING:** Test module boundaries (no direct access to internals)

#### 10. Tool Result Data Merging

**Needs enhancement:**
- ✅ Test tool input merged with result data
- ✅ Test result data takes precedence
- ❌ **MISSING:** Test with empty tool input
- ❌ **MISSING:** Test with empty tool result
- ❌ **MISSING:** Test with conflicting keys
- ❌ **MISSING:** Test nested data structures

### 🔍 Alignment with Handwritten Rules

**Good alignment:**
- ✅ Tests don't need to verify game rules (that's tool provider's job)
- ✅ Tests focus on agent provider behavior, not game logic
- ✅ Tests verify agent can make decisions (as per system prompt)

**No conflicts found** - The test plan correctly focuses on the provider infrastructure, not game rules enforcement.

### 📋 Recommended Additions to Test Plan

#### Add to Section 3 (Agent Response Processing):

**3.5 Multi-Step Decision Making**
- ✅ generateText called with `stopWhen: stepCountIs(10)`
- ✅ Agent can make up to 10 tool calls
- ✅ 11th step is stopped
- ✅ All tool calls from all steps are logged
- ✅ Last tool call determines response
- ✅ Multi-step workflow works (view → analyze → action)

**3.6 Phase-Specific Tools**
- ✅ Tools retrieved match current phase
- ✅ Tools change when phase changes
- ✅ Information tools always available
- ✅ Karama tools available in all phases
- ✅ Phase-specific tools only in correct phase

#### Add to Section 9 (Prompt Building):

**9.3 Faction-Specific Content**
- ✅ Prompt includes faction-specific abilities
- ✅ Prompt matches faction prompt constant
- ✅ Different factions get different content
- ✅ Faction name correctly formatted

#### Add to Section 11 (Integration Tests):

**11.4 Multi-Step Workflow**
- ✅ Agent makes multiple tool calls in sequence
- ✅ All steps are processed correctly
- ✅ Response uses last tool call
- ✅ All tool calls are logged

**11.5 Phase Transitions**
- ✅ Tools update when phase changes
- ✅ Agent can still respond after phase change
- ✅ State sync works across phase changes

**11.6 GameId Consistency**
- ✅ gameId consistent across all operations
- ✅ gameId used in streaming config
- ✅ gameId used in events
- ✅ gameId doesn't change

### ✅ Test Plan Strengths

1. **Comprehensive coverage** of core functionality
2. **Good negative test cases** for error scenarios
3. **Clear organization** by functionality
4. **Good mocking strategy** outlined
5. **Edge cases considered** (empty maps, missing agents, etc.)

### 📝 Final Recommendations

1. **Add multi-step testing** - This is a critical feature
2. **Add phase-specific tool testing** - Important for correctness
3. **Enhance prompt testing** - Verify faction-specific content
4. **Add gameId consistency tests** - Explicitly mentioned in code
5. **Enhance console suppression tests** - Verify specificity
6. **Add tool result merging edge cases** - Important for data correctness
7. **Add integration tests for refactored modules** - Verify they work together

### Overall Assessment

**Status:** ✅ Good foundation, needs enhancements

The test plan covers the core functionality well but is missing some important details:
- Multi-step decision making (critical feature)
- Phase-specific tool availability
- Enhanced prompt verification
- GameId consistency
- More edge cases for data merging

**Recommendation:** Add the missing test cases before implementation to ensure comprehensive coverage.

