const express = require('express');
const { query, run, runGetId } = require('../database');
const router  = express.Router();

router.get('/contacts/:myId/:myRole', (req, res) => {
  const { myId, myRole } = req.params;
  let contacts = [];

  if (myRole === 'Student') {
    const selfRows = query(`SELECT department, year FROM students WHERE id = ?`, [myId]);
    const myDept = selfRows.length ? selfRows[0].department : null;

    const teachers = query(`
      SELECT DISTINCT t.id, t.name, t.designation as role_label, 'Teacher' as role
      FROM teachers t
      JOIN classes c ON c.teacher_id = t.id
      JOIN enrollments e ON e.class_id = c.id
      WHERE e.student_id = ?
    `, [myId]);

    const peers = myDept ? query(`
      SELECT id, name, (department || ' · Year ' || year) as role_label, 'Student' as role
      FROM students
      WHERE id != ? AND department = ?
      ORDER BY name
    `, [myId, myDept]) : [];

    const admins = query(`SELECT id, name, 'Administrator' as role_label, 'Admin' as role FROM admins`);
    contacts = [...teachers, ...peers, ...admins];

  } else if (myRole === 'Teacher') {
    const students = query(`
      SELECT DISTINCT s.id, s.name, s.department as role_label, 'Student' as role
      FROM students s
      JOIN enrollments e ON e.student_id = s.id
      JOIN classes c ON c.id = e.class_id
      WHERE c.teacher_id = ?
    `, [myId]);
    const admins = query(`SELECT id, name, 'Administrator' as role_label, 'Admin' as role FROM admins`);
    contacts = [...students, ...admins];

  } else if (myRole === 'Admin') {
    const students = query(`SELECT id, name, department as role_label, 'Student' as role FROM students ORDER BY name`);
    const teachers = query(`SELECT id, name, designation as role_label, 'Teacher' as role FROM teachers ORDER BY name`);
    contacts = [...teachers, ...students];
  }

  return res.json({ ok: true, contacts });
});

router.get('/messages/:room', (req, res) => {
  const { room } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  const msgs = query(`
    SELECT * FROM chat_messages
    WHERE room_id = ?
    ORDER BY timestamp ASC
    LIMIT ?
  `, [room, limit]);
  return res.json({ ok: true, messages: msgs });
});

router.post('/message', (req, res) => {
  const { room_id, sender_id, sender_name, sender_role, text } = req.body;
  if (!room_id || !sender_id || !text) {
    return res.status(400).json({ ok: false, message: 'room_id, sender_id, text required.' });
  }
  const timestamp = Date.now();
  run(`
    INSERT INTO chat_messages (room_id, sender_id, sender_name, sender_role, text, timestamp)
    VALUES (?,?,?,?,?,?)
  `, [room_id, sender_id, sender_name || sender_id, sender_role || 'Unknown', text, timestamp]);
  return res.json({ ok: true, timestamp });
});

router.post('/create', (req, res) => {
  const { user1_id, user2_id, user1_name, user2_name, user1_role, user2_role } = req.body;
  
  if (!user1_id || !user2_id || !user1_name || !user2_name) {
    return res.status(400).json({ 
      ok: false, 
      message: 'user1_id, user2_id, user1_name, user2_name required.' 
    });
  }
  
  const chatData = {
    room_id: roomId,
    user1_id,
    user2_id,
    user1_name: user1_name || user1_id,
    user2_name: user2_name || user2_id,
    user1_role: user1_role || 'Unknown',
    user2_role: user2_role || 'Unknown',
    created_at: Date.now(),
    is_new: existingMessages[0]?.cnt === 0
  };
  
  return res.json({ 
    ok: true, 
    message: 'Chat room created/opened successfully.',
    chat: chatData
  });
});

router.put('/read', (req, res) => {
  const { user_id, user_role } = req.body;
  if (!user_id || !user_role) {
    return res.status(400).json({ ok: false, message: 'user_id and user_role required.' });
  }
  
  // For now, we just return success since chat_messages don't have per-user read tracking yet
  // Future: Add isRead column or chat_reads table for per-user read status
  return res.json({ ok: true, message: 'Chats marked as read.', unread_count: 0 });
});

module.exports = router;

