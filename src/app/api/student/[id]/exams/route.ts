import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const student = await query<any>(`SELECT department FROM students WHERE id = ?`, [id]);
    if (!student.length) {
      return NextResponse.json({ ok: false, message: 'Student not found.' }, { status: 404 });
    }

    const dept = student[0].department;
    const exams = await query<any>(`SELECT * FROM exams WHERE department = ? OR department = 'All' ORDER BY date ASC`, [dept]);
    return NextResponse.json({ ok: true, exams });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
