Get the next unlabeled rule in a specific section.

## Usage

This command is used when processing rules in batches by section (e.g., "0", "1.01", "1.02", "2.04", etc.).

## Process

1. **Identify the section**: The section identifier (e.g., "0", "1.01", "2.04")
2. **Find unlabeled rules**: Use `pnpm rules:missing` and filter for rules in this section
3. **Get rule status**: For the first unlabeled rule, run `pnpm get-rule-status <rule-id>`
4. **Display**: Show the rule ID, definition, and current status

## Section Format

- `0` - Setup rules (0.00 - 0.16)
- `1.01` - Storm Phase (1.01.00 - 1.01.04)
- `1.02` - Spice Blow Phase (1.02.00 - 1.02.06)
- `1.03` - CHOAM Charity Phase
- `1.04` - Bidding Phase
- `1.05` - Revival Phase
- `1.06` - Shipment and Movement Phase
- `1.07` - Battle Phase
- `1.08` - Spice Collection Phase
- `1.09` - Mentat Pause Phase
- `1.10` - Alliances
- `1.11` - Bribes
- `1.12` - Deals
- `1.13` - Advanced Rules
- `1.14` - Advanced Rules (continued)
- `2.01` - Atreides faction
- `2.02` - Bene Gesserit faction
- `2.03` - Emperor faction
- `2.04` - Fremen faction
- `2.05` - Harkonnen faction
- `2.06` - Spacing Guild faction
- `3.01` - Treachery Card List

## Output

Display:
- Rule ID
- Full rule text from numbered_rules
- Current implementation status (implemented/tested/excluded/missing)
- Whether it's already annotated

This prepares the rule for the `label-or-exclude-rule` command.

