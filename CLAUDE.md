# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev                          # Start Next.js dev server
pnpm build                        # Build for production
pnpm lint                         # Run ESLint

# Run AI game simulation (requires ANTHROPIC_API_KEY)
npx tsx src/lib/game/run-game.ts                                    # Default 2-player game (Atreides vs Harkonnen)
npx tsx src/lib/game/run-game.ts --factions atreides,harkonnen,emperor --turns 10
npx tsx src/lib/game/run-game.ts --only bidding                     # Run specific phase(s)
npx tsx src/lib/game/run-game.ts --skip-setup --stop-after battle   # Debug options

# Type checking
npx tsc --noEmit
```

## Project Overview

Dune-bench is an AI-powered simulation of the GF9 Dune board game where Claude AI agents play different factions autonomously. The core logic is in `src/lib/game/` (~18k LOC), while the Next.js web app (`src/app/`) is minimal boilerplate.

## Architecture

### Core Data Flow

```
PhaseManager → PhaseHandler.initialize() → AgentRequest
                                              ↓
ClaudeAgentProvider.getResponses() ← generateText(Claude + tools)
                                              ↓
Tool execution → state/mutations.ts → Updated GameState
                                              ↓
PhaseHandler.process() → Next request or advance phase
```

### Key Directories

- **`src/lib/game/types/`** - Type system: `enums.ts` (Faction, Phase), `territories.ts` (40+ board locations), `entities.ts` (Leaders, Cards, Forces), `state.ts` (GameState interface)
- **`src/lib/game/state/`** - State management: `queries.ts` (read-only getters), `mutations.ts` (state modifiers), `factory.ts` (initial state creation)
- **`src/lib/game/phases/handlers/`** - 9 phase handlers implementing the game loop (storm, bidding, battle, etc.)
- **`src/lib/game/tools/`** - AI agent tool definitions: `actions/` (phase-specific), `information/` (always available), `registry.ts` (phase→tools mapping)
- **`src/lib/game/agent/`** - AI integration: `claude-provider.ts` (Vercel AI SDK), `prompts.ts` (faction-specific system prompts)
- **`src/lib/game/rules/`** - Game rule validation (movement, combat, bidding, revival, victory conditions)

### State Management Pattern

All state is immutable. Never mutate GameState directly:
```typescript
// Wrong: state.factions.get(faction).spice += 10
// Right:
state = addSpice(state, faction, 10);
```

Query functions (`get*`, `has*`, `can*`) are in `state/queries.ts`. Mutations (`add*`, `remove*`, `set*`, `transfer*`) are in `state/mutations.ts`.

### Tool System

Agents interact via Vercel AI SDK tools. Each tool:
1. Validates inputs with Zod schemas (`tools/schemas.ts`)
2. Checks game rules (`rules/*.ts`)
3. Applies mutations via `ToolContextManager`
4. Returns `{ success, message, data, stateModified }`

Tools are phase-filtered via `PHASE_TOOLS` registry in `tools/registry.ts`.

### Game Phases

The 9-phase loop (in order): SETUP → STORM → SPICE_BLOW → CHOAM_CHARITY → BIDDING → REVIVAL → SHIPMENT_MOVEMENT → BATTLE → SPICE_COLLECTION/MENTAT_PAUSE

Battle phase has 8 sub-phases for prescience, voice, battle plans, traitors, and resolution.

## Path Alias

Use `@/*` for imports from `src/`, e.g., `import { Faction } from '@/lib/game/types'`
