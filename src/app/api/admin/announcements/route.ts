import { NextRequest, NextResponse } from 'next/server';
import { query, run, runGetId } from '@/lib/db';

export async function GET() {
  try {
    const announcements = await query<any>(`SELECT * FROM announcements ORDER BY created_at DESC`);
    return NextResponse.json({ ok: true, announcements });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, body: textBody, target, urgency, author } = body;

    if (!title || !textBody) {
      return NextResponse.json({ ok: false, message: 'title and body required.' }, { status: 400 });
    }

    const now = Date.now();
    const id = await runGetId(
      `INSERT INTO announcements (title,body,target,urgency,author,author_role,created_at,reads) VALUES (?,?,?,?,?,?,?,0)`,
      [title, textBody, target || 'All', urgency || 'Medium', author || 'Admin', 'Admin', now]
    );

    const students = await query<any>('SELECT id FROM students');
    for (const s of students) {
      await run(
        `INSERT INTO notifications (user_id,user_role,title,body,category,read_status,created_at) VALUES (?,?,?,?,?,0,?)`,
        [s.id, 'Student', `Announcement: ${title}`, textBody.substring(0, 120), 'announce', now]
      );
    }

    const teachers = await query<any>('SELECT id FROM teachers');
    for (const t of teachers) {
      await run(
        `INSERT INTO notifications (user_id,user_role,title,body,category,read_status,created_at) VALUES (?,?,?,?,?,0,?)`,
        [t.id, 'Teacher', `Announcement: ${title}`, textBody.substring(0, 120), 'announce', now]
      );
    }

    if (global.broadcastNotification) {
      global.broadcastNotification('ALL', 'All', `Announcement: ${title}`, textBody.substring(0, 120), 'announce');
    }

    return NextResponse.json({ ok: true, message: 'Announcement created.', id });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
