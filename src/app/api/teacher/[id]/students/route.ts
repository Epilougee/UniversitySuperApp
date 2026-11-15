import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const teacher = await query<any>(`SELECT department FROM teachers WHERE id = ?`, [id]);
    if (!teacher.length) {
      return NextResponse.json({ ok: false, message: 'Teacher not found.' }, { status: 404 });
    }

    const students = await query<any>(`
      SELECT s.id, s.name, s.department, s.year, s.section, s.cgpa, s.attendance, s.phone, s.email, s.batch
      FROM students s
      WHERE s.department = ?
      ORDER BY s.year, s.section, s.name
    `, [teacher[0].department]);

    return NextResponse.json({ ok: true, students });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
