# ClubHub: Unified Account System Migration Plan

## 🎯 Overview

Migrate from account-type-based system to a unified account + organization-based system (like Stripe, Slack, GitHub).

---

## 📊 Current vs Proposed Architecture

### **Current System:**
```
User
├── account_type: 'adult' | 'organization' | 'player'
└── Belongs to ONE club (if any)
```

**Problems:**
- User can only be ONE type
- Can't be a player in one club and coach in another
- Hard to manage multi-club scenarios
- Complex role switching

### **Proposed System:**
```
User (Unified Account)
├── email (unique)
├── name
└── Organizations (Memberships)
    ├── Club A
    │   └── Role: 'player'
    ├── Club B
    │   └── Role: 'coach'
    └── Club C (Owner)
        └── Role: 'admin'
```

**Benefits:**
- ✅ One account, multiple roles
- ✅ Easy to switch between clubs
- ✅ Invite-based system
- ✅ Clear permission hierarchy
- ✅ Scalable for future features

---

## 🗄️ New Database Schema

### **1. Users Table (Simplified)**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    phone VARCHAR(20),
    date_of_birth DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);
```

### **2. Organizations Table (Clubs)**
```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,  -- For URLs: clubhub.com/elite-fc
    description TEXT,
    logo_url VARCHAR(500),
    sport VARCHAR(100),
    location VARCHAR(255),
    website VARCHAR(255),
    established VARCHAR(4),
    stripe_account_id VARCHAR(255),
    owner_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **3. Organization Members (The Key Table)**
```sql
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'owner',           -- Full control
        'admin',           -- Manage club, can't delete
        'coach',           -- Manage teams, players
        'assistant_coach', -- Limited team management
        'player',          -- Player access
        'parent',          -- Parent/guardian access
        'staff',           -- General staff
        'viewer'           -- Read-only access
    )),
    permissions JSONB,     -- Custom permissions per member
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(organization_id, user_id)
);
```

### **4. Invitations Table**
```sql
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    invited_by UUID NOT NULL REFERENCES users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE
);
```

---

## 🔄 Migration Strategy

### **Phase 1: Database Migration (Non-Breaking)**

1. **Create new tables** (organizations, organization_members, invitations)
2. **Migrate existing data**:
   ```sql
   -- Migrate clubs to organizations
   INSERT INTO organizations (id, name, slug, owner_id, ...)
   SELECT id, name, LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-')), owner_id, ...
   FROM clubs;

   -- Migrate club owners as organization owners
   INSERT INTO organization_members (organization_id, user_id, role, status)
   SELECT c.id, c.owner_id, 'owner', 'active'
   FROM clubs c;

   -- Migrate players as organization members
   INSERT INTO organization_members (organization_id, user_id, role, status)
   SELECT p.club_id, p.user_id, 'player', 'active'
   FROM players p
   WHERE p.user_id IS NOT NULL;

   -- Migrate staff as organization members
   INSERT INTO organization_members (organization_id, user_id, role, status)
   SELECT s.club_id, s.user_id, s.role, 'active'
   FROM staff s
   WHERE s.user_id IS NOT NULL;
   ```

3. **Keep old tables** for rollback safety

### **Phase 2: Backend API Updates**

1. **New Authentication Flow**:
   ```javascript
   // Login returns user + their organizations
   POST /api/auth/login
   Response: {
     user: { id, email, name },
     organizations: [
       { id, name, role: 'player', slug: 'elite-fc' },
       { id, name, role: 'coach', slug: 'youth-academy' }
     ],
     currentOrganization: { ... }  // Last selected or primary
   }
   ```

2. **Organization Switching**:
   ```javascript
   POST /api/auth/switch-organization/:orgId
   // Updates session to use this organization context
   ```

3. **Invitation System**:
   ```javascript
   POST /api/organizations/:orgId/invite
   Body: { email, role }
   // Sends email with magic link

   POST /api/invitations/:token/accept
   // Accepts invitation, adds user to organization
   ```

### **Phase 3: Frontend Updates**

1. **Organization Selector** (like Stripe):
   ```
   [Header]
   ┌─────────────────────────────┐
   │ Elite FC ▼                  │  ← Dropdown to switch
   │   • Elite FC (Admin)        │
   │   • Youth Academy (Coach)   │
   │   • Training Camp (Player)  │
   └─────────────────────────────┘
   ```

2. **Unified Dashboard**:
   - Same dashboard for everyone
   - Content changes based on role
   - Role-based UI elements

3. **Invitation Flow**:
   ```
   User clicks invite link
   → If not logged in: Sign up/Login
   → If logged in: "Join [Club Name] as [Role]?"
   → Accept → Added to organization
   ```

---

## 🎨 User Experience Improvements

### **1. Single Sign-Up**
```
Sign Up
├── Email
├── Password
├── Name
└── Done! ✅
```
No more choosing account type upfront

### **2. Join/Create Organizations**
```
After signup:
┌──────────────────────────────┐
│ Welcome, John!               │
│                              │
│ [Create Organization]        │
│ [Join with Invite Code]      │
└──────────────────────────────┘
```

### **3. Role-Based Dashboards**
```
Same URL: /dashboard

If role = 'admin':
  → Show admin features

If role = 'coach':
  → Show team management

If role = 'player':
  → Show player features
```

---

## 🔐 Permission System

### **Role Hierarchy**
```
owner > admin > coach > assistant_coach > staff > player > parent > viewer
```

### **Permission Examples**
```javascript
const PERMISSIONS = {
  owner: ['*'],  // All permissions
  admin: [
    'manage_members',
    'manage_teams',
    'manage_events',
    'view_finances',
    'manage_settings'
  ],
  coach: [
    'manage_team',
    'view_players',
    'create_events',
    'view_attendance'
  ],
  player: [
    'view_schedule',
    'rsvp_events',
    'view_stats'
  ]
};
```

---

## 📋 Implementation Checklist

### **Backend**
- [ ] Create migration for new tables
- [ ] Migrate existing data
- [ ] Update authentication endpoints
- [ ] Add organization switching
- [ ] Implement invitation system
- [ ] Add permission middleware
- [ ] Update all routes to use organization context

### **Frontend**
- [ ] Remove account type selection from signup
- [ ] Add organization selector in header
- [ ] Update dashboard to be role-aware
- [ ] Create invitation acceptance flow
- [ ] Add organization management UI
- [ ] Update all API calls to include organization context

### **Testing**
- [ ] Test multi-organization scenarios
- [ ] Test role switching
- [ ] Test invitation flow
- [ ] Test permission boundaries
- [ ] Test data migration

---

## 🚀 Rollout Plan

### **Week 1: Preparation**
- Create new database schema
- Write migration scripts
- Test migration on staging database

### **Week 2: Backend**
- Implement new API endpoints
- Update authentication
- Add backward compatibility layer

### **Week 3: Frontend**
- Update UI components
- Add organization selector
- Implement invitation flow

### **Week 4: Testing & Migration**
- Test thoroughly
- Run migration on production
- Monitor for issues
- Gradual rollout to users

---

## 💡 Additional Features Enabled

Once this is in place, you can easily add:

1. **Team Collaboration**
   - Multiple coaches per team
   - Assistant coaches with limited permissions

2. **Parent Access**
   - Parents can view their child's stats
   - Multiple children support

3. **Multi-Club Players**
   - Players can be in multiple clubs
   - Different roles in different clubs

4. **Guest Access**
   - Scouts can be invited as viewers
   - Temporary access for trials

5. **Organization Settings**
   - Per-organization branding
   - Custom domains
   - White-labeling

---

## 🔄 Backward Compatibility

During transition:
- Keep old `account_type` field
- Map to new system:
  ```javascript
  if (user.account_type === 'organization') {
    // User is owner of their club
    role = 'owner';
  } else if (user.account_type === 'adult') {
    // Check their memberships
    role = user.memberships[0]?.role || 'player';
  }
  ```

---

## 📊 Example User Flows

### **Flow 1: New User Signs Up**
1. User signs up with email/password
2. Sees: "Create your organization" or "Join with invite"
3. Creates "Elite FC"
4. Becomes owner of Elite FC
5. Can invite players, coaches, etc.

### **Flow 2: Invited Player**
1. Receives email: "You've been invited to Elite FC as a Player"
2. Clicks link
3. If no account: Signs up
4. If has account: Logs in
5. Accepts invitation
6. Now member of Elite FC with player role

### **Flow 3: Multi-Club Coach**
1. User is already a player at Club A
2. Gets invited as coach to Club B
3. Accepts invitation
4. Now has 2 organizations:
   - Club A (Player)
   - Club B (Coach)
5. Can switch between them in header dropdown

---

## 🎯 Recommendation

**YES, absolutely implement this!** It's a much better architecture that:
- ✅ Scales better
- ✅ More intuitive for users
- ✅ Industry standard (Stripe, Slack, GitHub all use this)
- ✅ Enables future features
- ✅ Cleaner codebase

**Start with Phase 1** (database migration) and we can roll it out gradually without breaking existing functionality.

Want me to start implementing this? I can begin with the database migration scripts!
