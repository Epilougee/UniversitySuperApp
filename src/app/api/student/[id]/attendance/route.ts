import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const classes = await query<any>(`
      SELECT c.id, c.name, c.subject_code,
        COUNT(ar.id) as total_classes,
        SUM(CASE WHEN ar.status='Present' THEN 1 ELSE 0 END) as present_count,
        ROUND(SUM(CASE WHEN ar.status='Present' THEN 1.0 ELSE 0 END) / NULLIF(COUNT(ar.id),0) * 100, 1) as percentage
      FROM enrollments e
      JOIN classes c ON c.id = e.class_id
      LEFT JOIN attendance_records ar ON ar.class_id=e.class_id AND ar.student_id=e.student_id
      WHERE e.student_id=?
      GROUP BY c.id ORDER BY c.name
    `, [id]);

    const recent = await query<any>(`
      SELECT ar.date, ar.status, ar.method, c.name as class_name, c.subject_code
      FROM attendance_records ar
      JOIN classes c ON c.id = ar.class_id
      WHERE ar.student_id=?
      ORDER BY ar.date DESC, ar.id DESC LIMIT 30
    `, [id]);

    const overall = await query<any>(`
      SELECT ROUND(SUM(CASE WHEN status='Present' THEN 1.0 ELSE 0 END) / NULLIF(COUNT(*),0) * 100, 1) as pct
      FROM attendance_records WHERE student_id=?
    `, [id]);

    return NextResponse.json({ ok: true, classes, recent, overall_pct: overall[0]?.pct || 0 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
