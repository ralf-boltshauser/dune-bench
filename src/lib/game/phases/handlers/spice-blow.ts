/**
 * Spice Blow Phase Handler
 *
 * Phase 1.02: Spice Blow
 * - Draw spice card(s) from TWO SEPARATE DECKS (A and B)
 * - Place spice on territories (unless in storm)
 * - Handle Shai-Hulud (sandworm) appearances
 * - Worms devour in territory of PREVIOUS CARD ON THAT PILE
 * - Trigger Nexus when worm appears
 * - First turn reveals 2 cards (A and B), subsequent turns reveal 1 (A)
 *
 * TWO-PILE SYSTEM:
 * - Card A drawn from spiceDeckA → discarded to spiceDiscardA
 * - Card B drawn from spiceDeckB → discarded to spiceDiscardB
 * - Worm on pile A devours at location from topmost Territory Card in spiceDiscardA
 * - Worm on pile B devours at location from topmost Territory Card in spiceDiscardB
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
import { FACTION_NAMES } from '../../types';
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
  // Turn 1 handling: Shai-Hulud cards revealed on turn 1 are set aside
  // and reshuffled back into the deck at the end of the phase (Rule 1.02.02)
  turnOneWormsSetAside: SpiceCard[];
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
    turnOneWormsSetAside: [],
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
      turnOneWormsSetAside: [],
    };

    const events: PhaseEvent[] = [];

    // Note: PhaseManager emits PHASE_STARTED event, so we don't emit it here

    console.log('\n' + '='.repeat(80));
    console.log('🌪️  SPICE BLOW PHASE (Turn ' + state.turn + ')');
    console.log('='.repeat(80));
    console.log(`\n📍 Storm Sector: ${state.stormSector}`);
    if (state.turn === 1) {
      console.log('⚠️  Turn 1: Shai-Hulud cards will be set aside and reshuffled');
      console.log('⚠️  Turn 1: No Nexus can occur');
    }
    console.log('='.repeat(80) + '\n');

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

    // Double Spice Blow (Rule 1.13.02): In Advanced Rules, reveal a second card
    // "DOUBLE SPICE BLOW: After 1.02.01 another Spice Card will be Revealed
    // creating a second Spice Card discard pile"
    if (state.config.advancedRules && !this.context.cardBRevealed) {
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
    let newState = state;

    // Turn 1: Reshuffle set-aside Shai-Hulud cards back into BOTH decks (Rule 1.02.02)
    // "FIRST TURN: During the first turn's Spice Blow Phase only, all Shai-Hulud
    // cards Revealed are ignored, Set Aside, then reshuffled back into the Spice
    // deck after this Phase."
    if (this.context.turnOneWormsSetAside.length > 0) {
      // Split worms between both decks
      const wormsForA = this.context.turnOneWormsSetAside.filter((_, i) => i % 2 === 0);
      const wormsForB = this.context.turnOneWormsSetAside.filter((_, i) => i % 2 === 1);

      const newDeckA = [...newState.spiceDeckA, ...wormsForA];
      const newDeckB = [...newState.spiceDeckB, ...wormsForB];

      // Shuffle both decks
      for (let i = newDeckA.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeckA[i], newDeckA[j]] = [newDeckA[j], newDeckA[i]];
      }
      for (let i = newDeckB.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeckB[i], newDeckB[j]] = [newDeckB[j], newDeckB[i]];
      }

      newState = { ...newState, spiceDeckA: newDeckA, spiceDeckB: newDeckB };
    }

    // Reset nexus flag
    return { ...newState, nexusOccurring: false };
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

    // Draw from appropriate deck (TWO SEPARATE DECKS for two separate piles)
    const deck = deckType === 'A' ? state.spiceDeckA : state.spiceDeckB;
    if (deck.length === 0) {
      // Reshuffle discard back into deck
      newState = this.reshuffleSpiceDeck(newState, deckType);
    }

    const currentDeck = deckType === 'A' ? newState.spiceDeckA : newState.spiceDeckB;
    if (currentDeck.length === 0) {
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

    // Draw the top card from the appropriate deck
    const [card, ...remainingDeck] = currentDeck;
    newState = deckType === 'A'
      ? { ...newState, spiceDeckA: remainingDeck }
      : { ...newState, spiceDeckB: remainingDeck };

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

    console.log(`\n🎴 Revealing Spice Card ${deckType}: ${cardDef.name}`);
    if (isShaiHulud(cardDef)) {
      console.log('   Type: Shai-Hulud (Sandworm)');
    } else {
      console.log(`   Type: Territory Card`);
      if (cardDef.territoryId && cardDef.sector !== undefined && cardDef.spiceAmount) {
        const inStorm = this.isInStorm(newState, cardDef.sector);
        console.log(`   Territory: ${cardDef.territoryId}, Sector: ${cardDef.sector}, Amount: ${cardDef.spiceAmount}`);
        console.log(`   In Storm: ${inStorm ? 'Yes - No spice placed' : 'No - Spice will be placed'}`);
      }
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
      // Territory Card
      const result = this.handleTerritoryCard(newState, card, cardDef, deckType, events);
      
      // Rule 1.02.05: "Continue discarding Spice Blow cards until a Territory Card is discarded. Now a Nexus will occur."
      // If we were in a Shai-Hulud chain (shaiHuludCount > 0), trigger Nexus now
      if (this.context.shaiHuludCount > 0 && state.turn > 1 && !this.context.nexusTriggered) {
        console.log(`\n   ✅ Territory Card found after ${this.context.shaiHuludCount} Shai-Hulud card(s)`);
        console.log(`   🔔 Nexus will now occur!\n`);
        
        let nexusState = result.state;
        
        // Check if Fremen is in game for worm control
        const hasFremen = nexusState.factions.has(Faction.FREMEN);
        
        if (hasFremen && this.context.lastSpiceLocation) {
          // Fremen can choose to ride the worm (Rule 2.04.08)
          // "BEAST OF BURDEN: Upon conclusion of the Nexus you may ride the sandworm"
          // Note: This happens AFTER the Territory Card is placed, but BEFORE Nexus
          console.log(`   🏜️  Fremen in game - they may choose to ride the worm\n`);
          
          const pendingRequests: AgentRequest[] = [{
            factionId: Faction.FREMEN,
            requestType: 'WORM_RIDE',
            prompt: 'A sandworm appeared! Do you want to ride the worm or let it devour forces?',
            context: {
              lastSpiceLocation: this.context.lastSpiceLocation,
              forcesInTerritory: getFactionsInTerritory(
                nexusState,
                this.context.lastSpiceLocation.territoryId
              ),
            },
            availableActions: ['WORM_RIDE', 'WORM_DEVOUR'],
          }];
          
          return {
            ...result,
            pendingRequests,
          };
        }
        
        // Trigger Nexus
        this.context.nexusTriggered = true;
        nexusState = { ...nexusState, nexusOccurring: true };
        
        console.log('\n' + '='.repeat(80));
        console.log('🤝 NEXUS TRIGGERED');
        console.log('='.repeat(80));
        console.log('   Alliances can be formed and broken\n');
        
        result.events.push({
          type: 'NEXUS_STARTED',
          data: {},
          message: 'Nexus! Alliance negotiations may occur.',
        });
        
        nexusState = logAction(nexusState, 'NEXUS_STARTED', null, {});
        
        // Request alliance decisions from all factions
        return this.requestNexusDecisions(nexusState, result.events);
      }
      
      return result;
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
      console.log(`   ❌ Spice NOT placed - Sector ${sector} is in storm`);
      
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

      console.log(`   ✅ ${amount} spice placed in ${territoryId} (Sector ${sector})`);

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
    // Rule 1.02.02 - FIRST TURN: During the first turn's Spice Blow Phase only,
    // all Shai-Hulud cards Revealed are ignored, Set Aside, then reshuffled
    // back into the Spice deck after this Phase.
    // Rule 1.02.03 - NO NEXUS: There can not be a Nexus on Turn one for any reason.
    if (state.turn === 1) {
      // Rule 1.02.02: "Set Aside" means NOT discarding - keep it separate to reshuffle later
      // Set aside the worm card (will be reshuffled in cleanup)
      this.context.turnOneWormsSetAside.push(card);

      events.push({
        type: 'SHAI_HULUD_APPEARED',
        data: { wormNumber: state.wormCount, ignoredTurnOne: true },
        message: 'Shai-Hulud appears - ignored on Turn 1 (set aside, not discarded)',
      });

      // IMPORTANT: Do NOT discard the card on Turn 1 - it's "Set Aside" which means
      // it's kept separate and will be reshuffled back into the deck at cleanup
      // The card is already removed from the deck when drawn, so we just keep it in turnOneWormsSetAside

      // Rule 1.02.05: "Continue discarding Spice Blow cards until a Territory Card is discarded"
      // Even on Turn 1, we must continue drawing until we get a Territory Card
      return this.revealSpiceCard(state, deckType);
    }

    // Normal Shai-Hulud handling (turn 2+)
    // Rule 1.02.05: "When this type of card is discarded destroy all spice and Forces
    // in the Territory of the topmost Territory Card in the discard pile and Place them
    // in the Spice Bank and Tleilaxu Tanks respectively. Continue discarding Spice Blow
    // cards until a Territory Card is discarded. Now a Nexus will occur."
    
    this.context.shaiHuludCount++;
    let newState = { ...state, wormCount: state.wormCount + 1 };

    events.push({
      type: 'SHAI_HULUD_APPEARED',
      data: { wormNumber: newState.wormCount },
      message: 'Shai-Hulud appears!',
    });

    // Check for Shield Wall destruction (4+ worms variant per rule 4.02)
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

    // Rule 1.02.05: Destroy spice and forces in the Territory of the TOPMOST Territory Card
    // in the discard pile (not the last spice location!)
    // IMPORTANT: Check BEFORE discarding the Shai-Hulud, so we get the correct topmost Territory Card
    const devourLocation = this.getTopmostTerritoryCardLocation(newState, deckType);
    
    // Discard the worm card (after checking for devour location)
    newState = this.discardSpiceCard(newState, card, deckType);
    
    if (devourLocation) {
      console.log(`\n   🐛 Shai-Hulud devours in ${devourLocation.territoryId} (Sector ${devourLocation.sector})`);
      console.log(`   📍 Location from topmost Territory Card in discard pile`);
      
      // Devour forces and spice in that territory
      const devourResult = this.devourForcesInTerritory(newState, devourLocation, events);
      newState = devourResult.state;
      events.push(...devourResult.events);
    } else {
      console.log(`\n   🐛 Shai-Hulud appears but no Territory Card in discard pile - nothing to devour`);
    }

    // Rule 1.02.05: "Continue discarding Spice Blow cards until a Territory Card is discarded"
    // Keep drawing cards until we get a Territory Card
    console.log(`   🔄 Continuing to draw cards until a Territory Card appears...\n`);
    return this.revealSpiceCard(newState, deckType);
  }

  /**
   * Get the territory location from the topmost Territory Card in the discard pile.
   * Rule 1.02.05: "destroy all spice and Forces in the Territory of the topmost Territory Card in the discard pile"
   */
  private getTopmostTerritoryCardLocation(
    state: GameState,
    deckType: 'A' | 'B'
  ): { territoryId: TerritoryId; sector: number } | null {
    const discardPile = deckType === 'A' ? state.spiceDiscardA : state.spiceDiscardB;
    
    // Find the topmost (last) Territory Card in the discard pile
    for (let i = discardPile.length - 1; i >= 0; i--) {
      const card = discardPile[i];
      const cardDef = getSpiceCardDefinition(card.definitionId);
      
      if (cardDef && !isShaiHulud(cardDef) && cardDef.territoryId && cardDef.sector !== undefined) {
        return {
          territoryId: cardDef.territoryId,
          sector: cardDef.sector,
        };
      }
    }
    
    // Fallback to lastSpiceLocation if no Territory Card found in discard
    return this.context.lastSpiceLocation;
  }

  /**
   * Devour forces and spice in a specific territory.
   * Rule 1.02.05: Destroy all spice and Forces in the Territory.
   */
  private devourForcesInTerritory(
    state: GameState,
    location: { territoryId: TerritoryId; sector: number },
    events: PhaseEvent[]
  ): { state: GameState; events: PhaseEvent[] } {
    const newEvents: PhaseEvent[] = [];
    const { territoryId, sector } = location;
    let newState = state;

    // Destroy all spice in territory (Rule 1.02.05)
    const spiceInTerritory = state.spiceOnBoard.find(
      (s) => s.territoryId === territoryId && s.sector === sector
    );

    if (spiceInTerritory) {
      newState = destroySpiceInTerritory(newState, territoryId, sector);
      newEvents.push({
        type: 'SPICE_DESTROYED_BY_WORM',
        data: { territory: territoryId, sector, amount: spiceInTerritory.amount },
        message: `${spiceInTerritory.amount} spice destroyed by sandworm in ${territoryId}`,
      });
    }

    // Destroy forces in territory
    // Rule 2.04.07: "SHAI-HULUD: When Shai-Hulud appears in a Territory where
    // you have Forces, they are not devoured.✷"
    // Fremen forces are IMMUNE to worm devouring (this is different from storm!)
    for (const [faction, factionState] of newState.factions) {
      // Fremen forces are not devoured by worms
      if (faction === Faction.FREMEN) {
        const forcesInSector = factionState.forces.onBoard.find(
          (f) => f.territoryId === territoryId && f.sector === sector
        );
        if (forcesInSector) {
          const totalForces = forcesInSector.forces.regular + forcesInSector.forces.elite;
          newEvents.push({
            type: 'FREMEN_WORM_IMMUNITY',
            data: { faction, territory: territoryId, sector, count: totalForces },
            message: `${totalForces} Fremen forces immune to sandworm devouring`,
          });
        }
        continue;
      }

      const forcesInSector = factionState.forces.onBoard.find(
        (f) => f.territoryId === territoryId && f.sector === sector
      );

      if (forcesInSector) {
        const totalForces = forcesInSector.forces.regular + forcesInSector.forces.elite;
        // All non-Fremen forces are devoured
        newState = sendForcesToTanks(newState, faction, territoryId, sector, totalForces);
        newEvents.push({
          type: 'FORCES_DEVOURED',
          data: { faction, territory: territoryId, sector, count: totalForces },
          message: `${totalForces} ${faction} forces devoured by sandworm`,
        });
      }
    }

    newState = logAction(newState, 'SHAI_HULUD', null, {
      territory: territoryId,
      sector,
    });

    return { state: newState, events: newEvents };
  }

  /**
   * @deprecated Use devourForcesInTerritory instead
   */
  private devourForces(
    state: GameState,
    events: PhaseEvent[]
  ): { state: GameState; events: PhaseEvent[] } {
    if (!this.context.lastSpiceLocation) {
      return { state, events: [] };
    }
    return this.devourForcesInTerritory(state, this.context.lastSpiceLocation, events);
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
      // Rule 2.04.08: "BEAST OF BURDEN: Upon conclusion of the Nexus you may ride the sandworm"
      // Note: The actual movement happens after Nexus, but we mark the choice now
      events.push({
        type: 'SPICE_CARD_REVEALED',
        data: { fremenRode: true },
        message: 'Fremen chooses to ride the sandworm!',
      });
    } else {
      this.context.fremenWormChoice = 'devour';
      // Normal devour - use the topmost Territory Card location
      const devourLocation = this.context.lastSpiceLocation;
      if (devourLocation) {
        const devourResult = this.devourForcesInTerritory(newState, devourLocation, events);
        newState = devourResult.state;
        events.push(...devourResult.events);
      }
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

    if (deckType === 'A') {
      return {
        ...state,
        spiceDeckA: newDeck,
        spiceDiscardA: [],
      };
    } else {
      return {
        ...state,
        spiceDeckB: newDeck,
        spiceDiscardB: [],
      };
    }
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
