# Stripe Connect & Payment Plans Testing Guide

## ✅ What's Working Now

1. **Mock Data Control System**
   - ✅ `is_mock` column exists in production
   - ✅ Test data marked as mock
   - ✅ Super Admin dashboard shows only real data
   - ✅ Backend filters mock data by default

## 🧪 Testing Stripe Connect & Payment Plans

### Step 1: Connect a Real Organization to Stripe

1. **Login as Organization Admin**
   - Use a real organization account (e.g., Christopher Callaghan FC)
   - Navigate to the admin dashboard

2. **Click "Connect Stripe Account"**
   - You'll be redirected to Stripe Connect onboarding
   - Complete the Stripe account setup
   - Stripe will redirect back to your app

3. **Verify Connection**
   - Check that the button changes from "⚠️ Connect Stripe Account" to "Access Stripe"
   - In Super Admin dashboard, verify "Connected Clubs" count increased

### Step 2: Create Payment Plans

1. **Navigate to Finances Section**
   - Click "💰 Finance" in the admin dashboard
   - Click "➕ Create Payment Plan"

2. **Fill Out Plan Details**
   ```
   Plan Name: Monthly Membership
   Amount: £30.00
   Billing Frequency: Monthly
   Description: Standard monthly membership fee
   ```

3. **Submit Plan**
   - The plan will be created in both:
     - Your local database (`plans` table)
     - Stripe (as a Price object)

4. **Verify Plan Creation**
   - Check the "Payment Plans" section shows the new plan
   - In Stripe Dashboard, verify the price exists
   - In Super Admin dashboard, check "Global Payment Plans" section

### Step 3: Assign Players to Plans

1. **Navigate to Players Section**
   - Click "👥 Management" → "Players"
   - Select a player

2. **Assign Payment Plan**
   - Click "Edit Player" or "Assign Plan"
   - Select the plan you created
   - Save

3. **Verify Assignment**
   - Player should show as "On Plan" in the players list
   - Filter by "On Plan" to see all paying members

### Step 4: Test Payment Collection

1. **Manual Payment**
   - Go to player profile
   - Click "Record Payment"
   - Enter amount and mark as paid
   - This creates a payment record (not through Stripe)

2. **Stripe Subscription** (if implemented)
   - Player should be able to subscribe via Stripe Checkout
   - Subscription will be created in Stripe
   - Webhooks will update payment status in your database

### Step 5: Verify in Super Admin Dashboard

1. **Login as Platform Admin**
   - Navigate to Super Admin dashboard

2. **Check Stripe Overview**
   - Click "💳 Stripe & Finance" tab
   - Verify:
     - Connected Clubs count is correct
     - Plans from connected organizations appear
     - Recent payments are listed
     - No mock data is visible

3. **Check Organizations**
   - Click "🏢 Organizations" tab
   - Verify:
     - Only real organizations appear
     - Stripe connection status is accurate
     - Mock organizations are hidden

## 🔍 What to Look For

### Expected Behavior:

✅ **Connected Organizations**
- Show Stripe account ID
- Can create payment plans
- Plans sync to Stripe
- Payments are tracked

✅ **Super Admin Dashboard**
- Shows accurate count of connected accounts
- Displays plans from all connected orgs
- Shows recent payments across platform
- Filters out mock data by default

✅ **Payment Plans**
- Created in both database and Stripe
- Can be assigned to players
- Show in organization's finance section
- Appear in Super Admin global view

### Common Issues:

❌ **Stripe Connection Fails**
- Check `STRIPE_SECRET_KEY` in environment variables
- Verify redirect URLs are whitelisted in Stripe Dashboard
- Check browser console for errors

❌ **Plans Don't Sync**
- Verify organization has `stripe_account_id` set
- Check that plan creation hits the correct API endpoint
- Look for errors in backend logs

❌ **Mock Data Still Showing**
- Verify `is_mock = true` for test organizations
- Check that `includeMock=false` is passed in API calls
- Clear browser cache and refresh

## 📊 Database Queries for Verification

### Check Connected Organizations
```sql
SELECT id, name, stripe_account_id, is_mock
FROM organizations
WHERE stripe_account_id IS NOT NULL
  AND (is_mock = false OR is_mock IS NULL);
```

### Check Payment Plans
```sql
SELECT p.*, o.name as org_name, o.stripe_account_id
FROM plans p
JOIN organizations o ON p.club_id = o.id
WHERE o.stripe_account_id IS NOT NULL
  AND (p.is_mock = false OR p.is_mock IS NULL);
```

### Check Players on Plans
```sql
SELECT 
  pl.first_name, 
  pl.last_name, 
  p.name as plan_name,
  p.amount,
  o.name as org_name
FROM players pl
JOIN plans p ON pl.payment_plan_id = p.id
JOIN organizations o ON p.club_id = o.id
WHERE p.is_mock = false OR p.is_mock IS NULL;
```

## 🎯 Success Criteria

Your Stripe integration is working correctly if:

1. ✅ Organizations can connect Stripe accounts
2. ✅ Connected orgs can create payment plans
3. ✅ Plans appear in Stripe Dashboard
4. ✅ Players can be assigned to plans
5. ✅ Super Admin sees accurate connected account count
6. ✅ Super Admin sees all plans across platform
7. ✅ Mock data is completely hidden
8. ✅ Payment tracking works (manual or Stripe)

## 🚀 Next Steps

After testing the above:

1. **Test Webhooks** (if implemented)
   - Stripe sends events for payments, subscriptions, etc.
   - Verify your webhook endpoint handles them correctly

2. **Test Bulk Operations**
   - Assign multiple players to a plan at once
   - Verify all assignments are tracked

3. **Test Reporting**
   - Export payment data
   - Generate financial reports
   - Verify accuracy of revenue calculations

4. **Production Deployment**
   - Ensure all environment variables are set
   - Run migrations on production database
   - Mark any existing test data as mock
   - Monitor for errors

## 📝 Notes

- **Mock Data**: Always marked with `is_mock = true`
- **Real Data**: `is_mock = false` or `NULL`
- **Filtering**: Backend defaults to `includeMock=false`
- **Super Admin**: Can toggle mock data visibility (future feature)

---

**Last Updated**: 2026-02-08
**Status**: ✅ Mock Data Control System Fully Implemented
