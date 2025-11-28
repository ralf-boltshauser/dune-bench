# Bug Finding Guide for Agents

## Your Mission

Research and find **one bug** in this codebase. Focus on finding real, actionable bugs that violate game rules, break functionality, or cause incorrect behavior.

## Codebase Context

This is **dune-bench**, a Next.js implementation of the GF9 Dune board game where AI agents (Claude) play different factions. The codebase is ~18,000 lines of TypeScript with:

- **9 Phase Handlers**: Storm, Spice Blow, CHOAM Charity, Bidding, Revival, Shipment & Movement, Battle, Spice Collection, Mentat Pause
- **Comprehensive Test Suites**: Each phase has test infrastructure in `src/lib/game/phase-tests/`
- **Authoritative Rules**: Game rules in `handwritten-rules/` directory
- **State Management**: Immutable state with queries and mutations
- **Tool-Based AI**: Agents interact via structured tools

## Where to Look for Bugs

### 1. Phase Handlers (High Priority)
- `src/lib/game/phases/handlers/` - Each phase handler implements game logic
- **Known Issues**: Shipment & Movement phase has 6 critical bugs (see `.notes/bugs/SHIPMENT_MOVEMENT_BUG_REPORT.md`)
- Compare implementation against rules in `handwritten-rules/`

### 2. Rule Validation
- `src/lib/game/rules/` - Rule validation logic
- Check if rules correctly enforce game constraints
- Look for missing validations or incorrect logic

### 3. State Mutations
- `src/lib/game/state/mutations.ts` - State update logic
- Check for incorrect state updates, missing fields, or type mismatches

### 4. Tools (Actions)
- `src/lib/game/tools/actions/` - Actions agents can take
- Verify tools correctly modify state and enforce rules
- Check for missing validations or incorrect calculations

### 5. Test Files
- `src/lib/game/phase-tests/` - Test scenarios
- Look for tests that might reveal bugs or missing functionality
- Check if test expectations match actual game rules

## How to Find Bugs

### Step 1: Choose Your Focus Area
Pick ONE area to investigate deeply:
- A specific phase handler
- A specific rule system (movement, combat, bidding, etc.)
- A specific faction ability
- A specific tool/action

### Step 2: Read the Rules
1. Find relevant rule file in `handwritten-rules/`
2. Understand what the rules say should happen
3. Note any special cases, edge cases, or complex interactions

### Step 3: Read the Implementation
1. Find the relevant code file(s)
2. Trace through the logic step by step
3. Compare against the rules

### Step 4: Look for Discrepancies
- Does the code do what the rules say?
- Are there missing validations?
- Are there incorrect calculations?
- Are there edge cases not handled?
- Are there type mismatches or incorrect state updates?

### Step 5: Verify Your Finding
- Can you create a test case that demonstrates the bug?
- Is it a real bug or just unclear code?
- Is it already documented in `.notes/bugs/`?

## Documentation Requirements

**CRITICAL**: You MUST document your findings in `.notes/agent-communication/` so they can be reviewed later!

### Create a Report File

Create a file: `.notes/agent-communication/bug-finding-report-{your-focus}.md`

Include:
1. **Summary**: One-line description of the bug
2. **Severity**: Critical / High / Medium / Low
3. **Location**: File path and line numbers
4. **Rule Reference**: Which rule(s) are violated
5. **Expected Behavior**: What should happen per rules
6. **Actual Behavior**: What actually happens
7. **Impact**: Who/what is affected
8. **Steps to Reproduce**: How to trigger the bug
9. **Suggested Fix**: How to fix it (if you have ideas)
10. **Code Evidence**: Relevant code snippets

### Example Report Structure

```markdown
# Bug Finding Report: [Focus Area]

**Date**: [Date]
**Agent**: [Your identifier]
**Focus**: [What you investigated]

## Bug Found

### Bug Title
**Severity**: [Critical/High/Medium/Low]
**Location**: `src/lib/game/...`
**Rule Reference**: [Rule number or description]

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happens]

**Impact**:
[Who/what is affected]

**Steps to Reproduce**:
1. ...
2. ...

**Code Evidence**:
[Code snippets showing the bug]

**Suggested Fix**:
[How to fix it]
```

## Important Notes

1. **Focus on ONE bug**: Don't try to find everything. Deep investigation of one area is better than shallow investigation of many.

2. **Quality over Quantity**: A well-documented, verified bug is worth more than multiple unverified issues.

3. **Check Existing Documentation**: 
   - Review `.notes/bugs/` to avoid duplicates
   - Review `.notes/agent-communication/` to see what others found
   - Review `.notes/agent-communication/exploration-summary.md` for known issues

4. **Use the Test Infrastructure**: If you find a bug, consider creating a test case that demonstrates it (if time permits).

5. **Be Specific**: Vague bug reports are not helpful. Include file paths, line numbers, and specific examples.

## Resources

- **Rules**: `handwritten-rules/` - Authoritative game rules
- **Known Bugs**: `.notes/bugs/` - Existing bug reports
- **Architecture**: `.notes/architecture/` - Architecture decisions
- **Exploration Reports**: `.notes/agent-communication/` - Previous agent findings
- **Test Logs**: `test-logs/` - Execution logs that might reveal issues

## Success Criteria

You've successfully completed your mission if:
1. ✅ You found ONE real bug
2. ✅ You documented it clearly in `.notes/agent-communication/bug-finding-report-{focus}.md`
3. ✅ Your report includes all required sections
4. ✅ The bug is verifiable and actionable

Good luck! 🐛
