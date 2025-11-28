# Battle Phase Frontend Implementation Example

## Quick Example: Winner Card Discard Choice

Here's how to handle the new `WINNER_CARD_DISCARD_CHOICE` sub-phase in the frontend:

### 1. Event Handler

```typescript
// src/hooks/useBattlePhase.ts
import { useGameStream } from './useGameStream';
import { useState, useEffect } from 'react';
import { BattleSubPhase, Faction } from '@/lib/game/types';

export function useBattlePhase(gameId: string) {
  const { events } = useGameStream(gameId);
  const [subPhase, setSubPhase] = useState<BattleSubPhase | null>(null);
  const [currentBattle, setCurrentBattle] = useState(null);
  const [pendingRequest, setPendingRequest] = useState(null);

  useEffect(() => {
    // Listen for phase events
    events.forEach(event => {
      if (event.type === 'PHASE_EVENT') {
        const phaseEvent = event.data.event;
        
        // Update sub-phase from battle events
        if (phaseEvent.type === 'BATTLE_RESOLVED') {
          // Check if winner has cards to keep
          const winner = phaseEvent.data.winner;
          const winnerResult = phaseEvent.data.winnerResult;
          
          if (winnerResult?.cardsToKeep?.length > 0) {
            setSubPhase(BattleSubPhase.WINNER_CARD_DISCARD_CHOICE);
          }
        }
      }
      
      // Listen for agent requests
      if (event.type === 'AGENT_REQUEST') {
        const request = event.data;
        if (request.requestType === 'CHOOSE_CARDS_TO_DISCARD') {
          setPendingRequest(request);
          setSubPhase(BattleSubPhase.WINNER_CARD_DISCARD_CHOICE);
        }
      }
      
      // Listen for agent responses
      if (event.type === 'AGENT_RESPONSE') {
        const response = event.data;
        if (response.actionType === 'CHOOSE_CARDS_TO_DISCARD') {
          setPendingRequest(null);
          // Show the choice result
          console.log('Winner chose to discard:', response.data.cardsToDiscard);
        }
      }
    });
  }, [events]);

  return { subPhase, currentBattle, pendingRequest };
}
```

### 2. UI Component

```tsx
// src/components/battle/WinnerCardDiscardChoice.tsx
'use client';

import { useState } from 'react';
import { Faction } from '@/lib/game/types';
import { Card } from './Card';
import { Button } from './Button';

interface WinnerCardDiscardChoiceProps {
  faction: Faction;
  cardsToKeep: Array<{ id: string; name: string; type: string }>;
  onDiscard: (cardIds: string[]) => void;
}

export function WinnerCardDiscardChoice({
  faction,
  cardsToKeep,
  onDiscard,
}: WinnerCardDiscardChoiceProps) {
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

  const toggleCard = (cardId: string) => {
    setSelectedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const handleDiscard = () => {
    onDiscard(Array.from(selectedCards));
  };

  const handleDiscardAll = () => {
    onDiscard(cardsToKeep.map(c => c.id));
  };

  const handleKeepAll = () => {
    onDiscard([]);
  };

  return (
    <div className="winner-card-discard-choice">
      <div className="prompt">
        <h3>You won the battle!</h3>
        <p>Choose which cards to discard. You may keep any that don't say "Discard after use".</p>
      </div>

      <div className="cards-grid">
        {cardsToKeep.map(card => (
          <Card
            key={card.id}
            card={card}
            selectable
            selected={selectedCards.has(card.id)}
            onClick={() => toggleCard(card.id)}
          />
        ))}
      </div>

      <div className="actions">
        <Button onClick={handleDiscardAll} variant="secondary">
          Discard All
        </Button>
        <Button 
          onClick={handleDiscard} 
          disabled={selectedCards.size === 0}
        >
          Discard Selected ({selectedCards.size})
        </Button>
        <Button onClick={handleKeepAll} variant="primary">
          Keep All
        </Button>
      </div>
    </div>
  );
}
```

### 3. Main Battle Phase Component

```tsx
// src/components/battle/BattlePhaseView.tsx
'use client';

import { useBattlePhase } from '@/hooks/useBattlePhase';
import { BattleSubPhase } from '@/lib/game/types';
import { WinnerCardDiscardChoice } from './WinnerCardDiscardChoice';
import { BattleResolution } from './BattleResolution';
import { AgentRequestCard } from './AgentRequestCard';

export function BattlePhaseView({ gameId }: { gameId: string }) {
  const { subPhase, currentBattle, pendingRequest } = useBattlePhase(gameId);

  // Handle winner card discard choice
  if (subPhase === BattleSubPhase.WINNER_CARD_DISCARD_CHOICE) {
    if (pendingRequest?.requestType === 'CHOOSE_CARDS_TO_DISCARD') {
      const cardsToKeep = pendingRequest.context.cardsToKeep.map((cardId: string) => ({
        id: cardId,
        name: pendingRequest.context.cardNames?.[cardId] || cardId,
        type: 'treachery', // You'd get this from game state
      }));

      return (
        <div className="battle-phase">
          <AgentRequestCard request={pendingRequest} />
          <WinnerCardDiscardChoice
            faction={pendingRequest.factionId}
            cardsToKeep={cardsToKeep}
            onDiscard={(cardIds) => {
              // This would trigger the tool call
              // The actual implementation depends on your agent system
              console.log('Discarding cards:', cardIds);
            }}
          />
        </div>
      );
    }
  }

  // Other sub-phases...
  return (
    <div className="battle-phase">
      <SubPhaseIndicator subPhase={subPhase} />
      {pendingRequest && <AgentRequestCard request={pendingRequest} />}
      {/* Other battle components */}
    </div>
  );
}
```

### 4. Event Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Backend: Battle Resolution Complete                   │
│  - Winner has cards in cardsToKeep                     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Stream: PHASE_EVENT                                    │
│  { type: 'BATTLE_RESOLVED', winner, winnerResult }     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Stream: AGENT_REQUEST                                  │
│  { requestType: 'CHOOSE_CARDS_TO_DISCARD',             │
│    context: { cardsToKeep, cardNames } }               │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Frontend: useBattlePhase hook                          │
│  - Detects WINNER_CARD_DISCARD_CHOICE sub-phase        │
│  - Sets pendingRequest                                  │
│  - Renders WinnerCardDiscardChoice component           │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  User: Selects cards to discard                        │
│  - Clicks cards or uses buttons                         │
│  - Calls onDiscard([cardIds])                          │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Frontend: Triggers tool call                          │
│  choose_cards_to_discard({ cardsToDiscard: [...] })    │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Stream: AGENT_RESPONSE                                 │
│  { actionType: 'CHOOSE_CARDS_TO_DISCARD',              │
│    data: { cardsToDiscard: [...] } }                   │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Stream: PHASE_EVENT                                    │
│  { type: 'CARD_DISCARD_CHOICE',                        │
│    data: { faction, cardsDiscarded, cardNames } }       │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Backend: finishCardDiscarding()                       │
│  - Moves cards from cardsToKeep to cardsToDiscard       │
│  - Discards all cards                                   │
│  - Continues to next sub-phase                         │
└─────────────────────────────────────────────────────────┘
```

---

## Key Implementation Points

### 1. **Event Detection**
The frontend needs to detect when the winner card discard choice sub-phase starts. This happens when:
- `BATTLE_RESOLVED` event is received
- Winner has cards in `cardsToKeep`
- `AGENT_REQUEST` with `CHOOSE_CARDS_TO_DISCARD` is received

### 2. **State Management**
- Track current sub-phase
- Track pending agent requests
- Track current battle state
- Track selected cards (local UI state)

### 3. **Tool Call Integration**
The frontend needs to trigger the `choose_cards_to_discard` tool when the user makes a choice. This depends on your agent system architecture.

### 4. **Visual Feedback**
- Show which cards can be discarded
- Show selected cards
- Show final choice result
- Show card discard animation

---

## Complexity Assessment: Frontend

**Frontend Complexity**: 4/10
- ✅ Simple component structure
- ✅ Standard React patterns
- ✅ Clear event flow
- ⚠️ Need to handle multiple sub-phases (but same pattern)
- ⚠️ Need to integrate with agent system

**Lines of Code Estimate**:
- Hook: ~100 lines
- Component: ~150 lines
- Integration: ~50 lines
- **Total: ~300 lines** (very manageable)

---

## Summary

The winner card discard choice is **just another agent request/response cycle**. It follows the exact same pattern as all other battle sub-phases:

1. **Backend emits event** → Frontend detects sub-phase
2. **Backend sends agent request** → Frontend shows UI
3. **User makes choice** → Frontend triggers tool call
4. **Backend processes response** → Frontend shows result
5. **Backend continues** → Frontend updates state

**It's not complex, it's just another widget in the battle phase UI.**

