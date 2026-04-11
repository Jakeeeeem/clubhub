const emailService = require("./services/email-service");

async function testEmail() {
  console.log("📧 Testing email configuration...\n");

  try {
    // Verify connection first
    console.log("🔍 Verifying SMTP connection...");
    const isConnected = await emailService.verifyConnection();

    if (!isConnected) {
      console.error("❌ SMTP connection failed. Check your credentials.");
      process.exit(1);
    }

    console.log("✅ SMTP connection verified!\n");

    // Send test email
    console.log("📤 Sending test email to: instantonlinesuccess@gmail.com");
    const result = await emailService.sendTestEmail(
      "instantonlinesuccess@gmail.com",
    );

    console.log("\n✅ Test email sent successfully!");
    console.log("Message ID:", result.messageId);

    if (result.previewUrl) {
      console.log("Preview URL (dev only):", result.previewUrl);
    }

    console.log("\n📬 Check your inbox at instantonlinesuccess@gmail.com");
  } catch (error) {
    console.error("\n❌ Email test failed:");
    console.error("Error:", error.message);

    if (error.code) {
      console.error("Error Code:", error.code);
    }

    if (error.response) {
      console.error("SMTP Response:", error.response);
    }

    process.exit(1);
  }
}

testEmail()
  .then(() => {
    console.log("\n✅ Email test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Unexpected error:", error);
    process.exit(1);
  });
