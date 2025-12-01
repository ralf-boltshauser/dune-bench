/**
 * Comprehensive script to fix all SVG components:
 * 1. Extract correct content from dune-board.svg
 * 2. Convert SVG attributes to JSX format
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const svgPath = join(process.cwd(), "public/dune-board.svg");
const svgContent = readFileSync(svgPath, "utf-8");
const svgLines = svgContent.split("\n");

// Convert SVG attributes to JSX
function convertSvgToJsx(line: string): string {
  let jsx = line;
  
  // Convert common SVG attributes to JSX camelCase
  jsx = jsx.replace(/stroke-width=/g, "strokeWidth=");
  jsx = jsx.replace(/stroke-dasharray=/g, "strokeDasharray=");
  jsx = jsx.replace(/xml:space=/g, "xmlSpace=");
  jsx = jsx.replace(/font-family=/g, "fontFamily=");
  jsx = jsx.replace(/font-size=/g, "fontSize=");
  jsx = jsx.replace(/font-weight=/g, "fontWeight=");
  jsx = jsx.replace(/letter-spacing=/g, "letterSpacing=");
  
  return jsx;
}

// Extract and create component
function createComponent(
  name: string,
  startLine: number,
  endLine: number,
  description: string
) {
  const lines = svgLines.slice(startLine - 1, endLine);
  const jsxLines = lines
    .map((line) => {
      if (!line.trim()) return "";
      const converted = convertSvgToJsx(line);
      return `      ${converted.trim()}`;
    })
    .filter((line) => line.trim() !== "");

  const component = `"use client";

import React from "react";

/**
 * ${description}
 * Extracted from dune-board.svg (lines ${startLine}-${endLine})
 */
export default function ${name}() {
  return (
    <>
${jsxLines.join("\n")}
    </>
  );
}
`;

  const filePath = join(
    process.cwd(),
    "src/app/game/[id]/components/GameBoard/components",
    `${name}.tsx`
  );
  writeFileSync(filePath, component, "utf-8");
  console.log(`✅ Created ${name}.tsx (${jsxLines.length} lines)`);
}

// Extract sectors (lines 4-21 from SVG - sector-0 to sector-17)
createComponent(
  "StormSectors",
  4,
  21,
  "Storm sector paths (sector-0 through sector-17)"
);

// Territories already fixed, skip

// Extract spice slots (first batch: lines 65-70, then find all spice-* groups)
// Actually, let's find the range dynamically
let spiceStart = -1;
let spiceEnd = -1;
let forceStart = -1;

for (let i = 0; i < svgLines.length; i++) {
  if (svgLines[i].includes('id="spice-') && spiceStart === -1) {
    spiceStart = i + 1;
  }
  if (svgLines[i].includes('id="force-slot-') && forceStart === -1) {
    // Find the closing tag of the last spice slot before force slots
    for (let j = i - 1; j >= 0; j--) {
      if (svgLines[j].includes("</g>")) {
        spiceEnd = j + 1;
        break;
      }
    }
    forceStart = i + 1;
    break;
  }
}

// Find second batch of spice slots (after force slots)
let spice2Start = -1;
let spice2End = -1;
let turnStart = -1;

for (let i = forceStart; i < svgLines.length; i++) {
  if (svgLines[i].includes('id="spice-') && spice2Start === -1) {
    spice2Start = i + 1;
  }
  if (svgLines[i].includes('id="turn-indicator')) {
    // Find closing tag of last spice slot
    for (let j = i - 1; j >= spice2Start; j--) {
      if (svgLines[j].includes("</g>")) {
        spice2End = j + 1;
        break;
      }
    }
    turnStart = i;
    break;
  }
}

// Find force slots end
let forceEnd = -1;
if (spice2Start > 0) {
  for (let i = spice2Start - 2; i >= forceStart; i--) {
    if (svgLines[i].includes("</g>") && !svgLines[i - 1]?.includes("force-slot-")) {
      forceEnd = i + 1;
      break;
    }
  }
} else {
  forceEnd = turnStart - 1;
}

// Find turn indicator end
let turnEnd = -1;
let phaseStart = -1;
for (let i = turnStart; i < svgLines.length; i++) {
  if (svgLines[i].includes('id="phase-')) {
    // Find closing tag of last turn indicator text
    for (let j = i - 1; j >= turnStart; j--) {
      if (svgLines[j].includes("</text>") && j > turnStart + 10) {
        turnEnd = j + 1;
        break;
      }
    }
    phaseStart = i + 1;
    break;
  }
}

// Find phases end
let phaseEnd = -1;
let specialStart = -1;
for (let i = phaseStart; i < svgLines.length; i++) {
  if (svgLines[i].includes('id="tleilaxu-tanks"')) {
    // Find closing tag of last phase
    for (let j = i - 1; j >= phaseStart; j--) {
      if (svgLines[j].includes("</g>")) {
        phaseEnd = j + 1;
        break;
      }
    }
    specialStart = i + 1;
    break;
  }
}

// Find special areas end
let specialEnd = -1;
let factionStart = -1;
for (let i = specialStart; i < svgLines.length; i++) {
  if (svgLines[i].includes('id="spice-bank"')) {
    // Find closing tag
    for (let j = i; j < svgLines.length; j++) {
      if (svgLines[j].includes("</path>") && j > i) {
        specialEnd = j + 1;
        break;
      }
    }
  }
  if (svgLines[i].includes('id="faction-token-slot-')) {
    factionStart = i + 1;
    break;
  }
}

// Find faction token slots end
let factionEnd = -1;
for (let i = factionStart; i < svgLines.length; i++) {
  if (svgLines[i].includes("</circle>") && i > factionStart) {
    factionEnd = i + 1;
    break;
  }
}

console.log("\nSection boundaries:");
console.log(`Sectors: ${4}-${21}`);
console.log(`Territories: ${22}-${64}`);
console.log(`Spice slots (1): ${spiceStart}-${spiceEnd}`);
console.log(`Force slots: ${forceStart}-${forceEnd}`);
console.log(`Spice slots (2): ${spice2Start}-${spice2End}`);
console.log(`Turn indicator: ${turnStart}-${turnEnd}`);
console.log(`Phases: ${phaseStart}-${phaseEnd}`);
console.log(`Special areas: ${specialStart}-${specialEnd}`);
console.log(`Faction tokens: ${factionStart}-${factionEnd}`);

// Create all components
if (spiceStart > 0 && spiceEnd > 0) {
  // Combine both spice slot batches
  const allSpiceLines = [
    ...svgLines.slice(spiceStart - 1, spiceEnd),
    ...svgLines.slice(spice2Start - 1, spice2End),
  ];
  const jsxLines = allSpiceLines
    .map((line) => {
      if (!line.trim()) return "";
      const converted = convertSvgToJsx(line);
      return `      ${converted.trim()}`;
    })
    .filter((line) => line.trim() !== "");

  const component = `"use client";

import React from "react";

/**
 * Spice slot groups (spice-*)
 * Extracted from dune-board.svg
 */
export default function SpiceSlots() {
  return (
    <>
${jsxLines.join("\n")}
    </>
  );
}
`;

  const filePath = join(
    process.cwd(),
    "src/app/game/[id]/components/GameBoard/components",
    "SpiceSlots.tsx"
  );
  writeFileSync(filePath, component, "utf-8");
  console.log(`✅ Created SpiceSlots.tsx (${jsxLines.length} lines)`);
}

if (forceStart > 0 && forceEnd > 0) {
  createComponent(
    "ForceSlots",
    forceStart,
    forceEnd,
    "Force slot groups (force-slot-*)"
  );
}

if (turnStart > 0 && turnEnd > 0) {
  createComponent(
    "TurnIndicator",
    turnStart,
    turnEnd,
    "Turn indicator circle and segments"
  );
}

if (phaseStart > 0 && phaseEnd > 0) {
  createComponent(
    "PhaseIndicators",
    phaseStart,
    phaseEnd,
    "Phase indicator circles (phase-*)"
  );
}

if (specialStart > 0 && specialEnd > 0) {
  createComponent(
    "SpecialAreas",
    specialStart,
    specialEnd,
    "Special game areas (tleilaxu-tanks, spice-bank)"
  );
}

if (factionStart > 0 && factionEnd > 0) {
  createComponent(
    "FactionTokenSlots",
    factionStart,
    factionEnd,
    "Faction token slot circles"
  );
}

console.log("\n✅ All components fixed!");

