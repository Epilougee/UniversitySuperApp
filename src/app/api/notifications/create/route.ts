import { NextRequest, NextResponse } from 'next/server';
import { run } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, user_role, title, body: textBody, category } = body;

    if (!user_id || !user_role || !title) {
      return NextResponse.json({ ok: false, message: 'user_id, user_role, title required.' }, { status: 400 });
    }

    const now = Date.now();
    await run(
      `INSERT INTO notifications (user_id,user_role,title,body,category,read_status,created_at) VALUES (?,?,?,?,?,0,?)`,
      [user_id, user_role, title, textBody || '', category || 'general', now]
    );

    if (global.broadcastNotification) {
      global.broadcastNotification(user_id, user_role, title, textBody || '', category || 'general');
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
