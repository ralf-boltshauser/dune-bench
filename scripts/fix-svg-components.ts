/**
 * Script to fix SVG components by converting SVG attributes to JSX format
 * and properly extracting content from dune-board.svg
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const svgPath = join(process.cwd(), "public/dune-board.svg");
const svgContent = readFileSync(svgPath, "utf-8");
const svgLines = svgContent.split("\n");

// Convert SVG attribute to JSX attribute
function svgToJsxAttribute(attr: string): string {
  // Convert kebab-case to camelCase
  return attr.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Convert a single SVG line to JSX format
function convertSvgLineToJsx(line: string, indent: string = "      "): string {
  // Skip empty lines
  if (!line.trim()) return "";

  // Convert attributes
  let jsxLine = line;

  // Convert common SVG attributes to JSX
  jsxLine = jsxLine.replace(/stroke-width=/g, "strokeWidth=");
  jsxLine = jsxLine.replace(/stroke-dasharray=/g, "strokeDasharray=");
  jsxLine = jsxLine.replace(/xml:space=/g, "xmlSpace=");
  jsxLine = jsxLine.replace(/font-family=/g, "fontFamily=");
  jsxLine = jsxLine.replace(/font-size=/g, "fontSize=");
  jsxLine = jsxLine.replace(/font-weight=/g, "fontWeight=");
  jsxLine = jsxLine.replace(/letter-spacing=/g, "letterSpacing=");

  // Add proper indentation
  if (jsxLine.trim().startsWith("<")) {
    return indent + jsxLine.trim();
  }

  return indent + jsxLine;
}

// Extract territories (lines 22-64 from SVG)
const territoryStart = 22;
const territoryEnd = 64;
const territoryLines = svgLines.slice(territoryStart - 1, territoryEnd);

// Convert to JSX format
const jsxTerritories = territoryLines
  .map((line) => convertSvgLineToJsx(line))
  .filter((line) => line.trim() !== "");

// Create Territories component
const territoriesComponent = `"use client";

import React from "react";

/**
 * Territory paths (all game territories)
 * Extracted from dune-board.svg (lines ${territoryStart}-${territoryEnd})
 */
export default function Territories() {
  return (
    <>
${jsxTerritories.join("\n")}
    </>
  );
}
`;

const territoriesPath = join(
  process.cwd(),
  "src/app/game/[id]/components/GameBoard/components/Territories.tsx"
);
writeFileSync(territoriesPath, territoriesComponent, "utf-8");
console.log(`✅ Created Territories.tsx with ${jsxTerritories.length} lines`);
