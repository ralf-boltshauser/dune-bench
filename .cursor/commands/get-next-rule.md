Get the next rule that needs implementation.

Run `pnpm rules:missing` to see the first few missing rules. Pick the first one that makes sense to work on.

Display the rule ID and use `pnpm get-rule-status <rule-id>` to show its current status, including:
- Rule definition and context from the markdown files
- Whether it's already implemented or tested
- Any existing annotations

This gives us the target rule to work on next.

