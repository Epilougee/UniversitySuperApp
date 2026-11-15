import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target, title, body: textBody, category } = body;

    if (!target || !title) {
      return NextResponse.json({ ok: false, message: 'target and title required.' }, { status: 400 });
    }

    const now = Date.now();
    let users: { id: string; role: string }[] = [];

    if (target === 'Student' || target === 'All') {
      const studs = await query<any>(`SELECT id FROM students`);
      users = users.concat(studs.map((s) => ({ id: s.id, role: 'Student' })));
    }

    if (target === 'Teacher' || target === 'All') {
      const teachs = await query<any>(`SELECT id FROM teachers`);
      users = users.concat(teachs.map((t) => ({ id: t.id, role: 'Teacher' })));
    }

    for (const u of users) {
      await run(
        `INSERT INTO notifications (user_id,user_role,title,body,category,read_status,created_at) VALUES (?,?,?,?,?,0,?)`,
        [u.id, u.role, title, textBody || '', category || 'general', now]
      );
    }

    if (global.broadcastNotification) {
      global.broadcastNotification('ALL', target, title, textBody || '', category || 'general');
    }

    return NextResponse.json({ ok: true, sent_to: users.length });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
