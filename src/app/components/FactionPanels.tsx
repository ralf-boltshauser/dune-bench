"use client";

import { Faction } from "@/lib/game/types/enums";
import { FactionState } from "@/lib/game/types/state";
import { FactionPanel } from "./FactionPanel/FactionPanel";

interface FactionPanelsProps {
  factions: Map<Faction, FactionState>;
  className?: string;
}

/**
 * Container component that renders faction panels around the map
 */
export default function FactionPanels({ factions, className = "" }: FactionPanelsProps) {
  const factionArray = Array.from(factions.entries());

  if (factionArray.length === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {factionArray.map(([faction, state]) => (
        <FactionPanel key={faction} faction={faction} state={state} />
      ))}
    </div>
  );
}

