import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, user_role, category } = body;

    if (!user_id || !user_role) {
      return NextResponse.json({ ok: false, message: 'user_id and user_role required.' }, { status: 400 });
    }

    if (category) {
      await run(`UPDATE notifications SET read_status=1 WHERE user_id=? AND user_role=? AND category=?`, [
        user_id,
        user_role,
        category,
      ]);
    } else {
      await run(`UPDATE notifications SET read_status=1 WHERE user_id=? AND user_role=?`, [user_id, user_role]);
    }

    const unread = await query<any>(
      `SELECT COUNT(*) as cnt FROM notifications WHERE user_id=? AND user_role=? AND read_status=0`,
      [user_id, user_role]
    );

    return NextResponse.json({ ok: true, unread_count: unread[0]?.cnt || 0 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
