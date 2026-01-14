# 🚀 ClubHub RBAC Quick Start Guide

## What You've Got Now

Your ClubHub platform now has a **complete Role-Based Access Control (RBAC) system** where:

✅ **One Account, Multiple Organizations** - Users can join many clubs with different roles  
✅ **Smart Invitations** - Invite people with specific roles (coach, player, admin, etc.)  
✅ **Auto-Routing** - Users see the right dashboard based on their role  
✅ **Dynamic UI** - Features show/hide based on permissions  
✅ **Seamless Switching** - Switch between organizations in one click  

---

## 🎯 How to Use It

### 1. Create Your First Organization

**URL:** `http://localhost:8000/create-organization.html`

1. Fill in organization details (name, sport, location)
2. Click "Create Organization"
3. You're automatically made the **Owner**
4. Redirected to admin dashboard

---

### 2. Invite Team Members

**From Admin Dashboard:**

1. Click **"📧 Invite Staff Member"** button
2. Enter their email
3. Select their role:
   - **Admin** → Full management access
   - **Coach** → Team & player management
   - **Staff** → Financial & shop access
   - **Player** → Personal dashboard only
   - **Parent** → Guardian access for children
   - **Viewer** → Read-only access
4. Add a personal message (optional)
5. Click **"Send Invitation"**

**What Happens:**
- Email sent with unique invite link
- Link looks like: `invite-page.html?token=abc123`
- You can copy the link to share manually

---

### 3. Accept an Invitation

**Recipient's Flow:**

1. Click invitation link from email
2. See organization details and assigned role
3. If **not logged in**:
   - Redirected to registration
   - Email pre-filled
   - After signup → Auto-joins organization
4. If **logged in**:
   - Click "Accept & Join"
   - Instantly added to organization
5. Redirected to appropriate dashboard:
   - **Admin/Coach/Staff** → `admin-dashboard.html`
   - **Player/Parent** → `player-dashboard.html`

---

### 4. Switch Between Organizations

**In the Header:**

1. Look for the **Organization Switcher** dropdown
2. Shows current org logo and your role
3. Click to see all your organizations
4. Select different organization
5. Page reloads with new context
6. UI updates to show role-appropriate features

---

## 🔐 Role Permissions Matrix

| Feature | Owner | Admin | Coach | Staff | Player | Parent | Viewer |
|---------|-------|-------|-------|-------|--------|--------|--------|
| **Dashboard** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Profile Settings** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Player Management** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Team Management** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Staff Management** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Events** | ✅ | ✅ | ✅ | ❌ | View | View | View |
| **Finances** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Listings** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Shop** | ✅ | ✅ | ❌ | ✅ | View | View | View |
| **Tactical Board** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Delete Org** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 🎨 UI Customization

### Hide Features by Role

Add `data-roles` attribute to any element:

```html
<!-- Only visible to owners and admins -->
<button data-roles="owner, admin">
  Manage Finances
</button>

<!-- Visible to coaches and above -->
<div data-roles="owner, admin, coach">
  Player Statistics
</div>
```

The **Workspace Manager** automatically hides these elements if the user's role doesn't match.

---

## 🔧 API Endpoints

### Organizations

```javascript
// Create organization
POST /api/organizations
Body: { name, sport, location, description, website }

// Get user's organizations
GET /api/organizations

// Get specific organization
GET /api/organizations/:id

// Update organization (admin/owner only)
PUT /api/organizations/:id
Body: { name, description, ... }

// Delete organization (owner only)
DELETE /api/organizations/:id
```

### Invitations

```javascript
// Send invitation
POST /api/organizations/:orgId/invite
Body: { email, role, message }

// Get invitation details
GET /api/invitations/:token

// Accept invitation (requires auth)
POST /api/invitations/:token/accept

// Decline invitation
POST /api/invitations/:token/decline

// List org invitations (admin/owner only)
GET /api/organizations/:orgId/invitations
```

### Context & Switching

```javascript
// Get user context
GET /api/auth/context
Returns: { user, organizations, currentOrganization, ... }

// Switch organization
POST /api/auth/switch-organization
Body: { organizationId }
```

---

## 🎯 Real-World Examples

### Example 1: Youth Football Club

**Setup:**
1. Create "Elite Youth FC" organization
2. Invite coaches with `coach` role
3. Invite players with `player` role
4. Invite parents with `parent` role

**Result:**
- Coaches see: Players, Teams, Events, Tactical Board
- Players see: Personal Dashboard, Events, Shop
- Parents see: Child Profiles, Events, Payments

---

### Example 2: Multi-Sport Academy

**Setup:**
1. User creates "London Sports Academy"
2. User is also a coach at "Manchester United Youth"
3. User switches between orgs via header dropdown

**Result:**
- At London Sports Academy: **Owner** → Full access
- At Manchester United Youth: **Coach** → Team management only
- One account, two different permission sets

---

### Example 3: Staff Member

**Setup:**
1. Invite accountant with `staff` role
2. They accept invitation

**Result:**
- Can access: Finances, Shop, Payments
- Cannot access: Player management, Tactical board
- Perfect for non-coaching administrative roles

---

## 🐛 Troubleshooting

### Invitation Not Working?

**Check:**
1. Email is correct in invitation
2. Invitation hasn't expired (7 days)
3. User's email matches invitation email
4. Backend route is correctly mounted

**Debug:**
```javascript
// Check invitation details
GET /api/invitations/YOUR_TOKEN

// Check user context
GET /api/auth/context
```

### User Can't See Features?

**Check:**
1. User's role in current organization
2. `data-roles` attribute on hidden elements
3. Workspace Manager is loaded
4. Organization context is set

**Debug:**
```javascript
// In browser console
apiService.getContext().then(ctx => {
  console.log('Current Role:', ctx.currentOrganization.user_role);
  console.log('All Orgs:', ctx.organizations);
});
```

### Organization Switching Not Working?

**Check:**
1. User is a member of target organization
2. `user_preferences` table has correct `current_organization_id`
3. Organization switcher is loaded

**Debug:**
```javascript
// Check preferences
SELECT * FROM user_preferences WHERE user_id = 'YOUR_USER_ID';

// Check memberships
SELECT * FROM organization_members WHERE user_id = 'YOUR_USER_ID';
```

---

## 📚 Key Files Reference

| File | Purpose |
|------|---------|
| `backend/middleware/auth.js` | RBAC middleware (`injectOrgContext`, `requireRole`) |
| `backend/routes/organizations.js` | Organization CRUD operations |
| `backend/routes/invitations.js` | Invitation system |
| `frontend/workspace-manager.js` | Frontend role enforcement |
| `frontend/org-switcher.js` | Organization switching UI |
| `frontend/invite-page.html` | Invitation acceptance page |
| `frontend/create-organization.html` | Organization creation |
| `RBAC_SYSTEM.md` | Full documentation |

---

## 🎉 You're All Set!

Your ClubHub platform now has enterprise-level role-based access control. Users can:

✅ Create unlimited organizations  
✅ Invite members with specific roles  
✅ Switch between organizations seamlessly  
✅ See only what they're allowed to see  
✅ Accept invitations and auto-route to correct dashboard  

**Next Steps:**
1. Test the invitation flow
2. Create multiple organizations
3. Invite users with different roles
4. Switch between organizations
5. Verify role-based UI rendering

Need help? Check `RBAC_SYSTEM.md` for detailed documentation! 🚀
