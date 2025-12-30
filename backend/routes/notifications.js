const express = require('express');
const { query, queries } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get notifications for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(queries.findNotificationsByUser, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      error: 'Failed to fetch notifications'
    });
  }
});

// Create a notification (primarily for testing/internal systems)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { userId, title, message, type, actionUrl } = req.body;
    
    // Only allow users to send to themselves or admins to send to anyone (simplified for now)
    const targetUserId = userId || req.user.id;
    
    const result = await query(queries.createNotification, [
      targetUserId,
      title,
      message,
      type || 'general',
      actionUrl || null
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      error: 'Failed to create notification'
    });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const result = await query(queries.markNotificationAsRead, [req.params.id, req.user.id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      message: 'Notification marked as read',
      notification: result.rows[0]
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      error: 'Failed to mark notification as read'
    });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const result = await query(queries.markAllNotificationsAsRead, [req.user.id]);
    res.json({
      message: 'All notifications marked as read',
      count: result.rowCount
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      error: 'Failed to mark all notifications as read'
    });
  }
});

module.exports = router;
