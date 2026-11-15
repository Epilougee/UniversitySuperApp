import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query, run } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, department, designation, phone, email, office, expertise } = body;

    if (!id || !name || !department) {
      return NextResponse.json({ ok: false, message: 'id, name, department required.' }, { status: 400 });
    }

    const existing = await query<any>('SELECT id FROM teachers WHERE id = ?', [id]);
    if (existing.length) {
      return NextResponse.json({ ok: false, message: 'Teacher ID exists.' }, { status: 409 });
    }

    const hashed = bcrypt.hashSync(id, 10);
    await run(
      `INSERT INTO teachers (id,password,name,department,designation,phone,email,office,expertise) VALUES (?,?,?,?,?,?,?,?,?)`,
      [id, hashed, name, department, designation || 'Assistant Professor', phone || '', email || '', office || '', expertise || '']
    );

    return NextResponse.json({ ok: true, message: 'Teacher added.', id });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
