import { NextRequest, NextResponse } from 'next/server';
import { getRecentEntries } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ patientId: string }> }) {
  try {
    const { patientId } = await params;
    const entries = getRecentEntries(Number(patientId), 48);
    return NextResponse.json(entries);
  } catch (error) {
    console.error('GET /api/checkin/[patientId] error:', error);
    return NextResponse.json({ error: 'Lỗi lấy lịch sử triệu chứng' }, { status: 500 });
  }
}
