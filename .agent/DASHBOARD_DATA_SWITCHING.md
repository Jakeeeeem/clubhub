# Dashboard Data Switching - How It Works

## 🔄 **The Complete Flow**

### **Understanding the Mechanism**

The toggle doesn't just "change data" on the same page - it actually **navigates to a different HTML page**, and each page loads its own appropriate data. This is the correct and clean approach.

---

## 📊 **Data Loading Per Dashboard**

### **1. Admin Dashboard** (`admin-dashboard.html`)
**When Loaded:**
- Calls `getAdminDashboardData(clubId)`
- Loads organization-specific data:
  - ✅ Staff members
  - ✅ Teams
  - ✅ Players (from org perspective)
  - ✅ Events
  - ✅ Payments
  - ✅ Financial stats
  - ✅ Stripe connection status

**Data Source (Demo Mode):**
```javascript
// api-service.js intercepts:
if (endpoint.includes("/dashboard/admin")) {
  return this.getAdminDashboardFallback();
}
```

---

### **2. Player Dashboard** (`player-dashboard.html`)
**When Loaded:**
- Calls `getPlayerDashboardData(playerId)`
- Loads player-specific data:
  - ✅ Player profile
  - ✅ Active clubs (from player perspective)
  - ✅ Teams player is on
  - ✅ Upcoming events
  - ✅ Booking history
  - ✅ Payment plan
  - ✅ Family members
  - ✅ Career stats

**Data Source (Demo Mode):**
```javascript
// api-service.js intercepts:
if (endpoint.includes("/players/dashboard")) {
  return {
    player: { id: "demo-player-id", name: "Jordan Smith", ... },
    clubs: [...],
    teams: [...],
    stats: { ... }
  };
}
```

---

### **3. Coach Dashboard** (`coach-dashboard.html`)
**When Loaded:**
- Calls `getAdminDashboardData(clubId)` (same as admin)
- Filters data to show only coach-relevant info:
  - ✅ Teams the coach manages
  - ✅ Players on those teams
  - ✅ Training sessions
  - ✅ Match schedule
  - ✅ Tactical board

**Data Source (Demo Mode):**
- Uses same admin dashboard data
- JavaScript filters to show only coach's teams/players

---

## 🔀 **Toggle Flow Examples**

### **Example 1: Admin → Player**

```
1. User clicks "Player" toggle on Admin Dashboard
   └─ Toggle checked = true

2. JavaScript executes:
   console.log('🔄 Admin → Player toggle activated');
   AppState.currentUser.role = 'player';  // Change role
   redirectToDashboard();                  // Call router

3. redirectToDashboard() logic:
   if (userRole === "player") {
     window.location.href = "player-dashboard.html";  // Navigate!
   }

4. Browser navigates to player-dashboard.html

5. Player Dashboard loads:
   - initializePlayerDashboard() runs
   - loadPlayerDataWithFallback() fetches player data
   - loadPlayerOverview() displays player stats
   - loadPlayerClubs() shows clubs from player perspective
   - loadPlayerTeams() shows teams player is on

6. Result: User sees PLAYER DATA (clubs, teams, events from player view)
```

---

### **Example 2: Player → Admin**

```
1. User clicks "Club" toggle on Player Dashboard
   └─ Toggle unchecked = false

2. JavaScript executes:
   console.log('🔄 Player → Club toggle activated');
   if (AppState.currentUser.role === 'player' && AppState.userType === 'organization') {
     AppState.currentUser.role = 'admin';  // Force admin role
   }
   redirectToDashboard();

3. redirectToDashboard() logic:
   if (userType === "organization") {
     window.location.href = "admin-dashboard.html";  // Navigate!
   }

4. Browser navigates to admin-dashboard.html

5. Admin Dashboard loads:
   - initializeAdminDashboard() runs
   - getAdminDashboardData(clubId) fetches org data
   - loadAdminStats() displays org-level stats
   - loadPlayers() shows all players in organization
   - loadStaff() shows all staff members
   - loadTeams() shows all teams in organization

6. Result: User sees ADMIN DATA (organization management view)
```

---

## 🎯 **Key Differences in Data**

| Aspect | Admin Dashboard | Player Dashboard |
|--------|----------------|------------------|
| **Perspective** | Organization owner/manager | Individual player |
| **Players** | All players in org | Just this player |
| **Teams** | All teams in org | Teams player is on |
| **Events** | All org events | Events player is attending |
| **Payments** | All org payments | Player's payment plan |
| **Stats** | Org-wide metrics | Player performance stats |
| **Actions** | Manage, create, delete | View, book, join |

---

## 🧪 **Demo Mode Data Sources**

### **Admin Dashboard Mock Data:**
```javascript
{
  stats: {
    totalPlayers: 156,
    totalStaff: 12,
    totalTeams: 8,
    monthlyRevenue: 45000
  },
  players: [
    { id: 1, name: "John Doe", team: "U18 Elite", status: "Active" },
    { id: 2, name: "Jane Smith", team: "U16 Academy", status: "Active" },
    // ... 154 more
  ],
  staff: [...],
  teams: [...]
}
```

### **Player Dashboard Mock Data:**
```javascript
{
  player: {
    id: "demo-player-id",
    name: "Jordan Smith",
    position: "Midfielder",
    age: 17,
    number: 10
  },
  clubs: [
    { id: 1, name: "Elite Pro Academy", role: "Player" }
  ],
  teams: [
    { id: 1, name: "U18 Elite Squad", position: "Midfielder" }
  ],
  stats: {
    goals: 12,
    assists: 8,
    appearances: 24,
    rating: 8.5
  },
  upcomingEvents: [
    { title: "Training Session", date: "2026-01-30", type: "training" },
    { title: "Match vs Rivals FC", date: "2026-02-01", type: "match" }
  ]
}
```

---

## ✅ **Verification Checklist**

### **Admin → Player Switch:**
- [x] Toggle changes to "Player" position
- [x] Console shows: "🔄 Admin → Player toggle activated"
- [x] Console shows: "After role change: player"
- [x] Page navigates to `player-dashboard.html`
- [x] Player dashboard loads player-specific data
- [x] Stats show player metrics (not org metrics)
- [x] Clubs list shows player's clubs
- [x] Events show player's bookings

### **Player → Admin Switch:**
- [x] Toggle changes to "Club" position
- [x] Console shows: "🔄 Player → Club toggle activated"
- [x] Console shows: "After role change: admin"
- [x] Page navigates to `admin-dashboard.html`
- [x] Admin dashboard loads organization data
- [x] Stats show org metrics (not player metrics)
- [x] Players list shows all org players
- [x] Events show all org events

### **Coach → Player Switch:**
- [x] Same as Admin → Player
- [x] Navigates from coach-dashboard.html to player-dashboard.html

---

## 🐛 **Debugging Tips**

### **Check Console Logs:**
When you toggle, you should see:
```
🔄 Admin → Player toggle activated
Before role change: admin
After role change: player
User type: organization
Calling redirectToDashboard()...
🔄 Redirecting | Global Type: organization | Context Role: player
```

### **If Data Doesn't Switch:**
1. Check if page actually navigated (URL should change)
2. Check if `isDemoSession` is set in localStorage
3. Check if API interceptions are working (look for 🛡️ logs)
4. Verify `AppState.currentUser.role` is correct before redirect

### **If Redirect Fails:**
1. Check if `redirectToDashboard` function exists (should log "Calling redirectToDashboard()...")
2. Check if role was actually changed (should log "After role change: player")
3. Check browser console for JavaScript errors

---

## 📝 **Summary**

**The data switches correctly because:**

1. ✅ Each dashboard is a **separate HTML page**
2. ✅ Each page has its own **data loading logic**
3. ✅ The toggle **changes the role** then **navigates to the appropriate page**
4. ✅ The new page **loads fresh data** based on the new role
5. ✅ Demo mode **intercepts API calls** and returns role-appropriate mock data

**This is NOT a single-page app** - it's a multi-page app where each page loads its own data. The toggle is essentially a smart navigation button that:
- Changes your role context
- Figures out which dashboard you should see
- Navigates you there
- Lets that page load its own data

This approach is **clean, simple, and works reliably** because each page is independent.

---

**Status:** ✅ **ALL TOGGLES WORKING WITH CORRECT DATA SWITCHING**

**Last Updated:** 2026-01-29
