# ✅ Unified Signup & Invitation Flow - Complete

## 🎯 System Overview

The ClubHub signup system is now **fully unified** with the RBAC invitation system. Users can:

1. **Sign up normally** → Choose account type → Create account
2. **Sign up via invitation** → Email pre-filled → Auto-join organization with role

---

## 🔄 Complete Flow Diagrams

### Flow 1: Normal Signup (No Invitation)

```
User visits signup.html
         ↓
Step 1: Choose Account Type
  ├─ Player Account (adult)
  └─ Organization
         ↓
Step 2: Personal Information
  - First Name, Last Name
  - Email, Password
         ↓
Click "Create Account"
         ↓
Account Created ✅
         ↓
Redirect Based on Type:
  ├─ Organization → create-organization.html
  └─ Player/Adult → player-dashboard.html
```

### Flow 2: Signup via Invitation (NEW! ✨)

```
User clicks invitation link
  invite-page.html?token=abc123
         ↓
Not logged in?
         ↓
Click "Accept & Join"
         ↓
Redirect to: signup.html?invite=abc123&email=user@example.com
         ↓
📧 INVITATION DETECTED
  ├─ Email pre-filled & locked
  ├─ Green banner: "You're Joining via Invitation"
  ├─ Token stored in localStorage
  └─ Auto-select "Player Account"
         ↓
User fills: First Name, Last Name, Password
         ↓
Click "Create Account"
         ↓
1️⃣ Account Created
2️⃣ Invitation Automatically Accepted
3️⃣ User Added to Organization with Role
         ↓
Redirect Based on Role:
  ├─ coach/admin/staff → admin-dashboard.html
  └─ player/parent → player-dashboard.html
```

---

## 🎨 What Happens in Each Scenario

### Scenario A: Player Invited to Club

**Admin Action:**
```javascript
// Admin clicks "Invite Player"
Email: john@example.com
Role: player
```

**John's Experience:**
1. Receives email with link
2. Clicks link → `invite-page.html?token=xyz`
3. Sees: "You've been invited to join Elite FC as a Player"
4. Not logged in → Clicks "Accept & Join"
5. Redirected to: `signup.html?invite=xyz&email=john@example.com`
6. **Sees green banner**: "✉️ You're Joining via Invitation"
7. **Email is pre-filled** and locked (can't change)
8. Fills: First Name, Last Name, Password
9. Clicks "Create Account"
10. **System automatically:**
    - Creates account
    - Accepts invitation
    - Adds John to Elite FC as 'player'
11. **Redirected to**: `player-dashboard.html`
12. Can see: Events, Shop, Personal Stats

### Scenario B: Coach Invited to Club

**Admin Action:**
```javascript
// Admin clicks "Invite Team Member"
Email: sarah@example.com
Role: coach
```

**Sarah's Experience:**
1. Receives email with link
2. Clicks link → `invite-page.html?token=abc`
3. Sees: "You've been invited to join Elite FC as a Coach"
4. Not logged in → Clicks "Accept & Join"
5. Redirected to: `signup.html?invite=abc&email=sarah@example.com`
6. **Sees green banner**: "✉️ You're Joining via Invitation"
7. **Email is pre-filled** and locked
8. Fills: First Name, Last Name, Password
9. Clicks "Create Account"
10. **System automatically:**
    - Creates account
    - Accepts invitation
    - Adds Sarah to Elite FC as 'coach'
11. **Redirected to**: `admin-dashboard.html`
12. Can see: Players, Teams, Events, Tactical Board

### Scenario C: Existing User Accepts Invitation

**Admin Action:**
```javascript
// Admin invites existing user
Email: mike@example.com (already has account)
Role: staff
```

**Mike's Experience:**
1. Receives email with link
2. Clicks link → `invite-page.html?token=def`
3. **Already logged in** ✅
4. Sees: "You've been invited to join Elite FC as a Staff Member"
5. Clicks "Accept & Join"
6. **System automatically:**
    - Adds Mike to Elite FC as 'staff'
7. **Redirected to**: `admin-dashboard.html`
8. Can see: Finances, Shop, Payments
9. Header shows organization switcher (if belongs to multiple orgs)

---

## 🔐 Technical Implementation

### 1. Invitation Link Format

```
invite-page.html?token=UNIQUE_TOKEN_HERE
```

### 2. Redirect to Signup (if not logged in)

```javascript
// From invite-page.html
if (!token) {
  localStorage.setItem('pendingInviteToken', invitationToken);
  window.location.href = `signup.html?invite=${invitationToken}&email=${encodeURIComponent(invitationData.email)}`;
}
```

### 3. Signup Detects Invitation

```javascript
// In signup.html DOMContentLoaded
const inviteToken = urlParams.get('invite');
const inviteEmail = urlParams.get('email');

if (inviteToken) {
  // Store for later
  localStorage.setItem('pendingInviteToken', inviteToken);
  
  // Pre-fill email
  emailInput.value = decodeURIComponent(inviteEmail);
  emailInput.readOnly = true;
  
  // Show banner
  // Auto-select account type
}
```

### 4. Registration Accepts Invitation

```javascript
// After successful registration
const pendingInviteToken = localStorage.getItem('pendingInviteToken');

if (pendingInviteToken) {
  // Accept invitation
  const inviteResponse = await apiService.acceptInvitation(pendingInviteToken);
  
  // Get role from invitation
  const inviteDetails = await apiService.getInvitation(pendingInviteToken);
  invitationRole = inviteDetails.invitation?.role;
  
  // Clear token
  localStorage.removeItem('pendingInviteToken');
}
```

### 5. Smart Routing Based on Role

```javascript
// Redirect priority:
// 1. Platform Admin → super-admin-dashboard.html
// 2. Invitation Role → admin-dashboard.html or player-dashboard.html
// 3. Organization Account → create-organization.html or admin-dashboard.html
// 4. Player/Adult Account → player-dashboard.html

if (invitationAccepted && invitationRole) {
  if (['owner', 'admin', 'coach', 'assistant_coach', 'staff'].includes(invitationRole)) {
    redirectUrl = 'admin-dashboard.html';
  } else {
    redirectUrl = 'player-dashboard.html';
  }
}
```

---

## ✅ What's Unified

### Before (Old System)
- ❌ Separate signup flows
- ❌ Manual invitation acceptance
- ❌ Users had to find organization after signup
- ❌ No automatic role assignment

### After (New Unified System)
- ✅ **Single signup flow** handles everything
- ✅ **Automatic invitation acceptance** after registration
- ✅ **Email pre-filled** from invitation
- ✅ **Role automatically assigned** from invitation
- ✅ **Smart routing** based on role
- ✅ **Visual feedback** (green banner, locked email)
- ✅ **Works for ALL roles** (player, coach, staff, admin, etc.)

---

## 🎯 Key Features

### 1. Email Pre-filling
```javascript
// Email from invitation is pre-filled and locked
emailInput.value = inviteEmail;
emailInput.readOnly = true;
emailInput.style.cursor = 'not-allowed';
```

### 2. Visual Invitation Banner
```html
<div style="background: rgba(34, 197, 94, 0.1); ...">
  ✉️ You're Joining via Invitation
  After creating your account, you'll automatically join the organization
</div>
```

### 3. Automatic Invitation Acceptance
```javascript
// Happens silently after registration
await apiService.acceptInvitation(pendingInviteToken);
```

### 4. Role-Based Routing
```javascript
// Users land on correct dashboard for their role
coach → admin-dashboard.html
player → player-dashboard.html
```

---

## 🚀 Testing the Flow

### Test 1: Invite a New Player

1. **As Admin:**
   - Click "📧 Invite Player"
   - Enter: `newplayer@test.com`
   - Role auto-filled: `player`
   - Click "Send Invitation"

2. **As New User:**
   - Open email
   - Click invitation link
   - See invitation page
   - Click "Accept & Join"
   - Redirected to signup
   - **See green banner** ✅
   - **Email pre-filled** ✅
   - Fill name & password
   - Click "Create Account"
   - **Automatically joined as player** ✅
   - **Redirected to player-dashboard** ✅

### Test 2: Invite a New Coach

1. **As Admin:**
   - Click "📧 Invite Team Member"
   - Enter: `newcoach@test.com`
   - Select role: `coach`
   - Click "Send Invitation"

2. **As New User:**
   - Click invitation link
   - See: "Invited as Coach"
   - Click "Accept & Join"
   - Redirected to signup
   - Email pre-filled
   - Create account
   - **Automatically joined as coach** ✅
   - **Redirected to admin-dashboard** ✅
   - **Can see: Players, Teams, Events** ✅

### Test 3: Existing User Accepts Invite

1. **As Admin:**
   - Invite: `existing@test.com`
   - Role: `staff`

2. **As Existing User:**
   - Click invitation link
   - **Already logged in** ✅
   - Click "Accept & Join"
   - **Instantly added to org** ✅
   - **Redirected to admin-dashboard** ✅
   - **Can switch orgs via header** ✅

---

## 📋 Summary

### ✅ Unified Signup Flow

**For Normal Signups:**
- Choose account type
- Fill details
- Create account
- Redirect to appropriate dashboard

**For Invitation Signups:**
- Email pre-filled from invitation
- Visual banner shows invitation status
- Create account
- **Automatically accept invitation**
- **Automatically join organization with role**
- **Redirect based on assigned role**

### ✅ Works for ALL Roles

- ✅ Players
- ✅ Coaches
- ✅ Staff
- ✅ Admins
- ✅ Parents
- ✅ Viewers

### ✅ Seamless Experience

1. User receives invitation email
2. Clicks link
3. If not logged in → Signup with pre-filled email
4. Creates account
5. **Automatically joins organization**
6. **Lands on correct dashboard**

**No manual steps. No confusion. Just works!** 🎉

---

## 🔧 Files Modified

- ✅ `frontend/signup.html` - Added invitation handling
- ✅ `frontend/invite-page.html` - Redirects to signup if needed
- ✅ `frontend/api-service.js` - Invitation methods
- ✅ `backend/routes/invitations.js` - Fixed userId bugs
- ✅ `backend/middleware/auth.js` - RBAC middleware

**The entire flow is now unified and working perfectly!** 🚀
