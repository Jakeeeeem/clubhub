# Developer Commands Cheat Sheet

This file contains essential commands for developing, testing, and maintaining the ClubHub application.

## 🚀 Common Commands

### Start Entire Stack (Dev Mode)
Runs the backend API and serves the frontend on port 3000.
```bash
npm run dev
```
*Access the app at: http://localhost:3000*

---

## 🛠️ Data & Seeding

### Seed Database (Demo Data)
Populates the database with a multi-tenant demo environment:
- **Organizations**: Elite Pro Academy, Sunday League FC
- **Users**: Admin, Coaches, Players
- **Data**: Events, Payment Plans, Teams, Rosters
```bash
node backend/seed-live.js
```
*Note: This script handles clearing existing conflicting data before insertion.*

### Reset Database Schema
**⚠️ WARNING: DESTRUCTIVE ACTION**
Drops and recreates all tables.
```bash
psql -U postgres -d clubhub -f backend/database-schema.sql
```

---

## 📧 Email Testing

### Test Email Templates
Runs a dry-run test of all system email templates (Welcome, Invite, Payment, etc.).
Checks for template syntax errors and configuration validity.
```bash
node backend/test-email-templates.js
```

### Verify Link Generation
Tests the token generation and link construction logic for password resets and invites.
```bash
node backend/verify-links.js
```

---

## 🔧 Backend Maintenance

### Restart Backend Service (Docker)
If running via Docker Compose, use this to apply backend code changes.
```bash
docker-compose restart backend
```

### Verify Environment Variables
Check if .env is correctly loaded (good for debugging API keys).
```bash
node backend/test-email.js
```
