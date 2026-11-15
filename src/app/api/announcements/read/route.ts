import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, user_role } = body;
    if (!user_id || !user_role) {
      return NextResponse.json({ ok: false, message: 'user_id and user_role required.' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, message: 'Announcements marked as read.', unread_count: 0 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
