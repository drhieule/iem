import { NextRequest, NextResponse } from 'next/server';
import { updateAppointment, getAppointmentById } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const existing = getAppointmentById(Number(id));
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy lịch khám' }, { status: 404 });
    const result = updateAppointment(Number(id), body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('PUT /api/appointments/[id] error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật lịch khám' }, { status: 500 });
  }
}
