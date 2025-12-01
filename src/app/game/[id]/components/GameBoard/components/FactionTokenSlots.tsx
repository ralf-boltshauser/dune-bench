"use client";

import { FACTION_COLORS } from "@/app/components/constants";
import { Faction } from "@/lib/game/types/enums";
import type { GameState } from "@/lib/game/types/state";

/**
 * Faction token slot circles
 * Extracted from dune-board.svg
 * Auto-generated - do not edit manually. Run scripts/extract-svg-to-components.ts to regenerate.
 */
interface FactionTokenSlotsProps {
  gameState?: GameState | null;
}

const TOKEN_SLOTS = [
  { id: "faction-token-slot-1", cx: 484.097, cy: 1032.46 },
  { id: "faction-token-slot-2", cx: 896.097, cy: 795.456 },
  { id: "faction-token-slot-3", cx: 895.097, cy: 321.456 },
  { id: "faction-token-slot-4", cx: 484.097, cy: 83.4556 },
  { id: "faction-token-slot-5", cx: 72.0969, cy: 320.456 },
  { id: "faction-token-slot-6", cx: 73.0969, cy: 795.456 },
] as const;

export default function FactionTokenSlots({
  gameState,
}: FactionTokenSlotsProps) {
  const stormOrder = gameState?.stormOrder ?? [];
  const activeFactions = gameState?.activeFactions ?? [];

  // Only visualize for 6- or 3-faction games
  if (stormOrder.length !== 6 && stormOrder.length !== 3) {
    return null;
  }

  // Map factions to token slots based on their physical positions around the board
  // Token slots are arranged around the board counterclockwise:
  // Slot 1 (bottom center) → Slot 2 (right, mid-bottom) → Slot 3 (right, mid-top) →
  // Slot 4 (top center) → Slot 5 (left, mid-top) → Slot 6 (left, mid-bottom)
  //
  // The first player in storm order (next counterclockwise after storm) should be in slot 5 (top-left)
  // This matches the physical board layout where the storm is positioned relative to the first player

  const activeSlots =
    stormOrder.length === 6
      ? stormOrder.map((faction, stormIndex) => {
          // Map storm order index to token slot index
          // First player (index 0) → Slot 5 (index 4)
          // Second player (index 1) → Slot 6 (index 5)
          // Third player (index 2) → Slot 1 (index 0)
          // Fourth player (index 3) → Slot 2 (index 1)
          // Fifth player (index 4) → Slot 3 (index 2)
          // Sixth player (index 5) → Slot 4 (index 3)
          const slotIndex = (stormIndex + 4) % 6;
          const slot = TOKEN_SLOTS[slotIndex]!;
          return { slot, faction: faction as Faction };
        })
      : [0, 2, 4]
          .map((slotIndex, i) => {
            const faction = stormOrder[i];
            if (!faction) {
              console.warn(
                `[FactionTokenSlots] Missing faction at index ${i} in stormOrder`,
                {
                  stormOrder,
                  index: i,
                }
              );
              return null;
            }
            return {
              slot: TOKEN_SLOTS[slotIndex]!,
              faction: faction as Faction,
            };
          })
          .filter(
            (
              item
            ): item is { slot: (typeof TOKEN_SLOTS)[0]; faction: Faction } =>
              item !== null
          );

  return (
    <>
      {activeSlots.map(({ slot, faction }) => {
        const color = FACTION_COLORS[faction];
        if (!color) {
          console.warn(
            `[FactionTokenSlots] No color found for faction: ${faction}`,
            {
              faction,
              availableColors: Object.keys(FACTION_COLORS),
            }
          );
        }
        const isActive = activeFactions.includes(faction);

        return (
          <g key={slot.id} id={slot.id}>
            {/* Base colored token */}
            <circle
              cx={slot.cx}
              cy={slot.cy}
              r="18"
              stroke="black"
              strokeWidth="2"
              fill={color}
              fillOpacity={isActive ? 1 : 0.85}
            />
            {isActive && (
              <>
                {/* Outer bold black ring */}
                <circle
                  cx={slot.cx}
                  cy={slot.cy}
                  r="21"
                  stroke="black"
                  strokeWidth="3"
                  fill="none"
                />
                {/* Inner white dashed ring to simulate black/white striping */}
                <circle
                  cx={slot.cx}
                  cy={slot.cy}
                  r="21"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  fill="none"
                />
              </>
            )}
          </g>
        );
      })}
    </>
  );
}
