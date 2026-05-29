import { NextRequest, NextResponse } from 'next/server';
import { updateStaffPassword, getDb } from '@/lib/db';
import { verifyToken, hashPassword, COOKIE_NAME } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const user = await verifyToken(token);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
  }

  const body = await request.json() as { account_type: 'staff' | 'patient' };
  const db = getDb();

  if (body.account_type === 'staff') {
    // Admin cannot delete their own account
    if (id === user.id) {
      return NextResponse.json({ error: 'Không thể xóa tài khoản của chính mình' }, { status: 400 });
    }
    db.prepare('UPDATE staff SET active = 0 WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  }

  if (body.account_type === 'patient') {
    db.prepare('UPDATE patients SET record_number = NULL, login_phone = NULL WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'account_type không hợp lệ' }, { status: 400 });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const user = await verifyToken(token);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
  }

  const body = await request.json() as { new_password: string };
  if (!body.new_password) {
    return NextResponse.json({ error: 'Mật khẩu mới không được để trống' }, { status: 400 });
  }

  const password_hash = await hashPassword(body.new_password);
  updateStaffPassword(id, password_hash);

  return NextResponse.json({ success: true });
}
