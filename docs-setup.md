# Documentation Structure

This document explains where all project documentation should be organized.

## Directory Structure

All documentation files (except `README.md` and `docs-setup.md` in root) should be placed in `.notes/` subdirectories:

```
.notes/
├── architecture/          # System architecture, design decisions, refactoring
├── implementation/       # Feature implementation details and summaries
├── testing/              # Test guides, test infrastructure, verification docs
│   └── test-outputs/     # Test output files and logs (.txt files)
├── bugs/                 # Bug reports and fixes
├── agent-communication/  # Cursor prompts, agent communication docs
└── analysis/             # Analysis documents, checklists, plans
```

## Categories

### `.notes/architecture/`
- System architecture documents
- Refactoring summaries
- Design decisions
- Examples: `STREAMING_ARCHITECTURE.md`, `KARAMA_SYSTEM_ARCHITECTURE.md`, `REFACTORING_SUMMARY.md`

### `.notes/implementation/`
- Feature implementation details
- Implementation summaries
- Usage examples
- Examples: `*_IMPLEMENTATION.md`, `*_PLAN.md`, `*_SUMMARY.md`

### `.notes/testing/`
- Test infrastructure documentation
- Test guides and examples
- Verification summaries
- Test results
- Examples: `TEST_STATE_CREATION_GUIDE.md`, `*_VERIFICATION.md`, `*_TEST_INFRASTRUCTURE.md`

### `.notes/testing/test-outputs/`
- Test output files and logs (`.txt` files)
- Test execution results
- Examples: `*-test-*.txt`, `*-test-output.txt`

### `.notes/bugs/`
- Bug reports
- Bug fix documentation
- Examples: `*_BUG_REPORT.md`, `*_FIXES.md`, `*_FIX.md`

### `.notes/agent-communication/`
- Cursor prompts
- Agent communication patterns
- Examples: `cursor-prompts.md`, `CLAUDE.md`

### `.notes/analysis/`
- Analysis documents
- Checklists
- Phase analysis
- Examples: `*_ANALYSIS.md`, `*_CHECKLIST.md`, `*_PLAN.md` (if not implementation)

## Rules

1. **Keep docs short** - Documentation files should be concise
2. **Use descriptive names** - File names should clearly indicate content
3. **Root level** - Only `README.md` and `docs-setup.md` should remain in root
4. **Subdirectories** - Use subdirectories in `.notes/` for better organization when needed
5. **Test outputs** - All test output `.txt` files should go in `.notes/testing/test-outputs/`

## Existing Documentation Locations

- `dune-rules/` - Game rules documentation (includes `landsraad-rules.md`, keep as-is)
- `handwritten-rules/` - Handwritten rules (keep as-is)
- `research/` - Research documents (keep as-is)
- `src/lib/game/phase-tests/battle/README.md` - Test-specific docs (keep as-is)

