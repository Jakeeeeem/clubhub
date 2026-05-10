
import re

with open('frontend/api-service.js', 'r') as f:
    content = f.read()

# 1. Replace fallback calls with empty data objects
content = re.sub(r'return\s+this\.getAdminDashboardFallback\(\);?', 'return { groups: [], feed: [], messages: [], players: [], events: [], teams: [] };', content)
content = re.sub(r'return\s+this\.getPlayerDashboardFallback\(\);?', 'return { player: null, attendance: null, clubs: [], teams: [], events: [], payments: [], bookings: [], applications: [], invitations: [], statistics: {} };', content)
content = re.sub(r'return\s+this\.getCoachDashboardFallback\(\);?', 'return { clubs: [], players: [], staff: [], events: [], teams: [], stats: {} };', content)

# 2. Replace any remaining getAdminDashboardFallback calls that are not returns
content = re.sub(r'this\.getAdminDashboardFallback\(\)', '{ groups: [], feed: [], messages: [], players: [], events: [], teams: [] }', content)

# 3. Consolidate specific duplicates manually or with logic
# We'll just remove the known duplicates from the early part of the file.

# List of function names to remove the first occurrence of
to_remove = [
    'getProducts',
    'getCampaigns',
    'getGroups',
    'deleteEvent',
    'getFilteredPlayers',
    'getPlayerDashboardData',
    'recordMatchResult',
    'getAdminDashboardDataEnhanced'
]

for func in to_remove:
    # Match the entire function block
    # This is rough but should work for these simple ones
    pattern = rf'async\s+{func}\s*\([^)]*\)\s*\{{[^}}]*\}}'
    # Find all occurrences
    matches = list(re.finditer(pattern, content))
    if len(matches) > 1:
        # Remove the first match
        m = matches[0]
        content = content[:m.start()] + content[m.end():]

with open('frontend/api-service.js', 'w') as f:
    f.write(content)
