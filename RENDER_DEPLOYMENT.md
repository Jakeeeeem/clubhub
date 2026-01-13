# 🚀 Render Deployment Guide for ClubHub

## ✅ Your Setup is Correct!

Yes, Render will automatically run migrations when your app starts. The `server.js` file has this:

```javascript
// Run pending migrations
const { runMigrations } = require('./services/migration-service');
await runMigrations();
```

This runs **automatically on every deployment** before the server starts.

## 🌱 Demo Users - Auto-Seeding on Render

I've added demo user seeding to your startup process. It will run automatically **AFTER** migrations.

### How It Works

1. **Migrations run** → Creates all tables
2. **Demo seeding runs** → Creates 4 demo users (if `SEED_DEMO_USERS=true`)
3. **Server starts** → Ready to use!

### Enable Demo Seeding on Render

In your Render dashboard:

**Web Service → Environment → Environment Variables**

Add this variable:

```
SEED_DEMO_USERS=true
```

Then **redeploy** (or it will auto-deploy on next push).

### What Gets Created

✅ 4 demo users:
- **Super Admin**: `superadmin@clubhub.com` / `Super@123`
- **Club Admin**: `admin@proclubdemo.com` / `Admin@123`
- **Coach**: `coach@proclubdemo.com` / `Coach@123`
- **Player**: `player@proclubdemo.com` / `Player@123`

✅ Demo club: "Pro Club Demo"
✅ Demo team: "Under 18s"
✅ All relationships (staff, players, team assignments)

## 📋 Render Environment Variables You Need

Make sure these are set in Render:

### Required
```bash
# Database (Render auto-populates this from your PostgreSQL service)
DATABASE_URL=<your-postgres-connection-string>

# OR individual vars
DB_HOST=<render-postgres-hostname>
DB_PORT=5432
DB_NAME=<database-name>
DB_USER=<database-user>
DB_PASSWORD=<database-password>

# Environment
NODE_ENV=production

# Frontend URL
FRONTEND_URL=https://your-frontend-url.onrender.com

# Stripe Keys
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# JWT Secret
JWT_SECRET=<your-secret-key>
```

### Optional - Demo Users
```bash
# Set to true to seed demo users on deployment
SEED_DEMO_USERS=true

# Or for development auto-seeding
AUTO_SEED=true
```

## 🔄 Deployment Flow on Render

Every time you push to your connected branch:

1. **Build Phase**
   - `npm install` (installs dependencies)
   - Your build command runs (if any)

2. **Start Phase**
   - Runs start command: `node backend/server.js`
   - Server starts up:
     - ✅ Connects to database
     - ✅ Runs migrations automatically
     - ✅ Seeds demo users (if `SEED_DEMO_USERS=true`)
     - ✅ Starts billing scheduler
     - ✅ Server listens on port

3. **Ready** 🎉
   - Your app is live!
   - Demo users ready to login

## 🎯 To Deploy Demo Users RIGHT NOW

### Option 1: Environment Variable (Recommended)

1. Go to Render Dashboard
2. Select your Web Service
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add: `SEED_DEMO_USERS` = `true`
6. Click **Save Changes**
7. Render will auto-redeploy
8. Check logs to confirm: `✅ Demo users seeded successfully`

### Option 2: Manual Deployment Trigger

1. Go to **Manual Deploy** tab
2. Click **Deploy latest commit**
3. Watch logs for seeding message

### Option 3: Shell Access (One-Time)

1. In Render dashboard, click **Shell** tab
2. Run:
   ```bash
   node backend/scripts/seed-demo-users.js
   ```
3. Done! (Only needs to run once)

## 📊 Checking If It Worked

### In Render Logs
Look for these messages:
```
🌱 Seeding demo users...
👑 Creating Super Admin...
   ✅ Super Admin created: superadmin@clubhub.com
🏢 Creating Club Admin & Organization...
   ✅ Admin user created: admin@proclubdemo.com
   ✅ Club created: Pro Club Demo
⚽ Creating Coach...
   ✅ Coach user created: coach@proclubdemo.com
👤 Creating Player...
   ✅ Player user created: player@proclubdemo.com
✅ Demo users seeded successfully
```

### In Your App
1. Go to your deployed frontend URL
2. Click **Login**
3. Demo dropdown should show:
   - 🔐 Super Admin (Platform)
   - 🏢 Demo Admin (Club Owner)
   - ⚽ Demo Coach
   - 👤 Demo Player
4. Select one and click **Try Demo**
5. Should log in automatically!

## ⚙️ Your Render Service Configuration

### Build Settings
```yaml
Build Command: npm install
Start Command: node backend/server.js
Node Version: 18.x or higher
```

### Health Check Path
```
/api/health
```

This ensures Render knows your service is running correctly.

## 🔧 Troubleshooting

### "Demo seeding failed"
- **Cause**: Users might already exist
- **Solution**: This is normal! The script uses `ON CONFLICT DO UPDATE`, so it's safe to run multiple times

### "Database connection failed"
- **Cause**: `DATABASE_URL` not set correctly
- **Solution**: Check Environment Variables in Render dashboard

### "Migration failed"
- **Cause**: Database schema issues
- **Solution**: Check Render logs for specific error, may need to reset database

### Users exist but can't login
- **Cause**: Password hashes don't match
- **Solution**: Delete users and re-run seed, or check password is exactly: `Super@123` etc.

## 📁 Render Deploy Configuration

You can also create a `render.yaml` for Infrastructure as Code:

```yaml
services:
  - type: web
    name: clubhub-backend
    env: node
    region: frankfurt # or your preferred region
    plan: starter
    buildCommand: npm install
    startCommand: node backend/server.js
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: SEED_DEMO_USERS
        value: true
      - fromDatabase:
          name: clubhub-db
          property: connectionString
        key: DATABASE_URL

databases:
  - name: clubhub-db
    databaseName: clubhub
    user: clubhub
    plan: starter
```

## 🎉 Quick Start Checklist

- [ ] PostgreSQL database created on Render
- [ ] Web service connected to GitHub repo
- [ ] Environment variables configured
- [ ] `SEED_DEMO_USERS=true` added to environment
- [ ] Deploy triggered
- [ ] Check logs for successful seeding
- [ ] Test demo login on live site

## 🔐 Security Notes

### Production Considerations

1. **Change demo passwords** after testing (or disable seeding)
2. **Don't use demo accounts** in production long-term
3. **Set strong `JWT_SECRET`** in environment variables
4. **Use production Stripe keys** (not test keys)
5. **Enable database backups** in Render

### Disable Seeding After Setup

Once demo users are created, you can:

1. Remove `SEED_DEMO_USERS` environment variable
2. Or set it to `false`
3. Demo users will remain in database but won't re-seed

## 📞 Support

If seeding fails:
1. Check Render logs for specific error
2. Verify database connection
3. Try running seed script manually via Render Shell
4. Check that `backend/scripts/seed-demo-users.js` exists in deployment

---

**TL;DR**: 
- ✅ Migrations run automatically on every deploy
- ✅ Add `SEED_DEMO_USERS=true` to Render environment variables
- ✅ Redeploy and check logs
- ✅ Demo users ready to use!
