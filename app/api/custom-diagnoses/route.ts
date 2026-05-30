import { NextRequest, NextResponse } from 'next/server';
import { getSetting, setSetting } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

export interface CustomDiagnosis {
  name: string;
  base: 'UCD' | 'MSUD' | 'OA' | 'FAOD';
}

function getCustomDiagnoses(): CustomDiagnosis[] {
  try {
    return JSON.parse(getSetting('custom_diagnoses') || '[]');
  } catch {
    return [];
  }
}

async function requireStaff(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const user = await verifyToken(token);
  if (!user || (user.role !== 'admin' && user.role !== 'doctor' && user.role !== 'nurse')) return null;
  return user;
}

export async function GET() {
  return NextResponse.json(getCustomDiagnoses());
}

export async function POST(request: NextRequest) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });

  const body = await request.json() as { name?: string; base?: string };
  const name = (body.name || '').trim();
  const base = body.base as CustomDiagnosis['base'];

  if (!name) return NextResponse.json({ error: 'Tên chẩn đoán không được để trống' }, { status: 400 });
  if (!['UCD', 'MSUD', 'OA', 'FAOD'].includes(base)) {
    return NextResponse.json({ error: 'Nhóm chẩn đoán không hợp lệ' }, { status: 400 });
  }

  const existing = getCustomDiagnoses();
  if (existing.some(d => d.name.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json(existing);
  }

  const updated = [...existing, { name, base }];
  setSetting('custom_diagnoses', JSON.stringify(updated));
  return NextResponse.json(updated);
}

// Rename or change base for an existing custom diagnosis
export async function PUT(request: NextRequest) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });

  const body = await request.json() as { oldName?: string; name?: string; base?: string };
  const oldName = (body.oldName || '').trim();
  const newName = (body.name || '').trim();
  const base = body.base as CustomDiagnosis['base'];

  if (!oldName || !newName) return NextResponse.json({ error: 'Thiếu tên' }, { status: 400 });
  if (!['UCD', 'MSUD', 'OA', 'FAOD'].includes(base)) {
    return NextResponse.json({ error: 'Nhóm không hợp lệ' }, { status: 400 });
  }

  const existing = getCustomDiagnoses();
  const idx = existing.findIndex(d => d.name === oldName);
  if (idx === -1) return NextResponse.json({ error: 'Không tìm thấy chẩn đoán' }, { status: 404 });

  const updated = existing.map((d, i) => i === idx ? { name: newName, base } : d);
  setSetting('custom_diagnoses', JSON.stringify(updated));
  return NextResponse.json(updated);
}

// Delete a custom diagnosis by name
export async function DELETE(request: NextRequest) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  if (!name) return NextResponse.json({ error: 'Thiếu tên' }, { status: 400 });

  const existing = getCustomDiagnoses();
  const updated = existing.filter(d => d.name !== name);
  setSetting('custom_diagnoses', JSON.stringify(updated));
  return NextResponse.json(updated);
}
