# Rule Labeling Workflow

This document describes the workflow for systematically labeling or excluding rules in the codebase.

## Overview

The `tag-or-exclude-rule` task type is designed to:
- **Tag fully implemented rules** with `@rule` annotations
- **Exclude rules** that are not implemented or only partially implemented
- **Never implement missing functionality** - only label existing code

## Task Type

The task type is defined in `.csa/task-types.json`:

```json
"tag-or-exclude-rule": [
  "get-next-rule-in-section",
  "label-or-exclude-rule"
]
```

## Commands

### 1. `get-next-rule-in-section`

Gets the next unlabeled rule in a specific section.

**Usage**: Process rules section by section (e.g., "0", "1.01", "2.04")

**Process**:
1. Identify the section identifier
2. Find unlabeled rules using `pnpm rules:missing` filtered by section
3. Get rule status: `pnpm get-rule-status <rule-id>`
4. Display rule ID, definition, and current status

### 2. `label-or-exclude-rule`

Labels a rule as implemented OR excludes it from coverage.

**Critical Rules**:
1. **Only fully implemented rules get tagged** - Partial implementations don't count
2. **If not fully implemented, exclude it** - Add to `rule-exclusions.json`
3. **Never implement missing functionality** - Only label existing code

**Decision Process**:
- **Fully Implemented** → Add `@rule` annotation
- **Not Implemented / Partial** → Add to `rule-exclusions.json`
- **Already Tagged** → Skip

## Section Breakdown

Work is split into 23 sections:

1. Section 0 - Setup rules
2. Section 1.00 - Phase rules intro
3. Section 1.01 - Storm Phase
4. Section 1.02 - Spice Blow Phase
5. Section 1.03 - CHOAM Charity Phase
6. Section 1.04 - Bidding Phase
7. Section 1.05 - Revival Phase
8. Section 1.06 - Shipment and Movement Phase
9. Section 1.07 - Battle Phase
10. Section 1.08 - Spice Collection Phase
11. Section 1.09 - Mentat Pause Phase
12. Section 1.10 - Alliances
13. Section 1.11 - Secrecy
14. Section 1.12 - Deals and Bribes
15. Section 1.13 - Advanced Game
16. Section 1.14 - Faction Karama Power
17. Section 2.01 - Atreides
18. Section 2.02 - Bene Gesserit
19. Section 2.03 - Emperor
20. Section 2.04 - Fremen
21. Section 2.05 - Harkonnen
22. Section 2.06 - Spacing Guild
23. Section 3.01 - Treachery Card List

See `label-rules-sections.md` for complete list.

## Processing a Section

For each section:

1. **Start**: Use `get-next-rule-in-section` with section identifier (e.g., "1.01")
2. **Process**: For each rule in the section:
   - Use `label-or-exclude-rule` to decide: tag or exclude
   - Continue until all rules are processed
3. **Verify**: Run `pnpm rule-coverage` to see updated stats
4. **Complete**: Section is done when all rules are either tagged or excluded

## Examples

### Tagging a Rule

```typescript
// @rule 1.06.03
function handleShipment(state: GameState, action: ShipmentAction) {
  // Fully implemented shipment logic
}
```

### Excluding a Rule

```json
{
  "id": "0.15",
  "reason": "Physical setup step (placing turn marker). Engine tracks turn number in gameState.turn - this rule describes initial physical component placement, not runtime behavior."
}
```

## Important Notes

- **Be strict about "fully implemented"** - If a rule has multiple requirements and only some are implemented, exclude it
- **Clear exclusion reasons** - Explain why rule is not modeled or why partial implementation doesn't count
- **One section at a time** - Complete a section before moving to the next
- **Never implement** - This workflow is ONLY for labeling/excluding, not implementing

## Verification

After processing a section:

```bash
pnpm rule-coverage
```

Should show:
- Updated implementation coverage
- Rules no longer in missing list (if excluded)
- Rules showing as implemented (if tagged)

