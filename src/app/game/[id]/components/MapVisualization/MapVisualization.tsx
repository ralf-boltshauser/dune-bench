"use client";

import { getTotalForces } from "@/lib/game/state/force-utils";
import { isSectorInStorm } from "@/lib/game/state/queries";
import type { GameState } from "@/lib/game/types";
import { TERRITORY_DEFINITIONS, TerritoryId } from "@/lib/game/types";
import { Faction, Phase, TerritoryType } from "@/lib/game/types/enums";
import {
  getForceSlotGroupId,
  getSpiceSlotId,
  territoryIdToSvgId,
} from "@/lib/game/utils/territory-svg-mapper";
import { useEffect, useMemo, useState } from "react";
import type { RecentShipment } from "../../hooks/usePhaseVisualizations";
import * as constants from "./constants";
import { centerTextInRect, darkenColor, parseSvg, setFillColor } from "./helpers";
import { FACTION_COLORS } from "@/app/components/constants";

// =============================================================================
// TYPES
// =============================================================================

interface MapVisualizationProps {
  gameState?: GameState | null;
  svgPath?: string; // Path to SVG file, defaults to "/map-trial.svg"
  // Phase visualization props (optional, for event-driven updates)
  stormAffectedTerritories?: Set<TerritoryId>;
  spiceBlowTerritories?: Set<TerritoryId>;
  currentTurn?: number;
  recentShipments?: RecentShipment[];
  stormSector?: number; // Storm sector for board edge highlighting (fallback when gameState is missing)
  currentPhase?: Phase; // Current phase (for setup phase detection)
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function MapVisualization({
  gameState,
  svgPath = "/map-trial.svg",
  stormAffectedTerritories,
  spiceBlowTerritories,
  currentTurn,
  recentShipments = [],
  stormSector: stormSectorProp,
  currentPhase: currentPhaseProp,
}: MapVisualizationProps) {
  const [originalSvg, setOriginalSvg] = useState<string>("");
  const [isBlinking, setIsBlinking] = useState(true);
  const [svgLoadError, setSvgLoadError] = useState<Error | null>(null);

  // Load SVG content
  useEffect(() => {
    let cancelled = false;

    fetch(svgPath)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load SVG: ${res.status} ${res.statusText}`);
        }
        return res.text();
      })
      .then((text) => {
        if (!cancelled) {
          setOriginalSvg(text);
          setSvgLoadError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error("Failed to load SVG");
          console.error("[MapVisualization] Error loading SVG:", error);
          setSvgLoadError(error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [svgPath]);

  // Blinking animation for spice blow territories
  useEffect(() => {
    if (spiceBlowTerritories && spiceBlowTerritories.size > 0) {
      const interval = setInterval(() => {
        setIsBlinking((prev) => !prev);
      }, constants.SPICE_BLOW_BLINK_INTERVAL_MS);
      return () => clearInterval(interval);
    } else {
      // Use setTimeout to avoid synchronous state update in effect
      const timeoutId = setTimeout(() => {
        setIsBlinking(false);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [spiceBlowTerritories]);

  // Update SVG with game state visualizations
  const updatedSvgContent = useMemo(() => {
    if (!originalSvg) return originalSvg;
    // If no gameState and no event-driven props, return original SVG
    if (!gameState && !stormAffectedTerritories && !spiceBlowTerritories && stormSectorProp === undefined)
      return originalSvg;

    const { svgElement, error } = parseSvg(originalSvg);
    if (error) {
      console.error("[MapVisualization] SVG parsing error:", error);
      return originalSvg;
    }

    // Apply background colors to all territories first
    Object.values(TerritoryId).forEach((territoryId) => {
      const territory = TERRITORY_DEFINITIONS[territoryId];
      if (!territory) return;

      const svgId = territoryIdToSvgId(territoryId);
      const territoryPath = svgElement.querySelector(`#${svgId}`);

      if (territoryPath) {
        const color = constants.TERRITORY_COLORS[territory.type];
        if (color) {
          setFillColor(territoryPath, color, "0.5");
        }
      }
    });

    // Visualize storm sectors with red 50% opacity
    // Use stormAffectedTerritories if provided (event-driven), otherwise use gameState
    // Note: This will be overridden by spice blow when blinking
    if (stormAffectedTerritories) {
      // Event-driven storm visualization
      stormAffectedTerritories.forEach((territoryId) => {
        // Skip if this territory is currently blinking (spice blow takes priority)
        if (spiceBlowTerritories?.has(territoryId) && isBlinking) {
          return;
        }
        
        const svgId = territoryIdToSvgId(territoryId);
        const territoryPath = svgElement.querySelector(`#${svgId}`);
        if (territoryPath) {
          setFillColor(territoryPath, constants.STORM_COLOR, constants.STORM_OPACITY);
        }
      });
    } else if (gameState) {
      // GameState-based storm visualization (backward compatibility)
      Object.values(TerritoryId).forEach((territoryId) => {
        const territory = TERRITORY_DEFINITIONS[territoryId];
        if (!territory) return;

        // Skip if this territory is currently blinking (spice blow takes priority)
        if (spiceBlowTerritories?.has(territoryId) && isBlinking) {
          return;
        }

        // Check if any sector of this territory is in storm
        const hasStormSector = territory.sectors.some((sector) =>
          isSectorInStorm(gameState, sector)
        );

        if (hasStormSector && territory.type === TerritoryType.SAND) {
          const svgId = territoryIdToSvgId(territoryId);
          const territoryPath = svgElement.querySelector(`#${svgId}`);

          if (territoryPath) {
            setFillColor(territoryPath, constants.STORM_COLOR, constants.STORM_OPACITY);
          }
        }
      });
    }

    // Visualize spice blow territories with blinking animation
    // This overrides storm colors when blinking
    if (spiceBlowTerritories) {
      spiceBlowTerritories.forEach((territoryId) => {
        const svgId = territoryIdToSvgId(territoryId);
        const territoryPath = svgElement.querySelector(`#${svgId}`);
        if (territoryPath && isBlinking) {
          // Yellow highlight when blinking - overrides storm color
          setFillColor(
            territoryPath,
            constants.SPICE_BLOW_COLOR,
            constants.SPICE_BLOW_OPACITY
          );
        }
        // When not blinking, the territory will show its normal color (or storm color if applicable)
      });
    }

    // Only process forces if gameState is available
    if (gameState) {
      visualizeForces(svgElement, gameState, recentShipments);
      visualizeSpice(svgElement, gameState);
    }

    // Highlight the active turn indicator segment
    const turnToHighlight = currentTurn ?? gameState?.turn ?? 1;
    highlightTurnIndicator(svgElement, turnToHighlight);

    // Highlight the storm sector on the board edge
    // During setup phase, always show storm sector 0 (initial storm position)
    const phase = gameState?.phase ?? currentPhaseProp;
    const stormSectorFromState = gameState?.stormSector ?? stormSectorProp;
    
    if (stormSectorFromState !== undefined) {
      const stormSectorToHighlight = phase === Phase.SETUP ? 0 : stormSectorFromState;
      highlightStormSector(svgElement, stormSectorToHighlight);
      
      // Visualize player token positions on the board edge (sector highlighting only)
      if (gameState) {
        visualizePlayerTokenSectors(svgElement, gameState, stormSectorToHighlight);
      }
    }

    // Serialize the updated SVG
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgElement);
  }, [
    originalSvg,
    gameState,
    stormAffectedTerritories,
    spiceBlowTerritories,
    isBlinking,
    currentTurn,
    recentShipments,
    stormSectorProp,
    currentPhaseProp,
  ]);

  const svgContent = updatedSvgContent || originalSvg;

  // Show error state
  if (svgLoadError) {
    return (
      <div className="w-full flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Failed to load map</p>
          <p className="text-sm text-gray-500 mt-2">{svgLoadError.message}</p>
        </div>
      </div>
    );
  }

  // Allow rendering without gameState if using event-driven props
  if (!gameState && !stormAffectedTerritories && !spiceBlowTerritories && stormSectorProp === undefined) {
    return (
      <div className="w-full flex items-center justify-center p-8">
        <p className="text-gray-500">No game state available</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div dangerouslySetInnerHTML={{ __html: svgContent }} />
    </div>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Visualize forces on the map
 */
function visualizeForces(
  svgElement: SVGSVGElement,
  gameState: GameState,
  recentShipments: RecentShipment[] = []
): void {
  // Hide ALL force slots by default
  const allForceSlotElements = svgElement.querySelectorAll('[id^="force-slot-"]');
  allForceSlotElements.forEach((element) => {
    (element as Element).setAttribute("display", "none");
  });

  // Collect all forces by territory, sector, and faction
  const forcesByLocation = new Map<
    string,
    Array<{ faction: Faction; count: number; slotIndex: number }>
  >();

  // Process all faction forces
  for (const [faction, factionState] of gameState.factions) {
    for (const stack of factionState.forces.onBoard) {
      const totalCount = getTotalForces(stack.forces);
      if (totalCount === 0) continue;

      const key = `${stack.territoryId}-${stack.sector}`;
      if (!forcesByLocation.has(key)) {
        forcesByLocation.set(key, []);
      }

      const locationForces = forcesByLocation.get(key)!;
      const slotIndex = locationForces.length; // Assign slot index based on order
      locationForces.push({
        faction,
        count: totalCount,
        slotIndex,
      });
      
      // Debug logging for Fremen forces
      if (faction === Faction.FREMEN) {
        console.log('[MapVisualization] Fremen force found:', {
          territoryId: stack.territoryId,
          sector: stack.sector,
          count: totalCount,
          forces: stack.forces,
          key,
          slotIndex,
        });
      }
    }
  }

  // Visualize forces with faction colors
  for (const [locationKey, forces] of forcesByLocation) {
    const [territoryIdStr, sectorStr] = locationKey.split("-");
    const territoryId = territoryIdStr as TerritoryId;
    const sector = parseInt(sectorStr, 10);

    const slotGroupId = getForceSlotGroupId(territoryId, sector);
    if (!slotGroupId) {
      console.warn(`[MapVisualization] No force slot found for ${territoryId} sector ${sector}`, {
        locationKey,
        forces: forces.map(f => ({ faction: f.faction, count: f.count })),
      });
      continue;
    }

    const slotGroup = svgElement.querySelector(`#${slotGroupId}`);
    if (!slotGroup) {
      console.warn(`[MapVisualization] Slot group ${slotGroupId} not found in SVG`, {
        locationKey,
        territoryId,
        sector,
        forces: forces.map(f => ({ faction: f.faction, count: f.count })),
      });
      continue;
    }
    
    // Debug logging for Fremen
    const hasFremen = forces.some(f => f.faction === Faction.FREMEN);
    if (hasFremen) {
      console.log('[MapVisualization] Visualizing Fremen forces:', {
        locationKey,
        territoryId,
        sector,
        slotGroupId,
        forces: forces.filter(f => f.faction === Faction.FREMEN),
      });
    }

    // Get all individual slots in this group
    const slots = Array.from(slotGroup.children)
      .filter((child) => {
        const id = child.getAttribute("id") || "";
        return id.startsWith(`${slotGroupId}-`) && /-\d+$/.test(id);
      })
      .sort((a, b) => {
        const aMatch = a.getAttribute("id")?.match(/-(\d+)$/);
        const bMatch = b.getAttribute("id")?.match(/-(\d+)$/);
        const aNum = aMatch ? parseInt(aMatch[1], 10) : 0;
        const bNum = bMatch ? parseInt(bMatch[1], 10) : 0;
        return aNum - bNum;
      });

    // Show the slot group
    slotGroup.setAttribute("display", "block");

    // Color each slot for each faction
    forces.forEach((force) => {
      const slot = slots[force.slotIndex];
      if (!slot) {
        console.warn(
          `Slot index ${force.slotIndex} not found for ${territoryId} sector ${sector}`
        );
        return;
      }

      const color = FACTION_COLORS[force.faction] || "#000000";
      const darkerColor = darkenColor(color, 0.3);

      // Show this slot
      (slot as Element).setAttribute("display", "block");

      const rect = slot.querySelector("rect");
      const text = slot.querySelector("text");
      const tspan = text?.querySelector("tspan");

      if (rect) {
        // Check if this specific faction's slot has a recent shipment
        const factionShipment = recentShipments.find(
          (s) =>
            s.territoryId === territoryId &&
            s.sector === sector &&
            (s.faction.toLowerCase() === force.faction.toLowerCase() ||
             s.faction === force.faction)
        );

        // Highlight recent shipments with a brighter color and thicker stroke
        if (factionShipment) {
          const highlightColor = color; // Use original color for highlight
          rect.setAttribute("fill", highlightColor);
          rect.setAttribute("fill-opacity", "1");
          rect.setAttribute("stroke", highlightColor);
          rect.setAttribute("stroke-width", "4"); // Thicker stroke for highlight
        } else {
          rect.setAttribute("fill", darkerColor);
          rect.setAttribute("fill-opacity", "1");
          rect.setAttribute("stroke", darkerColor);
          rect.setAttribute("stroke-width", "2");
        }

        centerTextInRect(rect, text, tspan || null);

        if (tspan) {
          tspan.textContent = force.count.toString();
        }
      }
    });
  }
}

/**
 * Visualize spice on the map
 */
function visualizeSpice(svgElement: SVGSVGElement, gameState: GameState): void {
  for (const spiceLocation of gameState.spiceOnBoard) {
    if (spiceLocation.amount === 0) continue;

    const spiceSlotId = getSpiceSlotId(spiceLocation.territoryId);
    if (!spiceSlotId) {
      // Some territories might not have spice slots defined
      continue;
    }

    const spiceSlot = svgElement.querySelector(`#${spiceSlotId}`);
    if (spiceSlot) {
      // Show the spice slot
      spiceSlot.setAttribute("display", "block");

      // Find text element to display spice amount
      const text = spiceSlot.querySelector("text");
      const tspan = text?.querySelector("tspan");

      // Color the spice slot background (if it has a rect)
      const rect = spiceSlot.querySelector("rect");
      if (rect && text) {
        setFillColor(rect, constants.SPICE_COLOR, constants.SPICE_OPACITY);
        
        // Center text in the rect using helper function
        centerTextInRect(rect, text, tspan || null);
        
        // Override text color to black for contrast against yellow background
        text.setAttribute("fill", "#000000");
        if (tspan) {
          tspan.setAttribute("fill", "#000000");
          tspan.textContent = spiceLocation.amount.toString();
        }
      } else if (text && tspan) {
        // Fallback if no rect: just set the text content and color
        tspan.textContent = spiceLocation.amount.toString();
        text.setAttribute("fill", "#000000");
        tspan.setAttribute("fill", "#000000");
        text.setAttribute("font-weight", "bold");
        tspan.setAttribute("font-weight", "bold");
      }
    }
  }
}

/**
 * Highlight the active turn indicator segment
 */
function highlightTurnIndicator(svgElement: SVGSVGElement, turnToHighlight: number): void {
  for (let i = 1; i <= 10; i++) {
    const turnGroup = svgElement.querySelector(`#turn-indicator-${i}`);
    const turnText = svgElement.querySelector(`#turn-indicator-text-${i}`);

    if (turnGroup) {
      const path = turnGroup.querySelector("path");
      if (path) {
        if (i === turnToHighlight) {
          path.setAttribute("fill", constants.TURN_HIGHLIGHT_COLOR);
          path.setAttribute("fill-opacity", constants.TURN_HIGHLIGHT_OPACITY);
          path.setAttribute("stroke", constants.TURN_STROKE_COLOR);
          path.setAttribute("stroke-width", "3");
        } else {
          path.setAttribute("fill", "none");
          path.setAttribute("fill-opacity", "1");
          path.setAttribute("stroke", "black");
          path.setAttribute("stroke-width", "2");
        }
      }
    }

    if (turnText) {
      if (i === turnToHighlight) {
        turnText.setAttribute("fill", constants.TURN_TEXT_COLOR);
        turnText.setAttribute("font-weight", "bold");
      } else {
        turnText.setAttribute("fill", "black");
        turnText.setAttribute("font-weight", "bold");
      }
    }
  }
}

/**
 * Highlight the storm sector on the board edge
 */
function highlightStormSector(svgElement: SVGSVGElement, stormSector: number): void {
  // Reset all sectors to default styling first
  for (let i = 0; i < 18; i++) {
    const sectorPath = svgElement.querySelector(`#sector-${i}`);
    if (sectorPath) {
      // Reset to default styling (preserve dash array for non-storm sectors)
      sectorPath.setAttribute("stroke", "black");
      sectorPath.setAttribute("stroke-width", "3");
      sectorPath.setAttribute("stroke-dasharray", "6 6");
      sectorPath.setAttribute("fill", "none");
      sectorPath.setAttribute("fill-opacity", "1");
    }
  }

  // Highlight the storm sector with red border and fill
  const stormSectorPath = svgElement.querySelector(`#sector-${stormSector}`);
  if (stormSectorPath) {
    // Make storm sector very visible: solid red stroke (no dash), thicker, with red fill
    stormSectorPath.setAttribute("stroke", constants.STORM_SECTOR_COLOR);
    stormSectorPath.setAttribute("stroke-width", constants.STORM_SECTOR_STROKE_WIDTH);
    stormSectorPath.removeAttribute("stroke-dasharray"); // Remove dash for solid line
    stormSectorPath.setAttribute("fill", constants.STORM_SECTOR_COLOR);
    stormSectorPath.setAttribute("fill-opacity", constants.STORM_SECTOR_FILL_OPACITY);
  }
}

/**
 * Visualize player token positions by highlighting sectors with faction colors
 * Only highlights sectors (no floating markers)
 */
function visualizePlayerTokenSectors(
  svgElement: SVGSVGElement,
  gameState: GameState,
  stormSector: number
): void {
  if (!gameState.playerPositions || gameState.playerPositions.size === 0) {
    return;
  }

  // Visualize each faction's player token position by highlighting the sector
  gameState.playerPositions.forEach((sector, faction) => {
    const sectorPath = svgElement.querySelector(`#sector-${sector}`);
    if (!sectorPath) return;

    const factionColor = FACTION_COLORS[faction];
    if (!factionColor) return;

    const isStormSector = sector === stormSector;

    if (!isStormSector) {
      // For non-storm sectors, add faction-colored border and subtle fill
      // This makes player tokens clearly visible
      sectorPath.setAttribute("stroke", factionColor);
      sectorPath.setAttribute("stroke-width", constants.PLAYER_TOKEN_STROKE_WIDTH);
      sectorPath.setAttribute("stroke-dasharray", "4 4"); // Dashed to distinguish from storm
      sectorPath.setAttribute("fill", factionColor);
      sectorPath.setAttribute("fill-opacity", constants.PLAYER_TOKEN_FILL_OPACITY);
    }
    // If player token is on the storm sector, the storm highlighting takes priority
    // (storm sector is already highlighted in red by highlightStormSector)
  });
}


