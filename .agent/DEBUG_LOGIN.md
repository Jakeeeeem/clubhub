# ClubHub Login Credentials & Debug Guide

## 🔑 Login Credentials

### Main Admin User
- **Email:** `demo-admin@clubhub.com`
- **Password:** `password123`
- **Account Type:** Organization (Owner)
- **Access:** Admin Dashboard

---

## 🐛 Current Issue: Dashboard Redirect Loop

### Problem
After logging in, the dashboard redirects back to the home page.

### What We've Done
1. ✅ Disabled automatic role-based redirects in `workspace-manager.js`
2. ✅ Disabled protected page check in `enhanced-login-handler.js`
3. ✅ Added Club/Player toggle to both dashboards
4. ✅ Backend returns only direct memberships (no children's clubs)
5. ✅ Family switcher enabled with club badges

### Possible Causes
1. **Missing organization membership** - User might not have any organizations
2. **Context API failing** - `/auth/context` might be returning empty
3. **Another redirect we haven't found** - There might be another script redirecting

---

## 🧪 Debug Steps

### Step 1: Check if login actually works
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo-admin@clubhub.com","password":"password123"}'
```

**Expected:** Should return a token and user object

### Step 2: Check user's organizations
```bash
# First login to get token, then:
curl http://localhost:3000/api/auth/context \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected:** Should return organizations array with at least one org

### Step 3: Check browser console
1. Open `http://localhost:8000/index.html`
2. Open DevTools (F12)
3. Go to Console tab
4. Login
5. Look for:
   - Any errors (red text)
   - "🚀 Initializing Workspace Manager..."
   - "✅ Workspace context applied..."
   - Any redirect messages

### Step 4: Check localStorage
In browser console after login:
```javascript
console.log('Token:', localStorage.getItem('authToken'));
console.log('User:', localStorage.getItem('currentUser'));
```

**Expected:** Both should have values, not null

---

## 🔧 Quick Fixes to Try

### Fix 1: Reseed the database
```bash
cd c:\Users\Dell\Documents\elitepro\clubhub
docker exec clubhub-backend-1 node seed-live.js
```

### Fix 2: Clear all browser data
1. Open DevTools (F12)
2. Go to Application tab
3. Click "Clear storage"
4. Check all boxes
5. Click "Clear site data"
6. Refresh page

### Fix 3: Use test login page
Create a simple test page that bypasses all the complex logic:

`test-direct-login.html`:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Direct Login Test</title>
</head>
<body>
    <h1>Direct Login Test</h1>
    <button onclick="testLogin()">Test Login</button>
    <div id="result"></div>

    <script>
        async function testLogin() {
            try {
                const response = await fetch('http://localhost:3000/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: 'demo-admin@clubhub.com',
                        password: 'password123'
                    })
                });
                
                const data = await response.json();
                console.log('Login response:', data);
                
                if (data.token) {
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                    document.getElementById('result').innerHTML = 
                        '<p style="color: green;">✅ Login successful!</p>' +
                        '<a href="admin-dashboard.html">Go to Admin Dashboard</a>';
                } else {
                    document.getElementById('result').innerHTML = 
                        '<p style="color: red;">❌ Login failed: ' + (data.error || 'Unknown error') + '</p>';
                }
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('result').innerHTML = 
                    '<p style="color: red;">❌ Error: ' + error.message + '</p>';
            }
        }
    </script>
</body>
</html>
```

---

## 📝 Files Modified

1. `frontend/workspace-manager.js` - Disabled automatic redirects
2. `frontend/enhanced-login-handler.js` - Disabled protected page check
3. `frontend/org-switcher.js` - Cleaned up (no filter needed)
4. `frontend/player-dashboard.js` - Re-enabled family switcher with badges
5. `frontend/styles.css` - Added toggle CSS
6. `frontend/admin-dashboard.html` - Added toggle HTML
7. `frontend/player-dashboard.html` - Added toggle HTML
8. `backend/routes/auth.js` - Returns only direct memberships

---

## 🎯 Next Steps

1. **Check browser console** - What errors appear?
2. **Check localStorage** - Is the token being saved?
3. **Check network tab** - Is `/auth/context` being called? What does it return?
4. **Try test login page** - Does direct login work?

Once we know which of these is failing, we can fix it!
