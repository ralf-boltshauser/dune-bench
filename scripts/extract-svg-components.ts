/**
 * Script to extract SVG sections from GameBoard.tsx into separate components
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const gameBoardPath = join(
  process.cwd(),
  "src/app/game/[id]/components/GameBoard/GameBoard.tsx"
);
const content = readFileSync(gameBoardPath, "utf-8");

// Extract sections based on patterns
const lines = content.split("\n");

// Find the SVG content boundaries
let svgStart = -1;
let svgEnd = -1;
let groupStart = -1;
let groupEnd = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<svg') && svgStart === -1) {
    svgStart = i;
  }
  if (lines[i].includes('id="Group 9"') && groupStart === -1) {
    groupStart = i;
  }
  if (lines[i].includes("</g>") && i > groupStart && groupEnd === -1) {
    // Check if this is the closing tag for Group 9
    let depth = 0;
    for (let j = groupStart; j <= i; j++) {
      if (lines[j].includes("<g")) depth++;
      if (lines[j].includes("</g>")) depth--;
    }
    if (depth === 0) {
      groupEnd = i;
    }
  }
  if (lines[i].includes("</svg>") && svgEnd === -1) {
    svgEnd = i;
  }
}

console.log(`SVG boundaries: ${svgStart} to ${svgEnd}`);
console.log(`Group boundaries: ${groupStart} to ${groupEnd}`);

// Extract sections
const sections: Record<string, { start: number; end: number; content: string[] }> = {};

let currentSection: string | null = null;
const sectionStart = -1;

for (let i = groupStart; i < groupEnd; i++) {
  const line = lines[i];
  
  // Detect section starts
  if (line.includes('id="sector-')) {
    if (currentSection && currentSection !== "sectors") {
      sections[currentSection].end = i - 1;
    }
    currentSection = "sectors";
    if (!sections[currentSection]) {
      sections[currentSection] = { start: i, end: -1, content: [] };
    }
  } else if (line.includes('id="') && line.includes(' d=') && !line.includes('sector-')) {
    // Territory path
    if (currentSection && currentSection !== "territories") {
      sections[currentSection].end = i - 1;
    }
    currentSection = "territories";
    if (!sections[currentSection]) {
      sections[currentSection] = { start: i, end: -1, content: [] };
    }
  } else if (line.includes('id="spice-')) {
    if (currentSection && currentSection !== "spiceSlots") {
      sections[currentSection].end = i - 1;
    }
    currentSection = "spiceSlots";
    if (!sections[currentSection]) {
      sections[currentSection] = { start: i, end: -1, content: [] };
    }
  } else if (line.includes('id="force-slot-')) {
    if (currentSection && currentSection !== "forceSlots") {
      sections[currentSection].end = i - 1;
    }
    currentSection = "forceSlots";
    if (!sections[currentSection]) {
      sections[currentSection] = { start: i, end: -1, content: [] };
    }
  } else if (line.includes('id="turn-indicator')) {
    if (currentSection && currentSection !== "turnIndicator") {
      sections[currentSection].end = i - 1;
    }
    currentSection = "turnIndicator";
    if (!sections[currentSection]) {
      sections[currentSection] = { start: i, end: -1, content: [] };
    }
  } else if (line.includes('id="phase-')) {
    if (currentSection && currentSection !== "phases") {
      sections[currentSection].end = i - 1;
    }
    currentSection = "phases";
    if (!sections[currentSection]) {
      sections[currentSection] = { start: i, end: -1, content: [] };
    }
  } else if (line.includes('id="tleilaxu-tanks"') || line.includes('id="spice-bank"')) {
    if (currentSection && currentSection !== "specialAreas") {
      sections[currentSection].end = i - 1;
    }
    currentSection = "specialAreas";
    if (!sections[currentSection]) {
      sections[currentSection] = { start: i, end: -1, content: [] };
    }
  } else if (line.includes('id="faction-token-slot-')) {
    if (currentSection && currentSection !== "factionTokenSlots") {
      sections[currentSection].end = i - 1;
    }
    currentSection = "factionTokenSlots";
    if (!sections[currentSection]) {
      sections[currentSection] = { start: i, end: -1, content: [] };
    }
  }
}

// Close last section
if (currentSection) {
  sections[currentSection].end = groupEnd;
}

// Extract content for each section
for (const [key, section] of Object.entries(sections)) {
  section.content = lines.slice(section.start, section.end + 1);
  console.log(`${key}: lines ${section.start}-${section.end} (${section.content.length} lines)`);
}

// Write component files
const componentsDir = join(
  process.cwd(),
  "src/app/game/[id]/components/GameBoard/components"
);

// Create components directory
import { mkdirSync } from "fs";
try {
  mkdirSync(componentsDir, { recursive: true });
} catch (e) {
  // Directory might already exist
}

// Helper to create component file
function createComponent(name: string, content: string[], description: string) {
  const componentContent = `"use client";

import React from "react";

/**
 * ${description}
 * Extracted from GameBoard.tsx
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
  console.log(`Created ${filePath}`);
}

// Create components
if (sections.sectors) {
  createComponent(
    "StormSectors",
    sections.sectors.content,
    "Storm sector paths (sector-0 through sector-17)"
  );
}

if (sections.territories) {
  createComponent(
    "Territories",
    sections.territories.content,
    "Territory paths (all game territories)"
  );
}

if (sections.spiceSlots) {
  createComponent(
    "SpiceSlots",
    sections.spiceSlots.content,
    "Spice slot groups (spice-*)"
  );
}

if (sections.forceSlots) {
  createComponent(
    "ForceSlots",
    sections.forceSlots.content,
    "Force slot groups (force-slot-*)"
  );
}

if (sections.turnIndicator) {
  createComponent(
    "TurnIndicator",
    sections.turnIndicator.content,
    "Turn indicator circle and segments"
  );
}

if (sections.phases) {
  createComponent(
    "PhaseIndicators",
    sections.phases.content,
    "Phase indicator circles (phase-*)"
  );
}

if (sections.specialAreas) {
  createComponent(
    "SpecialAreas",
    sections.specialAreas.content,
    "Special game areas (tleilaxu-tanks, spice-bank)"
  );
}

if (sections.factionTokenSlots) {
  createComponent(
    "FactionTokenSlots",
    sections.factionTokenSlots.content,
    "Faction token slot circles"
  );
}

console.log("\n✅ Component extraction complete!");

