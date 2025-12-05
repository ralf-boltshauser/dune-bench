import { type GameState, TerritoryId } from "../../../../types";
import { type DeckType, type Location } from "../types";
import { SPICE_BLOW_CONSTANTS, LOG_MESSAGES } from "../constants";

/**
 * Spice Blow Logger
 * 
 * Centralized logging utility to replace scattered console.log calls.
 * Provides consistent formatting and easy testability.
 */

export class SpiceBlowLogger {
  /**
   * Log phase start information
   */
  static phaseStart(state: GameState): void {
    console.log("\n" + "=".repeat(80));
    console.log(
      `${SPICE_BLOW_CONSTANTS.LOG_PREFIX}  ${LOG_MESSAGES.PHASE_START(state.turn)}`
    );
    console.log("=".repeat(80));
    console.log(`\n${LOG_MESSAGES.STORM_SECTOR(state.stormSector)}`);
    if (state.turn === 1) {
      console.log(LOG_MESSAGES.TURN_1_WARNING_WORMS());
      console.log(LOG_MESSAGES.TURN_1_WARNING_NEXUS());
    }
    console.log("=".repeat(80) + "\n");
  }

  /**
   * Log spice card reveal
   */
  static cardRevealed(
    cardName: string,
    deck: DeckType,
    isWorm: boolean,
    territory?: TerritoryId,
    sector?: number,
    amount?: number,
    inStorm?: boolean
  ): void {
    console.log(
      `\n${SPICE_BLOW_CONSTANTS.CARD_PREFIX} ${LOG_MESSAGES.CARD_REVEALED(cardName, deck)}`
    );
    if (isWorm) {
      console.log(LOG_MESSAGES.CARD_TYPE_WORM());
    } else {
      console.log(LOG_MESSAGES.CARD_TYPE_TERRITORY());
      if (territory && sector !== undefined && amount !== undefined) {
        console.log(LOG_MESSAGES.TERRITORY_DETAILS(territory, sector, amount));
        if (inStorm !== undefined) {
          console.log(inStorm ? LOG_MESSAGES.IN_STORM_YES() : LOG_MESSAGES.IN_STORM_NO());
        }
      }
    }
  }

  /**
   * Log spice placement check
   */
  static spicePlacementCheck(
    territory: TerritoryId,
    sector: number,
    stormSector: number,
    inStorm: boolean
  ): void {
    console.log(LOG_MESSAGES.SPICE_PLACEMENT_CHECK(territory, sector));
    console.log(LOG_MESSAGES.CURRENT_STORM_SECTOR(stormSector));
    console.log(LOG_MESSAGES.IN_STORM_STATUS(inStorm));
  }

  /**
   * Log spice placement result
   */
  static spicePlaced(amount: number, territory: TerritoryId, sector: number): void {
    console.log(
      `${SPICE_BLOW_CONSTANTS.SPICE_PREFIX} ${LOG_MESSAGES.SPICE_PLACED(amount, territory, sector)}`
    );
  }

  /**
   * Log spice not placed (in storm)
   */
  static spiceNotPlaced(sector: number): void {
    console.log(LOG_MESSAGES.SPICE_NOT_PLACED(sector));
  }

  /**
   * Log Shai-Hulud devour location
   */
  static shaiHuludDevours(location: Location): void {
    console.log(
      LOG_MESSAGES.SHAI_HULUD_DEVOURS(location.territoryId, location.sector)
    );
    console.log(LOG_MESSAGES.DEVOUR_LOCATION_SOURCE());
  }

  /**
   * Log when no territory card found for devouring
   */
  static noTerritoryCard(): void {
    console.log(LOG_MESSAGES.NO_TERRITORY_CARD());
  }

  /**
   * Log continuation of card drawing
   */
  static continueDrawing(): void {
    console.log(LOG_MESSAGES.CONTINUE_DRAWING());
  }

  /**
   * Log territory card found after worms
   */
  static territoryCardFound(shaiHuludCount: number): void {
    console.log(LOG_MESSAGES.TERRITORY_CARD_FOUND(shaiHuludCount));
    console.log(LOG_MESSAGES.NEXUS_WILL_OCCUR());
  }

  /**
   * Log Fremen in game notification
   */
  static fremenInGame(): void {
    console.log(LOG_MESSAGES.FREMEN_IN_GAME());
  }

  /**
   * Log Fremen protection decision
   */
  static fremenProtectionDecision(protect: boolean): void {
    if (protect) {
      console.log(LOG_MESSAGES.FREMEN_PROTECT());
    } else {
      console.log(LOG_MESSAGES.FREMEN_ALLOW());
    }
  }

  /**
   * Log ally forces in territory
   */
  static allyForces(ally: string, count: number, territory: TerritoryId): void {
    console.log(LOG_MESSAGES.ALLY_FORCES(ally, count, territory));
    console.log(LOG_MESSAGES.ASK_PROTECTION());
  }

  /**
   * Log leader protection
   */
  static leaderProtected(
    faction: string,
    count: number,
    territory: TerritoryId
  ): void {
    console.log(LOG_MESSAGES.LEADER_PROTECTED(faction, count, territory));
  }

  /**
   * Log ally protection
   */
  static allyProtected(faction: string, count: number): void {
    console.log(LOG_MESSAGES.ALLY_PROTECTED(faction, count));
  }

  /**
   * Log Nexus triggered
   */
  static nexusTriggered(): void {
    console.log("\n" + "=".repeat(80));
    console.log(`${SPICE_BLOW_CONSTANTS.NEXUS_PREFIX} ${LOG_MESSAGES.NEXUS_TRIGGERED()}`);
    console.log("=".repeat(80));
    console.log(LOG_MESSAGES.ALLIANCES_AVAILABLE());
  }

  /**
   * Log validation result
   */
  static validationPassed(stormSector: number): void {
    console.log(LOG_MESSAGES.VALIDATION_PASSED(stormSector));
  }

  /**
   * Log validation failure
   */
  static validationFailed(stormSector: number, spiceInStorm: unknown): void {
    console.error(LOG_MESSAGES.VALIDATION_FAILED(stormSector));
    console.error(LOG_MESSAGES.VALIDATION_STORM_SECTOR(stormSector));
    console.error(`   Spice in storm: ${JSON.stringify(spiceInStorm, null, 2)}`);
    console.error(LOG_MESSAGES.VALIDATION_SPICE_IN_STORM());
  }
}

