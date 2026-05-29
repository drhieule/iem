import { NextRequest, NextResponse } from 'next/server';
import { getAllStaff, createStaff } from '@/lib/db';
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
  if (!user || user.role !== 'doctor') {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
  }

  const staff = getAllStaff();
  return NextResponse.json(staff);
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const user = await verifyToken(token);
  if (!user || user.role !== 'doctor') {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, role, username, password, department, phone } = body as {
      name: string; role: 'doctor' | 'nurse'; username: string;
      password: string; department?: string; phone?: string;
    };

    if (!name || !role || !username || !password) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const password_hash = await hashPassword(password);
    const avatar_initials = generateInitials(name);

    const staff = createStaff({
      name, role, username, password_hash,
      department: department || 'Phòng khám Chuyển hóa Bẩm sinh',
      phone, avatar_initials, active: 1,
    });

    return NextResponse.json(staff, { status: 201 });
  } catch (error) {
    const msg = String(error);
    if (msg.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Tên đăng nhập đã tồn tại' }, { status: 409 });
    }
    console.error('POST /api/auth/staff error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
