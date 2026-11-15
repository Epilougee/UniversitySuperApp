import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const marks = await query<any>(`
      SELECT m.*, c.name as class_name, c.subject_code, c.credits
      FROM marks m
      JOIN classes c ON c.id = m.class_id
      WHERE m.student_id = ?
      ORDER BY c.name, m.assessment_type
    `, [id]);

    const grouped: Record<number, any> = {};
    marks.forEach((m) => {
      const key = m.class_id;
      if (!grouped[key]) {
        grouped[key] = {
          class_id: m.class_id,
          class_name: m.class_name,
          subject_code: m.subject_code,
          credits: m.credits,
          marks: [],
        };
      }
      grouped[key].marks.push({ type: m.assessment_type, max: m.max_marks, obtained: m.obtained });
    });

    return NextResponse.json({ ok: true, marks: Object.values(grouped) });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
