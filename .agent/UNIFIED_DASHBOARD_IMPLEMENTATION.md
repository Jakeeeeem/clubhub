# Unified Dashboard Implementation Plan

## Goal
Create ONE dashboard with a Club/Player mode toggle that switches between admin and player views.

---

## Current State (Problems)

### Files:
- `admin-dashboard.html` - Separate admin dashboard
- `player-dashboard.html` - Separate player dashboard
- `player-dashboard.js` - Player dashboard logic
- Users land on wrong dashboard
- Can't access both features from one place

### Issues:
❌ Parents can't add family members (wrong dashboard)
❌ Club owners can't switch to player view easily
❌ Two separate codebases to maintain
❌ Confusing navigation

---

## Target State (Solution)

### One Unified Dashboard:
- `dashboard.html` - Single dashboard file
- Mode toggle in header: `[Club] [Player]`
- Switches content based on mode
- Both switchers available (org + family)
- One codebase, easier maintenance

### Benefits:
✅ One login, access everything
✅ Easy mode switching
✅ Parents can add family members
✅ Club owners can view player data
✅ Clean, simple UX

---

## Implementation Steps

### Phase 1: Create Unified Dashboard Structure
**File:** `frontend/dashboard.html` (new file)

**Structure:**
```html
<header>
  <div class="logo">ClubHub</div>
  
  <!-- MODE TOGGLE -->
  <div class="mode-toggle">
    <button class="mode-btn active" data-mode="club">🏢 Club</button>
    <button class="mode-btn" data-mode="player">👤 Player</button>
  </div>
  
  <!-- DYNAMIC SWITCHER CONTAINER -->
  <div id="switcher-container">
    <!-- Org switcher OR Family switcher goes here -->
  </div>
  
  <div class="user-actions">
    <button class="notifications">🔔</button>
    <span class="user-name">John</span>
    <button class="logout">Logout</button>
  </div>
</header>

<!-- DASHBOARD CONTENT (switches based on mode) -->
<div id="dashboard-content">
  <!-- Admin dashboard OR Player dashboard content -->
</div>
```

---

### Phase 2: Create Unified Dashboard JavaScript
**File:** `frontend/dashboard.js` (new file)

**Key Functions:**
```javascript
// Initialize dashboard
function initDashboard() {
  const mode = localStorage.getItem('dashboardMode') || 'player';
  switchMode(mode);
}

// Switch between Club and Player modes
function switchMode(mode) {
  if (mode === 'club') {
    showClubMode();
  } else {
    showPlayerMode();
  }
}

// Show Club mode (Admin Dashboard)
function showClubMode() {
  // 1. Update toggle buttons
  // 2. Show org switcher
  // 3. Hide family switcher
  // 4. Load admin dashboard content
  // 5. Load admin dashboard data
}

// Show Player mode (Player Dashboard)
function showPlayerMode() {
  // 1. Update toggle buttons
  // 2. Show family switcher
  // 3. Hide org switcher
  // 4. Load player dashboard content
  // 5. Load player dashboard data
}
```

---

### Phase 3: Migrate Admin Dashboard Content
**Source:** `admin-dashboard.html`
**Target:** `dashboard.html` (Club mode section)

**What to migrate:**
- Dashboard stats cards
- Players table
- Teams section
- Events section
- Staff section
- Finances section
- All modals (add player, create event, etc.)

**Create:**
```html
<div id="club-mode-content" class="dashboard-mode">
  <!-- All admin dashboard HTML goes here -->
</div>
```

---

### Phase 4: Migrate Player Dashboard Content
**Source:** `player-dashboard.html`
**Target:** `dashboard.html` (Player mode section)

**What to migrate:**
- Player overview cards
- Teams section
- Events section
- Payments section
- Documents section
- All modals (book event, pay fees, etc.)

**Create:**
```html
<div id="player-mode-content" class="dashboard-mode hidden">
  <!-- All player dashboard HTML goes here -->
</div>
```

---

### Phase 5: Update Organization Switcher
**File:** `frontend/org-switcher.js`

**Changes:**
- Keep existing functionality
- Ensure it works in Club mode
- Hide when in Player mode

**Logic:**
```javascript
function showOrgSwitcher() {
  const container = document.getElementById('switcher-container');
  container.innerHTML = ''; // Clear
  container.appendChild(orgSwitcherElement);
}

function hideOrgSwitcher() {
  const orgSwitcher = document.getElementById('org-switcher-container');
  if (orgSwitcher) {
    orgSwitcher.style.display = 'none';
  }
}
```

---

### Phase 6: Update Family Switcher
**File:** `frontend/player-dashboard.js`

**Changes:**
- Extract family switcher into standalone component
- Show in Player mode
- Hide in Club mode
- Keep all existing functionality

**Create:**
```javascript
function showFamilySwitcher() {
  const container = document.getElementById('switcher-container');
  container.innerHTML = ''; // Clear
  container.appendChild(familySwitcherElement);
}

function hideFamilySwitcher() {
  const familySwitcher = document.getElementById('family-switcher-container');
  if (familySwitcher) {
    familySwitcher.style.display = 'none';
  }
}
```

---

### Phase 7: Backend - No Changes Needed!
**Files:** Backend routes stay the same

**Why:**
- `/dashboard/admin` - Already works
- `/dashboard/player` - Already works
- `/auth/context` - Already returns both org and family data
- Just need to call the right endpoint based on mode

---

### Phase 8: Update Routing/Login
**File:** `frontend/login.html` or auth flow

**Change:**
```javascript
// OLD: Redirect to different dashboards
if (user.accountType === 'organization') {
  window.location.href = '/admin-dashboard.html';
} else {
  window.location.href = '/player-dashboard.html';
}

// NEW: Everyone goes to unified dashboard
window.location.href = '/dashboard.html';
```

---

### Phase 9: CSS Styling
**File:** `frontend/dashboard.css` (new file)

**Styles needed:**
```css
/* Mode toggle */
.mode-toggle { }
.mode-btn { }
.mode-btn.active { }

/* Switcher container */
#switcher-container { }

/* Dashboard modes */
.dashboard-mode { }
.dashboard-mode.hidden { display: none; }

/* Responsive */
@media (max-width: 768px) { }
```

---

### Phase 10: Testing Checklist

**Test 1: New Parent User**
- [ ] Sign up
- [ ] Land on dashboard (Player mode default)
- [ ] See family switcher with "+ Add Family Member"
- [ ] Can add children
- [ ] Can find clubs

**Test 2: Club Owner**
- [ ] Sign up / Login
- [ ] Can switch to Club mode
- [ ] See org switcher with "+ Create Club"
- [ ] Can create club
- [ ] Can manage players

**Test 3: Owner + Parent**
- [ ] Has both clubs and children
- [ ] Can toggle between modes
- [ ] Club mode: See org switcher, admin dashboard
- [ ] Player mode: See family switcher, player dashboard
- [ ] Data loads correctly in both modes

**Test 4: Mode Persistence**
- [ ] Switch to Player mode
- [ ] Refresh page
- [ ] Still in Player mode
- [ ] Switch to Club mode
- [ ] Refresh page
- [ ] Still in Club mode

---

## File Structure After Implementation

```
frontend/
├── dashboard.html (NEW - unified dashboard)
├── dashboard.js (NEW - mode switching logic)
├── dashboard.css (NEW - unified styles)
├── org-switcher.js (UPDATED - hide/show logic)
├── player-dashboard.js (UPDATED - extract family switcher)
├── api-service.js (NO CHANGE)
├── workspace-manager.js (NO CHANGE)
│
├── admin-dashboard.html (DEPRECATED - keep for reference)
└── player-dashboard.html (DEPRECATED - keep for reference)

backend/
└── routes/
    ├── dashboard.js (NO CHANGE)
    ├── auth.js (NO CHANGE - already returns both contexts)
    └── players.js (NO CHANGE)
```

---

## Migration Strategy

### Option A: Big Bang (Risky)
1. Create new dashboard.html with everything
2. Switch all users at once
3. Fast but risky

### Option B: Gradual (Safer)
1. Create new dashboard.html
2. Add feature flag
3. Test with subset of users
4. Gradually migrate everyone
5. Deprecate old dashboards

**Recommendation: Option B (Gradual)**

---

## Rollback Plan

If something breaks:
1. Revert routing to old dashboards
2. Keep new dashboard.html for testing
3. Fix issues
4. Re-deploy

**Backup files:**
- Keep admin-dashboard.html
- Keep player-dashboard.html
- Don't delete until new dashboard is proven

---

## Estimated Effort

- Phase 1-2: 2 hours (structure + JS)
- Phase 3-4: 3 hours (migrate content)
- Phase 5-6: 2 hours (update switchers)
- Phase 7-8: 1 hour (routing)
- Phase 9: 1 hour (styling)
- Phase 10: 2 hours (testing)

**Total: ~11 hours of development**

---

## Next Steps

1. Review this plan
2. Confirm approach
3. Start with Phase 1 (create structure)
4. Test each phase before moving to next
5. Deploy gradually

**Ready to start implementation?**
