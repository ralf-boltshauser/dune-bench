/**
 * Improved script to extract SVG sections from GameBoard.tsx into separate components
 * This version properly handles JSX structure
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const gameBoardPath = join(
  process.cwd(),
  "src/app/game/[id]/components/GameBoard/GameBoard.tsx"
);
const content = readFileSync(gameBoardPath, "utf-8");
const lines = content.split("\n");

// Find boundaries
let groupStart = -1;
let groupEnd = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('id="Group 9"') && groupStart === -1) {
    groupStart = i;
  }
  if (lines[i].includes("</g>") && i > groupStart && groupEnd === -1) {
    // Check if this closes Group 9 by counting depth
    let depth = 0;
    for (let j = groupStart; j <= i; j++) {
      if (lines[j].match(/<g[^>]*>/)) depth++;
      if (lines[j].includes("</g>")) depth--;
    }
    if (depth === 0) {
      groupEnd = i;
      break;
    }
  }
}

console.log(`Group boundaries: ${groupStart} to ${groupEnd}`);

// Extract sections by finding start/end of each type
const sections: Record<string, { start: number; end: number }> = {};

// Find sector paths (sector-0 to sector-17)
let sectorStart = -1;
let sectorEnd = -1;
for (let i = groupStart; i < groupEnd; i++) {
  if (lines[i].includes('id="sector-0"')) {
    sectorStart = i;
  }
  if (lines[i].includes('id="sector-17"')) {
    // Find the closing tag for sector-17
    for (let j = i; j < groupEnd; j++) {
      if (lines[j].includes("</path>") && j > i) {
        sectorEnd = j;
        break;
      }
    }
    break;
  }
}
sections.sectors = { start: sectorStart, end: sectorEnd };

// Find territories (paths with territory IDs, not sectors)
let territoryStart = -1;
let territoryEnd = -1;
for (let i = sectorEnd + 1; i < groupEnd; i++) {
  if (lines[i].includes('<path') && lines[i].includes('id="') && !lines[i].includes('sector-')) {
    if (territoryStart === -1) {
      territoryStart = i;
    }
    // Check if this is a territory path (has d= attribute)
    if (lines[i].includes(' d=') || (i + 1 < lines.length && lines[i + 1].includes(' d='))) {
      territoryEnd = i;
    }
  }
  // Stop when we hit spice slots
  if (lines[i].includes('id="spice-')) {
    territoryEnd = i - 1;
    break;
  }
}
sections.territories = { start: territoryStart, end: territoryEnd };

// Find spice slots (first batch)
let spiceStart = -1;
let spiceEnd = -1;
for (let i = territoryEnd + 1; i < groupEnd; i++) {
  if (lines[i].includes('id="spice-')) {
    if (spiceStart === -1) {
      spiceStart = i;
    }
    spiceEnd = i;
  }
  // Stop when we hit force slots
  if (lines[i].includes('id="force-slot-')) {
    // Find the closing tag of the last spice slot
    for (let j = spiceEnd; j < i; j++) {
      if (lines[j].includes("</g>")) {
        spiceEnd = j;
      }
    }
    break;
  }
}
sections.spiceSlots1 = { start: spiceStart, end: spiceEnd };

// Find force slots
let forceStart = -1;
let forceEnd = -1;
for (let i = spiceEnd + 1; i < groupEnd; i++) {
  if (lines[i].includes('id="force-slot-')) {
    if (forceStart === -1) {
      forceStart = i;
    }
    forceEnd = i;
  }
  // Stop when we hit turn indicator or more spice slots
  if (lines[i].includes('id="turn-indicator') || (lines[i].includes('id="spice-') && i > 7000)) {
    // Find the closing tag of the last force slot
    for (let j = forceEnd; j < i; j++) {
      if (lines[j].includes("</g>") && lines[j - 1] && !lines[j - 1].includes("force-slot-")) {
        forceEnd = j;
        break;
      }
    }
    break;
  }
}
sections.forceSlots = { start: forceStart, end: forceEnd };

// Find second batch of spice slots (after force slots)
let spice2Start = -1;
let spice2End = -1;
for (let i = forceEnd + 1; i < groupEnd; i++) {
  if (lines[i].includes('id="spice-')) {
    if (spice2Start === -1) {
      spice2Start = i;
    }
    spice2End = i;
  }
  // Stop when we hit turn indicator
  if (lines[i].includes('id="turn-indicator')) {
    // Find the closing tag of the last spice slot
    for (let j = spice2End; j < i; j++) {
      if (lines[j].includes("</g>")) {
        spice2End = j;
      }
    }
    break;
  }
}
sections.spiceSlots2 = { start: spice2Start, end: spice2End };

// Find turn indicator
let turnStart = -1;
let turnEnd = -1;
for (let i = spice2End + 1; i < groupEnd; i++) {
  if (lines[i].includes('id="turn-indicator')) {
    if (turnStart === -1) {
      turnStart = i - 1; // Include the circle before
    }
  }
  if (lines[i].includes('turn-indicator-text-10')) {
    // Find closing tag
    for (let j = i; j < groupEnd; j++) {
      if (lines[j].includes("</text>") && j > i + 5) {
        turnEnd = j;
        break;
      }
    }
    break;
  }
}
sections.turnIndicator = { start: turnStart, end: turnEnd };

// Find phases
let phaseStart = -1;
let phaseEnd = -1;
for (let i = turnEnd + 1; i < groupEnd; i++) {
  if (lines[i].includes('id="phase-')) {
    if (phaseStart === -1) {
      phaseStart = i;
    }
    phaseEnd = i;
  }
  // Stop when we hit special areas
  if (lines[i].includes('id="tleilaxu-tanks"')) {
    // Find closing tag of last phase
    for (let j = phaseEnd; j < i; j++) {
      if (lines[j].includes("</g>")) {
        phaseEnd = j;
      }
    }
    break;
  }
}
sections.phases = { start: phaseStart, end: phaseEnd };

// Find special areas
let specialStart = -1;
let specialEnd = -1;
for (let i = phaseEnd + 1; i < groupEnd; i++) {
  if (lines[i].includes('id="tleilaxu-tanks"') || lines[i].includes('id="spice-bank"')) {
    if (specialStart === -1) {
      specialStart = i;
    }
    specialEnd = i;
  }
  // Stop when we hit faction token slots
  if (lines[i].includes('id="faction-token-slot-')) {
    // Find closing tag
    for (let j = specialEnd; j < i; j++) {
      if (lines[j].includes("</path>")) {
        specialEnd = j;
      }
    }
    break;
  }
}
sections.specialAreas = { start: specialStart, end: specialEnd };

// Find faction token slots
let factionStart = -1;
let factionEnd = -1;
for (let i = specialEnd + 1; i < groupEnd; i++) {
  if (lines[i].includes('id="faction-token-slot-')) {
    if (factionStart === -1) {
      factionStart = i;
    }
    factionEnd = i;
  }
}
// Find closing tag of last circle
for (let j = factionEnd; j < groupEnd; j++) {
  if (lines[j].includes("</circle>") && j > factionEnd) {
    factionEnd = j;
    break;
  }
}
sections.factionTokenSlots = { start: factionStart, end: factionEnd };

// Print section info
console.log("\nSection boundaries:");
for (const [key, section] of Object.entries(sections)) {
  console.log(`${key}: lines ${section.start}-${section.end}`);
}

// Create components directory
const componentsDir = join(
  process.cwd(),
  "src/app/game/[id]/components/GameBoard/components"
);
try {
  mkdirSync(componentsDir, { recursive: true });
} catch (e) {
  // Directory might already exist
}

// Helper to create component file with proper JSX
function createComponent(
  name: string,
  startLine: number,
  endLine: number,
  description: string
) {
  const content = lines.slice(startLine, endLine + 1);
  const componentContent = `"use client";

import React from "react";

/**
 * ${description}
 * Extracted from GameBoard.tsx (lines ${startLine + 1}-${endLine + 1})
 */
export default function ${name}() {
  return (
    <>
${content.map((line) => `      ${line}`).join("\n")}
    </>
  );
}
`;

  const filePath = join(componentsDir, `${name}.tsx`);
  writeFileSync(filePath, componentContent, "utf-8");
  console.log(`✅ Created ${name}.tsx (${content.length} lines)`);
}

// Create all components
if (sections.sectors.start > 0) {
  createComponent(
    "StormSectors",
    sections.sectors.start,
    sections.sectors.end,
    "Storm sector paths (sector-0 through sector-17)"
  );
}

if (sections.territories.start > 0) {
  createComponent(
    "Territories",
    sections.territories.start,
    sections.territories.end,
    "Territory paths (all game territories)"
  );
}

if (sections.spiceSlots1.start > 0) {
  createComponent(
    "SpiceSlots",
    sections.spiceSlots1.start,
    sections.spiceSlots2.end > 0 ? sections.spiceSlots2.end : sections.spiceSlots1.end,
    "Spice slot groups (spice-*)"
  );
}

if (sections.forceSlots.start > 0) {
  createComponent(
    "ForceSlots",
    sections.forceSlots.start,
    sections.forceSlots.end,
    "Force slot groups (force-slot-*)"
  );
}

if (sections.turnIndicator.start > 0) {
  createComponent(
    "TurnIndicator",
    sections.turnIndicator.start,
    sections.turnIndicator.end,
    "Turn indicator circle and segments"
  );
}

if (sections.phases.start > 0) {
  createComponent(
    "PhaseIndicators",
    sections.phases.start,
    sections.phases.end,
    "Phase indicator circles (phase-*)"
  );
}

if (sections.specialAreas.start > 0) {
  createComponent(
    "SpecialAreas",
    sections.specialAreas.start,
    sections.specialAreas.end,
    "Special game areas (tleilaxu-tanks, spice-bank)"
  );
}

if (sections.factionTokenSlots.start > 0) {
  createComponent(
    "FactionTokenSlots",
    sections.factionTokenSlots.start,
    sections.factionTokenSlots.end,
    "Faction token slot circles"
  );
}

console.log("\n✅ Component extraction complete!");

