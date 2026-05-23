#!/bin/bash

echo "🚀 Starting ClubHub..."
docker-compose up -d

echo "⏳ Waiting for database..."
sleep 10

echo "🌱 Seeding database..."
docker-compose exec -T db psql -U clubhub_dev_db_user -d clubhub_dev_db < database/seed-complete.sql

echo ""
echo "✅ DONE!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 TEST ACCOUNTS (Password: Demo@123)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. owner@demo.com - Club owner + 2 kids (Oliver, Emma)"
echo "2. noclub@demo.com - No club (can create one)"
echo "3. player@demo.com - Invited player, 1 kid (Noah)"
echo "4. coach@demo.com - Coach/staff member"
echo "5. parent1-5@demo.com - Parents with kids"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SEEDED DATA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 1 Club (Elite Youth Academy)"
echo "✅ 5 Teams (U10s, U12s, U14s, U16s, U18s)"
echo "✅ 5 Staff (coaches, treasurer)"
echo "✅ 20+ Players (all linked to teams)"
echo "✅ 10+ Events (training, matches, camps)"
echo "✅ 4 Bookings"
echo "✅ 9 Payments"
echo "✅ 5 Recruitment Listings"
echo ""
echo "🌐 http://localhost:8081"
