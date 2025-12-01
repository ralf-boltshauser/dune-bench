/**
 * Script to add closing </g> tags before parent force slot groups
 * Parent groups:
 * - End with -digit (like -0, -1, -2) but NOT -digit-digit (like -0-1, -1-2)
 * - OR don't end with any digit pattern (like force-slot-polar-sink)
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const filePath = join(process.cwd(), "src/app/game/[id]/components/GameBoard/components/ForceSlots.tsx");
const content = readFileSync(filePath, "utf-8");
const lines = content.split("\n");

const fixedLines: string[] = [];
let isFirstParent = true;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Check if this line opens a group
  const groupMatch = line.match(/^\s*<g id="(force-slot-[^"]+)"\s*>$/);
  if (groupMatch) {
    const groupId = groupMatch[1];
    
    // Check if it's a parent group:
    // 1. Ends with -digit (like -0, -1) but NOT -digit-digit (like -0-1, -1-2)
    // 2. OR doesn't end with any digit pattern (like polar-sink)
    const endsWithDigitDigit = /-[0-9]-[0-9]"$/.test(groupId);
    const endsWithSingleDigit = /-[0-9]"$/.test(groupId);
    const endsWithDigitPattern = /-[0-9]/.test(groupId);
    
    const isParentGroup = (endsWithSingleDigit && !endsWithDigitDigit) || !endsWithDigitPattern;
    
    if (isParentGroup) {
      // This is a parent group
      // Before opening a new parent group (except the first one), close the previous one
      if (!isFirstParent) {
        const prevLine = fixedLines[fixedLines.length - 1];
        // Only add closing tag if previous line is not already a closing tag
        if (!/^\s*<\/g>\s*$/.test(prevLine)) {
          fixedLines.push("      </g>");
        }
      }
      isFirstParent = false;
    }
  }
  
  fixedLines.push(line);
}

// Close the last parent group at the end
const lastLine = fixedLines[fixedLines.length - 1];
if (!/^\s*<\/g>\s*$/.test(lastLine)) {
  fixedLines.push("      </g>");
}

writeFileSync(filePath, fixedLines.join("\n"), "utf-8");
console.log(`Fixed ForceSlots.tsx parent group closing tags. Total lines: ${fixedLines.length}`);

