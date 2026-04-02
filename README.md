# 🎓 Uni Super App — Complete ERP System

> A comprehensive Educational Resource Planning (ERP) platform for academic institutions

**Built with:** Node.js • Express • Socket.IO • SQLite

---

## 📋 Table of Contents

1. [Overview](#-project-overview)
2. [Features](#key-features)
3. [Prerequisites](#-prerequisites)
4. [Installation](#️-installation--setup)
5. [Running the Project](#-running-the-project)
6. [Login Credentials](#-default-login-credentials)
7. [How to Use](#-how-to-use)
8. [Project Structure](#-project-structure)
9. [API Endpoints](#-api-endpoints-overview)
10. [Database Schema](#-database-schema)
11. [Frontend Details](#-frontend-details)
12. [Troubleshooting](#-troubleshooting)
13. [Technology Stack](#-technology-stack)
14. [Deployment](#-deployment)
15. [Contributing](#-contributing)
16. [License](#-license)

---

## 📌 Project Overview

Uni Super App is a comprehensive web-based ERP system designed to streamline educational institution management. It provides dedicated portals for three main user roles:

- **Students** — Access assignments, announcements, results, attendance, and chat with faculty
- **Teachers** — Manage classes, mark attendance, post announcements, and communicate with students
- **Admins** — Full control over users, courses, events, and system administration

### Key Features

| Feature | Description |
|---------|-------------|
| ✅ **User Authentication** | Secure role-based login for Students, Teachers, and Admins |
| ✅ **Real-time Chat** | WebSocket-based messaging system via Socket.IO |
| ✅ **Notifications** | Real-time notifications with read status tracking |
| ✅ **Academic Management** | Assignments, exams, results, and timetables |
| ✅ **Attendance Tracking** | Comprehensive student attendance records with OTP & geofencing |
| ✅ **Admin Dashboard** | Complete user and system management |
| ✅ **Announcements** | System-wide and role-based notifications |
| ✅ **AI Study Assistant** | Integrated AI helper for student queries |
| ✅ **Responsive Design** | Mobile and desktop compatible |

---

## 📋 Prerequisites

### System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|------------|
| **Node.js** | v14.0.0 | v18.0.0+ |
| **RAM** | 512 MB | 2 GB |
| **Disk Space** | 500 MB | 2 GB |
| **Browser** | Chrome 90+ | Latest versions |

### Required Software

- ✔ **Node.js** (v14 or higher) — [Download](https://nodejs.org/)
- ✔ **npm** (comes with Node.js) — Package manager
- ✔ **Git** — [Download](https://git-scm.com/)
- ✔ **Modern Web Browser** — Chrome, Firefox, Safari, or Edge

### ✅ Verify Installation

```bash
# Check Node.js version
node --version

# Check npm version
npm --version
```

---

## ⚙️ Installation & Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/uni-super-app.git
cd uni-super-app
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

**This will install:**
- `express` — Web server framework
- `cors` — Cross-Origin Resource Sharing middleware
- `socket.io` — Real-time communication library
- `bcryptjs` — Password hashing library
- `sql.js` — SQLite database for Node.js

### Step 3: Verify Dependencies

```bash
npm list
```

All packages should be listed with their versions.

---

## 🚀 Running the Project

### Start the Backend Server

From the `backend` directory:

```bash
npm start
```

**Alternative method:**

```bash
node server.js
```

### ✅ Expected Output

```
🚀 Server running on http://localhost:3001
🛢️ Database initialized successfully
📌 Socket.IO ready for connections
```

### 🌐 Access the Application

Once the server is running, open your browser and navigate to:

```
http://localhost:3001
```

The main login page should load with three portal options (Student, Teacher, Admin).

---

## 👥 Default Login Credentials

The system comes pre-seeded with sample data for testing purposes.

### 👨‍🎓 Student Login

| Field | Value |
|-------|-------|
| **Role** | Student |
| **ID** | `E25B022087` |
| **Password** | `E25B022087` _(same as ID)_ |

### 👨‍🏫 Teacher Login

| Field | Value |
|-------|-------|
| **Role** | Teacher |
| **ID** | `T25S022090` |
| **Password** | `T25S022090` _(same as ID)_ |

### 👨‍💼 Admin Login

| Field | Value |
|-------|-------|
| **Role** | Admin |
| **ID** | `Admin@404` |
| **Password** | `Admin@123` |

> **Note:** Student and teacher passwords default to their IDs. Admin credentials are set separately.

---

## 📖 How to Use

### 👨‍🎓 For Students

1. **Login** — Enter your Student ID and password, then click "Secure Login"
2. **Dashboard** — View your profile info, attendance percentage, CGPA, pending assignments, and upcoming events at a glance
3. **Attendance** — Check subject-wise attendance with visual progress bars. Use OTP + geofencing to mark attendance in class
4. **Assignments** — View pending and submitted assignments. Click on any assignment to see details and submit your work
5. **Timetable** — See your full weekly class schedule in a visual grid format
6. **Grades & Marks** — View your internal assessment marks for each subject
7. **Messages** — Chat in real-time with faculty and classmates via Socket.IO
8. **Study Materials** — Download PDFs, slides, and notes uploaded by teachers
9. **AI Study Assistant** — Ask academic questions and get instant AI-powered explanations
10. **Events** — Browse and register for campus events (tech fests, cultural events, placements)
11. **Student Corner** — Access marketplace (buy/sell items), lost & found, and internship board
12. **Notifications** — Click the bell icon to see announcements, marks updates, and fee reminders

### 👨‍🏫 For Teachers

1. **Login** — Enter your Teacher ID and password
2. **Dashboard** — Overview of today's classes, student count, defaulters, and pending tasks
3. **Attendance** — Select a class and section, then click on student cards to mark them present/absent. Submit when done
4. **My Students** — View all students with their attendance and marks. Use the "Add New Student" form or "Marks Entry" to manage records
5. **Timetable** — See your personal teaching schedule and request changes
6. **Assignments** — Create new assignments with deadlines, download submissions, and evaluate with marks & feedback
7. **Marks & Gradebook** — Enter IA marks for any assessment. View gradebook summary with automatic grade calculation
8. **Announcements** — Post targeted announcements to specific sections with urgency levels
9. **Messages** — Chat with students and other faculty in real-time
10. **Leave** — Apply for leave and track approval status
11. **Profile & Settings** — View and edit your profile information

### 👨‍💼 For Admins

1. **Login** — Enter Admin ID (`Admin@404`) and password (`Admin@123`)
2. **Dashboard** — See total students, faculty, departments, average attendance, and pending actions
3. **Students** — Search, filter, add, edit, or delete student records. Import via CSV
4. **Faculty** — Manage faculty directory, add new teachers, approve/reject leave requests
5. **Timetable** — Manage class schedules across departments
6. **Exams** — View and manage exam schedules with auto-loading from database
7. **Academic Calendar** — Track holidays, exam dates, events, and results dates
8. **Marks Entry** — Oversee marks entry across all departments and subjects
9. **Announcements** — Broadcast system-wide or targeted announcements
10. **Push Notifications** — Send notifications to specific users or broadcast to all
11. **Events** — Create and manage campus events with registration tracking
12. **Reports** — View analytics: department-wise attendance, fee collection, enrollment stats
13. **Chat** — Communicate with faculty and students
14. **Settings** — System configuration and preferences

### 💡 Tips

- **Search** — Use the top search bar on any portal to quickly find students, subjects, or content
- **Notifications** — Click the 🔔 bell icon to view and manage notifications. Use "Read all" to clear
- **Real-time updates** — Chat and notifications update in real-time without page refresh
- **Responsive** — Works on both desktop and mobile devices

---

## 📁 Project Structure

```
uni-super-app/
├── .gitignore                          # Git ignore rules
├── README.md                           # This file
├── index.html                          # Main login page
├── student.html                        # Student portal
├── teacher.html                        # Teacher portal
├── admin.html                          # Admin portal
└── backend/                            # Backend server
    ├── server.js                       # Express server & Socket.IO setup
    ├── database.js                     # SQLite database management
    ├── package.json                    # Project dependencies
    └── routes/                         # API endpoint handlers
        ├── auth.js                     # Authentication endpoints
        ├── student.js                  # Student-specific endpoints
        ├── teacher.js                  # Teacher-specific endpoints
        ├── admin.js                    # Admin-specific endpoints
        ├── announcements.js            # Announcement management
        ├── assignments.js              # Assignment management
        ├── attendance.js               # Attendance tracking
        ├── chat.js                     # Chat functionality
        └── notifications.js            # Notification system
```

---

## 📌 API Endpoints Overview

### 🔑 Authentication
- `POST /api/login` — User login (all roles)

### 📲 Notifications
- `GET /api/notifications/:userId/:role` — Fetch all notifications
- `POST /api/notifications/create` — Create new notification
- `PUT /api/notifications/read/:id` — Mark notification as read
- `POST /api/notifications/mark-read` — Bulk mark as read
- `POST /api/notifications/broadcast` — Broadcast to all users

### 📢 Announcements
- `GET /api/announcements` — Fetch all announcements
- `POST /api/announcements/create` — Create announcement
- `DELETE /api/announcements/:id` — Delete announcement

### 📝 Assignments
- `GET /api/assignments` — Fetch assignments
- `POST /api/assignments/create` — Create assignment
- `POST /api/assignments/submit` — Submit assignment

### ✅ Attendance
- `GET /api/attendance/:studentId` — Get student attendance
- `POST /api/attendance/mark` — Mark attendance
- `POST /api/attendance/bulk` — Bulk mark attendance

### 💬 Chat (Socket.IO)
- `join_room` — Join chat room
- `send_message` — Send message
- `receive_message` — Receive message
- `disconnect` — User disconnect

### 👥 Students
- `GET /api/students` — Get all students
- `GET /api/students/:id` — Get student info
- `POST /api/students/create` — Create student

### 👨‍🏫 Teachers
- `GET /api/teachers` — Get all teachers
- `GET /api/teachers/:id` — Get teacher info
- `POST /api/teachers/create` — Create teacher

### ⚙️ Administration
- `GET /api/admin/dashboard` — Admin dashboard data
- `POST /api/admin/users` — Manage users
- `POST /api/admin/events` — Create events

---

## 🗄 Database Schema

The application uses **SQLite** (via sql.js) with the following tables:

### 👥 User Tables
- **students** — Student profiles and academic data
- **teachers** — Teacher profiles and credentials
- **admins** — Administrator accounts
- **departments** — Department information

### 📚 Academic Tables
- **classes** — Course and class information
- **enrollments** — Student class enrollments
- **marks** — Student assessment and grades
- **attendance_records** — Class attendance tracking
- **exams** — Exam schedules and details

### 💬 Communication Tables
- **announcements** — Broadcast announcements
- **notifications** — Individual user notifications
- **chat_messages** — Chat message history

### 🎯 Administrative Tables
- **events** — Campus events and activities
- **fees** — Student fee records
- **calendar_events** — Academic calendar events

> The database auto-seeds with sample data on first run. Delete `backend/Uni.db` and restart to reset.

---

## 🎨 Frontend Details

### Student Portal (`student.html`)
- Dashboard with profile info, CGPA, attendance overview
- Assignment submission interface
- OTP + geofencing-based attendance marking
- Real-time chat with faculty and peers
- AI Study Assistant
- Notification center with read/unread tracking
- Campus events, marketplace, lost & found
- Internship board

### Teacher Portal (`teacher.html`)
- Class management and student directory
- Attendance marking with visual grid
- Assignment posting, evaluation, and grading
- Marks entry and gradebook
- Announcement broadcasting
- Real-time chat with students

### Admin Portal (`admin.html`)
- User management (students & faculty CRUD)
- Department-wise analytics and reporting
- Class and enrollment management
- Event and exam management
- System-wide announcements & push notifications
- Academic calendar management

---

## 🛠 Troubleshooting

### ❌ Server won't start

```bash
# Check if port 3001 is already in use
# Windows: netstat -aon | findstr :3001
# Mac/Linux: lsof -i :3001

# Verify Node.js installation
node --version

# Try clearing npm cache and reinstalling
npm cache clean --force
npm install
```

### ❌ "Cannot find module" error

```bash
# Reinstall all dependencies
rm -rf node_modules package-lock.json
npm install
```

### ❌ Database is empty or not found

- The database (`Uni.db`) auto-seeds on first run
- If corrupted, delete `backend/Uni.db` and restart the server
- Ensure file permissions allow read/write in the backend directory

### ❌ Login fails with correct credentials

```bash
# Clear browser cache and cookies (Ctrl+Shift+Delete)

# Verify server is running
curl http://localhost:3001/api/health

# Check browser console for errors (F12 → Console tab)
```

### ❌ Real-time chat not working

- Check browser console for Socket.IO connection errors
- Verify WebSocket is not blocked by firewall
- Ensure the server is running on port 3001
- Restart the server: `npm start`

---

## 📚 Technology Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Frontend** | HTML5, CSS3, JavaScript | Latest | User interfaces |
| **Backend** | Node.js, Express.js | 18.x, 5.x | Server & API |
| **Database** | SQLite (sql.js) | 1.14.1 | Data persistence |
| **Real-time** | Socket.IO | 4.8.3 | Live chat & notifications |
| **Security** | bcryptjs | 3.0.3 | Password hashing |
| **HTTP** | CORS | 2.8.6 | Cross-origin requests |
| **UI** | Font Awesome | 6.0 | Icons & vectors |

---

## 🚀 Deployment

### For Production Deployment

**Step 1: Environment Variables**
```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=your_production_database_url
```

**Step 2: Process Manager** (use PM2)
```bash
npm install -g pm2
pm2 start backend/server.js --name "uni-app"
pm2 save
pm2 startup
```

**Step 3: Security Checklist**
- ✅ Enable HTTPS using Let's Encrypt or similar
- ✅ Add rate limiting middleware
- ✅ Configure security headers (helmet.js)
- ✅ Implement request validation
- ✅ Set up monitoring and logging
- ✅ Use environment variables for secrets

**Step 4: Deployment Platforms**
- Heroku, AWS, DigitalOcean, Azure, Railway, or Render

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📝 License

This project is licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute this project.

---

## ✅ Quick Start Checklist

- [ ] Install Node.js v14+
- [ ] Clone this repository
- [ ] `cd backend && npm install`
- [ ] `npm start`
- [ ] Open `http://localhost:3001`
- [ ] Login with provided credentials
- [ ] Explore the respective portal (Student/Teacher/Admin)

---

**Happy Learning! 🚀**
