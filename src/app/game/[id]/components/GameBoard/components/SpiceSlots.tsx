"use client";

import type { GameState } from "@/lib/game/types";
import { getSpiceSlotId } from "@/lib/game/utils/territory-svg-mapper";
import { useMemo } from "react";

/**
 * Spice slot groups (spice-*)
 * Extracted from dune-board.svg
 * Auto-generated - do not edit manually. Run scripts/extract-svg-to-components.ts to regenerate.
 */
interface SpiceSlotsProps {
  gameState?: GameState | null;
}

export default function SpiceSlots({ gameState }: SpiceSlotsProps) {
  // Calculate spice amounts per territory
  const spiceAmounts = useMemo(() => {
    const amounts = new Map<string, number>();
    if (!gameState) return amounts;

    for (const spiceLocation of gameState.spiceOnBoard) {
      const slotId = getSpiceSlotId(spiceLocation.territoryId);
      if (slotId) {
        // Sum up spice if multiple entries for same territory
        amounts.set(slotId, (amounts.get(slotId) || 0) + spiceLocation.amount);
      }
    }
    return amounts;
  }, [gameState]);

  const getSpiceAmount = (slotId: string) => spiceAmounts.get(slotId) || 0;
  const getSpiceStyle = (slotId: string) => {
    const amount = getSpiceAmount(slotId);
    if (amount > 0) {
      return {
        fill: "#FFD700", // Gold
        fillOpacity: 0.3,
        stroke: "#FFA500", // Orange
        strokeWidth: 2,
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
      <g id="spice-broken-land">
        <rect
          x="316.097"
          y="162.456"
          width="19"
          height="19"
          rx="9.5"
          {...getSpiceStyle("spice-broken-land")}
        />
        <text
          id="0"
          fill="black"
          xmlSpace="preserve"
          style={{ whiteSpace: "pre" }}
          fontFamily="Inter"
          fontSize="12"
          letterSpacing="0em"
          textAnchor="middle"
          dominantBaseline="middle"
          x="325.597"
          y="171.956"
        >
          {getSpiceAmount("spice-broken-land")}
        </text>
      </g>
      <g id="spice-old-gap">
        <rect
          x="566.097"
          y="138.456"
          width="19"
          height="19"
          rx="9.5"
          {...getSpiceStyle("spice-old-gap")}
        />
        <text
          id="0_2"
          fill="black"
          xmlSpace="preserve"
          style={{ whiteSpace: "pre" }}
          fontFamily="Inter"
          fontSize="12"
          letterSpacing="0em"
          textAnchor="middle"
          dominantBaseline="middle"
          x="575.597"
          y="147.956"
        >
          {getSpiceAmount("spice-old-gap")}
        </text>
      </g>
      <g id="spice-sihaya-ridge">
        <rect
          x="764.097"
          y="242.456"
          width="19"
          height="19"
          rx="9.5"
          {...getSpiceStyle("spice-sihaya-ridge")}
        />
        <text
          id="0_3"
          fill="black"
          xmlSpace="preserve"
          style={{ whiteSpace: "pre" }}
          fontFamily="Inter"
          fontSize="12"
          letterSpacing="0em"
          textAnchor="middle"
          dominantBaseline="middle"
          x="773.597"
          y="251.956"
        >
          {getSpiceAmount("spice-sihaya-ridge")}
        </text>
      </g>
      <g id="spice-the-minor-erg">
        <rect
          x="595.097"
          y="486.456"
          width="19"
          height="19"
          rx="9.5"
          {...getSpiceStyle("spice-the-minor-erg")}
        />
        <text
          id="0_4"
          fill="black"
          xmlSpace="preserve"
          style={{ whiteSpace: "pre" }}
          fontFamily="Inter"
          fontSize="12"
          letterSpacing="0em"
          textAnchor="middle"
          dominantBaseline="middle"
          x="604.597"
          y="495.956"
        >
          {getSpiceAmount("spice-the-minor-erg")}
        </text>
      </g>
      <g id="spice-hagga-basin">
        <rect
          x="354.097"
          y="405.456"
          width="19"
          height="19"
          rx="9.5"
          {...getSpiceStyle("spice-hagga-basin")}
        />
        <text
          id="0_5"
          fill="black"
          xmlSpace="preserve"
          style={{ whiteSpace: "pre" }}
          fontFamily="Inter"
          fontSize="12"
          letterSpacing="0em"
          textAnchor="middle"
          dominantBaseline="middle"
          x="363.597"
          y="414.956"
        >
          {getSpiceAmount("spice-hagga-basin")}
        </text>
      </g>
      <g id="spice-rock-outcroppings">
        <rect
          x="126.097"
          y="324.456"
          width="19"
          height="19"
          rx="9.5"
          {...getSpiceStyle("spice-rock-outcroppings")}
        />
        <text
          id="0_6"
          fill="black"
          xmlSpace="preserve"
          style={{ whiteSpace: "pre" }}
          fontFamily="Inter"
          fontSize="12"
          letterSpacing="0em"
          textAnchor="middle"
          dominantBaseline="middle"
          x="135.597"
          y="333.956"
        >
          {getSpiceAmount("spice-rock-outcroppings")}
        </text>
      </g>
      <g id="spice-funeral-plain">
        <rect
          x="70.0969"
          y="463.456"
          width="19"
          height="19"
          rx="9.5"
          {...getSpiceStyle("spice-funeral-plain")}
        />
        <text
          id="0_299"
          fill="black"
          xmlSpace="preserve"
          style={{ whiteSpace: "pre" }}
          fontFamily="Inter"
          fontSize="12"
          letterSpacing="0em"
          textAnchor="middle"
          dominantBaseline="middle"
          x="79.5969"
          y="472.956"
        >
          {getSpiceAmount("spice-funeral-plain")}
        </text>
      </g>
      <g id="spice-the-great-flat">
        <rect
          x="62.0969"
          y="511.456"
          width="19"
          height="19"
          rx="9.5"
          {...getSpiceStyle("spice-the-great-flat")}
        />
        <text
          id="0_300"
          fill="black"
          xmlSpace="preserve"
          style={{ whiteSpace: "pre" }}
          fontFamily="Inter"
          fontSize="12"
          letterSpacing="0em"
          textAnchor="middle"
          dominantBaseline="middle"
          x="71.5969"
          y="520.956"
        >
          {getSpiceAmount("spice-the-great-flat")}
        </text>
      </g>
      <g id="spice-habbanya-erg">
        <rect
          x="73.0969"
          y="645.456"
          width="19"
          height="19"
          rx="9.5"
          {...getSpiceStyle("spice-habbanya-erg")}
        />
        <text
          id="0_301"
          fill="black"
          xmlSpace="preserve"
          style={{ whiteSpace: "pre" }}
          fontFamily="Inter"
          fontSize="12"
          letterSpacing="0em"
          textAnchor="middle"
          dominantBaseline="middle"
          x="82.5969"
          y="654.956"
        >
          {getSpiceAmount("spice-habbanya-erg")}
        </text>
      </g>
      <g id="spice-wind-pass-north">
        <rect
          x="393.097"
          y="597.456"
          width="19"
          height="19"
          rx="9.5"
          {...getSpiceStyle("spice-wind-pass-north")}
        />
        <text
          id="0_302"
          fill="black"
          xmlSpace="preserve"
          style={{ whiteSpace: "pre" }}
          fontFamily="Inter"
          fontSize="12"
          letterSpacing="0em"
          textAnchor="middle"
          dominantBaseline="middle"
          x="402.597"
          y="606.956"
        >
          {getSpiceAmount("spice-wind-pass-north")}
        </text>
      </g>
      <g id="spice-cielago-north">
        <rect
          x="521.097"
          y="691.456"
          width="19"
          height="19"
          rx="9.5"
          {...getSpiceStyle("spice-cielago-north")}
        />
        <text
          id="0_303"
          fill="black"
          xmlSpace="preserve"
          style={{ whiteSpace: "pre" }}
          fontFamily="Inter"
          fontSize="12"
          letterSpacing="0em"
          textAnchor="middle"
          dominantBaseline="middle"
          x="530.597"
          y="700.956"
        >
          {getSpiceAmount("spice-cielago-north")}
        </text>
      </g>
      <g id="spice-south-mesa">
        <rect
          x="853.097"
          y="709.456"
          width="19"
          height="19"
          rx="9.5"
          {...getSpiceStyle("spice-south-mesa")}
        />
        <text
          id="0_304"
          fill="black"
          xmlSpace="preserve"
          style={{ whiteSpace: "pre" }}
          fontFamily="Inter"
          fontSize="12"
          letterSpacing="0em"
          textAnchor="middle"
          dominantBaseline="middle"
          x="862.597"
          y="718.956"
        >
          {getSpiceAmount("spice-south-mesa")}
        </text>
      </g>
      <g id="spice-red-chasm">
        <rect
          x="882.097"
          y="508.456"
          width="19"
          height="19"
          rx="9.5"
          {...getSpiceStyle("spice-red-chasm")}
        />
        <text
          id="0_305"
          fill="black"
          xmlSpace="preserve"
          style={{ whiteSpace: "pre" }}
          fontFamily="Inter"
          fontSize="12"
          letterSpacing="0em"
          textAnchor="middle"
          dominantBaseline="middle"
          x="891.597"
          y="517.956"
        >
          {getSpiceAmount("spice-red-chasm")}
        </text>
      </g>
      <g id="spice-cielago-south">
        <rect
          x="486.097"
          y="953.456"
          width="19"
          height="19"
          rx="9.5"
          {...getSpiceStyle("spice-cielago-south")}
        />
        <text
          id="0_306"
          fill="black"
          xmlSpace="preserve"
          style={{ whiteSpace: "pre" }}
          fontFamily="Inter"
          fontSize="12"
          letterSpacing="0em"
          textAnchor="middle"
          dominantBaseline="middle"
          x="495.597"
          y="962.956"
        >
          {getSpiceAmount("spice-cielago-south")}
        </text>
      </g>
      <g id="spice-habbanya-ridge-flat">
        <rect
          x="203.097"
          y="853.456"
          width="19"
          height="19"
          rx="9.5"
          {...getSpiceStyle("spice-habbanya-ridge-flat")}
        />
        <text
          id="0_307"
          fill="black"
          xmlSpace="preserve"
          style={{ whiteSpace: "pre" }}
          fontFamily="Inter"
          fontSize="12"
          letterSpacing="0em"
          textAnchor="middle"
          dominantBaseline="middle"
          x="212.597"
          y="862.956"
        >
          {getSpiceAmount("spice-habbanya-ridge-flat")}
        </text>
      </g>
    </>
  );
}
