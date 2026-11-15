import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';

export async function GET() {
  try {
    const announcements = await query<any>(`SELECT * FROM announcements ORDER BY created_at DESC LIMIT 50`);
    return NextResponse.json({ ok: true, announcements });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, body: textBody, target, urgency, author, author_role } = body;

    if (!title || !author) {
      return NextResponse.json({ ok: false, message: 'title and author required.' }, { status: 400 });
    }

    const now = Date.now();
    await run(
      `INSERT INTO announcements (title,body,target,urgency,author,author_role,created_at,reads) VALUES (?,?,?,?,?,?,?,0)`,
      [title, textBody || '', target || 'All', urgency || 'Medium', author, author_role || 'Admin', now]
    );

    return NextResponse.json({ ok: true, message: 'Announcement created.' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
