# Write Tests for Rules

This command guides the process of writing comprehensive rule tests for a specific rule section (e.g., `1.03.xx`, `1.04.xx`).

## Process

### 1. List All Rules That Need Tests

Use the rule coverage utility to identify implemented but untested rules:

```bash
pnpm rule-needs-tests --prefix=1.03
```

This shows:
- Rules that are **implemented** (have `@rule` annotations)
- Rules that are **not excluded** (in `rule-exclusions.json`)
- Rules that are **missing tests** (no `@rule-test` annotations)

### 2. Deeply Understand Each Rule

For each rule that needs tests:

1. **Read the rule text** from `numbered_rules/1.md` (or appropriate file) please list all rules and all aspects of each rule.
2. **Find the implementation** using `@rule` annotations:
   ```bash
   pnpm get-rule-status 1.03.01
   ```
3. **Analyze the implementation** to understand:
   - What the rule does
   - What edge cases exist
   - What the rule explicitly forbids/allows
   - What state changes occur
   - What events/requests are generated
4. **Ensure the annotation is specific**
5. - Make sure the annotation is not a broad header function but sits right in the function that implements the rule.

### 3. Define Test Cases

For each rule, identify test cases that cover:

- **Happy path**: Normal operation when rule applies
- **Edge cases**: Boundary conditions, empty states, etc.
- **Guard clauses**: When rule should NOT apply (wrong turn, wrong phase, etc.)
- **State invariants**: What state must be true before/after rule execution
- **Side effects**: Events emitted, context updated, state mutated

### 4. Write Test Cases

Create a test file in `src/lib/game/rules/__rule-tests__/` following the pattern:

- **File naming**: `{rule-id}.{descriptive-name}.test.ts` (e.g., `1.03.01.choam-charity-collection.test.ts`)
- **Structure**:
  ```typescript
  /**
   * Rule test: {rule-id} {RULE NAME}
   *
   * Rule text (numbered_rules/1.md):
   * "{exact rule text}"
   *
   * @rule-test {rule-id}
   */
  
  // Minimal console-based test harness
  // Direct function calls (no agents)
  // Multiple test functions per rule
  // Clear assertions with ✓/✗ output
  ```

- **Pattern**: Follow `1.02.01.blow-the-spice.test.ts` as a template

### 5. Test and Verify

Run the test suite:

```bash
pnpm test
```

Verify:
- All tests pass
- Output is clear and readable
- Each test function exercises a distinct aspect of the rule

### 6. Check Coverage

Re-run the coverage check:

```bash
pnpm rule-needs-tests --prefix=1.03
```

Verify that the rule no longer appears in the "missing tests" list.

### 7. Iterate

Repeat steps 2-6 for each remaining rule until:

```bash
pnpm rule-needs-tests --prefix=1.03
```

Shows: `✅ No rules currently in state "implemented but not tested" for prefix 1.03.`

## Example Workflow

```bash
# Step 1: List missing tests
pnpm rule-needs-tests --prefix=1.03

# Step 2: Understand a specific rule
pnpm get-rule-status 1.03.01

# Step 3-4: Write test file
# Create: src/lib/game/rules/__rule-tests__/1.03.01.choam-charity-collection.test.ts

# Step 5: Run tests
pnpm test

# Step 6: Verify coverage
pnpm rule-needs-tests --prefix=1.03

# Step 7: Continue with next rule...
```

## Notes

- **Excluded rules** (in `rule-exclusions.json`) are automatically filtered out
- **Phase intro rules** (like `1.03.00`) are typically excluded as descriptive/introductory
- **Test files are auto-discovered** by `run-all-rule-tests.ts` - no manual registration needed
- **Each test file should be self-contained** - direct function calls, no agent dependencies
- **Multiple tests per rule** are encouraged - one test per distinct behavior/edge case
