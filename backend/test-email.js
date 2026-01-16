const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const emailService = require('./services/email-service');

async function testEmail() {
    console.log('📧 Testing Email Configuration...');
    console.log('Configured Service:', process.env.EMAIL_SERVICE || 'None/Ethereal');
    console.log('SMTP Host:', process.env.SENDPULSE_SMTP_USER ? 'Present' : 'Missing User');
    console.log('SMTP Port:', process.env.SENDPULSE_SMTP_PORT || 'Default');

    try {
        const isConnected = await emailService.verifyConnection();
        if (isConnected) {
            console.log('✅ Connection Verified!');
            // Try sending a real email if an argument is provided, otherwise just verify
            const testRecipient = process.argv[2];
            if (testRecipient) {
                console.log(`Attempting to send test email to ${testRecipient}...`);
                await emailService.sendTestEmail(testRecipient);
                console.log('✅ Test email sent!');
            } else {
                console.log('ℹ️ No recipient provided, skipping send test. Pass email as argument to test sending.');
            }
        } else {
            console.error('❌ Connection Verification Failed.');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testEmail();
