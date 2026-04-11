const express = require("express");
const { query } = require("../config/database");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/messages
 * Fetches latest messages for the logged-in user to show in the messenger list.
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const type = req.query.type || "all";

    // Query to get the "latest" message from/to each contact
    // This simple version returns all messages where the user is involved
    // For a production app, we'd use a more complex query to get unique conversations
    const result = await query(
      `SELECT m.*, 
              u.first_name || ' ' || u.last_name as sender_name,
              target.first_name || ' ' || target.last_name as receiver_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       JOIN users target ON m.receiver_id = target.id
       WHERE (m.sender_id = $1 OR m.receiver_id = $1)
       ORDER BY m.created_at DESC`,
      [userId]
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
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { receiverId, content, type = "direct", organizationId } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !content) {
      return res.status(400).json({ error: "Receiver and content are required" });
    }

    const result = await query(
      `INSERT INTO messages (sender_id, receiver_id, organization_id, content, type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [senderId, receiverId, organizationId || null, content, type]
    );

    const newMessage = result.rows[0];
    
    res.status(201).json({
      success: true,
      message: "Message sent",
      data: {
        id: newMessage.id,
        senderId: newMessage.sender_id,
        receiverId: newMessage.receiver_id,
        content: newMessage.content,
        timestamp: newMessage.created_at
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
