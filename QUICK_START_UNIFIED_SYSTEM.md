# 🚀 QUICK START: Unified Account System

## ✅ What's Ready to Use RIGHT NOW

### **1. Organization Switcher** 
📁 **Files:** `org-switcher.js`, `org-switcher.css`

**Add to ANY page in 30 seconds:**
```html
<div id="org-switcher-container"></div>
<link rel="stylesheet" href="org-switcher.css">
<script src="org-switcher.js"></script>
```

---

### **2. Create Organization Page**
📁 **File:** `create-organization.html`

**URL:** `/create-organization.html`

**What it does:**
- Beautiful form to create new organization
- Sport selection dropdown
- Auto-redirects to dashboard after creation

---

### **3. Invitation System**
📁 **File:** `invitation-accept.html`

**How to invite someone:**
```javascript
// In your admin dashboard
await apiService.makeRequest(`/organizations/${orgId}/invite`, {
  method: 'POST',
  body: JSON.stringify({
    email: 'coach@example.com',
    role: 'coach',
    message: 'Join our team!'
  })
});
```

**They get link:** `/invitation-accept.html?token=ABC123`

---

## 📋 3-Step Integration

### **Step 1: Add Switcher to Header (5 min)**

Update `admin-dashboard.html`:
```html
<header class="header">
    <div class="logo">ClubHub</div>
    <div id="org-switcher-container"></div> <!-- ADD THIS -->
    <div class="user-info">...</div>
</header>

<!-- At bottom before </body> -->
<link rel="stylesheet" href="org-switcher.css">
<script src="org-switcher.js"></script>
```

Do the same for:
- `coach-dashboard.html`
- `player-dashboard.html`

---

### **Step 2: Add Invite Button (10 min)**

In `admin-dashboard.html`, add this button:
```html
<button onclick="showInviteModal()">+ Invite Member</button>

<script>
function showInviteModal() {
    const email = prompt('Email:');
    const role = prompt('Role (player/coach/admin):');
    
    if (email && role) {
        apiService.makeRequest(`/organizations/${currentOrgId}/invite`, {
            method: 'POST',
            body: JSON.stringify({ email, role })
        }).then(() => {
            alert('Invitation sent!');
        });
    }
}
</script>
```

---

### **Step 3: Test It! (5 min)**

1. **Create organization:**
   - Go to `/create-organization.html`
   - Fill form
   - Click create

2. **Invite someone:**
   - Click "Invite Member"
   - Enter email and role
   - They get email with link

3. **Switch organizations:**
   - Click dropdown in header
   - Select different org
   - Page reloads with new context

---

## 🎯 Complete User Flows

### **Flow 1: Admin Creates Club & Invites Coach**
```
1. Admin → /create-organization.html
2. Creates "Elite FC"
3. Becomes owner
4. Clicks "Invite Member"
5. Enters coach@example.com, role: coach
6. Coach gets email
7. Coach clicks link
8. Coach accepts invitation
9. Coach joins as coach
10. ✅ Done!
```

### **Flow 2: Coach Invites Players**
```
1. Coach logs in
2. Sees "Elite FC" in switcher
3. Goes to members section
4. Clicks "Invite Member"
5. Enters player@example.com, role: player
6. Player gets email
7. Player accepts
8. Player joins team
9. ✅ Done!
```

### **Flow 3: User in Multiple Organizations**
```
1. User is player at Elite FC
2. Gets invited as coach at Youth Academy
3. Accepts invitation
4. Now has dropdown:
   - Elite FC (Player)
   - Youth Academy (Coach)
5. Can switch anytime
6. Dashboard changes based on role
7. ✅ Done!
```

---

## 📊 API Quick Reference

| Action | Endpoint | Method | Body |
|--------|----------|--------|------|
| Create org | `/api/organizations` | POST | `{name, sport, location}` |
| Get my orgs | `/api/organizations` | GET | - |
| Switch org | `/api/auth/switch-organization` | POST | `{organizationId}` |
| Invite user | `/api/organizations/:id/invite` | POST | `{email, role, message}` |
| Accept invite | `/api/invitations/:token/accept` | POST | - |

---

## 🎨 Where Everything Is

```
frontend/
├── org-switcher.js          ← Dropdown component
├── org-switcher.css         ← Switcher styles
├── create-organization.html ← Create org page
└── invitation-accept.html   ← Accept invite page

backend/
├── routes/
│   ├── organizations.js     ← Org CRUD API
│   ├── invitations.js       ← Invite API
│   └── auth-context.js      ← Org switching
└── migrations/
    └── 20260109000000-*     ← Database setup
```

---

## ✨ Features You Get

✅ **Multi-Organization Support**
- Users can belong to multiple clubs
- Different roles in different clubs
- Easy switching via dropdown

✅ **Email Invitations**
- Send invites to anyone
- Secure token-based links
- Auto-signup if needed

✅ **Role-Based Access**
- 8 role types (owner, admin, coach, player, etc.)
- Permissions enforced by backend
- UI adapts to user role

✅ **Beautiful UI**
- Stripe-style dropdown
- Smooth animations
- Mobile responsive

---

## 🚀 Ready to Use!

Everything is:
- ✅ Built and tested
- ✅ Committed to Git
- ✅ Pushed to GitHub
- ✅ Documented
- ✅ Production-ready

**Just integrate into your existing pages and you're done!**

---

## 📚 Full Documentation

- `UNIFIED_SYSTEM_COMPLETE_GUIDE.md` - Complete visual guide
- `UNIFIED_ACCOUNT_MIGRATION_PLAN.md` - Migration details
- `UNIFIED_ACCOUNT_IMPLEMENTATION_SUMMARY.md` - Backend summary
- `UNIFIED_ACCOUNT_FRONTEND_COMPLETE.md` - Frontend summary

---

**Need help?** Check the complete guide or ask! 🎉
