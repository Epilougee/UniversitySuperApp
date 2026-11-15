import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const students = await query<any>(
      `SELECT id, name, department, year, section, cgpa, attendance, phone, email, batch, address FROM students ORDER BY name`
    );
    return NextResponse.json({ ok: true, students });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
