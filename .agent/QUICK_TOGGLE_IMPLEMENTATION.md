# Quick Dashboard Toggle Implementation

## What We're Actually Doing

Add Club/Player toggle to both dashboards with proper switcher updates.

---

## Step-by-Step Implementation

### ✅ STEP 1: Backend - Filter Org Switcher (ALREADY DONE!)

**File:** `backend/routes/auth.js`

**Status:** ✅ Already updated
- Returns org memberships (for org switcher)
- Returns children's clubs (for family switcher)
- Each has proper context (player_id, player_name, club_name)

**No changes needed!**

---

### 📝 STEP 2: Update Org Switcher - Filter Management Roles Only

**File:** `frontend/org-switcher.js`

**Current problem:**
- Shows ALL organizations including children's clubs

**Fix:**
```javascript
// In OrganizationSwitcher class
async init() {
  const context = await apiService.getContext();
  
  // FILTER: Only show orgs where user has management role
  this.organizations = context.organizations.filter(org => 
    ['owner', 'admin', 'coach', 'staff'].includes(org.role) &&
    !org.player_id // Exclude child player contexts
  );
  
  this.render();
}
```

**Tasks:**
- [ ] Open `org-switcher.js`
- [ ] Find the `init()` method
- [ ] Add filter for management roles only
- [ ] Exclude entries with `player_id`
- [ ] Test org switcher only shows owned/managed clubs

---

### 📝 STEP 3: Update Family Switcher - Show Club Badges

**File:** `frontend/player-dashboard.js`

**Current problem:**
- Family switcher is hidden (`false`)
- Doesn't show club badges

**Fix:**
```javascript
// Re-enable family switcher
const profileSwitcher = true; // Change from false to true

// Update rendering to show club badges
PlayerDashboardState.family.map(child => {
  const hasClub = child.club_id && child.club_name;
  const clubBadge = hasClub 
    ? `🏟️ ${child.club_name}`
    : `⚠️ No Club Assigned`;
  
  return `
    <button 
      class="profile-item ${isActive ? 'active' : ''}" 
      onclick="switchProfile('${child.id}')"
      ${hasClub ? '' : 'disabled'}
    >
      <div class="avatar">${child.first_name.charAt(0)}</div>
      <div class="info">
        <div class="name">${child.first_name} ${child.last_name}</div>
        <div class="club-badge">${clubBadge}</div>
      </div>
    </button>
  `;
});
```

**Tasks:**
- [ ] Open `player-dashboard.js`
- [ ] Find line ~62: `const profileSwitcher = false`
- [ ] Change to `true`
- [ ] Find family member rendering (around line 79-90)
- [ ] Add club badge display
- [ ] Gray out children without clubs
- [ ] Test family switcher shows with badges

---

### 📝 STEP 4: Add Mode Toggle CSS

**File:** `frontend/styles.css` (or create `toggle.css`)

**Add:**
```css
/* Mode Toggle Container */
.mode-toggle-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0 1.5rem;
}

.mode-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  transition: color 0.3s;
}

.mode-label.active {
  color: white;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 34px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background: white;
  border-radius: 50%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input:checked + .toggle-slider {
  background: var(--primary);
  border-color: var(--primary);
}

input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

.toggle-switch:hover .toggle-slider {
  background: rgba(255, 255, 255, 0.15);
}

input:focus + .toggle-slider {
  box-shadow: 0 0 0 3px rgba(220, 67, 67, 0.2);
}
```

**Tasks:**
- [ ] Add toggle CSS to `styles.css`
- [ ] Test toggle appearance
- [ ] Test on mobile

---

### 📝 STEP 5: Add Toggle to Admin Dashboard

**File:** `frontend/admin-dashboard.html`

**Find the header** (search for where org-switcher is)

**Add before org-switcher:**
```html
<!-- Mode Toggle -->
<div class="mode-toggle-container">
  <span class="mode-label active" id="club-label">Club</span>
  <label class="toggle-switch">
    <input type="checkbox" id="mode-toggle" />
    <span class="toggle-slider"></span>
  </label>
  <span class="mode-label" id="player-label">Player</span>
</div>

<script>
// Mode toggle handler
document.getElementById('mode-toggle')?.addEventListener('change', (e) => {
  if (e.target.checked) {
    window.location.href = 'player-dashboard.html';
  }
});
</script>
```

**Tasks:**
- [ ] Find header section in admin-dashboard.html
- [ ] Add toggle HTML
- [ ] Add toggle script
- [ ] Test clicking toggle navigates to player dashboard

---

### 📝 STEP 6: Add Toggle to Player Dashboard

**File:** `frontend/player-dashboard.html`

**Find the header** (search for where family-switcher would be)

**Add:**
```html
<!-- Mode Toggle -->
<div class="mode-toggle-container">
  <span class="mode-label" id="club-label">Club</span>
  <label class="toggle-switch">
    <input type="checkbox" id="mode-toggle" checked />
    <span class="toggle-slider"></span>
  </label>
  <span class="mode-label active" id="player-label">Player</span>
</div>

<script>
// Mode toggle handler
document.getElementById('mode-toggle')?.addEventListener('change', (e) => {
  if (!e.target.checked) {
    window.location.href = 'admin-dashboard.html';
  }
});
</script>
```

**Tasks:**
- [ ] Find header section in player-dashboard.html
- [ ] Add toggle HTML (with `checked` attribute)
- [ ] Add toggle script
- [ ] Test clicking toggle navigates to admin dashboard

---

## Testing Checklist

### Test 1: Org Switcher (Admin Dashboard)
- [ ] Login as owner@demo.com
- [ ] Go to admin dashboard
- [ ] Org switcher shows: Elite Pro, Strikers (only owned clubs)
- [ ] Does NOT show: Grassroots Giants (you're just a player there)
- [ ] Does NOT show: Children's clubs

### Test 2: Family Switcher (Player Dashboard)
- [ ] Go to player dashboard
- [ ] Family switcher shows all children
- [ ] Emma shows: "🏟️ Elite Pro Academy"
- [ ] Toby shows: "🏟️ Strikers United"
- [ ] Child Two shows: "🏟️ Grassroots Giants"
- [ ] Can click each child
- [ ] Loads their player data

### Test 3: Mode Toggle
- [ ] On admin dashboard, toggle is on left (Club active)
- [ ] Click toggle → navigates to player dashboard
- [ ] On player dashboard, toggle is on right (Player active)
- [ ] Click toggle → navigates to admin dashboard
- [ ] Toggle animation is smooth

### Test 4: Data Loading
- [ ] In player dashboard, select Emma
- [ ] Shows Emma's data from Elite Pro
- [ ] Select Toby
- [ ] Shows Toby's data from Strikers
- [ ] No data mixing

---

## Estimated Time

- Step 2: 10 minutes (filter org switcher)
- Step 3: 20 minutes (update family switcher)
- Step 4: 5 minutes (add CSS)
- Step 5: 10 minutes (add toggle to admin)
- Step 6: 10 minutes (add toggle to player)
- Testing: 15 minutes

**Total: ~70 minutes (1 hour 10 minutes)**

---

## Ready to Start?

Let's go step by step. I'll implement each one and you can test as we go.

**Start with Step 2 (filter org switcher)?**
