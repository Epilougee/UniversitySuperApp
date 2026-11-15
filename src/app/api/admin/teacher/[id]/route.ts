import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, department, designation, phone, email, office, expertise } = body;

    const existing = await query<any>('SELECT id FROM teachers WHERE id = ?', [id]);
    if (!existing.length) {
      return NextResponse.json({ ok: false, message: 'Not found.' }, { status: 404 });
    }

    await run(
      `UPDATE teachers SET name=?, department=?, designation=?, phone=?, email=?, office=?, expertise=? WHERE id=?`,
      [name, department, designation, phone, email, office || '', expertise || '', id]
    );

    return NextResponse.json({ ok: true, message: 'Teacher updated.' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await run('DELETE FROM teachers WHERE id = ?', [id]);
    return NextResponse.json({ ok: true, message: 'Teacher deleted.' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
