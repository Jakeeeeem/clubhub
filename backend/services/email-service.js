const nodemailer = require("nodemailer");

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

    if (
      process.env.EMAIL_SERVICE === "sendpulse" ||
      (process.env.SENDPULSE_SMTP_USER && process.env.SENDPULSE_SMTP_PASS)
    ) {
      console.log("📧 Using SendPulse SMTP Service");
      return {
        host: "smtp-pulse.com",
        port: process.env.SENDPULSE_SMTP_PORT || 587,
        secure: process.env.SENDPULSE_SMTP_SECURE === "true",
        auth: {
          user: process.env.SENDPULSE_SMTP_USER,
          pass: process.env.SENDPULSE_SMTP_PASS,
        },
      };
    } else if (
      process.env.EMAIL_SERVICE === "mailgun" &&
      process.env.MAILGUN_SMTP_SERVER
    ) {
      return {
        host: process.env.MAILGUN_SMTP_SERVER,
        port: process.env.MAILGUN_SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.MAILGUN_SMTP_LOGIN,
          pass: process.env.MAILGUN_SMTP_PASSWORD,
        },
      };
    } else if (
      process.env.EMAIL_SERVICE === "gmail" &&
      process.env.GMAIL_USER
    ) {
      return {
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS,
        },
      };
    } else if (process.env.SMTP_HOST) {
      return {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      };
    } else {
      // Create a test account on-the-fly for development if no config is present
      console.log(
        "ℹ️ No email configuration found. Using Ethereal for development...",
      );
      return {
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: process.env.ETHEREAL_USER || "test@ethereal.email",
          pass: process.env.ETHEREAL_PASS || "password",
        },
      };
    }
  }

  // Verify email connection
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log("✅ Email server connection verified");
      return true;
    } catch (error) {
      console.error("❌ Email server connection failed:", error);
      return false;
    }
  }

  // --- TEMPLATE HELPERS ---

  // Base Premium Template Wrapper
  getBaseHtmlTemplate(content, clubInfo = {}) {
    const clubHubLogo =
      process.env.CLUBHUB_LOGO_URL ||
      "https://clubhubsports.net/images/logo.png";
    // User requested only ClubHub logo, ignoring specific club logos for header consistency

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
          body { 
            font-family: 'Outfit', 'Helvetica Neue', Helvetica, Arial, sans-serif; 
            line-height: 1.8; 
            color: #f1f5f9; 
            margin: 0; 
            padding: 0; 
            background-color: #050505; 
            -webkit-font-smoothing: antialiased;
          }
          .wrapper { 
            background-color: #050505; 
            padding: 60px 20px; 
            width: 100%;
            box-sizing: border-box;
          }
          .container { 
            max-width: 680px; 
            margin: 0 auto; 
            background: #121214; 
            border-radius: 32px; 
            overflow: hidden; 
            border: 1px solid rgba(255, 255, 255, 0.05); 
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          }
          .header { 
            padding: 50px 0 40px; 
            text-align: center; 
            background: #121214;
            /* subtle glow */
            background-image: radial-gradient(circle at 50% 0%, rgba(255, 51, 51, 0.08) 0%, transparent 50%);
          }
          .logo-main { 
            height: 70px; /* Bigger logo */
            width: auto; 
            display: block;
            margin: 0 auto;
          }
          .content { 
            padding: 0 60px 50px; 
            font-size: 17px; /* Larger text */
            color: #cbd5e1;
            text-align: left;
          }
          h1, h2, h3 { 
            color: #ffffff; 
            margin-top: 0; 
            font-weight: 700;
            letter-spacing: -0.5px;
            text-align: center;
          }
          h2 { font-size: 28px; margin-bottom: 24px; }
          p { margin: 0 0 24px; }
          
          .btn { 
            display: inline-block; 
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); 
            color: #ffffff !important; 
            padding: 18px 40px; 
            text-decoration: none; 
            border-radius: 50px; 
            font-weight: 600; 
            font-size: 18px; 
            margin: 32px 0; 
            transition: transform 0.2s; 
            box-shadow: 0 10px 25px rgba(220, 38, 38, 0.3); 
            text-align: center; 
          }
          .btn:hover { transform: translateY(-2px); }
          
          .card { 
            background: rgba(255, 255, 255, 0.02); 
            border: 1px solid rgba(255, 255, 255, 0.06); 
            border-radius: 20px; 
            padding: 30px; 
            margin: 30px 0; 
          }
          .footer { 
            padding: 40px; 
            text-align: center; 
            background: #0a0a0c; 
            color: #64748b; 
            font-size: 14px; 
            border-top: 1px solid rgba(255, 255, 255, 0.04); 
          }
          .accent { color: #ef4444; font-weight: 600; }
          .divider { height: 1px; background: rgba(255, 255, 255, 0.06); margin: 40px 0; }
          ul { padding-left: 20px; }
          li { margin-bottom: 12px; }
          
          @media (max-width: 600px) {
            .content { padding: 0 30px 40px; }
            .header { padding: 40px 0 30px; }
            h2 { font-size: 24px; }
            .btn { width: 80%; }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <img src="${clubHubLogo}" alt="ClubHub" class="logo-main">
            </div>
            <div class="content">
              ${content}
            </div>
            <div class="footer">
              <p style="margin-bottom: 10px; color: #94a3b8;">Powered by <strong>ClubHub</strong> &bull; The Future of Sports Management</p>
              <p style="font-size: 12px; opacity: 0.6;">
                You are receiving this email because of your association with a ClubHub organization. <br>
                © ${new Date().getFullYear()} ClubHub. All rights reserved.
              </p>
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
    } = inviteData;

    try {
      const subject = `You're Invited to Join ${clubName}`;

      const content = `
        <h2>Official Club Invitation</h2>
        <p>Hello,</p>
        <p>You have been officially invited to join <strong>${clubName}</strong> on the ClubHub platform. This invitation was sent by <span class="accent">${inviterName}</span> for the role of <strong>${clubRole || "Member"}</strong>.</p>
        
        <p>ClubHub is our central hub for all team operations, scheduling, payments, and communications. Joining will give you immediate access to your team's dashboard.</p>

        ${
          personalMessage
            ? `
          <div class="card">
            <p style="margin: 0; font-style: italic; color: #a1a1aa;">&ldquo;${personalMessage}&rdquo;</p>
          </div>
        `
            : ""
        }

        <div style="text-align: center;">
          <a href="${inviteLink}" class="btn">Accept Invitation</a>
        </div>
        
        <p style="text-align: center; font-size: 15px; color: #94a3b8;">
          Note: This invitation link is unique to you and will expire in 48 hours for security reasons.
        </p>
      `;

      const html = this.getBaseHtmlTemplate(content); // No club logo passed

      const mailOptions = {
        from: `"${clubName} • ClubHub" <${process.env.EMAIL_FROM || "invite@clubhub.app"}>`,
        to: email,
        subject,
        html,
        text: `You've been invited to join ${clubName} on ClubHub. Join here: ${inviteLink}`,
        replyTo: process.env.EMAIL_REPLY_TO,
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error("❌ Failed to send club invite email:", error);
      throw error;
    }
  }

  // Send welcome email after registration
  async sendWelcomeEmail(welcomeData) {
    const { email, firstName, accountType, dashboardLink } = welcomeData;

    try {
      const subject = `Welcome to the ClubHub Experience`;

      const content = `
        <h2>Welcome Aboard, ${firstName}!</h2>
        <p>We are absolutely thrilled to have you with us. Your account is now fully active, giving you access to the world's most advanced sports management platform.</p>
        
        <p>Whether you're here to manage an elite academy or track your personal development, ClubHub provides the professional tools you need to succeed.</p>
        
        <div class="card">
          <h3 style="margin-bottom: 20px; font-size: 20px;">Your Next Steps</h3>
          <ul>
            ${
              accountType === "organization"
                ? `
              <li><strong>Complete Your Profile:</strong> comprehensive profiles attract more talent.</li>
              <li><strong>Invite Staff & Players:</strong> Build your roster in seconds.</li>
              <li><strong>Schedule Events:</strong> Set up your season calendar.</li>
            `
                : `
              <li><strong>Build Your CV:</strong> Update stats and experience.</li>
              <li><strong>Find a Club:</strong> Browse elite academies and local teams.</li>
              <li><strong>Get Scouting:</strong> Opt-in to be seen by recruiters.</li>
            `
            }
          </ul>
        </div>

        <div style="text-align: center;">
          <a href="${dashboardLink}" class="btn">Access Dashboard</a>
        </div>

        <p>Thank you for choosing ClubHub. We're excited to see what you achieve.</p>
      `;

      const html = this.getBaseHtmlTemplate(content);

      const mailOptions = {
        from: `"ClubHub Team" <${process.env.EMAIL_FROM || "welcome@clubhub.app"}>`,
        to: email,
        subject,
        html,
        text: `Welcome to ClubHub, ${firstName}! Access your dashboard: ${dashboardLink}`,
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error("❌ Failed to send welcome email:", error);
      throw error;
    }
  }

  // Send welcome email for admin-created accounts
  async sendAdminWelcomeEmail(userData) {
    const { email, firstName, accountType, setPasswordLink } = userData;

    try {
      const subject = `Welcome to ClubHub - Set Your Password`;

      const content = `
        <h2>Welcome to ClubHub!</h2>
        <p>Hello ${firstName},</p>
        <p>An account has been created for you by the Platform Administrator.</p>
        <p>To get started, please click the button below to set your secure password and access your account.</p>
        
        <div style="text-align: center;">
          <a href="${setPasswordLink}" class="btn">Set Password & Login</a>
        </div>

        <div class="card">
          <p style="margin: 0; color: #94a3b8; font-size: 14px;">
            <strong>Note:</strong> This link is valid for 24 hours. If it expires, you can request a new one from the login page using "Forgot Password".
          </p>
        </div>
      `;

      const html = this.getBaseHtmlTemplate(content);

      const mailOptions = {
        from: `"ClubHub Admin" <${process.env.EMAIL_FROM || "admin@clubhub.app"}>`,
        to: email,
        subject,
        html,
        text: `Welcome to ClubHub! Set your password here: ${setPasswordLink}`,
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error("❌ Failed to send admin welcome email:", error);
      throw error;
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email, firstName, resetUrl) {
    try {
      const subject = `Secure Password Reset Request`;

      const content = `
        <h2>Reset Your Password</h2>
        <p>Hello ${firstName},</p>
        <p>We received a request to perform a security update on your account credentials. To proceed with setting a new password, please click the secure link below.</p>
        
        <div style="text-align: center;">
          <a href="${resetUrl}" class="btn">Reset Password</a>
        </div>

        <div class="card" style="border-left: 4px solid #ef4444;">
          <p style="margin: 0; color: #e2e8f0; font-size: 15px;">
            <strong>Security Notice:</strong> If you did not request this change, please disregard this email. Your account remains secure and no changes have been made.
          </p>
        </div>
      `;

      const html = this.getBaseHtmlTemplate(content);

      const mailOptions = {
        from: `"ClubHub Security" <${process.env.EMAIL_FROM || "security@clubhub.app"}>`,
        to: email,
        subject,
        html,
        text: `Reset your ClubHub password here: ${resetUrl}`,
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error("❌ Failed to send reset email:", error);
      throw error;
    }
  }

  // Send password reset confirmation
  async sendPasswordResetConfirmationEmail(email, firstName) {
    try {
      const subject = `Password Successfully Updated`;

      const content = `
        <h2>Account Security Updated</h2>
        <p>Hello ${firstName},</p>
        <p>This email is to confirm that the password for your ClubHub account has been successfully changed.</p>
        <p>You may now log in using your new credentials.</p>
        
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || "http://localhost:8000"}/login.html" class="btn">Login to Account</a>
        </div>
      `;

      const html = this.getBaseHtmlTemplate(content);

      const mailOptions = {
        from: `"ClubHub Security" <${process.env.EMAIL_FROM || "security@clubhub.app"}>`,
        to: email,
        subject,
        html,
        text: `Your ClubHub password was updated successfully.`,
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error("❌ Failed to send confirmation email:", error);
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
    } = paymentData;

    try {
      const formattedAmount = new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
      }).format(amount);

      const subject = `Payment Due: ${formattedAmount} - ${clubName}`;

      const content = `
        <h2>Payment Reminder</h2>
        <p>Hello ${firstName},</p>
        <p>This is an automated notification regarding an outstanding payment for <strong>${clubName}</strong>. Please ensure this is settled to maintain active status.</p>
        
        <div class="card">
          <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:10px;">
            <span style="color:#94a3b8;">Description</span>
            <span style="font-weight:600;">${description}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <span style="color:#94a3b8;">Due Date</span>
            <span>${new Date(dueDate).toLocaleDateString()}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-top:15px; font-size:18px;">
            <span style="color:#ffffff;">Total Amount</span>
            <span class="accent">${formattedAmount}</span>
          </div>
        </div>

        <div style="text-align: center;">
          <a href="${paymentLink}" class="btn">Make Secure Payment</a>
        </div>
        
        <p style="text-align: center; color: #64748b; font-size: 14px;">Payments are processed securely via Stripe.</p>
      `;

      const html = this.getBaseHtmlTemplate(content);

      const mailOptions = {
        from: `"${clubName} • Billing" <${process.env.EMAIL_FROM || "billing@clubhub.app"}>`,
        to: email,
        subject,
        html,
        text: `Payment of ${formattedAmount} due for ${clubName}. Pay here: ${paymentLink}`,
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error("❌ Failed to send payment reminder:", error);
      throw error;
    }
  }

  // Send team assignment email
  async sendTeamAssignmentEmail(assignmentData) {
    const { email, firstName, teamName, clubName, position, jerseyNumber } =
      assignmentData;

    try {
      const subject = `Welcome to the Team: ${teamName}`;
      const content = `
        <h2>You've been added to ${teamName}</h2>
        <p>Hello ${firstName},</p>
        <p>Great news! You have been officially added to the roster for <strong>${teamName}</strong> at <strong>${clubName}</strong>.</p>
        
        <div class="card">
          <h3 style="margin-bottom: 15px;">Your Team Details</h3>
          <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <span style="color:#94a3b8;">Position</span>
            <span style="font-weight:600;">${position || "Not Assigned"}</span>
          </div>
          ${
            jerseyNumber
              ? `
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#94a3b8;">Jersey Number</span>
            <span class="accent" style="font-size: 20px;">#${jerseyNumber}</span>
          </div>`
              : ""
          }
        </div>

        <p>You can now view your team schedule, teammates, and track your statistics directly through the ClubHub dashboard.</p>

        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || "https://clubhubsports.net"}/player-dashboard.html" class="btn">View My Team</a>
        </div>
      `;

      const html = this.getBaseHtmlTemplate(content);
      return await this.sendEmail({
        to: email,
        subject,
        html,
        text: `You have been added to ${teamName}! Login to view: ${process.env.FRONTEND_URL || "https://clubhubsports.net"}/player-dashboard.html`,
      });
    } catch (error) {
      console.error("❌ Failed to send team assignment email:", error);
      // We don't throw - we want the assignment to succeed even if email fails
    }
  }

  // Send event creation email (Team specific)
  async sendEventCreatedEmail(eventData) {
    const {
      email,
      firstName,
      eventTitle,
      eventDate,
      eventTime,
      location,
      teamName,
      clubName,
    } = eventData;

    try {
      const subject = `New Event Scheduled: ${eventTitle}`;
      const content = `
        <h2>New Team Event</h2>
        <p>Hello ${firstName},</p>
        <p>A new event has been scheduled for <strong>${teamName}</strong>.</p>
        
        <div class="card">
          <h3 style="margin-bottom: 20px;">${eventTitle}</h3>
          <p><strong>Date:</strong> ${new Date(eventDate).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${eventTime || "TBA"}</p>
          <p><strong>Location:</strong> ${location || "TBA"}</p>
        </div>

        <p>Please update your availability as soon as possible to help the coaching staff plan ahead.</p>

        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || "https://clubhubsports.net"}/player-dashboard.html" class="btn">Confirm Availability</a>
        </div>
      `;

      const html = this.getBaseHtmlTemplate(content);
      return await this.sendEmail({
        to: email,
        subject,
        html,
        text: `New event scheduled: ${eventTitle} on ${eventDate}. Confirm availability at ${process.env.FRONTEND_URL || "https://clubhubsports.net"}/player-dashboard.html`,
      });
    } catch (error) {
      console.error("❌ Failed to send event creation email:", error);
    }
  }

  // Send application status update email
  async sendApplicationUpdateEmail(appData) {
    const { email, firstName, clubName, status, listingTitle } = appData;

    try {
      const subject = `Update on your application to ${clubName}`;

      const statusTitle =
        {
          shortlisted: "You've been Shortlisted!",
          accepted: "Application Accepted",
          rejected: "Application Update",
          invited: "Team Invitation",
        }[status] || "Application Update";

      const statusMessage =
        {
          shortlisted: `Great news! Your application for <strong>${listingTitle}</strong> has been shortlisted. the coaching staff will be in touch shortly regarding next steps.`,
          accepted: `Congratulations! Your application for <strong>${listingTitle}</strong> has been accepted. We are excited to have you join us.`,
          rejected: `Thank you for your interest in <strong>${listingTitle}</strong>. Unfortunately, the club has decided not to proceed with your application at this time.`,
          invited: `You have been officially invited to join the team for <strong>${listingTitle}</strong>!`,
        }[status] ||
        `There has been an update to your application status for ${listingTitle}.`;

      const content = `
        <h2>${statusTitle}</h2>
        <p>Hello ${firstName},</p>
        <p>${statusMessage}</p>
        
        <div class="card">
          <p style="margin-bottom: 5px; color: #94a3b8;">Organization</p>
          <p style="font-weight: 600; font-size: 18px; margin-bottom: 15px;">${clubName}</p>
          <p style="margin-bottom: 5px; color: #94a3b8;">Position/Listing</p>
          <p style="font-weight: 600;">${listingTitle}</p>
        </div>

        ${
          status !== "rejected"
            ? `
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || "https://clubhubsports.net"}/player-dashboard.html" class="btn">View Dashboard</a>
        </div>`
            : ""
        }

        <p>Thank you for using ClubHub.</p>
      `;

      const html = this.getBaseHtmlTemplate(content);
      return await this.sendEmail({
        to: email,
        subject,
        html,
        text: `Update on your application for ${listingTitle} at ${clubName}: ${statusTitle}`,
      });
    } catch (error) {
      console.error("❌ Failed to send application update email:", error);
    }
  }

  // Generic email sending method
  async sendEmail({ to, subject, html, text, from, replyTo }) {
    try {
      const mailOptions = {
        from:
          from ||
          `"ClubHub" <${process.env.EMAIL_FROM || "noreply@clubhub.app"}>`,
        to,
        subject,
        html,
        text,
        replyTo: replyTo || process.env.EMAIL_REPLY_TO,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("✅ Email sent successfully:", result.messageId);

      return {
        success: true,
        messageId: result.messageId,
        previewUrl:
          process.env.NODE_ENV !== "production"
            ? nodemailer.getTestMessageUrl(result)
            : null,
      };
    } catch (error) {
      console.error("❌ Failed to send email:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  // Test email functionality
  async sendTestEmail(email) {
    try {
      const result = await this.sendEmail({
        to: email,
        subject: "Configuration Verified: ClubHub Email System",
        html: this.getBaseHtmlTemplate(`
          <h2>System Configuration Verified</h2>
          <p>This is a confirmation that your ClubHub email infrastructure is correctly configured and operational.</p>
          <div class="card">
            <p><strong>Status:</strong> <span style="color:#4ade80;">Operational</span></p>
            <p><strong>Environment:</strong> ${process.env.NODE_ENV || "development"}</p>
            <p><strong>Timestamp:</strong> ${new Date().toUTCString()}</p>
          </div>
        `),
        text: `ClubHub Email System Verified. ${new Date().toISOString()}`,
      });

      return result;
    } catch (error) {
      console.error("❌ Test email failed:", error);
      throw error;
    }
  }

  // Send plan assignment email
  async sendPlanAssignedEmail(data) {
    const {
      email,
      firstName,
      planName,
      clubName,
      amount,
      interval,
      startDate,
      subscriptionId,
      stripeAccountId,
      checkoutUrl,
    } = data;

    try {
      const formattedAmount = new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
      }).format(amount);

      const subject = `Your New Payment Plan: ${planName}`;

      // Determine the call to action
      // If we have a checkoutUrl, we link directly to Stripe.
      // Otherwise, we link to the dashboard.
      const actionLink =
        checkoutUrl ||
        `${process.env.FRONTEND_URL || "https://clubhubsports.net"}/player-dashboard.html`;
      const buttonText = checkoutUrl
        ? "Set Up Payment via Stripe"
        : subscriptionId
          ? "Confirm Payment Details"
          : "View My Subscriptions";

      const content = `
        <h2>Payment Plan Assigned</h2>
        <p>Hello ${firstName},</p>
        <p>You have been assigned to a new payment plan for <strong>${clubName}</strong>.</p>
        
        <div class="card">
          <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:10px;">
            <span style="color:#94a3b8;">Plan Name</span>
            <span style="font-weight:600;">${planName}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <span style="color:#94a3b8;">Price</span>
            <span>${formattedAmount} (${interval})</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#94a3b8;">Start Date</span>
            <span>${new Date(startDate).toLocaleDateString()}</span>
          </div>
           ${
             checkoutUrl || subscriptionId
               ? `
          <div style="margin-top: 15px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 10px; font-size: 0.9em; color: #fbbf24;">
            <p style="margin:0;">⚠ Verification Required</p>
            <p style="margin:5px 0 0 0; color: rgba(255,255,255,0.7);">Please click the button below to validte your payment method.</p>
          </div>
          `
               : ""
           }
        </div>

        <p>You can manage your subscription and view payment history in your player dashboard.</p>

        <div style="text-align: center;">
          <a href="${actionLink}" class="btn">
            ${buttonText}
          </a>
        </div>
      `;

      const html = this.getBaseHtmlTemplate(content);

      return await this.sendEmail({
        to: email,
        subject,
        html,
        text: `You have been assigned the ${planName} plan at ${clubName}. Please login to confirm details: ${actionLink}`,
      });
    } catch (error) {
      console.error("❌ Failed to send plan assignment email:", error);
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

// Export - Force V2 Rebuild
module.exports = emailService;
