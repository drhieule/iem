import { NextRequest, NextResponse } from 'next/server';
import { getAllStaff, createStaff, updatePatientLoginInfo, getDb } from '@/lib/db';
import { verifyToken, hashPassword, COOKIE_NAME } from '@/lib/auth';

function generateInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0].toUpperCase())
    .join('');
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const user = await verifyToken(token);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
  }

  const staff = getAllStaff();

  const db = getDb();
  const patients = db
    .prepare(
      'SELECT id, name, record_number, login_phone, diagnosis, password_hash FROM patients WHERE login_phone IS NOT NULL AND login_phone != \'\' ORDER BY name ASC'
    )
    .all() as Array<{
      id: number;
      name: string;
      record_number: string | null;
      login_phone: string;
      diagnosis: string;
      password_hash: string | null;
    }>;

  const patientAccounts = patients.map(p => ({
    id: p.id,
    name: p.name,
    record_number: p.record_number,
    login_phone: p.login_phone,
    diagnosis: p.diagnosis,
    active_login: !!(p.login_phone),
  }));

  return NextResponse.json({ staff, patients: patientAccounts });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const user = await verifyToken(token);
  if (!user || (user.role !== 'admin' && user.role !== 'doctor')) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
  }

  try {
    const body = await request.json() as {
      account_type: 'staff' | 'patient';
      role?: 'admin' | 'doctor' | 'nurse';
      name?: string;
      username?: string;
      password?: string;
      department?: string;
      phone?: string;
      patient_id?: number;
      record_number?: string;
      login_phone?: string;
    };

    if (body.account_type === 'staff') {
      if (user.role !== 'admin') {
        return NextResponse.json({ error: 'Chỉ Admin mới có thể tạo tài khoản nhân viên' }, { status: 403 });
      }
      const { name, role, username, password, department, phone } = body;
      if (!name || !role || !username || !password) {
        return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
      }

      const password_hash = await hashPassword(password);
      const avatar_initials = generateInitials(name);

      const staff = createStaff({
        name,
        role,
        username,
        password_hash,
        department: department || 'Phòng khám Chuyển hóa Bẩm sinh',
        phone,
        avatar_initials,
        active: 1,
      });

      // Return without password_hash
      const { ...staffWithoutHash } = staff as typeof staff & { password_hash?: string };
      delete staffWithoutHash.password_hash;
      return NextResponse.json(staffWithoutHash, { status: 201 });
    }

    if (body.account_type === 'patient') {
      const { patient_id, record_number, login_phone } = body;
      if (!patient_id || !record_number || !login_phone) {
        return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
      }

      updatePatientLoginInfo(patient_id, record_number, login_phone);

      const db = getDb();
      const patient = db
        .prepare('SELECT id, name, record_number, login_phone, diagnosis FROM patients WHERE id = ?')
        .get(patient_id) as { id: number; name: string; record_number: string; login_phone: string; diagnosis: string } | undefined;

      if (!patient) {
        return NextResponse.json({ error: 'Bệnh nhân không tồn tại' }, { status: 404 });
      }

      return NextResponse.json(patient, { status: 201 });
    }

    return NextResponse.json({ error: 'account_type không hợp lệ' }, { status: 400 });
  } catch (error) {
    const msg = String(error);
    if (msg.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Tên đăng nhập đã tồn tại' }, { status: 409 });
    }
    console.error('POST /api/auth/admin/accounts error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
