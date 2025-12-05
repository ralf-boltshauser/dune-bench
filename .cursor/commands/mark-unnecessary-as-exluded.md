Mark the current rule as intentionally excluded from implementation coverage.

If, after inspecting the rule from `get-next-rule`, you decide it **should not be modeled in code** (purely physical setup, table UX, meta/tournament procedure, etc.):
- Add an entry for its `id` to `src/lib/game/rules/index/rule-exclusions.json` under `exclude`, with a short but clear `reason`.
- Keep the `id` format consistent with the rule index (e.g. `\"1.02.03\"`).
- Save the file and, if helpful, run `pnpm rule-coverage:visual` or `pnpm rules:missing` to confirm it disappeared from the missing list.

Only use this when you're confident the engine truly does not (and should not) represent this rule in code.


