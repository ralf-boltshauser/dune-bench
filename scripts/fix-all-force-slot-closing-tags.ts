/**
 * Comprehensive script to add all missing closing </g> tags for parent force slot groups
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const filePath = join(process.cwd(), "src/app/game/[id]/components/GameBoard/components/ForceSlots.tsx");
const content = readFileSync(filePath, "utf-8");
const lines = content.split("\n");

const fixedLines: string[] = [];
const parentGroupStack: Array<{ lineNum: number; id: string }> = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Check if this line opens a group
  const groupMatch = line.match(/^\s*<g id="(force-slot-[^"]+)"\s*>$/);
  if (groupMatch) {
    const groupId = groupMatch[1];
    const isParentGroup = !groupId.match(/-\d+$/); // Parent groups don't end with -1, -2, -3, -4
    
    if (isParentGroup) {
      // This is a parent group - push to stack
      parentGroupStack.push({ lineNum: i, id: groupId });
      fixedLines.push(line);
      continue;
    } else {
      // This is a child group - just add it
      fixedLines.push(line);
      continue;
    }
  }
  
  // Check if this line closes a group
  if (/^\s*<\/g>\s*$/.test(line)) {
    fixedLines.push(line);
    
    // Check if the next line starts a new parent group
    const nextLine = lines[i + 1];
    if (nextLine) {
      const nextGroupMatch = nextLine.match(/^\s*<g id="(force-slot-[^"]+)"\s*>$/);
      if (nextGroupMatch) {
        const nextGroupId = nextGroupMatch[1];
        const isNextParentGroup = !nextGroupId.match(/-\d+$/);
        
        // If next is a parent group and we have an open parent group, close it
        if (isNextParentGroup && parentGroupStack.length > 0) {
          fixedLines.push("      </g>");
          parentGroupStack.pop();
        }
      }
    }
    continue;
  }
  
  fixedLines.push(line);
}

// Close any remaining open parent groups
while (parentGroupStack.length > 0) {
  fixedLines.push("      </g>");
  parentGroupStack.pop();
}

writeFileSync(filePath, fixedLines.join("\n"), "utf-8");
console.log(`Fixed ForceSlots.tsx closing tags. Total lines: ${fixedLines.length}, Closed ${parentGroupStack.length} parent groups`);

