const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../database');
const router = express.Router();

router.post('/', (req, res) => {
  const { role, id, password } = req.body;

  if (!role || !id || !password) {
    return res.status(400).json({ ok: false, message: 'role, id, and password are required.' });
  }

  let rows;
  const tableMap = { Student: 'students', Teacher: 'teachers', Admin: 'admins' };
  const table = tableMap[role];

  if (!table) {
    return res.status(400).json({ ok: false, message: 'Invalid role.' });
  }

  rows = query(`SELECT * FROM ${table} WHERE id = ?`, [id]);

  if (!rows.length) {
    return res.status(401).json({ ok: false, message: 'Invalid credentials.' });
  }

  const user = rows[0];
  const valid = bcrypt.compareSync(password, user.password);

  if (!valid) {
    return res.status(401).json({ ok: false, message: 'Invalid credentials.' });
  }

  /* Strip password before sending */
  const { password: _pw, ...safeUser } = user;

  return res.json({
    ok: true,
    role,
    user: safeUser
  });
});

module.exports = router;
