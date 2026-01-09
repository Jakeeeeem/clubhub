#!/bin/bash

# Stripe Payout Configuration Script
# Updates all connected accounts to monthly payouts on the 1st

echo "🚀 Stripe Payout Configuration"
echo "================================"
echo ""
echo "📅 Setting all accounts to: Monthly payouts on the 1st"
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI not found. Please install it first:"
    echo "   https://stripe.com/docs/stripe-cli"
    exit 1
fi

# Get all connected accounts
echo "📋 Fetching connected accounts..."
ACCOUNTS=$(stripe accounts list --limit 100 | grep "id:" | awk '{print $2}')

if [ -z "$ACCOUNTS" ]; then
    echo "⚠️  No connected accounts found"
    exit 0
fi

# Count accounts
TOTAL=$(echo "$ACCOUNTS" | wc -l)
echo "✅ Found $TOTAL connected account(s)"
echo ""

SUCCESS=0
FAILED=0

# Update each account
for ACCOUNT_ID in $ACCOUNTS; do
    echo "🔧 Updating: $ACCOUNT_ID"
    
    if stripe accounts update "$ACCOUNT_ID" \
        --settings.payouts.schedule.interval=monthly \
        --settings.payouts.schedule.monthly_anchor=1 \
        --settings.payouts.schedule.delay_days=minimum > /dev/null 2>&1; then
        echo "   ✅ Success"
        ((SUCCESS++))
    else
        echo "   ❌ Failed"
        ((FAILED++))
    fi
done

echo ""
echo "================================"
echo "📊 SUMMARY"
echo "================================"
echo "✅ Successfully updated: $SUCCESS"
echo "❌ Failed: $FAILED"
echo "================================"
echo ""
echo "✨ Done!"
