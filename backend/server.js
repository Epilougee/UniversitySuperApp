/**
 * server.js â€“ Uni Super App Backend (Full ERP)
 */
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const http    = require('http');
const { Server } = require('socket.io');
const { initDb, run } = require('./database');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*', methods: ['GET','POST'] } });

// Export io for use in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

const PORT = 3001;

app.use(cors({ origin:'*', methods:['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders:['Content-Type','Authorization'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..')));

/* Socket.IO real-time chat & notifications */
io.on('connection', (socket) => {
  console.log(`ðŸ”Œ Socket: ${socket.id}`);
  
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`ðŸ“ User joined room: ${roomId}`);
  });
  
  socket.on('send_message', (data) => {
    const { room_id, sender_id, sender_name, sender_role, text } = data;
    if (!room_id || !sender_id || !text) return;
    const ts = Date.now();
    try {
      run(`INSERT INTO chat_messages (room_id,sender_id,sender_name,sender_role,text,timestamp) VALUES (?,?,?,?,?,?)`,
        [room_id, sender_id, sender_name || sender_id, sender_role || 'Unknown', text, ts]);
    } catch(e) { console.error('Chat save error:', e.message); }
    io.to(room_id).emit('receive_message', { room_id, sender_id, sender_name, sender_role, text, timestamp: ts });
  });
  
  socket.on('disconnect', () => console.log(`ðŸ”Œ Disconnected: ${socket.id}`));
});

// Utility function for broadcasting notifications
global.broadcastNotification = (userId, userRole, title, body, category) => {
  io.emit('notification', { user_id: userId, user_role: userRole, title, body, category, timestamp: Date.now() });
};

// Utility for broadcasting marks updates
global.broadcastMarksUpdate = (studentId) => {
  io.emit('marks_updated', { student_id: studentId, timestamp: Date.now() });
};

// Utility for broadcasting attendance updates  
global.broadcastAttendanceUpdate = (studentId) => {
  io.emit('attendance_updated', { student_id: studentId, timestamp: Date.now() });
};

async function startServer() {
  try {
    console.log('â³  Initialising database...');
    await initDb();
    console.log('âœ…  Database ready.');

    const authRoute         = require('./routes/auth');
    const studentRoute      = require('./routes/student');
    const teacherRoute      = require('./routes/teacher');
    const adminRoute        = require('./routes/admin');
    const chatRoute         = require('./routes/chat');
    const attendanceRoute   = require('./routes/attendance');
    const notificationsRoute = require('./routes/notifications');
    const announcementsRoute = require('./routes/announcements');
    const assignmentsRoute   = require('./routes/assignments');

    app.use('/api/login',         authRoute);
    app.use('/api/student',       studentRoute);
    app.use('/api/teacher',       teacherRoute);
    app.use('/api/admin',         adminRoute);
    app.use('/api/chat',          chatRoute);
    app.use('/api/attendance',    attendanceRoute);
    app.use('/api/notifications', notificationsRoute);
    app.use('/api/announcements', announcementsRoute);
    app.use('/api/assignments',   assignmentsRoute);

    app.get('/api/health', (_req, res) => res.json({ ok: true, message: 'Uni ERP backend running.', timestamp: new Date().toISOString() }));
    app.use((_req, res) => res.status(404).json({ ok: false, message: 'Route not found.' }));

    server.listen(PORT, () => {
      console.log(`ðŸš€  Uni ERP Backend â†’ http://localhost:${PORT}`);
      console.log(`ðŸ“„  Frontend        â†’ http://localhost:${PORT}/index.html`);
      console.log(`ðŸ”—  API Base        â†’ http://localhost:${PORT}/api`);
      console.log(`ðŸ’¬  WebSocket ready`);
    });
  } catch(err) {
    console.error('âŒ  Server start failed:', err);
    process.exit(1);
  }
}

startServer();
