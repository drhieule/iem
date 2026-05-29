import { NextRequest, NextResponse } from 'next/server';
import { updateStaff, updateStaffPassword, deactivateStaff } from '@/lib/db';
import { verifyToken, hashPassword, COOKIE_NAME } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const user = await verifyToken(token);
  if (!user || user.role !== 'doctor') {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
  }

  const { id } = await params;
  const staffId = parseInt(id);

  try {
    const body = await request.json();
    const { name, department, phone, password } = body as {
      name?: string; department?: string; phone?: string; password?: string;
    };

    if (password) {
      const password_hash = await hashPassword(password);
      updateStaffPassword(staffId, password_hash);
    }

    const updated = updateStaff(staffId, { name, department, phone });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/auth/staff/[id] error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const user = await verifyToken(token);
  if (!user || user.role !== 'doctor') {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
  }

  const { id } = await params;
  deactivateStaff(parseInt(id));
  return NextResponse.json({ success: true });
}
