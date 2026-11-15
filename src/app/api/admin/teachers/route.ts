import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const teachers = await query<any>(
      `SELECT id, name, department, designation, phone, email, office, expertise FROM teachers ORDER BY name`
    );
    return NextResponse.json({ ok: true, teachers });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
