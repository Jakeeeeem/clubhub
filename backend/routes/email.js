const express = require('express');
const router = express.Router();
const emailService = require('../services/email-service');
const { authenticateToken, requireOrganization } = require('../middleware/auth');

// Send generic email (Admin only or strict validation needed?)
// For now, restricting to authenticated users for demo purposes
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;
    
    // Basic permissions check - maybe only allow org owners?
    // For now allow any auth user to facilitate demo
    
    const result = await emailService.sendEmail({
      to,
      subject,
      html,
      text
    });

    res.json(result);
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Send club invite email
router.post('/send-invite', authenticateToken, requireOrganization, async (req, res) => {
  try {
    const { email, clubName, inviterName, inviteLink, personalMessage, clubRole, logoUrl } = req.body;

    // Validate required fields
    if (!email || !clubName || !inviteLink) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await emailService.sendClubInviteEmail({
        email,
        clubName,
        inviterName: inviterName || `${req.user.firstName} ${req.user.lastName}`,
        inviteLink,
        personalMessage,
        clubRole,
        logoUrl
    });

    res.json({ success: true, message: 'Invite email sent', result });
  } catch (error) {
    console.error('Send invite email error:', error);
    res.status(500).json({ error: 'Failed to send invite email' });
  }
});

module.exports = router;
