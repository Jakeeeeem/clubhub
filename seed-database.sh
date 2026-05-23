#!/bin/bash

# Seed Database Script
# Executes the database/seed-data.sql file against your database

echo "🌱 Seeding database with test data..."
echo ""

# Check if we can connect to the database
if command -v psql &> /dev/null; then
    echo "Using psql to seed data..."
    # You'll need to provide your database connection details
    # psql -h localhost -U your_user -d your_database -f database/seed-data.sql
    echo "❌ Please update this script with your database credentials"
    echo "Or run the SQL manually from database/seed-data.sql"
else
    echo "⚠️  psql not found. Please run the SQL commands manually."
    echo "The SQL file is located at: database/seed-data.sql"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "📋 LOGIN CREDENTIALS (after seeding)"
echo "═══════════════════════════════════════════════════"
echo "👨‍👩‍👧 Parent Accounts:"
echo "   parent1@demo.com (2 children: Oliver, Emma)"
echo "   parent2@demo.com (1 child: Noah)"
echo "   parent3@demo.com (1 child: Sophia)"
echo "   Password: Demo@123"
echo "═══════════════════════════════════════════════════"
