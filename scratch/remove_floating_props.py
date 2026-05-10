
import re

with open('frontend/api-service.js', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if re.match(r'^\s*\.[a-zA-Z0-9_]+;\s*$', line):
        print(f"Removing line: {line.strip()}")
        continue
    new_lines.append(line)

with open('frontend/api-service.js', 'w') as f:
    f.writelines(new_lines)
