# Club Invite Flow - Complete Explanation

## How the Invite System Works

### **Flow Overview:**

There are **TWO different paths** depending on whether the user is logged in or not:

---

## 🔐 **Path 1: User is NOT Logged In**

When a user clicks an invite link but is NOT logged in:

### Step 1: Invite Page Shows "Login Required"
- User sees a message: "You need to be logged in to accept this club invitation"
- Two buttons appear:
  - **"Login to ClubHub"** (for existing users)
  - **"Create Account"** (for new users)

### Step 2A: If User Clicks "Login to ClubHub"
1. Invite token is stored in `localStorage` as `pendingInviteToken`
2. User is redirected to homepage login modal
3. User enters their credentials and logs in
4. **After successful login**, the system:
   - Detects the `pendingInviteToken` in localStorage
   - **Automatically calls the API** to accept the invitation
   - API endpoint: `POST /api/invites/accept/{token}`
   - The backend adds them to the club in the database
5. User sees success message: "Welcome to {Club Name}!"
6. User is redirected to their dashboard

### Step 2B: If User Clicks "Create Account"
1. Invite token is stored in `localStorage` as `pendingInviteToken`
2. User is redirected to homepage signup modal
3. User fills out registration form and creates account
4. **After successful signup**, the system:
   - Detects the `pendingInviteToken` in localStorage
   - **Automatically calls the API** to accept the invitation
   - API endpoint: `POST /api/invites/accept/{token}`
   - The backend adds them to the club in the database
5. User sees success message: "Welcome to {Club Name}! Your account has been created."
6. User is redirected to player dashboard

---

## ✅ **Path 2: User IS Already Logged In**

When a user clicks an invite link and IS logged in:

### Step 1: Invite Details Page Shows
- User sees full club information
- Club name, location, sport
- Their assigned role (e.g., "Player")
- Personal message from inviter (if any)
- Club membership terms

### Step 2: User Accepts Terms
- User checks the "I accept the club membership terms and conditions" checkbox
- "Accept & Join Club" button becomes enabled

### Step 3: User Clicks "Accept & Join Club"
1. **JavaScript calls the API directly** from the invite page
2. API endpoint: `POST /api/invites/accept/{token}`
3. Request includes: `{ acceptTerms: true }`
4. **Backend processes the invitation**:
   - Validates the token
   - Checks if invite is still valid (not expired)
   - Adds user to the club in `organization_members` table
   - Assigns the role specified in the invite
   - Marks invite as "accepted"
5. Success message appears: "Welcome Aboard! 🎉"
6. User is redirected to appropriate dashboard

---

## 🔑 **Key Technical Points:**

### **Does the Backend Need the Email?**
**YES!** The backend needs the email for validation:

1. **For email invites** (non-public):
   - The invite is tied to a specific email address
   - Backend checks: `invite.email === currentUser.email`
   - If emails don't match, user sees error

2. **For shareable/public invites**:
   - No email validation required
   - Anyone with the link can join
   - Backend just checks if token is valid

### **Where Does the Email Come From?**
- **From the auth token!** When user logs in/signs up, they get a JWT token
- The token is sent in the `Authorization` header: `Bearer {token}`
- Backend decodes the token to get the user's ID and email
- Backend uses this to verify the user and add them to the club

### **What Happens in the Database?**
When the accept API is called, the backend:

```sql
-- 1. Validates the invite token
SELECT * FROM club_invites WHERE token = '{token}' AND status = 'pending'

-- 2. Checks if not expired
WHERE expires_at > NOW()

-- 3. Adds user to organization_members
INSERT INTO organization_members (
  organization_id,
  user_id,
  role,
  status
) VALUES (
  {club_id},
  {user_id_from_token},
  {role_from_invite},
  'active'
)

-- 4. Updates invite status
UPDATE club_invites SET status = 'accepted' WHERE token = '{token}'
```

---

## 🎯 **Summary:**

### **Not Logged In:**
1. Click invite link → Store token → Login/Signup
2. **Auto-accept happens in JavaScript** after auth
3. API call made with new auth token
4. Backend adds user to club

### **Already Logged In:**
1. Click invite link → See invite details
2. Check terms → Click "Accept & Join Club"
3. **Accept happens immediately** via API call
4. Backend validates and adds user to club

### **In Both Cases:**
- The **backend always handles the actual database changes**
- The **frontend just triggers the API call**
- The **email comes from the auth token**, not the form
- The **invite token** links everything together

---

## 🐛 **Fixed Issues:**

1. ✅ Success/Error messages now hidden by default (`display: none`)
2. ✅ Error message has proper margin-top spacing
3. ✅ All text colors use proper CSS variables (light text on dark background)
4. ✅ Terms checkbox text is now bright and readable
5. ✅ Success message uses green theme, error uses red theme
6. ✅ Both messages have proper borders and backgrounds
