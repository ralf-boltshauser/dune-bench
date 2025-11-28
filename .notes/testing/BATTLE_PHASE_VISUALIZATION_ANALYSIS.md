# Battle Phase Visualization Analysis

## TL;DR: Is It Complex?

**Yes, but manageable.** The battle phase has ~10 sub-phases with agent interactions, but each follows a clear pattern:
1. **Agent Request** → 2. **Agent Response** → 3. **State Update** → 4. **Event Emission**

The complexity is **linear, not exponential**. Each sub-phase is independent and can be visualized with the same pattern.

---

## Battle Phase Sub-Phases Breakdown

### 1. **AGGRESSOR_CHOOSING** (Simple)
- **What happens**: Aggressor picks which battle to fight
- **Agent request**: `CHOOSE_BATTLE`
- **Events**: `BATTLE_STARTED`
- **Visualization**: 
  - Show pending battles on map
  - Highlight aggressor's turn
  - Show selection UI

### 2. **PRESCIENCE_OPPORTUNITY** (Medium)
- **What happens**: Atreides can peek at opponent's plan
- **Agent request**: `USE_PRESCIENCE`
- **Events**: `PRESCIENCE_USED`
- **Visualization**:
  - Show Atreides ability prompt
  - Highlight which element they're asking about
  - Show opponent's response

### 3. **PRESCIENCE_REVEAL** (Medium)
- **What happens**: Opponent reveals one element
- **Agent request**: `REVEAL_PRESCIENCE_ELEMENT`
- **Events**: `PRESCIENCE_REVEALED`
- **Visualization**:
  - Show revealed element (leader/weapon/defense/number)
  - Mark it as "committed"

### 4. **CREATING_BATTLE_PLANS** (Complex)
- **What happens**: Both sides create secret battle plans
- **Agent request**: `CREATE_BATTLE_PLAN`
- **Events**: `BATTLE_PLAN_SUBMITTED`
- **Visualization**:
  - Show "planning" state for both factions
  - Show when each plan is submitted
  - Keep plans hidden until reveal

### 5. **VOICE_OPPORTUNITY** (Medium)
- **What happens**: BG can command opponent
- **Agent request**: `USE_VOICE`
- **Events**: `VOICE_USED`, `VOICE_COMPLIED`, `VOICE_VIOLATION`
- **Visualization**:
  - Show BG ability prompt
  - Show voice command
  - Show compliance/violation

### 6. **REVEALING_PLANS** (Simple)
- **What happens**: Plans are revealed simultaneously
- **Events**: `BATTLE_PLAN_SUBMITTED` (with full details)
- **Visualization**:
  - Reveal both plans side-by-side
  - Show leader, forces, weapons, defenses

### 7. **TRAITOR_CALL** (Medium)
- **What happens**: Either side can call traitor
- **Agent request**: `CALL_TRAITOR`
- **Events**: `TRAITOR_REVEALED`, `TWO_TRAITORS`, `TRAITOR_BLOCKED`
- **Visualization**:
  - Show traitor opportunity prompts
  - Show traitor reveal animation
  - Show special TWO_TRAITORS case

### 8. **BATTLE_RESOLUTION** (Complex)
- **What happens**: Battle is calculated and resolved
- **Events**: `BATTLE_RESOLVED`, `LEADER_KILLED`, `FORCES_LOST`, `SPICE_COLLECTED`
- **Visualization**:
  - Show battle calculation (forces + leader + spice)
  - Show winner/loser
  - Show force losses
  - Show leader deaths
  - Show spice payouts

### 9. **WINNER_CARD_DISCARD_CHOICE** (Simple) ⭐ NEW
- **What happens**: Winner chooses which cards to discard
- **Agent request**: `CHOOSE_CARDS_TO_DISCARD`
- **Events**: `CARD_DISCARD_CHOICE`
- **Visualization**:
  - Show winner's cards that can be kept
  - Show discard selection UI
  - Show final discard choice

### 10. **HARKONNEN_CAPTURE** (Simple)
- **What happens**: Harkonnen can capture/kill leader
- **Agent request**: `CAPTURE_LEADER_CHOICE`
- **Events**: `LEADER_CAPTURED`, `LEADER_CAPTURED_AND_KILLED`
- **Visualization**:
  - Show capture opportunity
  - Show kill/capture choice
  - Show result

---

## Event Flow Pattern (Universal)

Every sub-phase follows this pattern:

```
┌─────────────────┐
│  Sub-Phase Start│
│  (State Change) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Agent Request   │ ──► Stream: AGENT_REQUEST
│ (if needed)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Agent Response  │ ──► Stream: AGENT_RESPONSE
│ (tool call)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ State Update    │ ──► Stream: GAME_STATE_UPDATE
│ (mutations)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Phase Event     │ ──► Stream: PHASE_EVENT
│ (notification)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Next Sub-Phase  │
│ (or complete)   │
└─────────────────┘
```

**Key Insight**: Each sub-phase emits **4-5 events max**. The total complexity is just the sum of sub-phases, not a multiplication.

---

## Frontend Visualization Strategy

### Component Architecture

```typescript
// Main Battle Phase Container
<BattlePhaseView>
  {/* Sub-phase indicator */}
  <BattleSubPhaseIndicator subPhase={currentSubPhase} />
  
  {/* Current battle context */}
  <BattleContextDisplay battle={currentBattle} />
  
  {/* Active agent request (if any) */}
  {pendingRequest && (
    <AgentRequestCard request={pendingRequest} />
  )}
  
  {/* Battle visualization */}
  <BattleVisualization
    aggressor={battle.aggressor}
    defender={battle.defender}
    plans={battle.plans} // Hidden until reveal
    result={battle.result} // Shown after resolution
  />
  
  {/* Event log */}
  <BattleEventLog events={battleEvents} />
</BattlePhaseView>
```

### Sub-Phase Visualizations

#### 1. AGGRESSOR_CHOOSING
```tsx
<SubPhaseView subPhase="AGGRESSOR_CHOOSING">
  <MapView>
    {pendingBattles.map(battle => (
      <BattleMarker 
        key={battle.id}
        territory={battle.territoryId}
        factions={battle.factions}
        selectable={isAggressor}
        onClick={() => selectBattle(battle)}
      />
    ))}
  </MapView>
  <PromptCard>
    {aggressor} must choose which battle to fight
  </PromptCard>
</SubPhaseView>
```

#### 2. PRESCIENCE_OPPORTUNITY
```tsx
<SubPhaseView subPhase="PRESCIENCE_OPPORTUNITY">
  <AbilityPrompt>
    <FactionBadge faction="ATREIDES" />
    <Text>Use Prescience to see opponent's plan?</Text>
    <Options>
      <Option value="leader">Leader</Option>
      <Option value="weapon">Weapon</Option>
      <Option value="defense">Defense</Option>
      <Option value="number">Forces/Spice</Option>
    </Options>
  </AbilityPrompt>
</SubPhaseView>
```

#### 3. CREATING_BATTLE_PLANS
```tsx
<SubPhaseView subPhase="CREATING_BATTLE_PLANS">
  <PlanningStatus>
    <FactionStatus 
      faction={aggressor}
      status={aggressorPlan ? "ready" : "planning"}
    />
    <FactionStatus 
      faction={defender}
      status={defenderPlan ? "ready" : "planning"}
    />
  </PlanningStatus>
  {bothPlansReady && (
    <RevealButton onClick={revealPlans} />
  )}
</SubPhaseView>
```

#### 4. BATTLE_RESOLUTION
```tsx
<SubPhaseView subPhase="BATTLE_RESOLUTION">
  <BattleResult>
    <SideResult 
      faction={aggressor}
      plan={aggressorPlan}
      total={aggressorTotal}
      lost={aggressorLost}
    />
    <VS>VS</VS>
    <SideResult 
      faction={defender}
      plan={defenderPlan}
      total={defenderTotal}
      lost={defenderLost}
    />
  </BattleResult>
  <WinnerBanner winner={winner} />
  <ForceLosses losses={forceLosses} />
  <LeaderDeaths deaths={leaderDeaths} />
  <SpicePayouts payouts={spicePayouts} />
</SubPhaseView>
```

#### 5. WINNER_CARD_DISCARD_CHOICE ⭐ NEW
```tsx
<SubPhaseView subPhase="WINNER_CARD_DISCARD_CHOICE">
  <CardDiscardPrompt>
    <Text>You won! Choose which cards to discard:</Text>
    <CardGrid>
      {cardsToKeep.map(card => (
        <Card
          key={card.id}
          card={card}
          selectable
          selected={selectedCards.includes(card.id)}
          onClick={() => toggleCard(card.id)}
        />
      ))}
    </CardGrid>
    <Actions>
      <Button onClick={discardAll}>Discard All</Button>
      <Button onClick={discardSelected}>Discard Selected</Button>
      <Button onClick={keepAll}>Keep All</Button>
    </Actions>
  </CardDiscardPrompt>
</SubPhaseView>
```

---

## Event Streaming Implementation

### Current State
✅ **Already implemented**: SSE streaming infrastructure exists
✅ **Already implemented**: Phase events are being emitted
✅ **Already implemented**: Event streamer with game session management

### What's Missing

#### 1. **Sub-Phase Tracking in Events**
Currently, phase events don't include sub-phase information. We need:

```typescript
interface BattlePhaseEvent extends PhaseEvent {
  type: PhaseEventType;
  data: {
    subPhase: BattleSubPhase; // ⭐ ADD THIS
    battle?: CurrentBattle;
    // ... existing data
  };
}
```

#### 2. **Agent Request/Response Events**
These need to be streamed explicitly:

```typescript
// In battle.ts processStep()
eventStreamer.emit('AGENT_REQUEST', gameId, {
  faction: request.factionId,
  requestType: request.requestType,
  prompt: request.prompt,
  context: request.context,
  subPhase: this.context.subPhase,
});

// After response
eventStreamer.emit('AGENT_RESPONSE', gameId, {
  faction: response.factionId,
  actionType: response.actionType,
  data: response.data,
  subPhase: this.context.subPhase,
});
```

#### 3. **Battle State Snapshots**
Stream battle state at key moments:

```typescript
// After battle resolution
eventStreamer.emit('BATTLE_STATE_SNAPSHOT', gameId, {
  battle: this.context.currentBattle,
  result: battleResult,
  subPhase: this.context.subPhase,
});
```

---

## Complexity Assessment

### Is It Complex? **NO, it's just LONG**

**Complexity Score**: 3/10
- ✅ Linear flow (no branching complexity)
- ✅ Predictable pattern (same 4-step cycle)
- ✅ Independent sub-phases (no interdependencies)
- ✅ Clear state transitions
- ✅ Well-defined events

**Length Score**: 8/10
- ⚠️ 10 sub-phases (but each is simple)
- ⚠️ Multiple agent interactions (but same pattern)
- ⚠️ Many events (but all follow same structure)

### Comparison to Other Phases

| Phase | Sub-Phases | Complexity | Length |
|-------|-----------|------------|--------|
| Storm | 2 | 2/10 | 3/10 |
| Spice Blow | 1 | 1/10 | 2/10 |
| Bidding | 5 | 4/10 | 5/10 |
| Revival | 3 | 3/10 | 4/10 |
| Shipment | 2 | 2/10 | 3/10 |
| Movement | 1 | 1/10 | 2/10 |
| **Battle** | **10** | **3/10** | **8/10** |
| Collection | 1 | 1/10 | 2/10 |

**Battle is the LONGEST phase, but not the most COMPLEX.**

---

## Recommended Implementation Order

### Phase 1: Core Visualization (Week 1)
1. ✅ Sub-phase indicator component
2. ✅ Battle context display
3. ✅ Basic event log
4. ✅ Agent request cards

### Phase 2: Battle Resolution (Week 2)
1. ✅ Battle plan reveal animation
2. ✅ Battle result calculation display
3. ✅ Force loss visualization
4. ✅ Leader death animations

### Phase 3: Special Abilities (Week 3)
1. ✅ Prescience visualization
2. ✅ Voice visualization
3. ✅ Traitor reveal animation
4. ✅ Harkonnen capture UI

### Phase 4: Polish (Week 4)
1. ✅ Winner card discard choice UI ⭐ NEW
2. ✅ Animations and transitions
3. ✅ Error handling
4. ✅ Mobile responsiveness

---

## Key Takeaways

1. **It's not complex, just long** - Each sub-phase is simple, there are just many of them
2. **Pattern is universal** - All sub-phases follow the same 4-step cycle
3. **Events are already streaming** - Just need to add sub-phase context
4. **Visualization is straightforward** - Each sub-phase has a clear UI component
5. **Winner card discard is simple** - Just another agent request/response cycle

**Bottom Line**: The battle phase is **manageable**. The streaming infrastructure is already there. You just need to:
1. Add sub-phase info to events
2. Create UI components for each sub-phase
3. Wire up the event handlers

The complexity is **linear, not exponential**. You're not building a rocket ship, you're building 10 simple widgets that follow the same pattern.

