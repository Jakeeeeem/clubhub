const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const emailService = require('./services/email-service');

const targetEmail = 'instantonlinesuccess@gmail.com';

// DEBUG
console.log('DEBUG: CWD:', process.cwd());
console.log('DEBUG: __dirname:', __dirname);
console.log('DEBUG: .env path:', path.resolve(__dirname, '.env'));
console.log('DEBUG: EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
console.log('DEBUG: SENDPULSE_USER:', process.env.SENDPULSE_SMTP_USER ? 'Set' : 'Unset');
console.log('DEBUG: SMTP_HOST:', process.env.SMTP_HOST);

// Helper to prevent rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runDryTest() {
    console.log(`🚀 Starting Dry Run Email Test (V2 - NEW LAYOUT) to: ${targetEmail}`);

    try {
        console.log('--- 1. Testing Connection ---');
        const connected = await emailService.verifyConnection();
        if(!connected) throw new Error("Connection failed");

        console.log('\n--- 2. Sending "Sign Up/Welcome" Email ---');
        await emailService.sendWelcomeEmail({
            email: targetEmail,
            firstName: 'Test User',
            accountType: 'organization',
            dashboardLink: 'https://clubhubsports.io/admin-dashboard.html'
        });
        console.log('✅ Welcome Email Sent');
        await sleep(2000);

        console.log('\n--- 3. Sending "Forgot Password" Email ---');
        await emailService.sendPasswordResetEmail(
            targetEmail,
            'Test User',
            'https://clubhubsports.io/reset-password?token=dry-run-token'
        );
        console.log('✅ Forgot Password Email Sent');
        await sleep(2000);

        console.log('\n--- 4. Sending "Club Invite" Email ---');
        await emailService.sendClubInviteEmail({
            email: targetEmail,
            clubName: 'Elite Pro Academy',
            inviterName: 'Coach Carter',
            inviteLink: 'https://clubhubsports.io/join/test-token',
            personalMessage: 'Come join us for the new season!',
            clubRole: 'player'
        });
        console.log('✅ Club Invite Email Sent');
        await sleep(2000);

        console.log('\n--- 5. Sending "Payment Reminder" Email ---');
        await emailService.sendPaymentReminderEmail({
            email: targetEmail,
            firstName: 'Test User',
            clubName: 'Elite Pro Academy',
            amount: 50.00,
            dueDate: new Date(),
            description: 'Monthly Membership Fee',
            paymentLink: 'https://clubhubsports.io/pay/test-invoice'
        });
        console.log('✅ Payment Reminder Email Sent');

        console.log('\n🎉 ALL V2 TESTS COMPLETED SUCCESSFULLY');

    } catch (error) {
        console.error('\n❌ Dry Run Failed:', error);
    }
}

runDryTest();
