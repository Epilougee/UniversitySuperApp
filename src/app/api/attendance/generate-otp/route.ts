import { NextRequest, NextResponse } from 'next/server';
import { query, run, runGetId } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { class_id, teacher_id, lat, lng } = body;

    if (!class_id || !teacher_id) {
      return NextResponse.json({ ok: false, message: 'class_id and teacher_id required.' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    await run(`UPDATE otp_sessions SET active=0 WHERE class_id=? AND teacher_id=? AND date=?`, [class_id, teacher_id, today]);

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes

    const id = await runGetId(
      `INSERT INTO otp_sessions (otp, class_id, teacher_id, date, lat, lng, radius, expires_at, created_at, active) VALUES (?,?,?,?,?,?,?,?,?,1)`,
      [otp, class_id, teacher_id, today, lat || null, lng || null, 200, expiresAt, now]
    );

    try {
      const enrolled = await query<any>(`SELECT student_id FROM enrollments WHERE class_id=?`, [class_id]);
      const classInfo = await query<any>(`SELECT name FROM classes WHERE id=?`, [class_id]);
      const className = classInfo[0]?.name || 'class';
      for (const e of enrolled) {
        await run(
          `INSERT INTO notifications (user_id,user_role,title,body,category,read_status,created_at) VALUES (?,?,?,?,?,0,?)`,
          [e.student_id, 'Student', `Attendance OTP Active — ${className}`, `An OTP for attendance is now active for ${className}. Mark your attendance before it expires.`, 'attendance', now]
        );
        if (global.broadcastNotification) {
          global.broadcastNotification(e.student_id, 'Student', `Attendance OTP Active — ${className}`, `OTP is now active for ${className}`, 'attendance');
        }
      }
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true, otp, expires_at: expiresAt, session_id: id });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
