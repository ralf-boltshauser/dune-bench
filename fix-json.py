import json
import re

# Read the corrupted file
with open("src/lib/game/rules/index/rule-exclusions.json", "r") as f:
    content = f.read()

# Remove all double commas
content = content.replace(",,", ",")

# Remove trailing commas before closing braces/brackets
content = re.sub(r",\s*}", "}", content)
content = re.sub(r",\s*]", "]", content)

# Fix the ending - remove the extra braces and fix structure
content = re.sub(r'\{\s*\}\s*\{\s*\}', '', content)
# Remove trailing comma after last entry if present
content = re.sub(r',\s*\]', ']', content)

# Try to parse and reformat
try:
    data = json.loads(content)
    with open("src/lib/game/rules/index/rule-exclusions.json", "w") as f:
        json.dump(data, f, indent=2)
    print("Fixed JSON successfully")
except json.JSONDecodeError as e:
    print(f"Still has errors: {e}")
    print(f"Error at position: {e.pos}")
    # Show context around error
    start = max(0, e.pos - 50)
    end = min(len(content), e.pos + 50)
    print(f"Context: {content[start:end]}")



