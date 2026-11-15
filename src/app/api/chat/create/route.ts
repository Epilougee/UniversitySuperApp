import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user1_id, user2_id, user1_name, user2_name, user1_role, user2_role } = body;

    if (!user1_id || !user2_id || !user1_name || !user2_name) {
      return NextResponse.json({
        ok: false,
        message: 'user1_id, user2_id, user1_name, user2_name required.',
      }, { status: 400 });
    }

    const roomId = [user1_id, user2_id].sort().join('_');
    const existingMessages = await query<any>(`SELECT COUNT(*) as cnt FROM chat_messages WHERE room_id = ?`, [roomId]);

    const chatData = {
      room_id: roomId,
      user1_id,
      user2_id,
      user1_name: user1_name || user1_id,
      user2_name: user2_name || user2_id,
      user1_role: user1_role || 'Unknown',
      user2_role: user2_role || 'Unknown',
      created_at: Date.now(),
      is_new: existingMessages[0]?.cnt === 0,
    };

    return NextResponse.json({
      ok: true,
      message: 'Chat room created/opened successfully.',
      chat: chatData,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
