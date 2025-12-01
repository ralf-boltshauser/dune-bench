"use client";

import React from "react";
import { Phase } from "@/lib/game/types/enums";

/**
 * Phase indicator circles (phase-*)
 * Extracted from dune-board.svg
 * Auto-generated - do not edit manually. Run scripts/extract-svg-to-components.ts to regenerate.
 */
interface PhaseIndicatorsProps {
  phase?: Phase | null;
}

export default function PhaseIndicators({ phase }: PhaseIndicatorsProps) {
  // Map Phase enum to SVG phase ID
  const phaseToSvgId: Record<Phase, string> = {
    [Phase.STORM]: "phase-storm",
    [Phase.SPICE_BLOW]: "phase-spice-blow",
    [Phase.CHOAM_CHARITY]: "phase-choam-charity",
    [Phase.BIDDING]: "phase-bidding",
    [Phase.REVIVAL]: "phase-revival",
    [Phase.SHIPMENT_MOVEMENT]: "phase-shipment-movement",
    [Phase.BATTLE]: "phase-battle",
    [Phase.SPICE_COLLECTION]: "phase-spice-collection",
    [Phase.MENTAT_PAUSE]: "phase-mentat-pause",
    [Phase.SETUP]: "phase-storm", // Setup doesn't have its own indicator, use storm
  };

  const activePhaseId = phase ? phaseToSvgId[phase] : null;

  const getPhaseStyle = (phaseId: string) => {
    if (activePhaseId === phaseId) {
      return {
        fill: "#FFD700", // Gold
        fillOpacity: 0.6,
        stroke: "#FFA500", // Orange
        strokeWidth: 3,
      };
    }
    return {
      fill: "none",
      stroke: "black",
      strokeWidth: 1,
    };
  };

  return (
    <>
      <g id="phase-storm">
      <circle cx="238.902" cy="89.0115" r="25.5559" {...getPhaseStyle("phase-storm")}/>
      <circle cx="238.902" cy="89.0115" r="25.5559" {...getPhaseStyle("phase-storm")}/>
      </g>
      <g id="phase-spice-blow">
      <circle cx="296.344" cy="60.4021" r="25.5559" {...getPhaseStyle("phase-spice-blow")}/>
      <circle cx="296.344" cy="60.4021" r="25.5559" {...getPhaseStyle("phase-spice-blow")}/>
      </g>
      <g id="phase-choam-charity">
      <circle cx="357.338" cy="40.8601" r="25.5559" {...getPhaseStyle("phase-choam-charity")}/>
      <circle cx="357.338" cy="40.8601" r="25.5559" {...getPhaseStyle("phase-choam-charity")}/>
      </g>
      <g id="phase-bidding">
      <circle cx="419.517" cy="29.0168" r="25.5559" {...getPhaseStyle("phase-bidding")}/>
      <circle cx="419.517" cy="29.0168" r="25.5559" {...getPhaseStyle("phase-bidding")}/>
      </g>
      <g id="phase-revival">
      <circle cx="484.065" cy="26.0559" r="25.5559" {...getPhaseStyle("phase-revival")}/>
      <circle cx="484.065" cy="26.0559" r="25.5559" {...getPhaseStyle("phase-revival")}/>
      </g>
      <g id="phase-shipment-movement">
      <circle cx="548.613" cy="29.0168" r="25.5559" {...getPhaseStyle("phase-shipment-movement")}/>
      <circle cx="548.613" cy="29.0168" r="25.5559" {...getPhaseStyle("phase-shipment-movement")}/>
      </g>
      <g id="phase-battle">
      <circle cx="610.792" cy="39.676" r="25.5559" {...getPhaseStyle("phase-battle")}/>
      <circle cx="610.792" cy="39.676" r="25.5559" {...getPhaseStyle("phase-battle")}/>
      </g>
      <g id="phase-spice-collection">
      <circle cx="671.786" cy="59.218" r="25.5559" {...getPhaseStyle("phase-spice-collection")}/>
      <circle cx="671.786" cy="59.218" r="25.5559" {...getPhaseStyle("phase-spice-collection")}/>
      </g>
      <g id="phase-mentat-pause">
      <circle cx="729.82" cy="88.8269" r="25.5559" {...getPhaseStyle("phase-mentat-pause")}/>
      <circle cx="729.82" cy="88.8269" r="25.5559" {...getPhaseStyle("phase-mentat-pause")}/>
      </g>
    </>
  );
}
