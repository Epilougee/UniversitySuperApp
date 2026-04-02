const express = require('express');
const bcrypt  = require('bcryptjs');
const { query, run, runGetId } = require('../database');
const router  = express.Router();

router.get('/students', (_req, res) => { res.json({ ok: true, students: query(`SELECT id,name,department,year,section,cgpa,attendance,phone,email,batch FROM students ORDER BY name`) }); });
router.get('/student/:id', (req, res) => { const r = query(`SELECT id,name,department,year,section,cgpa,attendance,phone,email,batch FROM students WHERE id=?`,[req.params.id]); if(!r.length) return res.status(404).json({ok:false,message:'Not found'}); res.json({ok:true,student:r[0]}); });
router.post('/add-student', (req, res) => {
  const { id, name, department, year, section, cgpa, attendance, phone, email, batch } = req.body;
  if (!id||!name||!department) return res.status(400).json({ok:false,message:'id, name, department required.'});
  if (query('SELECT id FROM students WHERE id=?',[id]).length) return res.status(409).json({ok:false,message:'Student ID already exists.'});
  run(`INSERT INTO students (id,password,name,department,year,section,cgpa,attendance,phone,email,batch) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id,bcrypt.hashSync(id,10),name,department,year||1,section||'A',cgpa||0,attendance||0,phone||'',email||'',batch||'']);
  const deptClasses = query(`SELECT id FROM classes WHERE department=?`,[department]);
  deptClasses.forEach(c => run(`INSERT OR IGNORE INTO enrollments (student_id,class_id,group_name) VALUES (?,?,?)`,[id,c.id,`Group ${section||'A'}`]));
  run(`INSERT INTO fees (student_id,semester,description,amount,paid,due_date,status) VALUES (?,?,?,?,?,?,?)`,
    [id,'Current Sem','Tuition Fee',80000,0,`${new Date().getFullYear()}-09-15`,'Pending']);
  run(`INSERT INTO notifications (user_id,user_role,title,body,category,read_status,created_at) VALUES (?,?,?,?,?,0,?)`,
    ['Admin@404','Admin',`New Student Enrolled: ${name}`,`${name} (${id}) has been enrolled in ${department}.`,'students',Date.now()]);
  return res.json({ok:true,message:'Student added.',id});
});
router.put('/student/:id', (req, res) => {
  const { id } = req.params;
  const { name, department, year, section, cgpa, attendance, phone, email, batch } = req.body;
  if (!query('SELECT id FROM students WHERE id=?',[id]).length) return res.status(404).json({ok:false,message:'Not found.'});
  run(`UPDATE students SET name=?,department=?,year=?,section=?,cgpa=?,attendance=?,phone=?,email=?,batch=? WHERE id=?`,
    [name,department,year,section,cgpa,attendance,phone,email,batch||'',id]);
  return res.json({ok:true,message:'Student updated.'});
});
router.delete('/student/:id', (req, res) => {
  const { id } = req.params;
  if (!query('SELECT id FROM students WHERE id=?',[id]).length) return res.status(404).json({ok:false,message:'Not found.'});
  run('DELETE FROM enrollments WHERE student_id=?',[id]);
  run('DELETE FROM marks WHERE student_id=?',[id]);
  run('DELETE FROM attendance_records WHERE student_id=?',[id]);
  run('DELETE FROM fees WHERE student_id=?',[id]);
  run('DELETE FROM students WHERE id=?',[id]);
  return res.json({ok:true,message:'Student deleted.'});
});

router.get('/teachers', (_req, res) => { res.json({ok:true,teachers:query(`SELECT id,name,department,designation,phone,email,office,expertise FROM teachers ORDER BY name`)}); });
router.post('/add-teacher', (req, res) => {
  const { id, name, department, designation, phone, email, office, expertise } = req.body;
  if (!id||!name||!department) return res.status(400).json({ok:false,message:'id, name, department required.'});
  if (query('SELECT id FROM teachers WHERE id=?',[id]).length) return res.status(409).json({ok:false,message:'Teacher ID exists.'});
  run(`INSERT INTO teachers (id,password,name,department,designation,phone,email,office,expertise) VALUES (?,?,?,?,?,?,?,?,?)`,
    [id,bcrypt.hashSync(id,10),name,department,designation||'Assistant Professor',phone||'',email||'',office||'',expertise||'']);
  return res.json({ok:true,message:'Teacher added.',id});
});
router.put('/teacher/:id', (req, res) => {
  const { name, department, designation, phone, email, office, expertise } = req.body;
  run(`UPDATE teachers SET name=?,department=?,designation=?,phone=?,email=?,office=?,expertise=? WHERE id=?`,
    [name,department,designation,phone,email,office||'',expertise||'',req.params.id]);
  return res.json({ok:true,message:'Teacher updated.'});
});
router.delete('/teacher/:id', (req, res) => { run('DELETE FROM teachers WHERE id=?',[req.params.id]); return res.json({ok:true}); });

router.get('/stats', (_req, res) => {
  const [s] = query('SELECT COUNT(*) as cnt FROM students');
  const [t] = query('SELECT COUNT(*) as cnt FROM teachers');
  const [c] = query('SELECT COUNT(*) as cnt FROM classes');
  const [a] = query('SELECT ROUND(AVG(cgpa),2) as v FROM students');
  const [att] = query('SELECT ROUND(AVG(attendance),1) as v FROM students');
  const [exs] = query('SELECT COUNT(*) as cnt FROM exams');
  const [evs] = query('SELECT COUNT(*) as cnt FROM events');
  const [fees] = query(`SELECT ROUND(SUM(amount-paid),0) as v FROM fees WHERE status!='Paid'`);
  const [anns] = query('SELECT COUNT(*) as cnt FROM announcements');
  return res.json({ok:true,stats:{studentCount:s.cnt,teacherCount:t.cnt,classCount:c.cnt,avgCgpa:a.v,avgAttendance:att.v,examCount:exs.cnt,eventCount:evs.cnt,pendingFees:fees.v||0,announcementCount:anns.cnt}});
});

router.get('/announcements', (_req, res) => { res.json({ok:true,announcements:query(`SELECT * FROM announcements ORDER BY created_at DESC`)}); });
router.post('/announcements', (req, res) => {
  const { title, body, target, urgency, author } = req.body;
  if (!title||!body) return res.status(400).json({ok:false,message:'title and body required.'});
  const now = Date.now();
  const id = runGetId(`INSERT INTO announcements (title,body,target,urgency,author,author_role,created_at,reads) VALUES (?,?,?,?,?,?,?,0)`,
    [title,body,target||'All',urgency||'Medium',author||'Admin','Admin',now]);
  // Broadcast notification to all students and teachers
  query('SELECT id FROM students').forEach(s => run(`INSERT INTO notifications (user_id,user_role,title,body,category,read_status,created_at) VALUES (?,?,?,?,?,0,?)`,[s.id,'Student',`Announcement: ${title}`,body.substring(0,120),'announce',now]));
  query('SELECT id FROM teachers').forEach(t => run(`INSERT INTO notifications (user_id,user_role,title,body,category,read_status,created_at) VALUES (?,?,?,?,?,0,?)`,[t.id,'Teacher',`Announcement: ${title}`,body.substring(0,120),'announce',now]));
  // Broadcast real-time notification to all connected users
  if (global.broadcastNotification) {
    const studentAndTeacherIds = [
      ...query('SELECT id FROM students').map(s => ({ id: s.id, role: 'Student' })),
      ...query('SELECT id FROM teachers').map(t => ({ id: t.id, role: 'Teacher' }))
    ];
    studentAndTeacherIds.forEach(user => {
      global.broadcastNotification(user.id, user.role, `Announcement: ${title}`, body.substring(0,120), 'announce');
    });
  }
  return res.json({ok:true,id,message:'Announcement posted and all users notified.'});
});
router.delete('/announcements/:id', (req, res) => { run('DELETE FROM announcements WHERE id=?',[req.params.id]); return res.json({ok:true}); });

router.get('/exams', (_req, res) => { res.json({ok:true,exams:query(`SELECT * FROM exams ORDER BY date`)}); });
router.post('/exams', (req, res) => {
  const { subject, subject_code, date, time, venue, department, semester, exam_type } = req.body;
  if (!subject||!date||!time||!venue||!department) return res.status(400).json({ok:false,message:'Required fields missing.'});
  const id = runGetId(`INSERT INTO exams (subject,subject_code,date,time,venue,department,semester,exam_type) VALUES (?,?,?,?,?,?,?,?)`,
    [subject,subject_code||'',date,time,venue,department,semester||'Current',exam_type||'ESE']);
  // Notify dept students
  const now = Date.now();
  query(`SELECT id FROM students WHERE department=?`,[department]).forEach(s =>
    run(`INSERT INTO notifications (user_id,user_role,title,body,category,read_status,created_at) VALUES (?,?,?,?,?,0,?)`,[s.id,'Student',`Exam Scheduled: ${subject}`,`${subject} exam on ${date} at ${time} in ${venue}.`,'exams',now]));
  // Broadcast real-time notification
  if (global.broadcastNotification) {
    query(`SELECT id FROM students WHERE department=?`,[department]).forEach(s =>
      global.broadcastNotification(s.id, 'Student', `Exam Scheduled: ${subject}`, `${subject} exam on ${date} at ${time} in ${venue}.`, 'exams'));
  }
  return res.json({ok:true,id,message:'Exam added.'});
});
router.delete('/exams/:id', (req, res) => { run('DELETE FROM exams WHERE id=?',[req.params.id]); return res.json({ok:true}); });

router.get('/events', (_req, res) => { res.json({ok:true,events:query(`SELECT * FROM events ORDER BY id`)}); });
router.post('/events', (req, res) => {
  const { name, date, venue, category, reg_limit, description } = req.body;
  if (!name||!date||!venue) return res.status(400).json({ok:false,message:'name, date, venue required.'});
  const id = runGetId(`INSERT INTO events (name,date,venue,category,reg_limit,registered,status,description) VALUES (?,?,?,?,?,0,'Open',?)`,
    [name,date,venue,category||'General',reg_limit||500,description||'']);
  return res.json({ok:true,id});
});
router.put('/events/:id', (req, res) => { const {name,date,venue,category,reg_limit,registered,status,description} = req.body; run(`UPDATE events SET name=?,date=?,venue=?,category=?,reg_limit=?,registered=?,status=?,description=? WHERE id=?`,[name,date,venue,category,reg_limit,registered,status,description,req.params.id]); return res.json({ok:true}); });
router.delete('/events/:id', (req, res) => { run('DELETE FROM events WHERE id=?',[req.params.id]); return res.json({ok:true}); });

router.get('/calendar', (_req, res) => { res.json({ok:true,events:query(`SELECT * FROM calendar_events ORDER BY date`)}); });
router.post('/calendar', (req, res) => {
  const { date, event, type } = req.body;
  if (!date||!event) return res.status(400).json({ok:false,message:'date and event required.'});
  const id = runGetId(`INSERT INTO calendar_events (date,event,type) VALUES (?,?,?)`, [date,event,type||'Event']);
  return res.json({ok:true,id});
});
router.delete('/calendar/:id', (req, res) => { run('DELETE FROM calendar_events WHERE id=?',[req.params.id]); return res.json({ok:true}); });

router.get('/marks', (_req, res) => {
  const marks = query(`SELECT m.*, s.name as student_name, c.name as class_name, c.subject_code FROM marks m JOIN students s ON s.id=m.student_id JOIN classes c ON c.id=m.class_id ORDER BY c.name, s.name, m.assessment_type`);
  return res.json({ok:true,marks});
});

router.get('/fees', (_req, res) => {
  const fees = query(`SELECT f.*, s.name as student_name, s.department FROM fees f JOIN students s ON s.id=f.student_id ORDER BY f.status, s.name`);
  const totals = query(`SELECT SUM(amount) as total, SUM(paid) as collected, SUM(amount-paid) as pending FROM fees`);
  return res.json({ok:true,fees,totals:totals[0]});
});

router.get('/classes', (_req, res) => {
  const classes = query(`SELECT c.*,t.name as teacher_name,COUNT(e.student_id) as student_count FROM classes c LEFT JOIN teachers t ON t.id=c.teacher_id LEFT JOIN enrollments e ON e.class_id=c.id GROUP BY c.id ORDER BY c.department,c.name`);
  return res.json({ok:true,classes});
});

router.post('/reset-password', (req, res) => {
  const { role, id, newPassword } = req.body;
  const tableMap = { Student:'students', Teacher:'teachers', Admin:'admins' };
  const table = tableMap[role];
  if (!table) return res.status(400).json({ok:false,message:'Invalid role.'});
  run(`UPDATE ${table} SET password=? WHERE id=?`, [bcrypt.hashSync(newPassword,10), id]);
  return res.json({ok:true,message:'Password reset.'});
});

router.get('/departments', (_req, res) => { res.json({ok:true,departments:query(`SELECT * FROM departments ORDER BY id`)}); });

module.exports = router;
