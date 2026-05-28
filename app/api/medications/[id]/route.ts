import { NextRequest, NextResponse } from 'next/server';
import { updateMedication, getMedicationById } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const existing = getMedicationById(Number(id));
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy thuốc' }, { status: 404 });
    const result = updateMedication(Number(id), body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('PUT /api/medications/[id] error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật thuốc' }, { status: 500 });
  }
}
