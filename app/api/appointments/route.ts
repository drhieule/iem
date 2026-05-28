import { NextRequest, NextResponse } from 'next/server';
import { getAllAppointments, createAppointment } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const appointments = getAllAppointments(status);
    return NextResponse.json(appointments);
  } catch (error) {
    console.error('GET /api/appointments error:', error);
    return NextResponse.json({ error: 'Lỗi lấy danh sách lịch khám' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patient_id, scheduled_at, type, doctor, department, notes } = body;

    if (!patient_id || !scheduled_at) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc: bệnh nhân và ngày giờ khám' }, { status: 400 });
    }

    const appointment = createAppointment({
      patient_id: Number(patient_id),
      scheduled_at,
      type: type || 'routine',
      doctor: doctor || undefined,
      department: department || 'Phòng khám Chuyển hóa',
      status: 'scheduled',
      notes: notes || undefined,
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error('POST /api/appointments error:', error);
    return NextResponse.json({ error: 'Lỗi đặt lịch khám' }, { status: 500 });
  }
}
