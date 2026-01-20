# ClubHub - Complete Setup & Seed Guide

## 🚀 Quick Start with Docker

### Option 1: Automated Setup (Recommended)
```bash
./start-docker.sh
```

This will:
- Start all Docker containers (database, backend, frontend, pgadmin)
- Wait for database to be ready
- Automatically seed with complete test data
- Show you all login credentials

### Option 2: Manual Setup
```bash
# Start Docker containers
docker-compose up -d

# Wait for database to be ready (about 10 seconds)
sleep 10

# Seed the database
docker-compose exec -T db psql -U clubhub_dev_db_user -d clubhub_dev_db < seed-complete.sql
```

## 📋 Test Accounts

### Club Owner
- **Email:** `clubowner@demo.com`
- **Password:** `Demo@123`
- **Access:** Admin Dashboard with full club management

### Parent Accounts (with children)
- **parent1@demo.com** - Has 2 children: Oliver (U12s) & Emma (U14s)
- **parent2@demo.com** - Has 1 child: Noah (U16s)
- **parent3@demo.com** - Has 1 child: Sophia (U12s)
- **Password:** `Demo@123` (all accounts)

## 🎯 What's Included in the Seed Data

✅ **1 Club:** Elite Youth Academy  
✅ **3 Teams:** Under 12s, Under 14s, Under 16s  
✅ **4 Players:** All assigned to teams with jersey numbers  
✅ **4 Events:**
   - Weekly Training Session (U12s)
   - League Match (U14s vs City Rovers)
   - Summer Skills Camp (Paid event - £75)
   - Talent ID Day (Paid event - £25)

✅ **2 Event Bookings:**
   - Oliver booked for Summer Camp (Paid)
   - Noah booked for Talent ID (Pending)

✅ **4 Payments:**
   - Monthly fees (some paid, some pending)
   - Event booking payments

✅ **3 Recruitment Listings:**
   - U12 Striker Needed
   - U14 Central Midfielder
   - U16 Centre Back Required

## 🌐 Access URLs

- **Frontend:** http://localhost:8081
- **Backend API:** http://localhost:3000
- **PgAdmin:** http://localhost:5050
  - Email: `admin@local`
  - Password: `admin`

## 🧪 Testing the Family Member Feature

1. Login as `parent1@demo.com`
2. Go to **Player Dashboard**
3. Click **Family** tab - you'll see Oliver and Emma
4. Click the **profile switcher** in the header (top right)
5. Switch between "Parent View", "Oliver Anderson", and "Emma Anderson"
6. Each profile shows ONLY their own data:
   - Oliver sees his U12s team, training sessions, Summer Camp booking
   - Emma sees her U14s team, league match, pending payment
   - Parent sees overview of all children

## 🛠️ Useful Docker Commands

```bash
# View logs
docker-compose logs -f              # All services
docker-compose logs -f backend      # Backend only
docker-compose logs -f db           # Database only

# Stop containers
docker-compose down

# Restart containers
docker-compose restart

# Rebuild containers (after code changes)
docker-compose up -d --build

# Access database directly
docker-compose exec db psql -U clubhub_dev_db_user -d clubhub_dev_db

# Re-seed database (if needed)
docker-compose exec -T db psql -U clubhub_dev_db_user -d clubhub_dev_db < seed-complete.sql
```

## 📊 Database Verification Queries

Run these in PgAdmin or via `docker-compose exec db psql...`:

```sql
-- Check all users
SELECT email, first_name, last_name, account_type FROM users;

-- Check players and their parents
SELECT p.first_name, p.last_name, u.email as parent_email, c.name as club_name
FROM players p
JOIN users u ON p.user_id = u.id
JOIN clubs c ON p.club_id = c.id;

-- Check team assignments
SELECT t.name as team, p.first_name, p.last_name, tp.jersey_number
FROM team_players tp
JOIN teams t ON tp.team_id = t.id
JOIN players p ON tp.player_id = p.id
ORDER BY t.name;

-- Check events
SELECT title, event_type, event_date, price FROM events ORDER BY event_date;

-- Check bookings
SELECT e.title, u.email, p.first_name, eb.booking_status, eb.payment_status
FROM event_bookings eb
JOIN events e ON eb.event_id = e.id
JOIN users u ON eb.user_id = u.id
JOIN players p ON eb.player_id = p.id;
```

## 🎉 You're All Set!

Your ClubHub instance now has a complete, realistic test environment with:
- Multiple user types (club owner, parents)
- Family structures (parents with children)
- Club organization (teams, players)
- Events and bookings
- Payment tracking
- Recruitment listings

**Happy testing!** 🚀
