import { NextRequest, NextResponse } from 'next/server';
import { updateLabResult, deleteLabResult, getLabResultById } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = updateLabResult(Number(id), body);
    if (!result) return NextResponse.json({ error: 'Không tìm thấy kết quả xét nghiệm' }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    console.error('PUT /api/lab-results/[id] error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật kết quả xét nghiệm' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = getLabResultById(Number(id));
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy kết quả xét nghiệm' }, { status: 404 });
    const ok = deleteLabResult(Number(id));
    return NextResponse.json({ success: ok });
  } catch (error) {
    console.error('DELETE /api/lab-results/[id] error:', error);
    return NextResponse.json({ error: 'Lỗi xóa kết quả xét nghiệm' }, { status: 500 });
  }
}
