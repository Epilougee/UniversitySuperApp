import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string; role: string }> }) {
  try {
    const { userId, role } = await params;

    const notifications = await query<any>(
      `SELECT * FROM notifications WHERE user_id=? AND user_role=? ORDER BY created_at DESC LIMIT 50`,
      [userId, role]
    );

    const unread = await query<any>(
      `SELECT COUNT(*) as cnt FROM notifications WHERE user_id=? AND user_role=? AND read_status=0`,
      [userId, role]
    );

    const byCat = await query<any>(
      `SELECT category, COUNT(*) as cnt FROM notifications WHERE user_id=? AND user_role=? AND read_status=0 GROUP BY category`,
      [userId, role]
    );

    const counts: Record<string, number> = {};
    byCat.forEach((r) => {
      counts[r.category] = r.cnt;
    });

    return NextResponse.json({
      ok: true,
      notifications,
      unread_count: unread[0]?.cnt || 0,
      counts,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
