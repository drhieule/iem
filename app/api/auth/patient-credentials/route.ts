import { NextRequest, NextResponse } from 'next/server';
import { updatePatientLoginInfo } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const user = await verifyToken(token);
  if (!user || (user.role !== 'doctor' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { patient_id, record_number, login_phone } = body as {
      patient_id: number; record_number: string; login_phone: string;
    };

    if (!patient_id || !record_number || !login_phone) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    updatePatientLoginInfo(patient_id, record_number.trim(), login_phone.trim());
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/auth/patient-credentials error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
