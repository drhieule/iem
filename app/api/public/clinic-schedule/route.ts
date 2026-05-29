import { NextRequest, NextResponse } from 'next/server';
import { getClinicSessionsByMonth } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Tham số không hợp lệ' }, { status: 400 });
  }

  const sessions = getClinicSessionsByMonth(year, month);
  return NextResponse.json(sessions);
}
