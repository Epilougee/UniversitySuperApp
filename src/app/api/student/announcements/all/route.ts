import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const announcements = await query<any>(`SELECT * FROM announcements ORDER BY created_at DESC`);
    return NextResponse.json({ ok: true, announcements });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
