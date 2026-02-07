# Manual Testing Guide - ClubHub

## Prerequisites
- ✅ Backend running (`npm start` or Docker)
- ✅ Frontend accessible
- ✅ Database initialized
- ✅ Email service configured (SendPulse)

---

## Test 1: Super Admin Onboarding a New Club

### Steps:
1. **Login as Super Admin**
   - Navigate to: `/super-admin-dashboard.html`
   - Use super admin credentials
   
2. **Onboard New Club**
   - Click "Onboard New Club" button
   - Fill in form:
     - First Name: `Test`
     - Last Name: `Coach`
     - Email: `testcoach@example.com`
     - Club Name: `Test FC`
     - Sport: `Football`
     - Location: `London`
   - Click "Onboard Club"

3. **Verify Success**
   - ✅ Success message appears
   - ✅ Email sent to `testcoach@example.com` with login credentials
   - ✅ New club appears in clubs list

---

## Test 2: Manual Public Signup (Parent/Player)

### Steps:
1. **Navigate to Homepage**
   - Go to: `/index.html` or `/`
   
2. **Click "Sign Up" or "Register"**
   
3. **Fill Registration Form**
   - Account Type: `Parent/Guardian`
   - First Name: `John`
   - Last Name: `Doe`
   - Email: `johndoe@example.com`
   - Password: `SecurePass123!`
   - Confirm Password: `SecurePass123!`

4. **Submit Form**

5. **Verify Success**
   - ✅ Redirected to dashboard or confirmation page
   - ✅ Welcome email sent to `johndoe@example.com`
   - ✅ Can login with credentials

---

## Test 3: Manual Public Signup (Club/Organization)

### Steps:
1. **Navigate to Homepage**
   - Go to: `/index.html`
   
2. **Click "Sign Up as Club/Organization"**
   
3. **Fill Registration Form**
   - Account Type: `Organization`
   - First Name: `Club`
   - Last Name: `Owner`
   - Email: `clubowner@example.com`
   - Password: `SecurePass123!`
   - Club Name: `Demo Sports Club`
   - Sport Types: `Football`, `Basketball`

4. **Submit Form**

5. **Verify Success**
   - ✅ Account created
   - ✅ Organization created
   - ✅ Welcome email sent
   - ✅ Can login and access admin dashboard

---

## Test 4: Stripe Connect Account Linking

### Steps:
1. **Login as Club Owner**
   - Use credentials from Test 2 or Test 3
   
2. **Navigate to Settings/Payments**
   - Look for "Connect Stripe Account" button
   
3. **Click "Connect Stripe Account"**
   - ✅ Stripe Connect window opens
   - ✅ Can see Stripe onboarding form
   
4. **Complete Stripe Onboarding** (Optional - use test account)
   - Fill in test business details
   - Complete verification steps
   
5. **Verify Success**
   - ✅ Redirected back to dashboard
   - ✅ "Connected" status shown
   - ✅ Can now create payment plans

---

## Test 5: Generate and Send Invite

### Steps:
1. **Login as Club Owner/Coach**
   
2. **Navigate to Members/Players Section**
   
3. **Click "Invite Player" or "Generate Invite"**
   
4. **Fill Invite Form**
   - **Option A: Email Invite**
     - Email: `newplayer@example.com`
     - First Name: `New`
     - Last Name: `Player`
     - Role: `Player`
     - Team: (Optional)
   
   - **Option B: Shareable Link**
     - Role: `Player`
     - Check "Generate shareable link"

5. **Send/Generate Invite**

6. **Verify Success**
   - ✅ Success message appears
   - ✅ For email invite: Email sent to recipient
   - ✅ For shareable link: Link displayed and can be copied
   - ✅ Invite appears in "Pending Invites" list

---

## Test 6: Accept Invite (Email Invite)

### Steps:
1. **Check Email** (`newplayer@example.com`)
   - Open invite email
   - Click invite link
   
2. **Redirected to Invite Page**
   - See club details
   - See role being offered
   
3. **Sign Up or Login**
   - If new user: Complete registration
   - If existing user: Login
   
4. **Accept Invite**
   - Review terms
   - Click "Accept Invite"

5. **Verify Success**
   - ✅ Success message: "You've joined [Club Name]!"
   - ✅ Redirected to player dashboard
   - ✅ Club appears in "My Clubs" list
   - ✅ Can see team assignments (if any)

---

## Test 7: Accept Invite (Shareable Link)

### Steps:
1. **Copy Shareable Link** (from Test 5)
   
2. **Open Link in Incognito/New Browser**
   
3. **View Invite Details**
   - See club information
   - See role being offered
   
4. **Sign Up or Login**
   - Create new account or use existing
   
5. **Accept Invite**
   - Click "Join Club"

6. **Verify Success**
   - ✅ Successfully joined club
   - ✅ Appears in club members list
   - ✅ Can access club-specific features

---

## Test 8: Login Flow

### Steps:
1. **Navigate to Login Page**
   - Go to: `/login.html`
   
2. **Enter Credentials**
   - Email: (from any previous test)
   - Password: (from any previous test)
   
3. **Click "Login"**

4. **Verify Success**
   - ✅ Redirected to appropriate dashboard:
     - Super Admin → Super Admin Dashboard
     - Club Owner → Admin Dashboard
     - Player → Player Dashboard
   - ✅ Can see user-specific data
   - ✅ Can navigate to different sections

---

## Test 9: Email Verification

### Steps:
1. **Check Email Service**
   ```bash
   node test-email.js your-email@example.com
   ```

2. **Verify**
   - ✅ Connection successful
   - ✅ Test email received

---

## Expected Results Summary

| Test | Expected Result | Status |
|------|----------------|--------|
| Super Admin Onboarding | Club created, email sent | ⬜ |
| Public Signup (Parent) | Account created, can login | ⬜ |
| Public Signup (Club) | Org created, can login | ⬜ |
| Stripe Connect | Window opens, can link | ⬜ |
| Generate Email Invite | Invite sent, appears in list | ⬜ |
| Generate Shareable Link | Link created, copyable | ⬜ |
| Accept Email Invite | Joined club, dashboard access | ⬜ |
| Accept Shareable Invite | Joined club, dashboard access | ⬜ |
| Login Flow | Correct dashboard shown | ⬜ |
| Email Service | Test email received | ⬜ |

---

## Troubleshooting

### Issue: Email not received
- Check spam folder
- Verify SendPulse configuration in `.env`
- Run `node test-email.js` to verify connection

### Issue: Stripe Connect window doesn't open
- Check browser console for errors
- Verify `STRIPE_PUBLISHABLE_KEY` in frontend config
- Check network tab for failed requests

### Issue: Can't login after signup
- Check database for user creation
- Verify password meets requirements
- Check browser console for errors

### Issue: Invite link doesn't work
- Verify invite token in database
- Check invite hasn't expired
- Ensure user is logged in (for accept)

---

## Quick Test Credentials

After running tests, you should have:

**Super Admin:**
- Email: (from your database seed)
- Password: (from your database seed)

**Test Coach (from Test 1):**
- Email: `testcoach@example.com`
- Password: (sent via email)

**Test Parent (from Test 2):**
- Email: `johndoe@example.com`
- Password: `SecurePass123!`

**Test Club Owner (from Test 3):**
- Email: `clubowner@example.com`
- Password: `SecurePass123!`
