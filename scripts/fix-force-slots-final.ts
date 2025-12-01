/**
 * Script to add closing </g> tags before parent force slot groups
 * Parent groups: end with -{digit} (like -0, -1, -2) but NOT -{digit}-{digit} (like -0-1, -1-2)
 * Before each parent group (except the first), add </g>
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const filePath = join(process.cwd(), "src/app/game/[id]/components/GameBoard/components/ForceSlots.tsx");
const content = readFileSync(filePath, "utf-8");
const lines = content.split("\n");

const fixedLines: string[] = [];
let isFirstParentGroup = true;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Check if this line opens a group
  const groupMatch = line.match(/^\s*<g id="(force-slot-[^"]+)"\s*>$/);
  if (groupMatch) {
    const groupId = groupMatch[1];
    
    // Parent groups end with -{digit} but NOT -{digit}-{digit}
    // Pattern: ends with -[0-9]" but NOT -[0-9]-[0-9]"
    const endsWithDigitDigit = /-[0-9]-[0-9]"$/.test(groupId);
    const endsWithSingleDigit = /-[0-9]"$/.test(groupId);
    
    const isParentGroup = endsWithSingleDigit && !endsWithDigitDigit;
    
    if (isParentGroup) {
      // This is a parent group
      // Before opening a new parent group (except the first one), close the previous one
      if (!isFirstParentGroup) {
        const prevLine = fixedLines[fixedLines.length - 1];
        // Only add closing tag if previous line is not already a closing tag
        if (!/^\s*<\/g>\s*$/.test(prevLine)) {
          fixedLines.push("      </g>");
        }
      }
      isFirstParentGroup = false;
    }
  }
  
  fixedLines.push(line);
}

writeFileSync(filePath, fixedLines.join("\n"), "utf-8");
console.log(`Fixed ForceSlots.tsx parent group closing tags. Total lines: ${fixedLines.length}`);

