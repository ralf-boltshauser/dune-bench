# Log Utility - Quick Reference

```bash
pnpm tsx scripts/investigate-game-logs.ts <gameId> [options]
```

## Special Phases / Turn One

```bash
# Setup phase
pnpm tsx scripts/investigate-game-logs.ts <gameId> --phase setup

# Turn 1 initial storm placement
pnpm tsx scripts/investigate-game-logs.ts <gameId> --phase storm --turn 1

# All Turn 1 events
pnpm tsx scripts/investigate-game-logs.ts <gameId> --turn 1

# Turn 1 spice blow (special rules)
pnpm tsx scripts/investigate-game-logs.ts <gameId> --phase spice_blow --turn 1
```

## Common Options

```bash
# Default: summary + Fremen check
pnpm tsx scripts/investigate-game-logs.ts <gameId>

# Force placement & timeline
pnpm tsx scripts/investigate-game-logs.ts <gameId> --forces

# Filter by faction
pnpm tsx scripts/investigate-game-logs.ts <gameId> --faction fremen

# Phase transitions
pnpm tsx scripts/investigate-game-logs.ts <gameId> --transitions

# Any phase/turn combination
pnpm tsx scripts/investigate-game-logs.ts <gameId> --phase <phase> [--turn <n>]
```

## Available Phases

`setup`, `storm`, `spice_blow`, `choam_charity`, `bidding`, `revival`, `shipment_movement`, `battle`, `spice_collection`, `mentat_pause`

## What It Shows

✅ **All event types** with full, untruncated details:
  - `PHASE_EVENT` (STORM_MOVED, BID_PLACED, etc.) with messages and data
  - `GAME_STATE_UPDATE` with faction summaries, spice, forces, and automatic state diffs
  - `AGENT_DECISION`, `AGENT_TOOL_CALL`, `AGENT_TOOL_RESULT`, `AGENT_THINKING`
  - `TURN_STARTED`, `PHASE_STARTED`, `PHASE_ENDED`
  - `GAME_STARTED`, `GAME_CREATED`, `GAME_COMPLETED`
✅ Event sequence numbers and timestamps  
✅ **State changes** automatically detected and highlighted (spice on board, faction spice changes)
