"use client";

import type { GameState } from "@/lib/game/types";
import type { TerritoryId } from "@/lib/game/types/territories";
import { useEffect, useMemo, useRef } from "react";
import type { RecentShipment } from "../../../hooks/usePhaseVisualizations";
import {
  collectForcesByLocation,
  getFactionColor,
  getLocationSlotGroupId,
  parseLocationKey,
  type LocationForce,
} from "../shared/force-utils";

/**
 * Force slot groups (force-slot-*)
 * Extracted from dune-board.svg
 * Auto-generated - do not edit manually. Run scripts/extract-svg-to-components.ts to regenerate.
 */
interface ForceSlotsProps {
  gameState?: GameState | null;
  recentShipments?: RecentShipment[];
}

export default function ForceSlots({
  gameState,
  recentShipments: _unusedRecentShipments, // eslint-disable-line @typescript-eslint/no-unused-vars
}: ForceSlotsProps) {
  const containerRef = useRef<SVGGElement>(null);

  // Map from slot ID (e.g., "force-slot-meridian-sector-0-1") to force data
  const slotForcesMap = useMemo(() => {
    const map = new Map<
      string,
      LocationForce & { territoryId: TerritoryId; sector: number }
    >();

    if (!gameState) {
      return map;
    }

    // Log forces on board from gameState
    console.log("=== Forces On Board ===");
    for (const [faction, factionState] of gameState.factions) {
      console.log(`\n${faction}:`, {
        onBoard: factionState.forces.onBoard.map((stack) => ({
          factionId: stack.factionId,
          territoryId: stack.territoryId,
          sector: stack.sector,
          forces: stack.forces,
          total: stack.forces.regular + stack.forces.elite,
        })),
      });
    }

    const forcesByLocation = collectForcesByLocation(gameState);

    console.log(
      "\n=== Forces By Location ===",
      Array.from(forcesByLocation.entries()).map(([key, forces]) => ({
        locationKey: key,
        forces: forces.map((f) => ({
          faction: f.faction,
          count: f.count,
          slotIndex: f.slotIndex,
        })),
      }))
    );

    for (const [locationKey, forces] of forcesByLocation) {
      const parsed = parseLocationKey(locationKey);
      if (!parsed) {
        console.warn(
          `[ForceSlots] Failed to parse location key: ${locationKey}`
        );
        continue;
      }

      const slotGroupId = getLocationSlotGroupId(
        parsed.territoryId,
        parsed.sector
      );
      if (!slotGroupId) {
        console.warn(
          `[ForceSlots] No slot group ID found for ${parsed.territoryId} sector ${parsed.sector}`,
          {
            territoryId: parsed.territoryId,
            sector: parsed.sector,
            locationKey,
            forces: forces.map((f) => ({ faction: f.faction, count: f.count })),
          }
        );
        continue;
      }

      // Map each force to its slot ID (slotIndex is 0-based, slot IDs are 1-based)
      forces.forEach((force) => {
        const slotId = `${slotGroupId}-${force.slotIndex + 1}`;
        map.set(slotId, {
          ...force,
          territoryId: parsed.territoryId,
          sector: parsed.sector,
        });
      });
    }

    console.log(
      "\n=== Slot Forces Map ===",
      Array.from(map.entries()).map(([slotId, force]) => ({
        slotId,
        faction: force.faction,
        count: force.count,
        territoryId: force.territoryId,
        sector: force.sector,
      }))
    );

    return map;
  }, [gameState]);

  // Collect all force slot group IDs that have forces
  const usedSlotGroupIds = useMemo(() => {
    const slotGroupIds = new Set<string>();

    if (!gameState) {
      return slotGroupIds;
    }

    const forcesByLocation = collectForcesByLocation(gameState);

    for (const [locationKey] of forcesByLocation) {
      const parsed = parseLocationKey(locationKey);
      if (!parsed) continue;

      const slotGroupId = getLocationSlotGroupId(
        parsed.territoryId,
        parsed.sector
      );
      if (slotGroupId) {
        slotGroupIds.add(slotGroupId);
      }
    }

    return slotGroupIds;
  }, [gameState]);

  // Update SVG elements directly via DOM manipulation
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // First, hide all slot groups and reset all individual slots
    // Get all groups that start with "force-slot-"
    const allGroups = container.querySelectorAll<SVGGElement>(
      'g[id^="force-slot-"]'
    );
    allGroups.forEach((group) => {
      const groupId = group.getAttribute("id");
      if (!groupId) return;

      // Check if this is a top-level group (not a nested slot like "-1", "-2", etc.)
      // Top-level groups: "force-slot-territory-sector-N" where N is sector (0-17)
      // Nested groups: "force-slot-territory-sector-N-M" where M is slot index (1-4)
      // Pattern: nested groups have TWO numbers at the end separated by dash
      const isNested = /-\d+-\d+$/.test(groupId);
      if (isNested) return; // Skip nested groups (individual slots)

      // This is a top-level group - show/hide based on whether it has forces
      if (!usedSlotGroupIds.has(groupId)) {
        group.setAttribute("display", "none");
      } else {
        group.setAttribute("display", "block");
      }
    });

    // Reset all individual slots to default state
    // Individual slots have pattern: "force-slot-*-*-N" where N is 1-4
    const allSlots = container.querySelectorAll<SVGGElement>(
      'g[id^="force-slot-"]'
    );
    const individualSlots = Array.from(allSlots).filter((slot) => {
      const id = slot.getAttribute("id");
      return id ? /-\d+-\d+$/.test(id) : false;
    });
    individualSlots.forEach((slot) => {
      const rect = slot.querySelector<SVGRectElement>("rect");
      const text = slot.querySelector<SVGTextElement>("text");
      const tspan = text?.querySelector<SVGTSpanElement>("tspan");

      if (rect) {
        rect.setAttribute("fill", "none");
        rect.setAttribute("fill-opacity", "0");
        rect.setAttribute("stroke", "black");
        rect.setAttribute("stroke-width", "1");
      }

      if (tspan) {
        tspan.textContent = "0";
      }

      if (text) {
        text.setAttribute("fill", "black");
        text.removeAttribute("font-weight");
      }

      slot.setAttribute("display", "none");
    });

    // Now update slots that have forces
    slotForcesMap.forEach((force, slotId) => {
      const slot = container.querySelector<SVGGElement>(`#${slotId}`);
      if (!slot) return;

      const rect = slot.querySelector<SVGRectElement>("rect");
      const text = slot.querySelector<SVGTextElement>("text");
      const tspan = text?.querySelector<SVGTSpanElement>("tspan");

      if (!rect || !text || !tspan) return;

      const color = getFactionColor(force.faction);

      // Update rect
      rect.setAttribute("fill", color);
      rect.setAttribute("fill-opacity", "1");
      rect.setAttribute("stroke", color);
      rect.setAttribute("stroke-width", "2");

      // Update text
      text.setAttribute("fill", "white");
      text.setAttribute("font-weight", "bold");
      tspan.textContent = force.count.toString();

      // Show the slot
      slot.setAttribute("display", "block");
    });
  }, [slotForcesMap, usedSlotGroupIds]);

  return (
    <g ref={containerRef}>
      <g id="force-slot-meridian-sector-0">
        <g id="force-slot-meridian-sector-0-1">
          <rect
            x="337.597"
            y="896.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_7"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="343.347" y="907.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-meridian-sector-0-2">
          <rect
            x="360.597"
            y="896.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_8"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="366.347" y="907.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-meridian-sector-0-3">
          <rect
            x="337.597"
            y="914.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_9"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="343.347" y="925.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-meridian-sector-0-4">
          <rect
            x="360.597"
            y="914.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_10"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="366.347" y="925.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-polar-sink">
        <g id="force-slot-polar-sink-1">
          <rect
            x="457.597"
            y="550.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_11"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="463.347" y="561.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-polar-sink-2">
          <rect
            x="480.597"
            y="550.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_12"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="486.347" y="561.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-polar-sink-3">
          <rect
            x="457.597"
            y="568.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_13"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="463.347" y="579.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-polar-sink-4">
          <rect
            x="480.597"
            y="568.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_14"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="486.347" y="579.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-south-sector-1">
          <g id="force-slot-cielago-south-sector-1-1">
            <rect
              x="475.597"
              y="891.456"
              width="19"
              height="14"
              rx="7"
              stroke="black"
            />
            <text
              id="0_15"
              fill="black"
              xmlSpace="preserve"
              style={{ whiteSpace: "pre" }}
              fontFamily="Inter"
              fontSize="12"
              letterSpacing="0em"
            >
              <tspan x="481.347" y="902.819">
                0
              </tspan>
            </text>
          </g>
          <g id="force-slot-cielago-south-sector-1-2">
            <rect
              x="498.597"
              y="891.456"
              width="19"
              height="14"
              rx="7"
              stroke="black"
            />
            <text
              id="0_16"
              fill="black"
              xmlSpace="preserve"
              style={{ whiteSpace: "pre" }}
              fontFamily="Inter"
              fontSize="12"
              letterSpacing="0em"
            >
              <tspan x="504.347" y="902.819">
                0
              </tspan>
            </text>
          </g>
          <g id="force-slot-cielago-south-sector-1-3">
            <rect
              x="475.597"
              y="909.456"
              width="19"
              height="14"
              rx="7"
              stroke="black"
            />
            <text
              id="0_17"
              fill="black"
              xmlSpace="preserve"
              style={{ whiteSpace: "pre" }}
              fontFamily="Inter"
              fontSize="12"
              letterSpacing="0em"
            >
              <tspan x="481.347" y="920.819">
                0
              </tspan>
            </text>
          </g>
          <g id="force-slot-cielago-south-sector-1-4">
            <rect
              x="498.597"
              y="909.456"
              width="19"
              height="14"
              rx="7"
              stroke="black"
            />
            <text
              id="0_18"
              fill="black"
              xmlSpace="preserve"
              style={{ whiteSpace: "pre" }}
              fontFamily="Inter"
              fontSize="12"
              letterSpacing="0em"
            >
              <tspan x="504.347" y="920.819">
                0
              </tspan>
            </text>
          </g>
        </g>
        <g id="force-slot-cielago-south-sector-2">
          <g id="force-slot-cielago-south-sector-2-1">
            <rect
              x="550.597"
              y="884.456"
              width="19"
              height="14"
              rx="7"
              stroke="black"
            />
            <text
              id="0_19"
              fill="black"
              xmlSpace="preserve"
              style={{ whiteSpace: "pre" }}
              fontFamily="Inter"
              fontSize="12"
              letterSpacing="0em"
            >
              <tspan x="556.347" y="895.819">
                0
              </tspan>
            </text>
          </g>
          <g id="force-slot-cielago-south-sector-2-2">
            <rect
              x="573.597"
              y="884.456"
              width="19"
              height="14"
              rx="7"
              stroke="black"
            />
            <text
              id="0_20"
              fill="black"
              xmlSpace="preserve"
              style={{ whiteSpace: "pre" }}
              fontFamily="Inter"
              fontSize="12"
              letterSpacing="0em"
            >
              <tspan x="579.347" y="895.819">
                0
              </tspan>
            </text>
          </g>
          <g id="force-slot-cielago-south-sector-2-3">
            <rect
              x="550.597"
              y="902.456"
              width="19"
              height="14"
              rx="7"
              stroke="black"
            />
            <text
              id="0_21"
              fill="black"
              xmlSpace="preserve"
              style={{ whiteSpace: "pre" }}
              fontFamily="Inter"
              fontSize="12"
              letterSpacing="0em"
            >
              <tspan x="556.347" y="913.819">
                0
              </tspan>
            </text>
          </g>
          <g id="force-slot-cielago-south-sector-2-4">
            <rect
              x="573.597"
              y="902.456"
              width="19"
              height="14"
              rx="7"
              stroke="black"
            />
            <text
              id="0_22"
              fill="black"
              xmlSpace="preserve"
              style={{ whiteSpace: "pre" }}
              fontFamily="Inter"
              fontSize="12"
              letterSpacing="0em"
            >
              <tspan x="579.347" y="913.819">
                0
              </tspan>
            </text>
          </g>
        </g>
      </g>
      <g id="force-slot-cielago-east-sector-2">
        <g id="force-slot-cielago-east-sector-2-1">
          <rect
            x="606.597"
            y="869.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_23"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="612.347" y="880.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-east-sector-2-2">
          <rect
            x="629.597"
            y="869.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_24"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="635.347" y="880.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-east-sector-2-3">
          <rect
            x="606.597"
            y="887.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_25"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="612.347" y="898.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-east-sector-2-4">
          <rect
            x="629.597"
            y="887.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_26"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="635.347" y="898.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-cielago-east-sector-3">
        <g id="force-slot-cielago-east-sector-3-1">
          <rect
            x="686.597"
            y="875.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_27"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="692.347" y="886.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-east-sector-3-2">
          <rect
            x="709.597"
            y="875.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_28"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="715.347" y="886.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-east-sector-3-3">
          <rect
            x="686.597"
            y="893.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_29"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="692.347" y="904.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-east-sector-3-4">
          <rect
            x="709.597"
            y="893.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_30"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="715.347" y="904.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-false-wall-south-sector-3">
        <g id="force-slot-false-wall-south-sector-3-1">
          <rect
            x="634.597"
            y="734.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_31"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="640.347" y="745.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-false-wall-south-sector-3-2">
          <rect
            x="657.597"
            y="734.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_32"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="663.347" y="745.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-false-wall-south-sector-3-3">
          <rect
            x="634.597"
            y="752.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_33"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="640.347" y="763.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-false-wall-south-sector-3-4">
          <rect
            x="657.597"
            y="752.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_34"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="663.347" y="763.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-south-mesa-sector-3">
        <g id="force-slot-south-mesa-sector-3-1">
          <rect
            x="754.597"
            y="832.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_35"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="760.347" y="843.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-south-mesa-sector-3-2">
          <rect
            x="777.597"
            y="832.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_36"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="783.347" y="843.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-south-mesa-sector-3-3">
          <rect
            x="754.597"
            y="850.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_37"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="760.347" y="861.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-south-mesa-sector-3-4">
          <rect
            x="777.597"
            y="850.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_38"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="783.347" y="861.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-south-mesa-sector-4">
        <g id="force-slot-south-mesa-sector-4-1">
          <rect
            x="796.597"
            y="791.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_39"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="802.347" y="802.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-south-mesa-sector-4-2">
          <rect
            x="819.597"
            y="791.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_40"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="825.347" y="802.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-south-mesa-sector-4-3">
          <rect
            x="808.097"
            y="809.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_41"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="813.847" y="820.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-tueks-sietch-sector-4">
        <g id="force-slot-tueks-sietch-sector-4-1">
          <rect
            x="781.597"
            y="719.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_42"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="787.347" y="730.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-tueks-sietch-sector-4-2">
          <rect
            x="804.597"
            y="719.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_43"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="810.347" y="730.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-tueks-sietch-sector-4-3">
          <rect
            x="781.597"
            y="737.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_44"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="787.347" y="748.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-tueks-sietch-sector-4-4">
          <rect
            x="804.597"
            y="737.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_45"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="810.347" y="748.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-false-wall-south-sector-4">
        <g id="force-slot-false-wall-south-sector-4-1">
          <rect
            x="694.597"
            y="696.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_46"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="700.347" y="707.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-false-wall-south-sector-4-2">
          <rect
            x="717.597"
            y="696.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_47"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="723.347" y="707.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-false-wall-south-sector-4-3">
          <rect
            x="694.597"
            y="714.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_48"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="700.347" y="725.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-false-wall-south-sector-4-4">
          <rect
            x="717.597"
            y="714.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_49"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="723.347" y="725.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-harg-pass-sector-3">
        <g id="force-slot-harg-pass-sector-3-1">
          <rect
            x="526.597"
            y="627.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_50"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="532.347" y="638.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-harg-pass-sector-3-2">
          <rect
            x="549.597"
            y="627.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_51"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="555.347" y="638.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-harg-pass-sector-4">
        <g id="force-slot-harg-pass-sector-4-1">
          <rect
            x="573.097"
            y="615.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_52"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="578.847" y="626.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-minor-erg-sector-5">
        <g id="force-slot-minor-erg-sector-5-1">
          <rect
            x="608.597"
            y="563.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_53"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="614.347" y="574.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-minor-erg-sector-5-2">
          <rect
            x="631.597"
            y="563.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_54"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="637.347" y="574.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-minor-erg-sector-5-3">
          <rect
            x="608.597"
            y="581.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_55"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="614.347" y="592.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-minor-erg-sector-5-4">
          <rect
            x="631.597"
            y="581.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_56"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="637.347" y="592.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-false-wall-east-sector-5">
        <g id="force-slot-false-wall-east-sector-5-1">
          <rect
            x="548.597"
            y="566.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_57"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="554.347" y="577.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-false-wall-east-sector-5-2">
          <rect
            x="571.597"
            y="566.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_58"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="577.347" y="577.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-false-wall-east-sector-4">
        <g id="force-slot-false-wall-east-sector-4-1">
          <rect
            x="536.597"
            y="591.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_59"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="542.347" y="602.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-false-wall-east-sector-4-2">
          <rect
            x="559.597"
            y="591.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_60"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="565.347" y="602.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-false-wall-east-sector-6">
        <g id="force-slot-false-wall-east-sector-6-1">
          <rect
            x="553.597"
            y="534.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_61"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="559.347" y="545.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-false-wall-east-sector-6-2">
          <rect
            x="576.597"
            y="534.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_62"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="582.347" y="545.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-false-wall-east-sector-7">
        <g id="force-slot-false-wall-east-sector-7-1">
          <rect
            x="545.597"
            y="504.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_63"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="551.347" y="515.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-false-wall-east-sector-7-2">
          <rect
            x="568.597"
            y="504.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_64"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="574.347" y="515.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-false-wall-east-sector-8">
        <g id="force-slot-false-wall-east-sector-8-1">
          <rect
            x="542.097"
            y="478.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_65"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="547.847" y="489.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-minor-erg-sector-7">
        <g id="force-slot-minor-erg-sector-7-1">
          <rect
            x="618.597"
            y="476.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_66"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="624.347" y="487.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-minor-erg-sector-7-2">
          <rect
            x="641.597"
            y="476.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_67"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="647.347" y="487.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-minor-erg-sector-6">
        <g id="force-slot-minor-erg-sector-6-1">
          <rect
            x="627.597"
            y="512.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_68"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="633.347" y="523.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-minor-erg-sector-6-2">
          <rect
            x="650.597"
            y="512.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_69"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="656.347" y="523.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-minor-erg-sector-6-3">
          <rect
            x="627.597"
            y="530.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_70"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="633.347" y="541.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-minor-erg-sector-6-4">
          <rect
            x="650.597"
            y="530.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_71"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="656.347" y="541.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-pasty-mesa-sector-5">
        <g id="force-slot-pasty-mesa-sector-5-1">
          <rect
            x="744.597"
            y="585.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_72"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="750.347" y="596.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-pasty-mesa-sector-5-2">
          <rect
            x="767.597"
            y="585.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_73"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="773.347" y="596.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-pasty-mesa-sector-5-3">
          <rect
            x="744.597"
            y="603.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_74"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="750.347" y="614.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-pasty-mesa-sector-5-4">
          <rect
            x="767.597"
            y="603.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_75"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="773.347" y="614.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-pasty-mesa-sector-4">
        <g id="force-slot-pasty-mesa-sector-4-1">
          <rect
            x="704.597"
            y="657.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_76"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="710.347" y="668.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-pasty-mesa-sector-4-2">
          <rect
            x="727.597"
            y="657.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_77"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="733.347" y="668.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-pasty-mesa-sector-6">
        <g id="force-slot-pasty-mesa-sector-6-1">
          <rect
            x="760.597"
            y="478.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_78"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="766.347" y="489.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-pasty-mesa-sector-6-2">
          <rect
            x="783.597"
            y="478.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_79"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="789.347" y="489.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-pasty-mesa-sector-6-3">
          <rect
            x="760.597"
            y="496.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_80"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="766.347" y="507.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-pasty-mesa-sector-6-4">
          <rect
            x="783.597"
            y="496.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_81"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="789.347" y="507.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-pasty-mesa-sector-7">
        <g id="force-slot-pasty-mesa-sector-7-1">
          <rect
            x="739.597"
            y="398.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_82"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="745.347" y="409.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-pasty-mesa-sector-7-2">
          <rect
            x="762.597"
            y="398.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_83"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="768.347" y="409.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-pasty-mesa-sector-7-3">
          <rect
            x="739.597"
            y="416.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_84"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="745.347" y="427.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-pasty-mesa-sector-7-4">
          <rect
            x="762.597"
            y="416.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_85"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="768.347" y="427.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-red-chasm-sector-6">
        <g id="force-slot-red-chasm-sector-6-1">
          <rect
            x="865.597"
            y="479.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_86"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="871.347" y="490.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-red-chasm-sector-6-2">
          <rect
            x="888.597"
            y="479.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_87"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="894.347" y="490.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-red-chasm-sector-6-3">
          <rect
            x="865.597"
            y="497.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_88"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="871.347" y="508.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-red-chasm-sector-6-4">
          <rect
            x="888.597"
            y="497.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_89"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="894.347" y="508.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-south-mesa-sector-5">
        <g id="force-slot-south-mesa-sector-5-1">
          <rect
            x="871.597"
            y="573.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_90"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="877.347" y="584.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-south-mesa-sector-5-2">
          <rect
            x="894.597"
            y="573.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_91"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="900.347" y="584.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-south-mesa-sector-5-3">
          <rect
            x="871.597"
            y="591.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_92"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="877.347" y="602.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-south-mesa-sector-5-4">
          <rect
            x="894.597"
            y="591.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_93"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="900.347" y="602.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-gara-kulon-sector-7">
        <g id="force-slot-gara-kulon-sector-7-1">
          <rect
            x="797.597"
            y="325.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_94"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="803.347" y="336.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-gara-kulon-sector-7-2">
          <rect
            x="820.597"
            y="325.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_95"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="826.347" y="336.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-gara-kulon-sector-7-3">
          <rect
            x="797.597"
            y="343.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_96"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="803.347" y="354.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-gara-kulon-sector-7-4">
          <rect
            x="820.597"
            y="343.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_97"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="826.347" y="354.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-shield-wall-sector-7">
        <g id="force-slot-shield-wall-sector-7-1">
          <rect
            x="665.597"
            y="399.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_98"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="671.347" y="410.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-shield-wall-sector-7-2">
          <rect
            x="688.597"
            y="399.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_99"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="694.347" y="410.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-shield-wall-sector-8">
        <g id="force-slot-shield-wall-sector-8-1">
          <rect
            x="596.597"
            y="398.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_100"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="602.347" y="409.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-shield-wall-sector-8-2">
          <rect
            x="619.597"
            y="398.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_101"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="625.347" y="409.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-shield-wall-sector-8-3">
          <rect
            x="596.597"
            y="416.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_102"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="602.347" y="427.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-shield-wall-sector-8-4">
          <rect
            x="619.597"
            y="416.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_103"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="625.347" y="427.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-hole-in-the-rock-sector-8">
        <g id="force-slot-hole-in-the-rock-sector-8-1">
          <rect
            x="658.597"
            y="313.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_104"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="664.347" y="324.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-hole-in-the-rock-sector-8-2">
          <rect
            x="681.597"
            y="313.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_105"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="687.347" y="324.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-hole-in-the-rock-sector-8-3">
          <rect
            x="658.597"
            y="331.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_106"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="664.347" y="342.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-hole-in-the-rock-sector-8-4">
          <rect
            x="681.597"
            y="331.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_107"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="687.347" y="342.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-old-gap-sector-8">
        <g id="force-slot-old-gap-sector-8-1">
          <rect
            x="689.097"
            y="205.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_108"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="694.847" y="216.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-old-gap-sector-9">
        <g id="force-slot-old-gap-sector-9-1">
          <rect
            x="620.597"
            y="162.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_109"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="626.347" y="173.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-old-gap-sector-9-2">
          <rect
            x="643.597"
            y="162.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_110"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="649.347" y="173.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-old-gap-sector-9-3">
          <rect
            x="620.597"
            y="180.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_111"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="626.347" y="191.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-old-gap-sector-9-4">
          <rect
            x="643.597"
            y="180.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_112"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="649.347" y="191.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-sihaya-ridge-sector-7">
        <g id="force-slot-sihaya-ridge-sector-7-1">
          <rect
            x="754.597"
            y="264.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_113"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="760.347" y="275.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-sihaya-ridge-sector-7-2">
          <rect
            x="777.597"
            y="264.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_114"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="783.347" y="275.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-sihaya-ridge-sector-7-3">
          <rect
            x="754.597"
            y="282.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_115"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="760.347" y="293.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-sihaya-ridge-sector-7-4">
          <rect
            x="777.597"
            y="282.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_116"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="783.347" y="293.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-basin-sector-7">
        <g id="force-slot-basin-sector-7-1">
          <rect
            x="702.597"
            y="233.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_117"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="708.347" y="244.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-basin-sector-7-2">
          <rect
            x="725.597"
            y="233.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_118"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="731.347" y="244.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-basin-sector-7-3">
          <rect
            x="702.597"
            y="251.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_119"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="708.347" y="262.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-basin-sector-7-4">
          <rect
            x="725.597"
            y="251.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_120"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="731.347" y="262.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-rim-wall-west-sector-8">
        <g id="force-slot-rim-wall-west-sector-8-1">
          <rect
            x="641.097"
            y="282.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_121"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="646.847" y="293.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-rim-wall-west-sector-8-2">
          <rect
            x="641.097"
            y="300.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_122"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="646.847" y="311.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-arrakeen-sector-9">
        <g id="force-slot-arrakeen-sector-9-1">
          <rect
            x="601.597"
            y="228.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_123"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="607.347" y="239.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-arrakeen-sector-9-2">
          <rect
            x="624.597"
            y="228.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_124"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="630.347" y="239.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-arrakeen-sector-9-3">
          <rect
            x="601.597"
            y="246.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_125"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="607.347" y="257.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-arrakeen-sector-9-4">
          <rect
            x="624.597"
            y="246.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_126"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="630.347" y="257.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-imperial-basin-sector-9">
        <g id="force-slot-imperial-basin-sector-9-1">
          <rect
            x="541.597"
            y="319.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_127"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="547.347" y="330.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-imperial-basin-sector-9-2">
          <rect
            x="564.597"
            y="319.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_128"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="570.347" y="330.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-imperial-basin-sector-9-3">
          <rect
            x="541.597"
            y="337.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_129"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="547.347" y="348.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-imperial-basin-sector-9-4">
          <rect
            x="564.597"
            y="337.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_130"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="570.347" y="348.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-imperial-basin-sector-8">
        <g id="force-slot-imperial-basin-sector-8-1">
          <rect
            x="555.097"
            y="429.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_131"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="560.847" y="440.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-imperial-basin-sector-10">
        <g id="force-slot-imperial-basin-sector-10-1">
          <rect
            x="496.597"
            y="329.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_132"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="502.347" y="340.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-imperial-basin-sector-10-2">
          <rect
            x="496.597"
            y="347.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_133"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="502.347" y="358.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-imperial-basin-sector-10-3">
          <rect
            x="496.597"
            y="365.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_134"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="502.347" y="376.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-imperial-basin-sector-10-4">
          <rect
            x="496.597"
            y="383.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_135"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="502.347" y="394.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-carthag-sector-10">
        <g id="force-slot-carthag-sector-10-1">
          <rect
            x="453.597"
            y="264.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_136"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="459.347" y="275.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-carthag-sector-10-2">
          <rect
            x="476.597"
            y="264.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_137"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="482.347" y="275.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-carthag-sector-10-3">
          <rect
            x="453.597"
            y="282.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_138"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="459.347" y="293.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-carthag-sector-10-4">
          <rect
            x="476.597"
            y="282.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_139"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="482.347" y="293.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-tsimpo-sector-10">
        <g id="force-slot-tsimpo-sector-10-1">
          <rect
            x="460.597"
            y="180.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_140"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="466.347" y="191.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-tsimpo-sector-10-2">
          <rect
            x="483.597"
            y="180.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_141"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="489.347" y="191.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-tsimpo-sector-10-3">
          <rect
            x="460.597"
            y="198.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_142"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="466.347" y="209.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-tsimpo-sector-10-4">
          <rect
            x="483.597"
            y="198.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_143"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="489.347" y="209.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-broken-land-sector-10">
        <g id="force-slot-broken-land-sector-10-1">
          <rect
            x="446.597"
            y="129.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_144"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="452.347" y="140.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-broken-land-sector-10-2">
          <rect
            x="469.597"
            y="129.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_145"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="475.347" y="140.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-broken-land-sector-10-3">
          <rect
            x="446.597"
            y="147.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_146"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="452.347" y="158.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-broken-land-sector-10-4">
          <rect
            x="469.597"
            y="147.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_147"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="475.347" y="158.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-broken-land-sector-11">
        <g id="force-slot-broken-land-sector-11-1">
          <rect
            x="341.597"
            y="150.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_148"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="347.347" y="161.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-broken-land-sector-11-2">
          <rect
            x="364.597"
            y="150.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_149"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="370.347" y="161.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-broken-land-sector-11-3">
          <rect
            x="341.597"
            y="168.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_150"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="347.347" y="179.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-broken-land-sector-11-4">
          <rect
            x="364.597"
            y="168.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_151"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="370.347" y="179.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-tsimpo-sector-11">
        <g id="force-slot-tsimpo-sector-11-1">
          <rect
            x="373.597"
            y="229.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_152"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="379.347" y="240.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-tsimpo-sector-11-2">
          <rect
            x="396.597"
            y="229.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_153"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="402.347" y="240.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-tsimpo-sector-11-3">
          <rect
            x="373.597"
            y="247.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_154"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="379.347" y="258.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-tsimpo-sector-11-4">
          <rect
            x="396.597"
            y="247.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_155"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="402.347" y="258.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-tsimpo-sector-12">
        <g id="force-slot-tsimpo-sector-12-1">
          <rect
            x="315.097"
            y="303.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_156"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="320.847" y="314.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-plastic-basin-sector-11">
        <g id="force-slot-plastic-basin-sector-11-1">
          <rect
            x="314.597"
            y="214.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_157"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="320.347" y="225.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-plastic-basin-sector-11-2">
          <rect
            x="337.597"
            y="214.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_158"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="343.347" y="225.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-plastic-basin-sector-11-3">
          <rect
            x="314.597"
            y="232.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_159"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="320.347" y="243.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-plastic-basin-sector-11-4">
          <rect
            x="337.597"
            y="232.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_160"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="343.347" y="243.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-hagga-basin-sector-11">
        <g id="force-slot-hagga-basin-sector-11-1">
          <rect
            x="379.597"
            y="318.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_161"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="385.347" y="329.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-hagga-basin-sector-11-2">
          <rect
            x="402.597"
            y="318.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_162"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="408.347" y="329.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-hagga-basin-sector-11-3">
          <rect
            x="379.597"
            y="336.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_163"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="385.347" y="347.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-hagga-basin-sector-11-4">
          <rect
            x="402.597"
            y="336.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_164"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="408.347" y="347.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-arsunt-sector-11">
        <g id="force-slot-arsunt-sector-11-1">
          <rect
            x="442.097"
            y="418.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_165"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="447.847" y="429.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-arsunt-sector-11-2">
          <rect
            x="442.097"
            y="436.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_166"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="447.847" y="447.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-arsunt-sector-11-3">
          <rect
            x="442.097"
            y="454.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_167"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="447.847" y="465.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-arsunt-sector-11-4">
          <rect
            x="442.097"
            y="472.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_168"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="447.847" y="483.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-arsunt-sector-10">
        <g id="force-slot-arsunt-sector-10-1">
          <rect
            x="466.097"
            y="362.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_169"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="471.847" y="373.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-arsunt-sector-10-2">
          <rect
            x="466.097"
            y="380.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_170"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="471.847" y="391.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-arsunt-sector-10-3">
          <rect
            x="466.097"
            y="398.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_171"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="471.847" y="409.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-arsunt-sector-10-4">
          <rect
            x="466.097"
            y="416.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_172"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="471.847" y="427.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-hagga-basin-sector-12">
        <g id="force-slot-hagga-basin-sector-12-1">
          <rect
            x="320.597"
            y="357.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_173"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="326.347" y="368.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-hagga-basin-sector-12-2">
          <rect
            x="343.597"
            y="357.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_174"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="349.347" y="368.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-hagga-basin-sector-12-3">
          <rect
            x="320.597"
            y="375.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_175"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="326.347" y="386.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-hagga-basin-sector-12-4">
          <rect
            x="343.597"
            y="375.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_176"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="349.347" y="386.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-plastic-basin-sector-12">
        <g id="force-slot-plastic-basin-sector-12-1">
          <rect
            x="241.597"
            y="286.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_177"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="247.347" y="297.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-plastic-basin-sector-12-2">
          <rect
            x="264.597"
            y="286.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_178"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="270.347" y="297.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-plastic-basin-sector-12-3">
          <rect
            x="241.597"
            y="304.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_179"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="247.347" y="315.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-plastic-basin-sector-12-4">
          <rect
            x="264.597"
            y="304.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_180"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="270.347" y="315.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-rock-outcroppings-sector-12">
        <g id="force-slot-rock-outcroppings-sector-12-1">
          <rect
            x="184.597"
            y="243.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_181"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="190.347" y="254.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-rock-outcroppings-sector-12-2">
          <rect
            x="207.597"
            y="243.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_182"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="213.347" y="254.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-rock-outcroppings-sector-12-3">
          <rect
            x="184.597"
            y="261.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_183"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="190.347" y="272.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-rock-outcroppings-sector-12-4">
          <rect
            x="207.597"
            y="261.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_184"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="213.347" y="272.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-rock-outcroppings-sector-13">
        <g id="force-slot-rock-outcroppings-sector-13-1">
          <rect
            x="135.597"
            y="299.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_185"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="141.347" y="310.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-rock-outcroppings-sector-13-2">
          <rect
            x="158.597"
            y="299.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_186"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="164.347" y="310.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-rock-outcroppings-sector-13-3">
          <rect
            x="147.097"
            y="317.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_187"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="152.847" y="328.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-sietch-tabr-sector-13">
        <g id="force-slot-sietch-tabr-sector-13-1">
          <rect
            x="151.597"
            y="355.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_188"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="157.347" y="366.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-sietch-tabr-sector-13-2">
          <rect
            x="174.597"
            y="355.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_189"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="180.347" y="366.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-sietch-tabr-sector-13-3">
          <rect
            x="151.597"
            y="373.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_190"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="157.347" y="384.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-sietch-tabr-sector-13-4">
          <rect
            x="174.597"
            y="373.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_191"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="180.347" y="384.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-plastic-basin-sector-13">
        <g id="force-slot-plastic-basin-sector-13-1">
          <rect
            x="248.597"
            y="412.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_192"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="254.347" y="423.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-plastic-basin-sector-13-2">
          <rect
            x="271.597"
            y="412.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_193"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="277.347" y="423.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-plastic-basin-sector-13-3">
          <rect
            x="248.597"
            y="430.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_194"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="254.347" y="441.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-plastic-basin-sector-13-4">
          <rect
            x="271.597"
            y="430.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_195"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="277.347" y="441.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-bight-of-the-cliff-sector-13">
        <g id="force-slot-bight-of-the-cliff-sector-13-1">
          <rect
            x="99.0969"
            y="359.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_196"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="104.847" y="370.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-bight-of-the-cliff-sector-13-2">
          <rect
            x="99.0969"
            y="377.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_197"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="104.847" y="388.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-bight-of-the-cliff-sector-13-3">
          <rect
            x="99.0969"
            y="395.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_198"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="104.847" y="406.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-bight-of-the-cliff-sector-14">
        <g id="force-slot-bight-of-the-cliff-sector-14-1">
          <rect
            x="72.5969"
            y="431.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_199"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="78.3469" y="442.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-bight-of-the-cliff-sector-14-2">
          <rect
            x="95.5969"
            y="431.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_200"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="101.347" y="442.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-bight-of-the-cliff-sector-14-3">
          <rect
            x="118.597"
            y="431.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_201"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="124.347" y="442.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-funeral-plain-sector-14">
        <g id="force-slot-funeral-plain-sector-14-1">
          <rect
            x="131.097"
            y="474.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_202"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="136.847" y="485.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-funeral-plain-sector-14-2">
          <rect
            x="154.097"
            y="474.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_203"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="159.847" y="485.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-funeral-plain-sector-14-3">
          <rect
            x="177.097"
            y="474.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_204"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="182.847" y="485.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-funeral-plain-sector-14-4">
          <rect
            x="200.097"
            y="474.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_205"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="205.847" y="485.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-great-flat-sector-14">
        <g id="force-slot-great-flat-sector-14-1">
          <rect
            x="230.597"
            y="513.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_206"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="236.347" y="524.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-great-flat-sector-14-2">
          <rect
            x="253.597"
            y="513.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_207"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="259.347" y="524.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-great-flat-sector-14-3">
          <rect
            x="230.597"
            y="531.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_208"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="236.347" y="542.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-great-flat-sector-14-4">
          <rect
            x="253.597"
            y="531.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_209"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="259.347" y="542.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-greater-flat-sector-15">
        <g id="force-slot-greater-flat-sector-15-1">
          <rect
            x="121.597"
            y="575.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_210"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="127.347" y="586.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-greater-flat-sector-15-2">
          <rect
            x="144.597"
            y="575.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_211"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="150.347" y="586.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-greater-flat-sector-15-3">
          <rect
            x="121.597"
            y="593.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_212"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="127.347" y="604.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-greater-flat-sector-15-4">
          <rect
            x="144.597"
            y="593.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_213"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="150.347" y="604.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-habbanya-erg-sector-15">
        <g id="force-slot-habbanya-erg-sector-15-1">
          <rect
            x="106.597"
            y="643.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_214"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="112.347" y="654.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-habbanya-erg-sector-15-2">
          <rect
            x="129.597"
            y="643.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_215"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="135.347" y="654.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-habbanya-erg-sector-15-3">
          <rect
            x="152.597"
            y="643.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_216"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="158.347" y="654.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-habbanya-erg-sector-15-4">
          <rect
            x="175.597"
            y="643.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_217"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="181.347" y="654.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-habbanya-erg-sector-16">
        <g id="force-slot-habbanya-erg-sector-16-1">
          <rect
            x="214.597"
            y="654.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_218"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="220.347" y="665.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-habbanya-erg-sector-16-2">
          <rect
            x="237.597"
            y="654.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_219"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="243.347" y="665.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-habbanya-erg-sector-16-3">
          <rect
            x="214.597"
            y="672.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_220"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="220.347" y="683.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-habbanya-erg-sector-16-4">
          <rect
            x="237.597"
            y="672.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_221"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="243.347" y="683.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-false-wall-west-sector-16">
        <g id="force-slot-false-wall-west-sector-16-1">
          <rect
            x="282.597"
            y="649.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_222"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="288.347" y="660.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-false-wall-west-sector-16-2">
          <rect
            x="305.597"
            y="649.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_223"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="311.347" y="660.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-false-wall-west-sector-16-3">
          <rect
            x="282.597"
            y="667.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_224"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="288.347" y="678.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-false-wall-west-sector-16-4">
          <rect
            x="305.597"
            y="667.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_225"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="311.347" y="678.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-false-wall-west-sector-15">
        <g id="force-slot-false-wall-west-sector-15-1">
          <rect
            x="296.597"
            y="594.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_226"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="302.347" y="605.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-false-wall-west-sector-15-2">
          <rect
            x="319.597"
            y="594.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_227"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="325.347" y="605.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-wind-pass-sector-15">
        <g id="force-slot-wind-pass-sector-15-1">
          <rect
            x="349.597"
            y="569.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_228"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="355.347" y="580.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-wind-pass-sector-15-2">
          <rect
            x="372.597"
            y="569.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_229"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="378.347" y="580.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-wind-pass-sector-16">
        <g id="force-slot-wind-pass-sector-16-1">
          <rect
            x="345.097"
            y="619.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_230"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="350.847" y="630.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-wind-pass-sector-16-2">
          <rect
            x="345.097"
            y="637.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_231"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="350.847" y="648.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-wind-pass-north-sector-16">
        <g id="force-slot-wind-pass-north-sector-16-1">
          <rect
            x="377.597"
            y="614.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_232"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="383.347" y="625.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-wind-pass-north-sector-17">
        <g id="force-slot-wind-pass-north-sector-17-1">
          <rect
            x="367.597"
            y="655.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_233"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="373.347" y="666.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-wind-pass-north-sector-17-2">
          <rect
            x="390.597"
            y="655.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_234"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="396.347" y="666.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-wind-pass-north-sector-17-3">
          <rect
            x="367.597"
            y="673.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_235"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="373.347" y="684.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-wind-pass-north-sector-17-4">
          <rect
            x="390.597"
            y="673.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_236"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="396.347" y="684.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-cielago-west-sector-17">
        <g id="force-slot-cielago-west-sector-17-1">
          <rect
            x="308.597"
            y="758.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_237"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="314.347" y="769.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-west-sector-17-2">
          <rect
            x="331.597"
            y="758.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_238"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="337.347" y="769.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-west-sector-17-3">
          <rect
            x="308.597"
            y="776.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_239"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="314.347" y="787.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-west-sector-17-4">
          <rect
            x="331.597"
            y="776.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_240"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="337.347" y="787.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-false-wall-west-sector-17">
        <g id="force-slot-false-wall-west-sector-17-1">
          <rect
            x="262.597"
            y="744.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_241"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="268.347" y="755.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-false-wall-west-sector-17-2">
          <rect
            x="285.597"
            y="744.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_242"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="291.347" y="755.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-false-wall-west-sector-17-3">
          <rect
            x="274.097"
            y="762.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_243"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="279.847" y="773.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-habbanya-ridge-flat-sector-17">
        <g id="force-slot-habbanya-ridge-flat-sector-17-1">
          <rect
            x="218.597"
            y="815.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_244"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="224.347" y="826.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-habbanya-ridge-flat-sector-17-2">
          <rect
            x="241.597"
            y="815.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_245"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="247.347" y="826.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-habbanya-ridge-flat-sector-17-3">
          <rect
            x="218.597"
            y="833.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_246"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="224.347" y="844.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-habbanya-ridge-flat-sector-17-4">
          <rect
            x="241.597"
            y="833.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_247"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="247.347" y="844.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-tleilaxu-tanks"></g>
        <g id="force-slot-tleilaxu-tanks-1">
          <rect
            x="40.5969"
            y="946.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_248"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="46.3469" y="957.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-tleilaxu-tanks-2">
        <rect
          x="63.5969"
          y="946.456"
          width="19"
          height="14"
          rx="7"
          stroke="black"
        />
        <text
          id="0_249"
          fill="black"
          xmlSpace="preserve"
          style={{ whiteSpace: "pre" }}
          fontFamily="Inter"
          fontSize="12"
          letterSpacing="0em"
        >
          <tspan x="69.3469" y="957.819">
            0
          </tspan>
        </text>
      </g>
      <g id="force-slot-tleilaxu-tanks-3">
        <rect
          x="40.5969"
          y="964.456"
          width="19"
          height="14"
          rx="7"
          stroke="black"
        />
        <text
          id="0_250"
          fill="black"
          xmlSpace="preserve"
          style={{ whiteSpace: "pre" }}
          fontFamily="Inter"
          fontSize="12"
          letterSpacing="0em"
        >
          <tspan x="46.3469" y="975.819">
            0
          </tspan>
        </text>
      </g>
      <g id="force-slot-tleilaxu-tanks-4">
        <rect
          x="63.5969"
          y="964.456"
          width="19"
          height="14"
          rx="7"
          stroke="black"
        />
        <text
          id="0_251"
          fill="black"
          xmlSpace="preserve"
          style={{ whiteSpace: "pre" }}
          fontFamily="Inter"
          fontSize="12"
          letterSpacing="0em"
        >
          <tspan x="69.3469" y="975.819">
            0
          </tspan>
        </text>
      </g>
      <g id="force-slot-tleilaxu-tanks-5">
        <rect
          x="40.5969"
          y="982.456"
          width="19"
          height="14"
          rx="7"
          stroke="black"
        />
        <text
          id="0_252"
          fill="black"
          xmlSpace="preserve"
          style={{ whiteSpace: "pre" }}
          fontFamily="Inter"
          fontSize="12"
          letterSpacing="0em"
        >
          <tspan x="46.3469" y="993.819">
            0
          </tspan>
        </text>
      </g>
      <g id="force-slot-tleilaxu-tanks-6">
        <rect
          x="63.5969"
          y="982.456"
          width="19"
          height="14"
          rx="7"
          stroke="black"
        />
        <text
          id="0_253"
          fill="black"
          xmlSpace="preserve"
          style={{ whiteSpace: "pre" }}
          fontFamily="Inter"
          fontSize="12"
          letterSpacing="0em"
        >
          <tspan x="69.3469" y="993.819">
            0
          </tspan>
        </text>
      </g>
      <g id="force-slot-habbanya-sietch-sector-16">
        <g id="force-slot-habbanya-sietch-sector-16-1">
          <rect
            x="162.597"
            y="726.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_254"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="168.347" y="737.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-habbanya-sietch-sector-16-2">
          <rect
            x="185.597"
            y="726.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_255"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="191.347" y="737.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-habbanya-sietch-sector-16-3">
          <rect
            x="162.597"
            y="744.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_256"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="168.347" y="755.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-habbanya-sietch-sector-16-4">
          <rect
            x="185.597"
            y="744.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_257"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="191.347" y="755.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-habbanya-ridge-flat-sector-16">
        <g id="force-slot-habbanya-ridge-flat-sector-16-1">
          <rect
            x="100.597"
            y="706.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_258"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="106.347" y="717.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-habbanya-ridge-flat-sector-16-2">
          <rect
            x="123.597"
            y="706.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_259"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="129.347" y="717.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-habbanya-ridge-flat-sector-16-3">
          <rect
            x="100.597"
            y="724.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_260"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="106.347" y="735.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-habbanya-ridge-flat-sector-16-4">
          <rect
            x="123.597"
            y="724.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_261"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="129.347" y="735.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-cielago-west-sector-0">
        <g id="force-slot-cielago-west-sector-0-1">
          <rect
            x="332.597"
            y="822.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_262"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="338.347" y="833.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-west-sector-0-2">
          <rect
            x="332.597"
            y="840.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_263"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="338.347" y="851.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-cielago-north-sector-0">
        <g id="force-slot-cielago-north-sector-0-1">
          <rect
            x="396.597"
            y="724.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_264"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="402.347" y="735.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-north-sector-0-2">
          <rect
            x="419.597"
            y="724.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_265"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="425.347" y="735.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-north-sector-0-3">
          <rect
            x="396.597"
            y="742.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_266"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="402.347" y="753.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-north-sector-0-4">
          <rect
            x="419.597"
            y="742.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_267"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="425.347" y="753.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-cielago-north-sector-1">
        <g id="force-slot-cielago-north-sector-1-1">
          <rect
            x="464.597"
            y="732.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_268"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="470.347" y="743.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-north-sector-1-2">
          <rect
            x="487.597"
            y="732.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_269"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="493.347" y="743.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-north-sector-1-3">
          <rect
            x="464.597"
            y="750.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_270"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="470.347" y="761.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-north-sector-1-4">
          <rect
            x="487.597"
            y="750.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_271"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="493.347" y="761.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-cielago-north-sector-2">
        <g id="force-slot-cielago-north-sector-2-1">
          <rect
            x="526.597"
            y="720.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_272"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="532.347" y="731.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-north-sector-2-2">
          <rect
            x="549.597"
            y="720.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_273"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="555.347" y="731.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-north-sector-2-3">
          <rect
            x="526.597"
            y="738.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_274"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="532.347" y="749.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-north-sector-2-4">
          <rect
            x="549.597"
            y="738.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_275"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="555.347" y="749.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-cielago-depression-sector-1">
        <g id="force-slot-cielago-depression-sector-1-1">
          <rect
            x="463.597"
            y="817.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_276"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="469.347" y="828.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-depression-sector-1-2">
          <rect
            x="486.597"
            y="817.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_277"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="492.347" y="828.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-depression-sector-1-3">
          <rect
            x="463.597"
            y="835.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_278"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="469.347" y="846.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-depression-sector-1-4">
          <rect
            x="486.597"
            y="835.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_279"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="492.347" y="846.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-cielago-depression-sector-0">
        <g id="force-slot-cielago-depression-sector-0-1">
          <rect
            x="380.597"
            y="805.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_280"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="386.347" y="816.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-depression-sector-0-2">
          <rect
            x="403.597"
            y="805.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_281"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="409.347" y="816.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-depression-sector-0-3">
          <rect
            x="380.597"
            y="823.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_282"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="386.347" y="834.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-depression-sector-0-4">
          <rect
            x="403.597"
            y="823.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_283"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="409.347" y="834.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-cielago-depression-sector-2">
        <g id="force-slot-cielago-depression-sector-2-1">
          <rect
            x="538.597"
            y="815.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_284"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="544.347" y="826.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-depression-sector-2-2">
          <rect
            x="561.597"
            y="815.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_285"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="567.347" y="826.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-depression-sector-2-3">
          <rect
            x="538.597"
            y="833.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_286"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="544.347" y="844.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-cielago-depression-sector-2-4">
          <rect
            x="561.597"
            y="833.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_287"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="567.347" y="844.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-wind-pass-sector-14">
        <g id="force-slot-wind-pass-sector-14-1">
          <rect
            x="369.597"
            y="535.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_288"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="375.347" y="546.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-wind-pass-sector-14-2">
          <rect
            x="392.597"
            y="535.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_289"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="398.347" y="546.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-wind-pass-sector-13">
        <g id="force-slot-wind-pass-sector-13-1">
          <rect
            x="385.597"
            y="507.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_290"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="391.347" y="518.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-wind-pass-sector-13-2">
          <rect
            x="408.597"
            y="507.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_291"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="414.347" y="518.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-old-gap-sector-10">
        <g id="force-slot-old-gap-sector-10-1">
          <rect
            x="518.597"
            y="138.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_292"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="524.347" y="149.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-old-gap-sector-10-2">
          <rect
            x="541.597"
            y="138.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_293"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="547.347" y="149.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-minor-erg-sector-4">
        <g id="force-slot-minor-erg-sector-4-1">
          <rect
            x="633.097"
            y="633.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_294"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="638.847" y="644.819">
              0
            </tspan>
          </text>
        </g>
      </g>
      <g id="force-slot-meridian-sector-1">
        <g id="force-slot-meridian-sector-1-1">
          <rect
            x="425.097"
            y="902.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_295"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="430.847" y="913.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-meridian-sector-1-2">
          <rect
            x="425.097"
            y="920.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_296"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="430.847" y="931.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-meridian-sector-1-3">
          <rect
            x="425.097"
            y="938.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_297"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="430.847" y="949.819">
              0
            </tspan>
          </text>
        </g>
        <g id="force-slot-meridian-sector-1-4">
          <rect
            x="425.097"
            y="956.456"
            width="19"
            height="14"
            rx="7"
            stroke="black"
          />
          <text
            id="0_298"
            fill="black"
            xmlSpace="preserve"
            style={{ whiteSpace: "pre" }}
            fontFamily="Inter"
            fontSize="12"
            letterSpacing="0em"
          >
            <tspan x="430.847" y="967.819">
              0
            </tspan>
          </text>
        </g>
      </g>
    </g>
  );
}
