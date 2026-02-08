# Where and How Payments Are Charged

## 🔍 Payment Flow Diagram

```
USER ACTION                    FRONTEND                    BACKEND                    STRIPE
───────────                    ────────                    ───────                    ──────

1. User visits                payment.html
   payment.html?              (loads payment
   amount=30&                  details)
   description=Fee                 │
                                   │
2. User enters                     │
   card details              Card Element
   in form                   (Stripe.js)
                                   │
3. User clicks                     │
   "Complete                       │
   Payment"                        │
                                   │
4. Frontend calls            POST /api/payments/
   create-intent ────────────> create-intent          stripe.paymentIntents
                                   │                   .create()
                                   │                        │
                                   │                        ▼
                                   │                   🔴 CHARGE CREATED
                                   │                   (Payment Intent)
                                   │                        │
5. Backend returns           clientSecret <─────────────────┘
   clientSecret                    │
                                   │
6. Frontend confirms               │
   with Stripe ──────────────────────────────────────> stripe.confirmCardPayment()
                                                              │
                                                              ▼
                                                       🔴 CARD CHARGED
                                                       (Money moves)
                                                              │
7. Stripe returns                                             │
   success ◄──────────────────────────────────────────────────┘
                                   │
8. Frontend confirms         POST /api/payments/
   in backend ───────────────> confirm-payment
                                   │
                                   ▼
                              Update database
                              (mark as paid)
```

## 🔴 Where Real Charges Happen

### 1. **`payment.html` Page** (Line 717)
```javascript
// When user submits card payment form
const response = await fetch(`${getBaseURL()}/api/payments/create-intent`, {
    method: 'POST',
    body: JSON.stringify({
        amount: paymentData.amount,  // 🔴 REAL AMOUNT
        paymentId: paymentData.id
    })
});
```

### 2. **Backend Route: `/api/payments/create-intent`** (Line 1212)
```javascript
// This creates the payment intent in Stripe
const paymentIntent = await stripe.paymentIntents.create({
    amount: numericAmount * 100,  // 🔴 CHARGES THIS AMOUNT
    currency: 'gbp',
    ...
});
```

### 3. **Frontend Stripe Confirmation** (Line 749)
```javascript
// This actually charges the card
const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
    payment_method: {
        card: cardElement,  // 🔴 USER'S CARD IS CHARGED HERE
    }
});
```

## 📍 How Users Get to payment.html

### Method 1: Direct Link (Most Common)
```
https://clubhubsports.net/payment.html?amount=30&description=Monthly%20Fee
```
- Anyone with this link can pay
- Amount is in the URL
- No authentication required

### Method 2: From Admin Dashboard
```javascript
// Admin creates a payment link for a player
const paymentLink = `/payment.html?id=${paymentId}&token=${secureToken}`;
// Sends link to player via email
```

### Method 3: Event Booking
```javascript
// When player books an event
window.location.href = `/payment.html?amount=${eventPrice}&description=Event%20Booking&eventId=${eventId}`;
```

## ⚠️ Current Risk Assessment

### HIGH RISK Routes (Will Charge Real Money):
1. ✅ **`/api/payments/create-intent`** - Creates charge
2. ✅ **`/api/payments/confirm-payment`** - Confirms charge
3. ✅ **`payment.html`** - User-facing payment page

### MEDIUM RISK Routes (Could trigger charges):
4. **`/api/payments/book-event`** - May create payment
5. **Any route calling `stripe.paymentIntents.create()`**

### LOW RISK (Safe to use):
- ✅ `/api/stripe/connect` - Just links accounts
- ✅ `/api/plans` - Just creates plan structures
- ✅ `/api/players/:id` - Just assigns plans
- ✅ All Super Admin viewing routes

## 🛡️ How to Test Safely

### Option 1: Use Test Mode (RECOMMENDED)
```bash
# In .env, replace with TEST keys:
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```
Then use test card: `4242 4242 4242 4242`
- No real money charged
- Appears in Stripe test dashboard

### Option 2: Disable Payment Routes (Current Setup)
```bash
# In .env:
ENABLE_PAYMENT_PROCESSING=false
```
- Blocks `/create-intent` route
- Returns 403 error
- No charges possible

### Option 3: Remove payment.html from Production
```bash
# Temporarily rename or move the file
mv frontend/payment.html frontend/payment.html.disabled
```
- Users can't access payment page
- No way to trigger charges

## 📊 Current Status

**Environment**: Production (Live Stripe Keys)
**Payment Processing**: DISABLED via `ENABLE_PAYMENT_PROCESSING=false`
**Risk Level**: 🟡 MEDIUM

### What's Protected:
- ❌ Cannot create payment intents (if flag is checked in code)
- ✅ Can connect Stripe accounts
- ✅ Can create payment plans
- ✅ Can assign players to plans

### What's NOT Protected Yet:
- ⚠️ `payment.html` is still accessible
- ⚠️ Backend routes don't check the flag yet
- ⚠️ Direct API calls could still work

## ✅ Recommended Next Steps

1. **Add flag check to backend routes** (I can do this)
2. **Test with Stripe test keys first**
3. **When ready for live payments:**
   - Verify all routes check the flag
   - Set `ENABLE_PAYMENT_PROCESSING=true`
   - Monitor first few transactions closely

---

**Bottom Line**: Right now, if someone visits `payment.html` with an amount in the URL, they COULD still trigger a charge because the backend routes don't check the `ENABLE_PAYMENT_PROCESSING` flag yet.

**Action Required**: Let me add the flag check to the backend routes to fully disable charging.
