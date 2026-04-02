const express = require('express');
const { query, run } = require('../database');
const router = express.Router();

router.get('/', (req, res) => {
  // Placeholder: Return empty array until assignment table is created
  return res.json({ ok: true, assignments: [] });
});

router.put('/read', (req, res) => {
  const { user_id, user_role } = req.body;
  if (!user_id || !user_role) {
    return res.status(400).json({ ok: false, message: 'user_id and user_role required.' });
  }
  
  // For now, we just return success
  // Future: Implement assignment_reads table for per-user tracking
  return res.json({ ok: true, message: 'Assignments marked as read.', unread_count: 0 });
});

module.exports = router;
