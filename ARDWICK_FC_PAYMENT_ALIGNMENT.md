# 📊 Ardwick FC Payment Analysis & Alignment Guide

## 🎯 Goal
Align all Ardwick FC players to pay on the same day of the month for easier financial management.

---

## 📋 Step 1: Analyze Current Payment Dates

Run the analysis script to see when everyone currently pays:

```bash
cd backend
node scripts/analyze-ardwick-payments.js
```

### **What You'll See:**
```
🏟️  Ardwick FC Payment Analysis
================================================================================

✅ Found: Ardwick FC (ID: abc-123)

📊 Total Active Members: 45

👥 Members by Role:
   owner: 1
   admin: 2
   coach: 5
   player: 37

💰 PAYMENT ANALYSIS
================================================================================

📅 Payment Distribution by Day of Month:

   Day  1: ████████ (8 players)
   Day  5: ████ (4 players)
   Day 10: ██████ (6 players)
   Day 15: ██████████ (10 players)
   Day 20: ████ (4 players)
   Day 28: ██ (2 players)

🎯 Most Common Payment Day: 15th of the month (10 players)

💡 RECOMMENDATION:
   Target Day: 1st of the month (industry standard)
   Current Most Common: 15th
   Players to migrate: 29

📋 DETAILED MEMBER LIST
... (shows all members with payment details)

📊 SUMMARY STATISTICS
   Total Players: 37
   Players with Payment Plans: 35 (95%)
   Players with Payment History: 34 (92%)
   💰 Monthly Recurring Revenue: £1,850.00
```

---

## 🔄 Step 2: Align Billing Dates (Dry Run First!)

### **Test First (Dry Run):**
```bash
node scripts/align-billing-dates.js 1 --dry-run
```

This shows what **would** change without actually changing anything.

### **Output:**
```
🔄 Align Billing Dates to Same Day
================================================================================

📅 Target Billing Day: 1st of each month
🔍 Mode: DRY RUN (no changes will be made)

✅ Found: Ardwick FC

👥 Found 34 players with Stripe accounts

🔧 Processing: John Smith (john@example.com)
   📋 Subscription: sub_123abc
   📅 Current billing day: 15th
   🔍 Would update billing day: 15 → 1

... (shows all players)

📊 SUMMARY
✅ Successfully analyzed: 29
✔️  Already aligned: 5
⚠️  Skipped: 3
❌ Failed: 0
```

---

## ✅ Step 3: Actually Update (Live Mode)

Once you're happy with the dry run results:

```bash
node scripts/align-billing-dates.js 1 --live
```

**⚠️ WARNING:** This will actually update Stripe subscriptions!

### **What Happens:**
1. ✅ Updates each subscription's billing cycle anchor
2. ✅ Creates proration invoices (fair billing)
3. ✅ Next billing will be on the 1st
4. ✅ Players are charged/credited for the difference

---

## 🎛️ Options

### **Choose Different Target Day:**
```bash
# Align to 15th of month
node scripts/align-billing-dates.js 15 --dry-run

# Align to 1st of month (recommended)
node scripts/align-billing-dates.js 1 --dry-run
```

### **Dry Run vs Live:**
```bash
# Safe - just shows what would happen
node scripts/align-billing-dates.js 1 --dry-run

# Actually updates subscriptions
node scripts/align-billing-dates.js 1 --live
```

---

## 💰 Understanding Proration

When you change billing dates, Stripe automatically handles fair billing:

### **Example:**
- **Player A** currently pays £50 on the 15th
- You move them to the 1st
- They've already paid for 15th-14th (next month)
- Stripe will:
  - Credit them for unused days (15th-31st)
  - Charge them for new period (1st-31st)
  - Net difference appears on next invoice

### **Result:**
- ✅ Fair for the player
- ✅ No manual calculations needed
- ✅ Transparent on Stripe invoice

---

## 📧 Step 4: Notify Players

After aligning billing dates, send an email to affected players:

### **Email Template:**
```
Subject: Important: Your Billing Date Has Changed

Hi [Player Name],

We're improving our payment system! Your monthly subscription billing date 
has been updated to the 1st of each month.

What this means:
• Your next payment will be on [Next 1st]
• You'll see a small adjustment on your next invoice for the date change
• All future payments will be on the 1st of each month

This change helps us manage finances better and ensures everyone pays on 
the same day.

Questions? Reply to this email or contact us at admin@ardwickfc.com

Thanks,
Ardwick FC Team
```

---

## 🔍 Verification

After running the alignment, verify it worked:

```bash
# Run analysis again
node scripts/analyze-ardwick-payments.js
```

You should see most/all players now on Day 1.

---

## 📊 Quick Reference

| Command | What It Does |
|---------|-------------|
| `node scripts/analyze-ardwick-payments.js` | Shows current payment distribution |
| `node scripts/align-billing-dates.js 1 --dry-run` | Test alignment to 1st (safe) |
| `node scripts/align-billing-dates.js 1 --live` | Actually align to 1st ⚠️ |
| `node scripts/align-billing-dates.js 15 --live` | Align to 15th instead |

---

## ⚠️ Important Notes

1. **Dry Run First**: Always run with `--dry-run` first to see what will change
2. **Proration**: Stripe handles fair billing automatically
3. **Notify Players**: Send email after making changes
4. **Check Stripe**: Verify in Stripe dashboard after running
5. **Timing**: Best to run at start of month to minimize proration

---

## 🐛 Troubleshooting

### **"No players with Stripe customer IDs found"**
- Players need to have made at least one payment through Stripe
- Check if Stripe integration is set up correctly

### **"Subscription update failed"**
- Check Stripe API key is correct
- Verify subscription is active
- Check Stripe dashboard for errors

### **"Ardwick FC not found"**
- Check organization name in database
- Script looks for names containing "ardwick"
- Update script if club name is different

---

## 📞 Support

- **Stripe Docs**: https://stripe.com/docs/billing/subscriptions/billing-cycle
- **Proration Guide**: https://stripe.com/docs/billing/subscriptions/prorations
- **ClubHub Support**: Contact your development team

---

**Last Updated**: January 2026
**Status**: ✅ Ready to Use
