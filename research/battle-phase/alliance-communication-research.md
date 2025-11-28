# Alliance Communication and Information Sharing Research

## Questions Addressed

1. **Who can ask the Prescience question when in an alliance?**
2. **Can allies communicate and share information (treachery cards, game state, etc.) when one is in battle?**

## Research Findings

### 1. Who Can Use Prescience in Alliance Battles

#### Rule Reference
From `handwritten-rules/battle.md` line 58:
> "ALLIANCE: In your ally's battle you may use ability Prescience [2.01.08] on your ally's opponent."

#### Implementation Status
- **Status**: ✅ **CORRECTLY IMPLEMENTED**
- **Who Can Ask**: Only **Atreides** can use Prescience, even in an ally's battle
- **Code Reference**:
```579:592:src/lib/game/phases/handlers/battle.ts
    const pendingRequests: AgentRequest[] = [
      {
        factionId: Faction.ATREIDES,
        requestType: 'USE_PRESCIENCE',
        prompt: promptMessage,
        context: {
          opponent: prescienceTarget,
          allyBattle: isAllyBattle && !atreidesInBattle,
          ally: atreidesAlly,
          options: ['leader', 'weapon', 'defense', 'number'],
        },
        availableActions: ['USE_PRESCIENCE', 'PASS'],
      },
    ];
```

**Key Points**:
- The request is sent **only to Atreides** (`factionId: Faction.ATREIDES`)
- The ally in battle **cannot** use Prescience themselves
- Atreides can use Prescience on their ally's opponent when the ally is in battle
- The prompt indicates when it's an ally's battle: `"Your ally ${atreidesAlly} is in battle against ${prescienceTarget}. Use prescience on your ally's opponent?"`

#### Example Scenario
- **Atreides** and **Emperor** are allied
- **Emperor** is in battle against **Harkonnen**
- **Atreides** can use Prescience to see Harkonnen's battle plan
- **Emperor** cannot use Prescience (they don't have the ability)

### 2. Alliance Information Sharing

#### Rule Reference
From `landsraad-rules.md` line 309:
> "Ally Secrecy: Allies may discuss and share strategy and information secretly at any time."

From `landsraad-rules.md` line 316:
> "Players are never required to keep their cards, spice holdings, or the traitors they selected secret. They are not obligated to Reveal this information either."

#### Implementation Status
- **Status**: ❌ **NOT IMPLEMENTED**

#### Current Implementation

**What Agents Can See**:
1. **Own Information** (via `view_my_hand`, `view_my_traitors`, `view_my_faction`):
   - Full treachery card hand
   - Traitor cards
   - Full faction state (spice, forces, leaders)

2. **Other Factions' Public Information** (via `view_faction`):
   - Forces on board
   - Controlled strongholds
   - Hand size (number of cards, not contents)
   - Whether they have an ally
   - **Note**: This is the same for allies and non-allies

**Code Reference**:
```74:118:src/lib/game/tools/information/tools.ts
    view_faction: tool({
      description: `View public information about another faction:
- Their forces on the board (visible to all)
- Strongholds they control
- Whether they have an ally

Note: You cannot see their spice, hand size, or reserves in detail.`,
      inputSchema: ViewFactionSchema,
      execute: async (params: z.infer<typeof ViewFactionSchema>, options) => {
        const { faction } = params;
        if (!faction) {
          return failureResult(
            'Faction not specified',
            { code: 'MISSING_FACTION', message: 'Specify a faction to view' },
            false
          );
        }

        try {
          // Get limited public info about other factions
          const info = ctx.getFactionInfo(faction);

          // Filter to only public information
          const publicInfo = {
            faction: info.faction,
            forcesOnBoard: info.forcesOnBoard,
            controlledStrongholds: info.controlledStrongholds,
            allyId: info.allyId,
            // These would be hidden in a real game but are useful for AI
            handSize: info.handSize,
          };

          return successResult(
            `${faction}: ${info.forcesOnBoard.length} force stacks on board`,
            publicInfo,
            false
          );
        } catch (error) {
          return failureResult(
            `Could not view faction: ${faction}`,
            { code: 'INVALID_FACTION', message: `Faction ${faction} not found` },
            false
          );
        }
      },
    }),
```

**What's Missing**:
- ❌ No tool to view ally's treachery cards
- ❌ No tool to view ally's traitor cards
- ❌ No tool to view ally's full faction state (spice, reserves, leaders)
- ❌ No special visibility for allies in the agent context
- ❌ No mechanism for allies to share information programmatically

#### Agent Context Structure

The `FactionContext` interface shows what agents can see:

```325:352:src/lib/game/types/state.ts
export interface FactionContext {
  // Own state (full visibility)
  ownFaction: FactionState;

  // Game state (public info)
  turn: number;
  phase: Phase;
  stormSector: number;
  spiceOnBoard: SpiceLocation[];
  shieldWallDestroyed: boolean;

  // Other factions (limited visibility)
  otherFactions: PublicFactionState[];

  // Storm order
  stormOrder: Faction[];
  firstPlayer: Faction;

  // Alliances
  alliances: Alliance[];

  // Phase-specific context
  phaseContext: PhaseContext;

  // Pending deals for this faction
  pendingDealsReceived: Deal[];
  pendingDealsSent: Deal[];
}
```

**Key Observation**: There's no special field for ally information. Allies are treated the same as other factions in terms of visibility.

## Summary

### Prescience Usage
- ✅ **Correctly Implemented**: Only Atreides can use Prescience, even in ally battles
- ✅ **Alliance Support**: Atreides can use Prescience on their ally's opponent
- ✅ **Clear Prompts**: Agents are informed when using Prescience in an ally's battle

### Alliance Information Sharing
- ❌ **Not Implemented**: Agents cannot see their ally's private information
- ❌ **Missing Tools**: No tools to view ally's hand, traitors, or full state
- ⚠️ **Rule Gap**: The rules allow allies to share information, but the code doesn't support it

## Recommendations

### Priority 1: Add Ally Information Tools
Create new tools to allow allies to view each other's information:

1. **`view_ally_hand`**: View ally's treachery cards
2. **`view_ally_traitors`**: View ally's traitor cards
3. **`view_ally_faction`**: View ally's full faction state (spice, forces, leaders)

**Implementation Considerations**:
- These tools should only work if the target faction is your ally
- Should be available at any time (per rule: "secretly at any time")
- Should be clearly marked as ally-only information

### Priority 2: Update Agent Context
Consider adding an `allyState` field to `FactionContext` that provides full visibility of ally's information, similar to `ownFaction`.

### Priority 3: Battle-Specific Communication
When an ally is in battle, the non-combatant ally could:
- See the ally's battle plan as it's being created
- See the opponent's revealed information (e.g., from Prescience)
- Coordinate strategy through shared context

## Related Files
- `src/lib/game/phases/handlers/battle.ts` - Prescience implementation
- `src/lib/game/tools/information/tools.ts` - Information tools
- `src/lib/game/types/state.ts` - Context definitions
- `landsraad-rules.md` - Alliance rules
- `ATREIDES_ALLY_PRESCIENCE_IMPLEMENTATION.md` - Prescience alliance implementation

