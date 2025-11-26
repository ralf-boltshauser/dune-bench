/**
 * Spice Blow Phase Handler
 *
 * Phase 1.02: Spice Blow
 * - Draw spice card(s) from the deck
 * - Place spice on territories (unless in storm)
 * - Handle Shai-Hulud (sandworm) appearances
 * - Trigger Nexus when worm appears
 * - First turn reveals 2 cards (A and B), subsequent turns reveal 1 (A)
 */

import {
  Faction,
  Phase,
  SpiceCardType,
  TerritoryId,
  type GameState,
  type SpiceCard,
  TERRITORY_DEFINITIONS,
} from '../../types';
import {
  addSpiceToTerritory,
  destroySpiceInTerritory,
  sendForcesToTanks,
  logAction,
  getFactionsInTerritory,
} from '../../state';
import { getSpiceCardDefinition, isShaiHulud } from '../../data';
import { GAME_CONSTANTS } from '../../data';
import {
  type PhaseHandler,
  type PhaseStepResult,
  type AgentRequest,
  type AgentResponse,
  type PhaseEvent,
} from '../types';

// =============================================================================
// SPICE BLOW PHASE CONTEXT
// =============================================================================

interface SpiceBlowContext {
  cardARevealed: boolean;
  cardBRevealed: boolean;
  lastSpiceLocation: { territoryId: TerritoryId; sector: number } | null;
  shaiHuludCount: number;
  nexusTriggered: boolean;
  nexusResolved: boolean;
  fremenWormChoice: 'devour' | 'ride' | null;
  factionsActedInNexus: Set<Faction>;
}

// =============================================================================
// SPICE BLOW PHASE HANDLER
// =============================================================================

export class SpiceBlowPhaseHandler implements PhaseHandler {
  readonly phase = Phase.SPICE_BLOW;

  private context: SpiceBlowContext = {
    cardARevealed: false,
    cardBRevealed: false,
    lastSpiceLocation: null,
    shaiHuludCount: 0,
    nexusTriggered: false,
    nexusResolved: false,
    fremenWormChoice: null,
    factionsActedInNexus: new Set(),
  };

  initialize(state: GameState): PhaseStepResult {
    // Reset context
    this.context = {
      cardARevealed: false,
      cardBRevealed: false,
      lastSpiceLocation: null,
      shaiHuludCount: 0,
      nexusTriggered: false,
      nexusResolved: false,
      fremenWormChoice: null,
      factionsActedInNexus: new Set(),
    };

    const events: PhaseEvent[] = [];

    events.push({
      type: 'PHASE_STARTED',
      data: { phase: Phase.SPICE_BLOW, turn: state.turn },
      message: 'Spice Blow phase started',
    });

    // Start by revealing Card A - merge events
    const cardResult = this.revealSpiceCard(state, 'A');
    return {
      ...cardResult,
      events: [...events, ...cardResult.events],
    };
  }

  processStep(state: GameState, responses: AgentResponse[]): PhaseStepResult {
    // Handle Nexus responses
    if (this.context.nexusTriggered && !this.context.nexusResolved) {
      return this.processNexusResponses(state, responses);
    }

    // Handle Fremen worm choice
    if (this.context.shaiHuludCount > 0 && this.context.fremenWormChoice === null) {
      return this.processFremenWormChoice(state, responses);
    }

    // Continue with card reveals
    if (!this.context.cardARevealed) {
      return this.revealSpiceCard(state, 'A');
    }

    // First turn: also reveal Card B
    if (state.turn === 1 && !this.context.cardBRevealed) {
      return this.revealSpiceCard(state, 'B');
    }

    // Phase complete
    return {
      state,
      phaseComplete: true,
      nextPhase: Phase.CHOAM_CHARITY,
      pendingRequests: [],
      actions: [],
      events: [],
    };
  }

  cleanup(state: GameState): GameState {
    // Reset nexus flag
    return { ...state, nexusOccurring: false };
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private revealSpiceCard(
    state: GameState,
    deckType: 'A' | 'B'
  ): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;

    // Draw from appropriate deck
    const deck = deckType === 'A' ? state.spiceDeck : state.spiceDeck;
    if (deck.length === 0) {
      // Reshuffle discard back into deck
      newState = this.reshuffleSpiceDeck(newState, deckType);
    }

    if (newState.spiceDeck.length === 0) {
      // No cards to draw
      if (deckType === 'A') {
        this.context.cardARevealed = true;
      } else {
        this.context.cardBRevealed = true;
      }
      return {
        state: newState,
        phaseComplete: false,
        pendingRequests: [],
        actions: [],
        events: [],
      };
    }

    // Draw the top card
    const [card, ...remainingDeck] = newState.spiceDeck;
    newState = { ...newState, spiceDeck: remainingDeck };

    const cardDef = getSpiceCardDefinition(card.definitionId);
    if (!cardDef) {
      // Invalid card, skip
      if (deckType === 'A') this.context.cardARevealed = true;
      else this.context.cardBRevealed = true;
      return {
        state: newState,
        phaseComplete: false,
        pendingRequests: [],
        actions: [],
        events: [],
      };
    }

    events.push({
      type: 'SPICE_CARD_REVEALED',
      data: {
        card: cardDef.name,
        type: cardDef.type,
        deck: deckType,
      },
      message: `Spice Card ${deckType} revealed: ${cardDef.name}`,
    });

    // Handle based on card type
    if (isShaiHulud(cardDef)) {
      return this.handleShaiHulud(newState, card, deckType, events);
    } else {
      return this.handleTerritoryCard(newState, card, cardDef, deckType, events);
    }
  }

  private handleTerritoryCard(
    state: GameState,
    card: SpiceCard,
    cardDef: { territoryId?: TerritoryId; sector?: number; spiceAmount?: number; name: string },
    deckType: 'A' | 'B',
    events: PhaseEvent[]
  ): PhaseStepResult {
    if (!cardDef.territoryId || cardDef.sector === undefined || !cardDef.spiceAmount) {
      // Invalid territory card
      if (deckType === 'A') this.context.cardARevealed = true;
      else this.context.cardBRevealed = true;
      return {
        state,
        phaseComplete: false,
        pendingRequests: [],
        actions: [],
        events,
      };
    }

    const territoryId = cardDef.territoryId;
    const sector = cardDef.sector;
    const amount = cardDef.spiceAmount;

    // Check if location is in storm
    const inStorm = this.isInStorm(state, sector);

    let newState = state;

    if (inStorm) {
      // Spice doesn't blow - card goes to discard
      events.push({
        type: 'SPICE_CARD_REVEALED',
        data: { territory: territoryId, sector, amount, inStorm: true },
        message: `${cardDef.name}: No spice blow - territory is in storm`,
      });

      // Discard the card
      newState = this.discardSpiceCard(newState, card, deckType);
    } else {
      // Place spice on territory
      newState = addSpiceToTerritory(newState, territoryId, sector, amount);
      this.context.lastSpiceLocation = { territoryId, sector };

      events.push({
        type: 'SPICE_PLACED',
        data: { territory: territoryId, sector, amount },
        message: `${amount} spice placed in ${territoryId} (sector ${sector})`,
      });

      newState = logAction(newState, 'SPICE_BLOW', null, {
        territory: territoryId,
        sector,
        amount,
      });

      // Discard the card
      newState = this.discardSpiceCard(newState, card, deckType);
    }

    if (deckType === 'A') this.context.cardARevealed = true;
    else this.context.cardBRevealed = true;

    return {
      state: newState,
      phaseComplete: false,
      pendingRequests: [],
      actions: [],
      events,
    };
  }

  private handleShaiHulud(
    state: GameState,
    card: SpiceCard,
    deckType: 'A' | 'B',
    events: PhaseEvent[]
  ): PhaseStepResult {
    this.context.shaiHuludCount++;
    let newState = { ...state, wormCount: state.wormCount + 1 };

    events.push({
      type: 'SHAI_HULUD_APPEARED',
      data: { wormNumber: newState.wormCount },
      message: 'Shai-Hulud appears!',
    });

    // Check for Shield Wall destruction (3+ worms variant)
    if (
      newState.wormCount >= GAME_CONSTANTS.WORMS_TO_DESTROY_SHIELD_WALL &&
      !newState.shieldWallDestroyed &&
      newState.config.variants.shieldWallStronghold
    ) {
      newState = { ...newState, shieldWallDestroyed: true };
      events.push({
        type: 'SPICE_CARD_REVEALED',
        data: { shieldWallDestroyed: true },
        message: 'The Shield Wall is destroyed!',
      });
    }

    // Discard the worm card
    newState = this.discardSpiceCard(newState, card, deckType);

    // Check if Fremen is in game for worm control
    const hasFremen = newState.factions.has(Faction.FREMEN);
    const pendingRequests: AgentRequest[] = [];

    if (hasFremen && this.context.lastSpiceLocation) {
      // Fremen can choose to ride the worm or let it devour
      pendingRequests.push({
        factionId: Faction.FREMEN,
        requestType: 'WORM_RIDE',
        prompt: 'A sandworm appears! Do you want to ride the worm or let it devour forces in the territory?',
        context: {
          lastSpiceLocation: this.context.lastSpiceLocation,
          forcesInTerritory: getFactionsInTerritory(
            newState,
            this.context.lastSpiceLocation.territoryId
          ),
        },
        availableActions: ['WORM_RIDE', 'WORM_DEVOUR'],
      });

      if (deckType === 'A') this.context.cardARevealed = true;
      else this.context.cardBRevealed = true;

      return {
        state: newState,
        phaseComplete: false,
        pendingRequests,
        actions: [],
        events,
      };
    }

    // No Fremen - worm devours automatically
    const devourResult = this.devourForces(newState, events);
    newState = devourResult.state;
    events.push(...devourResult.events);

    // Trigger Nexus
    this.context.nexusTriggered = true;
    newState = { ...newState, nexusOccurring: true };

    events.push({
      type: 'NEXUS_STARTED',
      data: {},
      message: 'Nexus! Alliance negotiations may occur.',
    });

    newState = logAction(newState, 'NEXUS_STARTED', null, {});

    if (deckType === 'A') this.context.cardARevealed = true;
    else this.context.cardBRevealed = true;

    // Request alliance decisions from all factions
    return this.requestNexusDecisions(newState, events);
  }

  private devourForces(
    state: GameState,
    events: PhaseEvent[]
  ): { state: GameState; events: PhaseEvent[] } {
    const newEvents: PhaseEvent[] = [];

    if (!this.context.lastSpiceLocation) {
      // No previous spice location - worm devours nothing
      return { state, events: newEvents };
    }

    const { territoryId, sector } = this.context.lastSpiceLocation;
    let newState = state;

    // Destroy all spice in territory
    const spiceInTerritory = state.spiceOnBoard.find(
      (s) => s.territoryId === territoryId && s.sector === sector
    );

    if (spiceInTerritory) {
      newState = destroySpiceInTerritory(newState, territoryId, sector);
      newEvents.push({
        type: 'SPICE_DESTROYED_BY_STORM',
        data: { territory: territoryId, sector, amount: spiceInTerritory.amount },
        message: `${spiceInTerritory.amount} spice destroyed by sandworm in ${territoryId}`,
      });
    }

    // Destroy forces in territory (except Fremen who can ride away)
    for (const [faction, factionState] of newState.factions) {
      const forcesInSector = factionState.forces.onBoard.find(
        (f) => f.territoryId === territoryId && f.sector === sector
      );

      if (forcesInSector) {
        const totalForces = forcesInSector.forces.regular + forcesInSector.forces.elite;

        if (faction === Faction.FREMEN) {
          // Fremen forces can escape (half survive, rounded up)
          const survivors = Math.ceil(totalForces / 2);
          const killed = totalForces - survivors;
          if (killed > 0) {
            newState = sendForcesToTanks(newState, faction, territoryId, sector, killed);
            newEvents.push({
              type: 'FORCES_DEVOURED',
              data: { faction, territory: territoryId, sector, count: killed, survivors },
              message: `${killed} Fremen forces devoured (${survivors} escaped)`,
            });
          }
        } else {
          // All other forces are devoured
          newState = sendForcesToTanks(newState, faction, territoryId, sector, totalForces);
          newEvents.push({
            type: 'FORCES_DEVOURED',
            data: { faction, territory: territoryId, sector, count: totalForces },
            message: `${totalForces} ${faction} forces devoured by sandworm`,
          });
        }
      }
    }

    newState = logAction(newState, 'SHAI_HULUD', null, {
      territory: territoryId,
      sector,
    });

    return { state: newState, events: newEvents };
  }

  private processFremenWormChoice(
    state: GameState,
    responses: AgentResponse[]
  ): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;

    const fremenResponse = responses.find((r) => r.factionId === Faction.FREMEN);

    if (fremenResponse?.actionType === 'WORM_RIDE') {
      this.context.fremenWormChoice = 'ride';
      // Fremen rides the worm - can move to any sand territory
      // For simplicity, just skip the devour
      events.push({
        type: 'SPICE_CARD_REVEALED',
        data: { fremenRode: true },
        message: 'Fremen rides the sandworm!',
      });
    } else {
      this.context.fremenWormChoice = 'devour';
      // Normal devour
      const devourResult = this.devourForces(newState, events);
      newState = devourResult.state;
      events.push(...devourResult.events);
    }

    // Trigger Nexus
    this.context.nexusTriggered = true;
    newState = { ...newState, nexusOccurring: true };

    events.push({
      type: 'NEXUS_STARTED',
      data: {},
      message: 'Nexus! Alliance negotiations may occur.',
    });

    newState = logAction(newState, 'NEXUS_STARTED', null, {});

    return this.requestNexusDecisions(newState, events);
  }

  private requestNexusDecisions(
    state: GameState,
    events: PhaseEvent[]
  ): PhaseStepResult {
    const pendingRequests: AgentRequest[] = [];

    // Request from all factions in storm order
    for (const faction of state.stormOrder) {
      if (this.context.factionsActedInNexus.has(faction)) continue;

      const factionState = state.factions.get(faction);
      if (!factionState) continue;

      pendingRequests.push({
        factionId: faction,
        requestType: 'ALLIANCE_DECISION',
        prompt: `Nexus! You may form or break an alliance. Current ally: ${factionState.allyId || 'None'}`,
        context: {
          currentAlly: factionState.allyId,
          availableFactions: state.stormOrder.filter(
            (f) => f !== faction && !state.factions.get(f)?.allyId
          ),
          turn: state.turn,
        },
        availableActions: ['FORM_ALLIANCE', 'BREAK_ALLIANCE', 'PASS'],
      });
    }

    if (pendingRequests.length === 0) {
      // Nexus complete
      this.context.nexusResolved = true;

      events.push({
        type: 'NEXUS_ENDED',
        data: {},
        message: 'Nexus ends.',
      });

      return {
        state: { ...state, nexusOccurring: false },
        phaseComplete: false,
        pendingRequests: [],
        actions: [],
        events,
      };
    }

    return {
      state,
      phaseComplete: false,
      pendingRequests,
      simultaneousRequests: false, // Nexus is in storm order
      actions: [],
      events,
    };
  }

  private processNexusResponses(
    state: GameState,
    responses: AgentResponse[]
  ): PhaseStepResult {
    const events: PhaseEvent[] = [];
    let newState = state;

    for (const response of responses) {
      this.context.factionsActedInNexus.add(response.factionId);

      if (response.actionType === 'FORM_ALLIANCE' && response.data.targetFaction) {
        const targetFaction = response.data.targetFaction as Faction;
        const targetState = newState.factions.get(targetFaction);

        // Check if target is available
        if (targetState && !targetState.allyId) {
          // Form alliance
          newState = this.formAlliance(newState, response.factionId, targetFaction);

          events.push({
            type: 'ALLIANCE_FORMED',
            data: { faction1: response.factionId, faction2: targetFaction },
            message: `${response.factionId} and ${targetFaction} form an alliance!`,
          });

          newState = logAction(newState, 'ALLIANCE_FORMED', response.factionId, {
            ally: targetFaction,
          });
        }
      } else if (response.actionType === 'BREAK_ALLIANCE') {
        const factionState = newState.factions.get(response.factionId);
        if (factionState?.allyId) {
          const formerAlly = factionState.allyId;
          newState = this.breakAlliance(newState, response.factionId);

          events.push({
            type: 'ALLIANCE_BROKEN',
            data: { faction1: response.factionId, faction2: formerAlly },
            message: `${response.factionId} breaks alliance with ${formerAlly}`,
          });

          newState = logAction(newState, 'ALLIANCE_BROKEN', response.factionId, {
            formerAlly,
          });
        }
      }
    }

    // Continue requesting from remaining factions
    return this.requestNexusDecisions(newState, events);
  }

  private formAlliance(state: GameState, faction1: Faction, faction2: Faction): GameState {
    const factions = new Map(state.factions);

    const state1 = factions.get(faction1);
    const state2 = factions.get(faction2);

    if (state1 && state2) {
      factions.set(faction1, { ...state1, allyId: faction2 });
      factions.set(faction2, { ...state2, allyId: faction1 });
    }

    return { ...state, factions };
  }

  private breakAlliance(state: GameState, faction: Faction): GameState {
    const factions = new Map(state.factions);
    const factionState = factions.get(faction);

    if (factionState?.allyId) {
      const allyState = factions.get(factionState.allyId);
      if (allyState) {
        factions.set(factionState.allyId, { ...allyState, allyId: null });
      }
      factions.set(faction, { ...factionState, allyId: null });
    }

    return { ...state, factions };
  }

  private isInStorm(state: GameState, sector: number): boolean {
    return state.stormSector === sector;
  }

  private reshuffleSpiceDeck(state: GameState, deckType: 'A' | 'B'): GameState {
    const discardPile = deckType === 'A' ? state.spiceDiscardA : state.spiceDiscardB;

    if (discardPile.length === 0) {
      return state;
    }

    // Shuffle the discard pile
    const newDeck = [...discardPile];
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }

    return {
      ...state,
      spiceDeck: newDeck,
      spiceDiscardA: deckType === 'A' ? [] : state.spiceDiscardA,
      spiceDiscardB: deckType === 'B' ? [] : state.spiceDiscardB,
    };
  }

  private discardSpiceCard(state: GameState, card: SpiceCard, deckType: 'A' | 'B'): GameState {
    if (deckType === 'A') {
      return {
        ...state,
        spiceDiscardA: [...state.spiceDiscardA, card],
      };
    } else {
      return {
        ...state,
        spiceDiscardB: [...state.spiceDiscardB, card],
      };
    }
  }
}
