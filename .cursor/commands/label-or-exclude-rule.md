Label a rule as implemented OR exclude it from coverage. **DO NOT implement missing functionality.**

## Critical Rules

1. **Only fully implemented rules get tagged** - Partial implementations don't count
2. **If not fully implemented, exclude it** - Add to rule-exclusions.json with clear reason
3. **Never implement missing functionality** - This task is ONLY for labeling/excluding existing code

## Decision Process

For the current rule (from `get-next-rule-in-section`):

### Step 1: Check Implementation Status

Use `pnpm get-rule-status <rule-id>` to see:
- Is there an existing `@rule` annotation?
- Is there code that implements this rule?
- Is the implementation complete?

### Step 2: Make Decision

**Option A: Fully Implemented → Tag It**
- Search codebase for the implementation
- Verify it fully covers the rule requirements
- Add `// @rule <rule-id>` or `/** @rule <rule-id> */` annotation
- Place at function level, close to the implementation

**Option B: Not Implemented / Partial → Exclude It**
- If rule is not modeled in code (meta/setup/social procedure)
- If implementation is partial/incomplete
- Add to `src/lib/game/rules/index/rule-exclusions.json`:
  ```json
  {
    "id": "<rule-id>",
    "reason": "Clear reason why not modeled in code or why partial implementation doesn't count"
  }
  ```

**Option C: Already Tagged → Skip**
- If rule already has `@rule` annotation, move to next rule

### Step 3: Verify

After tagging or excluding:
- Run `pnpm rule-coverage` to verify the change
- Rule should no longer appear in missing list (if excluded) or should show as implemented (if tagged)

## Examples

**Tagging:**
```typescript
// @rule 1.06.03
function handleShipment(state: GameState, action: ShipmentAction) {
  // Implementation...
}
```

**Excluding:**
```json
{
  "id": "0.15",
  "reason": "Physical setup step (placing turn marker). Engine tracks turn number in gameState.turn - this rule describes initial physical component placement, not runtime behavior."
}
```

## Important Notes

- **Never implement new code** - Only tag existing implementations
- **Be strict about "fully implemented"** - If a rule has 3 requirements and only 2 are implemented, exclude it
- **Clear exclusion reasons** - Explain why it's not modeled or why partial implementation doesn't count
- **One rule at a time** - Process completely before moving to next

