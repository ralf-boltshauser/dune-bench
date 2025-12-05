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

/**
 * Map factions to token slots based on their fixed player positions.
 *
 * IMPORTANT:
 * - Player token positions are FIXED for the entire game (see game state docs)
 * - Only the storm moves around the board and therefore changes storm order
 * - The frontend visualization must NEVER move the faction tokens themselves
 *
 * Visualization rules:
 * - Token slots represent the fixed player token circles around the board edge
 * - We map factions to slots based on their `playerPositions` (sector 0-17)
 * - Storm order is shown ONLY via the number inside each token (1 = first player)
 * - This ensures tokens stay in the same place while the numbers change as the storm moves
 *
 * Token slots are arranged counterclockwise around the board:
 * Slot 1 (bottom center, ~sector 0) → Slot 2 → Slot 3 → Slot 4 (top center) → Slot 5 → Slot 6
 */
export default function FactionTokenSlots({
  gameState,
}: FactionTokenSlotsProps) {
  const stormOrder = gameState?.stormOrder ?? [];
  const activeFactions = gameState?.activeFactions ?? [];
  const playerPositions = gameState?.playerPositions ?? new Map<Faction, number>();

  const positionEntries = Array.from(playerPositions.entries());

  // If we don't have player positions (e.g. during very early loading), don't render
  if (positionEntries.length === 0) {
    return null;
  }

  // Sort factions by their fixed sector position (0-17) so that their visual
  // placement around the board matches the physical player markers.
  positionEntries.sort((a, b) => a[1] - b[1]);

  // Choose which token slots to use for the current player count.
  // - 6 players: use all 6 slots in order
  // - 3 players: use every other slot (0, 2, 4) for even spacing
  // - Other counts (2–5): use the first N slots
  const playerCount = positionEntries.length;
  let slotIndices: number[];

  if (playerCount === 3) {
    slotIndices = [0, 2, 4];
  } else {
    slotIndices = Array.from(
      { length: Math.min(playerCount, TOKEN_SLOTS.length) },
      (_, i) => i
    );
  }

  // Build visual configuration: each faction is assigned a FIXED slot based on
  // their player position, and we overlay the current storm order number on top.
  const activeSlots = positionEntries
    .map(([faction], index) => {
      const slotIndex = slotIndices[index];
      const slot = TOKEN_SLOTS[slotIndex];
      if (!slot) {
        return null;
      }

      // Storm order index (1-based). If the faction somehow isn't in stormOrder,
      // we simply omit the number (no order for this token).
      const orderIndex = stormOrder.indexOf(faction);
      const order = orderIndex >= 0 ? orderIndex + 1 : null;

      return {
        slot,
        faction,
        order,
      };
    })
    .filter(
      (
        item
      ): item is {
        slot: (typeof TOKEN_SLOTS)[0];
        faction: Faction;
        order: number | null;
      } => item !== null
    );

  return (
    <>
      {activeSlots.map(({ slot, faction, order }) => {
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
        const isFirstPlayer = order === 1;

        return (
          <g key={slot.id} id={slot.id}>
            {/* Base colored token */}
            <circle
              cx={slot.cx}
              cy={slot.cy}
              r="18"
              stroke="black"
              strokeWidth={isFirstPlayer ? "3" : "2"}
              fill={color}
              fillOpacity={isActive ? 1 : 0.85}
            />
            {/* Storm order number indicator */}
            <text
              x={slot.cx}
              y={slot.cy + 4}
              textAnchor="middle"
              fontSize="10"
              fontWeight="bold"
              fill="white"
              stroke="black"
              strokeWidth="0.5"
              style={{ pointerEvents: "none" }}
            >
              {order ?? ""}
            </text>
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
