/**
 * Individual faction panel component
 */

import { Faction, FACTION_NAMES } from "@/lib/game/types/enums";
import { FactionState } from "@/lib/game/types/state";
import { getFactionConfig } from "@/lib/game/data/faction-config";
import { FACTION_COLORS, PANEL_POSITIONS, PANEL_MIN_WIDTH, PANEL_MAX_WIDTH } from "../constants";
import {
  SpiceSection,
  ReservesSection,
  TanksSection,
  CardsSection,
} from "./ResourceSection";
import { LeadersSection } from "./LeadersSection";

interface FactionPanelProps {
  faction: Faction;
  state: FactionState;
}

export function FactionPanel({ faction, state }: FactionPanelProps) {
  // Validate inputs
  if (!faction || !state) {
    console.warn("FactionPanel: Missing faction or state");
    return null;
  }

  const color = FACTION_COLORS[faction];
  const position = PANEL_POSITIONS[faction];
  
  if (!color || !position) {
    console.warn(`FactionPanel: Missing color or position for faction ${faction}`);
    return null;
  }

  const config = getFactionConfig(faction);
  
  if (!config) {
    console.warn(`FactionPanel: Missing config for faction ${faction}`);
    return null;
  }

  return (
    <div
      className="absolute bg-white rounded-lg shadow-lg border-2 z-10"
      style={{
        borderColor: color,
        minWidth: `${PANEL_MIN_WIDTH}px`,
        maxWidth: `${PANEL_MAX_WIDTH}px`,
        padding: "12px",
        ...position,
      }}
    >
      {/* Header */}
      <div
        className="text-lg font-bold mb-2 text-white px-2 py-1 rounded"
        style={{ backgroundColor: color }}
      >
        {FACTION_NAMES[faction]}
      </div>

      {/* Resources */}
      <SpiceSection spice={state.spice} spiceBribes={state.spiceBribes} />
      <ReservesSection state={state} />
      <TanksSection state={state} />
      <CardsSection handSize={state.hand.length} maxHandSize={config.maxHandSize} />
      <LeadersSection state={state} />

      {/* Alliance */}
      {state.allyId && (
        <div className="text-xs text-gray-600 border-t pt-1 mt-1">
          Ally: {FACTION_NAMES[state.allyId]}
        </div>
      )}
    </div>
  );
}

