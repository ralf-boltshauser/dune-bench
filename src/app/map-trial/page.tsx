"use client";

import { TERRITORY_DEFINITIONS, TerritoryId } from "@/lib/game/types";
import { Faction, FACTION_NAMES, TerritoryType } from "@/lib/game/types/enums";
import {
  getForceSlotGroupId,
  territoryIdToSvgId,
} from "@/lib/game/utils/territory-svg-mapper";
import { useEffect, useMemo, useState } from "react";

// Helper function to darken a color
function darkenColor(color: string, amount: number): string {
  // Remove # if present
  const hex = color.replace("#", "");
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Darken by reducing each component
  const newR = Math.max(0, Math.floor(r * (1 - amount)));
  const newG = Math.max(0, Math.floor(g * (1 - amount)));
  const newB = Math.max(0, Math.floor(b * (1 - amount)));
  
  // Convert back to hex
  return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
}

interface ForcePlacement {
  faction: Faction;
  territoryId: TerritoryId;
  sector: number;
  count: number; // Total number of forces for this faction at this location
  slotIndex: number; // Which slot index this faction uses (0-based, one slot per faction)
}

export default function MapTrialPage() {
  const [forces, setForces] = useState<ForcePlacement[]>([]);
  const [currentTurn, setCurrentTurn] = useState<number>(1);

  // Store original SVG content
  const [originalSvg, setOriginalSvg] = useState<string>("");

  // Load SVG content
  useEffect(() => {
    fetch("/map-trial.svg")
      .then((res) => res.text())
      .then((text) => {
        setOriginalSvg(text);
      })
      .catch((err) => console.error("Failed to load SVG:", err));
  }, []);

  // Update SVG with force visualizations
  const updatedSvgContent = useMemo(() => {
    if (!originalSvg) return originalSvg;

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(originalSvg, "image/svg+xml");
    const svgElement = svgDoc.documentElement;

    // Color territories based on their type
    const territoryColors: Record<TerritoryType, string> = {
      [TerritoryType.SAND]: "#F9DFA9",
      [TerritoryType.ROCK]: "#806959",
      [TerritoryType.POLAR_SINK]: "#ADF8FF",
      [TerritoryType.STRONGHOLD]: "#753D33",
    };

    // Apply background colors to all territories
    Object.values(TerritoryId).forEach((territoryId) => {
      const territory = TERRITORY_DEFINITIONS[territoryId];
      if (!territory) return;

      const svgId = territoryIdToSvgId(territoryId);
      const territoryPath = svgElement.querySelector(`#${svgId}`);

      if (territoryPath) {
        const color = territoryColors[territory.type];
        if (color) {
          (territoryPath as Element).setAttribute("fill", color);
          (territoryPath as Element).setAttribute("fill-opacity", "0.5");
        }
      }
    });

    // First, hide ALL force slots by default (both groups and individual slots)
    const allForceSlotElements = svgElement.querySelectorAll(
      '[id^="force-slot-"]'
    );
    allForceSlotElements.forEach((element) => {
      (element as Element).setAttribute("display", "none");
    });

    // Now show and color only the slots that have forces
    forces.forEach((force) => {
      const slotGroupId = getForceSlotGroupId(force.territoryId, force.sector);
      if (!slotGroupId) {
        console.warn(
          `No force slot found for ${force.territoryId} sector ${force.sector}`
        );
        return;
      }

      const slotGroup = svgElement.querySelector(`#${slotGroupId}`);
      if (!slotGroup) {
        console.warn(`Slot group ${slotGroupId} not found in SVG`);
        return;
      }

      // Get all individual slots in this group
      // Slots are nested groups with IDs like: force-slot-{territory}-sector-{sector}-{index}
      const slots = Array.from(slotGroup.children)
        .filter((child) => {
          const id = child.getAttribute("id") || "";
          return id.startsWith(`${slotGroupId}-`) && /-\d+$/.test(id);
        })
        .sort((a, b) => {
          // Sort by slot index (extract number from ID)
          const aMatch = a.getAttribute("id")?.match(/-(\d+)$/);
          const bMatch = b.getAttribute("id")?.match(/-(\d+)$/);
          const aNum = aMatch ? parseInt(aMatch[1], 10) : 0;
          const bNum = bMatch ? parseInt(bMatch[1], 10) : 0;
          return aNum - bNum;
        });

      // Color slots based on faction and count
      const factionColors: Record<Faction, string> = {
        [Faction.ATREIDES]: "#4A90E2", // Blue
        [Faction.BENE_GESSERIT]: "#9B59B6", // Purple
        [Faction.EMPEROR]: "#F39C12", // Orange
        [Faction.FREMEN]: "#E74C3C", // Red
        [Faction.HARKONNEN]: "#2C3E50", // Dark Blue
        [Faction.SPACING_GUILD]: "#1ABC9C", // Teal
      };

      const color = factionColors[force.faction] || "#000000";

      // Show the slot group if it has forces
      slotGroup.setAttribute("display", "block");

      // Color only the specific individual slot being used by this faction
      // Each faction gets ONE slot per territory+sector, showing the total count
      slots.forEach((slot, slotIndex) => {
        const rect = slot.querySelector("rect");
        const text = slot.querySelector("text");
        const tspan = text?.querySelector("tspan");

        // Check if this is the exact slot for this faction's placement
        const isThisSlot = slotIndex === force.slotIndex;

        if (isThisSlot) {
          // Show this slot
          (slot as Element).setAttribute("display", "block");

          // Color this specific individual slot for this faction
          // Use darker background with full opacity and white text
          if (rect) {
            // Darken the color by reducing brightness
            const darkerColor = darkenColor(color, 0.3);
            rect.setAttribute("fill", darkerColor);
            rect.setAttribute("fill-opacity", "1"); // Full opacity, not transparent
            rect.setAttribute("stroke", darkerColor);
            rect.setAttribute("stroke-width", "2");

            // Center the text in the rect
            const rectX = parseFloat(rect.getAttribute("x") || "0");
            const rectY = parseFloat(rect.getAttribute("y") || "0");
            const rectWidth = parseFloat(rect.getAttribute("width") || "0");
            const rectHeight = parseFloat(rect.getAttribute("height") || "0");
            
            const centerX = rectX + rectWidth / 2;
            const centerY = rectY + rectHeight / 2;

            // Update text element for centering
            const text = slot.querySelector("text");
            if (text) {
              text.setAttribute("fill", "white");
              text.setAttribute("text-anchor", "middle");
              text.setAttribute("dominant-baseline", "middle");
              text.setAttribute("x", centerX.toString());
              text.setAttribute("y", centerY.toString());
            }

            // Update tspan for centering
            if (tspan) {
              tspan.textContent = force.count.toString();
              tspan.setAttribute("fill", "white");
              tspan.setAttribute("font-weight", "bold");
              tspan.setAttribute("x", centerX.toString());
              tspan.setAttribute("y", centerY.toString());
              tspan.setAttribute("text-anchor", "middle");
              tspan.setAttribute("dominant-baseline", "middle");
            }
          }
        } else {
          // Check if this slot is used by another faction
          const usedByOtherFaction = forces.some((otherForce) => {
            if (
              otherForce.territoryId !== force.territoryId ||
              otherForce.sector !== force.sector
            ) {
              return false;
            }
            return slotIndex === otherForce.slotIndex;
          });

          if (!usedByOtherFaction) {
            // Hide unused slots
            (slot as Element).setAttribute("display", "none");
          } else {
            // Show slot if used by another faction (it will be colored by that faction's loop)
            (slot as Element).setAttribute("display", "block");
          }
        }
      });
    });

    // Highlight the active turn indicator segment
    // Reset all turn indicators first
    for (let i = 1; i <= 10; i++) {
      const turnGroup = svgElement.querySelector(`#turn-indicator-${i}`);
      const turnText = svgElement.querySelector(`#turn-indicator-text-${i}`);

      if (turnGroup) {
        const path = turnGroup.querySelector("path");
        if (path) {
          if (i === currentTurn) {
            // Highlight active turn - fill with color and make it stand out
            path.setAttribute("fill", "#FFD700"); // Gold color
            path.setAttribute("fill-opacity", "0.6");
            path.setAttribute("stroke", "#FFA500"); // Orange stroke
            path.setAttribute("stroke-width", "3");
          } else {
            // Reset inactive turns
            path.setAttribute("fill", "none");
            path.setAttribute("fill-opacity", "1");
            path.setAttribute("stroke", "black");
            path.setAttribute("stroke-width", "2");
          }
        }
      }

      if (turnText) {
        if (i === currentTurn) {
          // Make active turn text bold and colored
          turnText.setAttribute("fill", "#FF6600"); // Orange
          turnText.setAttribute("font-weight", "bold");
        } else {
          // Reset inactive turn text
          turnText.setAttribute("fill", "black");
          turnText.setAttribute("font-weight", "bold");
        }
      }
    }

    // Serialize the updated SVG
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgElement);
  }, [forces, originalSvg, currentTurn]);

  // Use the computed SVG content directly
  const svgContent = updatedSvgContent || originalSvg;

  const addForces = (
    faction: Faction,
    territoryId: TerritoryId,
    sector: number,
    count: number
  ) => {
    setForces((prev) => {
      // Check if forces already exist at this location for this faction
      const existingIndex = prev.findIndex(
        (f) =>
          f.territoryId === territoryId &&
          f.sector === sector &&
          f.faction === faction
      );

      if (existingIndex >= 0) {
        // Update existing - add to the count, keep the same slot
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          count: updated[existingIndex].count + count,
        };
        return updated;
      } else {
        // Find all occupied slots at this location (one slot per faction)
        const existingAtLocation = prev.filter(
          (f) => f.territoryId === territoryId && f.sector === sector
        );

        // Get all occupied slot indices
        const occupiedSlots = new Set<number>();
        existingAtLocation.forEach((f) => {
          occupiedSlots.add(f.slotIndex);
        });

        // Find the first available slot index
        let slotIndex = 0;
        while (occupiedSlots.has(slotIndex)) {
          slotIndex++;
        }

        // Add new placement - one slot for this faction with the total count
        return [
          ...prev,
          {
            faction,
            territoryId,
            sector,
            count, // Total forces for this faction
            slotIndex, // One slot per faction
          },
        ];
      }
    });
  };

  const clearForces = () => {
    setForces([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Dune Map Visualization</h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Scenarios</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() =>
                addForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, 2)
              }
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Atreides ships 2 to Arrakeen
            </button>
            <button
              onClick={() =>
                addForces(Faction.HARKONNEN, TerritoryId.CIELAGO_SOUTH, 2, 2)
              }
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
            >
              Harkonnen ships 2 to Cielago South (sector 2)
            </button>
            <button
              onClick={() =>
                addForces(
                  Faction.BENE_GESSERIT,
                  TerritoryId.CIELAGO_SOUTH,
                  2,
                  10
                )
              }
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              BG ships 10 to Cielago South (sector 2)
            </button>
            <button
              onClick={() =>
                addForces(Faction.FREMEN, TerritoryId.MERIDIAN, 0, 5)
              }
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Fremen ships 5 to Meridian (sector 0)
            </button>
            <button
              onClick={() =>
                addForces(Faction.EMPEROR, TerritoryId.CARTHAG, 10, 3)
              }
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              Emperor ships 3 to Carthag
            </button>
            <button
              onClick={() =>
                addForces(Faction.SPACING_GUILD, TerritoryId.SOUTH_MESA, 3, 4)
              }
              className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600"
            >
              Guild ships 4 to South Mesa (sector 3)
            </button>
            <button
              onClick={clearForces}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 col-span-full"
            >
              Clear All Forces
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Current Forces</h2>
          <div className="mb-4">
            {forces.length === 0 ? (
              <p className="text-gray-500">No forces placed yet.</p>
            ) : (
              <ul className="space-y-2">
                {forces.map((force, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded"
                      style={{
                        backgroundColor:
                          force.faction === Faction.ATREIDES
                            ? "#4A90E2"
                            : force.faction === Faction.BENE_GESSERIT
                            ? "#9B59B6"
                            : force.faction === Faction.EMPEROR
                            ? "#F39C12"
                            : force.faction === Faction.FREMEN
                            ? "#E74C3C"
                            : force.faction === Faction.HARKONNEN
                            ? "#2C3E50"
                            : "#1ABC9C",
                      }}
                    />
                    <span className="font-medium">
                      {FACTION_NAMES[force.faction]}
                    </span>
                    <span>
                      {force.count} forces at {force.territoryId} (sector{" "}
                      {force.sector}, slot {force.slotIndex + 1})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Turn Control</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentTurn((prev) => Math.max(1, prev - 1))}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentTurn === 1}
            >
              Turn -1
            </button>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">Current Turn:</span>
              <span className="text-2xl font-bold text-orange-600">
                {currentTurn}
              </span>
            </div>
            <button
              onClick={() => setCurrentTurn((prev) => Math.min(10, prev + 1))}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentTurn === 10}
            >
              Turn +1
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Map</h2>
          <div
            className="w-full"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        </div>
      </div>
    </div>
  );
}
