const express = require('express');
const { query, run } = require('../database');
const router = express.Router();

router.get('/:id', (req, res) => {
  const { id } = req.params;
  const students = query('SELECT * FROM students WHERE id=?', [id]);
  if (!students.length) return res.status(404).json({ ok: false, message: 'Student not found.' });
  const { password: _pw, ...student } = students[0];
  const classes = query(`
    SELECT c.id, c.name, c.subject_code, c.department, c.schedule, c.room, c.credits, e.group_name,
           t.name AS teacher_name, t.designation AS teacher_designation
    FROM enrollments e
    JOIN classes c ON c.id = e.class_id
    JOIN teachers t ON t.id = c.teacher_id
    WHERE e.student_id=? ORDER BY c.id
  `, [id]);
  return res.json({ ok: true, student, classes });
});

router.get('/:id/marks', (req, res) => {
  const { id } = req.params;
  const marks = query(`
    SELECT m.*, c.name as class_name, c.subject_code, c.credits
    FROM marks m
    JOIN classes c ON c.id = m.class_id
    WHERE m.student_id=?
    ORDER BY c.name, m.assessment_type
  `, [id]);
  // Group by class
  const grouped = {};
  marks.forEach(m => {
    const key = m.class_id;
    if (!grouped[key]) grouped[key] = { class_id: m.class_id, class_name: m.class_name, subject_code: m.subject_code, credits: m.credits, marks: [] };
    grouped[key].marks.push({ type: m.assessment_type, max: m.max_marks, obtained: m.obtained });
  });
  return res.json({ ok: true, marks: Object.values(grouped) });
});

router.get('/:id/attendance', (req, res) => {
  const { id } = req.params;
  const classes = query(`
    SELECT c.id, c.name, c.subject_code,
      COUNT(ar.id) as total_classes,
      SUM(CASE WHEN ar.status='Present' THEN 1 ELSE 0 END) as present_count,
      ROUND(SUM(CASE WHEN ar.status='Present' THEN 1.0 ELSE 0 END) / NULLIF(COUNT(ar.id),0) * 100, 1) as percentage
    FROM enrollments e
    JOIN classes c ON c.id = e.class_id
    LEFT JOIN attendance_records ar ON ar.class_id=e.class_id AND ar.student_id=e.student_id
    WHERE e.student_id=?
    GROUP BY c.id ORDER BY c.name
  `, [id]);
  const recent = query(`
    SELECT ar.date, ar.status, ar.method, c.name as class_name, c.subject_code
    FROM attendance_records ar
    JOIN classes c ON c.id = ar.class_id
    WHERE ar.student_id=?
    ORDER BY ar.date DESC, ar.id DESC LIMIT 30
  `, [id]);
  const overall = query(`
    SELECT ROUND(SUM(CASE WHEN status='Present' THEN 1.0 ELSE 0 END) / NULLIF(COUNT(*),0) * 100, 1) as pct
    FROM attendance_records WHERE student_id=?
  `, [id]);
  return res.json({ ok: true, classes, recent, overall_pct: overall[0]?.pct || 0 });
});

router.get('/:id/fees', (req, res) => {
  const { id } = req.params;
  const fees = query(`SELECT * FROM fees WHERE student_id=? ORDER BY id`, [id]);
  const total = fees.reduce((a,f) => a + f.amount, 0);
  const totalPaid = fees.reduce((a,f) => a + f.paid, 0);
  const pending = fees.filter(f => f.status !== 'Paid').reduce((a,f) => a + (f.amount - f.paid), 0);
  return res.json({ ok: true, fees, total, total_paid: totalPaid, pending });
});

router.post('/:id/pay-fee', (req, res) => {
  const { id } = req.params;
  const { fee_id, amount } = req.body;
  if (!fee_id || !amount) return res.status(400).json({ ok: false, message: 'fee_id and amount required.' });
  const fee = query(`SELECT * FROM fees WHERE id=? AND student_id=?`, [fee_id, id]);
  if (!fee.length) return res.status(404).json({ ok: false, message: 'Fee record not found.' });
  const f = fee[0];
  const newPaid = Math.min(f.paid + amount, f.amount);
  const newStatus = newPaid >= f.amount ? 'Paid' : 'Partial';
  const now = Date.now();
  run(`UPDATE fees SET paid=?, status=? WHERE id=?`, [newPaid, newStatus, fee_id]);
  
  // Create notification for fee payment
  const notifTitle = newStatus === 'Paid' ? 'Fee Payment Complete' : 'Partial Fee Payment';
  const notifBody = `Payment of ₹${amount} recorded for ${f.description}. Amount due: ₹${f.amount - newPaid}.`;
  run(`INSERT INTO notifications (user_id,user_role,title,body,category,read_status,created_at) VALUES (?,?,?,?,?,0,?)`,
    [id, 'Student', notifTitle, notifBody, 'fees', now]);
  
  return res.json({ ok: true, message: 'Payment recorded successfully!', new_paid: newPaid, status: newStatus });
});

router.get('/announcements/all', (req, res) => {
  const anns = query(`SELECT * FROM announcements ORDER BY created_at DESC`);
  return res.json({ ok: true, announcements: anns });
});

router.get('/:id/exams', (req, res) => {
  const { id } = req.params;
  const student = query(`SELECT department FROM students WHERE id=?`, [id]);
  if (!student.length) return res.status(404).json({ ok: false, message: 'Student not found.' });
  const dept = student[0].department;
  const exams = query(`SELECT * FROM exams WHERE department=? OR department='All' ORDER BY date ASC`, [dept]);
  return res.json({ ok: true, exams });
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, phone, email, address } = req.body;
  const student = query(`SELECT * FROM students WHERE id=?`, [id]);
  if (!student.length) return res.status(404).json({ ok: false, message: 'Student not found.' });
  run(`UPDATE students SET name=?, phone=?, email=?, address=? WHERE id=?`, 
    [name || student[0].name, phone || student[0].phone, email || student[0].email, address || student[0].address || '', id]);
  const updated = query(`SELECT id, name, department, year, section, cgpa, attendance, phone, email FROM students WHERE id=?`, [id]);
  return res.json({ ok: true, message: 'Profile updated.', student: updated[0] });
});

module.exports = router;
