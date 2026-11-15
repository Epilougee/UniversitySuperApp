import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const r = await query<any>(
      `SELECT id, name, department, year, section, cgpa, attendance, phone, email, batch, address FROM students WHERE id = ?`,
      [id]
    );
    if (!r.length) {
      return NextResponse.json({ ok: false, message: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, student: r[0] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, department, year, section, cgpa, attendance, phone, email, batch, address } = body;

    const existing = await query<any>('SELECT id FROM students WHERE id = ?', [id]);
    if (!existing.length) {
      return NextResponse.json({ ok: false, message: 'Not found.' }, { status: 404 });
    }

    await run(
      `UPDATE students SET name=?, department=?, year=?, section=?, cgpa=?, attendance=?, phone=?, email=?, batch=?, address=? WHERE id=?`,
      [name, department, year, section, cgpa, attendance, phone, email, batch || '', address || '', id]
    );
    return NextResponse.json({ ok: true, message: 'Student updated.' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await query<any>('SELECT id FROM students WHERE id = ?', [id]);
    if (!existing.length) {
      return NextResponse.json({ ok: false, message: 'Not found.' }, { status: 404 });
    }

    await run('DELETE FROM enrollments WHERE student_id = ?', [id]);
    await run('DELETE FROM marks WHERE student_id = ?', [id]);
    await run('DELETE FROM attendance_records WHERE student_id = ?', [id]);
    await run('DELETE FROM fees WHERE student_id = ?', [id]);
    await run('DELETE FROM students WHERE id = ?', [id]);

    return NextResponse.json({ ok: true, message: 'Student deleted.' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
