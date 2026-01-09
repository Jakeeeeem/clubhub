# Stripe Payout Schedule Update Scripts

This folder contains scripts to bulk update all Stripe connected accounts to payout on a specific day each month.

---

## 🎯 What These Scripts Do

- Update **all** connected accounts to monthly payouts
- Set payout day to the **1st of each month**
- Use **minimum delay** (usually 2 business days)

---

## 📝 Choose Your Method

### **Method 1: Node.js Script** (Recommended)

**Best for**: Running from your backend server or local development

#### Setup:
```bash
cd backend
npm install  # Make sure dependencies are installed
```

#### Run:
```bash
node scripts/update-payout-schedules.js
```

#### What you'll see:
```
🚀 Starting Stripe Payout Configuration...

📅 Target Schedule: monthly on day 1
⏱️  Delay: minimum

📋 Fetching all connected accounts...
✅ Found 5 connected accounts

🔧 Updating: Elite FC (acct_123...)
   ✅ Success! New schedule: monthly

...

📊 SUMMARY
✅ Successfully updated: 5
❌ Failed: 0
⚠️  Skipped: 0
```

---

### **Method 2: Stripe CLI** (Easiest)

**Best for**: Quick one-time updates

#### Install Stripe CLI:

**Windows:**
```bash
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

**Mac:**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**
```bash
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz
tar -xvf stripe_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin
```

#### Login:
```bash
stripe login
```

#### Run Script:

**Windows:**
```bash
cd backend\scripts
update-payouts.bat
```

**Mac/Linux:**
```bash
cd backend/scripts
chmod +x update-payouts.sh
./update-payouts.sh
```

---

### **Method 3: Manual (Stripe Dashboard)**

1. Go to https://dashboard.stripe.com/connect/accounts
2. Click on each connected account
3. Go to **Settings** → **Payouts**
4. Set:
   - **Frequency**: Monthly
   - **Anchor day**: 1
   - **Delay**: Minimum
5. Click **Save**

---

## ⚙️ Customization

Want to change the payout day or frequency? Edit the configuration:

### In `update-payout-schedules.js`:
```javascript
const PAYOUT_CONFIG = {
  interval: 'monthly',        // Change to: 'daily', 'weekly', 'monthly', 'manual'
  monthly_anchor: 1,          // Change to: 1-31 (day of month)
  delay_days: 'minimum'       // Change to: 'minimum' or 2-7
};
```

### In shell scripts:
Change these lines:
```bash
--settings.payouts.schedule.interval=monthly \
--settings.payouts.schedule.monthly_anchor=1 \
--settings.payouts.schedule.delay_days=minimum
```

---

## 🔍 Verification

After running the script, verify in Stripe Dashboard:

1. Go to https://dashboard.stripe.com/connect/accounts
2. Click on any connected account
3. Check **Settings** → **Payouts**
4. Should show: "Monthly on the 1st"

---

## 📅 Payout Schedule Examples

| Configuration | When Payouts Happen |
|--------------|---------------------|
| `monthly_anchor: 1` | 1st of every month |
| `monthly_anchor: 15` | 15th of every month |
| `interval: weekly` | Every 7 days |
| `interval: daily` | Every business day |

**Note**: Payouts only happen on business days (Mon-Fri). If the 1st falls on a weekend, it will payout on the next business day.

---

## ⚠️ Important Notes

1. **Payouts Enabled**: Accounts must have completed onboarding
2. **Bank Account**: Each account needs a verified bank account
3. **Minimum Balance**: Usually £1 minimum for GBP payouts
4. **Test Mode**: These scripts work in both test and live mode (based on your API key)

---

## 🐛 Troubleshooting

### "Stripe CLI not found"
Install the Stripe CLI first (see Method 2 above)

### "Payouts not enabled"
The account hasn't completed Stripe onboarding. They need to:
1. Add bank account details
2. Complete identity verification
3. Accept Stripe's terms

### "Permission denied"
Make sure you're using your **secret key** (starts with `sk_`), not publishable key

### Script shows "0 accounts found"
- Check you're logged into the correct Stripe account
- Verify you have connected accounts created

---

## 🔐 Security

- Never commit `.env` file with your Stripe keys
- Use environment variables for API keys
- Keep your secret key secure

---

## 📞 Support

- **Stripe Docs**: https://stripe.com/docs/connect/payouts
- **Stripe CLI Docs**: https://stripe.com/docs/stripe-cli
- **ClubHub Issues**: Contact your development team

---

**Last Updated**: January 2026
