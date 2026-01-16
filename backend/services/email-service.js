const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = this.initializeTransporter();
  }

  initializeTransporter() {
    const config = this.getEmailConfig();
    return nodemailer.createTransport(config);
  }

  getEmailConfig() {
    // Priority: 
    // 1. SendPulse (Specific SMTP)
    // 2. Mailgun (SMTP)
    // 3. Gmail (Less secure apps or App Password)
    // 4. Generic SMTP
    // 5. Ethereal (Dev fallback)

    if (process.env.EMAIL_SERVICE === 'sendpulse' || (process.env.SENDPULSE_SMTP_USER && process.env.SENDPULSE_SMTP_PASS)) {
      console.log('📧 Using SendPulse SMTP Service');
      return {
        host: 'smtp-pulse.com',
        port: process.env.SENDPULSE_SMTP_PORT || 587,
        secure: process.env.SENDPULSE_SMTP_SECURE === 'true',
        auth: {
          user: process.env.SENDPULSE_SMTP_USER,
          pass: process.env.SENDPULSE_SMTP_PASS
        }
      };
    } else if (process.env.EMAIL_SERVICE === 'mailgun' && process.env.MAILGUN_SMTP_SERVER) {
      return {
        host: process.env.MAILGUN_SMTP_SERVER,
        port: process.env.MAILGUN_SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.MAILGUN_SMTP_LOGIN,
          pass: process.env.MAILGUN_SMTP_PASSWORD
        }
      };
    } else if (process.env.EMAIL_SERVICE === 'gmail' && process.env.GMAIL_USER) {
      return {
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS
        }
      };
    } else if (process.env.SMTP_HOST) {
      return {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      };
    } else {
      // Create a test account on-the-fly for development if no config is present
      console.log('ℹ️ No email configuration found. Using Ethereal for development...');
      return {
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: process.env.ETHEREAL_USER || 'test@ethereal.email',
          pass: process.env.ETHEREAL_PASS || 'password'
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

  // --- TEMPLATE HELPERS ---

  // Base Premium Template Wrapper
  getBaseHtmlTemplate(content, clubInfo = {}) {
    const clubHubLogo = process.env.CLUBHUB_LOGO_URL || 'https://elitepro-clubhub.web.app/assets/logo.png'; // Fallback
    const orgLogo = clubInfo.logoUrl ? `<img src="${clubInfo.logoUrl}" style="max-height: 50px; margin-top: 10px; border-radius: 8px;">` : '';
    const footerOrg = clubInfo.name ? `<p><strong>${clubInfo.name}</strong> powered by ClubHub</p>` : '<p>The ClubHub Team</p>';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
          body { font-family: 'Outfit', 'Segoe UI', Tahoma, Verdana, sans-serif; line-height: 1.6; color: #e2e8f0; margin: 0; padding: 0; background-color: #0a0a0b; }
          .wrapper { background-color: #0a0a0b; padding: 40px 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #1a1a1c; border-radius: 24px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.08); }
          .header { padding: 40px; text-align: center; background: radial-gradient(circle at top right, #252529, #1a1a1c); border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
          .content { padding: 40px; }
          .footer { padding: 30px; text-align: center; background: #0f172a; color: #94a3b8; font-size: 13px; border-top: 1px solid rgba(255, 255, 255, 0.05); }
          .btn { display: inline-block; background: #dc2626; color: #ffffff !important; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; margin: 25px 0; transition: all 0.3s; box-shadow: 0 10px 20px rgba(220, 38, 38, 0.2); text-align: center; }
          .card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 25px; margin: 20px 0; }
          h1, h2, h3 { color: #ffffff; margin-top: 0; font-family: 'Outfit', sans-serif; }
          .accent { color: #dc2626; }
          p { margin: 15px 0; color: #cbd5e1; }
          .logo-main { max-height: 40px; margin-bottom: 10px; }
          .divider { height: 1px; background: rgba(255, 255, 255, 0.05); margin: 30px 0; }
          ul { padding-left: 20px; }
          li { margin-bottom: 8px; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <img src="${clubHubLogo}" alt="ClubHub" class="logo-main">
              ${orgLogo}
            </div>
            <div class="content">
              ${content}
            </div>
            <div class="footer">
              ${footerOrg}
              <p>© ${new Date().getFullYear()} ClubHub. All rights reserved.</p>
              <p>Making sports club management simple and effective.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Send club invitation email
  async sendClubInviteEmail(inviteData) {
    const {
      email,
      clubName,
      inviterName,
      inviteLink,
      personalMessage,
      clubRole,
      logoUrl
    } = inviteData;

    try {
      const subject = `🏆 Join ${clubName} on ClubHub`;
      
      const content = `
        <h2 style="text-align: center;">You're Invited!</h2>
        <p>Hello,</p>
        <p><strong>${inviterName}</strong> has invited you to join <span class="accent">${clubName}</span> as a <strong>${clubRole || 'member'}</strong>.</p>
        
        ${personalMessage ? `
          <div class="card">
            <p style="margin: 0; font-style: italic; color: #94a3b8;">" ${personalMessage} "</p>
          </div>
        ` : ''}

        <div style="text-align: center;">
          <a href="${inviteLink}" class="btn">Accept Invitation & Join</a>
        </div>

        <div class="divider"></div>
        
        <p style="font-size: 14px; color: #94a3b8;">
          ClubHub is the premier platform for sports management. By joining, you'll be able to manage your schedule, communicate with your team, and track your performance all in one place.
        </p>
      `;

      const html = this.getBaseHtmlTemplate(content, { name: clubName, logoUrl });

      const mailOptions = {
        from: `"${clubName} via ClubHub" <${process.env.EMAIL_FROM || 'noreply@clubhub.app'}>`,
        to: email,
        subject,
        html,
        text: `You've been invited to join ${clubName} on ClubHub by ${inviterName}. Join here: ${inviteLink}`,
        replyTo: process.env.EMAIL_REPLY_TO
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('❌ Failed to send club invite email:', error);
      throw error;
    }
  }

  // Send welcome email after registration
  async sendWelcomeEmail(welcomeData) {
    const { email, firstName, accountType, dashboardLink } = welcomeData;

    try {
      const subject = `🎉 Welcome to ClubHub, ${firstName}!`;
      
      const content = `
        <h2 style="text-align: center;">Welcome to the Community!</h2>
        <p>Hello ${firstName},</p>
        <p>We're thrilled to have you on board. Your <span class="accent">${accountType}</span> account has been successfully created.</p>
        
        <div class="card">
          <h3 style="margin-bottom: 10px;">🚀 What's Next?</h3>
          <ul>
            ${accountType === 'organization' ? `
              <li>Complete your club profile and upload your logo</li>
              <li>Invite your coaching staff and players</li>
              <li>Set up your first team and schedule sessions</li>
            ` : `
              <li>Refine your player profile with experience and stats</li>
              <li>Search for local clubs and apply to join</li>
              <li>Keep track of your training and development</li>
            `}
          </ul>
        </div>

        <div style="text-align: center;">
          <a href="${dashboardLink}" class="btn">Go to My Dashboard</a>
        </div>

        <p>If you need any help getting started, our team is always here to support you.</p>
      `;

      const html = this.getBaseHtmlTemplate(content);

      const mailOptions = {
        from: `"ClubHub" <${process.env.EMAIL_FROM || 'welcome@clubhub.app'}>`,
        to: email,
        subject,
        html,
        text: `Welcome to ClubHub, ${firstName}! Your account is ready. Access your dashboard here: ${dashboardLink}`
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      throw error;
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email, firstName, resetUrl) {
    try {
      const subject = `🔐 Reset Your ClubHub Password`;
      
      const content = `
        <h2 style="text-align: center;">Password Reset Request</h2>
        <p>Hello ${firstName},</p>
        <p>We received a request to reset your password. If this was you, please click the button below to secure your account:</p>
        
        <div style="text-align: center;">
          <a href="${resetUrl}" class="btn">Reset Password</a>
        </div>

        <div class="card" style="background: rgba(220, 38, 38, 0.05); border-color: rgba(220, 38, 38, 0.2);">
          <p style="margin: 0; color: #fca5a5; font-size: 14px;">
            <strong>Security Note:</strong> This link will expire in 60 minutes. If you did not request this, please ignore this email and your password will remain unchanged.
          </p>
        </div>
      `;

      const html = this.getBaseHtmlTemplate(content);

      const mailOptions = {
        from: `"ClubHub Security" <${process.env.EMAIL_FROM || 'security@clubhub.app'}>`,
        to: email,
        subject,
        html,
        text: `Reset your ClubHub password using this link: ${resetUrl}`
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('❌ Failed to send reset email:', error);
      throw error;
    }
  }

  // Send password reset confirmation
  async sendPasswordResetConfirmationEmail(email, firstName) {
    try {
      const subject = `✅ Password Reset Successful`;
      
      const content = `
        <h2 style="text-align: center;">Security Update</h2>
        <p>Hello ${firstName},</p>
        <p>Your password has been successfully reset. You can now log in to your account with your new credentials.</p>
        
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:8000'}/login.html" class="btn">Login Now</a>
        </div>

        <p>If you did not perform this action, please contact our support team immediately.</p>
      `;

      const html = this.getBaseHtmlTemplate(content);

      const mailOptions = {
        from: `"ClubHub Security" <${process.env.EMAIL_FROM || 'security@clubhub.app'}>`,
        to: email,
        subject,
        html,
        text: `Your ClubHub password has been successfully reset.`
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('❌ Failed to send confirmation email:', error);
      throw error;
    }
  }

  // Send payment reminder email
  async sendPaymentReminderEmail(paymentData) {
    const {
      email,
      firstName,
      clubName,
      amount,
      dueDate,
      description,
      paymentLink,
      logoUrl
    } = paymentData;

    try {
      const formattedAmount = new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP'
      }).format(amount);

      const subject = `💳 Payment Reminder: ${formattedAmount} for ${clubName}`;
      
      const content = `
        <h2 style="text-align: center;">Payment Reminder</h2>
        <p>Hello ${firstName},</p>
        <p>This is a friendly reminder for an upcoming or overdue payment.</p>
        
        <div class="card">
          <p><strong>Amount:</strong> ${formattedAmount}</p>
          <p><strong>Description:</strong> ${description}</p>
          <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
        </div>

        <div style="text-align: center;">
          <a href="${paymentLink}" class="btn">Complete Payment</a>
        </div>
      `;

      const html = this.getBaseHtmlTemplate(content, { name: clubName, logoUrl });

      const mailOptions = {
        from: `"${clubName} via ClubHub" <${process.env.EMAIL_FROM || 'billing@clubhub.app'}>`,
        to: email,
        subject,
        html,
        text: `Payment reminder for ${clubName}: ${formattedAmount} for ${description}. Pay here: ${paymentLink}`
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('❌ Failed to send payment reminder:', error);
      throw error;
    }
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
        html: this.getBaseHtmlTemplate(`
          <h2 style="text-align: center;">Email Test Successful!</h2>
          <p>If you're reading this, the ClubHub email service is correctly configured and reaching your inbox.</p>
          <div class="card">
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
            <p><strong>Service:</strong> ${process.env.EMAIL_SERVICE || 'Ethereal (Dev)'}</p>
          </div>
        `),
        text: `ClubHub Email Test Successful! Timestamp: ${new Date().toISOString()}`
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