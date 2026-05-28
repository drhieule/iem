import { NextRequest, NextResponse } from 'next/server';
import { getPatientById, updatePatient, deletePatient } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const patient = getPatientById(Number(id));
    if (!patient) {
      return NextResponse.json({ error: 'Không tìm thấy bệnh nhân' }, { status: 404 });
    }
    return NextResponse.json(patient);
  } catch (error) {
    console.error('GET /api/patients/[id] error:', error);
    return NextResponse.json({ error: 'Lỗi lấy thông tin bệnh nhân' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const patient = updatePatient(Number(id), body);
    if (!patient) {
      return NextResponse.json({ error: 'Không tìm thấy bệnh nhân' }, { status: 404 });
    }
    return NextResponse.json(patient);
  } catch (error) {
    console.error('PUT /api/patients/[id] error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật bệnh nhân' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const success = deletePatient(Number(id));
    if (!success) {
      return NextResponse.json({ error: 'Không tìm thấy bệnh nhân' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Đã xóa bệnh nhân' });
  } catch (error) {
    console.error('DELETE /api/patients/[id] error:', error);
    return NextResponse.json({ error: 'Lỗi xóa bệnh nhân' }, { status: 500 });
  }
}
