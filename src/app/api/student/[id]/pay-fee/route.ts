import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { fee_id, amount } = body;

    if (!fee_id || !amount) {
      return NextResponse.json({ ok: false, message: 'fee_id and amount required.' }, { status: 400 });
    }

    const fee = await query<any>(`SELECT * FROM fees WHERE id = ? AND student_id = ?`, [fee_id, id]);
    if (!fee.length) {
      return NextResponse.json({ ok: false, message: 'Fee record not found.' }, { status: 404 });
    }

    const f = fee[0];
    const newPaid = Math.min(f.paid + amount, f.amount);
    const newStatus = newPaid >= f.amount ? 'Paid' : 'Partial';
    const now = Date.now();

    await run(`UPDATE fees SET paid = ?, status = ? WHERE id = ?`, [newPaid, newStatus, fee_id]);

    const notifTitle = newStatus === 'Paid' ? 'Fee Payment Complete' : 'Partial Fee Payment';
    const notifBody = `Payment of ₹${amount} recorded for ${f.description}. Amount due: ₹${f.amount - newPaid}.`;
    await run(
      `INSERT INTO notifications (user_id, user_role, title, body, category, read_status, created_at) VALUES (?,?,?,?,?,0,?)`,
      [id, 'Student', notifTitle, notifBody, 'fees', now]
    );

    if (global.broadcastNotification) {
      global.broadcastNotification(id, 'Student', notifTitle, notifBody, 'fees');
    }

    return NextResponse.json({
      ok: true,
      message: 'Payment recorded successfully!',
      new_paid: newPaid,
      status: newStatus,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
