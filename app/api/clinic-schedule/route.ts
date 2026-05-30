import { NextRequest, NextResponse } from 'next/server';
import { upsertClinicSession, deleteClinicSession, setSetting } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

async function requireDoctorOrAdmin(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const user = await verifyToken(token);
  if (!user || (user.role !== 'doctor' && user.role !== 'admin')) return null;
  return user;
}

export async function POST(request: NextRequest) {
  const user = await requireDoctorOrAdmin(request);
  if (!user) return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });

  try {
    const body = await request.json() as {
      type?: string;
      value?: string;
      session_date?: string;
      doctor_name?: string | null;
      notes?: string | null;
    };

    // Handle footer note update
    if (body.type === 'note') {
      if (typeof body.value !== 'string') {
        return NextResponse.json({ error: 'Giá trị không hợp lệ' }, { status: 400 });
      }
      setSetting('clinic_footer_note', body.value);
      return NextResponse.json({ success: true });
    }

    // Handle session upsert
    if (!body.session_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.session_date)) {
      return NextResponse.json({ error: 'Ngày không hợp lệ' }, { status: 400 });
    }

    const d = new Date(body.session_date);
    const dow = d.getUTCDay(); // 0=Sun, 2=Tue, 4=Thu
    if (dow !== 2 && dow !== 4) {
      return NextResponse.json({ error: 'Chỉ lịch chiều thứ Ba và thứ Năm' }, { status: 400 });
    }

    const session = upsertClinicSession(
      body.session_date,
      body.doctor_name || null,
      body.notes || null,
      user.id ?? null
    );
    return NextResponse.json(session, { status: 200 });
  } catch (error) {
    console.error('POST /api/clinic-schedule error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await requireDoctorOrAdmin(request);
  if (!user) return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const session_date = searchParams.get('date');
    if (!session_date) return NextResponse.json({ error: 'Thiếu ngày' }, { status: 400 });

    deleteClinicSession(session_date);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/clinic-schedule error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
