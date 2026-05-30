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

export async function GET() {
  return NextResponse.json(getCustomDiagnoses());
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const user = await verifyToken(token);
  if (!user || (user.role !== 'admin' && user.role !== 'doctor' && user.role !== 'nurse')) {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  }

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
