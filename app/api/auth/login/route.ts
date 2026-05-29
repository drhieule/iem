import { NextRequest, NextResponse } from 'next/server';
import { getStaffByUsername, getPatientByLoginPhone } from '@/lib/db';
import { createToken, verifyPassword, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    if (type === 'staff') {
      const { username, password } = body as { username: string; password: string };
      if (!username || !password) {
        return NextResponse.json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' }, { status: 400 });
      }

      const staff = getStaffByUsername(username);
      if (!staff) {
        return NextResponse.json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' }, { status: 401 });
      }

      const valid = await verifyPassword(password, staff.password_hash);
      if (!valid) {
        return NextResponse.json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' }, { status: 401 });
      }

      const token = await createToken({
        id: staff.id,
        name: staff.name,
        role: staff.role,
      });

      const response = NextResponse.json({
        success: true,
        user: { id: staff.id, name: staff.name, role: staff.role },
      });
      response.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        maxAge: 8 * 60 * 60, // 8 hours
        path: '/',
        sameSite: 'lax',
      });
      return response;

    } else if (type === 'patient') {
      const { phone, record_number } = body as { phone: string; record_number: string };
      if (!phone || !record_number) {
        return NextResponse.json({ error: 'Vui lòng nhập số điện thoại và số hồ sơ' }, { status: 400 });
      }

      const patient = getPatientByLoginPhone(phone.trim());
      if (!patient) {
        return NextResponse.json({ error: 'Số điện thoại hoặc số hồ sơ không đúng' }, { status: 401 });
      }

      const recordMatch = patient.record_number?.trim().toLowerCase() === record_number.trim().toLowerCase();
      if (!recordMatch) {
        return NextResponse.json({ error: 'Số điện thoại hoặc số hồ sơ không đúng' }, { status: 401 });
      }

      const token = await createToken({
        id: patient.id,
        name: patient.name,
        role: 'patient',
        patientId: patient.id,
      });

      const response = NextResponse.json({
        success: true,
        user: { id: patient.id, name: patient.name, role: 'patient', patientId: patient.id },
      });
      response.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        maxAge: 8 * 60 * 60,
        path: '/',
        sameSite: 'lax',
      });
      return response;

    } else {
      return NextResponse.json({ error: 'Loại đăng nhập không hợp lệ' }, { status: 400 });
    }
  } catch (error) {
    console.error('POST /api/auth/login error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
