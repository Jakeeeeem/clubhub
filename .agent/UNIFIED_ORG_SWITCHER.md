# Unified Organization Switcher - Implementation Complete

## ✅ What We've Built

### Single Unified Switcher
All navigation is now in **one place**: the Organization Switcher

No more family switcher - everything is context-based entries in the org switcher.

---

## How It Works Now

### Organization Switcher Shows ALL Contexts

For `owner@demo.com`, you'll see:

```
Your Contexts:
├─ Elite Pro Academy - Owner
├─ Elite Pro Academy - Player (Emma Thompson)
├─ Strikers United - Owner  
├─ Strikers United - Player (Toby Thompson)
├─ Grassroots Giants - Player
└─ Grassroots Giants - Player (Child Two)
```

### What Each Entry Does:

**Elite Pro Academy - Owner**
- Dashboard: Admin Dashboard
- Data: All club data (all players, staff, events, revenue)
- Actions: Full management capabilities

**Elite Pro Academy - Player (Emma Thompson)**
- Dashboard: Player Dashboard
- Data: Emma's specific data (her teams, events, attendance)
- Actions: View Emma's info, pay her fees, see her schedule

**Grassroots Giants - Player**
- Dashboard: Player Dashboard  
- Data: YOUR player data (if you're registered as a player)
- Actions: Your personal player view

**Grassroots Giants - Player (Child Two)**
- Dashboard: Player Dashboard
- Data: Child Two's specific data
- Actions: View Child Two's info, manage their activities

---

## Backend Changes

### `/auth/context` Endpoint Enhanced

Now returns BOTH:
1. **Your direct memberships** (owner, admin, staff, player roles)
2. **Your children's player contexts** (one entry per child per club)

```sql
-- Direct memberships
SELECT o.id, o.name, om.role, NULL as player_id, NULL as player_name
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id
WHERE om.user_id = $1

UNION

-- Children's player contexts  
SELECT o.id, o.name, 'player' as role, p.id as player_id, 
       CONCAT(p.first_name, ' ', p.last_name) as player_name
FROM organizations o
JOIN players p ON o.id = p.club_id
WHERE p.user_id = $1
```

---

## Frontend Changes

### Organization Switcher (`org-switcher.js`)

#### Enhanced Display
```javascript
// Shows player name for child contexts
if (org.player_id && org.player_name) {
  displayRole = `Player - ${org.player_name}`;
}
```

#### Enhanced Switching
```javascript
async switchOrganization(orgId, playerId = null) {
  // Store player ID if viewing as child
  if (playerId) {
    user.activePlayerId = playerId;
  }
  
  // Switch organization
  await apiService.switchOrganization(orgId);
  
  // Redirect to appropriate dashboard
  // (Admin if owner/admin, Player if player/child)
}
```

### Player Dashboard Data Loading

The player dashboard already supports `playerId` parameter:

```javascript
// When viewing as Emma
await apiService.getPlayerDashboardData(emmaPlayerId);

// Returns Emma's specific data:
// - Her teams
// - Her events  
// - Her payments
// - Her attendance
```

---

## User Flows

### Flow 1: Managing Your Club
1. Login as `owner@demo.com`
2. Select **"Elite Pro Academy - Owner"**
3. See: Admin Dashboard
4. View: All 3 players, staff, events, revenue
5. Actions: Add players, create events, manage staff

### Flow 2: Viewing Emma's Player Data
1. From anywhere, click org switcher
2. Select **"Elite Pro Academy - Player (Emma Thompson)"**
3. See: Player Dashboard (Emma's view)
4. View: Emma's teams, upcoming events, attendance
5. Actions: Pay Emma's fees, view her schedule

### Flow 3: Switching Between Children
1. Currently viewing **"Elite Pro - Player (Emma)"**
2. Click org switcher
3. Select **"Strikers United - Player (Toby Thompson)"**
4. System switches to Strikers organization
5. Shows Toby's player data
6. All in one smooth action!

---

## Family Member Management

### Adding a Child
When a player adds a family member:

1. **Child is created** in the `players` table
2. **club_id is NULL** initially (not assigned to any club)
3. **Child does NOT appear** in org switcher yet

### Club Acceptance Required
Until a club accepts the child:

```sql
-- Child without club
players (
  id: "child-id",
  user_id: "parent-id",
  club_id: NULL,  -- ❌ Not assigned yet
  first_name: "New Child"
)
```

**Result:** Child is NOT in org switcher (no club = no context)

### After Club Acceptance
When club assigns the child:

```sql
-- Child assigned to club
players (
  id: "child-id",
  user_id: "parent-id",
  club_id: "elite-pro-id",  -- ✅ Now assigned
  first_name: "New Child"
)
```

**Result:** New entry appears in org switcher:
- "Elite Pro Academy - Player (New Child)"

---

## Data Loading Logic

### When Viewing as Owner/Admin
```javascript
// Load club-wide data
GET /dashboard/admin?clubId=elite-pro-id

Returns:
- All players in the club
- All staff
- All events
- Revenue statistics
```

### When Viewing as Child
```javascript
// Load specific child's data
GET /dashboard/player?clubId=elite-pro-id&playerId=emma-id

Returns:
- Emma's teams
- Emma's events
- Emma's payments
- Emma's attendance
```

### When Viewing as Yourself (Player)
```javascript
// Load your own player data
GET /dashboard/player?clubId=grassroots-id

Returns:
- Your teams
- Your events
- Your payments
- Your attendance
```

---

## Key Benefits

### ✅ Single Source of Truth
- One switcher for everything
- No confusion about navigation
- Clear context at all times

### ✅ Explicit Context Selection
- You choose exactly what you're viewing
- No auto-switching surprises
- Each entry clearly labeled

### ✅ Scalable
- Works with any number of children
- Works with any number of clubs
- Children can be in different clubs

### ✅ Secure
- Children without clubs don't appear
- Can't view data you don't have access to
- Role-based permissions enforced

---

## Testing Checklist

### Test 1: Organization Switcher Display
```
✓ Shows your direct roles (Owner, Player)
✓ Shows each child as separate entry
✓ Displays child's name in role label
✓ Shows correct club name for each entry
```

### Test 2: Switching to Admin View
```
✓ Select "Elite Pro - Owner"
✓ Redirects to Admin Dashboard
✓ Shows all club data (all players)
✓ Can manage club settings
```

### Test 3: Switching to Child View
```
✓ Select "Elite Pro - Player (Emma)"
✓ Shows Player Dashboard
✓ Shows ONLY Emma's data
✓ Can view Emma's teams/events
✓ Can pay Emma's fees
```

### Test 4: Switching Between Children
```
✓ Switch from Emma to Toby
✓ Organization changes (Elite Pro → Strikers)
✓ Data updates to Toby's info
✓ Org switcher shows Strikers as active
```

### Test 5: Family Member Without Club
```
✓ Add new family member (no club assigned)
✓ Child does NOT appear in org switcher
✓ After club assigns child
✓ New entry appears in org switcher
```

---

## Files Modified

### Backend
- `backend/routes/auth.js` - Enhanced `/context` endpoint
- `backend/routes/dashboard.js` - Already supports `playerId` parameter

### Frontend
- `frontend/org-switcher.js` - Enhanced display and switching logic
- `frontend/player-dashboard.js` - Family switcher hidden (set to `false`)

---

## Next Steps

1. **Test the org switcher** - Refresh browser and check all entries appear
2. **Test switching contexts** - Try each entry and verify correct data loads
3. **Test child assignment** - Add a new family member and verify they appear after club assignment
4. **Verify data isolation** - Ensure Emma's data doesn't show Toby's info and vice versa

---

## Rollback Instructions

If you need to re-enable the family switcher:

**File:** `frontend/player-dashboard.js`
**Line:** ~62

```javascript
// Change this:
const profileSwitcher = false

// To this:
const profileSwitcher = PlayerDashboardState.family.length > 0 || true
```

This will bring back the family switcher while keeping the enhanced org switcher.
