/**
 * Phase handlers index.
 * Exports all phase handlers for registration with the PhaseManager.
 */

export { SetupPhaseHandler } from './setup';
export { StormPhaseHandler } from './storm';
export { SpiceBlowPhaseHandler } from './spice-blow';
export { ChoamCharityPhaseHandler } from './choam-charity';
export { BiddingPhaseHandler } from './bidding';
export { RevivalPhaseHandler } from './revival';
export { ShipmentMovementPhaseHandler } from './shipment-movement';
export { BattlePhaseHandler } from './battle';
export { SpiceCollectionPhaseHandler } from './spice-collection';
export { MentatPausePhaseHandler } from './mentat-pause';

import { type PhaseHandler } from '../types';
import { SetupPhaseHandler } from './setup';
import { StormPhaseHandler } from './storm';
import { SpiceBlowPhaseHandler } from './spice-blow';
import { ChoamCharityPhaseHandler } from './choam-charity';
import { BiddingPhaseHandler } from './bidding';
import { RevivalPhaseHandler } from './revival';
import { ShipmentMovementPhaseHandler } from './shipment-movement';
import { BattlePhaseHandler } from './battle';
import { SpiceCollectionPhaseHandler } from './spice-collection';
import { MentatPausePhaseHandler } from './mentat-pause';

/**
 * Create all phase handlers.
 * Call this to get instances of all handlers for registration.
 */
export function createAllPhaseHandlers(): PhaseHandler[] {
  return [
    new SetupPhaseHandler(),
    new StormPhaseHandler(),
    new SpiceBlowPhaseHandler(),
    new ChoamCharityPhaseHandler(),
    new BiddingPhaseHandler(),
    new RevivalPhaseHandler(),
    new ShipmentMovementPhaseHandler(),
    new BattlePhaseHandler(),
    new SpiceCollectionPhaseHandler(),
    new MentatPausePhaseHandler(),
  ];
}
