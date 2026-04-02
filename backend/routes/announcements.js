const express = require('express');
const { query, run } = require('../database');
const router = express.Router();

router.get('/', (req, res) => {
  const announcements = query(`SELECT * FROM announcements ORDER BY created_at DESC LIMIT 50`);
  return res.json({ ok: true, announcements });
});

router.post('/', (req, res) => {
  const { title, body, target, urgency, author, author_role } = req.body;
  if (!title || !author) return res.status(400).json({ ok: false, message: 'title and author required.' });
  
  const now = Date.now();
  run(`INSERT INTO announcements (title,body,target,urgency,author,author_role,created_at,reads) VALUES (?,?,?,?,?,?,?,0)`,
    [title, body || '', target || 'All', urgency || 'Medium', author, author_role || 'Admin', now]);
  
  return res.json({ ok: true, message: 'Announcement created.' });
});

router.put('/read', (req, res) => {
  const { user_id, user_role } = req.body;
  if (!user_id || !user_role) {
    return res.status(400).json({ ok: false, message: 'user_id and user_role required.' });
  }
  
  // For now, we just return success since announcements are not per-user read tracked
  // Future: Add announcement_reads table to track per-user read status
  return res.json({ ok: true, message: 'Announcements marked as read.', unread_count: 0 });
});

module.exports = router;
