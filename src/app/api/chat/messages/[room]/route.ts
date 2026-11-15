import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ room: string }> }) {
  try {
    const { room } = await params;
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    const msgs = await query<any>(
      `SELECT * FROM chat_messages WHERE room_id = ? ORDER BY timestamp ASC LIMIT ?`,
      [room, limit]
    );

    return NextResponse.json({ ok: true, messages: msgs });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
