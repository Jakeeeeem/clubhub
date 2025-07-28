const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  // Initialize email transporter based on environment
  initializeTransporter() {
    const emailConfig = this.getEmailConfig();
    
    try {
      this.transporter = nodemailer.createTransporter(emailConfig);
      console.log('✅ Email service initialized successfully');
      
      // Verify connection
      this.verifyConnection();
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
    }
  }

  // Get email configuration based on environment
  getEmailConfig() {
    if (process.env.NODE_ENV === 'production') {
      // Production email configuration
      if (process.env.EMAIL_SERVICE === 'gmail') {
        return {
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        };
      } else if (process.env.EMAIL_SERVICE === 'sendgrid') {
        return {
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY
          }
        };
      } else if (process.env.EMAIL_SERVICE === 'mailgun') {
        return {
          host: 'smtp.mailgun.org',
          port: 587,
          secure: false,
          auth: {
            user: process.env.MAILGUN_SMTP_LOGIN,
            pass: process.env.MAILGUN_SMTP_PASSWORD
          }
        };
      } else {
        // Generic SMTP configuration
        return {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        };
      }
    } else {
      // Development configuration using Ethereal Email (testing)
      return {
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: process.env.ETHEREAL_USER || 'ethereal.user@ethereal.email',
          pass: process.env.ETHEREAL_PASS || 'ethereal.password'
        }
      };
    }
  }

  // Verify email connection
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email server connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email server connection failed:', error);
      return false;
    }
  }

  // Send club invitation email
  async sendClubInviteEmail(inviteData) {
    const {
      email,
      clubName,
      inviterName,
      inviteLink,
      personalMessage,
      isPublic,
      firstName,
      lastName,
      clubRole
    } = inviteData;

    try {
      console.log(`📧 Sending club invite email to: ${email}`);

      const emailTemplate = this.createClubInviteTemplate({
        clubName,
        inviterName,
        inviteLink,
        personalMessage,
        isPublic,
        firstName,
        lastName,
        clubRole
      });

      const mailOptions = {
        from: `"${clubName} via ClubHub" <${process.env.EMAIL_FROM || 'noreply@clubhub.app'}>`,
        to: email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
        replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Club invite email sent successfully:', result.messageId);
      
      // Log preview URL for development
      if (process.env.NODE_ENV !== 'production') {
        console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(result));
      }

      return {
        success: true,
        messageId: result.messageId,
        previewUrl: process.env.NODE_ENV !== 'production' ? nodemailer.getTestMessageUrl(result) : null
      };

    } catch (error) {
      console.error('❌ Failed to send club invite email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  // Send welcome email after joining club
  async sendWelcomeEmail(welcomeData) {
    const {
      email,
      firstName,
      lastName,
      clubName,
      clubRole,
      teamName,
      dashboardLink
    } = welcomeData;

    try {
      console.log(`📧 Sending welcome email to: ${email}`);

      const emailTemplate = this.createWelcomeTemplate({
        firstName,
        lastName,
        clubName,
        clubRole,
        teamName,
        dashboardLink
      });

      const mailOptions = {
        from: `"${clubName} via ClubHub" <${process.env.EMAIL_FROM || 'noreply@clubhub.app'}>`,
        to: email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Welcome email sent successfully:', result.messageId);

      return {
        success: true,
        messageId: result.messageId
      };

    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }
  }

  // Send payment reminder email
  async sendPaymentReminderEmail(paymentData) {
    const {
      email,
      firstName,
      lastName,
      clubName,
      amount,
      dueDate,
      description,
      paymentLink
    } = paymentData;

    try {
      console.log(`📧 Sending payment reminder to: ${email}`);

      const emailTemplate = this.createPaymentReminderTemplate({
        firstName,
        lastName,
        clubName,
        amount,
        dueDate,
        description,
        paymentLink
      });

      const mailOptions = {
        from: `"${clubName} via ClubHub" <${process.env.EMAIL_FROM || 'noreply@clubhub.app'}>`,
        to: email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Payment reminder sent successfully:', result.messageId);

      return {
        success: true,
        messageId: result.messageId
      };

    } catch (error) {
      console.error('❌ Failed to send payment reminder:', error);
      throw new Error(`Failed to send payment reminder: ${error.message}`);
    }
  }

  // Create club invitation email template
  createClubInviteTemplate({ clubName, inviterName, inviteLink, personalMessage, isPublic, firstName, lastName, clubRole }) {
    const recipientName = firstName && lastName ? `${firstName} ${lastName}` : 'there';
    
    const subject = `🏆 You're invited to join ${clubName} on ClubHub!`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Club Invitation</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f4f4f4;
          }
          .container { 
            max-width: 600px; 
            margin: 20px auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
          }
          .header h1 {
            margin: 0 0 10px 0;
            font-size: 28px;
            font-weight: 700;
          }
          .header p {
            margin: 0;
            font-size: 16px;
            opacity: 0.9;
          }
          .content { 
            padding: 40px 30px; 
            background: white;
          }
          .club-info { 
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); 
            padding: 25px; 
            border-radius: 12px; 
            margin: 25px 0; 
            border-left: 4px solid #007bff; 
          }
          .club-info h3 {
            margin: 0 0 15px 0;
            color: #007bff;
            font-size: 20px;
          }
          .cta-button { 
            display: inline-block; 
            background: linear-gradient(135deg, #28a745, #20c997); 
            color: white; 
            padding: 18px 35px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: bold; 
            font-size: 16px;
            margin: 20px 0;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
          }
          .cta-button:hover {
            background: linear-gradient(135deg, #20c997, #17a2b8);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
          }
          .message-box { 
            background: #fff3cd; 
            border: 1px solid #ffeaa7; 
            border-left: 4px solid #f39c12;
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
          }
          .message-box h3 {
            margin: 0 0 10px 0;
            color: #856404;
            font-size: 18px;
          }
          .benefits {
            background: #e8f5e8;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .benefits ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          .benefits li {
            margin: 8px 0;
            color: #155724;
          }
          .steps {
            background: #e3f2fd;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .steps ol {
            margin: 10px 0;
            padding-left: 20px;
          }
          .steps li {
            margin: 8px 0;
            color: #1565c0;
          }
          .footer { 
            background: #343a40; 
            color: white; 
            padding: 30px; 
            text-align: center; 
            font-size: 14px; 
          }
          .footer p {
            margin: 8px 0;
          }
          .link-fallback {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            font-size: 14px;
            color: #666;
            word-break: break-all;
          }
          .role-badge {
            display: inline-block;
            background: linear-gradient(135deg, #17a2b8, #007bff);
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 You're Invited!</h1>
            <p>Join ${clubName} on ClubHub</p>
          </div>
          
          <div class="content">
            <h2>Hello ${recipientName}!</h2>
            
            <p>You've been invited by <strong>${inviterName}</strong> to join <strong>${clubName}</strong> on ClubHub - the premier platform for sports club management.</p>
            
            <div class="role-badge">
              ${clubRole ? `You're invited as: ${clubRole.charAt(0).toUpperCase() + clubRole.slice(1)}` : 'Member'}
            </div>
            
            ${personalMessage ? `
              <div class="message-box">
                <h3>💬 Personal Message:</h3>
                <p><em>"${personalMessage}"</em></p>
              </div>
            ` : ''}
            
            <div class="club-info">
              <h3>🏆 About ${clubName}</h3>
              <p>Join our growing community and enjoy:</p>
            </div>
            
            <div class="benefits">
              <ul>
                <li>🏃‍♂️ Access to training sessions and matches</li>
                <li>👥 Connect with fellow club members</li>
                <li>📅 Stay updated with club events and activities</li>
                <li>💼 Professional club management tools</li>
                <li>📊 Track your progress and achievements</li>
                <li>🏆 Participate in tournaments and competitions</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${inviteLink}" class="cta-button">
                ✅ Accept Invitation & Join Club
              </a>
            </div>
            
            <div class="steps">
              <p><strong>What happens next?</strong></p>
              <ol>
                <li>Click the button above to accept the invitation</li>
                <li>${isPublic ? 'Create an account or log in to ClubHub' : 'Log in with your ClubHub account'}</li>
                <li>Accept the club membership terms</li>
                <li>Start participating in club activities!</li>
              </ol>
            </div>
            
            <div class="link-fallback">
              <p><strong>Having trouble?</strong> Copy and paste this link into your browser:</p>
              <a href="${inviteLink}" style="color: #007bff;">${inviteLink}</a>
            </div>
            
            ${!isPublic ? `
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                This invitation is specifically for you. If you don't want to join the club, you can decline the invitation using the same link.
              </p>
            ` : ''}
          </div>
          
          <div class="footer">
            <p><strong>This invitation was sent by ${clubName} via ClubHub</strong></p>
            <p>ClubHub - Making sports club management simple and effective</p>
            <p style="font-size: 12px; margin-top: 15px; opacity: 0.8;">
              If you have any questions, please contact the club directly or visit our support center.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
🏆 You're invited to join ${clubName} on ClubHub!

Hello ${recipientName}!

You've been invited by ${inviterName} to join ${clubName} on ClubHub - the premier platform for sports club management.

${clubRole ? `You're invited as: ${clubRole.charAt(0).toUpperCase() + clubRole.slice(1)}` : ''}

${personalMessage ? `Personal Message: "${personalMessage}"` : ''}

About ${clubName}:
Join our growing community and enjoy:
• Access to training sessions and matches  
• Connect with fellow club members
• Stay updated with club events and activities
• Professional club management tools
• Track your progress and achievements
• Participate in tournaments and competitions

To accept this invitation, visit: ${inviteLink}

What happens next?
1. Click the link above to accept the invitation
2. ${isPublic ? 'Create an account or log in to ClubHub' : 'Log in with your ClubHub account'}
3. Accept the club membership terms
4. Start participating in club activities!

${!isPublic ? 'This invitation is specifically for you. If you don\'t want to join the club, you can decline the invitation using the same link.' : ''}

This invitation was sent by ${clubName} via ClubHub.
ClubHub - Making sports club management simple and effective.
    `;

    return { subject, html, text };
  }

  // Create welcome email template
  createWelcomeTemplate({ firstName, lastName, clubName, clubRole, teamName, dashboardLink }) {
    const name = firstName && lastName ? `${firstName} ${lastName}` : 'there';
    
    const subject = `🎉 Welcome to ${clubName}! You're now a member`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${clubName}</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f4f4f4;
          }
          .container { 
            max-width: 600px; 
            margin: 20px auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #28a745, #20c997); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
          }
          .content { padding: 40px 30px; }
          .cta-button { 
            display: inline-block; 
            background: linear-gradient(135deg, #007bff, #0056b3); 
            color: white; 
            padding: 18px 35px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: bold; 
            margin: 20px 0;
          }
          .info-box {
            background: #e8f5e8;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #28a745;
          }
          .footer { 
            background: #343a40; 
            color: white; 
            padding: 30px; 
            text-align: center; 
            font-size: 14px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to ${clubName}!</h1>
            <p>You're now officially a member</p>
          </div>
          
          <div class="content">
            <h2>Hello ${name}!</h2>
            
            <p>Congratulations! You have successfully joined <strong>${clubName}</strong> as a <strong>${clubRole}</strong>.</p>
            
            ${teamName ? `
              <div class="info-box">
                <h3>🏆 Team Assignment</h3>
                <p>You've been assigned to: <strong>${teamName}</strong></p>
              </div>
            ` : ''}
            
            <div class="info-box">
              <h3>🚀 Next Steps:</h3>
              <ul>
                <li>Complete your profile in your dashboard</li>
                <li>Check upcoming events and training sessions</li>
                <li>Connect with other club members</li>
                <li>Review any payment requirements</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${dashboardLink}" class="cta-button">
                📊 Go to Your Dashboard
              </a>
            </div>
            
            <p>If you have any questions, don't hesitate to reach out to the club administrators.</p>
            
            <p>Welcome to the team!</p>
          </div>
          
          <div class="footer">
            <p><strong>${clubName} via ClubHub</strong></p>
            <p>ClubHub - Making sports club management simple and effective</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
🎉 Welcome to ${clubName}!

Hello ${name}!

Congratulations! You have successfully joined ${clubName} as a ${clubRole}.

${teamName ? `Team Assignment: You've been assigned to ${teamName}` : ''}

Next Steps:
• Complete your profile in your dashboard
• Check upcoming events and training sessions  
• Connect with other club members
• Review any payment requirements

Visit your dashboard: ${dashboardLink}

If you have any questions, don't hesitate to reach out to the club administrators.

Welcome to the team!

${clubName} via ClubHub
ClubHub - Making sports club management simple and effective
    `;

    return { subject, html, text };
  }

  // Create payment reminder template
  createPaymentReminderTemplate({ firstName, lastName, clubName, amount, dueDate, description, paymentLink }) {
    const name = firstName && lastName ? `${firstName} ${lastName}` : 'there';
    const formattedAmount = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
    const formattedDate = new Date(dueDate).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    
    const subject = `💳 Payment Reminder: ${formattedAmount} due for ${clubName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Reminder</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f4f4f4;
          }
          .container { 
            max-width: 600px; 
            margin: 20px auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #ff6b6b, #ee5a24); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
          }
          .content { padding: 40px 30px; }
          .payment-details {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .cta-button { 
            display: inline-block; 
            background: linear-gradient(135deg, #28a745, #20c997); 
            color: white; 
            padding: 18px 35px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: bold; 
            margin: 20px 0;
          }
          .footer { 
            background: #343a40; 
            color: white; 
            padding: 30px; 
            text-align: center; 
            font-size: 14px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💳 Payment Reminder</h1>
            <p>From ${clubName}</p>
          </div>
          
          <div class="content">
            <h2>Hello ${name}!</h2>
            
            <p>This is a friendly reminder that you have an outstanding payment for ${clubName}.</p>
            
            <div class="payment-details">
              <h3>Payment Details:</h3>
              <p><strong>Amount:</strong> ${formattedAmount}</p>
              <p><strong>Description:</strong> ${description}</p>
              <p><strong>Due Date:</strong> ${formattedDate}</p>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${paymentLink}" class="cta-button">
                💳 Pay Now
              </a>
            </div>
            
            <p>Thank you for being a valued member of ${clubName}. If you have any questions about this payment, please contact us directly.</p>
          </div>
          
          <div class="footer">
            <p><strong>${clubName} via ClubHub</strong></p>
            <p>ClubHub - Making sports club management simple and effective</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
💳 Payment Reminder from ${clubName}

Hello ${name}!

This is a friendly reminder that you have an outstanding payment for ${clubName}.

Payment Details:
Amount: ${formattedAmount}
Description: ${description}
Due Date: ${formattedDate}

Pay now: ${paymentLink}

Thank you for being a valued member of ${clubName}. If you have any questions about this payment, please contact us directly.

${clubName} via ClubHub
ClubHub - Making sports club management simple and effective
    `;

    return { subject, html, text };
  }

  // Generic email sending method
  async sendEmail({ to, subject, html, text, from, replyTo }) {
    try {
      const mailOptions = {
        from: from || `"ClubHub" <${process.env.EMAIL_FROM || 'noreply@clubhub.app'}>`,
        to,
        subject,
        html,
        text,
        replyTo: replyTo || process.env.EMAIL_REPLY_TO
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email sent successfully:', result.messageId);

      return {
        success: true,
        messageId: result.messageId,
        previewUrl: process.env.NODE_ENV !== 'production' ? nodemailer.getTestMessageUrl(result) : null
      };

    } catch (error) {
      console.error('❌ Failed to send email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  // Test email functionality
  async sendTestEmail(email) {
    try {
      const result = await this.sendEmail({
        to: email,
        subject: '🧪 ClubHub Email Test',
        html: `
          <h1>Email Test Successful!</h1>
          <p>This is a test email from ClubHub to verify email functionality.</p>
          <p>If you received this email, the email service is working correctly.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        `,
        text: `
Email Test Successful!

This is a test email from ClubHub to verify email functionality.
If you received this email, the email service is working correctly.

Timestamp: ${new Date().toISOString()}
        `
      });

      return result;
    } catch (error) {
      console.error('❌ Test email failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;