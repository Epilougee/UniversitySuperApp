import { NextRequest, NextResponse } from 'next/server';
import { run } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { room_id, sender_id, sender_name, sender_role, text } = body;

    if (!room_id || !sender_id || !text) {
      return NextResponse.json({ ok: false, message: 'room_id, sender_id, text required.' }, { status: 400 });
    }

    const timestamp = Date.now();
    await run(
      `INSERT INTO chat_messages (room_id, sender_id, sender_name, sender_role, text, timestamp) VALUES (?,?,?,?,?,?)`,
      [room_id, sender_id, sender_name || sender_id, sender_role || 'Unknown', text, timestamp]
    );

    if (global.ioInstance) {
      global.ioInstance.to(room_id).emit('receive_message', {
        room_id,
        sender_id,
        sender_name: sender_name || sender_id,
        sender_role: sender_role || 'Unknown',
        text,
        timestamp,
      });
    }

    return NextResponse.json({ ok: true, timestamp });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
