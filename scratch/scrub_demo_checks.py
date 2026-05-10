
import os
import re

files_to_scrub = [
    'frontend/unified-nav.js',
    'frontend/script.js',
    'frontend/enhanced-login-handler.js',
    'frontend/group-switcher.js',
    'frontend/index.html',
    'frontend/tournament-manager.html'
]

for filepath in files_to_scrub:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Replace the demo check with literal false
    new_content = content.replace("localStorage.getItem('isDemoSession') === 'true'", "false")
    new_content = new_content.replace('localStorage.getItem("isDemoSession") === "true"', "false")
    new_content = new_content.replace('localStorage.getItem("isDemoSession") === \'true\'', "false")
    
    # Also handle inequity checks
    new_content = new_content.replace("localStorage.getItem('isDemoSession') !== 'true'", "true")
    new_content = new_content.replace('localStorage.getItem("isDemoSession") !== "true"', "true")
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Scrubbed {filepath}")

