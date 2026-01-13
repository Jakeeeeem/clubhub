#!/bin/bash
# Quick script to create demo accounts via the registration API

API_URL="https://clubhub-dev.onrender.com/api/auth"

echo "Creating demo accounts..."

# Demo Admin
curl -X POST "$API_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@clubhub.com",
    "password": "password123",
    "firstName": "Demo",
    "lastName": "Admin",
    "accountType": "organization"
  }'

echo ""
echo "Admin created!"

# Demo Coach  
curl -X POST "$API_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "coach@clubhub.com",
    "password": "password123",
    "firstName": "Michael",
    "lastName": "Coach",
    "accountType": "organization"
  }'

echo ""
echo "Coach created!"

# Demo Player
curl -X POST "$API_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "player@clubhub.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Player",
    "accountType": "adult"
  }'

echo ""
echo "Player created!"
echo ""
echo "✅ All demo accounts created!"
echo "You can now use the demo login feature!"
