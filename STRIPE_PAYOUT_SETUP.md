# Stripe Payout Configuration Guide

## Overview
This guide explains how to configure monthly payouts (on the 1st of each month) for ClubHub connected accounts using Stripe.

---

## Method 1: Via Stripe Dashboard (Quick Setup)

### For Individual Clubs:
1. **Access Connected Account**:
   - Log into your main Stripe account at https://dashboard.stripe.com
   - Navigate to **Connect** → **Accounts**
   - Click on the club's connected account
   - Click **"View in Dashboard"** to access their settings

2. **Configure Payout Schedule**:
   - Go to **Settings** → **Payouts**
   - Under **Payout schedule**, set:
     - **Frequency**: `Monthly`
     - **Anchor day**: `1` (1st of the month)
     - **Delay**: `Minimum` (usually 2 days)
   - Click **Save**

3. **Verify Bank Account**:
   - Ensure the club has added their bank account
   - Go to **Settings** → **Bank accounts and scheduling**
   - Stripe will verify the account via micro-deposits

---

## Method 2: Via ClubHub API (Automated)

### Configure Single Account:
```bash
POST /api/stripe-payouts/configure-payout/:accountId
Authorization: Bearer YOUR_JWT_TOKEN
```

**Example using cURL:**
```bash
curl -X POST https://clubhub-dev.onrender.com/api/stripe-payouts/configure-payout/acct_XXXXXXXXXX \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "Payout schedule configured to monthly on the 1st",
  "account": {
    "id": "acct_XXXXXXXXXX",
    "payouts_enabled": true,
    "payout_schedule": {
      "interval": "monthly",
      "monthly_anchor": 1,
      "delay_days": "minimum"
    }
  }
}
```

---

### Configure All Connected Accounts (Bulk):
```bash
POST /api/stripe-payouts/configure-all-payouts
Authorization: Bearer YOUR_JWT_TOKEN
```

**Example:**
```bash
curl -X POST https://clubhub-dev.onrender.com/api/stripe-payouts/configure-all-payouts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "Configured 5 of 5 accounts",
  "results": [
    {
      "account_id": "acct_111111",
      "success": true,
      "message": "Configured successfully"
    },
    {
      "account_id": "acct_222222",
      "success": true,
      "message": "Configured successfully"
    }
  ]
}
```

---

### Check Current Payout Schedule:
```bash
GET /api/stripe-payouts/payout-schedule/:accountId
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "account_id": "acct_XXXXXXXXXX",
  "payouts_enabled": true,
  "payout_schedule": {
    "interval": "monthly",
    "monthly_anchor": 1,
    "delay_days": "minimum"
  },
  "default_currency": "gbp"
}
```

---

### Manual Payout (Testing/Special Cases):
```bash
POST /api/stripe-payouts/manual-payout/:accountId
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "amount": 100.50,
  "currency": "gbp"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Manual payout created",
  "payout": {
    "id": "po_XXXXXXXXXX",
    "amount": 100.50,
    "currency": "gbp",
    "arrival_date": "2026-01-15T00:00:00.000Z",
    "status": "in_transit"
  }
}
```

---

## Method 3: Using Stripe CLI (For Testing)

### Install Stripe CLI:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows (via Scoop)
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz
tar -xvf stripe_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin
```

### Login to Stripe:
```bash
stripe login
```

### Configure Payout Schedule:
```bash
stripe accounts update acct_XXXXXXXXXX \
  --settings.payouts.schedule.interval=monthly \
  --settings.payouts.schedule.monthly_anchor=1 \
  --settings.payouts.schedule.delay_days=minimum
```

### Verify Configuration:
```bash
stripe accounts retrieve acct_XXXXXXXXXX
```

---

## Important Notes

### Payout Requirements:
1. **Bank Account**: Each connected account must have a verified bank account
2. **Identity Verification**: Accounts must complete Stripe's identity verification
3. **Minimum Balance**: Payouts require a minimum balance (usually £1 for GBP)
4. **Business Days**: Payouts only occur on business days (Mon-Fri)

### Payout Timing:
- **Monthly Anchor = 1**: Payout initiated on the 1st of each month
- **Delay Days = Minimum**: Usually 2 business days
- **Example**: Payment on Jan 1st → Arrives Jan 3rd (if both are business days)

### Testing in Development:
- Use Stripe's **test mode** to simulate payouts
- Test accounts won't receive real money
- Use test bank account numbers from [Stripe's testing guide](https://stripe.com/docs/connect/testing)

### Common Issues:
1. **"Payouts not enabled"**: Account needs to complete onboarding
2. **"No bank account"**: Add and verify a bank account first
3. **"Insufficient balance"**: Ensure there's enough balance for payout

---

## Frontend Integration (Optional)

Add a button to your admin dashboard to configure payouts:

```javascript
async function configureClubPayouts(accountId) {
  try {
    showLoading(true);
    const response = await apiService.makeRequest(
      `/stripe-payouts/configure-payout/${accountId}`,
      { method: 'POST' }
    );
    
    if (response.success) {
      showNotification('Payout schedule configured successfully!', 'success');
    }
  } catch (error) {
    showNotification('Failed to configure payouts: ' + error.message, 'error');
  } finally {
    showLoading(false);
  }
}
```

---

## Recommended Approach

**For Production:**
1. Use **Method 1 (Dashboard)** for initial setup of existing accounts
2. Use **Method 2 (API)** to automatically configure new accounts during onboarding
3. Add a UI button in the admin panel for easy reconfiguration

**For Testing:**
1. Use **Method 3 (CLI)** for quick testing and debugging
2. Use **Method 2 (API)** to test the automated flow

---

## Support

- **Stripe Documentation**: https://stripe.com/docs/connect/payouts
- **Stripe Support**: https://support.stripe.com
- **ClubHub Issues**: Contact your development team

---

**Last Updated**: January 2026
