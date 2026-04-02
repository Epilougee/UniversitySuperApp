const express = require('express');
const { query, run, runGetId } = require('../database');
const router = express.Router();

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

router.post('/generate-otp', (req, res) => {
  const { class_id, teacher_id, lat, lng } = req.body;
  if (!class_id || !teacher_id) return res.status(400).json({ ok: false, message: 'class_id and teacher_id required.' });

  // Deactivate any existing OTPs for this class today
  const today = new Date().toISOString().split('T')[0];
  run(`UPDATE otp_sessions SET active=0 WHERE class_id=? AND teacher_id=? AND date=?`, [class_id, teacher_id, today]);

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const now = Date.now();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes

  const id = runGetId(
    `INSERT INTO otp_sessions (otp, class_id, teacher_id, date, lat, lng, radius, expires_at, created_at, active) VALUES (?,?,?,?,?,?,?,?,?,1)`,
    [otp, class_id, teacher_id, today, lat || null, lng || null, 200, expiresAt, now]
  );

  // Create notification for enrolled students
  try {
    const enrolled = query(`SELECT student_id FROM enrollments WHERE class_id=?`, [class_id]);
    const classInfo = query(`SELECT name FROM classes WHERE id=?`, [class_id]);
    const className = classInfo[0]?.name || 'class';
    enrolled.forEach(e => {
      run(`INSERT INTO notifications (user_id,user_role,title,body,category,read_status,created_at) VALUES (?,?,?,?,?,0,?)`,
        [e.student_id,'Student',`Attendance OTP Active — ${className}`,`An OTP for attendance is now active for ${className}. Mark your attendance before it expires.`,'attendance',now]);
    });
  } catch(e) {}

  return res.json({ ok: true, otp, expires_at: expiresAt, session_id: id });
});

router.get('/active-otp/:class_id', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const now = Date.now();
  const rows = query(`SELECT * FROM otp_sessions WHERE class_id=? AND date=? AND active=1 AND expires_at>?`, [req.params.class_id, today, now]);
  if (!rows.length) return res.json({ ok: false, message: 'No active OTP.' });
  const session = rows[0];
  return res.json({ ok: true, expires_at: session.expires_at, class_id: session.class_id });
});

router.post('/verify-otp', (req, res) => {
  const { otp, student_id, class_id, lat, lng } = req.body;
  if (!otp || !student_id || !class_id) return res.status(400).json({ ok: false, message: 'otp, student_id, class_id required.' });

  const today = new Date().toISOString().split('T')[0];
  const now = Date.now();

  // Find active OTP session
  const sessions = query(`SELECT * FROM otp_sessions WHERE otp=? AND class_id=? AND date=? AND active=1 AND expires_at>?`, [otp, class_id, today, now]);
  if (!sessions.length) return res.status(400).json({ ok: false, message: 'Invalid or expired OTP. Please ask your teacher to generate a new one.' });

  const session = sessions[0];

  // Verify student is enrolled
  const enrollment = query(`SELECT 1 FROM enrollments WHERE student_id=? AND class_id=?`, [student_id, class_id]);
  if (!enrollment.length) return res.status(403).json({ ok: false, message: 'You are not enrolled in this class.' });

  // Check if already marked today
  const existing = query(`SELECT 1 FROM attendance_records WHERE student_id=? AND class_id=? AND date=?`, [student_id, class_id, today]);
  if (existing.length) return res.status(409).json({ ok: false, message: 'Attendance already marked for today.' });

  // Geo-fence check
  if (session.lat && session.lng && lat && lng) {
    const dist = haversineDistance(parseFloat(session.lat), parseFloat(session.lng), parseFloat(lat), parseFloat(lng));
    if (dist > session.radius) {
      return res.status(403).json({ ok: false, message: `You are ${Math.round(dist)}m away from the classroom. Maximum allowed distance is ${session.radius}m.`, distance: Math.round(dist) });
    }
  }

  // Mark attendance
  run(`INSERT INTO attendance_records (student_id,class_id,date,status,method,marked_at) VALUES (?,?,?,?,?,?)`,
    [student_id, class_id, today, 'Present', 'otp', now]);

  // Update student overall attendance
  const allRecords = query(`SELECT COUNT(*) as total, SUM(CASE WHEN status='Present' THEN 1 ELSE 0 END) as present FROM attendance_records WHERE student_id=?`, [student_id]);
  if (allRecords.length && allRecords[0].total > 0) {
    const pct = Math.round((allRecords[0].present / allRecords[0].total) * 100);
    run(`UPDATE students SET attendance=? WHERE id=?`, [pct, student_id]);
  }

  // Broadcast real-time update to student
  if (global.broadcastAttendanceUpdate) {
    global.broadcastAttendanceUpdate(student_id);
  }

  return res.json({ ok: true, message: 'Attendance marked successfully! You are marked Present.' });
});

router.get('/:class_id/:date', (req, res) => {
  const { class_id, date } = req.params;
  const records = query(`
    SELECT ar.student_id, ar.status, ar.method, ar.marked_at, s.name, s.section
    FROM attendance_records ar
    JOIN students s ON s.id = ar.student_id
    WHERE ar.class_id=? AND ar.date=?
    ORDER BY s.name
  `, [class_id, date]);
  const enrolled = query(`SELECT COUNT(*) as cnt FROM enrollments WHERE class_id=?`, [class_id]);
  return res.json({ ok: true, records, total_enrolled: enrolled[0]?.cnt || 0, date, class_id });
});

router.get('/student/:student_id', (req, res) => {
  const { student_id } = req.params;
  const classes = query(`
    SELECT c.id, c.name, c.subject_code,
      COUNT(ar.id) as total_classes,
      SUM(CASE WHEN ar.status='Present' THEN 1 ELSE 0 END) as present_count,
      ROUND(SUM(CASE WHEN ar.status='Present' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(ar.id),0), 1) as percentage
    FROM enrollments e
    JOIN classes c ON c.id = e.class_id
    LEFT JOIN attendance_records ar ON ar.class_id=e.class_id AND ar.student_id=e.student_id
    WHERE e.student_id=?
    GROUP BY c.id
    ORDER BY c.name
  `, [student_id]);
  // Recent records
  const recent = query(`
    SELECT ar.date, ar.status, ar.method, c.name as class_name, c.subject_code
    FROM attendance_records ar
    JOIN classes c ON c.id = ar.class_id
    WHERE ar.student_id=?
    ORDER BY ar.date DESC, ar.id DESC
    LIMIT 20
  `, [student_id]);
  return res.json({ ok: true, classes, recent });
});

router.post('/manual', (req, res) => {
  const { class_id, teacher_id, date, records } = req.body; // records: [{student_id, status}]
  if (!class_id || !date || !records) return res.status(400).json({ ok: false, message: 'class_id, date, records required.' });

  const now = Date.now();
  records.forEach(r => {
    run(`INSERT OR REPLACE INTO attendance_records (student_id,class_id,date,status,method,marked_at) VALUES (?,?,?,?,?,?)`,
      [r.student_id, class_id, date, r.status || 'Present', 'manual', now]);
  });

  // Update overall attendance for each student
  records.forEach(r => {
    const all = query(`SELECT COUNT(*) as total, SUM(CASE WHEN status='Present' THEN 1 ELSE 0 END) as present FROM attendance_records WHERE student_id=?`, [r.student_id]);
    if (all.length && all[0].total > 0) {
      const pct = Math.round((all[0].present / all[0].total) * 100);
      run(`UPDATE students SET attendance=? WHERE id=?`, [pct, r.student_id]);
    }
  });

  return res.json({ ok: true, message: `Attendance recorded for ${records.length} students.` });
});

router.put('/read', (req, res) => {
  const { user_id, user_role } = req.body;
  if (!user_id || !user_role) {
    return res.status(400).json({ ok: false, message: 'user_id and user_role required.' });
  }
  
  // For now, we just return success since attendance items don't have read tracking
  // Future: Add attendance_reads table if per-user read status is needed
  return res.json({ ok: true, message: 'Attendance marked as read.', unread_count: 0 });
});

module.exports = router;
