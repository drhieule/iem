import { NextRequest, NextResponse } from 'next/server';
import { resolveFlagEvent } from '@/lib/db';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const success = resolveFlagEvent(Number(id));
    if (!success) {
      return NextResponse.json({ error: 'Không tìm thấy cảnh báo hoặc đã được giải quyết' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Đã xác nhận giải quyết cảnh báo' });
  } catch (error) {
    console.error('POST /api/flags/[id]/resolve error:', error);
    return NextResponse.json({ error: 'Lỗi giải quyết cảnh báo' }, { status: 500 });
  }
}
