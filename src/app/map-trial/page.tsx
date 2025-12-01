"use client";

import { Button } from "@/components/ui/button";
import { TERRITORY_DEFINITIONS, TerritoryId } from "@/lib/game/types";
import { Faction, FACTION_NAMES, TerritoryType } from "@/lib/game/types/enums";
import { FactionState } from "@/lib/game/types/state";
import {
  getForceSlotGroupId,
  territoryIdToSvgId,
} from "@/lib/game/utils/territory-svg-mapper";
import { useEffect, useMemo, useState } from "react";
import { FACTION_COLORS } from "../components/constants";
import FactionPanels from "../components/FactionPanels";
import { createMockGameState } from "../components/mockFactionData";

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
  return `#${newR.toString(16).padStart(2, "0")}${newG
    .toString(16)
    .padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
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
  const [useMockData, setUseMockData] = useState<boolean>(true);
  const [factionStates, setFactionStates] = useState<
    Map<Faction, FactionState>
  >(new Map());
  const [gameId, setGameId] = useState<string>("");
  const [loadingGame, setLoadingGame] = useState<boolean>(false);

  // Store original SVG content
  const [originalSvg, setOriginalSvg] = useState<string>("");

  // Initialize with mock data
  useEffect(() => {
    if (useMockData) {
      setFactionStates(createMockGameState());
    }
  }, [useMockData]);

  // Load real game data
  const loadGameData = async () => {
    if (!gameId.trim()) {
      alert("Please enter a game ID");
      return;
    }

    setLoadingGame(true);
    try {
      const response = await fetch(`/api/game/${gameId}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to load game");
      }

      if (data.state && data.state.factions) {
        setFactionStates(data.state.factions);
        setUseMockData(false);
      }
    } catch (error) {
      console.error("Error loading game:", error);
      alert(
        `Error loading game: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setLoadingGame(false);
    }
  };

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

      const color = FACTION_COLORS[force.faction] || "#000000";

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
            <Button
              onClick={() =>
                addForces(Faction.ATREIDES, TerritoryId.ARRAKEEN, 9, 2)
              }
              variant="default"
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              Atreides ships 2 to Arrakeen
            </Button>
            <Button
              onClick={() =>
                addForces(Faction.HARKONNEN, TerritoryId.CIELAGO_SOUTH, 2, 2)
              }
              variant="default"
              className="bg-gray-700 text-white hover:bg-gray-800"
            >
              Harkonnen ships 2 to Cielago South (sector 2)
            </Button>
            <Button
              onClick={() =>
                addForces(
                  Faction.BENE_GESSERIT,
                  TerritoryId.CIELAGO_SOUTH,
                  2,
                  10
                )
              }
              variant="default"
              className="bg-purple-500 text-white hover:bg-purple-600"
            >
              BG ships 10 to Cielago South (sector 2)
            </Button>
            <Button
              onClick={() =>
                addForces(Faction.FREMEN, TerritoryId.MERIDIAN, 0, 5)
              }
              variant="default"
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Fremen ships 5 to Meridian (sector 0)
            </Button>
            <Button
              onClick={() =>
                addForces(Faction.EMPEROR, TerritoryId.CARTHAG, 10, 3)
              }
              variant="default"
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              Emperor ships 3 to Carthag
            </Button>
            <Button
              onClick={() =>
                addForces(Faction.SPACING_GUILD, TerritoryId.SOUTH_MESA, 3, 4)
              }
              variant="default"
              className="bg-teal-500 text-white hover:bg-teal-600"
            >
              Guild ships 4 to South Mesa (sector 3)
            </Button>
            <Button
              onClick={clearForces}
              variant="destructive"
              className="col-span-full"
            >
              Clear All Forces
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Load Game Data</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              placeholder="Enter game ID"
              className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              onClick={loadGameData}
              disabled={loadingGame}
              variant="default"
              className="bg-green-500 text-white hover:bg-green-600"
            >
              {loadingGame ? "Loading..." : "Load Game"}
            </Button>
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
                        backgroundColor: FACTION_COLORS[force.faction],
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
            <Button
              onClick={() => setCurrentTurn((prev) => Math.max(1, prev - 1))}
              variant="secondary"
              disabled={currentTurn === 1}
            >
              Turn -1
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">Current Turn:</span>
              <span className="text-2xl font-bold text-orange-600">
                {currentTurn}
              </span>
            </div>
            <Button
              onClick={() => setCurrentTurn((prev) => Math.min(10, prev + 1))}
              variant="secondary"
              disabled={currentTurn === 10}
            >
              Turn +1
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Map</h2>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useMockData}
                  onChange={(e) => setUseMockData(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Use Mock Data</span>
              </label>
              <Button
                onClick={() => setFactionStates(createMockGameState())}
                variant="default"
                size="sm"
                className="bg-blue-500 text-white hover:bg-blue-600"
              >
                Refresh Mock Data
              </Button>
            </div>
          </div>
          <div className="relative w-full">
            <div
              className="w-full"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
            {factionStates.size > 0 && (
              <FactionPanels
                factions={factionStates}
                className="absolute inset-0"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
