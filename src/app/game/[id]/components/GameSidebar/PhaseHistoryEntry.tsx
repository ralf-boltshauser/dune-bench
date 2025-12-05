"use client";

import { Phase, Faction } from "@/lib/game/types/enums";
import type { StreamEvent } from "@/lib/game/stream/types";
import { usePhaseInfo } from "../../hooks/usePhaseInfo";
import SetupInfo from "../SetupInfo/SetupInfo";
import StormInfoCard from "../PhaseInfo/StormInfoCard";
import SpiceBlowInfoCard from "../PhaseInfo/SpiceBlowInfoCard";
import CHOAMCharityCard from "../PhaseInfo/CHOAMCharityCard";
import BiddingPanel from "../PhaseInfo/BiddingPanel";
import ShipmentMovementInfoCard from "../PhaseInfo/ShipmentMovementInfoCard";
import BattleInfoCard from "../PhaseInfo/BattleInfoCard";

// =============================================================================
// TYPES
// =============================================================================

interface PhaseHistoryEntryProps {
  phase: Phase;
  turn: number;
  events: StreamEvent[];
  isHistorical?: boolean;
  stormOrder?: Faction[];
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Component that renders a phase's information panel
 * Can be used for both current and historical phases
 */
export default function PhaseHistoryEntry({
  phase,
  turn,
  events,
  isHistorical = false,
  stormOrder = [],
}: PhaseHistoryEntryProps) {
  const phaseInfo = usePhaseInfo(events, phase, stormOrder);

  switch (phase) {
    case Phase.SETUP:
      return (
        <div className={isHistorical ? "opacity-75" : ""}>
          <SetupInfo events={events} currentPhase={phase} />
        </div>
      );

    case Phase.STORM:
      return (
        <div className={isHistorical ? "opacity-75" : ""}>
          <StormInfoCard stormInfo={phaseInfo.stormInfo} />
        </div>
      );

    case Phase.SPICE_BLOW:
      return (
        <div className={isHistorical ? "opacity-75" : ""}>
          <SpiceBlowInfoCard spiceBlowInfo={phaseInfo.spiceBlowInfo} />
        </div>
      );

    case Phase.CHOAM_CHARITY:
      return (
        <div className={isHistorical ? "opacity-75" : ""}>
          <CHOAMCharityCard choamCharityInfo={phaseInfo.choamCharityInfo} />
        </div>
      );

    case Phase.BIDDING:
      return (
        <div className={isHistorical ? "opacity-75" : ""}>
          <BiddingPanel biddingInfo={phaseInfo.biddingInfo} />
        </div>
      );

    case Phase.SHIPMENT_MOVEMENT:
      return (
        <div className={isHistorical ? "opacity-75" : ""}>
          <ShipmentMovementInfoCard shipmentMovementInfo={phaseInfo.shipmentMovementInfo} />
        </div>
      );

    case Phase.BATTLE:
      return (
        <div className={isHistorical ? "opacity-75" : ""}>
          <BattleInfoCard battleInfo={phaseInfo.battleInfo} />
        </div>
      );

    default:
      return (
        <div className={`text-center text-gray-500 py-8 ${isHistorical ? "opacity-75" : ""}`}>
          <p className="font-medium mb-2">Phase: {phase}</p>
          <p className="text-sm">Turn {turn}</p>
        </div>
      );
  }
}

