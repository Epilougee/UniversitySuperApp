import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { getDb, run } from './src/lib/db';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Define global socket broadcasting types
declare global {
  var ioInstance: SocketIOServer | undefined;
  var broadcastNotification: ((userId: string, userRole: string, title: string, body: string, category: string) => void) | undefined;
  var broadcastMarksUpdate: ((studentId: string) => void) | undefined;
  var broadcastAttendanceUpdate: ((studentId: string) => void) | undefined;
}

async function main() {
  await getDb(); // Ensure database is initialized before accepting requests
  await app.prepare();

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  global.ioInstance = io;

  global.broadcastNotification = (userId, userRole, title, body, category) => {
    io.emit('notification', {
      user_id: userId,
      user_role: userRole,
      title,
      body,
      category,
      timestamp: Date.now(),
    });
  };

  global.broadcastMarksUpdate = (studentId) => {
    io.emit('marks_updated', { student_id: studentId, timestamp: Date.now() });
  };

  global.broadcastAttendanceUpdate = (studentId) => {
    io.emit('attendance_updated', { student_id: studentId, timestamp: Date.now() });
  };

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    socket.on('join_room', (roomId: string) => {
      socket.join(roomId);
      console.log(`📍 Socket ${socket.id} joined room: ${roomId}`);
    });

    socket.on('send_message', async (data: any) => {
      const { room_id, sender_id, sender_name, sender_role, text } = data;
      if (!room_id || !sender_id || !text) return;
      const ts = Date.now();
      try {
        await run(
          `INSERT INTO chat_messages (room_id, sender_id, sender_name, sender_role, text, timestamp) VALUES (?,?,?,?,?,?)`,
          [room_id, sender_id, sender_name || sender_id, sender_role || 'Unknown', text, ts]
        );
      } catch (e: any) {
        console.error('Chat message save error:', e.message);
      }
      io.to(room_id).emit('receive_message', {
        room_id,
        sender_id,
        sender_name,
        sender_role,
        text,
        timestamp: ts,
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
    console.log(`> Environment: ${dev ? 'development' : 'production'}`);
    console.log(`> Port: ${port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
