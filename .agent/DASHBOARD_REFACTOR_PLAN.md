# Complete Dashboard Refactor - Action Plan

## Overview
Implement a unified dashboard with Club/Player toggle, proper switchers, and correct data loading.

---

## What We're Building

### Visual Design
```
┌────────────────────────────────────────────────────────────────┐
│  🏟️ ClubHub    Club ●━━━━━○ Player    [Switcher ▼]    🔔 John │
└────────────────────────────────────────────────────────────────┘

Club Mode:
- Toggle: Club ●━━━━━○ Player (left side active)
- Switcher: [Elite Pro Academy ▼] (Organization Switcher)
- Content: Admin Dashboard (manage club)

Player Mode:
- Toggle: Club ○━━━━━● Player (right side active)
- Switcher: [Emma Thompson ▼] (Family Switcher)
- Content: Player Dashboard (view family data)
```

---

## The Complete Flow

### User Journey 1: New Parent
1. Sign up
2. Land on dashboard (Player mode by default)
3. See: "Club ○━━━━━● Player" toggle
4. See: Family switcher with "[+ Add Family Member]"
5. Add children
6. Find clubs for children
7. Once accepted, children appear in switcher with club badges

### User Journey 2: Club Owner
1. Sign up
2. Land on dashboard (Player mode by default)
3. Toggle to Club mode: "Club ●━━━━━○ Player"
4. See: Org switcher with "[+ Create a Club]"
5. Create club
6. Manage players, events, staff

### User Journey 3: Owner + Parent
1. Has both clubs and children
2. Toggle between modes as needed
3. Club mode: Manage organizations
4. Player mode: View family member data

---

## Implementation Plan

### ✅ PHASE 1: Backend Updates (Already Done!)

**Files:** `backend/routes/auth.js`

**Status:** ✅ Complete
- `/auth/context` returns both org memberships AND children's clubs
- Each child includes `player_id`, `player_name`, `club_id`, `club_name`

**No changes needed!**

---

### 📝 PHASE 2: Create Unified Dashboard Container

**File:** `frontend/dashboard.html` (NEW)

**What to create:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ClubHub Dashboard</title>
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="org-switcher.css">
  <link rel="stylesheet" href="dashboard.css">
</head>
<body>
  <header class="main-header">
    <!-- Logo -->
    <div class="logo">🏟️ ClubHub</div>
    
    <!-- Mode Toggle (Club/Player) -->
    <div class="mode-toggle-container">
      <span class="mode-label active" id="club-label">Club</span>
      <label class="toggle-switch">
        <input type="checkbox" id="mode-toggle" />
        <span class="toggle-slider"></span>
      </label>
      <span class="mode-label" id="player-label">Player</span>
    </div>
    
    <!-- Dynamic Switcher Container -->
    <div id="switcher-container"></div>
    
    <!-- User Actions -->
    <div class="header-actions">
      <button class="notifications" onclick="toggleNotifications()">🔔</button>
      <span class="user-name" id="user-name">Loading...</span>
      <button class="logout" onclick="logout()">Logout</button>
    </div>
  </header>
  
  <!-- Dynamic Content Container -->
  <div id="dashboard-content" class="dashboard-content">
    <div class="loading">Loading dashboard...</div>
  </div>
  
  <!-- Scripts -->
  <script src="api-service.js"></script>
  <script src="workspace-manager.js"></script>
  <script src="org-switcher.js"></script>
  <script src="dashboard-loader.js"></script>
</body>
</html>
```

**Tasks:**
- [ ] Create `frontend/dashboard.html`
- [ ] Add header structure
- [ ] Add toggle switch HTML
- [ ] Add switcher container
- [ ] Add content container

---

### 📝 PHASE 3: Keep Existing Dashboards (NO EXTRACTION NEEDED!)

**IMPORTANT:** We are NOT extracting content. We're keeping the existing dashboards as-is!

**Files to keep:**
- `admin-dashboard.html` - Keep as-is ✅
- `player-dashboard.html` - Keep as-is ✅
- `player-dashboard.js` - Keep as-is ✅

**What we'll do:**
- Load these existing files via AJAX into the unified container
- They already have all the content and functionality
- No need to extract or duplicate code

**Why this is better:**
✅ Less work - no extraction needed
✅ No code duplication
✅ Existing dashboards keep working
✅ Easy to maintain
✅ Can still access them directly if needed

**Tasks:**
- [ ] ~~Create content files~~ NOT NEEDED
- [ ] Keep existing dashboards unchanged
- [ ] Load them via AJAX in dashboard-loader.js

---

### 📝 PHASE 4: Create Dashboard Loader

**File:** `frontend/dashboard-loader.js` (NEW)

**What it does:**
- Manages mode toggle (Club/Player)
- Loads complete dashboard HTML files via AJAX
- Shows/hides correct switcher
- Handles smooth transitions

**Code structure:**
```javascript
// State
let currentMode = localStorage.getItem('dashboardMode') || 'player';

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  await initDashboard();
});

async function initDashboard() {
  // 1. Set up toggle listeners
  setupToggle();
  
  // 2. Load initial mode
  await loadMode(currentMode);
}

function setupToggle() {
  const toggle = document.getElementById('mode-toggle');
  
  toggle.addEventListener('change', async (e) => {
    const mode = e.target.checked ? 'player' : 'club';
    await switchMode(mode);
  });
}

async function switchMode(mode) {
  if (mode === currentMode) return;
  
  // 1. Update toggle UI
  updateToggleLabels(mode);
  
  // 2. Fade out content
  const content = document.getElementById('dashboard-content');
  content.style.opacity = '0';
  await sleep(200);
  
  // 3. Load new mode
  await loadMode(mode);
  
  // 4. Fade in content
  content.style.opacity = '1';
  
  // 5. Save preference
  currentMode = mode;
  localStorage.setItem('dashboardMode', mode);
}

async function loadMode(mode) {
  if (mode === 'club') {
    await loadClubMode();
  } else {
    await loadPlayerMode();
  }
}

async function loadClubMode() {
  // 1. Load admin-dashboard.html into iframe or fetch content
  const content = document.getElementById('dashboard-content');
  
  // Option A: Using iframe (simpler, keeps all scripts working)
  content.innerHTML = `
    <iframe 
      src="admin-dashboard.html" 
      style="width: 100%; height: 100vh; border: none;"
      onload="handleDashboardLoad('club')"
    ></iframe>
  `;
  
  // 2. Show org switcher (in parent page header)
  showOrgSwitcher();
  hideFamilySwitcher();
}

async function loadPlayerMode() {
  // 1. Load player-dashboard.html into iframe
  const content = document.getElementById('dashboard-content');
  
  content.innerHTML = `
    <iframe 
      src="player-dashboard.html" 
      style="width: 100%; height: 100vh; border: none;"
      onload="handleDashboardLoad('player')"
    ></iframe>
  `;
  
  // 2. Show family switcher (in parent page header)
  showFamilySwitcher();
  hideOrgSwitcher();
}

function handleDashboardLoad(mode) {
  console.log(`${mode} dashboard loaded`);
  // Dashboard is ready
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**Alternative approach (if iframe doesn't work):**
```javascript
async function loadClubMode() {
  // Fetch the HTML
  const response = await fetch('admin-dashboard.html');
  const html = await response.text();
  
  // Parse and inject (more complex, need to handle scripts)
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Extract body content
  const content = doc.body.innerHTML;
  document.getElementById('dashboard-content').innerHTML = content;
  
  // Re-run scripts (tricky!)
  executeScripts(doc);
}
```

**Recommendation:** Use iframe approach - simpler and keeps everything working!

**Tasks:**
- [ ] Create `dashboard-loader.js`
- [ ] Implement toggle setup
- [ ] Implement `switchMode()`
- [ ] Implement `loadClubMode()` with iframe
- [ ] Implement `loadPlayerMode()` with iframe
- [ ] Add fade transitions
- [ ] Test mode switching

---

### 📝 PHASE 5: Update Organization Switcher

**File:** `frontend/org-switcher.js` (UPDATE)

**Changes needed:**
1. Make it work as a standalone component
2. Add show/hide methods
3. Ensure it only shows orgs where user has management roles

**Current behavior:**
- Shows ALL organizations (including children's clubs) ❌

**New behavior:**
- Only shows orgs where role is owner/admin/coach/staff ✅
- Hides when in Player mode ✅
- Shows when in Club mode ✅

**Code changes:**
```javascript
class OrganizationSwitcher {
  // Add show/hide methods
  show() {
    this.container.style.display = 'block';
  }
  
  hide() {
    this.container.style.display = 'none';
  }
  
  // Filter organizations
  filterManagementOrgs(organizations) {
    return organizations.filter(org => 
      ['owner', 'admin', 'coach', 'staff'].includes(org.role) &&
      !org.player_id // Exclude child player contexts
    );
  }
}
```

**Tasks:**
- [ ] Add `show()` method
- [ ] Add `hide()` method
- [ ] Filter out child player contexts
- [ ] Only show management roles
- [ ] Test switching visibility

---

### 📝 PHASE 6: Update Family Switcher

**File:** `frontend/player-dashboard.js` (UPDATE)

**Changes needed:**
1. Extract family switcher into standalone component
2. Add show/hide methods
3. Display club badges for each child
4. Handle children without clubs (grayed out)

**Current behavior:**
- Hidden (we set it to `false`) ❌
- Embedded in player dashboard ❌

**New behavior:**
- Standalone component ✅
- Shows in Player mode ✅
- Hides in Club mode ✅
- Shows club badges ✅
- Grays out unassigned children ✅

**Code changes:**
```javascript
class FamilySwitcher {
  constructor() {
    this.container = null;
    this.family = [];
    this.activePlayerId = null;
  }
  
  async init() {
    // Load family members
    this.family = await apiService.getFamilyMembers();
    this.render();
  }
  
  render() {
    // Render family switcher with club badges
    this.family.forEach(child => {
      const hasClub = child.club_id && child.club_name;
      const badge = hasClub 
        ? `🏟️ ${child.club_name}`
        : `⚠️ No Club Assigned`;
      
      // Render child item (clickable if has club)
    });
  }
  
  show() {
    this.container.style.display = 'block';
  }
  
  hide() {
    this.container.style.display = 'none';
  }
  
  async switchToChild(playerId) {
    // Load that child's player data
    this.activePlayerId = playerId;
    await loadPlayerDashboard(playerId);
  }
}
```

**Tasks:**
- [ ] Create `FamilySwitcher` class
- [ ] Implement `init()` method
- [ ] Implement `render()` with club badges
- [ ] Add `show()` and `hide()` methods
- [ ] Handle unassigned children (gray out)
- [ ] Implement `switchToChild()`
- [ ] Test switching between children

---

### 📝 PHASE 7: Create Dashboard CSS

**File:** `frontend/dashboard.css` (NEW)

**What to style:**
1. Mode toggle switch
2. Switcher container
3. Dashboard content transitions
4. Responsive layout

**CSS structure:**
```css
/* Mode Toggle */
.mode-toggle-container { }
.mode-label { }
.mode-label.active { }
.toggle-switch { }
.toggle-slider { }
.toggle-slider:before { }
input:checked + .toggle-slider { }

/* Header Layout */
.main-header { }
.header-left { }
.header-center { }
.header-right { }

/* Switcher Container */
#switcher-container { }

/* Content Transitions */
.dashboard-content {
  transition: opacity 0.2s ease-in-out;
}

/* Responsive */
@media (max-width: 768px) { }
```

**Tasks:**
- [ ] Create `dashboard.css`
- [ ] Style mode toggle
- [ ] Style header layout
- [ ] Add fade transitions
- [ ] Make responsive
- [ ] Test on mobile

---

### 📝 PHASE 8: Update Data Loading

**Files:** `dashboard-loader.js`, `player-dashboard.js`

**Club Mode Data Loading:**
```javascript
async function loadClubMode() {
  // Get selected org from switcher
  const orgId = getCurrentOrgId();
  
  // Load admin dashboard data
  const data = await apiService.getAdminDashboardData(orgId);
  
  // Populate dashboard
  updateAdminDashboard(data);
}
```

**Player Mode Data Loading:**
```javascript
async function loadPlayerMode() {
  // Get selected family member
  const playerId = getActivePlayerId();
  
  if (!playerId) {
    // Show parent view (no specific child selected)
    showParentOverview();
  } else {
    // Load specific child's data
    const child = family.find(c => c.id === playerId);
    const clubId = child.club_id;
    
    // Load player dashboard data
    const data = await apiService.getPlayerDashboardData(playerId);
    
    // Populate dashboard
    updatePlayerDashboard(data);
  }
}
```

**Tasks:**
- [ ] Implement Club mode data loading
- [ ] Implement Player mode data loading
- [ ] Handle child without club (show empty state)
- [ ] Handle parent view (no child selected)
- [ ] Test data loads correctly
- [ ] Verify club context is correct

---

### 📝 PHASE 9: Update Routing

**File:** Login flow / auth redirect

**Current:**
```javascript
// OLD: Different dashboards
if (user.accountType === 'organization') {
  window.location.href = '/admin-dashboard.html';
} else {
  window.location.href = '/player-dashboard.html';
}
```

**New:**
```javascript
// NEW: Everyone goes to unified dashboard
window.location.href = '/dashboard.html';

// Dashboard will determine default mode:
// - New users: Player mode
// - Returning users: Last used mode
```

**Tasks:**
- [ ] Update login redirect
- [ ] Update signup redirect
- [ ] Test new user flow
- [ ] Test returning user flow

---

### 📝 PHASE 10: Testing

**Test Scenarios:**

**Test 1: New Parent User**
- [ ] Sign up
- [ ] Land on dashboard in Player mode
- [ ] See family switcher with "+ Add Family Member"
- [ ] Add a child
- [ ] Child appears grayed out (no club)
- [ ] Apply to club
- [ ] After acceptance, child shows with club badge
- [ ] Click child → loads their player data

**Test 2: Club Owner**
- [ ] Sign up
- [ ] Toggle to Club mode
- [ ] See org switcher with "+ Create Club"
- [ ] Create a club
- [ ] Club appears in switcher
- [ ] Select club → loads admin dashboard
- [ ] Can manage players, events, staff

**Test 3: Owner + Parent**
- [ ] Has both clubs and children
- [ ] Toggle to Club mode
- [ ] See org switcher (Elite Pro, Strikers)
- [ ] Select Elite Pro → admin dashboard
- [ ] Toggle to Player mode
- [ ] See family switcher (Emma, Toby)
- [ ] Select Emma → player dashboard with Emma's data
- [ ] Toggle back to Club mode → returns to admin view

**Test 4: Mode Persistence**
- [ ] Switch to Player mode
- [ ] Refresh page
- [ ] Still in Player mode
- [ ] Switch to Club mode
- [ ] Refresh page
- [ ] Still in Club mode

**Test 5: Data Isolation**
- [ ] In Player mode, select Emma (Elite Pro)
- [ ] Verify shows Emma's teams from Elite Pro
- [ ] Select Toby (Strikers)
- [ ] Verify shows Toby's teams from Strikers
- [ ] No data mixing between children

**Test 6: Responsive**
- [ ] Test on desktop (1920px)
- [ ] Test on tablet (768px)
- [ ] Test on mobile (375px)
- [ ] Toggle works on all sizes
- [ ] Switchers work on all sizes

---

## File Structure After Implementation

```
frontend/
├── dashboard.html (NEW - unified container)
├── dashboard.css (NEW - toggle + layout styles)
├── dashboard-loader.js (NEW - mode switching logic)
│
├── admin-dashboard-content.html (NEW - extracted content)
├── player-dashboard-content.html (NEW - extracted content)
│
├── org-switcher.js (UPDATED - show/hide, filter management roles)
├── player-dashboard.js (UPDATED - extract family switcher)
├── api-service.js (NO CHANGE)
├── workspace-manager.js (NO CHANGE)
│
├── admin-dashboard.html (KEEP - backup/reference)
└── player-dashboard.html (KEEP - backup/reference)

backend/
└── routes/
    ├── dashboard.js (NO CHANGE)
    ├── auth.js (ALREADY UPDATED ✅)
    └── players.js (NO CHANGE)
```

---

## Implementation Order

### Day 1: Structure
1. ✅ Phase 1: Backend (already done)
2. 📝 Phase 2: Create dashboard.html
3. 📝 Phase 3: Extract content files
4. 📝 Phase 7: Create dashboard.css

### Day 2: Logic
5. 📝 Phase 4: Create dashboard-loader.js
6. 📝 Phase 5: Update org-switcher.js
7. 📝 Phase 6: Update player-dashboard.js (family switcher)

### Day 3: Integration
8. 📝 Phase 8: Update data loading
9. 📝 Phase 9: Update routing
10. 📝 Phase 10: Testing

---

## Rollback Plan

If something breaks:
1. Revert routing to old dashboards
2. Keep new dashboard.html for debugging
3. Fix issues
4. Re-deploy

**Backup strategy:**
- Don't delete old dashboard files
- Keep them as `admin-dashboard.html.backup`
- Only remove after 2 weeks of successful new dashboard

---

## Success Criteria

✅ One unified dashboard
✅ Smooth toggle between Club/Player modes
✅ Correct switcher shows in each mode
✅ Data loads correctly for each context
✅ No page refreshes (AJAX loading)
✅ Mode persists across sessions
✅ Works on all devices
✅ All existing features still work

---

## Next Steps

1. Review this plan
2. Confirm approach
3. Start with Phase 2 (create dashboard.html)
4. Work through phases sequentially
5. Test after each phase

**Ready to start?**
