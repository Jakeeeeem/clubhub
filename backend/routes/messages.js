const express = require("express");
const { query } = require("../config/database");
const { authenticateToken, injectOrgContext } = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/messages
 * Fetches latest messages for the logged-in user to show in the messenger list.
 */
router.get("/", authenticateToken, injectOrgContext, async (req, res) => {
  try {
    const userId = req.user.id;
    const orgId = req.orgContext?.organization_id || req.user.organization_id || req.user.currentOrganizationId || req.user.currentGroupId || req.user.clubId || req.user.groupId;
    const allowedTypes = ["all", "direct", "announcement", "team"];
    const type = allowedTypes.includes(req.query.type) ? req.query.type : "all";

    if (!orgId) {
      return res.status(403).json({ error: "Select an active group before viewing messages" });
    }

    const typeFilter = type === "all" ? "" : "AND m.type = $3";
    const params = type === "all" ? [userId, orgId] : [userId, orgId, type];

    // Query to get the latest messages for the authenticated user within the active organization.
    // Announcement messages are visible to all active group members.
    const result = await query(
      `SELECT m.*, 
              u.first_name || ' ' || u.last_name as sender_name,
              target.first_name || ' ' || target.last_name as receiver_name
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       LEFT JOIN users target ON m.receiver_id = target.id
       WHERE m.organization_id = $2
         AND (
           m.type = 'announcement'
           OR m.sender_id = $1
           OR m.receiver_id = $1
         )
         ${typeFilter}
       ORDER BY m.created_at DESC`,
      params
    );

    // Map to the format expected by the frontend
    const messages = result.rows.map(m => ({
      id: m.id,
      sender: m.sender_id === userId ? "You" : m.sender_name,
      senderId: m.sender_id,
      receiverId: m.receiver_id,
      content: m.content,
      timestamp: m.created_at,
      unread: !m.is_read && m.receiver_id === userId,
      type: m.type
    }));

    res.json(messages);
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/**
 * POST /api/messages
 * Sends a new message.
 */
router.post("/", authenticateToken, injectOrgContext, async (req, res) => {
  try {
    const { receiverId, content: rawContent, type = "direct" } = req.body;
    const senderId = req.user.id;
    const orgId = req.orgContext?.organization_id || req.user.organization_id || req.user.currentOrganizationId || req.user.currentGroupId || req.user.clubId || req.user.groupId;
    const content = (rawContent || "").trim();
    const validTypes = ["direct", "announcement", "team"];
    const messageType = validTypes.includes(type) ? type : "direct";

    if (!orgId) {
      return res.status(403).json({ error: "Select an active group before sending messages" });
    }

    if (!receiverId || !content) {
      return res.status(400).json({ error: "Receiver and content are required" });
    }

    const receiverResult = await query(
      `SELECT om.role as receiver_role
       FROM organization_members om
       WHERE om.organization_id = $1
         AND om.user_id = $2
         AND om.status = 'active'
       LIMIT 1`,
      [orgId, receiverId]
    );

    if (!receiverResult.rows.length) {
      return res.status(400).json({ error: "Receiver must be a member of your active group" });
    }

    const receiverRole = receiverResult.rows[0].receiver_role;
    const senderRole = req.orgContext?.role;
    const isPlayerRole = ["player", "parent"].includes(senderRole) || req.user.accountType === "adult";
    const adminRoles = ["owner", "admin", "manager"];

    // Allow players to send direct messages to admins and coaches.
    // Historically players were restricted to admins only; relax to include 'coach'
    if (isPlayerRole) {
      if (messageType !== "direct") {
        return res.status(403).json({ error: "Players can only send direct messages." });
      }

      const allowedReceiverRoles = adminRoles.concat(['coach']);
      if (!allowedReceiverRoles.includes(receiverRole)) {
        return res.status(403).json({ error: "Players may only message coaches or admins within their active group." });
      }
    }

    if (messageType === "announcement" && !adminRoles.includes(senderRole)) {
      return res.status(403).json({ error: "Only group admins can send announcements." });
    }

    const result = await query(
      `INSERT INTO messages (sender_id, receiver_id, organization_id, content, type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [senderId, receiverId, orgId, content, messageType]
    );

    const newMessage = result.rows[0];
    
    // Create an in-app notification for the recipient (no email)
    try {
      const notifTitle = `New message from ${req.user.first_name || 'Someone'}`;
      const notifMessage = (content.length > 240) ? content.substring(0, 237) + '…' : content;
      await query(
        `INSERT INTO notifications (user_id, title, message, notification_type, action_url)
         VALUES ($1, $2, $3, $4, $5)`,
        [receiverId, notifTitle, notifMessage, 'general', `/messages.html?with=${senderId}`]
      );
    } catch (notifErr) {
      console.warn('Failed to create notification for message recipient:', notifErr);
      // don't block message success on notification failure
    }

    res.status(201).json({
      success: true,
      message: "Message sent",
      data: {
        id: newMessage.id,
        senderId: newMessage.sender_id,
        receiverId: newMessage.receiver_id,
        content: newMessage.content,
        timestamp: newMessage.created_at,
        type: newMessage.type,
        organizationId: newMessage.organization_id
      }
    });
  } catch (error) {
    console.error("Failed to send message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

/**
 * PATCH /api/messages/:id/read
 * Marks a message as read.
 */
router.patch("/:id/read", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await query(
      "UPDATE messages SET is_read = true WHERE id = $1 AND receiver_id = $2",
      [id, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to mark message as read:", error);
    res.status(500).json({ error: "Failed to update message" });
  }
});

module.exports = router;
