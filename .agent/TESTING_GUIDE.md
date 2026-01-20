# ClubHub Multi-Tenancy Testing Guide

## Current Test Data Setup

### User Account: `owner@demo.com`
**Password:** `demo123`

This account has **multiple roles** across different organizations:

| Organization | Role | Access Level |
|---|---|---|
| **Elite Pro Academy** | Owner | Full admin dashboard access |
| **Strikers United** | Owner | Full admin dashboard access |
| **Grassroots Giants** | Player | Player dashboard only |

### Family Members (Children)

Each child belongs to **ONE specific club** for isolated testing:

| Child Name | Club | Age | Sport |
|---|---|---|---|
| **Emma Thompson** | Elite Pro Academy | 11 | Football |
| **Toby Thompson** | Strikers United | 8 | Football |
| **Child Two** | Grassroots Giants | 9 | Football |

## Expected Behavior

### When Logged in as Owner (Admin Dashboard)

#### Viewing Elite Pro Academy
- **Total Players:** 3 (Emma, Mike, Child One)
- **Staff Members:** 3
- **Active Events:** 6
- **Family Switcher:** Shows only Emma Thompson

#### Viewing Strikers United
- **Total Players:** 3 (Toby + 2 others)
- **Staff Members:** Count for Strikers
- **Active Events:** Strikers events only
- **Family Switcher:** Shows only Toby Thompson

#### Viewing Grassroots Giants
- **Should redirect to Player Dashboard** (since you're a Player there, not Owner/Admin)

### When Logged in as Player (Player Dashboard)

#### Viewing Grassroots Giants
- **Active Clubs:** 0 (as parent account)
- **Teams:** 0 (as parent account)
- **Upcoming Events:** 0 (as parent account)
- **Family Switcher:** Shows only Child Two
- **When switching to Child Two profile:**
  - Active Clubs: 1 (Grassroots Giants)
  - Teams: Child Two's teams
  - Events: Grassroots events

## Testing Scenarios

### Scenario 1: Organization Switcher (Admin View)
1. Login as `owner@demo.com`
2. You should land on **Elite Pro Academy** (first owned club)
3. Click organization switcher → Select **Strikers United**
4. Dashboard should refresh showing Strikers data only
5. Player count, events, and family members should update

### Scenario 2: Family Profile Switcher (Player View)
1. Login as `owner@demo.com`
2. Switch to **Grassroots Giants** (redirects to Player Dashboard)
3. Family switcher should show **only Child Two**
4. Click on Child Two's profile
5. Dashboard should show Child Two's clubs, teams, and events

### Scenario 3: Parent Overview (Future Feature)
**Current Limitation:** Parent account doesn't aggregate all children's data.

**Proposed Solution:**
- When viewing "Parent Account" profile (not a specific child)
- Show aggregated view of ALL children across ALL clubs
- Display summary cards for each child with their respective clubs
- Allow quick navigation to each child's individual view

## Database Verification Commands

```sql
-- Check user's organizations
SELECT o.name, om.role 
FROM organization_members om 
JOIN organizations o ON om.organization_id = o.id 
WHERE om.user_id = (SELECT id FROM users WHERE email = 'owner@demo.com');

-- Check family distribution
SELECT p.first_name, p.last_name, o.name as club_name 
FROM players p 
JOIN organizations o ON p.club_id = o.id 
WHERE p.user_id = (SELECT id FROM users WHERE email = 'owner@demo.com')
ORDER BY o.name;

-- Check player counts per club
SELECT o.name, count(p.id) 
FROM players p 
JOIN organizations o ON p.club_id = o.id 
GROUP BY o.name;
```

## Known Issues & Fixes Applied

### ✅ Fixed: Organization Switcher Disappearing
**Issue:** Switcher would vanish after profile updates on player dashboard.
**Fix:** Implemented persistent caching of the org switcher DOM element.

### ✅ Fixed: Aggregated Player Counts
**Issue:** Admin dashboard showed sum of all clubs (7 players instead of 3).
**Fix:** Backend now defaults to first club if no specific clubId provided.

### ✅ Fixed: Family Members Showing Across All Clubs
**Issue:** Family switcher showed all children regardless of selected organization.
**Fix:** `/players/family` endpoint now accepts `clubId` parameter and filters accordingly.

## Recommendations

### For Parent Account Overview
Consider implementing a dedicated "Family Overview" section that:
- Shows all children in a grid/list
- Displays which club each child belongs to
- Provides quick stats (attendance, payments, upcoming events) per child
- Allows bulk actions (e.g., pay all outstanding fees)

### For Multi-Club Children
If a child belongs to multiple clubs (future scenario):
- Show club badges/tags on their profile card
- Allow filtering events/teams by club
- Separate payment tracking per club

## File Locations

- **Backend Dashboard:** `backend/routes/dashboard.js`
- **Backend Players:** `backend/routes/players.js`
- **Frontend API Service:** `frontend/api-service.js`
- **Player Dashboard Logic:** `frontend/player-dashboard.js`
- **Organization Switcher:** `frontend/org-switcher.js`
