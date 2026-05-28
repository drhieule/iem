import { NextRequest, NextResponse } from 'next/server';
import { updateDietaryPrescription, getDietaryById } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const existing = getDietaryById(Number(id));
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy đơn chế độ ăn' }, { status: 404 });
    const result = updateDietaryPrescription(Number(id), body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('PUT /api/dietary/[id] error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật chế độ ăn' }, { status: 500 });
  }
}
