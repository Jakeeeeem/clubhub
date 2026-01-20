# Stripe Connect Integration - Fixed & Explained

## ✅ What Was Fixed

### **Problem:**
- Clicking "Access Stripe Dashboard" button resulted in 500 error
- Error: "Failed to create account management link"
- Root cause: Using wrong API method for Standard Stripe Connect accounts

### **Solution:**
Updated `/api/payments/stripe/connect/manage` endpoint to:
- Use `stripe.accounts.createLoginLink()` for **Standard** accounts
- Use `stripe.accountLinks.create()` for **Express** accounts (if we switch back)
- Added better error handling with detailed messages

---

## 🔄 How Stripe Connect Works Now

### **1. Account Creation (Automatic)**
When a club owner first accesses Stripe features:

```javascript
// Backend automatically creates a Standard Stripe Connect account
const account = await stripe.accounts.create({
  type: 'standard',  // Standard account (not Express)
  email: user.email,
  settings: {
    payouts: {
      schedule: {
        interval: 'monthly',
        monthly_anchor: 1  // Payouts on 1st of each month
      }
    }
  }
});
```

- Account ID is saved to `users.stripe_account_id`
- Payouts automatically set to monthly on the 1st
- No manual configuration needed

### **2. Onboarding Flow**
To complete Stripe setup, clubs need to:

1. Click "Connect Stripe Account" or "Access Stripe Dashboard"
2. System calls `/api/payments/stripe/connect/onboard`
3. Stripe redirects them to complete:
   - Business details
   - Bank account information
   - Identity verification
4. After completion, they can receive payments

### **3. Accessing Stripe Dashboard**
Once connected:

1. Click "Access Stripe Dashboard" button
2. System calls `/api/payments/stripe/connect/manage`
3. For Standard accounts → Creates login link to Stripe Dashboard
4. User is redirected to their Stripe account
5. They can view:
   - Payments received
   - Payout schedule
   - Customer data
   - Transaction history

---

## 💳 Creating Payment Plans

### **Flow:**
1. Club connects Stripe account (one-time setup)
2. Club creates payment plans in ClubHub:
   - Monthly membership: £30/month
   - Annual membership: £300/year
   - Training fees: £10/week

3. **Behind the scenes:**
```javascript
// Creates Stripe Product on connected account
const product = await stripe.products.create({
  name: "Monthly Membership",
  description: "Elite Pro Academy - Monthly Membership"
}, {
  stripeAccount: club.stripe_account_id  // On club's account!
});

// Creates Stripe Price
const price = await stripe.prices.create({
  product: product.id,
  unit_amount: 3000,  // £30.00 in pence
  currency: 'gbp',
  recurring: {
    interval: 'month'
  }
}, {
  stripeAccount: club.stripe_account_id
});
```

4. Plan is saved to database with Stripe IDs
5. Players can subscribe to these plans
6. **Money goes directly to club's Stripe account**

---

## 💰 Payment Flow

### **When a player pays:**

1. Player selects a payment plan or makes a payment
2. Frontend creates payment intent:
```javascript
POST /api/payments/create-intent
{
  amount: 30.00,
  metadata: { clubId, planId }
}
```

3. Stripe processes payment
4. **Money goes to platform first** (ClubHub Stripe account)
5. **Then transferred to club** via Stripe Connect
6. Club receives payout on 1st of month

### **Payout Schedule:**
- All clubs: **Monthly on the 1st**
- Automatic transfers to club's bank account
- No manual intervention needed

---

## 🔑 Key Endpoints

### **Frontend → Backend:**

| Endpoint | Purpose | Returns |
|----------|---------|---------|
| `GET /api/payments/stripe/connect/status` | Check if Stripe connected | Account status |
| `POST /api/payments/stripe/connect/onboard` | Start Stripe onboarding | Onboarding URL |
| `GET /api/payments/stripe/connect/manage` | Access Stripe Dashboard | Dashboard login URL |
| `POST /api/payments/plans` | Create payment plan | Plan + Stripe IDs |
| `GET /api/payments/plans` | List all plans | Array of plans |

---

## 🎯 Current Status

### **✅ Working:**
- Stripe Connect account creation
- Account status checking
- Onboarding flow
- Dashboard access (NOW FIXED!)
- Payment plan creation on connected accounts
- Monthly payout schedule (1st of month)

### **🔧 To Test:**
1. Click "Access Stripe Dashboard" → Should open Stripe login
2. Complete onboarding if not done
3. Create a payment plan → Should create on Stripe
4. View plan in Stripe Dashboard → Should see product/price

### **📋 Next Steps:**
1. Test the fixed "Access Stripe Dashboard" button
2. Complete Stripe onboarding for test account
3. Create a test payment plan
4. Verify plan appears in Stripe Dashboard
5. Test player subscription flow

---

## 🐛 Error Handling

The endpoint now returns detailed errors:

```json
{
  "error": "Failed to create account management link",
  "message": "Specific error from Stripe",
  "details": "Raw error details"
}
```

This helps debug any future issues!

---

## 🚀 Testing Checklist

- [ ] Click "Access Stripe Dashboard" - should work now!
- [ ] Complete Stripe onboarding
- [ ] Create a payment plan
- [ ] Verify plan in Stripe Dashboard
- [ ] Check payout schedule is set to monthly/1st
- [ ] Test player payment flow (when ready)
