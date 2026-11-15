import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ ok: false, message: 'Notification ID required.' }, { status: 400 });
    }

    await run(`UPDATE notifications SET read_status=1 WHERE id=?`, [id]);

    const updated = await query<any>(`SELECT * FROM notifications WHERE id=?`, [id]);
    if (!updated.length) {
      return NextResponse.json({ ok: false, message: 'Notification not found.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, message: 'Notification marked as read.', notification: updated[0] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
