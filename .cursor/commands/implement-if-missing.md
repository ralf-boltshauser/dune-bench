Implement the rule if it's missing from the codebase.

If the rule is not implemented **and should be represented in code**:
- Read the rule definition from the markdown files to understand what it requires
- Find the appropriate place in the codebase to implement it (phase handlers, rules modules, etc.)
- Implement the functionality following existing code patterns
- Ensure it integrates properly with the game state and phase flow
- Ensure you implement it as it's own function. I don't want 10 rule annotations for the same function.

If the rule is intentionally *not* modeled in code (for example: purely meta procedure, table UX, or something enforced outside the engine), add it to `src/lib/game/rules/index/rule-exclusions.json` under `exclude` with its `id` and a clear `reason`, so coverage tools ignore it.

If the rule is already implemented but just missing the annotation, skip to adding the annotation in the next step.

Don't add the @rule annotation yet - that's the next step.

