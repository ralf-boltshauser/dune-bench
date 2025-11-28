# Streaming Architecture Plan: AI Backend → Frontend

## Overview
Stream game events, tool calls, and state updates from the backend to the frontend in real-time for live visualization.

## Architecture Decision: Server-Sent Events (SSE)

**Why SSE over WebSockets?**
- ✅ One-way communication (server → client) is all we need
- ✅ Simpler implementation, built into HTTP
- ✅ Works seamlessly with Next.js API routes
- ✅ Automatic reconnection handling
- ✅ No extra infrastructure needed
- ✅ Lower complexity than WebSockets

## Architecture Components

### 1. Backend: Event Streamer (`src/lib/game/stream/event-streamer.ts`)

**Purpose**: Intercept and stream all game events, tool calls, and state updates.

```typescript
interface StreamEvent {
  id: string;           // Unique event ID
  type: StreamEventType;
  timestamp: number;
  data: unknown;
}

type StreamEventType =
  | 'TOOL_CALL'
  | 'TOOL_RESULT'
  | 'PHASE_EVENT'
  | 'GAME_STATE_UPDATE'
  | 'AGENT_REQUEST'
  | 'AGENT_RESPONSE'
  | 'ERROR'
  | 'LOG';

class EventStreamer {
  private subscribers: Set<EventSubscriber> = new Set();
  
  // Main entry point - call this instead of direct logging
  stream(event: StreamEvent): void {
    // Broadcast to all subscribers
    this.subscribers.forEach(sub => sub(event));
  }
  
  subscribe(callback: EventSubscriber): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
}
```

**Integration Points**:
1. **Tool Calls**: Wrap tool execution in `claude-provider.ts`
2. **Phase Events**: Already exists, just forward to streamer
3. **State Updates**: Hook into `updateState` calls
4. **Agent Requests/Responses**: Stream in `processRequest`

### 2. API Route: SSE Endpoint (`src/app/api/game/stream/route.ts`)

**Purpose**: HTTP endpoint that streams events via SSE.

```typescript
export async function GET(request: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Subscribe to game events
      const unsubscribe = eventStreamer.subscribe((event) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      });
      
      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        unsubscribe();
        controller.close();
      });
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### 3. Frontend: React Hook (`src/hooks/useGameStream.ts`)

**Purpose**: Connect to SSE endpoint and handle events.

```typescript
export function useGameStream(gameId: string) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    const eventSource = new EventSource(`/api/game/stream?gameId=${gameId}`);
    
    eventSource.onmessage = (e) => {
      const event: StreamEvent = JSON.parse(e.data);
      setEvents(prev => [...prev, event]);
      handleEvent(event); // Dispatch to handlers
    };
    
    eventSource.onerror = () => {
      setConnected(false);
      // Auto-reconnect handled by EventSource
    };
    
    eventSource.onopen = () => {
      setConnected(true);
    };
    
    return () => eventSource.close();
  }, [gameId]);
  
  return { events, connected };
}
```

### 4. Frontend: Event Handlers (`src/components/game/GameEventHandlers.tsx`)

**Purpose**: Process different event types and trigger visualizations.

```typescript
function handleEvent(event: StreamEvent) {
  switch (event.type) {
    case 'TOOL_CALL':
      handleToolCall(event.data as ToolCallEvent);
      break;
    case 'TOOL_RESULT':
      handleToolResult(event.data as ToolResultEvent);
      break;
    case 'PHASE_EVENT':
      handlePhaseEvent(event.data as PhaseEvent);
      break;
    case 'GAME_STATE_UPDATE':
      handleStateUpdate(event.data as GameState);
      break;
    // ... etc
  }
}

function handleToolCall(data: ToolCallEvent) {
  const { faction, toolName, input } = data;
  
  // Show toast notification
  toast.info(`${faction} is using ${toolName}`, {
    duration: 3000,
  });
  
  // If it's a shipment tool, prepare for visualization
  if (toolName === 'ship_forces') {
    // Store pending action
    setPendingShipment({ faction, ...input });
  }
}

function handleToolResult(data: ToolResultEvent) {
  const { faction, toolName, result } = data;
  
  // If shipment succeeded, visualize on map
  if (toolName === 'ship_forces' && result.success) {
    visualizeShipment(result.data);
    toast.success(`${faction} shipped forces successfully`);
  }
}
```

## Implementation Steps

### Step 1: Create Event Streamer (Backend)
- [ ] Create `src/lib/game/stream/event-streamer.ts`
- [ ] Implement singleton pattern for global access
- [ ] Add TypeScript types for all event types

### Step 2: Integrate with Existing Code
- [ ] Wrap tool calls in `claude-provider.ts`:
  ```typescript
  // Before tool execution
  eventStreamer.stream({
    type: 'TOOL_CALL',
    data: { faction, toolName, input }
  });
  
  // After tool execution
  eventStreamer.stream({
    type: 'TOOL_RESULT',
    data: { faction, toolName, result }
  });
  ```
- [ ] Forward phase events from `PhaseManager`
- [ ] Hook into state updates

### Step 3: Create SSE API Route
- [ ] Create `src/app/api/game/stream/route.ts`
- [ ] Implement SSE response
- [ ] Handle connection lifecycle
- [ ] Add gameId filtering if needed

### Step 4: Frontend Integration
- [ ] Create `useGameStream` hook
- [ ] Create `GameEventHandlers` component
- [ ] Add toast notifications (use `react-hot-toast` or similar)
- [ ] Integrate with map visualization
- [ ] Add turn indicator updates

### Step 5: Visualization Components
- [ ] Toast notifications for tool calls
- [ ] Map updates for force movements
- [ ] Phase/turn indicator updates
- [ ] Game state sidebar/panel

## Event Types & Data Structures

```typescript
// Tool Call Event
interface ToolCallEvent {
  faction: Faction;
  toolName: string;
  input: Record<string, unknown>;
  timestamp: number;
}

// Tool Result Event
interface ToolResultEvent {
  faction: Faction;
  toolName: string;
  result: ToolResult;
  duration: number;
}

// Phase Event (reuse existing)
interface PhaseEvent {
  type: string;
  data: unknown;
  message: string;
}

// Game State Update
interface GameStateUpdateEvent {
  state: GameState;
  changes: string[]; // What changed
}
```

## Benefits

1. **Minimal Backend Changes**: Just wrap existing calls with `eventStreamer.stream()`
2. **Type-Safe**: Full TypeScript support
3. **Reliable**: SSE handles reconnection automatically
4. **Flexible**: Frontend can handle events however it wants
5. **Debuggable**: All events are visible in browser DevTools

## Example Usage Flow

1. **Backend**: Agent calls `ship_forces` tool
   ```typescript
   // In tool execution
   eventStreamer.stream({
     type: 'TOOL_CALL',
     data: {
       faction: Faction.ATREIDES,
       toolName: 'ship_forces',
       input: { territoryId: 'arrakeen', count: 5 }
     }
   });
   ```

2. **SSE**: Event sent to frontend via `/api/game/stream`

3. **Frontend**: Hook receives event
   ```typescript
   // In useGameStream
   eventSource.onmessage = (e) => {
     const event = JSON.parse(e.data);
     if (event.type === 'TOOL_CALL' && event.data.toolName === 'ship_forces') {
       toast.info(`Atreides is shipping forces...`);
     }
   };
   ```

4. **Visualization**: Map updates when tool result comes back

## Future Enhancements

- **Filtering**: Allow frontend to subscribe to specific event types
- **Batching**: Batch multiple events for performance
- **Replay**: Store events for replay/debugging
- **Persistence**: Save events to database for analysis

