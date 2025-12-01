#!/usr/bin/env tsx
/**
 * Script to validate bidding phase events for a specific game
 */

import * as fs from 'fs';
import * as path from 'path';

interface GameEvent {
  id: string;
  type: string;
  gameId: string;
  timestamp: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  seq: number;
}

interface BiddingEvent {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  message: string;
}

interface FactionState {
  factionId: string;
  spice: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hand: any[];
}

interface GameState {
  turn: number;
  phase: string;
  factions: {
    __type: string;
    entries: [string, FactionState][];
  };
  stormOrder: string[];
  playerPositions: {
    __type: string;
    entries: [string, number][];
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  biddingPhase?: any;
}

function parseEventsFile(filePath: string): GameEvent[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content
    .split('\n')
    .filter((line) => line.trim())
    .map((line, index) => {
      try {
        const parsed = JSON.parse(line);
        return { ...parsed, seq: index + 1 };
      } catch (e) {
        return null;
      }
    })
    .filter((e): e is GameEvent => e !== null);
}

function extractBiddingPhaseEvents(events: GameEvent[]): {
  turn1: GameEvent[];
  turn2: GameEvent[];
  turn3: GameEvent[];
} {
  const biddingPhases: { turn1: GameEvent[]; turn2: GameEvent[]; turn3: GameEvent[] } = {
    turn1: [],
    turn2: [],
    turn3: [],
  };

  let currentTurn = 0;
  let inBiddingPhase = false;

  for (const event of events) {
    // Check for phase start
    if (
      event.type === 'PHASE_EVENT' &&
      event.data?.event?.type === 'PHASE_STARTED' &&
      event.data?.event?.data?.phase === 'bidding'
    ) {
      inBiddingPhase = true;
      // Get turn from state update
      const stateUpdate = events.find(
        (e) =>
          e.type === 'GAME_STATE_UPDATE' &&
          e.seq > event.seq &&
          e.data?.state?.phase === 'bidding'
      );
      if (stateUpdate) {
        currentTurn = stateUpdate.data?.state?.turn || 0;
      }
    }

    // Collect events during bidding phase
    if (inBiddingPhase) {
      if (currentTurn === 1) {
        biddingPhases.turn1.push(event);
      } else if (currentTurn === 2) {
        biddingPhases.turn2.push(event);
      } else if (currentTurn === 3) {
        biddingPhases.turn3.push(event);
      }

      // Check for phase end
      if (
        event.type === 'PHASE_EVENT' &&
        (event.data?.event?.type === 'PHASE_ENDED' ||
          event.data?.event?.type === 'BIDDING_ENDED')
      ) {
        inBiddingPhase = false;
      }
      if (
        event.type === 'GAME_STATE_UPDATE' &&
        event.data?.state?.phase !== 'bidding'
      ) {
        inBiddingPhase = false;
      }
    }
  }

  return biddingPhases;
}

function getFactionStateAtEvent(
  state: GameState,
  factionId: string
): FactionState | null {
  const entries = state.factions?.entries || [];
  const entry = entries.find(([id]) => id === factionId);
  return entry ? entry[1] : null;
}

function validateBiddingPhase(
  turn: number,
  events: GameEvent[],
  initialState: GameState
): {
  issues: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any;
} {
  const issues: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const details: any = {
    handSizeDeclarations: [],
    cardsDealt: 0,
    auctions: [],
    purchases: [],
    harkonnenFreeCards: [],
  };

  // Find hand size declaration event
  const declarationEvent = events.find(
    (e) =>
      e.type === 'PHASE_EVENT' &&
      e.data?.event?.type === 'HAND_SIZE_DECLARED'
  );

  if (!declarationEvent) {
    issues.push(
      `Turn ${turn}: Missing HAND_SIZE_DECLARED event (Rule 1.04.01)`
    );
  } else {
    const declarations = declarationEvent.data?.event?.data?.declarations || [];
    details.handSizeDeclarations = declarations;
    console.log(`\nTurn ${turn} Hand Size Declarations:`);
    for (const decl of declarations) {
      console.log(`  ${decl.faction}: ${decl.handSize} cards (${decl.category})`);
    }
  }

  // Extract state updates to track changes
  const stateUpdates = events.filter((e) => e.type === 'GAME_STATE_UPDATE');
  const currentState = initialState;

  // Track purchases from action log
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const purchases: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const harkonnenFreeCards: any[] = [];

  // Find all CARD_PURCHASED and CARD_DRAWN_FREE events
  for (const event of events) {
    if (event.type === 'PHASE_EVENT') {
      const phaseEvent = event.data?.event;
      if (phaseEvent?.type === 'CARD_WON' || phaseEvent?.type === 'CARD_PURCHASED') {
        purchases.push({
          faction: phaseEvent.data?.winner || phaseEvent.data?.faction,
          amount: phaseEvent.data?.amount,
          cardIndex: phaseEvent.data?.cardIndex,
          timestamp: event.timestamp,
        });
      }
      if (phaseEvent?.type === 'CARD_DRAWN_FREE') {
        if (phaseEvent.data?.faction === 'harkonnen') {
          harkonnenFreeCards.push({
            timestamp: event.timestamp,
            ability: phaseEvent.data?.ability,
          });
        }
      }
    }
  }

  // Also check action log from final state
  const finalStateUpdate = stateUpdates[stateUpdates.length - 1];
  if (finalStateUpdate?.data?.state?.actionLog) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const biddingActions = finalStateUpdate.data.state.actionLog.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (action: any) => action.phase === 'bidding'
    );
    for (const action of biddingActions) {
      if (action.type === 'CARD_PURCHASED') {
        purchases.push({
          faction: action.factionId,
          amount: action.data.amount,
          cardIndex: action.data.cardIndex,
          timestamp: action.timestamp,
        });
      }
      if (action.type === 'CARD_DRAWN_FREE' && action.factionId === 'harkonnen') {
        harkonnenFreeCards.push({
          timestamp: action.timestamp,
          ability: action.data.ability,
        });
      }
    }
  }

  details.purchases = purchases;
  details.harkonnenFreeCards = harkonnenFreeCards;

  // Validate purchases
  for (const purchase of purchases) {
    // Check if Harkonnen got free card after each purchase
    const correspondingFreeCard = harkonnenFreeCards.find(
      (fc) => Math.abs(fc.timestamp - purchase.timestamp) < 100
    );
    if (purchase.faction === 'harkonnen' && !correspondingFreeCard) {
      issues.push(
        `Turn ${turn}: Harkonnen purchased card but did not receive free card (Rule 2.05.08 - TOP CARD ability)`
      );
    }
  }

  // Validate hand sizes don't exceed 4
  if (finalStateUpdate) {
    const finalState = finalStateUpdate.data?.state;
    if (finalState?.factions?.entries) {
      for (const [factionId, factionState] of finalState.factions.entries) {
        if (factionState.hand.length > 4) {
          issues.push(
            `Turn ${turn}: ${factionId} has ${factionState.hand.length} cards (exceeds max of 4, Rule 1.04.02)`
          );
        }
      }
    }
  }

  return { issues, details };
}

function main() {
  const gameId = process.argv[2] || 'game_mikfw73j_7539ed9c';
  const eventsPath = path.join(
    __dirname,
    '..',
    'data',
    'games',
    gameId,
    'events.jsonl'
  );
  const statePath = path.join(
    __dirname,
    '..',
    'data',
    'games',
    gameId,
    'state.json'
  );

  if (!fs.existsSync(eventsPath)) {
    console.error(`Events file not found: ${eventsPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(statePath)) {
    console.error(`State file not found: ${statePath}`);
    process.exit(1);
  }

  const events = parseEventsFile(eventsPath);
  const finalState: GameState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));

  console.log(`\n${'='.repeat(80)}`);
  console.log(`BIDDING PHASE VALIDATION - ${gameId}`);
  console.log('='.repeat(80));

  const biddingPhases = extractBiddingPhaseEvents(events);

  // Get initial states for each turn
  const turn1State = events.find(
    (e) =>
      e.type === 'GAME_STATE_UPDATE' &&
      e.data?.state?.turn === 1 &&
      e.data?.state?.phase === 'bidding'
  )?.data?.state as GameState | undefined;

  const turn2State = events.find(
    (e) =>
      e.type === 'GAME_STATE_UPDATE' &&
      e.data?.state?.turn === 2 &&
      e.data?.state?.phase === 'bidding'
  )?.data?.state as GameState | undefined;

  const turn3State = events.find(
    (e) =>
      e.type === 'GAME_STATE_UPDATE' &&
      e.data?.state?.turn === 3 &&
      e.data?.state?.phase === 'bidding'
  )?.data?.state as GameState | undefined;

  const allIssues: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allDetails: any = {};

  if (biddingPhases.turn1.length > 0 && turn1State) {
    console.log(`\n${'='.repeat(80)}`);
    console.log('TURN 1 BIDDING PHASE');
    console.log('='.repeat(80));
    const result = validateBiddingPhase(1, biddingPhases.turn1, turn1State);
    allIssues.push(...result.issues);
    allDetails.turn1 = result.details;
  }

  if (biddingPhases.turn2.length > 0 && turn2State) {
    console.log(`\n${'='.repeat(80)}`);
    console.log('TURN 2 BIDDING PHASE');
    console.log('='.repeat(80));
    const result = validateBiddingPhase(2, biddingPhases.turn2, turn2State);
    allIssues.push(...result.issues);
    allDetails.turn2 = result.details;
  }

  if (biddingPhases.turn3.length > 0 && turn3State) {
    console.log(`\n${'='.repeat(80)}`);
    console.log('TURN 3 BIDDING PHASE');
    console.log('='.repeat(80));
    const result = validateBiddingPhase(3, biddingPhases.turn3, turn3State);
    allIssues.push(...result.issues);
    allDetails.turn3 = result.details;
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Issues Found: ${allIssues.length}`);
  if (allIssues.length > 0) {
    console.log('\nIssues:');
    allIssues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });
  } else {
    console.log('\n✅ No issues found!');
  }

  // Write report
  const reportDir = path.join(__dirname, '..', '.notes', 'validation', gameId);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPath = path.join(reportDir, 'bidding-issues.md');
  const report = `# Bidding Phase Validation - ${gameId}

## Summary
- Total Bidding Phases Analyzed: ${Object.keys(allDetails).length}
- Issues Found: ${allIssues.length}
- Status: ${allIssues.length === 0 ? '✅ Complete' : '⚠️ Issues Found'}

${allIssues.length > 0 ? `## Issues Found

${allIssues.map((issue, i) => `### Issue ${i + 1}: ${issue.split(':')[1]?.trim() || issue}
**Severity:** High
**Description:** ${issue}
**Rule Reference:** See validation details below
`).join('\n')}` : ''}

## Validation Details

${Object.entries(allDetails).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ([turn, details]: [string, any]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d: any = details;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handSizeDecls = d.handSizeDeclarations?.map((decl: any) => `${decl.faction}: ${decl.handSize}`).join(', ') || 'Not found';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const purchases = d.purchases?.map((p: any) => `  - ${p.faction}: ${p.amount} spice (card index ${p.cardIndex})`).join('\n') || '  None';
    return `### Turn ${turn.replace('turn', '')} Bidding Phase
- Hand size declarations: ${handSizeDecls}
- Cards purchased: ${d.purchases?.length || 0}
- Harkonnen free cards: ${d.harkonnenFreeCards?.length || 0}
- Purchases:
${purchases}
`;
  }).join('\n')}
`;

  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 Report written to: ${reportPath}`);
}

main();

