import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { otp, student_id, class_id, lat, lng } = body;

    if (!otp || !student_id || !class_id) {
      return NextResponse.json({ ok: false, message: 'otp, student_id, class_id required.' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    const now = Date.now();

    const sessions = await query<any>(
      `SELECT * FROM otp_sessions WHERE otp=? AND class_id=? AND date=? AND active=1 AND expires_at>?`,
      [otp, class_id, today, now]
    );

    if (!sessions.length) {
      return NextResponse.json({
        ok: false,
        message: 'Invalid or expired OTP. Please ask your teacher to generate a new one.',
      }, { status: 400 });
    }

    const session = sessions[0];

    const enrollment = await query<any>(`SELECT 1 FROM enrollments WHERE student_id=? AND class_id=?`, [student_id, class_id]);
    if (!enrollment.length) {
      return NextResponse.json({ ok: false, message: 'You are not enrolled in this class.' }, { status: 403 });
    }

    const existing = await query<any>(`SELECT 1 FROM attendance_records WHERE student_id=? AND class_id=? AND date=?`, [student_id, class_id, today]);
    if (existing.length) {
      return NextResponse.json({ ok: false, message: 'Attendance already marked for today.' }, { status: 409 });
    }

    if (session.lat && session.lng && lat && lng) {
      const dist = haversineDistance(parseFloat(session.lat), parseFloat(session.lng), parseFloat(lat), parseFloat(lng));
      if (dist > session.radius) {
        return NextResponse.json({
          ok: false,
          message: `You are ${Math.round(dist)}m away from the classroom. Maximum allowed distance is ${session.radius}m.`,
          distance: Math.round(dist),
        }, { status: 403 });
      }
    }

    await run(
      `INSERT INTO attendance_records (student_id,class_id,date,status,method,marked_at) VALUES (?,?,?,?,?,?)`,
      [student_id, class_id, today, 'Present', 'otp', now]
    );

    const allRecords = await query<any>(
      `SELECT COUNT(*) as total, SUM(CASE WHEN status='Present' THEN 1 ELSE 0 END) as present FROM attendance_records WHERE student_id=?`,
      [student_id]
    );

    if (allRecords.length && allRecords[0].total > 0) {
      const pct = Math.round((allRecords[0].present / allRecords[0].total) * 100);
      await run(`UPDATE students SET attendance=? WHERE id=?`, [pct, student_id]);
    }

    if (global.broadcastAttendanceUpdate) {
      global.broadcastAttendanceUpdate(student_id);
    }

    return NextResponse.json({ ok: true, message: 'Attendance marked successfully! You are marked Present.' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
