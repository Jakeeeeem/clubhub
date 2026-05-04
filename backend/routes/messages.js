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
    const explicitOrgId = req.query.org_id || req.query.organizationId || req.query.groupId || req.query.orgId || null;
    const orgId = explicitOrgId || req.orgContext?.organization_id || req.user.organization_id || req.user.currentOrganizationId || req.user.currentGroupId || req.user.clubId || req.user.groupId;
    const allowedTypes = ["all", "direct", "announcement", "team"];
    const type = allowedTypes.includes(req.query.type) ? req.query.type : "all";

    let params, query_sql;
    let typeFilter = "";

    if (type !== "all") {
      typeFilter = "AND m.type = $3";
    }

    if (orgId) {
      // Query with org filter
      params = type === "all" ? [userId, orgId] : [userId, orgId, type];
      query_sql = `SELECT m.*, 
              COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '') as sender_name,
              COALESCE(target.first_name, '') || ' ' || COALESCE(target.last_name, '') as receiver_name
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
       ORDER BY m.created_at DESC`;
    } else {
      // Query without org filter (for demo or unauthenticated contexts)
      params = type === "all" ? [userId] : [userId, type];
      query_sql = `SELECT m.*, 
              COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '') as sender_name,
              COALESCE(target.first_name, '') || ' ' || COALESCE(target.last_name, '') as receiver_name
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       LEFT JOIN users target ON m.receiver_id = target.id
       WHERE (
         m.sender_id = $1
         OR m.receiver_id = $1
       )
         ${typeFilter}
       ORDER BY m.created_at DESC`;
    }

    const result = await query(query_sql, params);

    // Map to the format expected by the frontend
    const messages = result.rows.map(m => ({
      id: m.id,
      sender_id: m.sender_id,
      sender_name: (m.sender_name || 'Unknown').trim(),
      receiver_id: m.receiver_id,
      receiver_name: (m.receiver_name || 'Unknown').trim(),
      content: m.content,
      created_at: m.created_at,
      read: m.is_read,
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
