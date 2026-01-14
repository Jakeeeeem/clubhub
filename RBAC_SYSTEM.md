# ClubHub Role-Based Access Control (RBAC) System

## 🎯 Overview

ClubHub now features a **unified workspace system** where users can have a single account but belong to multiple organizations with different roles in each. The system automatically manages permissions, UI visibility, and routing based on the user's current organizational context.

---

## 🏗️ Architecture

### 1. **Database Schema**

#### Organizations Table
```sql
organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  slug VARCHAR(255) UNIQUE,
  sport VARCHAR(100),
  location VARCHAR(255),
  owner_id UUID REFERENCES users(id),
  ...
)
```

#### Organization Members Table
```sql
organization_members (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(50), -- owner, admin, coach, player, parent, staff, viewer
  status VARCHAR(20), -- active, inactive, suspended
  permissions JSONB,
  joined_at TIMESTAMP,
  ...
)
```

#### User Preferences Table
```sql
user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  current_organization_id UUID REFERENCES organizations(id),
  ...
)
```

#### Invitations Table
```sql
invitations (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  email VARCHAR(255),
  role VARCHAR(50),
  token VARCHAR(255) UNIQUE,
  status VARCHAR(20), -- pending, accepted, declined, expired
  invited_by UUID REFERENCES users(id),
  message TEXT,
  expires_at TIMESTAMP,
  ...
)
```

---

## 🔐 Role Hierarchy

### Available Roles (in order of permissions):

1. **Owner** - Full control over the organization
   - Can delete the organization
   - Can manage all members and roles
   - Access to all features

2. **Admin** - Administrative access
   - Can manage members (except owner)
   - Can edit organization settings
   - Access to most features

3. **Coach** - Team management
   - Can manage assigned teams
   - Can view and manage players
   - Access to tactical and training features

4. **Assistant Coach** - Limited coaching access
   - Can assist with team management
   - Limited player management

5. **Staff** - Administrative support
   - Can manage finances and shop
   - Limited access to player data

6. **Player** - Participant access
   - Can view their own data
   - Can access player dashboard
   - Can participate in polls and events

7. **Parent** - Guardian access
   - Can manage child profiles
   - Can view child's data
   - Limited organizational visibility

8. **Viewer** - Read-only access
   - Can view public information
   - No editing capabilities

---

## 🔄 How It Works

### Backend Flow

#### 1. **Authentication Context** (`/api/auth/context`)
When a user logs in, this endpoint returns:
```json
{
  "success": true,
  "user": { "id": "...", "email": "...", "first_name": "..." },
  "organizations": [
    {
      "id": "org-1",
      "name": "Elite FC",
      "user_role": "owner",
      "sport": "football"
    },
    {
      "id": "org-2",
      "name": "London Academy",
      "user_role": "coach",
      "sport": "basketball"
    }
  ],
  "currentOrganization": {
    "id": "org-1",
    "name": "Elite FC",
    "user_role": "owner",
    ...
  },
  "hasMultipleOrganizations": true
}
```

#### 2. **Organization Switching** (`/api/auth/switch-organization`)
```javascript
POST /api/auth/switch-organization
Body: { "organizationId": "org-2" }

// Updates user_preferences.current_organization_id
// Returns success confirmation
```

#### 3. **RBAC Middleware**

**`injectOrgContext`** - Automatically resolves user's current organization:
```javascript
// Checks x-organization-id header OR user_preferences
// Attaches req.orgContext = {
//   organization_id,
//   name,
//   role,
//   permissions
// }
```

**`requireRole`** - Enforces role-based access:
```javascript
router.get('/admin-only', 
  authenticateToken, 
  injectOrgContext,
  requireRole(['owner', 'admin']), 
  (req, res) => {
    // Only owners and admins can access this
  }
);
```

---

### Frontend Flow

#### 1. **Workspace Manager** (`workspace-manager.js`)
Automatically runs on every page load:
- Fetches user context
- Applies organization branding (logo, name)
- Enforces UI permissions via `data-roles` attributes
- Redirects users to appropriate dashboards

#### 2. **Organization Switcher** (`org-switcher.js`)
Dropdown in the header showing:
- Current organization logo and name
- User's role in that organization
- List of all organizations user belongs to
- "Create Organization" button

#### 3. **Role-Based UI Rendering**
```html
<!-- Only visible to owners and admins -->
<button data-roles="owner, admin" onclick="showSection('finances')">
  Finances
</button>

<!-- Visible to coaches and above -->
<button data-roles="owner, admin, coach" onclick="showSection('players')">
  Players
</button>
```

The Workspace Manager automatically hides elements where the user's role doesn't match.

---

## 📧 Invitation System

### Creating an Invitation

**Admin Dashboard:**
```javascript
// From admin-dashboard.html
async function inviteUser() {
  const orgId = apiService.getCurrentOrg().id;
  
  await apiService.sendInvitation(orgId, {
    email: 'newuser@example.com',
    role: 'coach', // Specific role assignment
    message: 'Welcome to our team!'
  });
}
```

**Backend creates:**
- Unique invitation token
- Email sent with link: `invite-page.html?token=abc123`
- Invitation stored in database

### Accepting an Invitation

**User Flow:**
1. User clicks invitation link
2. `invite-page.html` loads invitation details
3. If not logged in → Redirect to registration with pre-filled email
4. If logged in → Accept invitation
5. User is added to `organization_members` with specified role
6. User is redirected to appropriate dashboard based on role

**Automatic Routing:**
```javascript
// After accepting invitation
const role = invitationData.role;

if (['owner', 'admin', 'coach', 'staff'].includes(role)) {
  window.location.href = 'admin-dashboard.html';
} else {
  window.location.href = 'player-dashboard.html';
}
```

---

## 🎨 UI/UX Features

### Dynamic Branding
```javascript
// Automatically updates on org switch
<h1 class="display-org-name">Elite FC</h1>
<img class="display-org-logo" src="..." />
```

### Role Badges
```javascript
// In org switcher dropdown
Elite FC
└─ Owner  ← Your role badge
```

### Permission-Based Navigation
```javascript
// Dashboard navigation auto-hides based on role
Overview     ← Everyone
Profile      ← owner, admin
Players      ← owner, admin, coach
Finances     ← owner, admin, staff
```

---

## 🚀 Usage Examples

### Example 1: Creating a New Organization
```javascript
// User clicks "Create Organization" button
// Fills out form in create-organization.html
// Backend creates organization
// User is automatically added as 'owner'
// User's current_organization_id is set to new org
// Redirected to admin-dashboard.html
```

### Example 2: Inviting a Coach
```javascript
// Owner/Admin in admin-dashboard.html
await apiService.sendInvitation(currentOrgId, {
  email: 'coach@example.com',
  role: 'coach',
  message: 'Join us as head coach!'
});

// Coach receives email
// Clicks link → invite-page.html
// Accepts → Added as 'coach'
// Redirected to admin-dashboard.html
// Can only see: Overview, Players, Teams, Events, Tactical
```

### Example 3: Multi-Organization User
```javascript
// User belongs to:
// - Elite FC (owner)
// - London Academy (coach)
// - Youth Club (player)

// Header shows org switcher
// User clicks dropdown
// Selects "London Academy"
// Page reloads
// Now sees London Academy branding
// Navigation shows coach-level features only
```

---

## 🔒 Security Features

1. **Backend Validation**
   - All routes check user's role via middleware
   - Database-level role verification
   - Token-based invitation system

2. **Frontend Protection**
   - UI elements hidden based on role
   - Automatic redirects for unauthorized access
   - Context-aware API calls

3. **Invitation Security**
   - Unique tokens with expiration
   - Email verification
   - Role locked at invitation time

---

## 📝 Key Files

### Backend
- `backend/middleware/auth.js` - RBAC middleware
- `backend/routes/organizations.js` - Organization CRUD
- `backend/routes/invitations.js` - Invitation system
- `backend/routes/auth-context.js` - User context & switching

### Frontend
- `frontend/workspace-manager.js` - Role enforcement
- `frontend/org-switcher.js` - Organization switching UI
- `frontend/invite-page.html` - Invitation acceptance
- `frontend/create-organization.html` - Org creation
- `frontend/api-service.js` - API methods

### Database
- `backend/migrations/sqls/20260109000000-unified-account-system-up.sql`

---

## ✅ Benefits

1. **Single Account** - Users don't need multiple logins
2. **Flexible Permissions** - Different roles in different orgs
3. **Seamless Switching** - One-click organization changes
4. **Secure Invitations** - Role-based invite system
5. **Dynamic UI** - Interface adapts to user's role
6. **Scalable** - Easy to add new roles and permissions

---

## 🎯 Next Steps

To use the system:

1. **Create an organization** via `create-organization.html`
2. **Invite members** with specific roles from admin dashboard
3. **Members accept** invitations via email link
4. **Switch organizations** using header dropdown
5. **UI automatically adapts** to show role-appropriate features

The system is now fully operational and ready for multi-organization, role-based access! 🚀
