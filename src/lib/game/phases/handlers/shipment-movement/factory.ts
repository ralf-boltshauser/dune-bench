/**
 * Factory for creating ShipmentMovementPhaseHandler
 * 
 * Centralizes handler creation with all dependencies.
 * Makes it easy to swap implementations and test with mocks.
 */

import { ShipmentMovementPhaseHandler } from "./index";
import { ShipmentMovementStateMachine } from "./state-machine";
import { GuildHandler } from "./handlers/guild-handler";
import { BGSpiritualAdvisorHandler } from "./handlers/bg-abilities/bg-advisors";
import { BGIntrusionHandler } from "./handlers/bg-abilities/bg-intrusion";
import { BGWartimeHandler } from "./handlers/bg-abilities/bg-wartime";
import { BGTakeUpArmsHandler } from "./handlers/bg-abilities/bg-take-up-arms";
import { AllianceConstraintHandler } from "./handlers/alliance-constraints";
import { ShipmentProcessor } from "./processors/shipment-processing";
import { MovementProcessor } from "./processors/movement-processing";
import { RequestBuilder } from "./builders/request-builders";

/**
 * Create a new ShipmentMovementPhaseHandler with all dependencies
 */
export function createShipmentMovementHandler(): ShipmentMovementPhaseHandler {
  // Create all dependencies
  const stateMachine = new ShipmentMovementStateMachine();
  const guildHandler = new GuildHandler();
  const bgAdvisors = new BGSpiritualAdvisorHandler();
  const bgIntrusion = new BGIntrusionHandler();
  const bgWartime = new BGWartimeHandler();
  const bgTakeUpArms = new BGTakeUpArmsHandler();
  const allianceHandler = new AllianceConstraintHandler();
  const shipmentProcessor = new ShipmentProcessor();
  const movementProcessor = new MovementProcessor(bgTakeUpArms);
  const requestBuilder = new RequestBuilder();

  // Create handler with dependencies
  // Note: Handler creates its own ResponseParser, FlowCoordinator, and Logger
  // This could be made configurable in the future
  return new ShipmentMovementPhaseHandler();
}

