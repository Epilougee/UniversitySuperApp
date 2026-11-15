import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const students = await query<any>('SELECT * FROM students WHERE id = ?', [id]);
    if (!students.length) {
      return NextResponse.json({ ok: false, message: 'Student not found.' }, { status: 404 });
    }

    const { password: _pw, ...student } = students[0];
    const classes = await query<any>(`
      SELECT c.id, c.name, c.subject_code, c.department, c.schedule, c.room, c.credits, e.group_name,
             t.name AS teacher_name, t.designation AS teacher_designation
      FROM enrollments e
      JOIN classes c ON c.id = e.class_id
      JOIN teachers t ON t.id = c.teacher_id
      WHERE e.student_id = ? ORDER BY c.id
    `, [id]);

    return NextResponse.json({ ok: true, student, classes });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, phone, email, address } = body;

    const student = await query<any>('SELECT * FROM students WHERE id = ?', [id]);
    if (!student.length) {
      return NextResponse.json({ ok: false, message: 'Student not found.' }, { status: 404 });
    }

    await run(
      `UPDATE students SET name = ?, phone = ?, email = ?, address = ? WHERE id = ?`,
      [name || student[0].name, phone || student[0].phone, email || student[0].email, address || student[0].address || '', id]
    );

    const updated = await query<any>('SELECT id, name, department, year, section, cgpa, attendance, phone, email, address FROM students WHERE id = ?', [id]);
    return NextResponse.json({ ok: true, message: 'Profile updated.', student: updated[0] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
