import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const fees = await query<any>(`SELECT * FROM fees WHERE student_id = ? ORDER BY id`, [id]);
    const total = fees.reduce((a, f) => a + f.amount, 0);
    const totalPaid = fees.reduce((a, f) => a + f.paid, 0);
    const pending = fees.filter((f) => f.status !== 'Paid').reduce((a, f) => a + (f.amount - f.paid), 0);

    return NextResponse.json({ ok: true, fees, total, total_paid: totalPaid, pending });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
