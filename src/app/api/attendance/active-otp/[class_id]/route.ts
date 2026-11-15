import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ class_id: string }> }) {
  try {
    const { class_id } = await params;
    const today = new Date().toISOString().split('T')[0];
    const now = Date.now();
    const rows = await query<any>(
      `SELECT * FROM otp_sessions WHERE class_id=? AND date=? AND active=1 AND expires_at>?`,
      [class_id, today, now]
    );

    if (!rows.length) {
      return NextResponse.json({ ok: false, message: 'No active OTP.' });
    }

    const session = rows[0];
    return NextResponse.json({ ok: true, expires_at: session.expires_at, class_id: session.class_id });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
