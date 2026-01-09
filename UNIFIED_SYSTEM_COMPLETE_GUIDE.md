# 🎯 Complete Unified Account System - User Guide

## 📍 Where Everything Is

### **1. Organization Switcher (Header Dropdown)**

**Location:** Top right of every dashboard page

```
┌─────────────────────────────────────────────────────────────┐
│  ClubHub Logo    [Elite FC ▼]    👤 Admin    🔔    Logout  │
│                   ↑                                          │
│              Organization Switcher                           │
└─────────────────────────────────────────────────────────────┘
```

**How to Add to Your Pages:**

```html
<!-- In admin-dashboard.html, coach-dashboard.html, etc. -->
<header class="header">
    <div class="logo">
        <img src="logo.png" alt="ClubHub">
    </div>
    
    <!-- ADD THIS CONTAINER -->
    <div id="org-switcher-container"></div>
    
    <div class="user-info">
        <span>Hello, Admin!</span>
        <button onclick="logout()">Logout</button>
    </div>
</header>

<!-- ADD THESE AT THE BOTTOM BEFORE </body> -->
<link rel="stylesheet" href="org-switcher.css">
<script src="org-switcher.js"></script>
```

**What It Shows:**
```
┌──────────────────────────────┐
│ Elite FC                  ▼  │ ← Current organization
│ Admin                        │ ← Your role
└──────────────────────────────┘
      ↓ Click to open
┌──────────────────────────────┐
│ Switch Organization          │
├──────────────────────────────┤
│ ✓ Elite FC (Admin)          │ ← Current (checkmark)
│   Youth Academy (Coach)      │
│   Training Camp (Player)     │
├──────────────────────────────┤
│ + Create Organization        │
└──────────────────────────────┘
```

---

## 🏢 How to Create an Organization

### **Option 1: After Signup (New Users)**

**Flow:**
```
1. User signs up → email + password + name
2. Redirected to: "What would you like to do?"
   
   ┌─────────────────────────────────┐
   │  Welcome to ClubHub!            │
   │                                 │
   │  [Create Organization]          │ ← Click here
   │  [Join with Invite Code]        │
   └─────────────────────────────────┘
```

### **Option 2: From Organization Switcher**

**Flow:**
```
1. Click organization dropdown
2. Click "+ Create Organization"
3. Fill out form
```

### **Option 3: Direct API Call**

```javascript
// Create organization via API
const response = await apiService.makeRequest('/organizations', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Elite FC',
    sport: 'Football',
    location: 'London, UK',
    description: 'Premier youth football academy'
  })
});

// Response:
{
  "success": true,
  "organization": {
    "id": "org-123",
    "name": "Elite FC",
    "slug": "elite-fc",
    "owner_id": "user-456"
  }
}
```

---

## 📧 How to Invite Coaches & Players

### **Step 1: Go to Members Section**

In your admin dashboard:
```
Dashboard → Members → Invite New Member
```

### **Step 2: Fill Invitation Form**

```html
┌─────────────────────────────────────┐
│  Invite Member                      │
├─────────────────────────────────────┤
│  Email: [john@example.com        ]  │
│  Role:  [Player ▼]                  │
│         - Player                    │
│         - Coach                     │
│         - Assistant Coach           │
│         - Admin                     │
│         - Parent                    │
│         - Staff                     │
│  Message (optional):                │
│  [We'd love to have you join!    ]  │
│                                     │
│  [Cancel]  [Send Invitation]        │
└─────────────────────────────────────┘
```

### **Step 3: API Call to Send Invitation**

```javascript
// Invite a coach
async function inviteCoach() {
  const response = await apiService.makeRequest(
    `/organizations/${currentOrgId}/invite`,
    {
      method: 'POST',
      body: JSON.stringify({
        email: 'coach@example.com',
        role: 'coach',
        message: 'Join our coaching staff!'
      })
    }
  );
  
  // Response includes invitation link
  console.log(response.inviteLink); 
  // → "/invitation-accept.html?token=abc123xyz"
}

// Invite a player
async function invitePlayer() {
  const response = await apiService.makeRequest(
    `/organizations/${currentOrgId}/invite`,
    {
      method: 'POST',
      body: JSON.stringify({
        email: 'player@example.com',
        role: 'player',
        message: 'Welcome to Elite FC!'
      })
    }
  );
}
```

### **Step 4: They Receive Email**

```
From: ClubHub <noreply@clubhub.com>
To: coach@example.com
Subject: You're invited to join Elite FC!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You've been invited to join Elite FC as a Coach

[Accept Invitation Button]
→ https://clubhub.com/invitation-accept.html?token=abc123xyz

Personal message from Admin:
"Join our coaching staff!"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔗 Invitation Link Flow

### **What Happens When They Click the Link:**

```
1. User clicks: https://clubhub.com/invitation-accept.html?token=abc123xyz

2. Page loads and shows:

   ┌─────────────────────────────────────┐
   │         [Elite FC Logo]             │
   │                                     │
   │      You're Invited!                │
   │                                     │
   │  Admin invited you to join          │
   │                                     │
   │  Organization: Elite FC             │
   │  Role: Coach                        │
   │  Email: coach@example.com           │
   │                                     │
   │  Personal Message:                  │
   │  "Join our coaching staff!"         │
   │                                     │
   │  [Decline]  [Accept Invitation]     │
   │                                     │
   │  Don't have an account?             │
   │  You'll create one after accepting  │
   └─────────────────────────────────────┘

3. If NOT logged in:
   → Redirects to signup with token
   → After signup, auto-accepts invitation
   → Joins organization as Coach

4. If ALREADY logged in:
   → Accepts invitation immediately
   → Joins organization as Coach
   → Redirects to dashboard
```

---

## 🎯 Complete User Flows

### **Flow 1: New User Creates Organization**

```
1. Visit clubhub.com/signup.html
2. Enter: email, password, name
3. Click "Sign Up"
4. See: "Create Organization" or "Join with Invite"
5. Click "Create Organization"
6. Fill form:
   - Name: Elite FC
   - Sport: Football
   - Location: London
7. Click "Create"
8. ✅ Now owner of Elite FC
9. Can invite coaches/players
```

### **Flow 2: Coach Gets Invited**

```
1. Admin sends invitation to coach@example.com
2. Coach receives email with link
3. Coach clicks link
4. Sees invitation details
5. Clicks "Accept Invitation"
6. If no account:
   → Creates account
   → Auto-joins as Coach
7. If has account:
   → Joins immediately as Coach
8. ✅ Now a coach at Elite FC
9. Sees Elite FC in organization dropdown
```

### **Flow 3: Player Gets Invited**

```
1. Admin sends invitation to player@example.com
2. Player receives email
3. Player clicks link
4. Accepts invitation
5. Creates account (if needed)
6. ✅ Joins as Player
7. Can see:
   - Schedule
   - Team info
   - Payment plans
   - Events
```

### **Flow 4: Multi-Organization User**

```
1. User is Player at Elite FC
2. Gets invited as Coach at Youth Academy
3. Accepts invitation
4. Now has 2 organizations:
   
   ┌──────────────────────────────┐
   │ Elite FC (Player)         ▼  │
   └──────────────────────────────┘
        ↓ Click
   ┌──────────────────────────────┐
   │ ✓ Elite FC (Player)          │
   │   Youth Academy (Coach)      │
   └──────────────────────────────┘

5. Can switch between them anytime
6. Dashboard changes based on role
```

---

## 🛠️ Implementation Checklist

### **✅ Backend (Already Done)**
- [x] Organizations API
- [x] Invitations API
- [x] Auth context API
- [x] Database migrations
- [x] Role-based permissions

### **📝 Frontend (To Do)**

#### **1. Add Switcher to Dashboards**

**Files to update:**
- `admin-dashboard.html`
- `coach-dashboard.html`
- `player-dashboard.html`

**Add this to each:**
```html
<header>
    <div class="logo">ClubHub</div>
    <div id="org-switcher-container"></div> <!-- ADD THIS -->
    <div class="user-info">...</div>
</header>

<!-- At bottom -->
<link rel="stylesheet" href="org-switcher.css">
<script src="org-switcher.js"></script>
```

#### **2. Create Organization Page**

**File:** `create-organization.html`

```html
<!DOCTYPE html>
<html>
<head>
    <title>Create Organization - ClubHub</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>Create Your Organization</h1>
        <form id="createOrgForm">
            <input name="name" placeholder="Organization Name" required>
            <input name="sport" placeholder="Sport (e.g., Football)">
            <input name="location" placeholder="Location">
            <textarea name="description" placeholder="Description"></textarea>
            <button type="submit">Create Organization</button>
        </form>
    </div>
    
    <script src="api-service.js"></script>
    <script>
        document.getElementById('createOrgForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            try {
                const response = await apiService.makeRequest('/organizations', {
                    method: 'POST',
                    body: JSON.stringify(Object.fromEntries(formData))
                });
                
                if (response.success) {
                    alert('Organization created!');
                    window.location.href = '/dashboard';
                }
            } catch (error) {
                alert('Failed to create organization');
            }
        });
    </script>
</body>
</html>
```

#### **3. Add Invite Button to Admin Dashboard**

**In `admin-dashboard.html`:**

```html
<!-- Members Section -->
<div class="members-section">
    <h2>Team Members</h2>
    <button onclick="showInviteModal()">+ Invite Member</button>
    
    <!-- Member list -->
    <div id="members-list"></div>
</div>

<!-- Invite Modal -->
<div id="inviteModal" class="modal">
    <div class="modal-content">
        <h3>Invite New Member</h3>
        <form id="inviteForm">
            <input type="email" name="email" placeholder="Email" required>
            <select name="role" required>
                <option value="player">Player</option>
                <option value="coach">Coach</option>
                <option value="assistant_coach">Assistant Coach</option>
                <option value="admin">Admin</option>
                <option value="parent">Parent</option>
                <option value="staff">Staff</option>
            </select>
            <textarea name="message" placeholder="Personal message (optional)"></textarea>
            <button type="submit">Send Invitation</button>
        </form>
    </div>
</div>

<script>
function showInviteModal() {
    document.getElementById('inviteModal').style.display = 'block';
}

document.getElementById('inviteForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await apiService.makeRequest(
            `/organizations/${currentOrgId}/invite`,
            {
                method: 'POST',
                body: JSON.stringify(data)
            }
        );
        
        if (response.success) {
            alert(`Invitation sent to ${data.email}!`);
            document.getElementById('inviteModal').style.display = 'none';
            e.target.reset();
        }
    } catch (error) {
        alert('Failed to send invitation');
    }
});
</script>
```

---

## 📱 Quick Reference

### **API Endpoints:**

| Action | Endpoint | Method |
|--------|----------|--------|
| Create org | `/api/organizations` | POST |
| Get my orgs | `/api/organizations` | GET |
| Switch org | `/api/auth/switch-organization` | POST |
| Send invite | `/api/organizations/:id/invite` | POST |
| Get invite | `/api/invitations/:token` | GET |
| Accept invite | `/api/invitations/:token/accept` | POST |

### **Files:**

| Component | File | Status |
|-----------|------|--------|
| Org Switcher | `org-switcher.js` | ✅ Done |
| Switcher CSS | `org-switcher.css` | ✅ Done |
| Invite Page | `invitation-accept.html` | ✅ Done |
| Create Org Page | `create-organization.html` | ❌ To Do |
| Invite Modal | In dashboards | ❌ To Do |

---

## 🎯 Next Steps to Complete

1. **Add switcher to all dashboards** (5 min)
2. **Create organization creation page** (15 min)
3. **Add invite button to admin dashboard** (10 min)
4. **Test the complete flow** (10 min)

**Total time: ~40 minutes to fully integrate!**

---

**Everything is ready to use - just needs to be integrated into your existing pages!** 🚀
