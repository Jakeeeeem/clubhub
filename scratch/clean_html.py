
import re
import os
import glob

def clean_html(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Remove auto-enable demo scripts
    content = re.sub(r'<script>\s*// Head-level demo auto-enable.*?<\/script>', '', content, flags=re.DOTALL)
    
    # 2. Remove isDemoSession blocks in JS
    # Pattern: if (.*isDemoSession.*) { ... }
    # This is tricky with nested braces, but most are simple.
    
    # Remove specific teams fallback pattern that I messed up
    content = re.sub(r'if\s*\(\(!teamsToRender\s*\|\|\s*teamsToRender\.length\s*===\s*0\)\s*&&\s*localStorage\.getItem\(\'isDemoSession\'\)\s*===\s*\'true\'\)\s*\{[^}]+\}', '', content)
    
    # Remove any line containing isDemoSession and its block if it's a simple one
    # e.g. if (localStorage.getItem('isDemoSession') === 'true') { ... }
    content = re.sub(r'if\s*\(localStorage\.getItem\(\'isDemoSession\'\)\s*===\s*\'true\'\)\s*\{[^}]+\}', '', content)
    
    # Clean up the broken comma/brackets I left behind
    content = re.sub(r',\s*\];\s*\}', '', content)
    
    # 3. Remove isDemoSession checks in conditions
    content = content.replace("&& localStorage.getItem('isDemoSession') === 'true'", "")
    content = content.replace("|| localStorage.getItem('isDemoSession') === 'true'", "")
    
    # 4. Remove player dashboard checks
    content = re.sub(r'if\s*\(\(localStorage\.getItem\(\'isDemoSession\'\)\s*!==\s*\'true\'\)\s*&&\s*\(!token\s*\|\|\s*!currentUser\)\)\s*\{', 'if (!token || !currentUser) {', content)

    with open(filepath, 'w') as f:
        f.write(content)

for html_file in glob.glob('frontend/*.html'):
    print(f"Cleaning {html_file}...")
    clean_html(html_file)
