import { NextResponse } from 'next/server';
import { getActiveFlagEvents } from '@/lib/db';

export async function GET() {
  try {
    const flags = getActiveFlagEvents();
    return NextResponse.json(flags);
  } catch (error) {
    console.error('GET /api/flags error:', error);
    return NextResponse.json({ error: 'Lỗi lấy danh sách cảnh báo' }, { status: 500 });
  }
}
