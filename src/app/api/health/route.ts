import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Uni ERP Next.js API running.',
    timestamp: new Date().toISOString(),
  });
}
