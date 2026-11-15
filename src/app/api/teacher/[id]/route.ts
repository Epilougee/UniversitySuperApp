import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const teachers = await query<any>('SELECT * FROM teachers WHERE id = ?', [id]);
    if (!teachers.length) {
      return NextResponse.json({ ok: false, message: 'Teacher not found.' }, { status: 404 });
    }

    const { password: _pw, ...teacher } = teachers[0];
    const classes = await query<any>(`
      SELECT c.id, c.name, c.subject_code, c.department, c.schedule, c.room, c.credits,
             COUNT(e.student_id) AS student_count
      FROM classes c
      LEFT JOIN enrollments e ON e.class_id = c.id
      WHERE c.teacher_id = ?
      GROUP BY c.id ORDER BY c.id
    `, [id]);

    return NextResponse.json({ ok: true, teacher, classes });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
