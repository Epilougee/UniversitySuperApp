import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; class_id: string }> }) {
  try {
    const { class_id } = await params;
    const marks = await query<any>(`
      SELECT m.student_id, m.assessment_type, m.max_marks, m.obtained, m.id, s.name
      FROM marks m
      JOIN students s ON s.id = m.student_id
      WHERE m.class_id = ?
      ORDER BY s.name, m.assessment_type
    `, [class_id]);

    return NextResponse.json({ ok: true, marks });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
