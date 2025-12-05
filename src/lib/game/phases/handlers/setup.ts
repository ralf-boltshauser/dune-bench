/**
 * Setup Phase Handler
 *
 * Pre-game setup that runs once before Turn 1:
 * - Bene Gesserit makes their secret prediction (rule 2.02.03 - after 0.10, before 0.11)
 * - Deal 4 traitor cards to each faction, they choose 1 to keep (Harkonnen keeps all 4) (rule 0.11)
 * - Fremen distributes 10 forces across Sietch Tabr, False Wall South, False Wall West (rule 2.04.02)
 * - Starting treachery cards are already dealt during game creation
 */

import {
  Faction,
  Phase,
  type GameState,
  type TraitorCard,
  type TerritoryId,
} from '../../types';
import {
  getFactionState,
  logAction,
} from '../../state';
import { getFactionConfig, GAME_CONSTANTS, getLeaderDefinition } from '../../data';
import { FACTION_NAMES } from '../../types';
import { getPlayerPositions } from '../../state';
import {
  type PhaseHandler,
  type PhaseStepResult,
  type AgentRequest,
  type AgentResponse,
  type PhaseEvent,
} from '../types';

// =============================================================================
// SETUP PHASE CONTEXT
// =============================================================================

/** Valid territories for Fremen starting force distribution (rule 2.04.02) */
const FREMEN_STARTING_TERRITORIES: TerritoryId[] = [
  'sietch_tabr' as TerritoryId,
  'false_wall_south' as TerritoryId,
  'false_wall_west' as TerritoryId,
];

interface SetupPhaseContext {
  /** Traitor cards dealt to each faction (4 each) - pending selection */
  pendingTraitorSelection: Map<Faction, TraitorCard[]>;
  /** Factions that have completed traitor selection */
  completedTraitorSelection: Set<Faction>;
  /** Whether BG has made their prediction */
  bgPredictionMade: boolean;
  /** Whether Fremen has distributed their starting forces */
  fremenForcesDistributed: boolean;
  /** Current step in setup - per rules:
   * - BG prediction after 0.10, before 0.11 (rule 2.02.03)
   * - Traitor selection (rule 0.11)
   * - Fremen force distribution (rule 0.13, 2.04.02)
   */
  step: 'BG_PREDICTION' | 'TRAITOR_SELECTION' | 'FREMEN_FORCE_DISTRIBUTION' | 'COMPLETE';
}

// =============================================================================
// SETUP PHASE HANDLER
// =============================================================================

export class SetupPhaseHandler implements PhaseHandler {
  readonly phase = Phase.SETUP;

  private context: SetupPhaseContext = {
    pendingTraitorSelection: new Map(),
    completedTraitorSelection: new Set(),
    bgPredictionMade: false,
    fremenForcesDistributed: false,
    step: 'BG_PREDICTION', // Per rule 2.02.03, BG prediction comes first
  };

  initialize(state: GameState): PhaseStepResult {
    const events: PhaseEvent[] = [];

    // Reset context - per rules:
    // - BG prediction after 0.10, before 0.11 (rule 2.02.03)
    // - Traitor selection (rule 0.11)
    // - Fremen force distribution (rule 0.13, 2.04.02)
    this.context = {
      pendingTraitorSelection: new Map(),
      completedTraitorSelection: new Set(),
      bgPredictionMade: false,
      fremenForcesDistributed: false,
      step: 'BG_PREDICTION',
    };

    // Note: PhaseManager emits PHASE_STARTED event, so we don't emit it here

    // @rule 0.11 - Deal 4 traitor cards to each faction from the traitor deck
    // The traitor deck is created and shuffled by createTraitorDeck() (rule 0.11)
    // Each player will later pick 1 card to keep (handled in traitor selection)
    const traitorDeck = this.createTraitorDeck(state);
    let deckIndex = 0;

    for (const faction of state.factions.keys()) {
      const dealt: TraitorCard[] = [];
      for (let i = 0; i < 4 && deckIndex < traitorDeck.length; i++) {
        dealt.push(traitorDeck[deckIndex]);
        deckIndex++;
      }
      this.context.pendingTraitorSelection.set(faction, dealt);
    }

    // Per rule 2.02.03: BG prediction comes BEFORE traitor selection
    // If BG is in game, request prediction first
    if (state.factions.has(Faction.BENE_GESSERIT)) {
      events.push({
        type: 'SETUP_STEP',
        data: { step: 'BG_PREDICTION' },
        message: 'Bene Gesserit must make their secret prediction',
      });
      return this.requestBGPrediction(state, events);
    }

    // No BG in game, skip to traitor selection
    this.context.step = 'TRAITOR_SELECTION';
    this.context.bgPredictionMade = true;
    return this.initializeTraitorSelection(state, events);
  }

  processStep(state: GameState, responses: AgentResponse[]): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;

    // Per rule 2.02.03: BG prediction comes BEFORE traitor selection
    if (this.context.step === 'BG_PREDICTION') {
      // Process BG prediction
      for (const response of responses) {
        if (response.factionId === Faction.BENE_GESSERIT) {
          const predictedFaction = response.data.faction as Faction;
          const predictedTurn = response.data.turn as number;

          newState = this.setBGPrediction(newState, predictedFaction, predictedTurn, events);
          this.context.bgPredictionMade = true;
        }
      }

      if (!this.context.bgPredictionMade) {
        return this.requestBGPrediction(newState, events);
      }

      // Move to traitor selection
      this.context.step = 'TRAITOR_SELECTION';
      return this.initializeTraitorSelection(newState, events);
    }

    if (this.context.step === 'TRAITOR_SELECTION') {
      // Process traitor selection responses
      for (const response of responses) {
        if (response.actionType === 'SELECT_TRAITOR' && !response.passed) {
          const selectedId = response.data.traitorId as string;
          const pendingCards = this.context.pendingTraitorSelection.get(response.factionId);

          if (pendingCards) {
            // Validate selection is from dealt cards
            const validSelection = pendingCards.find(t => t.leaderId === selectedId);
            if (validSelection) {
              // Check if selecting own faction's leader (useless but not forbidden by rules)
              const leaderDef = getLeaderDefinition(selectedId);
              if (leaderDef && leaderDef.faction === response.factionId) {
                console.warn(
                  `\n⚠️  WARNING: ${FACTION_NAMES[response.factionId]} selected their own leader (${leaderDef.name}) as traitor!`,
                  `This is strategically useless - you cannot use a traitor against yourself.`,
                  `Consider selecting a leader from an opponent faction instead.\n`
                );
              }
              
              newState = this.completeTraitorSelection(
                newState,
                response.factionId,
                [selectedId],
                events
              );
            } else {
              // Invalid selection - pick first card as default
              newState = this.completeTraitorSelection(
                newState,
                response.factionId,
                [pendingCards[0].leaderId],
                events
              );
            }
          }
        } else if (response.passed) {
          // If they pass, auto-select first traitor
          const pendingCards = this.context.pendingTraitorSelection.get(response.factionId);
          if (pendingCards && pendingCards.length > 0) {
            newState = this.completeTraitorSelection(
              newState,
              response.factionId,
              [pendingCards[0].leaderId],
              events
            );
          }
        }
      }

      // Check if all traitor selections are complete
      const allComplete = Array.from(state.factions.keys()).every(
        f => this.context.completedTraitorSelection.has(f)
      );

      if (!allComplete) {
        return this.requestTraitorSelections(newState, events);
      }

      // Move to Fremen force distribution if Fremen is in game
      if (state.factions.has(Faction.FREMEN) && !this.context.fremenForcesDistributed) {
        this.context.step = 'FREMEN_FORCE_DISTRIBUTION';
        return this.requestFremenForceDistribution(newState, events);
      }

      // Setup complete
      this.context.step = 'COMPLETE';
    }

    // Process Fremen force distribution (rule 0.13, 2.04.02)
    if (this.context.step === 'FREMEN_FORCE_DISTRIBUTION') {
      for (const response of responses) {
        // Tool name 'distribute_fremen_forces' becomes 'DISTRIBUTE_FREMEN_FORCES' actionType
        if (response.factionId === Faction.FREMEN && response.actionType === 'DISTRIBUTE_FREMEN_FORCES') {
          // The tool returns { distribution: { sietch_tabr: { count, sector }, ... } }
          // OR the agent might pass sector params directly: { sietch_tabr: 5, sietch_tabr_sector: 13, ... }
          const toolData = response.data as Record<string, unknown>;
          let distribution: Record<string, { count: number; sector: number } | number>;
          
          if (toolData.distribution && typeof toolData.distribution === 'object') {
            // Tool format: { distribution: { sietch_tabr: { count, sector }, ... } }
            // CRITICAL: Filter to only include valid territories to prevent invalid placements
            const rawDistribution = toolData.distribution as Record<string, { count: number; sector: number } | number>;
            distribution = {};
            for (const territory of FREMEN_STARTING_TERRITORIES) {
              if (rawDistribution[territory] !== undefined) {
                distribution[territory] = rawDistribution[territory];
              }
            }
            
            // Log warning if invalid territories were provided
            const invalidTerritories = Object.keys(rawDistribution).filter(
              k => !FREMEN_STARTING_TERRITORIES.includes(k as TerritoryId)
            );
            if (invalidTerritories.length > 0) {
              console.warn(
                `[Fremen Force Distribution] Invalid territories in distribution object ignored: ${invalidTerritories.join(', ')}`
              );
            }
          } else {
            // Agent might pass sector params directly: { sietch_tabr: 5, sietch_tabr_sector: 13, ... }
            distribution = {};
            for (const territory of FREMEN_STARTING_TERRITORIES) {
              const count = typeof toolData[territory] === 'number' ? toolData[territory] as number : undefined;
              const sectorKey = `${territory}_sector`;
              const sector = typeof toolData[sectorKey] === 'number' ? toolData[sectorKey] as number : undefined;
              
              if (count !== undefined && count > 0) {
                if (sector !== undefined) {
                  distribution[territory] = { count, sector };
                } else {
                  distribution[territory] = count; // Will use default sector
                }
              }
            }
          }
          
          newState = this.distributeFremenForces(newState, distribution, events);
          this.context.fremenForcesDistributed = true;
        }
      }

      if (!this.context.fremenForcesDistributed) {
        return this.requestFremenForceDistribution(newState, events);
      }

      this.context.step = 'COMPLETE';
    }

    // Setup complete
    // Note: PhaseManager emits PHASE_ENDED event, so we don't emit it here

    // Log player positions for verification
    const playerPositions = getPlayerPositions(newState);
    console.log('\n' + '='.repeat(80));
    console.log('📍 PLAYER TOKEN POSITIONS');
    console.log('='.repeat(80));
    console.log('\nPlayer tokens placed around board edge (18 sectors):\n');
    const sortedPositions = Array.from(playerPositions.entries()).sort((a, b) => a[1] - b[1]);
    sortedPositions.forEach(([faction, sector]) => {
      console.log(`  ${FACTION_NAMES[faction]}: Sector ${sector}`);
    });
    console.log('\n💡 Storm order will be determined by which player token the storm next approaches counterclockwise.');
    console.log('   If storm is ON a player token, the NEXT player (counterclockwise) is first.\n');
    console.log('='.repeat(80) + '\n');

    return {
      state: newState,
      phaseComplete: true,
      nextPhase: Phase.STORM,
      pendingRequests: [],
      actions: [],
      events,
    };
  }

  cleanup(state: GameState): GameState {
    return state;
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * @rule 0.11
   * Creates the traitor deck by removing cards for factions not in play,
   * then shuffles it thoroughly. The deck is created from leaders of factions
   * currently in the game, effectively removing cards for factions not in play.
   * Each player is dealt 4 cards, then picks 1 card to keep (Harkonnen keeps all 4).
   */
  private createTraitorDeck(state: GameState): TraitorCard[] {
    // Create traitor cards from leaders in the game
    const traitors: TraitorCard[] = [];

    for (const [faction, factionState] of state.factions) {
      for (const leader of factionState.leaders) {
        traitors.push({
          leaderId: leader.definitionId,
          leaderName: leader.definitionId, // Will be resolved from definitions
          leaderFaction: faction,
          heldBy: null,
        });
      }
    }

    // Shuffle
    for (let i = traitors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [traitors[i], traitors[j]] = [traitors[j], traitors[i]];
    }

    return traitors;
  }

  /**
   * Initialize traitor selection step.
   * Harkonnen automatically keeps all 4, others choose 1.
   */
  private initializeTraitorSelection(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    let newState = state;

    events.push({
      type: 'SETUP_STEP',
      data: { step: 'TRAITOR_SELECTION' },
      message: 'Traitor selection beginning',
    });

    // @rule 2.05.03 - TERRIBLY TRAITOROUS: Harkonnen automatically keeps all 4
    if (state.factions.has(Faction.HARKONNEN)) {
      const dealt = this.context.pendingTraitorSelection.get(Faction.HARKONNEN);
      if (dealt) {
        // Log Harkonnen's automatic selection
        console.log('\n' + '='.repeat(80));
        console.log(`🎯 TRAITOR SELECTION: ${FACTION_NAMES[Faction.HARKONNEN]} (Auto-keeps all 4)`);
        console.log('='.repeat(80));
        console.log(`\n📋 Harkonnen automatically keeps all 4 traitors:\n`);
        dealt.forEach((traitor, index) => {
          const leaderDef = getLeaderDefinition(traitor.leaderId);
          console.log(`  ${index + 1}. ${leaderDef?.name ?? traitor.leaderName}`);
          console.log(`     Faction: ${FACTION_NAMES[traitor.leaderFaction]} (${traitor.leaderFaction})`);
          console.log(`     Strength: ${leaderDef?.strength ?? 0}`);
          console.log(`     ID: ${traitor.leaderId}`);
          console.log('');
        });
        console.log('='.repeat(80) + '\n');
        
        // Emit event with Harkonnen's available traitor options (all 4 are kept)
        const harkonnenTraitorOptions = dealt.map(t => {
          const leaderDef = getLeaderDefinition(t.leaderId);
          return {
            id: t.leaderId,
            name: leaderDef?.name ?? t.leaderName,
            faction: t.leaderFaction,
            factionName: FACTION_NAMES[t.leaderFaction],
            strength: leaderDef?.strength ?? 0,
          };
        });
        
        events.push({
          type: 'TRAITOR_OPTIONS_AVAILABLE',
          data: {
            faction: Faction.HARKONNEN,
            traitorOptions: harkonnenTraitorOptions.map(o => ({
              id: o.id,
              name: o.name,
              faction: o.faction,
              factionName: o.factionName,
              strength: o.strength,
            })),
            autoKept: true, // Harkonnen auto-keeps all
          },
          message: `${FACTION_NAMES[Faction.HARKONNEN]} automatically keeps all ${harkonnenTraitorOptions.length} traitors`,
        });
        
        newState = this.completeTraitorSelection(
          newState,
          Faction.HARKONNEN,
          dealt.map(t => t.leaderId),
          events
        );
      }
    }

    // Request traitor selection from non-Harkonnen factions
    return this.requestTraitorSelections(newState, events);
  }

  private requestTraitorSelections(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    const pendingRequests: AgentRequest[] = [];

    for (const [faction, dealtCards] of this.context.pendingTraitorSelection) {
      // Skip Harkonnen (auto-keeps all) and already completed
      if (faction === Faction.HARKONNEN) continue;
      if (this.context.completedTraitorSelection.has(faction)) continue;

      // Build detailed traitor options with full leader info
      const traitorOptions = dealtCards.map(t => {
        const leaderDef = getLeaderDefinition(t.leaderId);
        return {
        id: t.leaderId,
          name: leaderDef?.name ?? t.leaderName,
        faction: t.leaderFaction,
          factionName: FACTION_NAMES[t.leaderFaction],
          strength: leaderDef?.strength ?? 0,
        };
      });

      // Log all traitor options for this faction
      console.log('\n' + '='.repeat(80));
      console.log(`🎯 TRAITOR SELECTION: ${FACTION_NAMES[faction]}`);
      console.log('='.repeat(80));
      console.log(`\n📋 Available Traitor Options (choose 1):\n`);
      traitorOptions.forEach((option, index) => {
        console.log(`  ${index + 1}. ${option.name}`);
        console.log(`     Faction: ${option.factionName} (${option.faction})`);
        console.log(`     Strength: ${option.strength}`);
        console.log(`     ID: ${option.id}`);
        console.log('');
      });
      console.log('💡 Strategy: Choose a traitor from a faction you expect to fight.');
      console.log('   Higher strength leaders are more valuable as traitors.');
      console.log('='.repeat(80) + '\n');

      // Emit event with available traitor options for visualization
      events.push({
        type: 'TRAITOR_OPTIONS_AVAILABLE',
        data: {
          faction,
          traitorOptions: traitorOptions.map(o => ({
            id: o.id,
            name: o.name,
            faction: o.faction,
            factionName: o.factionName,
            strength: o.strength,
          })),
        },
        message: `${FACTION_NAMES[faction]} has ${traitorOptions.length} traitor options available`,
      });

      pendingRequests.push({
        factionId: faction,
        requestType: 'SELECT_TRAITOR',
        prompt: `Choose 1 traitor to keep from the 4 dealt to you. You can use this traitor to betray an opponent in battle if they use this leader.`,
        context: {
          traitorOptions: traitorOptions.map(o => ({
            id: o.id,
            name: o.name,
            faction: o.faction,
            factionName: o.factionName,
            strength: o.strength,
          })),
          mustKeep: 1,
        },
        availableActions: ['SELECT_TRAITOR'],
      });
    }

    return {
      state,
      phaseComplete: pendingRequests.length === 0,
      pendingRequests,
      simultaneousRequests: true,
      actions: [],
      events,
    };
  }

  private completeTraitorSelection(
    state: GameState,
    faction: Faction,
    selectedIds: string[],
    events: PhaseEvent[]
  ): GameState {
    const pendingCards = this.context.pendingTraitorSelection.get(faction);
    if (!pendingCards) return state;

    // Get the selected traitor cards
    const keptTraitors = pendingCards.filter(t => selectedIds.includes(t.leaderId));
    keptTraitors.forEach(t => t.heldBy = faction);

    // Log the selection with full details
    console.log('\n' + '='.repeat(80));
    console.log(`✅ TRAITOR SELECTED: ${FACTION_NAMES[faction]}`);
    console.log('='.repeat(80));
    
    keptTraitors.forEach((traitor) => {
      const leaderDef = getLeaderDefinition(traitor.leaderId);
      console.log(`\n  Selected: ${leaderDef?.name ?? traitor.leaderName}`);
      console.log(`    Faction: ${FACTION_NAMES[traitor.leaderFaction]} (${traitor.leaderFaction})`);
      console.log(`    Strength: ${leaderDef?.strength ?? 0}`);
      console.log(`    ID: ${traitor.leaderId}`);
    });
    
    // Show what was NOT selected (for comparison)
    const notSelected = pendingCards.filter(t => !selectedIds.includes(t.leaderId));
    if (notSelected.length > 0) {
      console.log(`\n  Not Selected:`);
      notSelected.forEach((traitor) => {
        const leaderDef = getLeaderDefinition(traitor.leaderId);
        console.log(`    - ${leaderDef?.name ?? traitor.leaderName} (${FACTION_NAMES[traitor.leaderFaction]}, Strength: ${leaderDef?.strength ?? 0})`);
      });
    }
    
    console.log('='.repeat(80) + '\n');

    // Update faction state
    const newFactions = new Map(state.factions);
    const factionState = { ...newFactions.get(faction)! };
    factionState.traitors = keptTraitors;
    newFactions.set(faction, factionState);

    this.context.completedTraitorSelection.add(faction);

    events.push({
      type: 'TRAITOR_SELECTED',
      data: {
        faction,
        count: keptTraitors.length,
        // Don't reveal which traitors were selected - that's secret!
      },
      message: `${faction} has selected ${keptTraitors.length} traitor${keptTraitors.length > 1 ? 's' : ''}`,
    });

    return {
      ...state,
      factions: newFactions,
    };
  }

  private requestBGPrediction(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    const otherFactions = Array.from(state.factions.keys()).filter(
      f => f !== Faction.BENE_GESSERIT
    );

    const pendingRequests: AgentRequest[] = [{
      factionId: Faction.BENE_GESSERIT,
      requestType: 'BG_PREDICTION',
      prompt: `Make your secret prediction: Which faction will win, and on which turn? If correct, you win instead!`,
      context: {
        availableFactions: otherFactions,
        maxTurns: state.config.maxTurns,
      },
      availableActions: ['BG_PREDICTION'],
    }];

    return {
      state,
      phaseComplete: false,
      pendingRequests,
      actions: [],
      events,
    };
  }

  private setBGPrediction(
    state: GameState,
    predictedFaction: Faction,
    predictedTurn: number,
    events: PhaseEvent[]
  ): GameState {
    const newFactions = new Map(state.factions);
    const bgState = { ...newFactions.get(Faction.BENE_GESSERIT)! };

    bgState.beneGesseritPrediction = {
      faction: predictedFaction,
      turn: Math.max(1, Math.min(predictedTurn, state.config.maxTurns)),
    };

    newFactions.set(Faction.BENE_GESSERIT, bgState);

    events.push({
      type: 'BG_PREDICTION_MADE',
      data: {
        // Prediction is SECRET - don't reveal it!
        message: 'Bene Gesserit has made their secret prediction',
      },
      message: 'Bene Gesserit has made their secret prediction',
    });

    return {
      ...state,
      factions: newFactions,
    };
  }

  /**
   * Request Fremen force distribution (rule 2.04.02).
   * Fremen distributes 10 forces across Sietch Tabr, False Wall South, False Wall West.
   */
  private requestFremenForceDistribution(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    events.push({
      type: 'SETUP_STEP',
      data: { step: 'FREMEN_FORCE_DISTRIBUTION' },
      message: 'Fremen must distribute starting forces',
    });

    const pendingRequests: AgentRequest[] = [{
      factionId: Faction.FREMEN,
      requestType: 'DISTRIBUTE_FORCES',
      prompt: `FREMEN STARTING FORCE DISTRIBUTION (Rule 2.04.02)

You must distribute EXACTLY 10 forces total across these three territories, choosing both territory and sector:
- sietch_tabr (Sietch Tabr - your stronghold) - sector 13
- false_wall_south (False Wall South) - sectors 3 or 4
- false_wall_west (False Wall West) - sectors 15, 16, or 17

Use the distribute_fremen_forces tool with these EXACT territory IDs and optional sector parameters.
The total of sietch_tabr + false_wall_south + false_wall_west MUST equal 10.

Example: { 
  sietch_tabr: 5, 
  sietch_tabr_sector: 13,
  false_wall_south: 3, 
  false_wall_south_sector: 4,
  false_wall_west: 2,
  false_wall_west_sector: 16
}`,
      context: {
        totalForcesToDistribute: 10,
        validTerritoryIds: ['sietch_tabr', 'false_wall_south', 'false_wall_west'],
        example: {
          sietch_tabr: 5,
          false_wall_south: 3,
          false_wall_west: 2,
        },
      },
      availableActions: ['DISTRIBUTE_FORCES'],
    }];

    return {
      state,
      phaseComplete: false,
      pendingRequests,
      actions: [],
      events,
    };
  }

  /**
   * @rule 2.04.02
   * Apply Fremen force distribution to game state.
   * Places 10 forces distributed across Sietch Tabr, False Wall South, and False Wall West.
   */
  private distributeFremenForces(
    state: GameState,
    distribution: Record<string, { count: number; sector: number } | number>,
    events: PhaseEvent[]
  ): GameState {
    const newFactions = new Map(state.factions);
    const fremenState = { ...newFactions.get(Faction.FREMEN)! };

    // Log what the agent tried to do
    console.log('\n[Fremen Force Distribution] Agent submitted:');
    console.log('  Distribution:', JSON.stringify(distribution, null, 2));

    // Validate total forces = 10
    let totalDistributed = 0;
    const validatedDistribution: Record<string, { count: number; sector: number }> = {};

    for (const territory of FREMEN_STARTING_TERRITORIES) {
      const territoryData = distribution[territory];
      
      // Handle both old format (just number) and new format (object with count and sector)
      let count: number;
      let sector: number;
      
      if (typeof territoryData === 'object' && territoryData !== null && 'count' in territoryData) {
        count = (territoryData as { count: number; sector: number }).count;
        sector = (territoryData as { count: number; sector: number }).sector;
      } else {
        count = (territoryData as number) || 0;
        // Default sectors if not provided
        sector = territory === 'sietch_tabr' ? 13 :
                 territory === 'false_wall_south' ? 3 : 15;
      }
      
      validatedDistribution[territory] = { count, sector };
      totalDistributed += count;
    }

    console.log('  Validated totals by territory:');
    for (const [territory, data] of Object.entries(validatedDistribution)) {
      console.log(`    ${territory}: ${data.count} in sector ${data.sector}`);
    }
    console.log(`  Total: ${totalDistributed} (required: 10)`);

    // Check for invalid keys
    const invalidKeys = Object.keys(distribution).filter(
      k => !FREMEN_STARTING_TERRITORIES.includes(k as TerritoryId) && !k.endsWith('_sector')
    );
    if (invalidKeys.length > 0) {
      console.log(`  WARNING: Invalid territory keys ignored: ${invalidKeys.join(', ')}`);
    }

    // If invalid distribution, use default even split
    if (totalDistributed !== 10) {
      console.log(`  INVALID: Total is ${totalDistributed}, not 10. Using default distribution.`);
      validatedDistribution['sietch_tabr'] = { count: 4, sector: 13 };
      validatedDistribution['false_wall_south'] = { count: 3, sector: 3 };
      validatedDistribution['false_wall_west'] = { count: 3, sector: 15 };
      console.log('  Default applied: sietch_tabr=4 (sector 13), false_wall_south=3 (sector 3), false_wall_west=3 (sector 15)');
    }

    // Update forces on board
    const forcesOnBoard = [...fremenState.forces.onBoard];

    // Map of territory to valid sectors
    const territorySectors: Record<string, number[]> = {
      sietch_tabr: [13],
      false_wall_south: [3, 4],
      false_wall_west: [15, 16, 17],
    };

    for (const territory of FREMEN_STARTING_TERRITORIES) {
      const territoryData = validatedDistribution[territory];
      const count = territoryData.count;
      let sector = territoryData.sector;

      if (count > 0) {
        // Validate sector
        const validSectors = territorySectors[territory] || [];
        if (!validSectors.includes(sector)) {
          console.warn(`[Fremen Force Distribution] Invalid sector ${sector} for ${territory}, using default`);
          sector = validSectors[0]; // Use first valid sector as default
        }

        // Check if there's already a stack in this territory and sector
        const existingIndex = forcesOnBoard.findIndex(
          stack => stack.territoryId === territory && stack.sector === sector
        );

        if (existingIndex >= 0) {
          // Update existing stack
          forcesOnBoard[existingIndex] = {
            ...forcesOnBoard[existingIndex],
            forces: {
              ...forcesOnBoard[existingIndex].forces,
              regular: forcesOnBoard[existingIndex].forces.regular + count,
            },
          };
        } else {
          // Create new stack with specified sector
          // CRITICAL: Double-check territory is valid before adding to board
          if (!FREMEN_STARTING_TERRITORIES.includes(territory as TerritoryId)) {
            console.error(
              `[Fremen Force Distribution] CRITICAL: Attempted to place forces in invalid territory: ${territory}. This should never happen!`
            );
            continue; // Skip invalid territory
          }
          
          forcesOnBoard.push({
            factionId: Faction.FREMEN,
            territoryId: territory as TerritoryId,
            sector: sector,
            forces: { regular: count, elite: 0 },
          });
        }
      }
    }

    // Update faction state - reduce reserves by 10 (moved to board)
    fremenState.forces = {
      ...fremenState.forces,
      onBoard: forcesOnBoard,
      reserves: {
        ...fremenState.forces.reserves,
        regular: fremenState.forces.reserves.regular - 10, // 20 -> 10 in reserves
      },
    };

    newFactions.set(Faction.FREMEN, fremenState);

    events.push({
      type: 'FORCES_PLACED',
      data: {
        faction: Faction.FREMEN,
        distribution: validatedDistribution,
      },
      message: `Fremen distributed 10 starting forces: ${Object.entries(validatedDistribution)
        .filter(([_, data]) => data.count > 0)
        .map(([territory, data]) => `${data.count} in ${territory.replace(/_/g, ' ')} (sector ${data.sector})`)
        .join(', ')}`,
    });

    return {
      ...state,
      factions: newFactions,
    };
  }
}
