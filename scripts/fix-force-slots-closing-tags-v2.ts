/**
 * Script to add missing closing </g> tags for parent force slot groups
 * Parent groups are those that don't end with -1, -2, -3, or -4
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const filePath = join(process.cwd(), "src/app/game/[id]/components/GameBoard/components/ForceSlots.tsx");
const content = readFileSync(filePath, "utf-8");
const lines = content.split("\n");

const fixedLines: string[] = [];
let i = 0;
let currentParentGroup: number | null = null;

while (i < lines.length) {
  const line = lines[i];
  
  // Check if this line opens a parent group (doesn't end with -1, -2, -3, -4)
  const parentGroupMatch = line.match(/^\s*<g id="(force-slot-[^"]+)"\s*>$/);
  if (parentGroupMatch && !parentGroupMatch[1].match(/-\d+$/)) {
    // This is a parent group opening
    // If we had a previous parent group, close it before starting a new one
    if (currentParentGroup !== null) {
      fixedLines.push("      </g>");
    }
    currentParentGroup = i;
    fixedLines.push(line);
    i++;
    continue;
  }
  
  // Check if this line closes a child group (ends with -1, -2, -3, or -4)
  const isChildClosing = /^\s*<\/g>\s*$/.test(line);
  const prevLine = i > 0 ? lines[i - 1] : "";
  const isChildGroup = prevLine.match(/force-slot-[^"]+-\d+["']>/);
  
  if (isChildClosing && isChildGroup) {
    fixedLines.push(line);
    // Check if next line starts a new parent group
    const nextLine = lines[i + 1];
    if (nextLine && nextLine.match(/^\s*<g id="force-slot-[^"]+"\s*>$/) && 
        !nextLine.match(/force-slot-[^"]+-\d+["']>/)) {
      // Next line is a new parent group, close current parent
      if (currentParentGroup !== null) {
        fixedLines.push("      </g>");
        currentParentGroup = null;
      }
    }
    i++;
    continue;
  }
  
  fixedLines.push(line);
  i++;
}

// Close the last parent group if needed
if (currentParentGroup !== null) {
  // Check if it's already closed at the end
  const lastFewLines = fixedLines.slice(-5);
  const hasClosing = lastFewLines.some(l => /^\s*<\/g>\s*$/.test(l));
  if (!hasClosing) {
    fixedLines.push("      </g>");
  }
}

writeFileSync(filePath, fixedLines.join("\n"), "utf-8");
console.log(`Fixed ForceSlots.tsx closing tags. Total lines: ${fixedLines.length}`);

