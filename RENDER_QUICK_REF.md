# ⚡ Quick Reference: Demo Users on Render

## ✅ YES! Migrations Run Automatically

Your `server.js` already runs migrations on startup:
```javascript
await runMigrations(); // Line 235
```

## 🌱 To Seed Demo Users on Render

### Method 1: Environment Variable (Best)
1. Render Dashboard → Your Service → **Environment**
2. Add: `SEED_DEMO_USERS` = `true`
3. Save → Auto redeploys
4. ✅ Done!

### Method 2: Render Shell (One-time)
1. Render Dashboard → **Shell** tab
2. Run: `node backend/scripts/seed-demo-users.js`
3. ✅ Done!

## 🔑 What Gets Created

| User | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@clubhub.com | Super@123 |
| Club Admin | admin@proclubdemo.com | Admin@123 |
| Coach | coach@proclubdemo.com | Coach@123 |
| Player | player@proclubdemo.com | Player@123 |

Plus:
- ✅ Club: "Pro Club Demo"
- ✅ Team: "Under 18s"
- ✅ All relationships configured

## 📋 Deployment Flow

```
Push to GitHub
    ↓
Render Build
    ↓
npm install
    ↓
Start server.js
    ↓
Connect to DB
    ↓
Run Migrations ✅ (Automatic)
    ↓
Seed Demo Users ✅ (If SEED_DEMO_USERS=true)
    ↓
Start API Server
    ↓
🎉 LIVE!
```

## 🎯 Testing

1. Go to your Render URL
2. Click Login
3. Select demo user from dropdown
4. Click "Try Demo"
5. Auto-logged in! ✅

## 📝 Notes

- Migrations = Always automatic ✅
- Demo seeding = Only if `SEED_DEMO_USERS=true`
- Safe to run multiple times (uses `ON CONFLICT`)
- Check Render logs for confirmation

---

**Pro Tip**: After demo users are created, remove the `SEED_DEMO_USERS` variable to prevent re-seeding on every deploy!
