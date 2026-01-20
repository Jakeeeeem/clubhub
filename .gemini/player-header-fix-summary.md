# Player Dashboard Header Issues - Summary

## Current Problems

### 1. Wrong Default Organization on Login
**Issue**: `demo-admin@clubhub.com` lands on "Sunday League FC" (Player) instead of "Elite Pro Academy" (Owner)

**Root Cause**: The `/context` endpoint returns organizations in alphabetical order, and there's a saved preference in `user_preferences.current_organization_id` pointing to Sunday League FC.

**Fix Applied**:
- Backend `/context` endpoint now prioritizes organizations where user is owner/admin
- Added logging to see which org is selected

**User Action Required**:
```javascript
// In browser console:
localStorage.clear()
// Then refresh and login again
```

### 2. Player Dashboard Header Shows "Login" Button
**Issue**: When switching to player dashboard, header only shows "Login" button instead of full nav (org switcher, bell, profile switcher, user info, logout)

**Root Cause**: `setupNavButtons()` is called before `AppState.currentUser` is fully initialized from localStorage

**Fix Applied**:
- Added retry mechanism - if header shows "Login", it retries after 500ms
- Added detailed logging to debug the issue

**Expected Behavior**:
After 500ms, the header should show:
- Organization Switcher (red button)
- Notification Bell
- Family Profile Switcher (if family members exist)
- "Hello, Demo!" greeting
- User avatar
- Logout button

## Multi-Role Support

✅ **Already Supported**: Users can have multiple roles across multiple organizations:
- Owner of Club A
- Player in Club A, B, C
- Coach in Club D

The org switcher shows ALL organizations where the user is a member, and the dashboard adapts based on their role in the selected org.

## Next Steps

1. Clear localStorage and test login
2. Check browser console for logs:
   - `🔍 Context - User orgs:`
   - `👑 Selected owner/admin org:`
   - `🔧 setupNavButtons called`
3. Verify header appears after 500ms delay on player dashboard
