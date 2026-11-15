import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; class_id: string }> }) {
  try {
    const { class_id } = await params;
    const students = await query<any>(`
      SELECT s.id, s.name, s.year, s.section, s.cgpa, s.attendance, s.phone, s.email
      FROM enrollments e
      JOIN students s ON s.id = e.student_id
      WHERE e.class_id = ?
      ORDER BY s.name
    `, [class_id]);

    return NextResponse.json({ ok: true, students });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
