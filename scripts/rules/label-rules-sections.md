# Rule Labeling Sections

This document lists all sections that need to be processed for rule labeling/exclusion.

Each section should be processed as a separate job using the `tag-or-exclude-rule` task type.

## Section Format

Sections are identified by their major number pattern:
- `0` - Setup rules
- `1.00` - Phase rules intro
- `1.01` - Storm Phase
- `1.02` - Spice Blow Phase
- `1.03` - CHOAM Charity Phase
- `1.04` - Bidding Phase
- `1.05` - Revival Phase
- `1.06` - Shipment and Movement Phase
- `1.07` - Battle Phase
- `1.08` - Spice Collection Phase
- `1.09` - Mentat Pause Phase
- `1.10` - Alliances
- `1.11` - Secrecy
- `1.12` - Deals and Bribes
- `1.13` - Advanced Game
- `1.14` - Faction Karama Power
- `2.01` - Atreides faction
- `2.02` - Bene Gesserit faction
- `2.03` - Emperor faction
- `2.04` - Fremen faction
- `2.05` - Harkonnen faction
- `2.06` - Spacing Guild faction
- `3.01` - Treachery Card List

## Job Assignment

Create one job per section (23 total sections):

1. **Section 0** - Setup rules (0.00 - 0.16)
2. **Section 1.00** - Phase rules intro (1.00.00 - 1.00.05)
3. **Section 1.01** - Storm Phase (1.01.00 - 1.01.04)
4. **Section 1.02** - Spice Blow Phase (1.02.00 - 1.02.06)
5. **Section 1.03** - CHOAM Charity Phase (1.03.00 - 1.03.02)
6. **Section 1.04** - Bidding Phase (1.04.00 - 1.04.XX)
7. **Section 1.05** - Revival Phase (1.05.00 - 1.05.XX)
8. **Section 1.06** - Shipment and Movement Phase (1.06.00 - 1.06.XX)
9. **Section 1.07** - Battle Phase (1.07.00 - 1.07.XX)
10. **Section 1.08** - Spice Collection Phase (1.08.00 - 1.08.XX)
11. **Section 1.09** - Mentat Pause Phase (1.09.00 - 1.09.XX)
12. **Section 1.10** - Alliances (1.10.00 - 1.10.XX)
13. **Section 1.11** - Secrecy (1.11.00 - 1.11.XX)
14. **Section 1.12** - Deals and Bribes (1.12.00 - 1.12.XX)
15. **Section 1.13** - Advanced Game (1.13.00 - 1.13.XX)
16. **Section 1.14** - Faction Karama Power (1.14.00 - 1.14.XX)
17. **Section 2.01** - Atreides (2.01.00 - 2.01.XX)
18. **Section 2.02** - Bene Gesserit (2.02.00 - 2.02.XX)
19. **Section 2.03** - Emperor (2.03.00 - 2.03.XX)
20. **Section 2.04** - Fremen (2.04.00 - 2.04.XX)
21. **Section 2.05** - Harkonnen (2.05.00 - 2.05.XX)
22. **Section 2.06** - Spacing Guild (2.06.00 - 2.06.XX)
23. **Section 3.01** - Treachery Card List (3.01.00 - 3.01.XX)

## Processing Instructions

For each section:

1. Use `get-next-rule-in-section` with the section identifier (e.g., "1.01")
2. Process each rule in the section using `label-or-exclude-rule`
3. Continue until all rules in the section are either:
   - Tagged with `@rule` annotation (if fully implemented)
   - Excluded in `rule-exclusions.json` (if not implemented or partial)
4. Verify coverage: `pnpm rule-coverage` should show updated stats

## Important Notes

- **Only fully implemented rules get tagged** - Partial implementations don't count
- **Never implement missing functionality** - Only label existing code or exclude
- **Clear exclusion reasons** - Explain why rule is not modeled or why partial implementation doesn't count
- **One section at a time** - Complete a section before moving to the next

