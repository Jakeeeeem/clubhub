# Demo User Setup for ClubHub

## ✅ What's Been Fixed

1. **Dropdown Text Color**: Changed to black (#000) for better visibility
2. **Super Admin Option**: Added to dropdown as first option 🔐
3. **Demo Credentials Updated**: All pointing to real database users
4. **Better Styling**: Light background for dropdown, improved contrast

## 🎯 Demo User Credentials

### Frontend Login Dropdown
The demo dropdown now has 4 options:
- 🔐 **Super Admin (Platform)** - Full platform access
- 🏢 **Demo Admin (Club Owner)** - Manages "Pro Club Demo"
- ⚽ **Demo Coach** - Coach at "Pro Club Demo"
- 👤 **Demo Player** - Player at "Pro Club Demo"

### Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@clubhub.com` | `Super@123` |
| Club Admin | `admin@proclubdemo.com` | `Admin@123` |
| Coach | `coach@proclubdemo.com` | `Coach@123` |
| Player | `player@proclubdemo.com` | `Player@123` |

## 🗄️ Database Seeding

### Option 1: Run the Node Script (If DB is accessible)

```bash
cd backend
node scripts/seed-demo-users.js
```

This will create all 4 demo users with proper relationships.

### Option 2: Manual Database Insert (If script fails)

1. **Generate Fresh Password Hashes** (optional):
   ```bash
   node backend/scripts/generate-demo-hashes.js
   ```

2. **Use the Generated Hashes**: The script will output bcrypt hashes. Copy them.

3. **Run SQL Manually**: Connect to your PostgreSQL database and run:

```sql
-- 1. Super Admin
INSERT INTO users (email, password_hash, first_name, last_name, account_type, is_platform_admin, email_verified)
VALUES (
  'superadmin@clubhub.com',
  '$2a$10$DbQgrru3aY4tgf9oy36P8.1W4X/HTmdIlR4xnI5p8s1K31CDE8hyq',
  'Super', 'Admin', 'organization', true, true
)
ON CONFLICT (email) DO UPDATE SET is_platform_admin = true;

-- 2. Club Admin
INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified)
VALUES (
  'admin@proclubdemo.com',
  '$2a$10$Qi3zNFyHjSzA2EbjV6BkVucpQNRc8xrWGIEbBCADxlGVNk/wC07Xm',
  'John', 'Smith', 'organization', true
)
ON CONFLICT (email) DO UPDATE SET account_type = 'organization';

-- Get admin user ID for club creation
DO $$
DECLARE admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM users WHERE email = 'admin@proclubdemo.com';
  
  -- Create club
  INSERT INTO clubs (name, sport, description, location, contact_email, contact_phone, owner_id, member_count)
  VALUES (
    'Pro Club Demo', 'Football',
    'Premier demo football club showcasing ClubHub features',
    'London, UK', 'admin@proclubdemo.com', '+44 20 1234 5678',
    admin_id, 25
  )
  ON CONFLICT (owner_id) DO UPDATE SET name = 'Pro Club Demo';
END $$;

-- Continue with Coach and Player following the same pattern...
-- See backend/scripts/seed-demo-users.sql for full script
```

## ✨ What Gets Created

### 1. Super Admin
- Platform-level administrator
- Can access super-admin dashboard
- Full system control

### 2. Club: "Pro Club Demo"
- Football club in London
- 25 members
- Team: "Under 18s" (U18)

### 3. Staff & Roles
- **John Smith** (Admin/Owner)
- **Michael Thompson** (Coach) - Assigned to U18 team

### 4. Players
- **David Williams** (Player/Forward)
  - Born: 2006-05-15
  - Position: Forward
  - Assigned to U18 team
  - Monthly fee: £50

## 🎨 UI Changes Made

### index.html
- Dropdown background: `rgba(255, 255, 255, 0.95)` (light/visible)
- Text color: `#000` (black)
- Added font-weight: 500 for better readability
- Options have explicit `color: #000; background: #fff;`

### enhanced-login-handler.js
- Added `superadmin` case to quickLogin function
- Updated all demo emails to match seeded users
- Better error handling with notifications

## 🧪 Testing the Demo

1. **Open the login modal** on homepage
2. **Select a demo user** from dropdown
3. **Click "Try Demo"**
4. **You should be logged in automatically**

Each demo user goes to their appropriate dashboard:
- Super Admin → `/super-admin-dashboard.html`
- Club Admin → `/admin-dashboard.html`
- Coach → `/admin-dashboard.html` (with coach permissions)
- Player → `/player-dashboard.html`

## 🔧 Troubleshooting

### Demo login not working?
1. Check browser console for errors
2. Verify users exist in database
3. Ensure passwords match (case-sensitive)
4. Clear localStorage and try again

### Can't run seed script?
1. Check database connection in `.env`
2. Ensure PostgreSQL is running
3. Verify user has CREATE permissions
4. Use manual SQL insert method instead

### Dropdown text not visible?
- Clear browser cache
- Hard refresh (Ctrl+F5 / Cmd+Shift+R)
- Check if styles.css loaded correctly

## 📝 Files Modified

- `frontend/index.html` - Dropdown styling and super admin option
- `frontend/enhanced-login-handler.js` - Updated demo credentials
- `backend/scripts/seed-demo-users.js` - Database seed script
- `backend/scripts/generate-demo-hashes.js` - Password hash generator
- `backend/scripts/seed-demo-users.sql` - Manual SQL script

## 🚀 Quick Start

```bash
# 1. Seed the database
node backend/scripts/seed-demo-users.js

# 2. Start the server (if not running)
npm run dev

# 3. Open browser
# Navigate to http://localhost:3000

# 4. Click "Login" → Select demo user → Click "Try Demo"
```

## ✅ Success Indicators

When seeding works, you should see:
```
🌱 Starting demo user seed...

👑 Creating Super Admin...
   ✅ Super Admin created: superadmin@clubhub.com
   
🏢 Creating Club Admin & Organization...
   ✅ Admin user created: admin@proclubdemo.com
   ✅ Club created: Pro Club Demo
   ✅ Team created: Under 18s
   
⚽ Creating Coach...
   ✅ Coach user created: coach@proclubdemo.com
   ✅ Coach assigned to Pro Club Demo
   ✅ Coach assigned to team
   
👤 Creating Player...
   ✅ Player user created: player@proclubdemo.com
   ✅ Player added to Pro Club Demo
   ✅ Player assigned to team

✨ Demo users seeded successfully!
```

---

**Note**: If the automated script fails due to database connection issues, use the manual SQL approach or contact your database administrator to run the seed script directly.
