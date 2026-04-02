const express = require('express');
const bcrypt  = require('bcryptjs');
const { query, run, runGetId } = require('../database');
const router = express.Router();

router.get('/:id', (req, res) => {
  const { id } = req.params;
  const teachers = query('SELECT * FROM teachers WHERE id=?', [id]);
  if (!teachers.length) return res.status(404).json({ ok: false, message: 'Teacher not found.' });
  const { password: _pw, ...teacher } = teachers[0];
  const classes = query(`
    SELECT c.id, c.name, c.subject_code, c.department, c.schedule, c.room, c.credits,
           COUNT(e.student_id) AS student_count
    FROM classes c
    LEFT JOIN enrollments e ON e.class_id = c.id
    WHERE c.teacher_id=?
    GROUP BY c.id ORDER BY c.id
  `, [id]);
  return res.json({ ok: true, teacher, classes });
});

router.get('/:id/students', (req, res) => {
  const { id } = req.params;
  const teacher = query(`SELECT department FROM teachers WHERE id=?`, [id]);
  if (!teacher.length) return res.status(404).json({ ok: false, message: 'Teacher not found.' });
  const students = query(`
    SELECT s.id, s.name, s.department, s.year, s.section, s.cgpa, s.attendance, s.phone, s.email, s.batch
    FROM students s
    WHERE s.department=?
    ORDER BY s.year, s.section, s.name
  `, [teacher[0].department]);
  return res.json({ ok: true, students });
});

router.get('/:id/class-students/:class_id', (req, res) => {
  const { class_id } = req.params;
  const students = query(`
    SELECT s.id, s.name, s.year, s.section, s.cgpa, s.attendance, s.phone, s.email
    FROM enrollments e
    JOIN students s ON s.id = e.student_id
    WHERE e.class_id=?
    ORDER BY s.name
  `, [class_id]);
  return res.json({ ok: true, students });
});

router.get('/:id/marks/:class_id', (req, res) => {
  const { class_id } = req.params;
  const marks = query(`
    SELECT m.student_id, m.assessment_type, m.max_marks, m.obtained, m.id, s.name
    FROM marks m
    JOIN students s ON s.id = m.student_id
    WHERE m.class_id=?
    ORDER BY s.name, m.assessment_type
  `, [class_id]);
  return res.json({ ok: true, marks });
});

router.post('/marks', (req, res) => {
  const { teacher_id, class_id, assessment_type, max_marks, entries, semester } = req.body;
  if (!class_id || !assessment_type || !entries) return res.status(400).json({ ok: false, message: 'class_id, assessment_type, entries required.' });

  const now = Date.now();
  entries.forEach(e => {
    const existing = query(`SELECT id FROM marks WHERE student_id=? AND class_id=? AND assessment_type=?`, [e.student_id, class_id, assessment_type]);
    if (existing.length) {
      run(`UPDATE marks SET obtained=?, max_marks=?, entered_by=?, entered_at=? WHERE student_id=? AND class_id=? AND assessment_type=?`,
        [e.obtained, max_marks || 20, teacher_id, now, e.student_id, class_id, assessment_type]);
    } else {
      run(`INSERT INTO marks (student_id, class_id, assessment_type, max_marks, obtained, semester, entered_by, entered_at) VALUES (?,?,?,?,?,?,?,?)`,
        [e.student_id, class_id, assessment_type, max_marks || 20, e.obtained, semester || 'Current', teacher_id, now]);
    }
    const allMarks = query(`SELECT obtained, max_marks FROM marks WHERE student_id=?`, [e.student_id]);
    if (allMarks.length > 0) {
      const totalObtained = allMarks.reduce((a, m) => a + m.obtained, 0);
      const totalMax = allMarks.reduce((a, m) => a + m.max_marks, 0);
      if (totalMax > 0) {
        const percentage = (totalObtained / totalMax) * 100;
        let cgpa = percentage >= 90 ? 9.5 : percentage >= 80 ? 8.5 : percentage >= 70 ? 7.5 : percentage >= 60 ? 6.5 : 5.5;
        run(`UPDATE students SET cgpa=? WHERE id=?`, [cgpa.toFixed(1), e.student_id]);
      }
    }
    run(`INSERT INTO notifications (user_id,user_role,title,body,category,read_status,created_at) VALUES (?,?,?,?,0,0,?)`,
      [e.student_id, 'Student', `Marks Updated: ${assessment_type}`, `Your ${assessment_type} marks have been entered: ${e.obtained}/${max_marks || 20}. Check My Marks section.`, now]);
    if (global.broadcastMarksUpdate) {
      global.broadcastMarksUpdate(e.student_id);
    }
  });

  return res.json({ ok: true, message: `Marks saved for ${entries.length} students.` });
});

router.post('/add-student', (req, res) => {
  const { id, name, department, year, section, email, phone, batch, teacher_id } = req.body;
  if (!id || !name || !department) return res.status(400).json({ ok: false, message: 'id, name, department required.' });
  const existing = query('SELECT id FROM students WHERE id=?', [id]);
  if (existing.length) return res.status(409).json({ ok: false, message: 'Student ID already exists.' });

  const passwordHash = bcrypt.hashSync(id, 10);
  run(`INSERT INTO students (id,password,name,department,year,section,cgpa,attendance,phone,email,batch) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, passwordHash, name, department, year || 1, section || 'A', 0.0, 0.0, phone || '', email || '', batch || '']);

  const deptClasses = query(`SELECT id FROM classes WHERE department=?`, [department]);
  deptClasses.forEach(c => {
    run(`INSERT OR IGNORE INTO enrollments (student_id,class_id,group_name) VALUES (?,?,?)`, [id, c.id, `Group ${section || 'A'}`]);
  });

  const deptTeachers = query(`SELECT DISTINCT teacher_id FROM classes WHERE department=?`, [department]);
  const now = Date.now();
  deptTeachers.forEach(t => {
    run(`INSERT INTO notifications (user_id,user_role,title,body,category,read_status,created_at) VALUES (?,?,?,?,?,0,?)`,
      [t.teacher_id, 'Teacher', `New Student Enrolled: ${name}`, `${name} (${id}) has been enrolled in ${department}. They are now in your classes.`, 'students', now]);
  });

  run(`INSERT INTO fees (student_id,semester,description,amount,paid,due_date,status) VALUES (?,?,?,?,?,?,?)`,
    [id, `Sem 1 ${new Date().getFullYear()}`, 'Tuition Fee', 80000, 0, `${new Date().getFullYear()}-09-15`, 'Pending']);

  return res.json({ ok: true, message: 'Student enrolled and auto-enrolled in all department classes.', id });
});

router.get('/announcements/all', (req, res) => {
  const anns = query(`SELECT * FROM announcements ORDER BY created_at DESC`);
  return res.json({ ok: true, announcements: anns });
});

router.post('/announcements', (req, res) => {
  const { title, body, target, urgency, author, author_id } = req.body;
  if (!title || !body || !author) return res.status(400).json({ ok: false, message: 'title, body, author required.' });
  const now = Date.now();
  const id = runGetId(`INSERT INTO announcements (title,body,target,urgency,author,author_role,created_at,reads) VALUES (?,?,?,?,?,?,?,0)`,
    [title, body, target || 'All', urgency || 'Medium', author, 'Teacher', now]);

  const students = query(`SELECT id FROM students`);
  students.forEach(s => {
    run(`INSERT INTO notifications (user_id,user_role,title,body,category,read_status,created_at) VALUES (?,?,?,?,?,0,?)`,
      [s.id, 'Student', `Announcement: ${title}`, body.substring(0,100), 'announce', now]);
  });

  return res.json({ ok: true, id });
});

router.get('/:id/dashboard-stats', (req, res) => {
  const { id } = req.params;
  const classes = query(`SELECT COUNT(*) as cnt FROM classes WHERE teacher_id=?`, [id]);
  const students = query(`SELECT COUNT(DISTINCT e.student_id) as cnt FROM enrollments e JOIN classes c ON c.id=e.class_id WHERE c.teacher_id=?`, [id]);
  const defaulters = query(`
    SELECT COUNT(DISTINCT e.student_id) as cnt FROM enrollments e
    JOIN classes c ON c.id=e.class_id
    JOIN students s ON s.id=e.student_id
    WHERE c.teacher_id=? AND s.attendance<75
  `, [id]);
  const pendingMarks = query(`
    SELECT COUNT(DISTINCT e.student_id||'-'||e.class_id) as cnt
    FROM enrollments e
    JOIN classes c ON c.id=e.class_id
    WHERE c.teacher_id=? AND NOT EXISTS (
      SELECT 1 FROM marks m WHERE m.student_id=e.student_id AND m.class_id=e.class_id AND m.assessment_type='IA2'
    )
  `, [id]);
  return res.json({
    ok: true,
    stats: {
      classes: classes[0]?.cnt || 0,
      students: students[0]?.cnt || 0,
      defaulters: defaulters[0]?.cnt || 0,
      pending_marks: pendingMarks[0]?.cnt || 0
    }
  });
});

router.post('/enroll-student', (req, res) => {
  const { student_id, class_id, group_name } = req.body;
  if (!student_id || !class_id) return res.status(400).json({ ok: false, message: 'student_id and class_id required.' });

  const existing = query(`SELECT 1 FROM enrollments WHERE student_id=? AND class_id=?`, [student_id, class_id]);
  if (existing.length) return res.status(409).json({ ok: false, message: 'Student already enrolled in this class.' });

  run(`INSERT INTO enrollments (student_id, class_id, group_name) VALUES (?,?,?)`, [student_id, class_id, group_name || 'A']);
  return res.json({ ok: true, message: 'Student enrolled successfully.' });
});

// GET /api/teacher/:id/class/:class_id/students-with-marks — students in class with marks summary
router.get('/:id/class/:class_id/students-with-marks', (req, res) => {
  const { class_id } = req.params;
  const students = query(`
    SELECT 
      s.id, s.name, s.email, s.phone, s.cgpa, s.attendance,
      GROUP_CONCAT(DISTINCT m.assessment_type || ':' || m.obtained || '/' || m.max_marks, ';') as marks_str,
      ROUND(SUM(m.obtained) / NULLIF(SUM(m.max_marks), 0) * 100, 1) as marks_percentage
    FROM enrollments e
    JOIN students s ON s.id = e.student_id
    LEFT JOIN marks m ON m.student_id = s.id AND m.class_id = e.class_id
    WHERE e.class_id = ?
    GROUP BY s.id
    ORDER BY s.name
  `, [class_id]);

  const parsed = students.map(s => {
    const marks = {};
    if (s.marks_str) {
      s.marks_str.split(';').forEach(m => {
        const [type, score] = m.split(':');
        marks[type] = score;
      });
    }
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      cgpa: s.cgpa,
      attendance: s.attendance,
      marks,
      marks_percentage: s.marks_percentage || 0
    };
  });

  return res.json({ ok: true, students: parsed });
});

// GET /api/teacher/student/:student_id/grades-summary — get all marks/grades for a student
router.get('/student/:student_id/grades-summary', (req, res) => {
  const { student_id } = req.params;
  const student = query(`SELECT id, name, cgpa, department FROM students WHERE id=?`, [student_id]);
  if (!student.length) return res.status(404).json({ ok: false, message: 'Student not found.' });

  const marks = query(`
    SELECT 
      m.*, c.name as class_name, c.subject_code,
      ROUND(m.obtained / m.max_marks * 100, 1) as percentage
    FROM marks m
    JOIN classes c ON c.id = m.class_id
    WHERE m.student_id = ?
    ORDER BY c.name, m.assessment_type
  `, [student_id]);

  const classSummary = {};
  marks.forEach(m => {
    if (!classSummary[m.class_id]) {
      classSummary[m.class_id] = {
        class_id: m.class_id,
        class_name: m.class_name,
        subject_code: m.subject_code,
        marks: [],
        total_obtained: 0,
        total_max: 0
      };
    }
    classSummary[m.class_id].marks.push({
      type: m.assessment_type,
      obtained: m.obtained,
      max: m.max_marks,
      percentage: m.percentage
    });
    classSummary[m.class_id].total_obtained += m.obtained;
    classSummary[m.class_id].total_max += m.max_marks;
  });

  Object.values(classSummary).forEach(cs => {
    cs.overall_percentage = cs.total_max > 0 ? (cs.total_obtained / cs.total_max * 100).toFixed(1) : 0;
  });

  return res.json({
    ok: true,
    student: {
      id: student[0].id,
      name: student[0].name,
      cgpa: student[0].cgpa,
      department: student[0].department
    },
    class_summary: Object.values(classSummary)
  });
});

module.exports = router;
