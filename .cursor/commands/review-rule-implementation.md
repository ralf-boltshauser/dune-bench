Review the current implementation status of the target rule.

Use `pnpm get-rule-status <rule-id>` to check:
- If the rule is already implemented (look for @rule annotations)
- If the rule is already tested (look for @rule-test annotations)
- Where the implementation might exist in the codebase
- What the rule actually requires based on the markdown definitions

Search the codebase to see if there's existing code that implements this rule but just lacks the annotation. Check related functions and phase handlers.

Determine if we need to implement it, just add the annotation, or explicitly mark it as not modeled in code.

If the rule is purely meta/organizational, or intentionally not represented in code (for example tournament procedures or social/table agreements), add it to `src/lib/game/rules/index/rule-exclusions.json` under `exclude` with its `id` and a short `reason`, so it is excluded from coverage.

