import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { teacher_id, class_id, assessment_type, max_marks, entries, semester } = body;

    if (!class_id || !assessment_type || !entries) {
      return NextResponse.json({ ok: false, message: 'class_id, assessment_type, entries required.' }, { status: 400 });
    }

    const now = Date.now();
    for (const e of entries) {
      const existing = await query<any>(
        `SELECT id FROM marks WHERE student_id = ? AND class_id = ? AND assessment_type = ?`,
        [e.student_id, class_id, assessment_type]
      );

      if (existing.length) {
        await run(
          `UPDATE marks SET obtained = ?, max_marks = ?, entered_by = ?, entered_at = ? WHERE student_id = ? AND class_id = ? AND assessment_type = ?`,
          [e.obtained, max_marks || 20, teacher_id, now, e.student_id, class_id, assessment_type]
        );
      } else {
        await run(
          `INSERT INTO marks (student_id, class_id, assessment_type, max_marks, obtained, semester, entered_by, entered_at) VALUES (?,?,?,?,?,?,?,?)`,
          [e.student_id, class_id, assessment_type, max_marks || 20, e.obtained, semester || 'Current', teacher_id, now]
        );
      }

      // Recalculate CGPA
      const allMarks = await query<any>(`SELECT obtained, max_marks FROM marks WHERE student_id = ?`, [e.student_id]);
      if (allMarks.length > 0) {
        const totalObtained = allMarks.reduce((a, m) => a + m.obtained, 0);
        const totalMax = allMarks.reduce((a, m) => a + m.max_marks, 0);
        if (totalMax > 0) {
          const percentage = (totalObtained / totalMax) * 100;
          const cgpa = percentage >= 90 ? 9.5 : percentage >= 80 ? 8.5 : percentage >= 70 ? 7.5 : percentage >= 60 ? 6.5 : 5.5;
          await run(`UPDATE students SET cgpa = ? WHERE id = ?`, [cgpa.toFixed(1), e.student_id]);
        }
      }

      if (global.broadcastMarksUpdate) {
        global.broadcastMarksUpdate(e.student_id);
      }
    }

    return NextResponse.json({ ok: true, message: 'Marks saved successfully.' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
