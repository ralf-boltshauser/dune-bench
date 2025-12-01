/**
 * Script to add closing </g> tags before parent force slot groups
 * Parent groups end with -digit (like -0, -1, -2) but NOT -digit-digit (like -0-1, -1-2)
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const filePath = join(process.cwd(), "src/app/game/[id]/components/GameBoard/components/ForceSlots.tsx");
const content = readFileSync(filePath, "utf-8");
const lines = content.split("\n");

const fixedLines: string[] = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Check if this line opens a parent group
  // Parent groups end with -digit (like -0, -1, -2) but NOT -digit-digit (like -0-1, -1-2)
  const parentGroupMatch = line.match(/^\s*<g id="(force-slot-[^"]+)"\s*>$/);
  if (parentGroupMatch) {
    const groupId = parentGroupMatch[1];
    // Check if it ends with -digit but NOT -digit-digit
    // Pattern: ends with -[0-9] but not -[0-9]-[0-9]
    const endsWithSingleDigit = /-[0-9]"$/.test(groupId);
    const endsWithDoubleDigit = /-[0-9]-[0-9]"$/.test(groupId);
    
    if (endsWithSingleDigit && !endsWithDoubleDigit) {
      // This is a parent group
      // Before opening a new parent group, close the previous one (if any)
      // Check if previous line is not already a closing tag
      const prevLine = i > 0 ? lines[i - 1] : "";
      if (!/^\s*<\/g>\s*$/.test(prevLine)) {
        // Add closing tag before this parent group
        fixedLines.push("      </g>");
      }
    }
  }
  
  fixedLines.push(line);
}

writeFileSync(filePath, fixedLines.join("\n"), "utf-8");
console.log(`Fixed ForceSlots.tsx parent group closing tags. Total lines: ${fixedLines.length}`);

