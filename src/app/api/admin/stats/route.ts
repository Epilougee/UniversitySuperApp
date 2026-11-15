import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const [s] = await query<any>('SELECT COUNT(*) as cnt FROM students');
    const [t] = await query<any>('SELECT COUNT(*) as cnt FROM teachers');
    const [c] = await query<any>('SELECT COUNT(*) as cnt FROM classes');
    const [a] = await query<any>('SELECT ROUND(AVG(cgpa),2) as v FROM students');
    const [att] = await query<any>('SELECT ROUND(AVG(attendance),1) as v FROM students');
    const [exs] = await query<any>('SELECT COUNT(*) as cnt FROM exams');
    const [evs] = await query<any>('SELECT COUNT(*) as cnt FROM events');
    const [fees] = await query<any>(`SELECT ROUND(SUM(amount-paid),0) as v FROM fees WHERE status!='Paid'`);
    const [anns] = await query<any>('SELECT COUNT(*) as cnt FROM announcements');

    return NextResponse.json({
      ok: true,
      stats: {
        studentCount: s?.cnt || 0,
        teacherCount: t?.cnt || 0,
        classCount: c?.cnt || 0,
        avgCgpa: a?.v || 0,
        avgAttendance: att?.v || 0,
        examCount: exs?.cnt || 0,
        eventCount: evs?.cnt || 0,
        pendingFees: fees?.v || 0,
        announcementCount: anns?.cnt || 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
