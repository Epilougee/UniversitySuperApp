const fs   = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, 'Uni.db');
let db;

function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    ensureNewTables();
    await seedNewTablesIfEmpty();
  } else {
    db = new SQL.Database();
    createSchema();
    await seedData();
    saveDb();
  }
  return db;
}

function createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS departments (id TEXT PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY, password TEXT NOT NULL, name TEXT NOT NULL,
      department TEXT NOT NULL, year INTEGER NOT NULL DEFAULT 1,
      section TEXT NOT NULL DEFAULT 'A', cgpa REAL NOT NULL DEFAULT 0.0,
      attendance REAL NOT NULL DEFAULT 0.0,
      phone TEXT, email TEXT, batch TEXT, address TEXT
    );
    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY, password TEXT NOT NULL, name TEXT NOT NULL,
      department TEXT NOT NULL, designation TEXT NOT NULL DEFAULT 'Assistant Professor',
      phone TEXT, email TEXT, office TEXT, expertise TEXT
    );
    CREATE TABLE IF NOT EXISTS admins (id TEXT PRIMARY KEY, password TEXT NOT NULL, name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, subject_code TEXT NOT NULL,
      department TEXT NOT NULL, teacher_id TEXT NOT NULL,
      schedule TEXT, room TEXT, credits INTEGER DEFAULT 3
    );
    CREATE TABLE IF NOT EXISTS enrollments (
      student_id TEXT NOT NULL, class_id INTEGER NOT NULL,
      group_name TEXT DEFAULT 'A', PRIMARY KEY (student_id, class_id)
    );
    CREATE TABLE IF NOT EXISTS marks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id TEXT NOT NULL,
      class_id INTEGER NOT NULL, assessment_type TEXT NOT NULL,
      max_marks INTEGER NOT NULL DEFAULT 20, obtained REAL NOT NULL DEFAULT 0,
      semester TEXT, entered_by TEXT, entered_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id TEXT NOT NULL,
      class_id INTEGER NOT NULL, date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Present', method TEXT DEFAULT 'manual',
      marked_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, body TEXT NOT NULL,
      target TEXT DEFAULT 'All', urgency TEXT DEFAULT 'Medium',
      author TEXT NOT NULL, author_role TEXT DEFAULT 'Admin',
      created_at INTEGER NOT NULL, reads INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT, subject TEXT NOT NULL,
      subject_code TEXT, date TEXT NOT NULL, time TEXT NOT NULL,
      venue TEXT NOT NULL, department TEXT NOT NULL,
      semester TEXT, exam_type TEXT DEFAULT 'ESE'
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      date TEXT NOT NULL, venue TEXT NOT NULL,
      category TEXT DEFAULT 'General', reg_limit INTEGER DEFAULT 500,
      registered INTEGER DEFAULT 0, status TEXT DEFAULT 'Open', description TEXT
    );
    CREATE TABLE IF NOT EXISTS fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id TEXT NOT NULL,
      semester TEXT NOT NULL, description TEXT NOT NULL,
      amount REAL NOT NULL, paid REAL DEFAULT 0,
      due_date TEXT, status TEXT DEFAULT 'Pending'
    );
    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL,
      event TEXT NOT NULL, type TEXT DEFAULT 'Event'
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL,
      user_role TEXT NOT NULL, title TEXT NOT NULL, body TEXT,
      category TEXT DEFAULT 'general', read_status INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS otp_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, otp TEXT NOT NULL,
      class_id INTEGER NOT NULL, teacher_id TEXT NOT NULL,
      date TEXT NOT NULL, lat REAL, lng REAL, radius INTEGER DEFAULT 200,
      expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL, active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT, room_id TEXT NOT NULL,
      sender_id TEXT NOT NULL, sender_name TEXT NOT NULL,
      sender_role TEXT NOT NULL, text TEXT NOT NULL, timestamp INTEGER NOT NULL
    );
  `);
}

function ensureNewTables() {
  const newTables = [
    `CREATE TABLE IF NOT EXISTS marks (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id TEXT NOT NULL, class_id INTEGER NOT NULL, assessment_type TEXT NOT NULL, max_marks INTEGER NOT NULL DEFAULT 20, obtained REAL NOT NULL DEFAULT 0, semester TEXT, entered_by TEXT, entered_at INTEGER)`,
    `CREATE TABLE IF NOT EXISTS attendance_records (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id TEXT NOT NULL, class_id INTEGER NOT NULL, date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Present', method TEXT DEFAULT 'manual', marked_at INTEGER)`,
    `CREATE TABLE IF NOT EXISTS announcements (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, body TEXT NOT NULL, target TEXT DEFAULT 'All', urgency TEXT DEFAULT 'Medium', author TEXT NOT NULL, author_role TEXT DEFAULT 'Admin', created_at INTEGER NOT NULL, reads INTEGER DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS exams (id INTEGER PRIMARY KEY AUTOINCREMENT, subject TEXT NOT NULL, subject_code TEXT, date TEXT NOT NULL, time TEXT NOT NULL, venue TEXT NOT NULL, department TEXT NOT NULL, semester TEXT, exam_type TEXT DEFAULT 'ESE')`,
    `CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, date TEXT NOT NULL, venue TEXT NOT NULL, category TEXT DEFAULT 'General', reg_limit INTEGER DEFAULT 500, registered INTEGER DEFAULT 0, status TEXT DEFAULT 'Open', description TEXT)`,
    `CREATE TABLE IF NOT EXISTS fees (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id TEXT NOT NULL, semester TEXT NOT NULL, description TEXT NOT NULL, amount REAL NOT NULL, paid REAL DEFAULT 0, due_date TEXT, status TEXT DEFAULT 'Pending')`,
    `CREATE TABLE IF NOT EXISTS calendar_events (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, event TEXT NOT NULL, type TEXT DEFAULT 'Event')`,
    `CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, user_role TEXT NOT NULL, title TEXT NOT NULL, body TEXT, category TEXT DEFAULT 'general', read_status INTEGER DEFAULT 0, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS otp_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, otp TEXT NOT NULL, class_id INTEGER NOT NULL, teacher_id TEXT NOT NULL, date TEXT NOT NULL, lat REAL, lng REAL, radius INTEGER DEFAULT 200, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL, active INTEGER DEFAULT 1)`,
    `CREATE TABLE IF NOT EXISTS chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id TEXT NOT NULL, sender_id TEXT NOT NULL, sender_name TEXT NOT NULL, sender_role TEXT NOT NULL, text TEXT NOT NULL, timestamp INTEGER NOT NULL)`,
    `ALTER TABLE students ADD COLUMN address TEXT`,
    `ALTER TABLE teachers ADD COLUMN office TEXT`,
    `ALTER TABLE teachers ADD COLUMN expertise TEXT`,
  ];
  for (const sql of newTables) {
    try { db.run(sql); } catch(e) { /* already exists or can't alter */ }
  }
  saveDb();
}

async function seedData() {
  const salt = bcrypt.genSaltSync(10);

  const depts = [
    ['CSE','Computer Science & Engineering'],['ECE','Electronics & Communication'],
    ['MECH','Mechanical Engineering'],['BBA','Business Administration'],['LAW','School of Law']
  ];
  const dStmt = db.prepare('INSERT OR IGNORE INTO departments VALUES (?,?)');
  depts.forEach(d => dStmt.run(d));
  dStmt.free();

  const students = [
    {id:'E25B022087',name:'John Doe',dept:'CSE',year:2,sec:'B',cgpa:8.4,att:82,phone:'9876543210',email:'john@uni.edu',batch:'2024-28',addr:'Pune, MH'},
    {id:'E25B022088',name:'Priya Sharma',dept:'CSE',year:2,sec:'B',cgpa:9.1,att:91,phone:'9876543211',email:'priya@uni.edu',batch:'2024-28',addr:'Mumbai, MH'},
    {id:'E25B022089',name:'Arjun Mehta',dept:'ECE',year:1,sec:'A',cgpa:7.8,att:76,phone:'9876543212',email:'arjun@uni.edu',batch:'2025-29',addr:'Nashik, MH'},
    {id:'E25A022001',name:'Riya Desai',dept:'BBA',year:3,sec:'A',cgpa:8.0,att:88,phone:'9876543213',email:'riya@uni.edu',batch:'2023-26',addr:'Pune, MH'},
    {id:'E25B022090',name:'Rohit Kumar',dept:'CSE',year:2,sec:'A',cgpa:7.5,att:70,phone:'9876543214',email:'rohit@uni.edu',batch:'2024-28',addr:'Delhi'},
    {id:'E25B022091',name:'Anjali Patil',dept:'CSE',year:2,sec:'A',cgpa:9.3,att:95,phone:'9876543215',email:'anjali@uni.edu',batch:'2024-28',addr:'Solapur, MH'},
    {id:'E25B022092',name:'Vivek Singh',dept:'ECE',year:1,sec:'A',cgpa:6.9,att:60,phone:'9876543216',email:'vivek@uni.edu',batch:'2025-29',addr:'Nagpur, MH'},
    {id:'E25B022093',name:'Sneha Kulkarni',dept:'MECH',year:3,sec:'A',cgpa:8.2,att:85,phone:'9876543217',email:'sneha@uni.edu',batch:'2023-26',addr:'Kolhapur, MH'},
  ];
  const sStmt = db.prepare(`INSERT OR IGNORE INTO students (id,password,name,department,year,section,cgpa,attendance,phone,email,batch,address) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  students.forEach(s => sStmt.run([s.id,bcrypt.hashSync(s.id,salt),s.name,s.dept,s.year,s.sec,s.cgpa,s.att,s.phone,s.email,s.batch,s.addr]));
  sStmt.free();

  const teachers = [
    {id:'T25S022090',name:'Dr. Indu Kumari',dept:'CSE',desig:'Associate Professor',phone:'9876500001',email:'indu.kumari@uni.edu',office:'B-204',exp:'Machine Learning, AI'},
    {id:'T25S022091',name:'Prof. Rajesh Verma',dept:'ECE',desig:'Assistant Professor',phone:'9876500002',email:'rajesh.verma@uni.edu',office:'E-102',exp:'Signal Processing, VLSI'},
    {id:'T25S022092',name:'Dr. Sunita Patel',dept:'BBA',desig:'Professor',phone:'9876500003',email:'sunita.patel@uni.edu',office:'M-201',exp:'Marketing, Strategy'},
    {id:'T25S022093',name:'Prof. Anil Joshi',dept:'MECH',desig:'Assistant Professor',phone:'9876500004',email:'anil.joshi@uni.edu',office:'D-301',exp:'Thermodynamics'},
  ];
  const tStmt = db.prepare(`INSERT OR IGNORE INTO teachers (id,password,name,department,designation,phone,email,office,expertise) VALUES (?,?,?,?,?,?,?,?,?)`);
  teachers.forEach(t => tStmt.run([t.id,bcrypt.hashSync(t.id,salt),t.name,t.dept,t.desig,t.phone,t.email,t.office,t.exp]));
  tStmt.free();

  db.run(`INSERT OR IGNORE INTO admins (id,password,name) VALUES (?,?,?)`,['Admin@404',bcrypt.hashSync('Admin@123',salt),'Admin']);

  const classes = [
    {name:'Data Structures & Algorithms',code:'CSE301',dept:'CSE',tid:'T25S022090',sched:'Mon/Wed/Fri 9:00-10:00',room:'Lab A-201',cred:4},
    {name:'Database Management Systems',code:'CSE302',dept:'CSE',tid:'T25S022090',sched:'Tue/Thu 10:00-11:30',room:'Room B-105',cred:3},
    {name:'Operating Systems',code:'CSE303',dept:'CSE',tid:'T25S022090',sched:'Mon/Wed 11:00-12:00',room:'Room B-106',cred:3},
    {name:'Computer Networks',code:'CSE304',dept:'CSE',tid:'T25S022090',sched:'Tue/Thu 2:00-3:30',room:'Room A-102',cred:3},
    {name:'Digital Electronics',code:'ECE201',dept:'ECE',tid:'T25S022091',sched:'Mon/Wed/Fri 10:00-11:00',room:'Lab E-101',cred:4},
    {name:'Signals & Systems',code:'ECE202',dept:'ECE',tid:'T25S022091',sched:'Tue/Thu 11:00-12:30',room:'Room E-102',cred:3},
    {name:'Marketing Management',code:'BBA301',dept:'BBA',tid:'T25S022092',sched:'Mon/Wed 2:00-3:30',room:'Room M-201',cred:3},
    {name:'Business Law',code:'BBA302',dept:'BBA',tid:'T25S022092',sched:'Tue/Thu 9:00-10:30',room:'Room M-202',cred:3},
  ];
  const cStmt = db.prepare(`INSERT OR IGNORE INTO classes (name,subject_code,department,teacher_id,schedule,room,credits) VALUES (?,?,?,?,?,?,?)`);
  classes.forEach(c => cStmt.run([c.name,c.code,c.dept,c.tid,c.sched,c.room,c.cred]));
  cStmt.free();

  const eStmt = db.prepare(`INSERT OR IGNORE INTO enrollments (student_id,class_id,group_name) VALUES (?,?,?)`);
  [1,2,3,4].forEach(cid => {
    eStmt.run(['E25B022087',cid,'Group B2']);
    eStmt.run(['E25B022088',cid,'Group B2']);
    eStmt.run(['E25B022090',cid,'Group A1']);
    eStmt.run(['E25B022091',cid,'Group A1']);
  });
  [5,6].forEach(cid => { eStmt.run(['E25B022089',cid,'Group A1']); eStmt.run(['E25B022092',cid,'Group A1']); });
  [7,8].forEach(cid => eStmt.run(['E25A022001',cid,'Group A1']));
  [1,2].forEach(cid => eStmt.run(['E25B022093',cid,'Group B2']));
  eStmt.free();

  await seedNewTables(salt);
}

async function seedNewTables(salt) {
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];

  const marksData = [
    // John CSE
    {sid:'E25B022087',cid:1,type:'IA1',max:20,obt:16},{sid:'E25B022087',cid:1,type:'IA2',max:20,obt:17},
    {sid:'E25B022087',cid:2,type:'IA1',max:20,obt:15},{sid:'E25B022087',cid:2,type:'IA2',max:20,obt:16},
    {sid:'E25B022087',cid:3,type:'IA1',max:20,obt:14},{sid:'E25B022087',cid:3,type:'IA2',max:20,obt:15},
    {sid:'E25B022087',cid:4,type:'IA1',max:20,obt:17},{sid:'E25B022087',cid:4,type:'IA2',max:20,obt:18},
    // Priya CSE
    {sid:'E25B022088',cid:1,type:'IA1',max:20,obt:19},{sid:'E25B022088',cid:1,type:'IA2',max:20,obt:18},
    {sid:'E25B022088',cid:2,type:'IA1',max:20,obt:18},{sid:'E25B022088',cid:2,type:'IA2',max:20,obt:19},
    {sid:'E25B022088',cid:3,type:'IA1',max:20,obt:17},{sid:'E25B022088',cid:3,type:'IA2',max:20,obt:18},
    {sid:'E25B022088',cid:4,type:'IA1',max:20,obt:18},{sid:'E25B022088',cid:4,type:'IA2',max:20,obt:17},
    // Arjun ECE
    {sid:'E25B022089',cid:5,type:'IA1',max:20,obt:14},{sid:'E25B022089',cid:5,type:'IA2',max:20,obt:15},
    {sid:'E25B022089',cid:6,type:'IA1',max:20,obt:13},{sid:'E25B022089',cid:6,type:'IA2',max:20,obt:14},
    // Riya BBA
    {sid:'E25A022001',cid:7,type:'IA1',max:20,obt:16},{sid:'E25A022001',cid:7,type:'IA2',max:20,obt:17},
    {sid:'E25A022001',cid:8,type:'IA1',max:20,obt:15},{sid:'E25A022001',cid:8,type:'IA2',max:20,obt:16},
    // Rohit CSE
    {sid:'E25B022090',cid:1,type:'IA1',max:20,obt:13},{sid:'E25B022090',cid:1,type:'IA2',max:20,obt:14},
    {sid:'E25B022090',cid:2,type:'IA1',max:20,obt:12},{sid:'E25B022090',cid:2,type:'IA2',max:20,obt:13},
    {sid:'E25B022090',cid:3,type:'IA1',max:20,obt:11},{sid:'E25B022090',cid:3,type:'IA2',max:20,obt:12},
    {sid:'E25B022090',cid:4,type:'IA1',max:20,obt:14},{sid:'E25B022090',cid:4,type:'IA2',max:20,obt:13},
    // Anjali CSE
    {sid:'E25B022091',cid:1,type:'IA1',max:20,obt:19},{sid:'E25B022091',cid:1,type:'IA2',max:20,obt:20},
    {sid:'E25B022091',cid:2,type:'IA1',max:20,obt:18},{sid:'E25B022091',cid:2,type:'IA2',max:20,obt:19},
    {sid:'E25B022091',cid:3,type:'IA1',max:20,obt:17},{sid:'E25B022091',cid:3,type:'IA2',max:20,obt:18},
    {sid:'E25B022091',cid:4,type:'IA1',max:20,obt:19},{sid:'E25B022091',cid:4,type:'IA2',max:20,obt:18},
    // Vivek ECE
    {sid:'E25B022092',cid:5,type:'IA1',max:20,obt:10},{sid:'E25B022092',cid:5,type:'IA2',max:20,obt:11},
    {sid:'E25B022092',cid:6,type:'IA1',max:20,obt:9},{sid:'E25B022092',cid:6,type:'IA2',max:20,obt:10},
    // Sneha MECH
    {sid:'E25B022093',cid:1,type:'IA1',max:20,obt:15},{sid:'E25B022093',cid:1,type:'IA2',max:20,obt:16},
    {sid:'E25B022093',cid:2,type:'IA1',max:20,obt:14},{sid:'E25B022093',cid:2,type:'IA2',max:20,obt:15},
  ];
  const mStmt = db.prepare(`INSERT OR IGNORE INTO marks (student_id,class_id,assessment_type,max_marks,obtained,semester,entered_by,entered_at) VALUES (?,?,?,?,?,?,?,?)`);
  marksData.forEach(m => mStmt.run([m.sid,m.cid,m.type,m.max,m.obt,'Sem 4','T25S022090',now-86400000]));
  mStmt.free();

  const attStmt = db.prepare(`INSERT OR IGNORE INTO attendance_records (student_id,class_id,date,status,method,marked_at) VALUES (?,?,?,?,?,?)`);
  const attendanceMap = {
    'E25B022087':.82,'E25B022088':.91,'E25B022089':.76,'E25A022001':.88,
    'E25B022090':.70,'E25B022091':.95,'E25B022092':.60,'E25B022093':.85
  };
  const enroll = [
    {sid:'E25B022087',cids:[1,2,3,4]},{sid:'E25B022088',cids:[1,2,3,4]},
    {sid:'E25B022089',cids:[5,6]},{sid:'E25A022001',cids:[7,8]},
    {sid:'E25B022090',cids:[1,2,3,4]},{sid:'E25B022091',cids:[1,2,3,4]},
    {sid:'E25B022092',cids:[5,6]},{sid:'E25B022093',cids:[1,2]},
  ];
  enroll.forEach(e => {
    const rate = attendanceMap[e.sid] || 0.75;
    for(let day=1; day<=45; day++) {
      const d = new Date(); d.setDate(d.getDate() - day);
      if(d.getDay()===0||d.getDay()===6) continue;
      const dateStr = d.toISOString().split('T')[0];
      e.cids.forEach(cid => {
        const present = Math.random() < rate;
        attStmt.run([e.sid, cid, dateStr, present?'Present':'Absent', 'manual', now - day*86400000]);
      });
    }
  });
  attStmt.free();

  const anns = [
    {title:'End Semester Exams - May 5-20, 2026',body:'The End Semester Examination schedule for all departments has been released. Hall tickets will be issued one week prior to the exams. All students must ensure their attendance is above 75% to appear for the exams.',target:'All',urgency:'High',author:'Exam Cell',role:'Admin',ts:now-7*86400000},
    {title:'Ideathon 2026 - Register by March 20',body:'Participate in Uni Ideathon 2026. Cash prizes worth Rs 1,50,000. Open to all UG students. Register at the portal before March 20, 2026.',target:'UG',urgency:'Medium',author:'Innovation Cell',role:'Admin',ts:now-5*86400000},
    {title:'Network Maintenance - Mar 16 (12AM-4AM)',body:'Campus network and all online portals will be unavailable from 12 AM to 4 AM on March 16. Please save your work before midnight.',target:'All',urgency:'Low',author:'IT Department',role:'Admin',ts:now-4*86400000},
    {title:'Campus Placement Drive - TCS on Apr 3',body:'TCS will be visiting the campus on April 3, 2026 for placement drives for CSE and IT final year students. Eligible students must register on the placement portal before March 28.',target:'CSE',urgency:'High',author:'Placement Cell',role:'Admin',ts:now-2*86400000},
    {title:'Library Extended Hours During Exams',body:'The central library will remain open 24x7 from April 20 to May 20. Students can use reading rooms with their ID cards. Silent zone rules strictly enforced.',target:'All',urgency:'Low',author:'Library',role:'Admin',ts:now-86400000},
  ];
  const annStmt = db.prepare(`INSERT OR IGNORE INTO announcements (title,body,target,urgency,author,author_role,created_at,reads) VALUES (?,?,?,?,?,?,?,?)`);
  anns.forEach((a,i) => annStmt.run([a.title,a.body,a.target,a.urgency,a.author,a.role,a.ts,Math.floor(Math.random()*500)+100]));
  annStmt.free();

  const exams = [
    {sub:'Data Structures & Algorithms',code:'CSE301',date:'2026-05-05',time:'10:00 AM',venue:'Hall A',dept:'CSE',sem:'Sem 4',type:'ESE'},
    {sub:'Database Management Systems',code:'CSE302',date:'2026-05-08',time:'10:00 AM',venue:'Hall A',dept:'CSE',sem:'Sem 4',type:'ESE'},
    {sub:'Operating Systems',code:'CSE303',date:'2026-05-11',time:'2:00 PM',venue:'Hall B',dept:'CSE',sem:'Sem 4',type:'ESE'},
    {sub:'Computer Networks',code:'CSE304',date:'2026-05-14',time:'10:00 AM',venue:'Hall A',dept:'CSE',sem:'Sem 4',type:'ESE'},
    {sub:'Digital Electronics',code:'ECE201',date:'2026-05-06',time:'10:00 AM',venue:'Hall C',dept:'ECE',sem:'Sem 2',type:'ESE'},
    {sub:'Signals & Systems',code:'ECE202',date:'2026-05-09',time:'2:00 PM',venue:'Hall C',dept:'ECE',sem:'Sem 2',type:'ESE'},
    {sub:'Marketing Management',code:'BBA301',date:'2026-05-07',time:'10:00 AM',venue:'Hall D',dept:'BBA',sem:'Sem 6',type:'ESE'},
    {sub:'Business Law',code:'BBA302',date:'2026-05-10',time:'2:00 PM',venue:'Hall D',dept:'BBA',sem:'Sem 6',type:'ESE'},
  ];
  const exStmt = db.prepare(`INSERT OR IGNORE INTO exams (subject,subject_code,date,time,venue,department,semester,exam_type) VALUES (?,?,?,?,?,?,?,?)`);
  exams.forEach(e => exStmt.run([e.sub,e.code,e.date,e.time,e.venue,e.dept,e.sem,e.type]));
  exStmt.free();

  const events = [
    {name:'TechXcelerate 2026',date:'Apr 22-24',venue:'Block F, Open Ground',cat:'Technical',limit:400,reg:312,status:'Open',desc:'Annual tech fest with hackathons, robotics, gaming tournaments.'},
    {name:'Rang Cultural Fest',date:'Mar 29',venue:'Main Amphitheatre',cat:'Cultural',limit:700,reg:680,status:'Closing',desc:'Celebrating diversity through dance, music, and drama.'},
    {name:'Campus Placement Drive - TCS',date:'Apr 3',venue:'Seminar Hall A',cat:'Career',limit:200,reg:145,status:'Open',desc:'TCS MNC recruitment for CSE/IT branches.'},
    {name:'Research Symposium RISE',date:'Apr 8',venue:'Convention Centre',cat:'Academic',limit:150,reg:78,status:'Open',desc:'Research paper presentations and faculty talks.'},
  ];
  const evStmt = db.prepare(`INSERT OR IGNORE INTO events (name,date,venue,category,reg_limit,registered,status,description) VALUES (?,?,?,?,?,?,?,?)`);
  events.forEach(e => evStmt.run([e.name,e.date,e.venue,e.cat,e.limit,e.reg,e.status,e.desc]));
  evStmt.free();

  const feesData = [
    {sid:'E25B022087',sem:'Sem 4 2025-26',desc:'Tuition Fee',amt:85000,paid:85000,due:'2026-01-15',status:'Paid'},
    {sid:'E25B022087',sem:'Sem 4 2025-26',desc:'Library & Lab Fee',amt:5000,paid:0,due:'2026-03-31',status:'Pending'},
    {sid:'E25B022087',sem:'Sem 4 2025-26',desc:'Hostel Fee',amt:60000,paid:60000,due:'2026-01-15',status:'Paid'},
    {sid:'E25B022088',sem:'Sem 4 2025-26',desc:'Tuition Fee',amt:85000,paid:85000,due:'2026-01-15',status:'Paid'},
    {sid:'E25B022088',sem:'Sem 4 2025-26',desc:'Library & Lab Fee',amt:5000,paid:5000,due:'2026-03-31',status:'Paid'},
    {sid:'E25B022089',sem:'Sem 2 2025-26',desc:'Tuition Fee',amt:80000,paid:40000,due:'2026-02-28',status:'Partial'},
    {sid:'E25B022089',sem:'Sem 2 2025-26',desc:'Sports & Activity Fee',amt:3000,paid:0,due:'2026-03-15',status:'Overdue'},
    {sid:'E25A022001',sem:'Sem 6 2025-26',desc:'Tuition Fee',amt:75000,paid:75000,due:'2026-01-15',status:'Paid'},
    {sid:'E25A022001',sem:'Sem 6 2025-26',desc:'Examination Fee',amt:5000,paid:0,due:'2026-04-01',status:'Pending'},
    {sid:'E25B022090',sem:'Sem 4 2025-26',desc:'Tuition Fee',amt:85000,paid:0,due:'2026-01-15',status:'Overdue'},
    {sid:'E25B022090',sem:'Sem 4 2025-26',desc:'Hostel Fee',amt:60000,paid:30000,due:'2026-01-15',status:'Partial'},
    {sid:'E25B022091',sem:'Sem 4 2025-26',desc:'Tuition Fee',amt:85000,paid:85000,due:'2026-01-15',status:'Paid'},
    {sid:'E25B022092',sem:'Sem 2 2025-26',desc:'Tuition Fee',amt:80000,paid:0,due:'2026-02-28',status:'Overdue'},
    {sid:'E25B022093',sem:'Sem 6 2025-26',desc:'Tuition Fee',amt:75000,paid:75000,due:'2026-01-15',status:'Paid'},
  ];
  const fStmt = db.prepare(`INSERT OR IGNORE INTO fees (student_id,semester,description,amount,paid,due_date,status) VALUES (?,?,?,?,?,?,?)`);
  feesData.forEach(f => fStmt.run([f.sid,f.sem,f.desc,f.amt,f.paid,f.due,f.status]));
  fStmt.free();

  const calEvents = [
    {date:'2026-03-25',event:'Mid-Semester Exams Begin',type:'Exam'},
    {date:'2026-04-01',event:'Mid-Semester Results Declared',type:'Result'},
    {date:'2026-04-03',event:'TCS Campus Placement Drive',type:'Event'},
    {date:'2026-04-08',event:'Research Symposium RISE',type:'Event'},
    {date:'2026-04-14',event:'Dr. Ambedkar Jayanti - Holiday',type:'Holiday'},
    {date:'2026-04-22',event:'Earth Day Campus Drive',type:'Event'},
    {date:'2026-04-22',event:'TechXcelerate 2026 Begins',type:'Event'},
    {date:'2026-05-05',event:'End Semester Exams Begin',type:'Exam'},
    {date:'2026-05-20',event:'End Semester Exams End',type:'Exam'},
    {date:'2026-05-25',event:'Results Declaration',type:'Result'},
    {date:'2026-06-01',event:'Summer Vacation Begins',type:'Holiday'},
    {date:'2026-07-15',event:'New Semester Registration Opens',type:'Event'},
  ];
  const calStmt = db.prepare(`INSERT OR IGNORE INTO calendar_events (date,event,type) VALUES (?,?,?)`);
  calEvents.forEach(c => calStmt.run([c.date,c.event,c.type]));
  calStmt.free();

  const nStmt = db.prepare(`INSERT OR IGNORE INTO notifications (user_id,user_role,title,body,category,read_status,created_at) VALUES (?,?,?,?,?,?,?)`);
  students2.forEach(sid => {
    nStmt.run([sid,'Student','New Announcement: ESE Schedule Released','End Semester Exam schedule has been published. Check the Exams section.','announce',0,now-7*86400000]);
    nStmt.run([sid,'Student','Marks Updated: IA-2 Results','Your Internal Assessment 2 marks have been entered. Check My Marks.','marks',0,now-3*86400000]);
    nStmt.run([sid,'Student','Fee Due Reminder','One or more fee payments are pending. Check Fee Payment section.','fees',0,now-86400000]);
    nStmt.run([sid,'Student','TCS Placement Drive Registration Open','Register for TCS campus placement by March 28. Limited seats.','announce',0,now-2*86400000]);
  });
  const teachers2 = ['T25S022090','T25S022091','T25S022092','T25S022093'];
  teachers2.forEach(tid => {
    nStmt.run([tid,'Teacher','Marks Submission Deadline: April 5','Please submit all IA-3 marks before April 5, 2026.','marks',0,now-3*86400000]);
    nStmt.run([tid,'Teacher','Faculty Meeting: Friday 4PM','Mandatory faculty meeting in Conference Room B-303, Friday at 4 PM.','general',0,now-86400000]);
    nStmt.run([tid,'Teacher','New Student Enrolled in Your Class','A new student has been enrolled in CSE301. Check My Students.','students',0,now-2*86400000]);
  });
  // Admin notifications
  nStmt.run(['Admin@404','Admin','2 Pending Leave Requests','Prof. Joshi and Prof. Sharma have pending leave requests for review.','leaves',0,now-2*86400000]);
  nStmt.run(['Admin@404','Admin','Attendance Defaulters Alert','8 students are below 75% attendance threshold. Review in Reports.','attendance',0,now-86400000]);
  nStmt.run(['Admin@404','Admin','New Student Enrollment','3 new students were enrolled today. Verify in Students section.','students',0,now]);
  nStmt.free();

  saveDb();
}
async function seedNewTablesIfEmpty() {
  const now = Date.now();
  // Check each new table and seed if empty
  const checks = ['marks','attendance_records','announcements','exams','events','fees','calendar_events','notifications'];
  const isEmpty = tbl => {
    try { const r = query(`SELECT COUNT(*) as c FROM ${tbl}`); return !r.length || r[0].c === 0; }
    catch(e) { return true; }
  };
  if(checks.some(t => isEmpty(t))) {
    await seedNewTables(bcrypt.genSaltSync(10));
  }
}
function query(sql, params = []) {
  const results = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}
function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
}
function runGetId(sql, params = []) {
  db.run(sql, params);
  const rows = query('SELECT last_insert_rowid() as id');
  saveDb();
  return rows[0]?.id;
}

module.exports = { initDb, query, run, runGetId, saveDb };
