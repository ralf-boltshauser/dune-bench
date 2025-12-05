# Scripts

## convert_rules_html_to_md.py

Converts the Landsraad HTML rules file into numbered markdown files.

### Requirements

```bash
pip install beautifulsoup4
```

### Usage

```bash
python3 scripts/convert_rules_html_to_md.py
```

The script will:
1. Read the HTML file from `/Users/ralf/Downloads/Landsraad of Las Vegas - Classic Rules.html`
2. Parse each major section (0, 1, 2, 3, 4)
3. Generate numbered markdown files in `numbered_rules/` directory:
   - `0.md` - Setup of the Game
   - `1.md` - Phases of the Game
   - `2.md` - Factions
   - `3.md` - Treachery Cards
   - `4.md` - Variants

### Numbering Format

The script preserves the exact numbering scheme:
- `0.01`, `0.02`, etc. for setup rules
- `1.00.00`, `1.00.01`, etc. for phase intro rules
- `1.01.00`, `1.01.01`, etc. for Storm Phase rules
- `1.06.05.04` for nested rules (e.g., ORNITHOPTERS)

Cross-references (like `+2.01.03` or `-3.01.11`) are preserved.

