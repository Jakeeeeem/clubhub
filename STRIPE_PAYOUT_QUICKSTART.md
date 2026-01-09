# 🚀 QUICK START: Update All Stripe Payouts to 1st of Month

## Fastest Method (Node.js Script)

```bash
# 1. Navigate to backend
cd c:\Users\Dell\Documents\elitepro\clubhub\backend

# 2. Run the script
node scripts/update-payout-schedules.js
```

**That's it!** ✨

---

## What It Does

- ✅ Updates ALL connected accounts
- ✅ Sets payouts to **monthly on the 1st**
- ✅ Uses minimum delay (2 business days)
- ✅ Shows detailed progress and summary

---

## Expected Output

```
🚀 Starting Stripe Payout Configuration...
📅 Target Schedule: monthly on day 1
📋 Fetching all connected accounts...
✅ Found 5 connected accounts

🔧 Updating: Elite FC (acct_123...)
   ✅ Success!

📊 SUMMARY
✅ Successfully updated: 5
❌ Failed: 0
```

---

## Customize the Day

Edit `backend/scripts/update-payout-schedules.js`:

```javascript
const PAYOUT_CONFIG = {
  monthly_anchor: 1,  // Change to any day 1-31
};
```

---

## Verify It Worked

1. Go to https://dashboard.stripe.com/connect/accounts
2. Click any account
3. Check Settings → Payouts
4. Should show: "Monthly on the 1st"

---

**Need help?** See `backend/scripts/README.md` for full documentation
