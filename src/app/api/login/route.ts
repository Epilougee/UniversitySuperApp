import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, id, password } = body;

    if (!role || !id || !password) {
      return NextResponse.json({ ok: false, message: 'role, id, and password are required.' }, { status: 400 });
    }

    const tableMap: Record<string, string> = {
      Student: 'students',
      Teacher: 'teachers',
      Admin: 'admins',
    };

    const table = tableMap[role];
    if (!table) {
      return NextResponse.json({ ok: false, message: 'Invalid role.' }, { status: 400 });
    }

    const rows = await query<any>(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    if (!rows.length) {
      return NextResponse.json({ ok: false, message: 'Invalid credentials.' }, { status: 401 });
    }

    const user = rows[0];
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return NextResponse.json({ ok: false, message: 'Invalid credentials.' }, { status: 401 });
    }

    const { password: _pw, ...safeUser } = user;

    return NextResponse.json({
      ok: true,
      role,
      user: safeUser,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ ok: false, message: err.message || 'Internal server error' }, { status: 500 });
  }
}
