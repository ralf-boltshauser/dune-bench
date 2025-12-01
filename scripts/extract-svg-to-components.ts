/**
 * Robust script to extract SVG sections into React components.
 * Can be rerun safely when the SVG is updated.
 *
 * Usage: pnpm exec tsx scripts/extract-svg-to-components.ts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const SVG_PATH = join(process.cwd(), "public/dune-board.svg");
const COMPONENTS_DIR = join(
  process.cwd(),
  "src/app/game/[id]/components/GameBoard/components"
);

// Ensure components directory exists
if (!existsSync(COMPONENTS_DIR)) {
  mkdirSync(COMPONENTS_DIR, { recursive: true });
}

// Convert SVG attributes to JSX camelCase
function convertSvgToJsx(line: string): string {
  let jsx = line;

  // Convert common SVG attributes to JSX camelCase
  const attributeMap: Record<string, string> = {
    "stroke-width": "strokeWidth",
    "stroke-dasharray": "strokeDasharray",
    "xml:space": "xmlSpace",
    "font-family": "fontFamily",
    "font-size": "fontSize",
    "font-weight": "fontWeight",
    "letter-spacing": "letterSpacing",
  };

  for (const [svgAttr, jsxAttr] of Object.entries(attributeMap)) {
    // Match attribute with quotes (single or double)
    const regex = new RegExp(`${svgAttr}=(["'])`, "g");
    jsx = jsx.replace(regex, `${jsxAttr}=$1`);
  }

  return jsx;
}

// Extract lines between start and end patterns
function extractSection(
  lines: string[],
  startPattern: RegExp,
  endPattern: RegExp
): string[] {
  let startIdx = -1;
  let endIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (startIdx === -1 && startPattern.test(lines[i])) {
      startIdx = i;
    }
    if (startIdx !== -1 && endPattern.test(lines[i])) {
      endIdx = i + 1; // Include the end line
      break;
    }
  }

  if (startIdx === -1) {
    throw new Error(`Start pattern not found: ${startPattern}`);
  }
  if (endIdx === -1) {
    // If no end pattern found, go to end of file
    endIdx = lines.length;
  }

  return lines.slice(startIdx, endIdx);
}

// Extract all matching elements (for scattered sections like spice slots)
function extractAllMatching(
  lines: string[],
  startPattern: RegExp,
  endPattern: RegExp,
  trackNesting: boolean = false
): string[] {
  const result: string[] = [];
  let inSection = false;
  let currentSection: string[] = [];
  let nestingDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (startPattern.test(line)) {
      if (inSection) {
        // Close previous section
        result.push(...currentSection);
      }
      inSection = true;
      currentSection = [line];

      if (trackNesting) {
        // Count opening <g> tags on the initial matching line
        const openGMatches = (line.match(/<g[^>]*>/g) || []).length;
        nestingDepth = openGMatches; // Start with count of opening tags on this line
      }
    } else if (inSection) {
      currentSection.push(line);

      if (trackNesting) {
        // Track nesting depth for nested groups
        // Count opening <g> tags (not self-closing)
        const openGMatches = (line.match(/<g[^>]*>/g) || []).length;
        if (openGMatches > 0) {
          nestingDepth += openGMatches;
        }
        // Count closing </g> tags
        const closeGMatches = (line.match(/<\/g>/g) || []).length;
        if (closeGMatches > 0) {
          nestingDepth -= closeGMatches;
          // Only close section when we return to depth 0 (parent group closed)
          if (nestingDepth === 0) {
            result.push(...currentSection);
            currentSection = [];
            inSection = false;
          }
        }
      } else {
        // Simple matching without nesting tracking
        if (endPattern.test(line)) {
          result.push(...currentSection);
          currentSection = [];
          inSection = false;
        }
      }
    }
  }

  // Add any remaining section
  if (inSection && currentSection.length > 0) {
    result.push(...currentSection);
  }

  return result;
}

// Create a React component file
function createComponent(
  name: string,
  content: string[],
  description: string
): void {
  const jsxLines = content
    .map((line) => {
      if (!line.trim()) return "";
      const converted = convertSvgToJsx(line);
      // Preserve indentation but ensure it's at least 6 spaces for JSX
      const trimmed = converted.trim();
      if (!trimmed) return "";
      return `      ${trimmed}`;
    })
    .filter((line) => line.trim() !== "");

  const component = `"use client";

import React from "react";

/**
 * ${description}
 * Extracted from dune-board.svg
 * Auto-generated - do not edit manually. Run scripts/extract-svg-to-components.ts to regenerate.
 */
export default function ${name}() {
  return (
    <>
${jsxLines.join("\n")}
    </>
  );
}
`;

  const filePath = join(COMPONENTS_DIR, `${name}.tsx`);
  writeFileSync(filePath, component, "utf-8");
  console.log(`✅ Created ${name}.tsx (${jsxLines.length} lines)`);
}

// Main extraction logic
function main() {
  console.log("📖 Reading SVG file...");
  const svgContent = readFileSync(SVG_PATH, "utf-8");
  const svgLines = svgContent.split("\n");

  console.log(`📊 SVG file has ${svgLines.length} lines\n`);

  try {
    // 1. Storm Sectors (sector-0 through sector-17)
    console.log("🌪️  Extracting storm sectors...");
    const stormSectors = extractSection(
      svgLines,
      /id="sector-0"/,
      /id="sector-17".*\/>/
    );
    createComponent(
      "StormSectors",
      stormSectors,
      "Storm sector paths (sector-0 through sector-17)"
    );

    // 2. Territories (all path elements with territory IDs, before first spice slot)
    console.log("🗺️  Extracting territories...");
    // Find the last territory path (broken-land) and stop before the first spice slot
    let territoryEndIdx = -1;
    for (let i = 0; i < svgLines.length; i++) {
      if (/id="broken-land"/.test(svgLines[i])) {
        // Find the closing tag of this path
        for (let j = i; j < svgLines.length; j++) {
          if (svgLines[j].includes("/>") || svgLines[j].includes("</path>")) {
            territoryEndIdx = j + 1;
            break;
          }
        }
        break;
      }
    }

    let territoryStartIdx = -1;
    for (let i = 0; i < svgLines.length; i++) {
      if (/id="plastic-basin"/.test(svgLines[i])) {
        territoryStartIdx = i;
        break;
      }
    }

    if (territoryStartIdx === -1 || territoryEndIdx === -1) {
      throw new Error("Could not find territory boundaries");
    }

    const territories = svgLines.slice(territoryStartIdx, territoryEndIdx);
    createComponent(
      "Territories",
      territories,
      "Territory paths (all game territories)"
    );

    // 3. Spice Slots (all groups with id="spice-*")
    console.log("💎 Extracting spice slots...");
    const spiceSlots = extractAllMatching(svgLines, /<g id="spice-/, /<\/g>/);
    createComponent("SpiceSlots", spiceSlots, "Spice slot groups (spice-*)");

    // 4. Force Slots (all groups with id="force-slot-*")
    console.log("⚔️  Extracting force slots...");
    const forceSlots = extractAllMatching(
      svgLines,
      /<g id="force-slot-/,
      /<\/g>/,
      true // Track nesting depth to include parent group closing tag
    );
    createComponent(
      "ForceSlots",
      forceSlots,
      "Force slot groups (force-slot-*)"
    );

    // 5. Turn Indicator (circle and segments)
    console.log("🔄 Extracting turn indicator...");
    const turnIndicator = extractSection(
      svgLines,
      /id="turn-indicator"/,
      /id="turn-indicator-text-10".*<\/text>/
    );
    createComponent(
      "TurnIndicator",
      turnIndicator,
      "Turn indicator circle and segments"
    );

    // 6. Phase Indicators (all groups with id="phase-*")
    console.log("📋 Extracting phase indicators...");
    const phaseIndicators = extractAllMatching(
      svgLines,
      /<g id="phase-/,
      /<\/g>/
    );
    createComponent(
      "PhaseIndicators",
      phaseIndicators,
      "Phase indicator circles (phase-*)"
    );

    // 7. Special Areas (tleilaxu-tanks and spice-bank)
    console.log("🏛️  Extracting special areas...");
    const specialAreas = extractSection(
      svgLines,
      /id="tleilaxu-tanks"/,
      /id="spice-bank".*\/>/
    );
    createComponent(
      "SpecialAreas",
      specialAreas,
      "Special game areas (tleilaxu-tanks, spice-bank)"
    );

    // 8. Faction Token Slots (all circles with id="faction-token-slot-*")
    console.log("🎯 Extracting faction token slots...");
    const factionTokenSlots = extractAllMatching(
      svgLines,
      /<circle id="faction-token-slot-/,
      /\/>/
    );
    createComponent(
      "FactionTokenSlots",
      factionTokenSlots,
      "Faction token slot circles"
    );

    console.log("\n✅ All components extracted successfully!");
    console.log(
      "\n💡 Tip: Run this script again after updating dune-board.svg"
    );
  } catch (error) {
    console.error("❌ Error:", error);
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}

main();
