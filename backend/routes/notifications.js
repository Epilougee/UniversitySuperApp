const express = require('express');
const { query, run } = require('../database');
const router = express.Router();

router.get('/:userId/:role', (req, res) => {
  const { userId, role } = req.params;
  
  const notifications = query(`
    SELECT * FROM notifications WHERE user_id=? AND user_role=?
    ORDER BY created_at DESC LIMIT 50
  `, [userId, role]);
  
  const unread = query(`SELECT COUNT(*) as cnt FROM notifications WHERE user_id=? AND user_role=? AND read_status=0`, [userId, role]);
  
  const byCat = query(`SELECT category, COUNT(*) as cnt FROM notifications WHERE user_id=? AND user_role=? AND read_status=0 GROUP BY category`, [userId, role]);
  const counts = {};
  byCat.forEach(r => { counts[r.category] = r.cnt; });
  
  return res.json({ ok: true, notifications, unread_count: unread[0]?.cnt || 0, counts });
});

router.put('/read/:id', (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ ok: false, message: 'Notification ID required.' });
  
  run(`UPDATE notifications SET read_status=1 WHERE id=?`, [id]);
  
  // Return success with confirmation
  const updated = query(`SELECT * FROM notifications WHERE id=?`, [id]);
  if (!updated.length) {
    return res.status(404).json({ ok: false, message: 'Notification not found.' });
  }
  
  return res.json({ ok: true, message: 'Notification marked as read.', notification: updated[0] });
});

router.post('/mark-read', (req, res) => {
  const { user_id, user_role, category } = req.body;
  if (!user_id || !user_role) return res.status(400).json({ ok: false, message: 'user_id and user_role required.' });
  
  if (category) {
    run(`UPDATE notifications SET read_status=1 WHERE user_id=? AND user_role=? AND category=?`, [user_id, user_role, category]);
  } else {
    run(`UPDATE notifications SET read_status=1 WHERE user_id=? AND user_role=?`, [user_id, user_role]);
  }
  
  const unread = query(`SELECT COUNT(*) as cnt FROM notifications WHERE user_id=? AND user_role=? AND read_status=0`, [user_id, user_role]);
  return res.json({ ok: true, unread_count: unread[0]?.cnt || 0 });
});

router.post('/create', (req, res) => {
  const { user_id, user_role, title, body, category } = req.body;
  if (!user_id || !user_role || !title) return res.status(400).json({ ok: false, message: 'user_id, user_role, title required.' });
  const now = Date.now();
  run(`INSERT INTO notifications (user_id,user_role,title,body,category,read_status,created_at) VALUES (?,?,?,?,?,0,?)`,
    [user_id, user_role, title, body || '', category || 'general', now]);
  return res.json({ ok: true });
});

router.post('/broadcast', (req, res) => {
  const { target, title, body, category } = req.body; // target: 'Student' | 'Teacher' | 'All'
  if (!target || !title) return res.status(400).json({ ok: false, message: 'target and title required.' });
  const now = Date.now();
  let users = [];
  if (target === 'Student' || target === 'All') {
    users = users.concat(query(`SELECT id FROM students`).map(s => ({ id: s.id, role: 'Student' })));
  }
  if (target === 'Teacher' || target === 'All') {
    users = users.concat(query(`SELECT id FROM teachers`).map(t => ({ id: t.id, role: 'Teacher' })));
  }
  users.forEach(u => {
    run(`INSERT INTO notifications (user_id,user_role,title,body,category,read_status,created_at) VALUES (?,?,?,?,?,0,?)`,
      [u.id, u.role, title, body || '', category || 'general', now]);
  });
  return res.json({ ok: true, sent_to: users.length });
});

module.exports = router;
